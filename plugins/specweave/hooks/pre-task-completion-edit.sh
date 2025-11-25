#!/bin/bash
#
# pre-task-completion-edit.sh (v1.0.0)
#
# QUALITY GATE: Validates AC completion BEFORE allowing task status change to completed
#
# Triggered by: PreToolUse:Edit on .specweave/increments/*/tasks.md
#
# WORKFLOW:
# =========
# 1. Edit tool called on tasks.md
# 2. This hook fires (PreToolUse - BEFORE the edit executes)
# 3. Detect if edit is marking a task as completed ([ ] → [x])
# 4. Extract task's "Satisfies ACs" (e.g., AC-US1-01, AC-US1-02)
# 5. Verify those ACs are checked [x] in spec.md
# 6. If ACs verified → Allow edit (continue: true)
# 7. If ACs NOT verified → BLOCK edit (continue: false)
#
# ENFORCEMENT:
# ============
# Tasks CANNOT be marked complete unless their linked ACs are verified.
# This is the ONLY enforcement point - cannot be bypassed.
#
# See: ADR-0xxx (AC Verification Quality Gate)

set +e  # CRITICAL: Never crash Claude Code

# ============================================================================
# EMERGENCY KILL SWITCH
# ============================================================================
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

# ============================================================================
# RECURSION PREVENTION (v0.26.0 pattern)
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
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

# ============================================================================
# SETUP
# ============================================================================
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

echo "[$(date)] pre-task-completion-edit: Hook triggered" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# CAPTURE INPUT (PreToolUse receives tool_input JSON)
# ============================================================================
STDIN_DATA=$(cat)

# Log the input for debugging
echo "[$(date)] pre-task-completion-edit: Input: $STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# EXTRACT EDIT DETAILS
# ============================================================================
# PreToolUse:Edit receives: { "tool_input": { "file_path": "...", "old_string": "...", "new_string": "..." } }

FILE_PATH=""
OLD_STRING=""
NEW_STRING=""

if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$STDIN_DATA" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
  OLD_STRING=$(echo "$STDIN_DATA" | jq -r '.tool_input.old_string // empty' 2>/dev/null || echo "")
  NEW_STRING=$(echo "$STDIN_DATA" | jq -r '.tool_input.new_string // empty' 2>/dev/null || echo "")
else
  # Fallback: basic regex extraction
  FILE_PATH=$(echo "$STDIN_DATA" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
fi

echo "[$(date)] pre-task-completion-edit: file_path=$FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# EARLY EXIT: Only process tasks.md in active increments
# ============================================================================
if [[ "$FILE_PATH" != *"/tasks.md" ]]; then
  echo "[$(date)] pre-task-completion-edit: Not tasks.md, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

if [[ "$FILE_PATH" != *"/.specweave/increments/"* ]] && [[ "$FILE_PATH" != *".specweave/increments/"* ]]; then
  echo "[$(date)] pre-task-completion-edit: Not in increments/, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

if [[ "$FILE_PATH" == *"/_archive/"* ]]; then
  echo "[$(date)] pre-task-completion-edit: Archived increment, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

# ============================================================================
# DETECT TASK COMPLETION PATTERN
# ============================================================================
# Check if edit is changing status from pending to completed:
#   old_string: "**Status**: [ ] pending" or "**Status**: [ ]"
#   new_string: "**Status**: [x] completed" or "**Status**: [x]"

IS_COMPLETION=false

# Pattern 1: Full status line change
if [[ "$OLD_STRING" == *"**Status**:"*"[ ]"* ]] && [[ "$NEW_STRING" == *"**Status**:"*"[x]"* ]]; then
  IS_COMPLETION=true
fi

# Pattern 2: Just checkbox change (some formats)
if [[ "$OLD_STRING" == *"[ ] pending"* ]] && [[ "$NEW_STRING" == *"[x] completed"* ]]; then
  IS_COMPLETION=true
fi

# Pattern 3: Minimal checkbox change
if [[ "$OLD_STRING" == "[ ]"* ]] && [[ "$NEW_STRING" == "[x]"* ]]; then
  IS_COMPLETION=true
fi

if [[ "$IS_COMPLETION" != "true" ]]; then
  echo "[$(date)] pre-task-completion-edit: Not a completion edit, allowing" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

echo "[$(date)] pre-task-completion-edit: COMPLETION DETECTED - Validating ACs" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# EXTRACT INCREMENT AND TASK INFO
# ============================================================================
# Parse increment name from file path
# Pattern: .specweave/increments/XXXX-name/tasks.md
INCREMENT_NAME=$(echo "$FILE_PATH" | grep -o '[0-9]\{4\}-[a-zA-Z0-9_-]*' | tail -1 || echo "")
INCREMENT_DIR="$PROJECT_ROOT/.specweave/increments/$INCREMENT_NAME"
TASKS_FILE="$INCREMENT_DIR/tasks.md"
SPEC_FILE="$INCREMENT_DIR/spec.md"

echo "[$(date)] pre-task-completion-edit: INCREMENT=$INCREMENT_NAME" >> "$DEBUG_LOG" 2>/dev/null || true

if [[ -z "$INCREMENT_NAME" ]] || [[ ! -f "$TASKS_FILE" ]]; then
  echo "[$(date)] pre-task-completion-edit: Cannot find increment, allowing (safety)" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "[$(date)] pre-task-completion-edit: No spec.md found, allowing (no ACs to verify)" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true}
EOF
  exit 0
fi

# ============================================================================
# FIND TASK BEING COMPLETED
# ============================================================================
# We need to find which task is being completed by matching the old_string context
# Look for the task section that contains this status line

# Extract task context from old_string (task header should be nearby)
# First, read tasks.md and find the task that contains this status line

TASK_ID=""
SATISFIES_ACS=""

# Read tasks.md and find the task context
TASKS_CONTENT=$(cat "$TASKS_FILE" 2>/dev/null || echo "")

# Find the task ID that precedes the old_string status
# Tasks follow pattern:
# ### T-XXX: Title
# **User Story**: US-XXX
# **Satisfies ACs**: AC-XXX-YY, AC-XXX-ZZ
# **Status**: [ ] pending

# Strategy: Search for task header, then check if its status matches old_string
CURRENT_TASK_ID=""
CURRENT_ACS=""
IN_TASK=false

while IFS= read -r line; do
  # Detect task header
  if [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+): ]]; then
    CURRENT_TASK_ID="${BASH_REMATCH[1]}"
    CURRENT_ACS=""
    IN_TASK=true
  fi

  # Capture Satisfies ACs
  if [[ "$IN_TASK" == "true" ]] && [[ "$line" == *"**Satisfies ACs**:"* ]]; then
    # Extract AC IDs (comma-separated)
    CURRENT_ACS=$(echo "$line" | sed 's/.*\*\*Satisfies ACs\*\*:[[:space:]]*//' | tr -d '\r')
  fi

  # Check if this task's status matches what we're editing
  if [[ "$IN_TASK" == "true" ]] && [[ "$line" == *"**Status**:"*"[ ]"* ]]; then
    # This task is pending - check if the old_string matches
    # Compare by checking if old_string is a substring of status line
    if [[ "$OLD_STRING" == *"[ ]"* ]]; then
      TASK_ID="$CURRENT_TASK_ID"
      SATISFIES_ACS="$CURRENT_ACS"
      # Don't break - continue to find the EXACT task
    fi
  fi

  # Task boundary
  if [[ "$line" == "---" ]]; then
    IN_TASK=false
  fi
done <<< "$TASKS_CONTENT"

echo "[$(date)] pre-task-completion-edit: TASK_ID=$TASK_ID, SATISFIES_ACS=$SATISFIES_ACS" >> "$DEBUG_LOG" 2>/dev/null || true

if [[ -z "$TASK_ID" ]]; then
  echo "[$(date)] pre-task-completion-edit: Could not identify task, allowing (safety)" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true, "systemMessage": "Warning: Could not identify which task is being completed. AC verification skipped."}
EOF
  exit 0
fi

if [[ -z "$SATISFIES_ACS" ]]; then
  echo "[$(date)] pre-task-completion-edit: Task has no ACs, allowing" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{"continue": true, "systemMessage": "Task $TASK_ID has no Acceptance Criteria linked. Consider adding 'Satisfies ACs' field."}
EOF
  exit 0
fi

# ============================================================================
# VERIFY ACs IN spec.md
# ============================================================================
# Check that each AC in SATISFIES_ACS is marked [x] (checked) in spec.md
# AC format in spec.md:
# - [x] **AC-US1-01**: Description...
# - [ ] **AC-US1-02**: Description...

SPEC_CONTENT=$(cat "$SPEC_FILE" 2>/dev/null || echo "")
FAILED_ACS=""
PASSED_ACS=""

# Parse comma-separated ACs
IFS=',' read -ra AC_ARRAY <<< "$SATISFIES_ACS"

for ac_raw in "${AC_ARRAY[@]}"; do
  # Trim whitespace
  AC_ID=$(echo "$ac_raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  if [[ -z "$AC_ID" ]]; then
    continue
  fi

  echo "[$(date)] pre-task-completion-edit: Checking AC: $AC_ID" >> "$DEBUG_LOG" 2>/dev/null || true

  # Check if AC is checked [x] in spec.md
  # Look for: - [x] **AC-US1-01** (with optional bold around ID)
  if echo "$SPEC_CONTENT" | grep -qE "^\s*-\s*\[x\]\s*\*\*${AC_ID}\*\*"; then
    PASSED_ACS="$PASSED_ACS $AC_ID"
    echo "[$(date)] pre-task-completion-edit: $AC_ID is VERIFIED (checked in spec.md)" >> "$DEBUG_LOG" 2>/dev/null || true
  elif echo "$SPEC_CONTENT" | grep -qE "^\s*-\s*\[ \]\s*\*\*${AC_ID}\*\*"; then
    FAILED_ACS="$FAILED_ACS $AC_ID"
    echo "[$(date)] pre-task-completion-edit: $AC_ID is NOT verified (unchecked in spec.md)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    # AC not found in spec.md - warn but allow
    echo "[$(date)] pre-task-completion-edit: $AC_ID not found in spec.md (warning)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
done

# ============================================================================
# DECISION: ALLOW OR BLOCK
# ============================================================================
FAILED_ACS=$(echo "$FAILED_ACS" | sed 's/^[[:space:]]*//')

if [[ -n "$FAILED_ACS" ]]; then
  # BLOCK the completion - ACs not verified
  echo "[$(date)] pre-task-completion-edit: BLOCKING - Unverified ACs: $FAILED_ACS" >> "$DEBUG_LOG" 2>/dev/null || true

  # Escape for JSON
  FAILED_ACS_ESCAPED=$(echo "$FAILED_ACS" | sed 's/"/\\"/g')

  cat <<EOF
{
  "continue": false,
  "systemMessage": "BLOCKED: Task $TASK_ID cannot be marked complete.

Unverified Acceptance Criteria: $FAILED_ACS_ESCAPED

These ACs are NOT checked [x] in spec.md:
$FAILED_ACS_ESCAPED

ACTION REQUIRED:
1. Verify each AC is actually satisfied by the implementation
2. Check the AC in spec.md: Edit the line from [ ] to [x]
3. Then retry marking this task as completed

This quality gate ensures tasks are only completed when their ACs are verified."
}
EOF
  exit 0
fi

# All ACs verified - allow completion
echo "[$(date)] pre-task-completion-edit: ALLOWING - All ACs verified" >> "$DEBUG_LOG" 2>/dev/null || true

PASSED_ACS=$(echo "$PASSED_ACS" | sed 's/^[[:space:]]*//')
cat <<EOF
{
  "continue": true,
  "systemMessage": "AC Verification Passed for $TASK_ID. Verified ACs:$PASSED_ACS"
}
EOF

exit 0
