#!/bin/bash
# auto-status.sh - Show Auto Session Status
#
# Usage: auto-status.sh [OPTIONS]
#
# Options:
#   --json     Output in JSON format
#   --simple   Minimal output
#   -h, --help Show this help

set -e

# Options
JSON_OUTPUT=false
SIMPLE_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --simple)
            SIMPLE_OUTPUT=true
            shift
            ;;
        -h|--help)
            grep '^#' "$0" | grep -v '!/bin/bash' | sed 's/^# //'
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/auto-session.json"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"

# Check if session exists
if [ ! -f "$SESSION_FILE" ]; then
    if [ "$JSON_OUTPUT" = "true" ]; then
        echo '{"active": false, "message": "No auto session found"}'
    else
        echo "ℹ️ No auto session active"
        echo ""
        echo "Start one with: /sw:auto [increment-id]"
    fi
    exit 0
fi

# Read session
SESSION=$(cat "$SESSION_FILE")
STATUS=$(echo "$SESSION" | jq -r '.status')
SESSION_ID=$(echo "$SESSION" | jq -r '.sessionId')
ITERATION=$(echo "$SESSION" | jq -r '.iteration')
MAX_ITERATIONS=$(echo "$SESSION" | jq -r '.maxIterations')
CURRENT_INC=$(echo "$SESSION" | jq -r '.currentIncrement // empty')
START_TIME=$(echo "$SESSION" | jq -r '.startTime')
SIMPLE=$(echo "$SESSION" | jq -r '.simple // false')

# Calculate duration
START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$START_TIME" "+%s" 2>/dev/null || date -d "$START_TIME" "+%s" 2>/dev/null || echo "0")
NOW_EPOCH=$(date "+%s")
DURATION_SECS=$((NOW_EPOCH - START_EPOCH))
DURATION_MINS=$((DURATION_SECS / 60))
DURATION_HOURS=$((DURATION_MINS / 60))
REMAINING_MINS=$((DURATION_MINS % 60))

if [ $DURATION_HOURS -gt 0 ]; then
    DURATION="${DURATION_HOURS}h ${REMAINING_MINS}m"
else
    DURATION="${DURATION_MINS}m"
fi

# Count increments
QUEUE_LENGTH=$(echo "$SESSION" | jq '.incrementQueue | length')
COMPLETED_COUNT=$(echo "$SESSION" | jq '.completedIncrements | length')
FAILED_COUNT=$(echo "$SESSION" | jq '.failedIncrements | length')

# Get current increment progress
TASKS_COMPLETED=0
TASKS_TOTAL=0
if [ -n "$CURRENT_INC" ]; then
    INC_DIR="$INCREMENTS_DIR/$CURRENT_INC"
    if [ ! -d "$INC_DIR" ]; then
        # Try prefix match
        INC_DIR=$(find "$INCREMENTS_DIR" -maxdepth 1 -type d -name "${CURRENT_INC}*" | head -1)
    fi

    if [ -d "$INC_DIR" ]; then
        TASKS_FILE="$INC_DIR/tasks.md"
        if [ -f "$TASKS_FILE" ]; then
            TASKS_TOTAL=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null || echo "0")
            TASKS_COMPLETED=$(grep -c "\*\*Status\*\*: \[x\]" "$TASKS_FILE" 2>/dev/null || echo "0")
        fi
    fi
fi

# Check human gates
PENDING_GATE=$(echo "$SESSION" | jq -r '.humanGates.pending // empty')
HAS_PENDING_GATE=false
if [ -n "$PENDING_GATE" ] && [ "$PENDING_GATE" != "null" ]; then
    HAS_PENDING_GATE=true
    GATE_OPERATION=$(echo "$PENDING_GATE" | jq -r '.operation // "unknown"')
fi

# Check circuit breakers
OPEN_BREAKERS=$(echo "$SESSION" | jq '[.circuitBreakers | to_entries[] | select(.value.state == "open")] | length')

# JSON output
if [ "$JSON_OUTPUT" = "true" ]; then
    cat <<EOF
{
  "active": $([ "$STATUS" = "running" ] && echo "true" || echo "false"),
  "sessionId": "$SESSION_ID",
  "status": "$STATUS",
  "iteration": $ITERATION,
  "maxIterations": $MAX_ITERATIONS,
  "duration": "$DURATION",
  "currentIncrement": "$CURRENT_INC",
  "incrementQueue": {
    "total": $QUEUE_LENGTH,
    "completed": $COMPLETED_COUNT,
    "failed": $FAILED_COUNT
  },
  "currentProgress": {
    "tasksCompleted": $TASKS_COMPLETED,
    "tasksTotal": $TASKS_TOTAL
  },
  "humanGatePending": $HAS_PENDING_GATE,
  "openCircuitBreakers": $OPEN_BREAKERS,
  "simpleMode": $SIMPLE
}
EOF
    exit 0
fi

# Simple output
if [ "$SIMPLE_OUTPUT" = "true" ]; then
    if [ "$STATUS" = "running" ]; then
        echo "🤖 Auto: RUNNING"
        echo "   Iteration: $ITERATION/$MAX_ITERATIONS"
        echo "   Current: $CURRENT_INC ($TASKS_COMPLETED/$TASKS_TOTAL tasks)"
    else
        echo "ℹ️ Auto: $STATUS"
    fi
    exit 0
fi

# Full output
echo "🤖 Auto Session Status"
echo ""

# Status indicator
case $STATUS in
    running)
        echo "Status: 🟢 RUNNING"
        ;;
    completed)
        echo "Status: ✅ COMPLETED"
        ;;
    cancelled)
        echo "Status: 🛑 CANCELLED"
        ;;
    paused)
        echo "Status: ⏸️ PAUSED"
        ;;
    *)
        echo "Status: ❓ $STATUS"
        ;;
esac

echo ""
echo "Session ID: $SESSION_ID"
echo "Duration: $DURATION"
echo "Iteration: $ITERATION / $MAX_ITERATIONS"
[ "$SIMPLE" = "true" ] && echo "Mode: Simple (Ralph)"
echo ""

# Progress bar
PROGRESS=0
if [ $MAX_ITERATIONS -gt 0 ]; then
    PROGRESS=$((ITERATION * 100 / MAX_ITERATIONS))
fi
BAR_WIDTH=30
FILLED=$((PROGRESS * BAR_WIDTH / 100))
EMPTY=$((BAR_WIDTH - FILLED))
BAR=$(printf "%${FILLED}s" | tr ' ' '█')$(printf "%${EMPTY}s" | tr ' ' '░')
echo "Progress: [$BAR] $PROGRESS%"
echo ""

# Increment queue
echo "📋 Increment Queue"
echo "   Total: $QUEUE_LENGTH | Completed: $COMPLETED_COUNT | Failed: $FAILED_COUNT"
echo ""

# Current increment
if [ -n "$CURRENT_INC" ]; then
    echo "📌 Current Increment: $CURRENT_INC"
    if [ $TASKS_TOTAL -gt 0 ]; then
        TASK_PROGRESS=$((TASKS_COMPLETED * 100 / TASKS_TOTAL))
        echo "   Tasks: $TASKS_COMPLETED / $TASKS_TOTAL ($TASK_PROGRESS%)"
    fi
    echo ""
fi

# Warnings
if [ "$HAS_PENDING_GATE" = "true" ]; then
    echo "⚠️ HUMAN GATE PENDING"
    echo "   Operation: $GATE_OPERATION"
    echo "   Session is waiting for approval"
    echo "   Approve with: /sw:approve-gate"
    echo ""
fi

if [ "$OPEN_BREAKERS" -gt 0 ]; then
    echo "⚠️ CIRCUIT BREAKERS OPEN: $OPEN_BREAKERS"
    echo "   Some external services are temporarily unavailable"
    echo ""
fi

# Actions
if [ "$STATUS" = "running" ]; then
    echo "💡 Actions:"
    echo "   Cancel: /sw:cancel-auto"
    echo "   Let it run: Close this tab, work will continue"
fi
