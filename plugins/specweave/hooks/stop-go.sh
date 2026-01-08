#!/bin/bash
# stop-go.sh - Stop Hook for Go Command (Pure Ralph Wiggum Pattern)
#
# Implements the Ralph loop:
# - Blocks Claude's exit attempt
# - Re-feeds the SAME prompt every iteration
# - Checks for completion promise in output
# - Validates quality gates if specified
# - Increments iteration counter
#
# Returns:
# - {"decision": "block", "reason": "PROMPT"} → continue loop
# - {"decision": "approve"} → exit loop (task complete)

set -e

# ============================================================================
# Input Parsing
# ============================================================================

INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

# ============================================================================
# Project Detection
# ============================================================================

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/go-session.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/go-iterations.log"

# ============================================================================
# Session State Check
# ============================================================================

# If no session file, approve exit (not a go session)
if [ ! -f "$SESSION_FILE" ]; then
    echo '{"decision": "approve"}'
    exit 0
fi

# Read session state
SESSION_ID=$(jq -r '.sessionId' "$SESSION_FILE" 2>/dev/null)
PROMPT=$(jq -r '.prompt' "$SESSION_FILE" 2>/dev/null)
MAX_ITERATIONS=$(jq -r '.maxIterations' "$SESSION_FILE" 2>/dev/null)
COMPLETION_PROMISE=$(jq -r '.completionPromise // ""' "$SESSION_FILE" 2>/dev/null)
ITERATION=$(jq -r '.iteration // 0' "$SESSION_FILE" 2>/dev/null)

# Validate required fields
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ] || \
   [ -z "$PROMPT" ] || [ "$PROMPT" = "null" ] || \
   [ -z "$MAX_ITERATIONS" ] || [ "$MAX_ITERATIONS" = "null" ]; then
    # Invalid session, approve exit
    echo '{"decision": "approve"}'
    exit 0
fi

# Quality gate flags
BUILD_REQUIRED=$(jq -r '.conditions.build // false' "$SESSION_FILE" 2>/dev/null)
TESTS_REQUIRED=$(jq -r '.conditions.tests // false' "$SESSION_FILE" 2>/dev/null)
E2E_REQUIRED=$(jq -r '.conditions.e2e // false' "$SESSION_FILE" 2>/dev/null)
LINT_REQUIRED=$(jq -r '.conditions.lint // false' "$SESSION_FILE" 2>/dev/null)
TYPES_REQUIRED=$(jq -r '.conditions.types // false' "$SESSION_FILE" 2>/dev/null)

# ============================================================================
# Extract Last Assistant Output
# ============================================================================

# Read last assistant message from transcript
LAST_OUTPUT=""
if [ -f "$TRANSCRIPT_PATH" ]; then
    # Get last assistant message (JSONL format - each line is a message)
    LAST_OUTPUT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | jq -r '.content[] | select(.type == "text") | .text' 2>/dev/null || echo "")
fi

# ============================================================================
# Check Completion Promise
# ============================================================================

PROMISE_FOUND=false

if [ -n "$COMPLETION_PROMISE" ] && [ "$COMPLETION_PROMISE" != "null" ]; then
    # Extract text between <promise> tags using perl regex
    EXTRACTED_PROMISE=$(echo "$LAST_OUTPUT" | perl -0777 -ne 'print "$1\n" if /<promise>(.*?)<\/promise>/s' 2>/dev/null || echo "")

    if [ "$EXTRACTED_PROMISE" = "$COMPLETION_PROMISE" ]; then
        PROMISE_FOUND=true

        # Log completion
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"completion_promise_found\",\"sessionId\":\"$SESSION_ID\",\"iteration\":$ITERATION,\"promise\":\"$COMPLETION_PROMISE\"}" >> "$LOG_FILE"
    fi
fi

# ============================================================================
# Check Quality Gates (if required)
# ============================================================================

QUALITY_GATES_PASS=true
GATE_FAILURES=""

# Source the validation script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$BUILD_REQUIRED" = "true" ] || [ "$TESTS_REQUIRED" = "true" ] || \
   [ "$E2E_REQUIRED" = "true" ] || [ "$LINT_REQUIRED" = "true" ] || \
   [ "$TYPES_REQUIRED" = "true" ]; then

    # Check if validation script exists
    if [ -f "$SCRIPT_DIR/validate-completion-conditions.sh" ]; then
        # Run validation
        VALIDATION_RESULT=$(bash "$SCRIPT_DIR/validate-completion-conditions.sh" "$SESSION_FILE" 2>&1)
        VALIDATION_EXIT=$?

        if [ $VALIDATION_EXIT -ne 0 ]; then
            QUALITY_GATES_PASS=false
            GATE_FAILURES="$VALIDATION_RESULT"
        fi
    else
        # Validation script not found, do basic check
        # (This is a fallback - validation script should exist)

        if [ "$TESTS_REQUIRED" = "true" ]; then
            if ! echo "$LAST_OUTPUT" | grep -q "tests pass\|all.*pass\|✓.*test"; then
                QUALITY_GATES_PASS=false
                GATE_FAILURES="${GATE_FAILURES}Tests required but no passing tests detected. "
            fi
        fi
    fi
fi

# ============================================================================
# Check Max Iterations
# ============================================================================

if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    # Max iterations reached
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"max_iterations_reached\",\"sessionId\":\"$SESSION_ID\",\"iteration\":$ITERATION}" >> "$LOG_FILE"

    # Update session status
    jq '.status = "max_iterations_reached"' "$SESSION_FILE" > "${SESSION_FILE}.tmp" && mv "${SESSION_FILE}.tmp" "$SESSION_FILE"

    # Approve exit with notification
    echo '{"decision": "approve", "systemMessage": "⚠️  Max iterations reached. Session stopped."}'
    exit 0
fi

# ============================================================================
# Determine Decision
# ============================================================================

# Approve exit if:
# 1. Completion promise found (if specified), OR
# 2. Quality gates all pass (if any gates specified)

SHOULD_EXIT=false

if [ "$PROMISE_FOUND" = "true" ]; then
    SHOULD_EXIT=true
    EXIT_REASON="Completion promise found"
fi

if [ "$QUALITY_GATES_PASS" = "true" ] && \
   ([ "$BUILD_REQUIRED" = "true" ] || [ "$TESTS_REQUIRED" = "true" ] || \
    [ "$E2E_REQUIRED" = "true" ] || [ "$LINT_REQUIRED" = "true" ] || \
    [ "$TYPES_REQUIRED" = "true" ]); then
    SHOULD_EXIT=true
    EXIT_REASON="All quality gates passed"
fi

if [ "$SHOULD_EXIT" = "true" ]; then
    # Task complete!

    # Log completion
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"session_complete\",\"sessionId\":\"$SESSION_ID\",\"iteration\":$ITERATION,\"reason\":\"$EXIT_REASON\"}" >> "$LOG_FILE"

    # Update session status
    jq '.status = "completed" | .completedAt = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "$SESSION_FILE" > "${SESSION_FILE}.tmp" && mv "${SESSION_FILE}.tmp" "$SESSION_FILE"

    # Play success sound (macOS only, fail gracefully)
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

    # Approve exit
    echo '{"decision": "approve", "systemMessage": "✅ Task complete! Session: '"$SESSION_ID"' | Iterations: '"$ITERATION"' | Reason: '"$EXIT_REASON"'"}'
    exit 0
fi

# ============================================================================
# Continue Loop - Increment & Re-feed
# ============================================================================

# Increment iteration counter
NEW_ITERATION=$((ITERATION + 1))

# Update session file
jq '.iteration = '"$NEW_ITERATION" "$SESSION_FILE" > "${SESSION_FILE}.tmp" && mv "${SESSION_FILE}.tmp" "$SESSION_FILE"

# Log iteration
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"iteration\",\"sessionId\":\"$SESSION_ID\",\"iteration\":$NEW_ITERATION}" >> "$LOG_FILE"

# Build system message
SYSTEM_MSG="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 GO MODE CONTINUING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Iteration: $NEW_ITERATION / $MAX_ITERATIONS
Session: $SESSION_ID

"

if [ -n "$COMPLETION_PROMISE" ] && [ "$COMPLETION_PROMISE" != "null" ]; then
    SYSTEM_MSG="${SYSTEM_MSG}📋 STOP CRITERIA: Output <promise>$COMPLETION_PROMISE</promise> when done
"
fi

if [ "$BUILD_REQUIRED" = "true" ] || [ "$TESTS_REQUIRED" = "true" ] || \
   [ "$E2E_REQUIRED" = "true" ] || [ "$LINT_REQUIRED" = "true" ] || \
   [ "$TYPES_REQUIRED" = "true" ]; then
    SYSTEM_MSG="${SYSTEM_MSG}📋 QUALITY GATES: "
    [ "$BUILD_REQUIRED" = "true" ] && SYSTEM_MSG="${SYSTEM_MSG}Build "
    [ "$TESTS_REQUIRED" = "true" ] && SYSTEM_MSG="${SYSTEM_MSG}Tests "
    [ "$E2E_REQUIRED" = "true" ] && SYSTEM_MSG="${SYSTEM_MSG}E2E "
    [ "$LINT_REQUIRED" = "true" ] && SYSTEM_MSG="${SYSTEM_MSG}Lint "
    [ "$TYPES_REQUIRED" = "true" ] && SYSTEM_MSG="${SYSTEM_MSG}Types "
    SYSTEM_MSG="${SYSTEM_MSG}
"
fi

if [ "$QUALITY_GATES_PASS" = "false" ]; then
    SYSTEM_MSG="${SYSTEM_MSG}
⚠️  Quality gate failures:
$GATE_FAILURES
"
fi

SYSTEM_MSG="${SYSTEM_MSG}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue working on the task. You can see your previous work in the files.
Run tests/builds to verify your changes.
"

# Block exit and re-feed prompt
jq -n \
    --arg decision "block" \
    --arg reason "$PROMPT" \
    --arg systemMessage "$SYSTEM_MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $systemMessage}'

exit 0
