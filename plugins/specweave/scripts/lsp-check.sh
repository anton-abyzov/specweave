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
# v1.0.195 - Check ENABLE_LSP_TOOL env var; use boostvolt/claude-code-lsps marketplace
#            (Official @claude-plugins-official LSP plugins are broken - Issue #15148)
# v1.0.197 - CROSS-PLATFORM FIX: Remove bash 4+ associative arrays (declare -A)
#            Now works on macOS default bash (3.2), Linux, Git Bash, and POSIX sh

set +e  # CRITICAL: Never use set -e in background workers

PROJECT_ROOT="$1"

# ============================================================================
# LSP ENVIRONMENT CHECK (v1.0.195)
# ============================================================================
# ENABLE_LSP_TOOL must be set for Claude Code LSP plugins to work
# Without this env var, LSP plugins are useless even if installed
LSP_ENV_READY="false"
if [ -n "${ENABLE_LSP_TOOL:-}" ]; then
  LSP_ENV_READY="true"
fi

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT/.specweave" ]; then
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
#   - plugin_name: Claude plugin name for LSP (from boostvolt/claude-code-lsps marketplace)
#
# NOTE (v1.0.195): We use boostvolt/claude-code-lsps marketplace, NOT @claude-plugins-official
# The official marketplace LSP plugins are broken (only contain README files)
# See: https://github.com/anthropics/claude-code/issues/15148
#
# To add a new language, just add a line to this list (newline-separated):
LANGUAGE_CONFIGS="TypeScript|ts,tsx,js,jsx|typescript-language-server|npm install -g typescript-language-server typescript|vtsls
Python|py|pyright-langserver:pylsp|pip install pyright|pyright
C#|cs|csharp-ls:omnisharp|dotnet tool install -g csharp-ls|csharp-lsp
Go|go|gopls|go install golang.org/x/tools/gopls@latest|gopls
Rust|rs|rust-analyzer|rustup component add rust-analyzer|rust-analyzer
Java|java|jdtls|brew install jdtls (requires JDK 17+)|jdtls
PHP|php|intelephense|npm install -g intelephense|intelephense
Ruby|rb|solargraph|gem install solargraph|solargraph"

# Marketplace for LSP plugins (boostvolt, NOT claude-plugins-official)
LSP_MARKETPLACE="claude-code-lsps"

# =============================================================================
# CROSS-PLATFORM DATA STORAGE (v1.0.197)
# =============================================================================
# Instead of bash 4+ associative arrays, we use newline-separated strings
# Format: "lang|count|info" per line
# This works on bash 3.2+ (macOS), Linux, Git Bash, and POSIX sh
LANG_DATA=""

# Add language data entry
add_lang_data() {
  local lang="$1"
  local count="$2"
  local info="$3"
  if [ -z "$LANG_DATA" ]; then
    LANG_DATA="${lang}|${count}|${info}"
  else
    LANG_DATA="${LANG_DATA}
${lang}|${count}|${info}"
  fi
}

# Get count for a language
get_lang_count() {
  local lang="$1"
  echo "$LANG_DATA" | grep "^${lang}|" | head -1 | cut -d'|' -f2
}

# Get info for a language
get_lang_info() {
  local lang="$1"
  echo "$LANG_DATA" | grep "^${lang}|" | head -1 | cut -d'|' -f3-
}

# Get all language names (one per line)
get_all_langs() {
  echo "$LANG_DATA" | cut -d'|' -f1 | grep -v '^$'
}

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
# POSIX-compatible version (no bash arrays)
count_extensions() {
  local extensions="$1"
  local total=0
  # Use tr to split on comma, then read each extension
  echo "$extensions" | tr ',' '\n' | while read -r ext; do
    if [ -n "$ext" ]; then
      count_extension "$ext"
    fi
  done | awk '{sum+=$1} END {print sum+0}'
}

# Check if any of the binaries exist (colon-separated)
# POSIX-compatible version (no bash arrays)
has_any_binary() {
  local binaries="$1"
  # Use tr to split on colon, check each binary
  echo "$binaries" | tr ':' '\n' | while read -r binary; do
    if [ -n "$binary" ] && command -v "$binary" >/dev/null 2>&1; then
      echo "found"
      return 0
    fi
  done | grep -q "found"
}

# Check if a Claude plugin is installed
# Reads ~/.claude/plugins/installed_plugins.json
is_plugin_installed() {
  local plugin_name="$1"

  # If installed_plugins.json doesn't exist, plugin is not installed
  if [ ! -f "$INSTALLED_PLUGINS_FILE" ]; then
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
# MAIN LOGIC (POSIX-compatible, v1.0.197)
# =============================================================================

# Process each language config (newline-separated string, not bash array)
echo "$LANGUAGE_CONFIGS" | while IFS='|' read -r lang extensions binaries install_cmd plugin_name; do
  # Skip empty lines
  if [ -z "$lang" ]; then
    continue
  fi

  # Count files for this language
  file_count=$(count_extensions "$extensions")

  # Only track languages with significant presence
  if [ "$file_count" -ge "$MIN_FILE_COUNT" ]; then
    # Output to be captured: lang|count|binaries|install_cmd|plugin_name
    echo "${lang}|${file_count}|${binaries}|${install_cmd}|${plugin_name}"
  fi
done > "${STATE_DIR}/.lsp-langs.tmp"

# Sort languages by file count (field 2), take top N
TOP_LANGUAGES_DATA=$(sort -t'|' -k2 -rn "${STATE_DIR}/.lsp-langs.tmp" 2>/dev/null | head -n "$MAX_LANGUAGES")

# Count totals (ensure clean integer output)
if [ -f "${STATE_DIR}/.lsp-langs.tmp" ]; then
  TOTAL_LANGS=$(wc -l < "${STATE_DIR}/.lsp-langs.tmp" 2>/dev/null | tr -d '[:space:]')
else
  TOTAL_LANGS=0
fi
TOTAL_LANGS=${TOTAL_LANGS:-0}

# Count checked languages (non-empty lines in TOP_LANGUAGES_DATA)
if [ -n "$TOP_LANGUAGES_DATA" ]; then
  CHECKED_LANGS=$(echo "$TOP_LANGUAGES_DATA" | grep -c '^[^[:space:]]' 2>/dev/null || true)
  CHECKED_LANGS=$(echo "$CHECKED_LANGS" | tr -d '[:space:]')
else
  CHECKED_LANGS=0
fi
CHECKED_LANGS=${CHECKED_LANGS:-0}

# Check LSP for top languages - both binary AND plugin
MISSING_BINARY=""
MISSING_PLUGIN=""
BINARY_MISSING_COUNT=0
PLUGIN_MISSING_COUNT=0

echo "$TOP_LANGUAGES_DATA" | while IFS='|' read -r lang file_count binaries install_cmd plugin_name; do
  # Skip empty lines
  if [ -z "$lang" ]; then
    continue
  fi

  if ! has_any_binary "$binaries"; then
    # Binary not installed
    echo "${lang} (${file_count} files)|missing_binary|${install_cmd}|${plugin_name}"
  elif ! is_plugin_installed "$plugin_name"; then
    # Binary installed but plugin missing - this is the gap!
    echo "${lang} (${file_count} files)|missing_plugin|${install_cmd}|${plugin_name}"
  fi
done > "${STATE_DIR}/.lsp-missing.tmp"

# Count missing by type (ensure clean integer output)
if [ -f "${STATE_DIR}/.lsp-missing.tmp" ]; then
  BINARY_MISSING_COUNT=$(grep -c '|missing_binary|' "${STATE_DIR}/.lsp-missing.tmp" 2>/dev/null || true)
  PLUGIN_MISSING_COUNT=$(grep -c '|missing_plugin|' "${STATE_DIR}/.lsp-missing.tmp" 2>/dev/null || true)
else
  BINARY_MISSING_COUNT=0
  PLUGIN_MISSING_COUNT=0
fi
# Ensure counts are valid integers (trim whitespace, default to 0)
BINARY_MISSING_COUNT=$(echo "$BINARY_MISSING_COUNT" | tr -d '[:space:]')
PLUGIN_MISSING_COUNT=$(echo "$PLUGIN_MISSING_COUNT" | tr -d '[:space:]')
BINARY_MISSING_COUNT=${BINARY_MISSING_COUNT:-0}
PLUGIN_MISSING_COUNT=${PLUGIN_MISSING_COUNT:-0}
MISSING_COUNT=$((BINARY_MISSING_COUNT + PLUGIN_MISSING_COUNT))

# =============================================================================
# OUTPUT RESULTS (POSIX-compatible, v1.0.197)
# =============================================================================

if [ "$MISSING_COUNT" -eq 0 ]; then
  # All language servers installed (or no dominant languages)
  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "ok",
  "missing": [],
  "warned": false,
  "lspEnvReady": ${LSP_ENV_READY},
  "lspMarketplace": "$LSP_MARKETPLACE",
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
  # Some language servers missing - build JSON array from temp file
  # Format: "lang (X files)|type|binary_install|plugin_name"
  MISSING_JSON=""
  while IFS='|' read -r LANG TYPE BINARY_CMD PLUGIN_NAME; do
    # Skip empty lines
    if [ -z "$LANG" ]; then
      continue
    fi

    # Build plugin install command: claude plugin install X@claude-code-lsps (working marketplace)
    PLUGIN_CMD="claude plugin install ${PLUGIN_NAME}@${LSP_MARKETPLACE}"

    # Build human-readable message based on issue type
    if [ "$TYPE" = "missing_binary" ]; then
      MESSAGE="Language server binary not installed. Run: $BINARY_CMD"
    else
      # missing_plugin - binary present but Claude plugin not registered
      MESSAGE="Binary installed but Claude plugin missing. Run: $PLUGIN_CMD"
    fi

    if [ -n "$MISSING_JSON" ]; then
      MISSING_JSON="$MISSING_JSON,"
    fi
    MISSING_JSON="$MISSING_JSON{\"language\":\"$LANG\",\"type\":\"$TYPE\",\"binaryInstall\":\"$BINARY_CMD\",\"pluginInstall\":\"$PLUGIN_CMD\",\"plugin\":\"$PLUGIN_NAME\",\"message\":\"$MESSAGE\"}"
  done < "${STATE_DIR}/.lsp-missing.tmp"

  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "missing",
  "missing": [$MISSING_JSON],
  "warned": false,
  "lspEnvReady": ${LSP_ENV_READY},
  "lspMarketplace": "$LSP_MARKETPLACE",
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

# Cleanup temp files
rm -f "${STATE_DIR}/.lsp-langs.tmp" "${STATE_DIR}/.lsp-missing.tmp"

exit 0
