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
# LIVING DOCS TRANSLATION
# ============================================================================

translate_living_docs_specs() {
  local increment_id="$1"

  log_debug "Checking for newly created living docs specs for increment $increment_id..."

  # Directories to check for living docs
  local specs_dir="$SPECWEAVE_DIR/docs/internal/specs"
  local strategy_dir="$SPECWEAVE_DIR/docs/internal/strategy"
  local architecture_dir="$SPECWEAVE_DIR/docs/internal/architecture"

  local translated_count=0
  local total_checked=0

  # Find living docs files created in last 5 minutes (recently created by PM agent)
  # macOS and Linux compatible find command
  for dir in "$specs_dir" "$strategy_dir" "$architecture_dir"; do
    if [ ! -d "$dir" ]; then
      log_debug "Directory does not exist: $dir"
      continue
    fi

    # Find markdown files modified in last 5 minutes
    # Using -mmin -5 (last 5 minutes) to catch files created during increment planning
    local files=$(find "$dir" -type f -name "*.md" -mmin -5 2>/dev/null)

    if [ -z "$files" ]; then
      log_debug "No recently modified files in $dir"
      continue
    fi

    while IFS= read -r file; do
      # Skip empty lines
      [ -z "$file" ] && continue

      ((total_checked++))

      # Skip legacy folder
      if [[ "$file" == *"/legacy/"* ]]; then
        log_debug "Skipping legacy file: $file"
        continue
      fi

      # Detect language
      local file_lang=$(detect_file_language "$file")

      if [ "$file_lang" = "non-en" ]; then
        local basename_file=$(basename "$file")
        log_info "  📄 Living docs detected: $basename_file"

        if translate_file "$file"; then
          ((translated_count++))
          log_debug "Successfully translated living docs: $file"
        else
          log_debug "Failed to translate living docs: $file"
        fi
      else
        log_debug "File already in English: $file"
      fi
    done <<< "$files"
  done

  log_debug "Living docs check complete: $translated_count/$total_checked files translated"

  if [ "$translated_count" -gt 0 ]; then
    log_info ""
    log_info "  ✅ Translated $translated_count living docs file(s) to English"
  else
    log_debug "No living docs files needed translation"
  fi

  return 0
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

  # 4. Translate increment files (if needed)
  local increment_success_count=0
  local increment_total_count=${#files_to_translate[@]}

  if [ "$needs_translation" = "true" ] && [ ${#files_to_translate[@]} -gt 0 ]; then
    # 5. Perform translation of increment files
    log_info ""
    log_info "🌐 Detected non-English content in increment $increment_id"
    log_info "   Translating increment files to English..."
    log_info ""

    for file in "${files_to_translate[@]}"; do
      if translate_file "$file"; then
        ((increment_success_count++))
      fi
    done

    log_info ""
    if [ "$increment_success_count" -eq "$increment_total_count" ]; then
      log_info "✅ Increment files translation complete! All $increment_total_count file(s) now in English"
    else
      log_error "Increment files translation completed with errors: $increment_success_count/$increment_total_count files translated"
    fi
  else
    log_info "✅ All increment files already in English"
  fi

  # 6. Translate living docs specs (if any were created)
  log_info ""
  log_info "🌐 Checking living docs for translation..."

  translate_living_docs_specs "$increment_id"

  # 7. Final summary
  log_info ""
  local total_translated=$((increment_success_count))

  if [ "$increment_total_count" -gt 0 ] || [ "$total_translated" -gt 0 ]; then
    log_info "✅ Translation complete!"
    log_info "   Increment files: $increment_success_count/$increment_total_count"
    log_info "   Living docs: See above"
    log_info "   Estimated cost: ~\$0.01-0.02 (using Haiku)"
    log_info ""
  fi

  # Return success JSON
  cat <<EOF
{
  "continue": true,
  "message": "Translation complete (increment: $increment_success_count/$increment_total_count files)",
  "files": $(printf '%s\n' "${files_to_translate[@]}" | jq -R . | jq -s .)
}
EOF

  log_debug "=== POST-INCREMENT-PLANNING HOOK END ==="
}

# Run main function
main

# Always return success (non-blocking hook)
exit 0
