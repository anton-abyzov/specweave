#!/bin/bash
# stop-auto.sh - Stop Hook for Auto Continuation Loop
#
# This hook implements the Ralph Wiggum pattern with WORLD-CLASS testing:
# - Returns {"decision": "block"} to prevent Claude from exiting
# - Re-feeds prompt with iteration context
# - Returns {"decision": "approve"} when work is complete
#
# CRITICAL ENHANCEMENTS (v2.0):
# - Parses actual test RESULTS, not just execution
# - Self-healing loop with max 3 retries per test failure
# - Extracts specific failure details for fix prompts
# - Blocks on ANY test failure (not just >3)
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

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Helper: Output approve decision
approve() {
    local reason="${1:-Session complete}"
    echo "{\"decision\": \"approve\", \"reason\": \"$reason\"}"
    exit 0
}

# Helper: Output block decision with system message
# Properly escapes JSON strings with newlines
block() {
    local reason="$1"
    local system_message="$2"
    if [ -n "$system_message" ]; then
        # Escape special characters for JSON
        local escaped_message=$(echo "$system_message" | jq -Rs .)
        echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": $escaped_message}"
    else
        echo "{\"decision\": \"block\", \"reason\": \"$reason\"}"
    fi
    exit 0
}

# ============================================================================
# TEST RESULT PARSING (NEW - v2.0)
# Parses ACTUAL test results, not just command execution
# ============================================================================

# Parse test results from transcript
# Returns: JSON with {passed, failed, total, framework}
parse_test_results() {
    local transcript="$1"
    local passed=0
    local failed=0
    local total=0
    local framework="unknown"

    if [ ! -f "$transcript" ]; then
        echo '{"passed":0,"failed":0,"total":0,"framework":"none","testsRun":false}'
        return
    fi

    # Vitest format: "Tests  5 passed | 2 failed (7)"
    # Also: "✓ src/test.ts (5 tests)" or "Tests: 5 passed, 2 failed"
    local vitest_result=$(grep -oE 'Tests?\s+[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$vitest_result" ]; then
        framework="vitest"
        passed=$(echo "$vitest_result" | grep -oE '[0-9]+' | head -1)
        local vitest_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
        failed=${vitest_failed:-0}
    fi

    # Jest format: "Tests: 5 passed, 2 failed, 7 total"
    local jest_result=$(grep -oE 'Tests:\s*[0-9]+\s*passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$jest_result" ] && [ "$framework" = "unknown" ]; then
        framework="jest"
        passed=$(echo "$jest_result" | grep -oE '[0-9]+' | head -1)
        local jest_failed=$(grep -oE 'Tests:.*[0-9]+\s*failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+\s*failed' | grep -oE '[0-9]+' || echo "0")
        failed=${jest_failed:-0}
    fi

    # Playwright format: "5 passed (10s)" and "2 failed"
    # Also: "Running 7 tests" or "7 tests in 3 workers"
    local playwright_passed=$(grep -oE '[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')
    local playwright_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')
    if [ -n "$playwright_passed" ] && [ "$framework" = "unknown" ]; then
        framework="playwright"
        passed=${playwright_passed:-0}
        failed=${playwright_failed:-0}
    fi

    # Pytest format: "5 passed, 2 failed in 3.2s" or "PASSED" / "FAILED"
    local pytest_result=$(grep -oE '[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$pytest_result" ] && [ "$framework" = "unknown" ]; then
        framework="pytest"
        passed=$(echo "$pytest_result" | grep -oE '[0-9]+')
        local pytest_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
        failed=${pytest_failed:-0}
    fi

    # Go test format: "ok" or "FAIL" with package name
    # "--- PASS:" or "--- FAIL:"
    if grep -qE '(--- PASS:|--- FAIL:|^ok\s|^FAIL\s)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="go"
        passed=$(grep -cE '--- PASS:' "$transcript" 2>/dev/null || echo "0")
        failed=$(grep -cE '--- FAIL:' "$transcript" 2>/dev/null || echo "0")
    fi

    # Calculate total
    total=$((passed + failed))

    # Determine if tests were actually run
    local tests_run="false"
    if [ "$total" -gt 0 ] || grep -qE '(npm test|npx vitest|npx jest|npx playwright|pytest|go test|cargo test)' "$transcript" 2>/dev/null; then
        tests_run="true"
    fi

    # Ensure valid integers
    passed=${passed:-0}
    failed=${failed:-0}
    total=${total:-0}

    echo "{\"passed\":$passed,\"failed\":$failed,\"total\":$total,\"framework\":\"$framework\",\"testsRun\":$tests_run}"
}

# Extract detailed failure information from transcript
# Returns: JSON with failure details
extract_failure_details() {
    local transcript="$1"
    local max_failures=3

    if [ ! -f "$transcript" ]; then
        echo '{"failures":[]}'
        return
    fi

    local failures="[]"

    # Playwright/Vitest failure pattern:
    # "FAIL src/test.spec.ts > describe > test name"
    # Or: "1) [chromium] › test.spec.ts:45:3 › Test Name"
    # Extract file:line and error message

    # Look for common failure patterns
    # Pattern 1: "Error: expect(received).toEqual(expected)"
    # Pattern 2: "AssertionError: expected X to equal Y"
    # Pattern 3: "FAIL path/to/test.ts"

    # Extract first few failures with context
    local failure_blocks=$(grep -B 2 -A 10 -E '(FAIL|Error:|AssertionError|expect\(.*\)\.(to|toBe|toEqual|toHaveText))' "$transcript" 2>/dev/null | head -60)

    if [ -n "$failure_blocks" ]; then
        # Extract file:line from stack traces or test output
        local file_line=$(echo "$failure_blocks" | grep -oE '[a-zA-Z0-9_/-]+\.(ts|js|tsx|jsx|spec|test)\.[tj]sx?:[0-9]+' | head -1)

        # Extract test name
        local test_name=$(echo "$failure_blocks" | grep -oE '(›|>)\s*[^›>\n]+$' | head -1 | sed 's/^[›>]\s*//')

        # Extract error message
        local error_msg=$(echo "$failure_blocks" | grep -oE '(Error:|AssertionError:)[^\n]+' | head -1)

        # Extract expected/received if available
        local expected=$(echo "$failure_blocks" | grep -oE 'Expected:?[^\n]+' | head -1)
        local received=$(echo "$failure_blocks" | grep -oE 'Received:?[^\n]+' | head -1)

        failures=$(cat <<EOF
[{
  "file": "${file_line:-unknown}",
  "testName": "${test_name:-unknown test}",
  "error": "${error_msg:-Test failed}",
  "expected": "${expected:-}",
  "received": "${received:-}",
  "context": $(echo "$failure_blocks" | head -20 | jq -Rs .)
}]
EOF
)
    fi

    echo "{\"failures\":$failures}"
}

# ============================================================================
# SELF-HEALING LOOP (NEW - v2.0)
# Retries failed tests up to 3 times with specific fix prompts
# ============================================================================

# Handle test failure with self-healing retry
# Args: $1 = failure details JSON
handle_test_failure() {
    local failure_json="$1"
    local retry_count=$(echo "$SESSION" | jq -r '.testRetryCount // 0')
    local current_task=$(echo "$SESSION" | jq -r '.currentTaskId // "unknown"')

    # Extract failure details
    local first_failure=$(echo "$failure_json" | jq -r '.failures[0] // {}')
    local fail_file=$(echo "$first_failure" | jq -r '.file // "unknown"')
    local fail_test=$(echo "$first_failure" | jq -r '.testName // "unknown test"')
    local fail_error=$(echo "$first_failure" | jq -r '.error // "Test failed"')
    local fail_expected=$(echo "$first_failure" | jq -r '.expected // ""')
    local fail_received=$(echo "$first_failure" | jq -r '.received // ""')
    local fail_context=$(echo "$first_failure" | jq -r '.context // ""')

    if [ "$retry_count" -lt 3 ]; then
        # Increment retry counter
        local new_retry=$((retry_count + 1))
        echo "$SESSION" | jq --argjson retry "$new_retry" --arg task "$current_task" \
            '.testRetryCount = $retry | .lastFailedTask = $task' \
            > "$SESSION_FILE"

        # Log the retry attempt
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"test_retry\",\"attempt\":$new_retry,\"task\":\"$current_task\",\"file\":\"$fail_file\",\"error\":\"$fail_error\"}" >> "$LOGS_DIR/auto-iterations.log"

        # Build fix prompt with specific failure details
        local fix_prompt="🔴 TESTS FAILED - FIX AND RETRY (attempt $new_retry/3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILURE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File: $fail_file
🧪 Test: $fail_test
❌ Error: $fail_error"

        if [ -n "$fail_expected" ] && [ "$fail_expected" != "" ]; then
            fix_prompt="$fix_prompt
✓ Expected: $fail_expected"
        fi

        if [ -n "$fail_received" ] && [ "$fail_received" != "" ]; then
            fix_prompt="$fix_prompt
✗ Received: $fail_received"
        fi

        fix_prompt="$fix_prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ANALYZE the error above carefully
2. READ the failing test file to understand what's expected
3. FIX the implementation code (NOT the test, unless test is wrong)
4. RE-RUN the tests: npm test or npx playwright test
5. VERIFY all tests pass before continuing

⚠️ DO NOT skip this failure. DO NOT mark task complete until tests pass.
⚠️ After $new_retry more failure(s), session will pause for human review."

        block "Test failure - self-healing retry $new_retry/3" "$fix_prompt"
    else
        # 3 retries exhausted - escalate to human gate
        echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.status = "paused" | .pauseTime = $now | .pauseReason = "test_failures_exhausted" | .testRetryCount = 0' \
            > "$SESSION_FILE"

        # Log exhaustion
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"retry_exhausted\",\"task\":\"$current_task\",\"file\":\"$fail_file\"}" >> "$LOGS_DIR/auto-iterations.log"

        approve "Tests failed 3x in a row - human review required. File: $fail_file, Error: $fail_error"
    fi
}

# Reset retry counter (call when tests pass or task changes)
reset_retry_counter() {
    echo "$SESSION" | jq '.testRetryCount = 0 | .lastFailedTask = null' > "$SESSION_FILE"
    # Reload session
    SESSION=$(cat "$SESSION_FILE")
}

# ============================================================================
# MAIN HOOK LOGIC
# ============================================================================

# CRITICAL: Check if stop_hook_active flag is set
# This prevents infinite continuation loops
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    approve "Stop hook already active, allowing exit to prevent loop"
fi

# Check if session file exists
if [ ! -f "$SESSION_FILE" ]; then
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
TEST_RETRY_COUNT=$(echo "$SESSION" | jq -r '.testRetryCount // 0')

# Check if session is not running
if [ "$STATUS" != "running" ]; then
    approve "Session status is $STATUS, not running"
fi

# Check max iterations
NEXT_ITERATION=$((ITERATION + 1))
if [ "$NEXT_ITERATION" -ge "$MAX_ITERATIONS" ]; then
    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.status = "completed" | .endTime = $now | .endReason = "max_iterations_reached"' \
        > "$SESSION_FILE"
    approve "Max iterations ($MAX_ITERATIONS) reached"
fi

# Check max hours if configured
if [ "$MAX_HOURS" != "null" ] && [ -n "$START_TIME" ]; then
    parse_iso_date() {
        local dt="$1"
        date -j -f "%Y-%m-%dT%H:%M:%SZ" "$dt" "+%s" 2>/dev/null && return
        date -d "$dt" "+%s" 2>/dev/null && return
        python3 -c "import datetime; print(int(datetime.datetime.fromisoformat('$dt'.replace('Z','+00:00')).timestamp()))" 2>/dev/null && return
        node -e "console.log(Math.floor(new Date('$dt').getTime()/1000))" 2>/dev/null && return
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

# ============================================================================
# TRANSCRIPT ANALYSIS (Enhanced v2.0)
# ============================================================================

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Check for completion promise
    if grep -q "<auto-complete>DONE</auto-complete>" "$TRANSCRIPT_PATH" 2>/dev/null; then
        echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.status = "completed" | .endTime = $now | .endReason = "completion_promise"' \
            > "$SESSION_FILE"
        approve "Completion promise detected"
    fi

    # Check self-assessment score
    SELF_SCORE=$(grep -oE 'Overall:\s*[0-9]+\.[0-9]+' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | grep -oE '[0-9]+\.[0-9]+' || true)
    if [ -n "$SELF_SCORE" ]; then
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"self_assessment\",\"score\":$SELF_SCORE,\"increment\":\"$CURRENT_INCREMENT\"}" >> "$LOGS_DIR/auto-iterations.log"

        if [ "$(echo "$SELF_SCORE < 0.50" | bc 2>/dev/null || echo "0")" -eq 1 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg score "$SELF_SCORE" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "low_confidence_score" | .lastScore = ($score | tonumber)' \
                > "$SESSION_FILE"
            approve "Low confidence score ($SELF_SCORE < 0.50), requesting human review"
        fi
    fi

    # ========================================================================
    # CRITICAL: Parse actual test RESULTS (not just execution)
    # ========================================================================
    TEST_RESULTS=$(parse_test_results "$TRANSCRIPT_PATH")
    TESTS_PASSED=$(echo "$TEST_RESULTS" | jq -r '.passed')
    TESTS_FAILED=$(echo "$TEST_RESULTS" | jq -r '.failed')
    TESTS_TOTAL=$(echo "$TEST_RESULTS" | jq -r '.total')
    TEST_FRAMEWORK=$(echo "$TEST_RESULTS" | jq -r '.framework')
    TESTS_RUN=$(echo "$TEST_RESULTS" | jq -r '.testsRun')

    # If tests were run and ANY failed, trigger self-healing loop
    if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -gt 0 ]; then
        # Log test failure
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"test_failure\",\"passed\":$TESTS_PASSED,\"failed\":$TESTS_FAILED,\"framework\":\"$TEST_FRAMEWORK\"}" >> "$LOGS_DIR/auto-iterations.log"

        # Extract failure details
        FAILURE_DETAILS=$(extract_failure_details "$TRANSCRIPT_PATH")

        # Trigger self-healing loop
        handle_test_failure "$FAILURE_DETAILS"
    fi

    # If tests passed, reset retry counter
    if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -eq 0 ] && [ "$TESTS_PASSED" -gt 0 ]; then
        if [ "$TEST_RETRY_COUNT" -gt 0 ]; then
            reset_retry_counter
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"tests_passed_after_retry\",\"passed\":$TESTS_PASSED}" >> "$LOGS_DIR/auto-iterations.log"
        fi
    fi

    # Check for deployment/credential errors
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

# ============================================================================
# TASK COMPLETION CHECK
# ============================================================================

if [ -n "$CURRENT_INCREMENT" ]; then
    TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT/tasks.md"

    if [ -f "$TASKS_FILE" ]; then
        TOTAL_TASKS=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        COMPLETED_TASKS=$(grep -c '\[x\].*completed' "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        TOTAL_TASKS=${TOTAL_TASKS:-0}
        COMPLETED_TASKS=${COMPLETED_TASKS:-0}

        if [ "$TOTAL_TASKS" -gt 0 ] && [ "$COMPLETED_TASKS" -ge "$TOTAL_TASKS" ]; then
            # All tasks marked complete - but verify tests actually passed

            # Check for test files in project
            HAS_UNIT_TESTS=false
            HAS_E2E_TESTS=false
            if [ -d "$PROJECT_ROOT/tests" ] || [ -d "$PROJECT_ROOT/src" ]; then
                if find "$PROJECT_ROOT" -maxdepth 6 \
                    -not -path "*/node_modules/*" \
                    -not -path "*/.git/*" \
                    -not -path "*/dist/*" \
                    -not -path "*/build/*" \
                    -not -path "*/coverage/*" \
                    -not -path "*/.next/*" \
                    -not -path "*/vendor/*" \
                    \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.js" -o -name "*.spec.js" -o -name "test_*.py" -o -name "*_test.go" \) \
                    2>/dev/null | head -1 | grep -q .; then
                    HAS_UNIT_TESTS=true
                fi
                if [ -f "$PROJECT_ROOT/playwright.config.ts" ] || [ -f "$PROJECT_ROOT/playwright.config.js" ] || [ -d "$PROJECT_ROOT/e2e" ] || [ -d "$PROJECT_ROOT/cypress" ]; then
                    HAS_E2E_TESTS=true
                fi
            fi

            # Verify tests were run AND passed
            if [ "$HAS_UNIT_TESTS" = true ]; then
                if [ "$TESTS_RUN" != "true" ]; then
                    block "Tasks complete but TESTS NOT RUN" "🧪 MANDATORY: All tasks marked complete but NO TEST EXECUTION detected.

You MUST run tests before completion:
  npm test          (unit/integration)
  npx vitest run    (if using vitest)
  npx playwright test (E2E if applicable)

Continue with /sw:do and run ALL tests. Verify 0 failures before proceeding."
                fi

                if [ "$TESTS_FAILED" -gt 0 ]; then
                    # This shouldn't happen as we handle failures above, but safety check
                    block "Tasks complete but TESTS FAILING" "🔴 CRITICAL: All tasks marked complete but $TESTS_FAILED tests are FAILING!

You claimed completion but tests are not passing. This is not acceptable.

FIX the failing tests before marking tasks complete.
Re-run: npm test or npx vitest run"
                fi
            fi

            # Check E2E separately
            if [ "$HAS_E2E_TESTS" = true ]; then
                E2E_RUN=false
                if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
                    if grep -qE "(playwright test|cypress run|npx playwright|Running.*E2E|e2e.*passed)" "$TRANSCRIPT_PATH" 2>/dev/null; then
                        E2E_RUN=true
                    fi
                fi

                if [ "$E2E_RUN" = false ]; then
                    block "Tasks complete but E2E TESTS NOT RUN" "🎭 MANDATORY: E2E tests exist but were NOT executed.

You MUST run E2E tests for user-facing features:
  npx playwright test
  # or: cypress run

Test EVERY route, EVERY button click, on mobile AND desktop viewports.
Continue with /sw:do and complete E2E testing."
                fi
            fi

            # Check queue for more increments
            QUEUE_LENGTH=$(echo "$SESSION" | jq '.incrementQueue | length')

            if [ "$QUEUE_LENGTH" -le 1 ]; then
                # Final completion - all tests passed, all tasks done
                echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                    --argjson passed "${TESTS_PASSED:-0}" --argjson failed "${TESTS_FAILED:-0}" \
                    '.status = "completed" | .endTime = $now | .endReason = "all_tasks_complete" | .finalTestResults = {"passed": $passed, "failed": $failed}' \
                    > "$SESSION_FILE"
                approve "All tasks completed, all tests passed ($TESTS_PASSED passed, 0 failed)"
            else
                # More increments in queue - transition to next
                NEXT_INCREMENT=$(echo "$SESSION" | jq -r '.incrementQueue[1] // null')
                if [ "$NEXT_INCREMENT" != "null" ]; then
                    # Update session for next increment
                    echo "$SESSION" | jq --arg next "$NEXT_INCREMENT" --arg completed "$CURRENT_INCREMENT" \
                        '.currentIncrement = $next | .completedIncrements += [$completed] | .incrementQueue = .incrementQueue[1:] | .testRetryCount = 0' \
                        > "$SESSION_FILE"

                    block "Increment complete, starting next" "✅ Increment $CURRENT_INCREMENT COMPLETE!
Tests: $TESTS_PASSED passed, 0 failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT INCREMENT: $NEXT_INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue with /sw:do to start the next increment."
                fi
            fi
        fi
    fi
fi

# ============================================================================
# LIVING DOCS UPDATE CHECK
# ============================================================================

LIVING_DOCS_CHECKPOINT="$STATE_DIR/living-docs-checkpoint.json"

if [ -f "$LIVING_DOCS_CHECKPOINT" ]; then
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$LIVING_DOCS_CHECKPOINT")
    COMPLETED_PHASES=$(jq -r '.completedPhases | length' "$LIVING_DOCS_CHECKPOINT")
    TOTAL_PHASES=$(jq -r '.totalPhases // 8' "$LIVING_DOCS_CHECKPOINT")
    PHASE_NAMES=("A:Discovery" "B:Deep Analysis" "C:Org Synthesis" "D:Architecture" "E:Inconsistencies" "F:Strategy" "G:Enterprise" "H:Diagrams")

    if [ "$COMPLETED_PHASES" -lt "$TOTAL_PHASES" ]; then
        # Map phase letter to name
        case "$CURRENT_PHASE" in
            A) PHASE_NAME="Discovery" ;;
            B) PHASE_NAME="Deep Analysis" ;;
            C) PHASE_NAME="Org Synthesis" ;;
            D) PHASE_NAME="Architecture" ;;
            E) PHASE_NAME="Inconsistencies" ;;
            F) PHASE_NAME="Strategy" ;;
            G) PHASE_NAME="Enterprise" ;;
            H) PHASE_NAME="Diagrams" ;;
            *) PHASE_NAME="Unknown" ;;
        esac

        PROGRESS_PCT=$((COMPLETED_PHASES * 100 / TOTAL_PHASES))

        # Build phase status list
        PHASE_STATUS=""
        for i in {0..7}; do
            PHASE_LETTER=$(echo "${PHASE_NAMES[$i]}" | cut -d: -f1)
            PHASE_LABEL=$(echo "${PHASE_NAMES[$i]}" | cut -d: -f2)
            if [ $i -lt "$COMPLETED_PHASES" ]; then
                PHASE_STATUS="${PHASE_STATUS}  ✅ Phase $PHASE_LETTER: $PHASE_LABEL\n"
            elif [ "$PHASE_LETTER" = "$CURRENT_PHASE" ]; then
                PHASE_STATUS="${PHASE_STATUS}  🔄 Phase $PHASE_LETTER: $PHASE_LABEL (in progress)\n"
            else
                PHASE_STATUS="${PHASE_STATUS}  ⏳ Phase $PHASE_LETTER: $PHASE_LABEL\n"
            fi
        done

        # Log living docs progress
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"living_docs_progress\",\"phase\":\"$CURRENT_PHASE\",\"completed\":$COMPLETED_PHASES,\"total\":$TOTAL_PHASES}" >> "$LOGS_DIR/auto-iterations.log"

        block "Living docs update in progress" "📚 LIVING DOCS UPDATE ($PROGRESS_PCT% complete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Phase: $PHASE_NAME
Progress: $COMPLETED_PHASES/$TOTAL_PHASES phases complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase Status:
$(echo -e "$PHASE_STATUS")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue with /sw:do to proceed with living docs update.
This will run for multiple iterations until all phases complete.

💡 Living docs runs in chunked mode (2 hours/iteration) and saves
   checkpoints after each phase. Safe to interrupt anytime!"
    fi

    # All phases complete - clean up and allow exit
    if [ "$COMPLETED_PHASES" -eq "$TOTAL_PHASES" ]; then
        rm -f "$LIVING_DOCS_CHECKPOINT"
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"living_docs_complete\",\"phases\":$TOTAL_PHASES}" >> "$LOGS_DIR/auto-iterations.log"
        # Don't approve exit here - let normal task completion flow handle it
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

# Build context message
if [ "$SIMPLE_MODE" = "true" ]; then
    CONTEXT="Continue working. Iteration $NEXT_ITERATION/$MAX_ITERATIONS."
else
    PROGRESS=""
    if [ -n "$CURRENT_INCREMENT" ] && [ -f "$TASKS_FILE" ]; then
        PROGRESS="Tasks: $COMPLETED_TASKS/$TOTAL_TASKS completed."
    fi

    TEST_STATUS=""
    if [ "$TESTS_RUN" = "true" ]; then
        if [ "$TESTS_FAILED" -eq 0 ]; then
            TEST_STATUS="Tests: ✅ $TESTS_PASSED passed."
        else
            TEST_STATUS="Tests: ⚠️ $TESTS_PASSED passed, $TESTS_FAILED FAILED."
        fi
    fi

    CONTEXT="AUTO ACTIVE: Iteration $NEXT_ITERATION/$MAX_ITERATIONS. $PROGRESS $TEST_STATUS Continue with /sw:do to complete remaining tasks."
fi

# Log iteration
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"iteration\",\"iteration\":$NEXT_ITERATION,\"increment\":\"$CURRENT_INCREMENT\",\"testsRun\":$TESTS_RUN,\"testsPassed\":${TESTS_PASSED:-0},\"testsFailed\":${TESTS_FAILED:-0}}" >> "$LOGS_DIR/auto-iterations.log"

# Block exit and re-feed prompt
block "Work incomplete, continuing..." "$CONTEXT"
