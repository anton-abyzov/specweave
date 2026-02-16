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

# Determine level: 1 = elevated, 2 = critical, 3+ = emergency
LEVEL="elevated"
[[ "$NEW_COUNT" -ge 2 ]] && LEVEL="critical"
[[ "$NEW_COUNT" -ge 3 ]] && LEVEL="emergency"

cat > "$PRESSURE_FILE" <<EOF
{"level":"$LEVEL","compactionCount":$NEW_COUNT,"lastCompaction":"$(date -Iseconds)"}
EOF

# Write prompt-health-alert.json with remediation advice (v1.0.268)
ADVICE=""
case "$LEVEL" in
  elevated)
    ADVICE="Context budget reduced to compact. Session is running long."
    ;;
  critical)
    ADVICE="Context budget at minimal. Consider starting a new session or setting contextBudget.level to off."
    ;;
  emergency)
    ADVICE="Context budget stripped to off (3+ compactions). Strongly recommend starting a new session."
    ;;
esac

ALERT_FILE="$STATE_DIR/prompt-health-alert.json"
cat > "$ALERT_FILE" <<EOF
{"level":"$LEVEL","compactionCount":$NEW_COUNT,"advice":"$ADVICE","timestamp":"$(date -Iseconds)"}
EOF

# Log compaction event for dashboard activity stream
mkdir -p "$(dirname "$STATE_DIR")/.specweave/logs" 2>/dev/null
_LOG_DIR="$STATE_DIR/../logs"
mkdir -p "$_LOG_DIR" 2>/dev/null
echo "[$(date -Iseconds)] COMPACTION #$NEW_COUNT | level=$LEVEL | $ADVICE" >> "$_LOG_DIR/prompt-health.log" 2>/dev/null

echo '{"continue":true}'
exit 0
