#!/bin/bash
# status-line-handler.sh - Event-driven status line updates
# Events: user-story.completed, user-story.reopened, increment.done, increment.archived, increment.reopened
#
# This handler updates the status line ONLY when meaningful events occur:
# - User story completed (all ACs + tasks done for that US)
# - User story reopened (US tasks/ACs unchecked)
# - Increment lifecycle changes (done, archived, reopened)
#
# It does NOT update on every task.md edit - that would cause:
# - Race conditions (multiple rapid updates)
# - Performance issues (too frequent writes)
# - Status line flickering
#
# IMPORTANT: This script must be fast (<20ms) and never crash Claude
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

EVENT="${1:-}"
EVENT_DATA="${2:-}"

[[ -z "$EVENT" ]] && exit 0
[[ -z "$EVENT_DATA" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-line.json"
mkdir -p "$STATE_DIR" 2>/dev/null

# Log event (silent, async)
LOG_FILE="$PROJECT_ROOT/.specweave/logs/hooks.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
echo "[$(date '+%Y-%m-%d %H:%M:%S')] status-line-handler: $EVENT $EVENT_DATA" >> "$LOG_FILE" 2>/dev/null

# Parse event data
# Format: INC_ID:US_ID (for user-story events) or just INC_ID (for lifecycle events)
if [[ "$EVENT_DATA" == *":"* ]]; then
  INC_ID="${EVENT_DATA%%:*}"
  US_ID="${EVENT_DATA##*:}"
else
  INC_ID="$EVENT_DATA"
  US_ID=""
fi

# Handle events
case "$EVENT" in
  user-story.completed)
    # User story completed - update status line with US progress
    # This is the RIGHT time to update (not on every checkbox click)
    ;;

  user-story.reopened)
    # User story reopened - update status line
    ;;

  increment.done)
    # Increment completed - update status line to show completion
    ;;

  increment.archived)
    # Increment archived - clear from status line, find next active
    INC_ID=""  # Force finding a new active increment
    ;;

  increment.reopened)
    # Increment reopened - show it as active again
    ;;

  *)
    # Unknown event - ignore
    exit 0
    ;;
esac

# Find active increment if not determined or was archived
if [[ -z "$INC_ID" ]] || [[ "$EVENT" == "increment.archived" ]]; then
  INC_ID=""
  for meta in "$PROJECT_ROOT/.specweave/increments"/[0-9]*/metadata.json; do
    [[ -f "$meta" ]] || continue
    STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$meta" | grep -o '"[^"]*"$' | tr -d '"')
    [[ "$STATUS" == "active" || "$STATUS" == "planning" ]] && {
      INC_ID=$(basename "$(dirname "$meta")")
      break
    }
  done
fi

# If no active increment, write null status
if [[ -z "$INC_ID" ]]; then
  cat > "$CACHE_FILE" << 'EOF'
{"current":null,"event":"increment.archived","ts":"__TS__"}
EOF
  sed -i.bak "s/__TS__/$(date +%s)/" "$CACHE_FILE" 2>/dev/null
  rm -f "${CACHE_FILE}.bak" 2>/dev/null
  exit 0
fi

# Get increment paths
TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/tasks.md"
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
META_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"

# Check files exist
[[ ! -f "$TASKS_FILE" ]] && exit 0

# Count tasks (pure bash, fast)
TOTAL=$(grep -c "^###\? T-" "$TASKS_FILE" 2>/dev/null || echo 0)
DONE=$(grep -c "\[x\]" "$TASKS_FILE" 2>/dev/null || echo 0)
PCT=0; [[ $TOTAL -gt 0 ]] && PCT=$((DONE * 100 / TOTAL))

# Count user stories completed
US_TOTAL=0
US_DONE=0
if [[ -f "$SPEC_FILE" ]]; then
  # Count user story headers (## US-XXX or similar)
  US_TOTAL=$(grep -c "^##.*US-" "$SPEC_FILE" 2>/dev/null || echo 0)

  # Count by checking if all ACs for each US are checked
  # This is a simplified count - the actual detection is done by us-completion-detector.sh
  US_STATE_FILE="$STATE_DIR/.us-completion-$INC_ID"
  if [[ -f "$US_STATE_FILE" ]]; then
    US_DONE=$(grep -c "=yes$" "$US_STATE_FILE" 2>/dev/null || echo 0)
  fi
fi

# Get increment status
INC_STATUS="active"
if [[ -f "$META_FILE" ]]; then
  INC_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$META_FILE" | grep -o '"[^"]*"$' | tr -d '"')
fi

# Build detailed status JSON with event info
TMP_FILE="$CACHE_FILE.tmp.$$"
cat > "$TMP_FILE" << EOF
{
  "current": {
    "id": "$INC_ID",
    "completed": $DONE,
    "total": $TOTAL,
    "percentage": $PCT,
    "status": "$INC_STATUS",
    "userStories": {
      "completed": $US_DONE,
      "total": $US_TOTAL
    }
  },
  "lastEvent": {
    "type": "$EVENT",
    "data": "$EVENT_DATA"
  },
  "ts": "$(date +%s)"
}
EOF

# Atomic write (mv is atomic on same filesystem)
mv "$TMP_FILE" "$CACHE_FILE" 2>/dev/null

exit 0
