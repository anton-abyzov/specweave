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

# =============================================================================
# LANGUAGE SERVER MAPPINGS (Add new languages here!)
# =============================================================================
# Format: "Language|extensions|binaries|install_command"
#   - extensions: comma-separated file extensions (e.g., "ts,tsx,js,jsx")
#   - binaries: colon-separated binaries to check (any match = installed)
#   - install_command: command to install the language server
#
# To add a new language, just add a line to this array:
LANGUAGE_CONFIGS=(
  "TypeScript|ts,tsx,js,jsx|typescript-language-server|npm install -g typescript-language-server typescript"
  "Python|py|pyright-langserver:pylsp|pip install pyright"
  "C#|cs|csharp-ls:omnisharp|dotnet tool install -g csharp-ls"
  "Go|go|gopls|go install golang.org/x/tools/gopls@latest"
  "Rust|rs|rust-analyzer|rustup component add rust-analyzer"
  "Java|java|jdtls|brew install jdtls (requires JDK 17+)"
  "PHP|php|intelephense|npm install -g intelephense"
  "Ruby|rb|solargraph|gem install solargraph"
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

# =============================================================================
# MAIN LOGIC
# =============================================================================

declare -A LANG_COUNTS
declare -A LANG_INFO  # "binaries|install_cmd"

# Process each language config
for config in "${LANGUAGE_CONFIGS[@]}"; do
  IFS='|' read -r lang extensions binaries install_cmd <<< "$config"

  # Count files for this language
  file_count=$(count_extensions "$extensions")

  # Only track languages with significant presence
  if [[ "$file_count" -ge "$MIN_FILE_COUNT" ]]; then
    LANG_COUNTS["$lang"]=$file_count
    LANG_INFO["$lang"]="${binaries}|${install_cmd}"
  fi
done

# Sort languages by file count, take top N
TOP_LANGUAGES=($(for lang in "${!LANG_COUNTS[@]}"; do
  echo "${LANG_COUNTS[$lang]} $lang"
done | sort -rn | head -n "$MAX_LANGUAGES" | awk '{print $2}'))

# Check LSP only for top languages
MISSING_SERVERS=()
for lang in "${TOP_LANGUAGES[@]}"; do
  INFO="${LANG_INFO[$lang]}"
  BINARIES="${INFO%%|*}"
  INSTALL_CMD="${INFO##*|}"

  if ! has_any_binary "$BINARIES"; then
    FILE_COUNT="${LANG_COUNTS[$lang]}"
    MISSING_SERVERS+=("$lang ($FILE_COUNT files)|$INSTALL_CMD")
  fi
done

# =============================================================================
# OUTPUT RESULTS
# =============================================================================

TOTAL_LANGS=${#LANG_COUNTS[@]}
CHECKED_LANGS=${#TOP_LANGUAGES[@]}

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
    "maxLanguages": $MAX_LANGUAGES
  }
}
EOF
else
  # Some language servers missing - build JSON array
  MISSING_JSON=""
  for server in "${MISSING_SERVERS[@]}"; do
    LANG="${server%%|*}"
    CMD="${server##*|}"
    if [[ -n "$MISSING_JSON" ]]; then
      MISSING_JSON="$MISSING_JSON,"
    fi
    MISSING_JSON="$MISSING_JSON{\"language\":\"$LANG\",\"install\":\"$CMD\"}"
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
    "maxLanguages": $MAX_LANGUAGES
  }
}
EOF
fi

exit 0
