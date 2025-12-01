#!/bin/bash
# status-update.sh - Fast status line update (synchronous)
# Goal: <20ms execution, pure bash, no external processes
#
# NOTE: This is the LEGACY handler. New EDA architecture uses
# status-line-handler.sh which is EVENT-DRIVEN.
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

INC_ID="${1:-}"

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-line.json"
mkdir -p "$STATE_DIR" 2>/dev/null

# TTL check (10 seconds)
if [[ -f "$CACHE_FILE" ]]; then
  CACHE_AGE=$(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0)))
  [[ $CACHE_AGE -lt 10 ]] && exit 0
fi

# Find active increment if not provided
if [[ -z "$INC_ID" ]]; then
  for meta in "$PROJECT_ROOT/.specweave/increments"/[0-9]*/metadata.json; do
    [[ -f "$meta" ]] || continue
    STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$meta" | grep -o '"[^"]*"$' | tr -d '"')
    [[ "$STATUS" == "active" || "$STATUS" == "planning" ]] && {
      INC_ID=$(basename "$(dirname "$meta")")
      break
    }
  done
fi
[[ -z "$INC_ID" ]] && { echo '{"current":null}' > "$CACHE_FILE"; exit 0; }

TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/tasks.md"
[[ ! -f "$TASKS_FILE" ]] && exit 0

# Count tasks (pure bash, fast)
TOTAL=$(grep -c "^###\? T-" "$TASKS_FILE" 2>/dev/null || echo 0)
DONE=$(grep -c "\[x\]" "$TASKS_FILE" 2>/dev/null || echo 0)
PCT=0; [[ $TOTAL -gt 0 ]] && PCT=$((DONE * 100 / TOTAL))

# Write cache (atomic)
cat > "$CACHE_FILE" << EOF
{"current":{"id":"$INC_ID","completed":$DONE,"total":$TOTAL,"percentage":$PCT},"ts":"$(date +%s)"}
EOF
exit 0
