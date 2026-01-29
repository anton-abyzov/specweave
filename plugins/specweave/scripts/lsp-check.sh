#!/usr/bin/env bash
#
# LSP Language Server Detection (Background Worker)
#
# Spawned by session-start.sh in background
# Checks if required language servers are installed based on project files
# Writes results to .specweave/state/lsp-check.json for user-prompt-submit to read
#
# v1.0.179 - Initial version
# v1.0.180 - Only check DOMINANT languages (top 3 by file count, min 10 files)
#            Prevents warning overload in large multi-repo projects
# v1.0.181 - REFACTOR: Extracted language configs to maintainable data structure
# v1.0.182 - Add plugin verification: check both binary AND Claude plugin installation
#            Detects gap: binary present but plugin missing (AC-US4-01, AC-US4-02, AC-US4-03)

set +e  # CRITICAL: Never use set -e in background workers

PROJECT_ROOT="$1"

if [[ -z "$PROJECT_ROOT" ]] || [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  exit 0  # Not a SpecWeave project
fi

STATE_FILE="${PROJECT_ROOT}/.specweave/state/lsp-check.json"
STATE_DIR="${PROJECT_ROOT}/.specweave/state"

mkdir -p "$STATE_DIR"

# =============================================================================
# CONFIGURATION
# =============================================================================
MIN_FILE_COUNT=10      # Minimum files to consider a language "dominant"
MAX_LANGUAGES=3        # Maximum languages to warn about
MAX_DEPTH=5            # Search depth (avoids deep node_modules)

# Claude plugin installation file
CLAUDE_HOME="${HOME}/.claude"
INSTALLED_PLUGINS_FILE="${CLAUDE_HOME}/plugins/installed_plugins.json"

# =============================================================================
# LANGUAGE SERVER MAPPINGS (Add new languages here!)
# =============================================================================
# Format: "Language|extensions|binaries|install_command|plugin_name"
#   - extensions: comma-separated file extensions (e.g., "ts,tsx,js,jsx")
#   - binaries: colon-separated binaries to check (any match = installed)
#   - install_command: command to install the language server BINARY
#   - plugin_name: Claude plugin name for LSP (e.g., typescript-lsp)
#
# To add a new language, just add a line to this array:
LANGUAGE_CONFIGS=(
  "TypeScript|ts,tsx,js,jsx|typescript-language-server|npm install -g typescript-language-server typescript|typescript-lsp"
  "Python|py|pyright-langserver:pylsp|pip install pyright|python-lsp"
  "C#|cs|csharp-ls:omnisharp|dotnet tool install -g csharp-ls|csharp-lsp"
  "Go|go|gopls|go install golang.org/x/tools/gopls@latest|go-lsp"
  "Rust|rs|rust-analyzer|rustup component add rust-analyzer|rust-lsp"
  "Java|java|jdtls|brew install jdtls (requires JDK 17+)|java-lsp"
  "PHP|php|intelephense|npm install -g intelephense|php-lsp"
  "Ruby|rb|solargraph|gem install solargraph|ruby-lsp"
)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Count files for an extension (fast, limited depth)
count_extension() {
  local ext="$1"
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \
    -type f -name "*.$ext" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/vendor/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    2>/dev/null | wc -l | tr -d ' '
}

# Count files for multiple extensions (comma-separated)
count_extensions() {
  local extensions="$1"
  local total=0
  IFS=',' read -ra EXT_LIST <<< "$extensions"
  for ext in "${EXT_LIST[@]}"; do
    local count
    count=$(count_extension "$ext")
    total=$((total + count))
  done
  echo "$total"
}

# Check if any of the binaries exist (colon-separated)
has_any_binary() {
  local binaries="$1"
  IFS=':' read -ra BINARY_LIST <<< "$binaries"
  for binary in "${BINARY_LIST[@]}"; do
    if command -v "$binary" >/dev/null 2>&1; then
      return 0  # Found
    fi
  done
  return 1  # Not found
}

# Check if a Claude plugin is installed
# Reads ~/.claude/plugins/installed_plugins.json
is_plugin_installed() {
  local plugin_name="$1"

  # If installed_plugins.json doesn't exist, plugin is not installed
  if [[ ! -f "$INSTALLED_PLUGINS_FILE" ]]; then
    return 1  # Not installed
  fi

  # Check if plugin name appears in the installed plugins file
  # Format: {"plugin_name@marketplace": {...}}
  if grep -q "\"${plugin_name}@" "$INSTALLED_PLUGINS_FILE" 2>/dev/null; then
    return 0  # Installed
  fi

  return 1  # Not installed
}

# =============================================================================
# MAIN LOGIC
# =============================================================================

declare -A LANG_COUNTS
declare -A LANG_INFO  # "binaries|install_cmd|plugin_name"

# Process each language config
for config in "${LANGUAGE_CONFIGS[@]}"; do
  IFS='|' read -r lang extensions binaries install_cmd plugin_name <<< "$config"

  # Count files for this language
  file_count=$(count_extensions "$extensions")

  # Only track languages with significant presence
  if [[ "$file_count" -ge "$MIN_FILE_COUNT" ]]; then
    LANG_COUNTS["$lang"]=$file_count
    LANG_INFO["$lang"]="${binaries}|${install_cmd}|${plugin_name}"
  fi
done

# Sort languages by file count, take top N
TOP_LANGUAGES=($(for lang in "${!LANG_COUNTS[@]}"; do
  echo "${LANG_COUNTS[$lang]} $lang"
done | sort -rn | head -n "$MAX_LANGUAGES" | awk '{print $2}'))

# Check LSP for top languages - both binary AND plugin
MISSING_BINARY=()    # Binary not installed
MISSING_PLUGIN=()    # Binary installed but plugin missing
for lang in "${TOP_LANGUAGES[@]}"; do
  INFO="${LANG_INFO[$lang]}"
  # Parse: "binaries|install_cmd|plugin_name"
  BINARIES="${INFO%%|*}"
  REST="${INFO#*|}"
  INSTALL_CMD="${REST%%|*}"
  PLUGIN_NAME="${REST##*|}"

  FILE_COUNT="${LANG_COUNTS[$lang]}"

  if ! has_any_binary "$BINARIES"; then
    # Binary not installed
    MISSING_BINARY+=("$lang ($FILE_COUNT files)|missing_binary|$INSTALL_CMD|$PLUGIN_NAME")
  elif ! is_plugin_installed "$PLUGIN_NAME"; then
    # Binary installed but plugin missing - this is the gap!
    MISSING_PLUGIN+=("$lang ($FILE_COUNT files)|missing_plugin|$INSTALL_CMD|$PLUGIN_NAME")
  fi
done

# Combine both arrays for output
MISSING_SERVERS=("${MISSING_BINARY[@]}" "${MISSING_PLUGIN[@]}")

# =============================================================================
# OUTPUT RESULTS
# =============================================================================

TOTAL_LANGS=${#LANG_COUNTS[@]}
CHECKED_LANGS=${#TOP_LANGUAGES[@]}
BINARY_MISSING_COUNT=${#MISSING_BINARY[@]}
PLUGIN_MISSING_COUNT=${#MISSING_PLUGIN[@]}

if [[ ${#MISSING_SERVERS[@]} -eq 0 ]]; then
  # All language servers installed (or no dominant languages)
  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "ok",
  "missing": [],
  "warned": false,
  "stats": {
    "totalLanguages": $TOTAL_LANGS,
    "checkedLanguages": $CHECKED_LANGS,
    "minFileCount": $MIN_FILE_COUNT,
    "maxLanguages": $MAX_LANGUAGES,
    "binaryMissing": 0,
    "pluginMissing": 0
  }
}
EOF
else
  # Some language servers missing - build JSON array
  # Format: "lang (X files)|type|binary_install|plugin_name"
  MISSING_JSON=""
  for server in "${MISSING_SERVERS[@]}"; do
    # Parse the pipe-separated values
    IFS='|' read -r LANG TYPE BINARY_CMD PLUGIN_NAME <<< "$server"

    # Build plugin install command: claude plugin install X@claude-plugins-official
    PLUGIN_CMD="claude plugin install ${PLUGIN_NAME}@claude-plugins-official"

    # Build human-readable message based on issue type
    if [[ "$TYPE" == "missing_binary" ]]; then
      MESSAGE="Language server binary not installed. Run: $BINARY_CMD"
    else
      # missing_plugin - binary present but Claude plugin not registered
      MESSAGE="Binary installed but Claude plugin missing. Run: $PLUGIN_CMD"
    fi

    if [[ -n "$MISSING_JSON" ]]; then
      MISSING_JSON="$MISSING_JSON,"
    fi
    MISSING_JSON="$MISSING_JSON{\"language\":\"$LANG\",\"type\":\"$TYPE\",\"binaryInstall\":\"$BINARY_CMD\",\"pluginInstall\":\"$PLUGIN_CMD\",\"plugin\":\"$PLUGIN_NAME\",\"message\":\"$MESSAGE\"}"
  done

  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "missing",
  "missing": [$MISSING_JSON],
  "warned": false,
  "stats": {
    "totalLanguages": $TOTAL_LANGS,
    "checkedLanguages": $CHECKED_LANGS,
    "minFileCount": $MIN_FILE_COUNT,
    "maxLanguages": $MAX_LANGUAGES,
    "binaryMissing": $BINARY_MISSING_COUNT,
    "pluginMissing": $PLUGIN_MISSING_COUNT
  }
}
EOF
fi

exit 0
