#!/bin/bash
# us-completion-detector.sh - Detect user story completion
# Events: user-story.completed, user-story.reopened
#
# A user story is complete when:
# 1. ALL tasks for that US are completed ([x])
# 2. ALL ACs for that US are checked ([x])
#
# Called from post-tool-use.sh when tasks.md or spec.md is edited
#
# CRITICAL FIX (v1.0.127): Rewritten for bash 3.2 compatibility
# - Removed associative arrays (requires bash 4+)
# - Uses temp files instead for US tracking
#
# CROSS-PLATFORM (v1.0.127): Works on macOS, Linux, and Windows (Git Bash/WSL)
# - Uses portable commands (grep, sed, cat, echo)
# - mktemp with fallback for different systems
# - No stat commands (different syntax per OS)
#
# IMPORTANT: This script must be fast (<50ms) and never crash
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

INC_ID="${1:-}"
[[ -z "$INC_ID" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"
TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/tasks.md"
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
US_STATE_FILE="$STATE_DIR/.us-completion-$INC_ID"

mkdir -p "$STATE_DIR" 2>/dev/null

[[ ! -f "$TASKS_FILE" ]] && exit 0
[[ ! -f "$SPEC_FILE" ]] && exit 0

# Create temp directory for processing
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'us-detect')
trap "rm -rf $TEMP_DIR" EXIT

# Initialize temp files for tracking
mkdir -p "$TEMP_DIR/tasks_total" "$TEMP_DIR/tasks_done" "$TEMP_DIR/acs_total" "$TEMP_DIR/acs_done" 2>/dev/null

# Parse tasks.md to find US -> Tasks mapping and completion status
# Format: ### T-001: Title
#         **User Story**: US-003
#         **Status**: [x] completed

CURRENT_TASK=""
CURRENT_STATUS=""
CURRENT_US=""

while IFS= read -r line; do
  # Detect task header
  if echo "$line" | grep -qE '^###[[:space:]]+T-[0-9]+'; then
    # Process previous task
    if [[ -n "$CURRENT_US" ]] && [[ -n "$CURRENT_TASK" ]]; then
      # Increment task count for this US
      COUNT=$(cat "$TEMP_DIR/tasks_total/$CURRENT_US" 2>/dev/null || echo 0)
      echo $((COUNT + 1)) > "$TEMP_DIR/tasks_total/$CURRENT_US"

      if [[ "$CURRENT_STATUS" == "done" ]]; then
        DONE=$(cat "$TEMP_DIR/tasks_done/$CURRENT_US" 2>/dev/null || echo 0)
        echo $((DONE + 1)) > "$TEMP_DIR/tasks_done/$CURRENT_US"
      fi
    fi
    CURRENT_TASK=$(echo "$line" | grep -o 'T-[0-9][0-9][0-9]' | head -1)
    CURRENT_STATUS=""
    CURRENT_US=""
  fi

  # Detect User Story reference (format: US-001, US-002, etc.)
  if echo "$line" | grep -qE 'User[[:space:]]*Story.*:[[:space:]]*US-[0-9]+'; then
    CURRENT_US=$(echo "$line" | grep -o 'US-[0-9][0-9][0-9]' | head -1)
  fi

  # Detect completion status
  if echo "$line" | grep -qE 'Status.*\[x\]'; then
    CURRENT_STATUS="done"
  fi
done < "$TASKS_FILE"

# Process last task
if [[ -n "$CURRENT_US" ]] && [[ -n "$CURRENT_TASK" ]]; then
  COUNT=$(cat "$TEMP_DIR/tasks_total/$CURRENT_US" 2>/dev/null || echo 0)
  echo $((COUNT + 1)) > "$TEMP_DIR/tasks_total/$CURRENT_US"

  if [[ "$CURRENT_STATUS" == "done" ]]; then
    DONE=$(cat "$TEMP_DIR/tasks_done/$CURRENT_US" 2>/dev/null || echo 0)
    echo $((DONE + 1)) > "$TEMP_DIR/tasks_done/$CURRENT_US"
  fi
fi

# Parse spec.md for AC completion status
# Format: - [x] **AC-US1-01**: Description
# CRITICAL FIX (v1.0.127): Pad US number to match tasks.md format (US-001, US-002, etc.)

while IFS= read -r line; do
  # Find AC lines with US reference (AC-US1-01, AC-US2-05, etc.)
  if echo "$line" | grep -qE 'AC-US[0-9]+-[0-9]+'; then
    # Extract US number from AC-USX-YY pattern
    US_NUM=$(echo "$line" | sed -n 's/.*AC-US\([0-9]*\)-.*/\1/p' | head -1)

    if [[ -n "$US_NUM" ]]; then
      # Pad to 3 digits to match tasks.md format (US-001, US-002, etc.)
      US_ID=$(printf "US-%03d" "$US_NUM")

      # Increment AC count for this US
      COUNT=$(cat "$TEMP_DIR/acs_total/$US_ID" 2>/dev/null || echo 0)
      echo $((COUNT + 1)) > "$TEMP_DIR/acs_total/$US_ID"

      if echo "$line" | grep -qE '\[x\]'; then
        DONE=$(cat "$TEMP_DIR/acs_done/$US_ID" 2>/dev/null || echo 0)
        echo $((DONE + 1)) > "$TEMP_DIR/acs_done/$US_ID"
      fi
    fi
  fi
done < "$SPEC_FILE"

# Load previous completion state
# Format: US-001=yes, US-002=no
if [[ -f "$US_STATE_FILE" ]]; then
  while IFS='=' read -r us status; do
    [[ -n "$us" ]] && echo "$status" > "$TEMP_DIR/prev/$us"
  done < "$US_STATE_FILE"
fi
mkdir -p "$TEMP_DIR/prev" 2>/dev/null

# Check completion for each US that has tasks
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEW_STATE=""

for US_FILE in "$TEMP_DIR/tasks_total"/*; do
  [[ ! -f "$US_FILE" ]] && continue

  US_ID=$(basename "$US_FILE")

  TASKS_TOTAL=$(cat "$TEMP_DIR/tasks_total/$US_ID" 2>/dev/null || echo 0)
  TASKS_DONE=$(cat "$TEMP_DIR/tasks_done/$US_ID" 2>/dev/null || echo 0)
  ACS_TOTAL=$(cat "$TEMP_DIR/acs_total/$US_ID" 2>/dev/null || echo 0)
  ACS_DONE=$(cat "$TEMP_DIR/acs_done/$US_ID" 2>/dev/null || echo 0)

  # US is complete if ALL tasks done AND ALL ACs checked
  CURRENT_COMPLETE="no"
  if [[ $TASKS_TOTAL -gt 0 ]] && [[ $TASKS_DONE -eq $TASKS_TOTAL ]]; then
    if [[ $ACS_TOTAL -gt 0 ]] && [[ $ACS_DONE -eq $ACS_TOTAL ]]; then
      CURRENT_COMPLETE="yes"
    elif [[ $ACS_TOTAL -eq 0 ]]; then
      # No ACs defined, just check tasks
      CURRENT_COMPLETE="yes"
    fi
  fi

  PREV=$(cat "$TEMP_DIR/prev/$US_ID" 2>/dev/null || echo "no")

  # Detect transitions and emit events
  if [[ "$CURRENT_COMPLETE" == "yes" ]] && [[ "$PREV" == "no" ]]; then
    # User story just completed - emit event
    bash "$HOOK_DIR/queue/enqueue.sh" "user-story.completed" "$INC_ID:$US_ID" 2>/dev/null
  elif [[ "$CURRENT_COMPLETE" == "no" ]] && [[ "$PREV" == "yes" ]]; then
    # User story reopened - emit event
    bash "$HOOK_DIR/queue/enqueue.sh" "user-story.reopened" "$INC_ID:$US_ID" 2>/dev/null
  fi

  NEW_STATE="${NEW_STATE}${US_ID}=${CURRENT_COMPLETE}
"
done

# Save new state
echo "$NEW_STATE" > "$US_STATE_FILE"

exit 0
