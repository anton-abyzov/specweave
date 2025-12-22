#!/bin/bash
# task-ac-sync-guard.sh - Enforce Task-AC synchronization on tasks.md edits
#
# v0.35.2+: When a task is marked complete in tasks.md, this hook:
# 1. Marks all **Acceptance** checkboxes in the completed task as [x]
# 2. Extracts the AC tags from the completed task (e.g., AC-US1-01, AC-US1-02)
# 3. Automatically marks those ACs as complete in spec.md
# 4. When ALL tasks are complete → auto-transitions status to ready_for_review
#
# This implements EDA (Event-Driven Architecture) for SpecWeave task-AC sync.
#
# PostToolUse hook - runs AFTER Edit/Write tool completes on tasks.md
#
# CROSS-PLATFORM: Works on macOS, Linux, and Windows (Git Bash/WSL)
# - Uses portable sed syntax with fallbacks
# - Handles CRLF line endings (Windows)
# - Supports both - and * bullet formats
#
# CRITICAL: This hook must be NON-BLOCKING to prevent Claude Code crashes
# PostToolUse hooks run AFTER the tool completes, so they don't need JSON responses.
# However, they must NEVER crash or hang.
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)

# Skip if not a SpecWeave project
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/task-ac-sync.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Read stdin for tool input
INPUT=$(cat)

# Extract file_path from tool input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')

# Only care about tasks.md files in increments folder
if [[ "$FILE_PATH" != */.specweave/increments/*/tasks.md ]]; then
  exit 0
fi

echo "[$(date)] 📋 Task edit detected: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true

# Extract increment directory from file path
INCREMENT_DIR=$(dirname "$FILE_PATH")
SPEC_FILE="$INCREMENT_DIR/spec.md"
METADATA_FILE="$INCREMENT_DIR/metadata.json"

# Check if this edit marks a task as complete
# Look for pattern: **Status**: [x] completed
NEW_CONTENT=$(echo "$INPUT" | grep -o '"new_string"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)

if ! echo "$NEW_CONTENT" | grep -qE '\[x\].*completed'; then
  echo "[$(date)] ⏭️  Not a task completion edit, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

echo "[$(date)] ✅ Task completion detected!" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# STEP 1: Mark task's **Acceptance** checkboxes as complete
# ============================================================================
# When a task is marked complete, all its Acceptance points should be checked.
# Format in tasks.md:
#   ### T-001: Task Title
#   **Acceptance**:
#   - [ ] Point 1
#   - [ ] Point 2
#   **Status**: [x] completed
#
# We need to find the task that was just completed and check its Acceptance items.
# Strategy: Parse tasks.md, find completed tasks, mark their unchecked Acceptance items.

ACCEPTANCE_UPDATED=0

# Create a temp file for safe in-place editing
TASKS_EDIT_TEMP=$(mktemp)
cp "$FILE_PATH" "$TASKS_EDIT_TEMP" 2>/dev/null || true

# Track state while parsing
IN_ACCEPTANCE_SECTION=0
CURRENT_TASK_COMPLETED=0
CURRENT_TASK_ID=""

# Process line by line to identify and update Acceptance checkboxes
while IFS= read -r line; do
  # Detect task header - reset state
  if [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+): ]]; then
    IN_ACCEPTANCE_SECTION=0
    CURRENT_TASK_COMPLETED=0
    CURRENT_TASK_ID="${BASH_REMATCH[1]}"
  fi

  # Detect **Acceptance**: section start
  if [[ "$line" =~ ^\*\*Acceptance\*\*: ]]; then
    IN_ACCEPTANCE_SECTION=1
  fi

  # Detect end of Acceptance section (next section or blank line followed by **)
  if [[ $IN_ACCEPTANCE_SECTION -eq 1 ]] && [[ "$line" =~ ^\*\*[A-Z] ]] && [[ ! "$line" =~ ^\*\*Acceptance ]]; then
    IN_ACCEPTANCE_SECTION=0
  fi

  # Detect completion status for current task
  if [[ "$line" =~ ^\*\*Status\*\*:[[:space:]]*\[x\] ]]; then
    CURRENT_TASK_COMPLETED=1
  fi
done < "$FILE_PATH"

# Now do the actual replacement: for completed tasks, check all Acceptance items
# We use awk with two-pass logic:
# Pass 1: Build list of completed task IDs (tasks where Status has [x])
# Pass 2: For those tasks, check their Acceptance items
#
# Since awk reads sequentially and Acceptance comes BEFORE Status in the file,
# we need to buffer the entire task block and process it when we see the next task.
awk '
  BEGIN {
    task_start = 0
    task_lines = ""
    task_completed = 0
  }

  # Task header - process previous task block first, then start new one
  /^### T-[0-9]+:/ {
    # Output previous task block (with modifications if completed)
    if (task_start > 0) {
      n = split(task_lines, lines, "\n")
      in_acceptance = 0
      for (i = 1; i <= n; i++) {
        line = lines[i]
        # Track Acceptance section
        if (line ~ /^\*\*Acceptance\*\*:/) in_acceptance = 1
        if (line ~ /^\*\*[A-Z]/ && line !~ /^\*\*Acceptance/) in_acceptance = 0
        # Check unchecked items in Acceptance section of completed tasks
        if (in_acceptance && task_completed && line ~ /^[-*] \[ \]/) {
          sub(/\[ \]/, "[x]", line)
        }
        print line
      }
    }
    # Start new task block
    task_start = NR
    task_lines = $0
    task_completed = 0
    next
  }

  # Accumulate lines and detect completion
  {
    if (task_start > 0) {
      task_lines = task_lines "\n" $0
      if ($0 ~ /^\*\*Status\*\*:[[:space:]]*\[x\]/) {
        task_completed = 1
      }
    } else {
      # Lines before first task (header content)
      print
    }
  }

  # End of file - process last task block
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
' "$FILE_PATH" > "$TASKS_EDIT_TEMP" 2>/dev/null

# Check if changes were made
if ! diff -q "$FILE_PATH" "$TASKS_EDIT_TEMP" >/dev/null 2>&1; then
  # Changes detected - update the file
  mv "$TASKS_EDIT_TEMP" "$FILE_PATH" 2>/dev/null
  ACCEPTANCE_UPDATED=1
  echo "[$(date)] ✅ Updated Acceptance checkboxes for completed tasks" >> "$DEBUG_LOG" 2>/dev/null || true
else
  rm -f "$TASKS_EDIT_TEMP" 2>/dev/null || true
  echo "[$(date)] ⏭️  No Acceptance checkboxes to update" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# STEP 2: Extract AC tags from the completed task
# ============================================================================
# The task format is:
# ### T-XXX: Task Title
# **Satisfies ACs**: AC-US1-01, AC-US1-02
# **Status**: [x] completed

# Read tasks.md to find completed tasks and their ACs
if [[ ! -f "$FILE_PATH" ]]; then
  echo "[$(date)] ⚠️  tasks.md not found: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# CROSS-PLATFORM: Convert CRLF to LF for Windows compatibility
# Create temp file with normalized line endings
TASKS_TEMP=$(mktemp)
tr -d '\r' < "$FILE_PATH" > "$TASKS_TEMP" 2>/dev/null || cat "$FILE_PATH" > "$TASKS_TEMP"

# Find all completed tasks and their AC tags
COMPLETED_ACS=()
CURRENT_TASK=""
CURRENT_ACS=""

while IFS= read -r line; do
  # Detect task header
  if [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+): ]]; then
    CURRENT_TASK="${BASH_REMATCH[1]}"
    CURRENT_ACS=""
  fi

  # Detect AC tags (handle optional whitespace variations)
  if [[ "$line" =~ ^\*\*Satisfies[[:space:]]*ACs\*\*:[[:space:]]*(.*) ]]; then
    CURRENT_ACS="${BASH_REMATCH[1]}"
  fi

  # Detect completion status
  if [[ "$line" =~ ^\*\*Status\*\*:[[:space:]]*\[x\] ]]; then
    if [[ -n "$CURRENT_ACS" ]]; then
      # Split ACs by comma and add to array
      IFS=',' read -ra AC_ARRAY <<< "$CURRENT_ACS"
      for ac in "${AC_ARRAY[@]}"; do
        ac=$(echo "$ac" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')  # Trim whitespace
        # Also remove any trailing \r (Windows)
        ac="${ac%$'\r'}"
        if [[ -n "$ac" ]]; then
          COMPLETED_ACS+=("$ac")
        fi
      done
    fi
  fi
done < "$TASKS_TEMP"

# Cleanup temp file
rm -f "$TASKS_TEMP" 2>/dev/null || true

echo "[$(date)] 📊 Completed ACs: ${COMPLETED_ACS[*]}" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# STEP 2: Mark ACs as complete in spec.md
# ============================================================================
# AC format in spec.md:
# - [ ] **AC-US1-01**: Description
# Should become:
# - [x] **AC-US1-01**: Description

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "[$(date)] ⚠️  spec.md not found: $SPEC_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

AC_UPDATED=0
for ac in "${COMPLETED_ACS[@]}"; do
  # Check if this AC exists and is not already marked complete
  # CROSS-PLATFORM: Support both - and * bullet formats, use # delimiter (AC names may contain /)
  if grep -qE "^[-*] \[ \] \*\*$ac\*\*" "$SPEC_FILE" 2>/dev/null; then
    # Update AC to complete (macOS sed -i '' vs Linux sed -i)
    # Use # as delimiter since AC names like "AC-US1/01" would break /
    sed -i '' "s#^[-*] \[ \] \*\*$ac\*\*#- [x] **$ac**#" "$SPEC_FILE" 2>/dev/null || \
    sed -i "s#^[-*] \[ \] \*\*$ac\*\*#- [x] **$ac**#" "$SPEC_FILE" 2>/dev/null
    echo "[$(date)] ✅ Marked AC complete: $ac" >> "$DEBUG_LOG" 2>/dev/null || true
    ((AC_UPDATED++))
  else
    echo "[$(date)] ⏭️  AC already complete or not found: $ac" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
done

if [[ $AC_UPDATED -gt 0 ]]; then
  echo "[$(date)] 📝 Updated $AC_UPDATED ACs in spec.md" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# STEP 3: Check if ALL tasks are complete → auto-transition to ready_for_review
# ============================================================================

TOTAL_TASKS=$(grep -c '^\*\*Status\*\*:' "$FILE_PATH" 2>/dev/null || echo 0)
COMPLETED_TASKS=$(grep -c '^\*\*Status\*\*:[[:space:]]*\[x\]' "$FILE_PATH" 2>/dev/null || echo 0)

echo "[$(date)] 📊 Task progress: $COMPLETED_TASKS / $TOTAL_TASKS" >> "$DEBUG_LOG" 2>/dev/null || true

if [[ "$TOTAL_TASKS" -gt 0 ]] && [[ "$COMPLETED_TASKS" -eq "$TOTAL_TASKS" ]]; then
  echo "[$(date)] 🎉 ALL TASKS COMPLETE! Checking for auto-transition..." >> "$DEBUG_LOG" 2>/dev/null || true

  # Check current status (requires jq for JSON manipulation)
  if ! command -v jq >/dev/null 2>&1; then
    echo "[$(date)] ⚠️  jq not installed - status auto-transition skipped" >> "$DEBUG_LOG" 2>/dev/null || true
    echo ""
    echo "⚠️  WARNING: jq not installed. Status auto-transition to ready_for_review skipped."
    echo "   Install jq: brew install jq (macOS) | apt install jq (Linux) | choco install jq (Windows)"
    echo ""
    exit 0
  fi

  if [[ -f "$METADATA_FILE" ]]; then
    CURRENT_STATUS=$(jq -r '.status // "active"' "$METADATA_FILE" 2>/dev/null)

    if [[ "$CURRENT_STATUS" == "active" ]] || [[ "$CURRENT_STATUS" == "in-progress" ]]; then
      # Auto-transition to ready_for_review (NEVER directly to completed!)
      echo "[$(date)] 🔄 Auto-transitioning status: $CURRENT_STATUS → ready_for_review" >> "$DEBUG_LOG" 2>/dev/null || true

      # Update metadata.json
      TMP_FILE=$(mktemp)
      jq '.status = "ready_for_review" | .updated = (now | strftime("%Y-%m-%dT%H:%M:%S.000Z"))' "$METADATA_FILE" > "$TMP_FILE" 2>/dev/null
      if [[ -s "$TMP_FILE" ]]; then
        mv "$TMP_FILE" "$METADATA_FILE"
        echo "[$(date)] ✅ Status updated to ready_for_review" >> "$DEBUG_LOG" 2>/dev/null || true

        # Output message to Claude
        echo ""
        echo "════════════════════════════════════════════════════════════════════"
        echo "  🎉 ALL TASKS COMPLETED! Status → ready_for_review"
        echo "════════════════════════════════════════════════════════════════════"
        echo ""
        echo "  Tasks: $COMPLETED_TASKS/$TOTAL_TASKS (100%)"
        echo "  ACs synced: $AC_UPDATED"
        echo ""
        echo "  Next step: Run /sw:done to close the increment"
        echo "  (PM validation will verify all ACs are complete)"
        echo ""
        echo "════════════════════════════════════════════════════════════════════"
      else
        rm -f "$TMP_FILE"
        echo "[$(date)] ⚠️  Failed to update metadata.json" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    else
      echo "[$(date)] ⏭️  Status is '$CURRENT_STATUS', not auto-transitioning" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# Always exit 0 - never crash Claude Code
exit 0
