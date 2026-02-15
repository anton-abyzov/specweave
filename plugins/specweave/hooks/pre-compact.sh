#!/bin/bash
# pre-compact.sh - Context pressure signal handler (v1.0.262)
#
# Fires when Claude Code approaches context limits (before compaction).
# Writes pressure state for UserPromptSubmit hook to read and reduce budget.
#
# Escalation: 1st compaction → "elevated", 2nd+ → "critical"
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"continue":true}' && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && echo '{"continue":true}' && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"
PRESSURE_FILE="$STATE_DIR/context-pressure.json"
mkdir -p "$STATE_DIR" 2>/dev/null

# Read previous compaction count for escalation
PREV_COUNT=0
if [[ -f "$PRESSURE_FILE" ]] && command -v jq >/dev/null 2>&1; then
  PREV_COUNT=$(jq -r '.compactionCount // 0' "$PRESSURE_FILE" 2>/dev/null || echo "0")
fi
NEW_COUNT=$((PREV_COUNT + 1))

# Determine level: 1 compaction = elevated, 2+ = critical
LEVEL="elevated"
[[ "$NEW_COUNT" -ge 2 ]] && LEVEL="critical"

cat > "$PRESSURE_FILE" <<EOF
{"level":"$LEVEL","compactionCount":$NEW_COUNT,"lastCompaction":"$(date -Iseconds)"}
EOF

echo '{"continue":true}'
exit 0
