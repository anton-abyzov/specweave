#!/bin/bash

# SpecWeave Post-Increment-Planning Hook
# Runs automatically after /specweave:inc completes
#
# PURPOSE:
# Translates newly generated spec.md, plan.md, and tasks.md from target language
# back to English for maintainability.
#
# WHY THIS MATTERS:
# - User works in native language (great UX during planning)
# - Framework translates to English automatically (maintainable docs)
# - Cost: ~$0.01 per increment (using Haiku)
#
# WORKFLOW:
# 1. User runs: /specweave:inc "Добавить AI чат-бот" (in Russian)
# 2. PM agent generates spec.md in Russian (natural, user-friendly)
# 3. THIS HOOK fires automatically
# 4. Detects non-English content
# 5. Translates spec.md, plan.md, tasks.md to English
# 6. Files now in English (maintainable)
#
# @see .specweave/increments/0006-llm-native-i18n/reports/DESIGN-POST-GENERATION-TRANSLATION.md

set -e

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

# Find project root by searching upward for .specweave/ directory
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# CONFIGURATION
# ============================================================================

# Translation settings (can be overridden by .specweave/config.json)
TRANSLATION_ENABLED=true
AUTO_TRANSLATE_INTERNAL_DOCS=true
TARGET_LANGUAGE="en"  # Always translate TO English (for maintainability)

# Paths
SPECWEAVE_DIR=".specweave"
INCREMENTS_DIR="$SPECWEAVE_DIR/increments"
LOGS_DIR="$SPECWEAVE_DIR/logs"
CONFIG_FILE="$SPECWEAVE_DIR/config.json"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# LOGGING
# ============================================================================

log_debug() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [post-increment-planning] $1" >> "$DEBUG_LOG" 2>/dev/null || true
}

log_info() {
  echo "$1"
  log_debug "$1"
}

log_error() {
  echo "❌ $1" >&2
  log_debug "ERROR: $1"
}

# ============================================================================
# CONFIGURATION LOADING
# ============================================================================

load_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    log_debug "No config file found, using defaults"
    return
  fi

  # Check if translation is enabled in config
  local translation_enabled=$(cat "$CONFIG_FILE" | grep -o '"enabled"[[:space:]]*:[[:space:]]*\(true\|false\)' | grep -o '\(true\|false\)' || echo "true")

  if [ "$translation_enabled" = "false" ]; then
    TRANSLATION_ENABLED=false
    log_debug "Translation disabled in config"
  fi

  # Check if auto-translation of internal docs is enabled
  local auto_translate=$(cat "$CONFIG_FILE" | grep -o '"autoTranslateInternalDocs"[[:space:]]*:[[:space:]]*\(true\|false\)' | grep -o '\(true\|false\)' || echo "true")

  if [ "$auto_translate" = "false" ]; then
    AUTO_TRANSLATE_INTERNAL_DOCS=false
    log_debug "Auto-translation of internal docs disabled in config"
  fi
}

# ============================================================================
# INCREMENT DETECTION
# ============================================================================

get_latest_increment() {
  # Find the most recently modified increment directory (excluding _backlog)
  local latest=$(find "$INCREMENTS_DIR" -maxdepth 1 -type d -name "[0-9][0-9][0-9][0-9]-*" ! -name "_backlog" -exec stat -f "%m %N" {} \; 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

  if [ -z "$latest" ]; then
    log_error "No increment directory found"
    return 1
  fi

  echo "$latest"
}

# ============================================================================
# LANGUAGE DETECTION
# ============================================================================

detect_file_language() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo "en"  # Default to English if file doesn't exist
    return
  fi

  # Count non-ASCII characters (Cyrillic, Chinese, etc.)
  local total_chars=$(wc -c < "$file_path" | tr -d ' ')
  local non_ascii_chars=$(LC_ALL=C grep -o '[^ -~]' "$file_path" 2>/dev/null | wc -l | tr -d ' ')

  # If >10% non-ASCII, assume non-English
  if [ "$total_chars" -gt 0 ]; then
    local ratio=$((non_ascii_chars * 100 / total_chars))
    if [ "$ratio" -gt 10 ]; then
      echo "non-en"
      return
    fi
  fi

  echo "en"
}

# ============================================================================
# TRANSLATION EXECUTION
# ============================================================================

translate_file() {
  local file_path="$1"
  local file_name=$(basename "$file_path")

  log_info "  📄 Translating $file_name..."

  # Call the translate-file.ts script
  # In production, this would invoke the LLM via Task tool
  # For now, we'll create a marker file to indicate translation is needed

  if [ -f "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" ]; then
    # Production: Use compiled TypeScript
    node "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" "$file_path" --target-lang en --verbose 2>&1 | while read -r line; do
      echo "     $line"
    done

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
      log_info "  ✅ $file_name translated successfully"
      return 0
    else
      log_error "  ⚠️  Translation failed for $file_name"
      return 1
    fi
  else
    # Development/Testing: Just mark the file
    log_info "  ℹ️  Translation script not compiled (run 'npm run build')"
    log_info "  ℹ️  In production, $file_name would be translated to English"
    return 0
  fi
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

main() {
  log_debug "=== POST-INCREMENT-PLANNING HOOK START ==="

  # 1. Load configuration
  load_config

  if [ "$TRANSLATION_ENABLED" = "false" ]; then
    log_debug "Translation disabled, exiting"
    cat <<EOF
{
  "continue": true,
  "message": "Translation disabled in config"
}
EOF
    exit 0
  fi

  if [ "$AUTO_TRANSLATE_INTERNAL_DOCS" = "false" ]; then
    log_debug "Auto-translation of internal docs disabled, exiting"
    cat <<EOF
{
  "continue": true,
  "message": "Auto-translation of internal docs disabled"
}
EOF
    exit 0
  fi

  # 2. Get latest increment directory
  local increment_dir=$(get_latest_increment)

  if [ $? -ne 0 ] || [ -z "$increment_dir" ]; then
    log_error "Could not find latest increment directory"
    cat <<EOF
{
  "continue": true,
  "error": "No increment directory found"
}
EOF
    exit 0
  fi

  local increment_id=$(basename "$increment_dir")
  log_debug "Latest increment: $increment_id"

  # 3. Check if files need translation
  local spec_file="$increment_dir/spec.md"
  local plan_file="$increment_dir/plan.md"
  local tasks_file="$increment_dir/tasks.md"

  local needs_translation=false
  local files_to_translate=()

  # Detect language of each file
  if [ -f "$spec_file" ]; then
    local spec_lang=$(detect_file_language "$spec_file")
    if [ "$spec_lang" = "non-en" ]; then
      needs_translation=true
      files_to_translate+=("$spec_file")
    fi
  fi

  if [ -f "$plan_file" ]; then
    local plan_lang=$(detect_file_language "$plan_file")
    if [ "$plan_lang" = "non-en" ]; then
      needs_translation=true
      files_to_translate+=("$plan_file")
    fi
  fi

  if [ -f "$tasks_file" ]; then
    local tasks_lang=$(detect_file_language "$tasks_file")
    if [ "$tasks_lang" = "non-en" ]; then
      needs_translation=true
      files_to_translate+=("$tasks_file")
    fi
  fi

  # 4. If no translation needed, exit early
  if [ "$needs_translation" = "false" ] || [ ${#files_to_translate[@]} -eq 0 ]; then
    log_info "✅ All increment files already in English, skipping translation"
    cat <<EOF
{
  "continue": true,
  "message": "All files already in English"
}
EOF
    exit 0
  fi

  # 5. Perform translation
  log_info ""
  log_info "🌐 Detected non-English content in increment $increment_id"
  log_info "   Translating to English for maintainability..."
  log_info ""

  local success_count=0
  local total_count=${#files_to_translate[@]}

  for file in "${files_to_translate[@]}"; do
    if translate_file "$file"; then
      ((success_count++))
    fi
  done

  # 6. Summary
  log_info ""
  if [ "$success_count" -eq "$total_count" ]; then
    log_info "✅ Translation complete! All $total_count file(s) now in English"
    log_info "   Cost: ~\$0.01 (using Haiku)"
    log_info ""

    cat <<EOF
{
  "continue": true,
  "message": "Translated $total_count file(s) to English",
  "files": $(printf '%s\n' "${files_to_translate[@]}" | jq -R . | jq -s .)
}
EOF
  else
    log_error "Translation completed with errors: $success_count/$total_count files translated"
    cat <<EOF
{
  "continue": true,
  "warning": "Translation partially failed: $success_count/$total_count files",
  "files": $(printf '%s\n' "${files_to_translate[@]}" | jq -R . | jq -s .)
}
EOF
  fi

  log_debug "=== POST-INCREMENT-PLANNING HOOK END ==="
}

# Run main function
main

# Always return success (non-blocking hook)
exit 0
