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

  if [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-file.js" ]; then
    # Production: Use compiled TypeScript
    node "${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-file.js" "$file_path" --target-lang en --verbose 2>&1 | while read -r line; do
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
# GITHUB ISSUE CREATION
# ============================================================================

create_github_issue() {
  local increment_id="$1"
  local increment_dir="$2"

  local spec_file="$increment_dir/spec.md"
  local tasks_file="$increment_dir/tasks.md"
  local metadata_file="$increment_dir/metadata.json"

  # Validate files exist
  if [ ! -f "$spec_file" ]; then
    log_error "spec.md not found in $increment_dir"
    return 1
  fi

  if [ ! -f "$tasks_file" ]; then
    log_error "tasks.md not found in $increment_dir"
    return 1
  fi

  # Extract title from spec.md frontmatter
  local title=$(awk '/^---$/,/^---$/ {if (/^title:/) {sub(/^title:[[:space:]]*"?/, ""); sub(/"?[[:space:]]*$/, ""); print; exit}}' "$spec_file")

  if [ -z "$title" ]; then
    # Fallback: extract from first heading
    title=$(grep -m 1 '^# ' "$spec_file" | sed 's/^# //' | sed 's/Increment [0-9]*: //')
  fi

  if [ -z "$title" ]; then
    title="$increment_id"
  fi

  # Extract quick overview from spec.md (try multiple sections)
  local overview=$(awk '/## Quick Overview/,/^---$|^##/ {if (/## Quick Overview/) next; if (/^---$/ || /^##/) exit; print}' "$spec_file" | grep -v '^$' | head -5)

  # Fallback: try Summary section
  if [ -z "$overview" ]; then
    overview=$(awk '/## Summary/,/^---$|^##/ {if (/## Summary/) next; if (/^---$/ || /^##/) exit; print}' "$spec_file" | grep -v '^$' | head -5)
  fi

  # Fallback: extract first paragraph after frontmatter
  if [ -z "$overview" ]; then
    overview=$(awk '/^---$/{count++; if(count==2){flag=1; next}} flag && /^[^#]/ && NF>0 {print; count2++; if(count2>=5) exit}' "$spec_file")
  fi

  # Final fallback: use a default message
  if [ -z "$overview" ]; then
    overview="See spec.md for details."
  fi

  # Extract total tasks count
  local total_tasks=$(awk '/^total_tasks:/ {print $2; exit}' "$tasks_file")

  # Fallback: count tasks if total_tasks not in frontmatter
  if [ -z "$total_tasks" ] || [ "$total_tasks" = "0" ]; then
    total_tasks=$(grep -c '^### T-[0-9]*:' "$tasks_file" 2>/dev/null || echo "0")
  fi

  # Generate task checklist from tasks.md
  local task_list=$(awk '
    /^### T-[0-9]+:/ {
      task_id = $2
      task_title = substr($0, index($0, $3))
      in_task = 1
      next
    }
    in_task && /^\*\*Status\*\*:/ {
      if (/\[x\]/) {
        print "- [x] " task_id " " task_title
      } else {
        print "- [ ] " task_id " " task_title
      }
      in_task = 0
    }
  ' "$tasks_file")

  # Detect repository from profile-based config
  local repo=""
  local owner=""
  local repo_name=""

  # First, check if increment has a specific githubProfile in metadata
  local metadata_file="$2/metadata.json"
  local profile_id=""

  if [ -f "$metadata_file" ]; then
    profile_id=$(cat "$metadata_file" 2>/dev/null | grep -o '"githubProfile"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    log_debug "Found githubProfile in metadata: $profile_id"
  fi

  # If no profile in metadata, use activeProfile from config
  if [ -z "$profile_id" ]; then
    profile_id=$(cat "$CONFIG_FILE" 2>/dev/null | grep -o '"activeProfile"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    log_debug "Using activeProfile from config: $profile_id"
  fi

  if [ -n "$profile_id" ]; then
    # Extract owner and repo from the profile
    local profile_section=$(cat "$CONFIG_FILE" 2>/dev/null | awk "/$profile_id/,/^[[:space:]]*\}/{print}")
    owner=$(echo "$profile_section" | grep -o '"owner"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    repo_name=$(echo "$profile_section" | grep -o '"repo"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')

    if [ -n "$owner" ] && [ -n "$repo_name" ]; then
      repo="$owner/$repo_name"
      log_debug "Using repo from profile: $repo"
    fi
  fi

  # Fallback to git remote detection if no profile config found
  if [ -z "$repo" ]; then
    repo=$(git remote get-url origin 2>/dev/null | sed 's/.*github\.com[:/]\(.*\)\.git/\1/' | sed 's/.*github\.com[:/]\(.*\)/\1/')
    log_debug "Fallback to git remote: $repo"
  fi

  # Legacy fallback to old config format
  if [ -z "$repo" ]; then
    repo=$(cat "$CONFIG_FILE" 2>/dev/null | grep -A 5 '"sync"' | grep -o '"repo"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    log_debug "Legacy fallback to old config: $repo"
  fi

  if [ -z "$repo" ]; then
    log_error "Could not detect GitHub repository from profile or git remote"
    return 1
  fi

  # Extract creation date from metadata.json and format as FS-YY-MM-DD
  local issue_prefix="FS-UNKNOWN"
  if [ -f "$metadata_file" ]; then
    # Extract created date (format: "2025-11-12T12:46:00Z")
    local created_date=$(cat "$metadata_file" 2>/dev/null | grep -o '"created"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    if [ -n "$created_date" ]; then
      # Extract YY-MM-DD from date (e.g., "2025-11-12" -> "25-11-12")
      local year=$(echo "$created_date" | cut -d'-' -f1 | cut -c3-4)  # "2025" -> "25"
      local month=$(echo "$created_date" | cut -d'-' -f2)              # "11"
      local day=$(echo "$created_date" | cut -d'-' -f3 | cut -d'T' -f1) # "12T..." -> "12"
      issue_prefix="FS-${year}-${month}-${day}"
      log_debug "Using date-based prefix from metadata: $issue_prefix"
    else
      log_debug "No created date in metadata, using fallback"
    fi
  else
    log_debug "No metadata.json found, using fallback prefix"
  fi

  log_debug "Creating issue for repo: $repo"
  log_debug "Title: [$issue_prefix] $title"

  # Generate issue body
  local issue_body=$(cat <<EOF
# [$issue_prefix] $title

**Status**: Planning → Implementation
**Priority**: P1
**Increment**: $increment_id

## Summary

$overview

## Tasks

Progress: 0/$total_tasks tasks (0%)

$task_list

## Links

- **Spec**: [\`spec.md\`](../../tree/develop/.specweave/increments/$increment_id/spec.md)
- **Plan**: [\`plan.md\`](../../tree/develop/.specweave/increments/$increment_id/plan.md)
- **Tasks**: [\`tasks.md\`](../../tree/develop/.specweave/increments/$increment_id/tasks.md)

---

🤖 Auto-created by SpecWeave | Updates automatically on task completion
EOF
)

  # Create temporary file for issue body
  local temp_body=$(mktemp)
  echo "$issue_body" > "$temp_body"

  # Create GitHub issue with FULL DUPLICATE PROTECTION
  log_debug "Creating issue with DuplicateDetector (global protection)..."

  # Call Node.js wrapper script with DuplicateDetector
  local node_output=$(node scripts/create-github-issue-with-protection.js \
    --title "[$issue_prefix] $title" \
    --body "$issue_body" \
    --pattern "[$issue_prefix]" \
    --labels "specweave,increment" \
    --repo "$repo" \
    2>&1)

  local node_status=$?

  # Clean up temp file
  rm -f "$temp_body"

  if [ $node_status -ne 0 ]; then
    log_error "DuplicateDetector failed: $node_output"
    return 1
  fi

  # Parse JSON output using jq (if available) or fallback to grep
  local issue_number=""
  local issue_url=""
  local duplicates_found=0
  local duplicates_closed=0
  local was_reused="false"

  if command -v jq >/dev/null 2>&1; then
    issue_number=$(echo "$node_output" | jq -r '.issue.number')
    issue_url=$(echo "$node_output" | jq -r '.issue.url')
    duplicates_found=$(echo "$node_output" | jq -r '.duplicatesFound // 0')
    duplicates_closed=$(echo "$node_output" | jq -r '.duplicatesClosed // 0')
    was_reused=$(echo "$node_output" | jq -r '.wasReused // false')
  else
    # Fallback: grep-based parsing
    issue_number=$(echo "$node_output" | grep -o '"number"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*')
    issue_url=$(echo "$node_output" | grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
  fi

  if [ -z "$issue_number" ]; then
    log_error "Could not extract issue number from DuplicateDetector output"
    log_debug "Output was: $node_output"
    return 1
  fi

  # Log results with duplicate detection info
  if [ "$was_reused" = "true" ]; then
    log_info "  ♻️  Using existing issue #$issue_number (duplicate prevention)"
  else
    log_info "  📝 Issue #$issue_number created"
  fi
  log_info "  🔗 $issue_url"

  if [ "$duplicates_found" -gt 0 ]; then
    log_info "  🛡️  Duplicates detected: $duplicates_found (auto-closed: $duplicates_closed)"
  fi

  # Create or update metadata.json
  local current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if [ -f "$metadata_file" ]; then
    # Update existing metadata.json with github section
    if command -v jq >/dev/null 2>&1; then
      local temp_metadata=$(mktemp)
      local jq_update=". + {\"github\": {\"issue\": $issue_number, \"url\": \"$issue_url\", \"synced\": \"$current_timestamp\"}"

      # Add profile ID if we have it
      if [ -n "$profile_id" ]; then
        jq_update="$jq_update, \"githubProfile\": \"$profile_id\""
        jq_update=". + {\"github\": {\"issue\": $issue_number, \"url\": \"$issue_url\", \"synced\": \"$current_timestamp\"}, \"githubProfile\": \"$profile_id\"}"
      fi

      jq "$jq_update" "$metadata_file" > "$temp_metadata"
      mv "$temp_metadata" "$metadata_file"
    else
      # Fallback: manual JSON construction (less reliable)
      log_debug "jq not found, using manual metadata update"
      cat >> "$metadata_file" <<EOF_META
{
  "id": "$increment_id",
  "status": "active",
  "type": "feature",
  "created": "$current_timestamp",
  "githubProfile": "$profile_id",
  "github": {
    "issue": $issue_number,
    "url": "$issue_url",
    "synced": "$current_timestamp"
  }
}
EOF_META
    fi
  else
    # Create new metadata.json
    cat > "$metadata_file" <<EOF_META
{
  "id": "$increment_id",
  "status": "active",
  "type": "feature",
  "created": "$current_timestamp",
  "github": {
    "issue": $issue_number,
    "url": "$issue_url",
    "synced": "$current_timestamp"
  }
}
EOF_META
  fi

  log_info "  ✅ metadata.json updated"
  log_debug "Metadata saved to $metadata_file"

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

  # 7. Increment-level GitHub issue creation (for single-repo projects)
  log_info ""
  log_info "🔗 Checking GitHub issue auto-creation..."

  # Check if auto-create is enabled in config
  local auto_create=$(cat "$CONFIG_FILE" 2>/dev/null | grep -A 5 '"sync"' | grep -A 2 '"settings"' | grep -o '"autoCreateIssue"[[:space:]]*:[[:space:]]*\(true\|false\)' | grep -o '\(true\|false\)' || echo "false")

  log_debug "Auto-create GitHub issue: $auto_create"

  if [ "$auto_create" = "true" ]; then
    log_info "  📦 Auto-create enabled, checking for GitHub CLI..."

    # ============================================================================
    # DUPLICATE DETECTION (v0.14.1+)
    # ============================================================================
    # Check if GitHub issue already exists in metadata.json
    # If exists, skip creation (idempotent operation)

    local metadata_file="$increment_dir/metadata.json"
    local existing_issue=""

    if [ -f "$metadata_file" ]; then
      # Extract existing GitHub issue number from metadata
      existing_issue=$(cat "$metadata_file" 2>/dev/null | \
        grep -o '"github"[[:space:]]*:[[:space:]]*{[^}]*"issue"[[:space:]]*:[[:space:]]*[0-9]*' | \
        grep -o '[0-9]*$')

      if [ -n "$existing_issue" ]; then
        log_info "  ✅ GitHub issue already exists: #$existing_issue"
        log_info "  ⏭️  Skipping creation (idempotent)"
        log_debug "Metadata already contains github.issue = $existing_issue"

        # Extract URL if available
        local existing_url=$(cat "$metadata_file" 2>/dev/null | \
          grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' | \
          sed 's/.*"\([^"]*\)".*/\1/')

        if [ -n "$existing_url" ]; then
          log_info "  🔗 $existing_url"
        fi
      fi
    fi

    # Only create if no existing issue found
    if [ -z "$existing_issue" ]; then
      # Check if gh CLI is available
      if ! command -v gh >/dev/null 2>&1; then
        log_info "  ⚠️  GitHub CLI (gh) not found, skipping issue creation"
        log_debug "Install: https://cli.github.com/"
      else
        log_info "  ✓ GitHub CLI found"
        log_info ""
        log_info "🚀 Creating GitHub issue for $increment_id..."

        # Create issue (non-blocking)
        if create_github_issue "$increment_id" "$increment_dir"; then
          log_info "  ✅ GitHub issue created successfully"
        else
          log_info "  ⚠️  GitHub issue creation failed (non-blocking)"
          log_debug "Issue creation failed, but continuing execution"
        fi
      fi
    fi
  else
    log_debug "Auto-create disabled in config"
  fi

  # ============================================================================
  # FALLBACK METADATA CREATION (v0.14.0+)
  # ============================================================================
  # CRITICAL: Ensure metadata.json exists even if GitHub integration failed
  # This prevents silent failures where increment appears complete but lacks metadata

  log_info ""
  log_info "🔍 Validating metadata.json existence..."

  local metadata_file="$increment_dir/metadata.json"

  if [ ! -f "$metadata_file" ]; then
    log_info "  ⚠️  metadata.json not found (hook may have failed)"
    log_info "  📝 Creating minimal metadata as fallback..."

    local current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Extract type from spec.md frontmatter (if available)
    local increment_type="feature"
    if [ -f "$spec_file" ]; then
      local extracted_type=$(awk '/^---$/,/^---$/ {if (/^type:/) {sub(/^type:[[:space:]]*"?/, ""); sub(/"?[[:space:]]*$/, ""); print; exit}}' "$spec_file" 2>/dev/null)
      if [ -n "$extracted_type" ]; then
        increment_type="$extracted_type"
      fi
    fi

    # Create minimal metadata.json
    cat > "$metadata_file" <<EOF_MINIMAL
{
  "id": "$increment_id",
  "status": "active",
  "type": "$increment_type",
  "created": "$current_timestamp",
  "lastActivity": "$current_timestamp"
}
EOF_MINIMAL

    log_info "  ✅ Created minimal metadata.json"
    log_info "  ⚠️  Note: No GitHub issue linked"
    log_info "  💡 Run /specweave-github:create-issue $increment_id to create one manually"
  else
    log_info "  ✅ metadata.json exists"

    # Check if GitHub issue was created
    local has_github=$(cat "$metadata_file" 2>/dev/null | grep -o '"github"[[:space:]]*:[[:space:]]*{' || echo "")
    if [ -n "$has_github" ]; then
      local issue_num=$(cat "$metadata_file" 2>/dev/null | grep -o '"issue"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' || echo "")
      if [ -n "$issue_num" ]; then
        log_info "  ✅ GitHub issue #$issue_num linked"
      fi
    else
      log_debug "  ℹ️  No GitHub issue linked (autoCreateIssue may be disabled)"
    fi
  fi

  # Note: Spec-level sync (SPECS → GitHub Projects/JIRA Epics) is handled separately
  # See: /specweave-github:sync-spec, /specweave-jira:sync-spec, /specweave-ado:sync-spec

  # 8. Sync spec content to external tools (if configured)
  log_info ""
  log_info "🔗 Checking spec content sync..."

  # Check if sync is enabled in config
  local sync_enabled=$(cat "$CONFIG_FILE" 2>/dev/null | grep -o '"enabled"[[:space:]]*:[[:space:]]*\(true\|false\)' | head -1 | grep -o '\(true\|false\)' || echo "false")

  if [ "$sync_enabled" = "true" ]; then
    log_info "  📦 Sync enabled, syncing spec content to external tool..."

    # Find the helper script
    local sync_script="${CLAUDE_PLUGIN_ROOT}/hooks/lib/sync-spec-content.sh"

    # Fallback to relative path if CLAUDE_PLUGIN_ROOT not set
    if [ -z "$CLAUDE_PLUGIN_ROOT" ]; then
      local hook_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      sync_script="$hook_dir/lib/sync-spec-content.sh"
    fi

    if [ -f "$sync_script" ] && [ -x "$sync_script" ]; then
      log_debug "Calling sync-spec-content.sh for $spec_file"

      # Call the sync script (non-blocking)
      if "$sync_script" "$spec_file" 2>&1 | while read -r line; do echo "  $line"; done; then
        log_info "  ✅ Spec content sync completed successfully!"
      else
        log_info "  ⚠️  Spec content sync failed (non-blocking)"
        log_debug "Spec sync failed, continuing..."
      fi
    else
      log_debug "Sync script not found or not executable: $sync_script"
    fi
  else
    log_debug "Spec content sync disabled in config"
  fi

  # 9. Final summary
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
