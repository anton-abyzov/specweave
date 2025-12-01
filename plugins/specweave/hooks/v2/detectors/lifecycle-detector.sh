#!/bin/bash
# lifecycle-detector.sh - Detect increment lifecycle changes
# Events: increment.created, increment.done, increment.archived, increment.reopened
#
# Called from post-tool-use.sh when metadata.json is edited
# Compares current vs previous status to detect transitions
#
# IMPORTANT: This script must be fast (<10ms) and never crash
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
PREV_STATUS_FILE="$STATE_DIR/.prev-status-$INC_ID"
META_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
ARCHIVE_META="$PROJECT_ROOT/.specweave/increments/_archive/$INC_ID/metadata.json"

mkdir -p "$STATE_DIR" 2>/dev/null

# Detect event
EVENT=""
EVENT_DATA="$INC_ID"

# Check if archived (folder moved to _archive/)
if [[ -f "$ARCHIVE_META" ]] && [[ ! -f "$META_FILE" ]]; then
  # Check if we already detected this
  PREV=$(cat "$PREV_STATUS_FILE" 2>/dev/null || echo "")
  if [[ "$PREV" != "archived" ]]; then
    EVENT="increment.archived"
    echo "archived" > "$PREV_STATUS_FILE"
  fi

elif [[ -f "$META_FILE" ]]; then
  # Get current status (fast grep, no jq)
  CURRENT_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$META_FILE" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  [[ -z "$CURRENT_STATUS" ]] && exit 0

  # Get previous status
  PREV_STATUS=$(cat "$PREV_STATUS_FILE" 2>/dev/null || echo "")

  # Detect transitions
  if [[ -z "$PREV_STATUS" ]]; then
    # First time seeing this increment
    if [[ "$CURRENT_STATUS" == "planning" ]] || [[ "$CURRENT_STATUS" == "active" ]]; then
      EVENT="increment.created"
    fi
  elif [[ "$PREV_STATUS" != "$CURRENT_STATUS" ]]; then
    # Status changed
    case "$CURRENT_STATUS" in
      completed)
        EVENT="increment.done"
        ;;
      active)
        # Was it completed before? That's a reopen
        if [[ "$PREV_STATUS" == "completed" ]]; then
          EVENT="increment.reopened"
        fi
        ;;
      paused|abandoned)
        # Status changes we don't emit events for
        ;;
    esac
  fi

  # Save current status
  echo "$CURRENT_STATUS" > "$PREV_STATUS_FILE"
fi

# Fire event if detected
if [[ -n "$EVENT" ]]; then
  HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  bash "$HOOK_DIR/queue/enqueue.sh" "$EVENT" "$EVENT_DATA" 2>/dev/null
fi

exit 0
