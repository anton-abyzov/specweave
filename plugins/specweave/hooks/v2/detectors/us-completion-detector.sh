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

# Parse tasks.md to find US -> Tasks mapping and completion status
# Format: ### T-001: Title
#         **Satisfies ACs**: AC-US1-01, AC-US1-02
#         **Status**: [x] completed

declare -A US_TASKS_TOTAL
declare -A US_TASKS_DONE

# Parse task blocks
CURRENT_TASK=""
CURRENT_STATUS=""
CURRENT_US=""

while IFS= read -r line; do
  # Detect task header
  if [[ "$line" =~ ^###[[:space:]]+T-[0-9]+ ]]; then
    # Process previous task
    if [[ -n "$CURRENT_US" ]] && [[ -n "$CURRENT_TASK" ]]; then
      US_TASKS_TOTAL["$CURRENT_US"]=$((${US_TASKS_TOTAL["$CURRENT_US"]:-0} + 1))
      if [[ "$CURRENT_STATUS" == "done" ]]; then
        US_TASKS_DONE["$CURRENT_US"]=$((${US_TASKS_DONE["$CURRENT_US"]:-0} + 1))
      fi
    fi
    CURRENT_TASK=$(echo "$line" | grep -o 'T-[0-9][0-9][0-9]' | head -1)
    CURRENT_STATUS=""
    CURRENT_US=""
  fi

  # Detect User Story reference
  if [[ "$line" =~ User[[:space:]]*Story.*:.*US-[0-9]+ ]]; then
    CURRENT_US=$(echo "$line" | grep -o 'US-[0-9][0-9][0-9]' | head -1)
  fi

  # Detect completion status
  if [[ "$line" =~ Status.*\[x\] ]]; then
    CURRENT_STATUS="done"
  fi
done < "$TASKS_FILE"

# Process last task
if [[ -n "$CURRENT_US" ]] && [[ -n "$CURRENT_TASK" ]]; then
  US_TASKS_TOTAL["$CURRENT_US"]=$((${US_TASKS_TOTAL["$CURRENT_US"]:-0} + 1))
  if [[ "$CURRENT_STATUS" == "done" ]]; then
    US_TASKS_DONE["$CURRENT_US"]=$((${US_TASKS_DONE["$CURRENT_US"]:-0} + 1))
  fi
fi

# Parse spec.md for AC completion status
# Format: - [x] **AC-US1-01**: Description
declare -A US_ACS_TOTAL
declare -A US_ACS_DONE

while IFS= read -r line; do
  # Find AC lines with US reference
  if [[ "$line" =~ AC-US([0-9]+)-[0-9]+ ]]; then
    US_NUM="${BASH_REMATCH[1]}"
    US_ID="US-${US_NUM}"

    US_ACS_TOTAL["$US_ID"]=$((${US_ACS_TOTAL["$US_ID"]:-0} + 1))

    if [[ "$line" =~ \[x\] ]]; then
      US_ACS_DONE["$US_ID"]=$((${US_ACS_DONE["$US_ID"]:-0} + 1))
    fi
  fi
done < "$SPEC_FILE"

# Load previous completion state
declare -A PREV_COMPLETE
if [[ -f "$US_STATE_FILE" ]]; then
  while IFS='=' read -r us status; do
    [[ -n "$us" ]] && PREV_COMPLETE["$us"]="$status"
  done < "$US_STATE_FILE"
fi

# Check completion for each US
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEW_STATE=""

for US_ID in "${!US_TASKS_TOTAL[@]}"; do
  TASKS_TOTAL=${US_TASKS_TOTAL["$US_ID"]:-0}
  TASKS_DONE=${US_TASKS_DONE["$US_ID"]:-0}
  ACS_TOTAL=${US_ACS_TOTAL["$US_ID"]:-0}
  ACS_DONE=${US_ACS_DONE["$US_ID"]:-0}

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

  PREV="${PREV_COMPLETE["$US_ID"]:-no}"

  # Detect transitions
  if [[ "$CURRENT_COMPLETE" == "yes" ]] && [[ "$PREV" == "no" ]]; then
    # User story just completed
    bash "$HOOK_DIR/queue/enqueue.sh" "user-story.completed" "$INC_ID:$US_ID" 2>/dev/null
  elif [[ "$CURRENT_COMPLETE" == "no" ]] && [[ "$PREV" == "yes" ]]; then
    # User story reopened
    bash "$HOOK_DIR/queue/enqueue.sh" "user-story.reopened" "$INC_ID:$US_ID" 2>/dev/null
  fi

  NEW_STATE="${NEW_STATE}${US_ID}=${CURRENT_COMPLETE}\n"
done

# Save new state
echo -e "$NEW_STATE" > "$US_STATE_FILE"

exit 0
