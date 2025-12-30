#!/bin/bash
# stop-auto.sh - Stop Hook for Auto Continuation Loop
#
# This hook implements the Ralph Wiggum pattern:
# - Returns {"decision": "block"} to prevent Claude from exiting
# - Re-feeds prompt with iteration context
# - Returns {"decision": "approve"} when work is complete
#
# Claude Code Stop Hook receives:
# - stdin: JSON with transcript_path, stop_hook_active, etc.
# - Expected output: JSON with decision (approve/block) and optional reason/systemMessage

set -e

# Read input from stdin
INPUT=$(cat)

# Parse input fields
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/auto-session.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

# Helper: Output approve decision
approve() {
    local reason="${1:-Session complete}"
    echo "{\"decision\": \"approve\", \"reason\": \"$reason\"}"
    exit 0
}

# Helper: Output block decision with system message
block() {
    local reason="$1"
    local system_message="$2"
    if [ -n "$system_message" ]; then
        echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": \"$system_message\"}"
    else
        echo "{\"decision\": \"block\", \"reason\": \"$reason\"}"
    fi
    exit 0
}

# CRITICAL: Check if stop_hook_active flag is set
# This prevents infinite continuation loops
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    # Already continued once in this stop cycle, allow exit to prevent infinite loop
    approve "Stop hook already active, allowing exit to prevent loop"
fi

# Check if session file exists
if [ ! -f "$SESSION_FILE" ]; then
    # No auto session active, allow normal exit
    approve "No auto session active"
fi

# Load session state
SESSION=$(cat "$SESSION_FILE")
STATUS=$(echo "$SESSION" | jq -r '.status // "unknown"')
SESSION_ID=$(echo "$SESSION" | jq -r '.sessionId // "unknown"')
ITERATION=$(echo "$SESSION" | jq -r '.iteration // 0')
MAX_ITERATIONS=$(echo "$SESSION" | jq -r '.maxIterations // 100')
CURRENT_INCREMENT=$(echo "$SESSION" | jq -r '.currentIncrement // null')
SIMPLE_MODE=$(echo "$SESSION" | jq -r '.simple // false')
START_TIME=$(echo "$SESSION" | jq -r '.startTime // ""')
MAX_HOURS=$(echo "$SESSION" | jq -r '.maxHours // null')

# Check if session is not running
if [ "$STATUS" != "running" ]; then
    approve "Session status is $STATUS, not running"
fi

# Check max iterations
NEXT_ITERATION=$((ITERATION + 1))
if [ "$NEXT_ITERATION" -ge "$MAX_ITERATIONS" ]; then
    # Update session to completed
    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.status = "completed" | .endTime = $now | .endReason = "max_iterations_reached"' \
        > "$SESSION_FILE"
    approve "Max iterations ($MAX_ITERATIONS) reached"
fi

# Check max hours if configured
if [ "$MAX_HOURS" != "null" ] && [ -n "$START_TIME" ]; then
    # Cross-platform date parsing (macOS, Linux, BSD)
    # Try multiple date formats for maximum compatibility
    parse_iso_date() {
        local dt="$1"
        # macOS/BSD: date -j -f format
        date -j -f "%Y-%m-%dT%H:%M:%SZ" "$dt" "+%s" 2>/dev/null && return
        # GNU/Linux: date -d
        date -d "$dt" "+%s" 2>/dev/null && return
        # Fallback: Python (available on most systems)
        python3 -c "import datetime; print(int(datetime.datetime.fromisoformat('$dt'.replace('Z','+00:00')).timestamp()))" 2>/dev/null && return
        # Last resort: node.js
        node -e "console.log(Math.floor(new Date('$dt').getTime()/1000))" 2>/dev/null && return
        # If all fail, return 0
        echo "0"
    }

    START_EPOCH=$(parse_iso_date "$START_TIME")
    NOW_EPOCH=$(date "+%s")
    ELAPSED_HOURS=$(( (NOW_EPOCH - START_EPOCH) / 3600 ))

    if [ "$ELAPSED_HOURS" -ge "$MAX_HOURS" ]; then
        echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.status = "completed" | .endTime = $now | .endReason = "max_hours_exceeded"' \
            > "$SESSION_FILE"
        approve "Max hours ($MAX_HOURS) exceeded"
    fi
fi

# Check for completion promise in transcript
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Look for completion tag in Claude's output
    if grep -q "<auto-complete>DONE</auto-complete>" "$TRANSCRIPT_PATH" 2>/dev/null; then
        echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.status = "completed" | .endTime = $now | .endReason = "completion_promise"' \
            > "$SESSION_FILE"
        approve "Completion promise detected"
    fi
fi

# Check tasks.md for completion (primary completion signal)
if [ -n "$CURRENT_INCREMENT" ]; then
    TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT/tasks.md"

    if [ -f "$TASKS_FILE" ]; then
        # Count total tasks and completed tasks (trim whitespace for cross-platform)
        TOTAL_TASKS=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        COMPLETED_TASKS=$(grep -c '\[x\].*completed' "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        # Ensure we have valid integers
        TOTAL_TASKS=${TOTAL_TASKS:-0}
        COMPLETED_TASKS=${COMPLETED_TASKS:-0}

        if [ "$TOTAL_TASKS" -gt 0 ] && [ "$COMPLETED_TASKS" -ge "$TOTAL_TASKS" ]; then
            # All tasks completed for current increment
            # Check if there are more increments in queue
            QUEUE_LENGTH=$(echo "$SESSION" | jq '.incrementQueue | length')

            if [ "$QUEUE_LENGTH" -le 1 ]; then
                # Last increment completed
                echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                    '.status = "completed" | .endTime = $now | .endReason = "all_tasks_complete"' \
                    > "$SESSION_FILE"
                approve "All tasks completed"
            fi

            # More increments in queue, continue to next
            # (The /sw:next command will handle transition)
        fi
    fi
fi

# Check for human gate pending
PENDING_GATE=$(echo "$SESSION" | jq -r '.humanGates.pending // null')
if [ "$PENDING_GATE" != "null" ]; then
    GATE_OP=$(echo "$PENDING_GATE" | jq -r '.operation // "unknown"')
    approve "Human gate pending: $GATE_OP - waiting for user approval"
fi

# Update iteration and continue
echo "$SESSION" | jq --argjson iter "$NEXT_ITERATION" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '.iteration = $iter | .lastActivity = $now' \
    > "$SESSION_FILE"

# Build context message based on mode
if [ "$SIMPLE_MODE" = "true" ]; then
    # Simple/Ralph mode - minimal context
    CONTEXT="Continue working. Iteration $NEXT_ITERATION/$MAX_ITERATIONS."
else
    # Full mode - rich context
    PROGRESS=""
    if [ -n "$CURRENT_INCREMENT" ] && [ -f "$TASKS_FILE" ]; then
        PROGRESS="Tasks: $COMPLETED_TASKS/$TOTAL_TASKS completed."
    fi
    CONTEXT="AUTO ACTIVE: Iteration $NEXT_ITERATION/$MAX_ITERATIONS. $PROGRESS Continue with /sw:do to complete remaining tasks."
fi

# Log iteration
mkdir -p "$LOGS_DIR"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"iteration\",\"iteration\":$NEXT_ITERATION,\"increment\":\"$CURRENT_INCREMENT\"}" >> "$LOGS_DIR/auto-iterations.log"

# Block exit and re-feed prompt
block "Work incomplete, continuing..." "$CONTEXT"
