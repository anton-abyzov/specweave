#!/bin/bash
# task-ac-sync-guard.sh - Non-blocking Task-AC synchronization
#
# v1.0.43+: FULLY NON-BLOCKING - operations ALWAYS succeed, errors become warnings
#
# CRITICAL DESIGN PRINCIPLE:
#   - This hook MUST NEVER cause an Edit to fail
#   - All errors are logged as warnings
#   - Original operation ALWAYS succeeds
#   - If sync fails, user gets warning message (not error)
#
# When a task is marked complete in tasks.md, this hook:
# 1. Marks all **Acceptance** checkboxes in the completed task as [x]
# 2. Extracts the AC tags from the completed task (e.g., AC-US1-01, AC-US1-02)
# 3. Automatically marks those ACs as complete in spec.md
# 4. When ALL tasks are complete -> auto-transitions status to ready_for_review
#
# PostToolUse hook - runs AFTER Edit/Write tool completes on tasks.md
#
# CROSS-PLATFORM: Works on macOS, Linux, and Windows (Git Bash/WSL)

set +e  # CRITICAL: Never exit on error

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# ============================================================================
# CONSTANTS
# ============================================================================

HOOK_NAME="task-ac-sync"
HOOK_VERSION="1.0.43"

# ============================================================================
# PROJECT ROOT DETECTION (CRITICAL: must NOT fallback to pwd!)
# ============================================================================

find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  # Return empty - NOT pwd (prevents .specweave pollution)
  return 1
}

PROJECT_ROOT=$(find_project_root)
[[ -z "$PROJECT_ROOT" ]] && exit 0
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# ============================================================================
# LOGGING INFRASTRUCTURE
# ============================================================================

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/task-ac-sync.log"
WARNING_LOG="$LOGS_DIR/hook-warnings.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log_debug() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$DEBUG_LOG" 2>/dev/null || true
}

log_warning() {
  local message="$1"
  local details="${2:-}"

  # Always log to file
  {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING [$HOOK_NAME]: $message"
    [[ -n "$details" ]] && echo "  Details: $details"
  } >> "$WARNING_LOG" 2>/dev/null || true

  # Show to user - they should know the sync didn't work
  echo ""
  echo "  [Hook Warning] $HOOK_NAME: $message"
  [[ -n "$details" ]] && echo "  $details"
  echo "  (File operation succeeded - sync issue only)"
  echo ""
}

log_success() {
  local message="$1"
  log_debug "SUCCESS: $message"
}

# ============================================================================
# INPUT PARSING (with safe fallbacks)
# ============================================================================

# Read stdin with timeout protection
INPUT=$(timeout 1 cat 2>/dev/null || cat 2>/dev/null || echo '{}')

# Extract file_path from tool input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')

# Only care about tasks.md files in increments folder
if [[ "$FILE_PATH" != */.specweave/increments/*/tasks.md ]]; then
  exit 0
fi

log_debug "Task edit detected: $FILE_PATH"

# Extract paths
INCREMENT_DIR=$(dirname "$FILE_PATH")
SPEC_FILE="$INCREMENT_DIR/spec.md"
METADATA_FILE="$INCREMENT_DIR/metadata.json"

# Verify files exist
if [[ ! -f "$FILE_PATH" ]]; then
  log_warning "tasks.md not found (may have been moved)" "$FILE_PATH"
  exit 0
fi

# ============================================================================
# STEP 0: Check if any task is marked complete
# ============================================================================

# Check if tasks.md has any completed tasks (check actual file, not edit input)
if ! grep -qE '^\*\*Status\*\*:[[:space:]]*\[x\]' "$FILE_PATH" 2>/dev/null; then
  log_debug "No completed tasks found, skipping"
  exit 0
fi

log_debug "Completed tasks detected - syncing ACs..."

# ============================================================================
# STEP 1: Mark task's **Acceptance** checkboxes as complete (NON-BLOCKING)
# ============================================================================

sync_acceptance_checkboxes() {
  log_debug "Syncing acceptance checkboxes..."

  # Create temp file for safe editing
  local temp_file
  temp_file=$(mktemp 2>/dev/null) || {
    log_warning "Failed to create temp file for acceptance sync"
    return 0
  }

  # Process with awk (buffered approach - never modifies during read)
  if ! awk '
    BEGIN {
      task_start = 0
      task_lines = ""
      task_completed = 0
    }

    /^### T-[0-9]+:/ {
      if (task_start > 0) {
        n = split(task_lines, lines, "\n")
        in_acceptance = 0
        for (i = 1; i <= n; i++) {
          line = lines[i]
          if (line ~ /^\*\*Acceptance\*\*:/) in_acceptance = 1
          if (line ~ /^\*\*[A-Z]/ && line !~ /^\*\*Acceptance/) in_acceptance = 0
          if (in_acceptance && task_completed && line ~ /^[-*] \[ \]/) {
            sub(/\[ \]/, "[x]", line)
          }
          print line
        }
      }
      task_start = NR
      task_lines = $0
      task_completed = 0
      next
    }

    {
      if (task_start > 0) {
        task_lines = task_lines "\n" $0
        if ($0 ~ /^\*\*Status\*\*:[[:space:]]*\[x\]/) {
          task_completed = 1
        }
      } else {
        print
      }
    }

    END {
      if (task_start > 0) {
        n = split(task_lines, lines, "\n")
        in_acceptance = 0
        for (i = 1; i <= n; i++) {
          line = lines[i]
          if (line ~ /^\*\*Acceptance\*\*:/) in_acceptance = 1
          if (line ~ /^\*\*[A-Z]/ && line !~ /^\*\*Acceptance/) in_acceptance = 0
          if (in_acceptance && task_completed && line ~ /^[-*] \[ \]/) {
            sub(/\[ \]/, "[x]", line)
          }
          print line
        }
      }
    }
  ' "$FILE_PATH" > "$temp_file" 2>/dev/null; then
    log_warning "awk processing failed for acceptance checkboxes"
    rm -f "$temp_file" 2>/dev/null
    return 0
  fi

  # Verify output is valid (not empty, not truncated)
  if [[ ! -s "$temp_file" ]]; then
    log_warning "awk produced empty output, skipping acceptance sync"
    rm -f "$temp_file" 2>/dev/null
    return 0
  fi

  # Check if changes were made
  if diff -q "$FILE_PATH" "$temp_file" >/dev/null 2>&1; then
    log_debug "No acceptance checkboxes to update"
    rm -f "$temp_file" 2>/dev/null
    return 0
  fi

  # Apply changes
  if mv "$temp_file" "$FILE_PATH" 2>/dev/null; then
    log_success "Updated acceptance checkboxes for completed tasks"
  else
    log_warning "Failed to update acceptance checkboxes" "mv failed"
    rm -f "$temp_file" 2>/dev/null
  fi

  return 0
}

# Run acceptance sync (never fails)
sync_acceptance_checkboxes

# ============================================================================
# STEP 2: Extract AC tags from completed tasks
# ============================================================================

extract_completed_acs() {
  local tasks_file="$1"
  local -a completed_acs=()

  # Normalize line endings for cross-platform compatibility
  local temp_normalized
  temp_normalized=$(mktemp 2>/dev/null) || {
    log_warning "Failed to create temp file for AC extraction"
    return 0
  }

  tr -d '\r' < "$tasks_file" > "$temp_normalized" 2>/dev/null || cat "$tasks_file" > "$temp_normalized"

  local current_task=""
  local current_acs=""

  while IFS= read -r line; do
    # Detect task header
    if [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+): ]]; then
      current_task="${BASH_REMATCH[1]}"
      current_acs=""
    fi

    # Detect AC tags (handle whitespace variations)
    if [[ "$line" =~ ^\*\*Satisfies[[:space:]]*ACs?\*\*:[[:space:]]*(.*) ]]; then
      current_acs="${BASH_REMATCH[1]}"
    fi

    # Detect completion status
    if [[ "$line" =~ ^\*\*Status\*\*:[[:space:]]*\[x\] ]]; then
      if [[ -n "$current_acs" ]]; then
        # Split ACs by comma
        IFS=',' read -ra AC_ARRAY <<< "$current_acs"
        for ac in "${AC_ARRAY[@]}"; do
          # Trim whitespace and carriage returns
          ac=$(echo "$ac" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
          ac="${ac%$'\r'}"
          [[ -n "$ac" ]] && completed_acs+=("$ac")
        done
      fi
    fi
  done < "$temp_normalized"

  rm -f "$temp_normalized" 2>/dev/null

  # Output space-separated list
  echo "${completed_acs[*]}"
}

COMPLETED_ACS_STRING=$(extract_completed_acs "$FILE_PATH")
read -ra COMPLETED_ACS <<< "$COMPLETED_ACS_STRING"

log_debug "Completed ACs: ${COMPLETED_ACS[*]}"

# ============================================================================
# STEP 3: Mark ACs as complete in spec.md (NON-BLOCKING)
# ============================================================================

sync_spec_acs() {
  if [[ ! -f "$SPEC_FILE" ]]; then
    log_debug "spec.md not found, skipping AC sync"
    return 0
  fi

  if [[ ${#COMPLETED_ACS[@]} -eq 0 ]]; then
    log_debug "No ACs to sync"
    return 0
  fi

  local updated_count=0
  local not_found_count=0
  local not_found_acs=()

  for ac in "${COMPLETED_ACS[@]}"; do
    [[ -z "$ac" ]] && continue

    # Escape special characters for grep/sed
    local ac_escaped
    ac_escaped=$(printf '%s' "$ac" | sed 's/[.[\*^$()+?{|\\]/\\&/g')

    # Check if AC exists and is unchecked
    # Support multiple formats:
    #   - [ ] **AC-US1-01**: Description
    #   - [ ] **AC-US1-01** Description
    #   - [ ] AC-US1-01: Description
    if grep -qE "^[-*][[:space:]]+\[ \][[:space:]]+(\*\*)?${ac_escaped}(\*\*)?" "$SPEC_FILE" 2>/dev/null; then
      # Try macOS sed first, then Linux
      if sed -i '' "s|^\([-*][[:space:]]\+\)\[ \]\([[:space:]]\+\)\(\*\*\)\?${ac_escaped}\(\*\*\)\?|\1[x]\2\3${ac}\4|" "$SPEC_FILE" 2>/dev/null || \
         sed -i "s|^\([-*][[:space:]]\+\)\[ \]\([[:space:]]\+\)\(\*\*\)\?${ac_escaped}\(\*\*\)\?|\1[x]\2\3${ac}\4|" "$SPEC_FILE" 2>/dev/null; then
        log_debug "Marked AC complete: $ac"
        ((updated_count++))
      else
        log_debug "sed failed for AC: $ac"
        not_found_acs+=("$ac")
        ((not_found_count++))
      fi
    else
      log_debug "AC not found or already complete: $ac"
      # Check if it's already complete
      if grep -qE "^[-*][[:space:]]+\[x\][[:space:]]+(\*\*)?${ac_escaped}(\*\*)?" "$SPEC_FILE" 2>/dev/null; then
        log_debug "AC already marked complete: $ac"
      else
        not_found_acs+=("$ac")
        ((not_found_count++))
      fi
    fi
  done

  if [[ $updated_count -gt 0 ]]; then
    log_success "Updated $updated_count ACs in spec.md"
  fi

  if [[ $not_found_count -gt 0 ]]; then
    log_warning "Some ACs could not be synced to spec.md" "Not found: ${not_found_acs[*]}"
  fi

  return 0
}

# Run spec AC sync (never fails)
sync_spec_acs

# ============================================================================
# STEP 4: Check if ALL tasks complete -> auto-transition to ready_for_review
# ============================================================================

check_auto_transition() {
  local total_tasks
  local completed_tasks

  total_tasks=$(grep -c '^\*\*Status\*\*:' "$FILE_PATH" 2>/dev/null || echo 0)
  completed_tasks=$(grep -c '^\*\*Status\*\*:[[:space:]]*\[x\]' "$FILE_PATH" 2>/dev/null || echo 0)

  log_debug "Task progress: $completed_tasks / $total_tasks"

  # Not all complete? Exit early
  if [[ "$total_tasks" -eq 0 ]] || [[ "$completed_tasks" -ne "$total_tasks" ]]; then
    return 0
  fi

  log_debug "ALL TASKS COMPLETE! Checking for auto-transition..."

  # Need jq for JSON manipulation
  if ! command -v jq >/dev/null 2>&1; then
    log_warning "jq not installed - status auto-transition skipped" \
      "Install: brew install jq (macOS) | apt install jq (Linux)"
    return 0
  fi

  if [[ ! -f "$METADATA_FILE" ]]; then
    log_debug "metadata.json not found, skipping auto-transition"
    return 0
  fi

  local current_status
  current_status=$(jq -r '.status // "active"' "$METADATA_FILE" 2>/dev/null)

  if [[ "$current_status" != "active" ]] && [[ "$current_status" != "in-progress" ]]; then
    log_debug "Status is '$current_status', not auto-transitioning"
    return 0
  fi

  # Auto-transition to ready_for_review
  log_debug "Auto-transitioning: $current_status -> ready_for_review"

  local tmp_file
  tmp_file=$(mktemp 2>/dev/null) || {
    log_warning "Failed to create temp file for status update"
    return 0
  }

  if jq '.status = "ready_for_review" | .updated = (now | strftime("%Y-%m-%dT%H:%M:%S.000Z"))' \
     "$METADATA_FILE" > "$tmp_file" 2>/dev/null && [[ -s "$tmp_file" ]]; then
    if mv "$tmp_file" "$METADATA_FILE" 2>/dev/null; then
      log_success "Status updated to ready_for_review"

      # Show success banner to user
      echo ""
      echo "  ALL TASKS COMPLETED! Status -> ready_for_review"
      echo "  ------------------------------------------------"
      echo "  Tasks: $completed_tasks/$total_tasks (100%)"
      echo ""
      echo "  Next step: Run /sw:done to close the increment"
      echo "  ------------------------------------------------"
      echo ""
    else
      log_warning "Failed to update metadata.json"
      rm -f "$tmp_file" 2>/dev/null
    fi
  else
    log_warning "jq failed to update metadata.json"
    rm -f "$tmp_file" 2>/dev/null
  fi

  return 0
}

# Run auto-transition check (never fails)
check_auto_transition

# ============================================================================
# STEP 5: Trigger LifecycleHookDispatcher.onTaskCompleted (NON-BLOCKING)
# ============================================================================

trigger_sync_task() {
  # Extract increment folder name (e.g. "0400-sync-pipeline-reliability")
  local increment_id
  increment_id=$(basename "$INCREMENT_DIR")

  [[ -z "$increment_id" ]] && return 0

  # Find specweave CLI (npx fallback)
  local sw_bin=""
  if command -v specweave >/dev/null 2>&1; then
    sw_bin="specweave"
  elif command -v npx >/dev/null 2>&1; then
    sw_bin="npx specweave"
  else
    log_debug "specweave CLI not found, skipping sync-task"
    return 0
  fi

  # Run in background — must not block the Edit operation
  (cd "$PROJECT_ROOT" && $sw_bin sync-task "$increment_id" >>"$DEBUG_LOG" 2>&1) &
  log_debug "Spawned sync-task for $increment_id (pid $!)"
  return 0
}

# Run sync-task trigger (never fails, never blocks)
trigger_sync_task

# ============================================================================
# ALWAYS EXIT SUCCESS
# ============================================================================

log_debug "Hook completed successfully"
exit 0
