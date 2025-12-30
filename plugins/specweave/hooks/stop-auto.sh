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

    # Check self-assessment score (Ralph-Loop pattern)
    # Look for <self-assessment>...Overall: X.XX...</self-assessment> in transcript
    SELF_SCORE=$(grep -oE 'Overall:\s*[0-9]+\.[0-9]+' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | grep -oE '[0-9]+\.[0-9]+')

    if [ -n "$SELF_SCORE" ]; then
        # Log the score
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"self_assessment\",\"score\":$SELF_SCORE,\"increment\":\"$CURRENT_INCREMENT\"}" >> "$LOGS_DIR/auto-iterations.log"

        # Check if score is critically low (< 0.50) - requires human review
        if [ "$(echo "$SELF_SCORE < 0.50" | bc 2>/dev/null || echo "0")" -eq 1 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg score "$SELF_SCORE" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "low_confidence_score" | .lastScore = ($score | tonumber)' \
                > "$SESSION_FILE"
            approve "Low confidence score ($SELF_SCORE < 0.50), requesting human review"
        fi

        # Check if score indicates concern (0.50-0.69) - log but continue
        if [ "$(echo "$SELF_SCORE >= 0.50 && $SELF_SCORE < 0.70" | bc 2>/dev/null || echo "0")" -eq 1 ]; then
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"caution\",\"score\":$SELF_SCORE,\"message\":\"Moderate confidence, self-review recommended\"}" >> "$LOGS_DIR/auto-iterations.log"
        fi
    fi

    # Check for failed tests in transcript (hard stop)
    if grep -q "Tests failed\|FAIL\|npm ERR!" "$TRANSCRIPT_PATH" 2>/dev/null; then
        FAIL_COUNT=$(grep -c "FAIL\|npm ERR!" "$TRANSCRIPT_PATH" 2>/dev/null | tr -d '[:space:]' || echo "0")
        # Only stop if multiple failures (single failure might be fixed in next iteration)
        if [ "$FAIL_COUNT" -gt 3 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "repeated_test_failures"' \
                > "$SESSION_FILE"
            approve "Multiple test failures detected ($FAIL_COUNT), requesting human review"
        fi
    fi

    # Check for deployment/credential errors (auto-execute integration)
    if grep -qE "wrangler.*error|supabase.*error|terraform.*error|aws.*error|Error:.*credential|Error:.*secret|Error:.*token" "$TRANSCRIPT_PATH" 2>/dev/null; then
        CRED_ERRORS=$(grep -cE "credential|secret|token" "$TRANSCRIPT_PATH" 2>/dev/null | tr -d '[:space:]' || echo "0")
        if [ "$CRED_ERRORS" -gt 2 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "credential_errors"' \
                > "$SESSION_FILE"
            approve "Multiple credential/deployment errors, requesting credential check"
        fi
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
            # CRITICAL: Check if tests were actually executed before allowing completion
            # Look for test execution evidence in transcript
            TESTS_RUN=false
            if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
                # Check for various test execution patterns
                if grep -qE "(npm test|npx vitest|npx jest|npx playwright|pytest|cargo test|go test|dotnet test|Tests:.*passed|PASS.*spec|✓.*tests?)" "$TRANSCRIPT_PATH" 2>/dev/null; then
                    TESTS_RUN=true
                fi
            fi

            # Check for test files that should have been run
            HAS_UNIT_TESTS=false
            HAS_E2E_TESTS=false
            if [ -d "$PROJECT_ROOT/tests" ] || [ -d "$PROJECT_ROOT/src" ]; then
                # Check for unit test files
                if find "$PROJECT_ROOT" -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.js" -o -name "*.spec.js" -o -name "test_*.py" -o -name "*_test.go" 2>/dev/null | head -1 | grep -q .; then
                    HAS_UNIT_TESTS=true
                fi
                # Check for E2E test files (Playwright, Cypress)
                if [ -f "$PROJECT_ROOT/playwright.config.ts" ] || [ -f "$PROJECT_ROOT/playwright.config.js" ] || [ -d "$PROJECT_ROOT/e2e" ] || [ -d "$PROJECT_ROOT/cypress" ]; then
                    HAS_E2E_TESTS=true
                fi
            fi

            # If tests exist but weren't run, block and require test execution
            if [ "$HAS_UNIT_TESTS" = true ] && [ "$TESTS_RUN" = false ]; then
                block "Tasks complete but TESTS NOT RUN" "🧪 MANDATORY: All tasks marked complete but NO TEST EXECUTION detected. You MUST run tests before completion. Execute: npm test (unit/integration) and npx playwright test (E2E if applicable). Continue with /sw:do and run all tests."
            fi

            # If E2E tests exist, check for E2E execution
            E2E_RUN=false
            if [ "$HAS_E2E_TESTS" = true ] && [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
                if grep -qE "(playwright test|cypress run|npx playwright|Running.*E2E|e2e.*passed)" "$TRANSCRIPT_PATH" 2>/dev/null; then
                    E2E_RUN=true
                fi
            fi

            if [ "$HAS_E2E_TESTS" = true ] && [ "$E2E_RUN" = false ]; then
                block "Tasks complete but E2E TESTS NOT RUN" "🎭 MANDATORY: E2E tests exist but were NOT executed. You MUST run E2E tests for user-facing features. Execute: npx playwright test (or cypress run). Continue with /sw:do and complete E2E testing."
            fi

            # Check if there are more increments in queue
            QUEUE_LENGTH=$(echo "$SESSION" | jq '.incrementQueue | length')

            if [ "$QUEUE_LENGTH" -le 1 ]; then
                # Last increment completed and tests were run
                echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                    '.status = "completed" | .endTime = $now | .endReason = "all_tasks_complete"' \
                    > "$SESSION_FILE"
                approve "All tasks completed and tests passed"
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
