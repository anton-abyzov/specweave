#!/bin/bash
# cancel-auto.sh - EMERGENCY Cancel Auto Session
#
# ⚠️  EMERGENCY USE ONLY - For manual cancellation only.
# Auto mode runs until completion. Just close Claude Code to pause.
#
# Usage: cancel-auto.sh [OPTIONS]
#
# Options:
#   --force     Force cancel without confirmation
#   -h, --help  Show this help

set -e

FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            grep '^#' "$0" | grep -v '!/bin/bash' | sed 's/^# //'
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Run with -h for help"
            exit 1
            ;;
    esac
done

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/auto-session.json"
LOCK_FILE="$STATE_DIR/active-session.lock"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

# Check if session exists
if [ ! -f "$SESSION_FILE" ]; then
    echo "ℹ️ No auto session active"
    exit 0
fi

# Load session
SESSION=$(cat "$SESSION_FILE")
SESSION_ID=$(echo "$SESSION" | jq -r '.sessionId')
STATUS=$(echo "$SESSION" | jq -r '.status')
ITERATION=$(echo "$SESSION" | jq -r '.iteration')
CURRENT_INCREMENT=$(echo "$SESSION" | jq -r '.currentIncrement')
START_TIME=$(echo "$SESSION" | jq -r '.startTime')
COMPLETED=$(echo "$SESSION" | jq -r '.completedIncrements | length')

# Check if already not running
if [ "$STATUS" != "running" ]; then
    echo "ℹ️ Session already $STATUS"
    exit 0
fi

# Calculate duration
START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$START_TIME" "+%s" 2>/dev/null || date -d "$START_TIME" "+%s" 2>/dev/null || echo "0")
NOW_EPOCH=$(date "+%s")
DURATION_SEC=$((NOW_EPOCH - START_EPOCH))
DURATION_MIN=$((DURATION_SEC / 60))
DURATION_HOURS=$((DURATION_MIN / 60))

if [ "$DURATION_HOURS" -gt 0 ]; then
    DURATION_STR="${DURATION_HOURS}h $((DURATION_MIN % 60))m"
else
    DURATION_STR="${DURATION_MIN}m"
fi

# Show session info
echo "📊 Current Session"
echo ""
echo "Session ID: $SESSION_ID"
echo "Status: $STATUS"
echo "Iteration: $ITERATION"
echo "Current Increment: $CURRENT_INCREMENT"
echo "Increments Completed: $COMPLETED"
echo "Duration: $DURATION_STR"
echo ""

# Confirm cancellation
if [ "$FORCE" != "true" ]; then
    read -p "Cancel this session? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Update session status
echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '.status = "cancelled" | .endTime = $now | .endReason = "User manually cancelled"' \
    > "$SESSION_FILE"

# Remove lock
rm -f "$LOCK_FILE"

# Log cancellation
mkdir -p "$LOGS_DIR"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"session_cancel\",\"sessionId\":\"$SESSION_ID\",\"reason\":\"user_manual_cancel\",\"iterations\":$ITERATION}" >> "$LOGS_DIR/auto-sessions.log"

# Generate summary report
SUMMARY_FILE="$LOGS_DIR/auto-$SESSION_ID-summary.md"

cat > "$SUMMARY_FILE" << EOF
# Auto Session Summary

**Session ID**: $SESSION_ID
**Status**: ❌ Manually Cancelled
**End Reason**: User manually cancelled session

## Timeline

| Metric | Value |
|--------|-------|
| Start Time | $START_TIME |
| End Time | $(date -u +%Y-%m-%dT%H:%M:%SZ) |
| Duration | $DURATION_STR |
| Iterations | $ITERATION |

## Progress

| Metric | Value |
|--------|-------|
| Increments Completed | $COMPLETED |
| Last Increment | $CURRENT_INCREMENT |

---

*Session cancelled by user*
EOF

echo ""
echo "✅ Session cancelled"
echo ""
echo "Summary: $SUMMARY_FILE"
echo ""
echo "💡 To resume work later, just run /sw:do"
