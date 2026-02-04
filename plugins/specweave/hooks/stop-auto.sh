#!/bin/bash
# stop-auto.sh - Auto Mode Stop Hook (v4.0 - Quality Gates & Auto-Close)
#
# PHILOSOPHY: Smart completion detection with quality gates:
#   1. Is this a SpecWeave project with auto enabled?
#   2. Are there active increments?
#   3. For each active increment:
#      a. Are all tasks marked complete in tasks.md?
#      b. If TDD mode: Do tests pass?
#      c. Are quality gates satisfied (ACs, coverage)?
#      d. If YES to all → AUTO-CLOSE (triggers external sync!)
#      e. If NO → Block with specific reason
#
# v4.0 CRITICAL FIX:
# - Actually validates completion, not just metadata status
# - Runs tests when TDD/requireTests mode is on
# - Auto-closes increments that pass validation → triggers GitHub sync!
# - Stop hook now has TEETH, not just a message
#
# Configuration is read from .specweave/config.json:
#   - auto.enabled: Master switch (default: true)
#   - auto.requireTests: Run tests before auto-close (default: false)
#   - testing.defaultTestMode: "tdd" enables strict test enforcement
#   - auto.skipQualityGates: Skip validation (DANGEROUS, default: false)
#
# This implements SpecWeave's autonomous execution pattern with real validation.

set +e  # Don't exit on errors

# Capture start time for duration tracking (macOS doesn't support %N, fallback to seconds only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    _START_TIME_MS=$(($(date +%s) * 1000))
else
    _START_TIME_MS=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0")))
fi

# Read stdin (Claude Code passes context here)
INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# ============================================================================
# SOURCE STRUCTURED DECISION LOGGING
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/log-decision.sh" ]; then
    source "$SCRIPT_DIR/log-decision.sh"
fi

# Helper to calculate duration in ms (macOS-compatible)
_get_duration_ms() {
    local end_time_ms
    if [[ "$OSTYPE" == "darwin"* ]]; then
        end_time_ms=$(($(date +%s) * 1000))
    else
        end_time_ms=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0")))
    fi
    echo $((end_time_ms - _START_TIME_MS))
}

# ============================================================================
# LOGGING
# ============================================================================
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
mkdir -p "$LOGS_DIR" 2>/dev/null
LOG_FILE="$LOGS_DIR/stop-auto.log"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE" 2>/dev/null
}

# ============================================================================
# SILENT APPROVE - Normal sessions get NO output
# ============================================================================
silent_approve() {
    local reason="$1"
    local reason_code="${2:-session_inactive}"
    local context_json="${3:-"{}"}"

    log "APPROVE: $reason"

    # Log structured decision if log_decision function is available
    if type log_decision &>/dev/null; then
        log_decision "stop-auto" "approve" "$reason_code" "$reason" "$context_json" "$(_get_duration_ms)"
    fi

    echo '{"decision":"approve"}'
    exit 0
}

# ============================================================================
# LOUD APPROVE - Session completions need user notification
# Used when work completes, increments close, or session ends successfully
# ============================================================================
loud_approve() {
    local reason="$1"
    local reason_code="${2:-session_complete}"
    local context_json="${3:-"{}"}"
    local message="$4"

    log "APPROVE (loud): $reason"

    # Log structured decision if log_decision function is available
    if type log_decision &>/dev/null; then
        log_decision "stop-auto" "approve" "$reason_code" "$reason" "$context_json" "$(_get_duration_ms)"
    fi

    jq -n \
        --arg decision "approve" \
        --arg reason "$reason" \
        --arg msg "$message" \
        '{decision: $decision, reason: $reason, systemMessage: $msg}'
    exit 0
}

# ============================================================================
# QUICK EXITS - Not a SpecWeave project
# ============================================================================

SPECWEAVE_DIR="$PROJECT_ROOT/.specweave"
INCREMENTS_DIR="$SPECWEAVE_DIR/increments"
CONFIG_FILE="$SPECWEAVE_DIR/config.json"

# Not a SpecWeave project - silent approve
[ ! -d "$SPECWEAVE_DIR" ] && silent_approve "Not a SpecWeave project" "not_specweave_project" "{}"
[ ! -d "$INCREMENTS_DIR" ] && silent_approve "No increments directory" "no_increments_dir" "{}"

# ============================================================================
# STATE DIRECTORY (MUST be defined BEFORE AUTO_SESSION_FILE check)
# ============================================================================

STATE_DIR="$SPECWEAVE_DIR/state"

# ============================================================================
# READ PROJECT CONFIG
# ============================================================================

AUTO_ENABLED="true"
REQUIRE_TESTS="false"
REQUIRE_VALIDATION="true"
REQUIRE_JUDGE_LLM="false"
REQUIRE_LLM_EVAL="false"    # NEW: LLM-based completion evaluation
MAX_TURNS="20"           # HARD STOP: Total turns in session (NEVER resets during session)
MAX_RETRIES="20"         # Stuck detection: Retries on same work (resets when work changes)
TDD_MODE="false"
SKIP_QUALITY_GATES="false"
TEST_COMMAND=""

if [ -f "$CONFIG_FILE" ]; then
    AUTO_ENABLED=$(jq -r '.auto.enabled // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_TESTS=$(jq -r '.auto.requireTests // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    REQUIRE_VALIDATION=$(jq -r '.auto.requireValidation // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_JUDGE_LLM=$(jq -r '.auto.requireJudgeLLM // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    REQUIRE_LLM_EVAL=$(jq -r '.auto.requireLLMEval // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    # maxTurns = HARD STOP (total turns in session, NEVER resets) - default 20
    MAX_TURNS=$(jq -r '.auto.maxTurns // 20' "$CONFIG_FILE" 2>/dev/null || echo "20")
    # maxRetries = stuck detection (resets when increments change) - default 20
    MAX_RETRIES=$(jq -r '.auto.maxRetries // 20' "$CONFIG_FILE" 2>/dev/null || echo "20")
    TEST_COMMAND=$(jq -r '.auto.testCommand // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    SKIP_QUALITY_GATES=$(jq -r '.auto.skipQualityGates // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    TDD_MODE_CONFIG=$(jq -r '.testing.defaultTestMode // "standard"' "$CONFIG_FILE" 2>/dev/null || echo "standard")
    [ "$TDD_MODE_CONFIG" = "tdd" ] || [ "$TDD_MODE_CONFIG" = "TDD" ] && TDD_MODE="true"
fi

# Auto mode disabled in config - silent approve
[ "$AUTO_ENABLED" != "true" ] && silent_approve "Auto mode disabled in config" "auto_disabled" "{}"

# ============================================================================
# CHECK FOR AUTO MODE SESSION - Only block if explicitly activated
# Auto mode is SESSION-SCOPED: if Claude Code session ends, auto mode ends.
# ============================================================================

AUTO_SESSION_FILE="$STATE_DIR/auto-mode.json"

# If no auto-mode.json exists, auto mode was never started this session
if [ ! -f "$AUTO_SESSION_FILE" ]; then
    silent_approve "Auto mode not activated (no session file)" "session_inactive" '{"sessionActive":false}'
fi

# STALENESS CHECK: If session file is older than 30 minutes, it's stale
# (A real auto mode session would have activity within 30 minutes)
FILE_MTIME=$(stat -f%m "$AUTO_SESSION_FILE" 2>/dev/null || stat -c%Y "$AUTO_SESSION_FILE" 2>/dev/null || echo "0")
CURRENT_TIME=$(date +%s)
SESSION_AGE=$((CURRENT_TIME - FILE_MTIME))
MAX_SESSION_AGE=1800  # 30 minutes

if [ "$SESSION_AGE" -gt "$MAX_SESSION_AGE" ]; then
    log "STALE SESSION DETECTED: Session file is ${SESSION_AGE}s old (max: ${MAX_SESSION_AGE}s)"
    # Clean up stale session and ALL state files
    rm -f "$AUTO_SESSION_FILE" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-dedup" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-retry" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-turns" 2>/dev/null  # Also clear turn counter
    silent_approve "Stale auto-mode session cleared (inactive for ${SESSION_AGE}s)" "session_stale" "$(jq -n --argjson age "$SESSION_AGE" --argjson maxAge "$MAX_SESSION_AGE" '{sessionAge:$age,maxSessionAge:$maxAge}')"
fi

# Check if session is actually active
AUTO_SESSION_ACTIVE=$(jq -r '.active // false' "$AUTO_SESSION_FILE" 2>/dev/null || echo "false")
if [ "$AUTO_SESSION_ACTIVE" != "true" ]; then
    silent_approve "Auto mode session not active" "session_inactive" '{"sessionActive":false}'
fi

# Update session file mtime to keep it fresh (touch it)
touch "$AUTO_SESSION_FILE" 2>/dev/null

# ============================================================================
# CHECK FOR CUSTOM SUCCESS CRITERIA (auto-enables LLM eval)
# ============================================================================

HAS_CUSTOM_CRITERIA="false"
LLM_EVAL_MODEL="opus"  # Default model for LLM evaluation (ultrathink)
USER_GOAL=""
SUCCESS_SUMMARY=""

# Read success criteria from auto-mode.json
CRITERIA_COUNT=$(jq -r '.successCriteria | length // 0' "$AUTO_SESSION_FILE" 2>/dev/null || echo "0")
if [ "$CRITERIA_COUNT" -gt 2 ]; then
    # More than default criteria (tasks_complete + acs_satisfied) = custom criteria
    HAS_CUSTOM_CRITERIA="true"
    REQUIRE_LLM_EVAL="true"  # Auto-enable LLM eval when custom criteria exist
    log "Custom success criteria detected ($CRITERIA_COUNT), enabling LLM evaluation"
fi

# Check if any criterion has type=llm_evaluate
HAS_LLM_CRITERION=$(jq -r '.successCriteria[]? | select(.type == "llm_evaluate") | .type' "$AUTO_SESSION_FILE" 2>/dev/null | head -1)
if [ -n "$HAS_LLM_CRITERION" ]; then
    REQUIRE_LLM_EVAL="true"
    log "LLM evaluation criterion found, enabling LLM evaluation"
fi

# Read user goal and success summary for logging
USER_GOAL=$(jq -r '.userGoal // ""' "$AUTO_SESSION_FILE" 2>/dev/null || echo "")
SUCCESS_SUMMARY=$(jq -r '.successSummary // "All tasks and acceptance criteria complete"' "$AUTO_SESSION_FILE" 2>/dev/null)

log "Config: TDD=$TDD_MODE, RequireTests=$REQUIRE_TESTS, RequireValidation=$REQUIRE_VALIDATION, RequireJudgeLLM=$REQUIRE_JUDGE_LLM, RequireLLMEval=$REQUIRE_LLM_EVAL, MaxTurns=$MAX_TURNS, MaxRetries=$MAX_RETRIES"
log "Auto mode session active: $AUTO_SESSION_ACTIVE"
log "User goal: $USER_GOAL"
log "Success summary: $SUCCESS_SUMMARY"

# ============================================================================
# TURN COUNTER - HARD STOP after maxTurns (NEVER resets during session)
# This is the PRIMARY limit on session length. Unlike retry counter which
# resets when increments change, this counter NEVER resets during a session.
# ============================================================================

TURN_FILE="$STATE_DIR/.stop-auto-turns"
CURRENT_TURN=1

# Read and increment turn counter (atomic operation)
if [ -f "$TURN_FILE" ]; then
    STORED_TURN=$(cat "$TURN_FILE" 2>/dev/null || echo "0")
    # Validate it's a number
    if [[ "$STORED_TURN" =~ ^[0-9]+$ ]]; then
        CURRENT_TURN=$((STORED_TURN + 1))
    fi
fi

# Write new turn count (atomic via temp file)
echo "$CURRENT_TURN" > "$TURN_FILE.tmp" 2>/dev/null && mv "$TURN_FILE.tmp" "$TURN_FILE" 2>/dev/null

log "Turn counter: $CURRENT_TURN / $MAX_TURNS"

# HARD STOP: If turn count reaches limit, end session immediately
if [ "$CURRENT_TURN" -ge "$MAX_TURNS" ]; then
    log "HARD STOP: Turn limit reached ($CURRENT_TURN >= $MAX_TURNS)"

    # Clean up all state files
    rm -f "$TURN_FILE" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-dedup" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-retry" 2>/dev/null
    rm -f "$AUTO_SESSION_FILE" 2>/dev/null

    # Get active increments for the message
    ACTIVE_INCS=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
        -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
        | sed 's|.*/\([^/]*\)/metadata.json|\1|' | sort | tr '\n' ', ' | sed 's/,$//')

    TURN_LIMIT_MSG="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 SESSION TURN LIMIT REACHED ($CURRENT_TURN/$MAX_TURNS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The auto mode session has reached its maximum turn limit.
This is a safety mechanism to prevent runaway sessions.

📋 REMAINING WORK:
   • Active increment(s): ${ACTIVE_INCS:-none}

🔧 OPTIONS:
   1. Start a new auto session: /sw:auto
   2. Continue manually: /sw:do
   3. Check status: /sw:progress

💡 To increase turn limit, set in .specweave/config.json:
   { \"auto\": { \"maxTurns\": 100 } }

   Current limit: $MAX_TURNS turns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Log structured decision for turn limit
    if type log_decision &>/dev/null; then
        _turn_context=$(jq -n \
            --argjson turnCurrent "$CURRENT_TURN" \
            --argjson turnMax "$MAX_TURNS" \
            --arg activeIncs "${ACTIVE_INCS:-none}" \
            '{
                sessionActive: true,
                turn: {current: $turnCurrent, max: $turnMax},
                increments: {active: ($activeIncs | split(", "))}
            }')
        log_decision "stop-auto" "approve" "turn_limit" "Turn limit reached: $CURRENT_TURN/$MAX_TURNS turns" "$_turn_context" "$(_get_duration_ms)"
    fi

    jq -n \
        --arg decision "approve" \
        --arg reason "Turn limit reached: $CURRENT_TURN/$MAX_TURNS turns" \
        --arg msg "$TURN_LIMIT_MSG" \
        '{decision: $decision, reason: $reason, systemMessage: $msg}'
    exit 0
fi

# ============================================================================
# DEDUPLICATION - Prevent feedback loops (Claude Code UI bug workaround)
# ============================================================================

DEDUP_FILE="$STATE_DIR/.stop-auto-dedup"
DEDUP_WINDOW="${SPECWEAVE_STOP_HOOK_DEDUP:-5}"
NOW=$(date +%s)

if [ -f "$DEDUP_FILE" ]; then
    LAST_FIRE=$(cat "$DEDUP_FILE" 2>/dev/null || echo "0")
    ELAPSED=$((NOW - LAST_FIRE))
    [ "$ELAPSED" -gt 3600 ] && rm -f "$DEDUP_FILE" 2>/dev/null
    [ "$ELAPSED" -lt "$DEDUP_WINDOW" ] && silent_approve "Deduplicated (${ELAPSED}s < ${DEDUP_WINDOW}s)" "deduplicated" "$(jq -n --argjson elapsed "$ELAPSED" --argjson window "$DEDUP_WINDOW" '{elapsed:$elapsed,dedupWindow:$window}')"
fi

mkdir -p "$STATE_DIR" 2>/dev/null
echo "$NOW" > "$DEDUP_FILE" 2>/dev/null

# ============================================================================
# BLOCK RETRY COUNTER - Track how many times we block on same increments
# ============================================================================

RETRY_FILE="$STATE_DIR/.stop-auto-retry"
RETRY_COUNT=0
MAX_RETRIES_BEFORE_ESCALATE="$MAX_RETRIES"  # From config (default: 20)

# Read current retry state
if [ -f "$RETRY_FILE" ]; then
    RETRY_COUNT=$(jq -r '.count // 0' "$RETRY_FILE" 2>/dev/null || echo "0")
    RETRY_INCS=$(jq -r '.increments // ""' "$RETRY_FILE" 2>/dev/null || echo "")
fi

# Function to update retry count (called when blocking)
# Also tracks failure reasons for reflection
update_retry_counter() {
    local incs="$1"
    local reason="$2"
    local new_count=$((RETRY_COUNT + 1))

    # Reset if different increments
    if [ "$RETRY_INCS" != "$incs" ]; then
        new_count=1
    fi

    # Get previous reasons for reflection
    local prev_reasons=""
    if [ -f "$RETRY_FILE" ]; then
        prev_reasons=$(jq -r '.reasons // []' "$RETRY_FILE" 2>/dev/null || echo "[]")
    fi

    # Build updated retry state with history
    jq -n \
        --argjson count "$new_count" \
        --arg increments "$incs" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg currentReason "$reason" \
        --argjson prevReasons "$prev_reasons" \
        '{
          count: $count,
          increments: $increments,
          lastUpdate: $timestamp,
          currentReason: $currentReason,
          reasons: ([$currentReason] + ($prevReasons | .[0:4]))
        }' \
        > "$RETRY_FILE" 2>/dev/null

    echo "$new_count"
}

# Function to get previous failure reasons for reflection
get_failure_history() {
    if [ -f "$RETRY_FILE" ]; then
        jq -r '.reasons // [] | .[] | "  - " + .' "$RETRY_FILE" 2>/dev/null || echo ""
    fi
}

# Function to clear retry counter (called when work completes)
clear_retry_counter() {
    rm -f "$RETRY_FILE" 2>/dev/null
}

# Function to clear auto-mode session (called when all work completes)
clear_auto_session() {
    rm -f "$AUTO_SESSION_FILE" 2>/dev/null
    rm -f "$TURN_FILE" 2>/dev/null  # Also clear turn counter on session end
    log "Auto-mode session cleared (including turn counter)"
}

# ============================================================================
# CHECK FOR PARALLEL SESSION
# ============================================================================

PARALLEL_SESSION="$STATE_DIR/parallel/session.json"

if [ -f "$PARALLEL_SESSION" ]; then
    SESSION_STATUS=$(jq -r '.status // "unknown"' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

    if [ "$SESSION_STATUS" = "active" ]; then
        PENDING_AGENTS=$(jq '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled")] | length' "$PARALLEL_SESSION" 2>/dev/null || echo "0")

        if [ "$PENDING_AGENTS" -gt 0 ]; then
            AGENT_LIST=$(jq -r '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled") | "\(.domain):\(.status)"] | join(", ")' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

            MSG="🔄 $PENDING_AGENTS parallel agent(s) running: $AGENT_LIST → wait for completion"
            log "BLOCK: Parallel agents running: $AGENT_LIST"

            jq -n \
                --arg decision "block" \
                --arg reason "Parallel agents still running" \
                --arg msg "$MSG" \
                '{decision: $decision, reason: $reason, systemMessage: $msg}'
            exit 0
        fi
    fi
fi

# ============================================================================
# HELPER: Count pending tasks in tasks.md
# Returns: number of tasks with "**Status**: [ ] pending"
# ============================================================================
count_pending_tasks() {
    local inc_id="$1"
    local tasks_file="$INCREMENTS_DIR/$inc_id/tasks.md"

    if [ ! -f "$tasks_file" ]; then
        echo "0"
        return
    fi

    # Count tasks with **Status**: [ ] pending (case insensitive)
    grep -ciE '\*\*Status\*\*:\s*\[\s*\]\s*pending' "$tasks_file" 2>/dev/null || echo "0"
}

# ============================================================================
# HELPER: Check if increment has all ACs completed
# Returns: 0 if all complete, count of open ACs otherwise
# ============================================================================
count_open_acs() {
    local inc_id="$1"
    local spec_file="$INCREMENTS_DIR/$inc_id/spec.md"

    if [ ! -f "$spec_file" ]; then
        echo "0"
        return
    fi

    # Count unchecked ACs: - [ ] **AC-
    # Note: grep -c returns exit code 1 when count is 0, so use a temp var
    local count
    count=$(grep -c '^- \[ \] \*\*AC-' "$spec_file" 2>/dev/null) || count=0
    echo "$count"
}

# ============================================================================
# HELPER: Run tests and return result
# Returns: "pass" or "fail:reason"
# ============================================================================
run_tests() {
    local inc_id="$1"

    # Try to find and run tests
    # Priority: npm test, yarn test, bun test, pytest, go test

    if [ -f "$PROJECT_ROOT/package.json" ]; then
        # Check if test script exists
        local has_test=$(jq -r '.scripts.test // ""' "$PROJECT_ROOT/package.json" 2>/dev/null)
        if [ -n "$has_test" ] && [ "$has_test" != "null" ]; then
            log "Running: npm test"
            # Run tests with timeout, capture exit code
            cd "$PROJECT_ROOT" && timeout 300 npm test >/dev/null 2>&1
            local exit_code=$?
            if [ $exit_code -eq 0 ]; then
                echo "pass"
            else
                echo "fail:npm test failed (exit $exit_code)"
            fi
            return
        fi
    fi

    # Check for Python tests
    if [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -d "$PROJECT_ROOT/tests" ]; then
        if command -v pytest >/dev/null 2>&1; then
            log "Running: pytest"
            cd "$PROJECT_ROOT" && timeout 300 pytest -q >/dev/null 2>&1
            local exit_code=$?
            if [ $exit_code -eq 0 ]; then
                echo "pass"
            else
                echo "fail:pytest failed (exit $exit_code)"
            fi
            return
        fi
    fi

    # Check for Go tests
    if [ -f "$PROJECT_ROOT/go.mod" ]; then
        if command -v go >/dev/null 2>&1; then
            log "Running: go test"
            cd "$PROJECT_ROOT" && timeout 300 go test ./... >/dev/null 2>&1
            local exit_code=$?
            if [ $exit_code -eq 0 ]; then
                echo "pass"
            else
                echo "fail:go test failed (exit $exit_code)"
            fi
            return
        fi
    fi

    # No tests found - pass by default (user should configure tests)
    echo "pass:no-tests-configured"
}

# ============================================================================
# HELPER: Validate increment completion
# Returns: "valid" or "invalid:reason"
# ============================================================================
validate_increment() {
    local inc_id="$1"

    # Check pending tasks
    local pending=$(count_pending_tasks "$inc_id")
    if [ "$pending" -gt 0 ]; then
        echo "invalid:$pending tasks still pending"
        return
    fi

    # Check open ACs
    local open_acs=$(count_open_acs "$inc_id")
    if [ "$open_acs" -gt 0 ]; then
        echo "invalid:$open_acs acceptance criteria still open"
        return
    fi

    # If TDD mode or requireTests, run tests
    if [ "$TDD_MODE" = "true" ] || [ "$REQUIRE_TESTS" = "true" ]; then
        local test_result=$(run_tests "$inc_id")
        if [[ "$test_result" == fail:* ]]; then
            local reason="${test_result#fail:}"
            echo "invalid:Tests failed - $reason"
            return
        fi
        log "Tests passed for $inc_id"
    fi

    # If requireLLMEval, run LLM-based completion evaluation
    if [ "$REQUIRE_LLM_EVAL" = "true" ]; then
        log "Running LLM completion evaluation for $inc_id..."

        # Check if specweave CLI is available
        if command -v specweave >/dev/null 2>&1; then
            local eval_result
            eval_result=$(cd "$PROJECT_ROOT" && timeout 60 specweave evaluate-completion "$inc_id" --model opus --silent 2>/dev/null)
            local eval_exit=$?

            if [ "$eval_exit" -eq 0 ]; then
                log "LLM evaluation: COMPLETE for $inc_id"
            else
                # Parse the reason from JSON if possible
                local eval_reason=""
                if [ -n "$eval_result" ]; then
                    eval_reason=$(echo "$eval_result" | jq -r '.overallReason // "Unknown reason"' 2>/dev/null || echo "Unknown reason")
                else
                    eval_reason="LLM evaluation returned incomplete"
                fi
                log "LLM evaluation: NOT COMPLETE - $eval_reason"
                echo "invalid:LLM evaluation incomplete - $eval_reason"
                return
            fi
        else
            log "WARN: specweave CLI not available, skipping LLM evaluation"
        fi
    fi

    echo "valid"
}

# ============================================================================
# HELPER: Auto-close increment (update status to completed)
# This triggers StatusChangeSyncTrigger → external sync!
# ============================================================================
auto_close_increment() {
    local inc_id="$1"
    local metadata_file="$INCREMENTS_DIR/$inc_id/metadata.json"

    if [ ! -f "$metadata_file" ]; then
        log "ERROR: metadata.json not found for $inc_id"
        return 1
    fi

    log "AUTO-CLOSE: Updating $inc_id to completed"

    # Use specweave CLI if available (triggers proper hooks and sync)
    if command -v specweave >/dev/null 2>&1; then
        cd "$PROJECT_ROOT" && specweave complete "$inc_id" --yes --silent 2>/dev/null
        if [ $? -eq 0 ]; then
            log "AUTO-CLOSE: specweave complete succeeded for $inc_id"
            return 0
        fi
        log "WARN: specweave complete failed, falling back to direct update"
    fi

    # Fallback: Direct metadata update (triggers StatusChangeSyncTrigger via node)
    # This is less ideal but ensures we don't get stuck
    local now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local temp_file=$(mktemp)

    jq --arg now "$now" '.status = "completed" | .completedAt = $now | .updated = $now' \
        "$metadata_file" > "$temp_file" && mv "$temp_file" "$metadata_file"

    if [ $? -eq 0 ]; then
        log "AUTO-CLOSE: Direct metadata update succeeded for $inc_id"

        # Trigger sync via node helper if available
        local sync_helper="$PROJECT_ROOT/node_modules/specweave/dist/hooks/trigger-sync.js"
        if [ -f "$sync_helper" ]; then
            node "$sync_helper" "$inc_id" 2>/dev/null &
        fi
        return 0
    else
        log "ERROR: Failed to update metadata for $inc_id"
        return 1
    fi
}

# ============================================================================
# MAIN: Find active increments and validate each
# ============================================================================

# Find all active increments
ACTIVE_METADATA_FILES=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null)

# Arrays to track status
INCOMPLETE_INCS=""
READY_TO_CLOSE=""
VALIDATION_ERRORS=""

# Cache for first incomplete increment (avoids redundant calculation later)
FIRST_INC_PENDING_CACHED=""
FIRST_INC_ACS_CACHED=""
FIRST_INC_CACHED=""

for meta_file in $ACTIVE_METADATA_FILES; do
    # Extract increment ID from path
    inc_id=$(echo "$meta_file" | sed 's|.*/\([^/]*\)/metadata.json|\1|')

    log "Checking increment: $inc_id"

    if [ "$SKIP_QUALITY_GATES" = "true" ]; then
        # Skip validation, just check task status
        pending=$(count_pending_tasks "$inc_id")
        open_acs=$(count_open_acs "$inc_id")
        if [ "$pending" -eq 0 ]; then
            log "SKIP_QUALITY_GATES: $inc_id has no pending tasks, marking ready"
            READY_TO_CLOSE="$READY_TO_CLOSE $inc_id"
        else
            INCOMPLETE_INCS="$INCOMPLETE_INCS $inc_id"
            VALIDATION_ERRORS="$VALIDATION_ERRORS|$inc_id:$pending tasks pending"
            # Cache first incomplete increment's stats
            if [ -z "$FIRST_INC_CACHED" ]; then
                FIRST_INC_CACHED="$inc_id"
                FIRST_INC_PENDING_CACHED="$pending"
                FIRST_INC_ACS_CACHED="$open_acs"
            fi
        fi
    else
        # Full validation - get counts first for caching
        pending=$(count_pending_tasks "$inc_id")
        open_acs=$(count_open_acs "$inc_id")
        result=$(validate_increment "$inc_id")

        if [ "$result" = "valid" ]; then
            log "VALID: $inc_id ready to close"
            READY_TO_CLOSE="$READY_TO_CLOSE $inc_id"
        else
            reason="${result#invalid:}"
            log "INVALID: $inc_id - $reason"
            INCOMPLETE_INCS="$INCOMPLETE_INCS $inc_id"
            VALIDATION_ERRORS="$VALIDATION_ERRORS|$inc_id:$reason"
            # Cache first incomplete increment's stats
            if [ -z "$FIRST_INC_CACHED" ]; then
                FIRST_INC_CACHED="$inc_id"
                FIRST_INC_PENDING_CACHED="$pending"
                FIRST_INC_ACS_CACHED="$open_acs"
            fi
        fi
    fi
done

# ============================================================================
# AUTO-CLOSE: Close increments that passed validation
# This is the KEY fix - actually transition status to trigger sync!
# ============================================================================

CLOSED_COUNT=0
for inc_id in $READY_TO_CLOSE; do
    [ -z "$inc_id" ] && continue

    auto_close_increment "$inc_id"
    if [ $? -eq 0 ]; then
        CLOSED_COUNT=$((CLOSED_COUNT + 1))
        log "CLOSED: $inc_id"
    fi
done

# ============================================================================
# SKILL VALIDATION: Run domain-specific validation if skills were activated
# Only runs in auto mode when skills/agents were used during session
# ============================================================================

SKILL_ACTIVATIONS_FILE="$STATE_DIR/skill-activations.json"
SKILL_VALIDATION_FAILED="false"
VALIDATION_SUMMARY=""  # Track what validations were run

if [ -f "$SKILL_ACTIVATIONS_FILE" ]; then
    # Skills were activated during this session
    ACTIVATED_DOMAINS=$(jq -r '.domains | join(", ")' "$SKILL_ACTIVATIONS_FILE" 2>/dev/null || echo "")
    ACTIVATION_COUNT=$(jq -r '.activations | length' "$SKILL_ACTIVATIONS_FILE" 2>/dev/null || echo "0")

    if [ -n "$ACTIVATED_DOMAINS" ] && [ "$ACTIVATED_DOMAINS" != "null" ]; then
        log "SKILL VALIDATION: Activated domains: $ACTIVATED_DOMAINS"

        # Run domain-specific validation
        VALIDATION_SCRIPT="$PROJECT_ROOT/plugins/specweave/hooks/validate-skill-activations.sh"

        # Try installed location first, then package location
        if [ ! -f "$VALIDATION_SCRIPT" ]; then
            VALIDATION_SCRIPT="$(dirname "$0")/validate-skill-activations.sh"
        fi

        if [ -f "$VALIDATION_SCRIPT" ] && [ -x "$VALIDATION_SCRIPT" ]; then
            log "Running skill validation: $VALIDATION_SCRIPT"

            SKILL_VALIDATION_START=$(date +%s)
            if ! PROJECT_ROOT="$PROJECT_ROOT" "$VALIDATION_SCRIPT" 2>&1 | tee -a "$LOG_FILE"; then
                SKILL_VALIDATION_FAILED="true"
                SKILL_VALIDATION_END=$(date +%s)
                SKILL_VALIDATION_DURATION=$((SKILL_VALIDATION_END - SKILL_VALIDATION_START))
                log "SKILL VALIDATION: Failed - blocking completion"
                VALIDATION_ERRORS="$VALIDATION_ERRORS|skill_validation:Domain validation failed for: $ACTIVATED_DOMAINS"
                VALIDATION_SUMMARY="${VALIDATION_SUMMARY}
  ❌ Skill Validation ($ACTIVATED_DOMAINS): FAILED in ${SKILL_VALIDATION_DURATION}s"
            else
                SKILL_VALIDATION_END=$(date +%s)
                SKILL_VALIDATION_DURATION=$((SKILL_VALIDATION_END - SKILL_VALIDATION_START))
                log "SKILL VALIDATION: Passed"
                VALIDATION_SUMMARY="${VALIDATION_SUMMARY}
  ✅ Skill Validation ($ACTIVATED_DOMAINS): PASSED in ${SKILL_VALIDATION_DURATION}s"
            fi
        else
            log "SKILL VALIDATION: Script not found, skipping"
            VALIDATION_SUMMARY="${VALIDATION_SUMMARY}
  ⏭️  Skill Validation: Skipped (no validator)"
        fi
    fi
else
    # No skills activated - note this in log
    log "SKILL VALIDATION: No skills activated this session"
fi

# Add increment validation summary
if [ -n "$READY_TO_CLOSE" ]; then
    for inc in $READY_TO_CLOSE; do
        [ -z "$inc" ] && continue
        VALIDATION_SUMMARY="${VALIDATION_SUMMARY}
  ✅ Increment $inc: All tasks complete, ACs satisfied"
    done
fi

if [ -n "$INCOMPLETE_INCS" ]; then
    for inc in $INCOMPLETE_INCS; do
        [ -z "$inc" ] && continue
        VALIDATION_SUMMARY="${VALIDATION_SUMMARY}
  ⏳ Increment $inc: Work remaining"
    done
fi

# Log validation summary
if [ -n "$VALIDATION_SUMMARY" ]; then
    log "VALIDATION SUMMARY:$VALIDATION_SUMMARY"
fi

# ============================================================================
# DECISION: Continue or Complete
# ============================================================================

# Recount after auto-close
REMAINING_COUNT=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$REMAINING_COUNT" -eq 0 ] && [ "$SKILL_VALIDATION_FAILED" != "true" ]; then
    # All increments closed AND skill validation passed - approve exit
    rm -f "$DEDUP_FILE" 2>/dev/null
    clear_retry_counter
    clear_auto_session  # Clear session marker - work is done!

    # Build context for logging
    _complete_context=$(jq -n \
        --argjson turnCurrent "$CURRENT_TURN" \
        --argjson turnMax "$MAX_TURNS" \
        --argjson closedCount "$CLOSED_COUNT" \
        '{
            sessionActive: false,
            turn: {current: $turnCurrent, max: $turnMax},
            closedIncrements: $closedCount
        }')

    if [ "$CLOSED_COUNT" -gt 0 ]; then
        log "APPROVE: Auto-closed $CLOSED_COUNT increment(s), all work complete"
        silent_approve "Auto-closed $CLOSED_COUNT increment(s)" "all_complete" "$_complete_context"
    else
        silent_approve "No active increments" "all_complete" "$_complete_context"
    fi
fi

# ============================================================================
# KEY FIX: APPROVE if all tasks complete even if increments still "active"
# This handles: auto-close failed, user prefers manual close, etc.
# ============================================================================

# Count how many active increments have incomplete work
INCOMPLETE_COUNT=$(echo "$INCOMPLETE_INCS" | tr -s ' ' | sed 's/^ //' | grep -v '^$' | wc -w | tr -d ' ')

if [ "$INCOMPLETE_COUNT" -eq 0 ] && [ "$SKILL_VALIDATION_FAILED" != "true" ]; then
    # All active increments have complete tasks/ACs - approve even if still "active" status
    rm -f "$DEDUP_FILE" 2>/dev/null
    clear_retry_counter
    clear_auto_session  # Clear session marker - work is done!

    log "APPROVE: All tasks complete in active increments (manual close pending)"

    # Log structured decision
    if type log_decision &>/dev/null; then
        _work_complete_context=$(jq -n \
            --argjson turnCurrent "$CURRENT_TURN" \
            --argjson turnMax "$MAX_TURNS" \
            --arg readyToClose "$READY_TO_CLOSE" \
            '{sessionActive: false, turn: {current: $turnCurrent, max: $turnMax}, increments: {active: [], readyToClose: ($readyToClose | split(" ") | map(select(length > 0)))}}')
        log_decision "stop-auto" "approve" "work_complete" "All tasks complete - increments ready for manual close" "$_work_complete_context" "$(_get_duration_ms)"
    fi

    # Show message about manual close needed
    CLOSE_MSG="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TASKS COMPLETE - Session can end
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All work is done! Increments need manual closing:

$READY_TO_CLOSE

To close: /sw:done <increment-id>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    jq -n \
        --arg decision "approve" \
        --arg reason "All tasks complete - increments ready for manual close" \
        --arg msg "$CLOSE_MSG" \
        '{decision: $decision, reason: $reason, systemMessage: $msg}'
    exit 0
fi

# Handle skill validation failure (block even if tasks are done)
if [ "$SKILL_VALIDATION_FAILED" = "true" ]; then
    log "BLOCK: Skill validation failed - fix issues before completion"
fi

# Work remains - show what's blocking
# IMPORTANT: Sort to ensure deterministic order (prevents retry counter resets)
REMAINING_INCS=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | sort | tr '\n' ', ' | sed 's/,$//')

# Build reason string for retry tracking
BLOCK_REASON="${VALIDATION_ERRORS:-tasks_or_acs_pending}"

# Update retry counter with reason
CURRENT_RETRY=$(update_retry_counter "$REMAINING_INCS" "$BLOCK_REASON")
log "Retry count: $CURRENT_RETRY for increments: $REMAINING_INCS"

# Get first increment ID for commands
FIRST_INC=$(echo "$REMAINING_INCS" | cut -d',' -f1 | tr -d ' ')

# ============================================================================
# DETECT PROJECT CAPABILITIES (conditional steps)
# ============================================================================

HAS_TESTS="false"
TEST_CMD=""

# Check for test capability
if [ -f "$PROJECT_ROOT/package.json" ]; then
    TEST_SCRIPT=$(jq -r '.scripts.test // ""' "$PROJECT_ROOT/package.json" 2>/dev/null)
    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "null" ]; then
        HAS_TESTS="true"
        TEST_CMD="npm test"
    fi
elif [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -d "$PROJECT_ROOT/tests" ]; then
    HAS_TESTS="true"
    TEST_CMD="pytest"
elif [ -f "$PROJECT_ROOT/go.mod" ]; then
    HAS_TESTS="true"
    TEST_CMD="go test ./..."
fi

# Use configured test command if provided
[ -n "$TEST_COMMAND" ] && TEST_CMD="$TEST_COMMAND" && HAS_TESTS="true"

# ============================================================================
# BUILD MESSAGE WITH REFLECTION ON PREVIOUS FAILURES
# ============================================================================

MSG=""

# Add validation summary at the top if any validations were run
if [ -n "$VALIDATION_SUMMARY" ]; then
    MSG="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VALIDATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$VALIDATION_SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"
fi

# Add closed count if any
if [ "$CLOSED_COUNT" -gt 0 ]; then
    MSG="${MSG}✅ Auto-closed $CLOSED_COUNT increment(s)

"
fi

# Build header based on retry count
if [ "$CURRENT_RETRY" -ge "$MAX_RETRIES_BEFORE_ESCALATE" ]; then
    MSG="${MSG}🚨 STUCK SESSION (attempt $CURRENT_RETRY/$MAX_RETRIES_BEFORE_ESCALATE)

⚠️  This session has failed to complete $CURRENT_RETRY times.
    Consider: pausing (/sw:pause $FIRST_INC) or abandoning (/sw:abandon $FIRST_INC)

"
fi

MSG="${MSG}🔄 $REMAINING_COUNT increment(s) need work: $REMAINING_INCS
📊 Session: turn $CURRENT_TURN/$MAX_TURNS | stuck retry $CURRENT_RETRY/$MAX_RETRIES_BEFORE_ESCALATE"

# Add validation errors if any
if [ -n "$VALIDATION_ERRORS" ]; then
    error_details=$(echo "$VALIDATION_ERRORS" | tr '|' '\n' | grep -v '^$' | head -5 | while read line; do
        echo "   • $line"
    done)
    MSG="$MSG

📋 Current blocking issues:
$error_details"
fi

# ============================================================================
# REFLECTION: Why did previous attempts fail?
# ============================================================================

if [ "$CURRENT_RETRY" -gt 1 ]; then
    FAILURE_HISTORY=$(get_failure_history)
    if [ -n "$FAILURE_HISTORY" ]; then
        MSG="$MSG

🔍 REFLECT: Why previous attempts failed:
$FAILURE_HISTORY

💡 THINK: What can you do differently this time?
   • Is there a different approach to fix the issue?
   • Are you stuck in a loop doing the same thing?
   • Should you ask the user for help?"
    fi
fi

# Add mode indicators
if [ "$TDD_MODE" = "true" ]; then
    MSG="🔴 TDD MODE | $MSG"
elif [ "$REQUIRE_TESTS" = "true" ]; then
    MSG="🧪 TEST MODE | $MSG"
fi

# ============================================================================
# BUILD CONDITIONAL COMPLETION STEPS
# ============================================================================

STEP_NUM=1
STEPS=""

# Step 1: Complete tasks (always required)
STEPS="${STEPS}
${STEP_NUM}️⃣  COMPLETE ALL TASKS
    → Run: /sw:do
    → Mark all tasks [x] completed in tasks.md
    → Mark all ACs [x] completed in spec.md"
STEP_NUM=$((STEP_NUM + 1))

# Step 2: Run tests (if available and required)
if [ "$HAS_TESTS" = "true" ] && { [ "$REQUIRE_TESTS" = "true" ] || [ "$TDD_MODE" = "true" ]; }; then
    STEPS="${STEPS}

${STEP_NUM}️⃣  RUN TESTS (REQUIRED by config)
    → Run: $TEST_CMD
    → ALL tests MUST pass before proceeding
    → If tests fail, FIX them and re-run"
    STEP_NUM=$((STEP_NUM + 1))
elif [ "$HAS_TESTS" = "true" ]; then
    STEPS="${STEPS}

${STEP_NUM}️⃣  RUN TESTS (recommended)
    → Run: $TEST_CMD
    → Verify your changes work correctly"
    STEP_NUM=$((STEP_NUM + 1))
fi

# Step 3: Validate (if required by config)
if [ "$REQUIRE_VALIDATION" = "true" ]; then
    STEPS="${STEPS}

${STEP_NUM}️⃣  VALIDATE QUALITY GATES (REQUIRED)
    → Run: /sw:validate $FIRST_INC
    → Review and fix any blocking issues"
    STEP_NUM=$((STEP_NUM + 1))
fi

# Step 4: Judge LLM (if required by config)
if [ "$REQUIRE_JUDGE_LLM" = "true" ]; then
    STEPS="${STEPS}

${STEP_NUM}️⃣  AI QUALITY VERIFICATION (REQUIRED)
    → Run: /sw:judge-llm $FIRST_INC
    → Must pass before closing"
    STEP_NUM=$((STEP_NUM + 1))
fi

# Final step: Close increment (always required)
STEPS="${STEPS}

${STEP_NUM}️⃣  CLOSE INCREMENT (FINAL STEP)
    → Run: /sw:done $FIRST_INC
    → This validates gates and closes properly"

MSG="$MSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 COMPLETION STEPS for $FIRST_INC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$STEPS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Execute these steps IN ORDER, then session will complete automatically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================================
# CIRCUIT BREAKER: Prevent infinite loops after MAX_RETRIES
# NOTE: Uses -ge (>=) to trigger AT the limit, not after it
# ============================================================================

if [ "$CURRENT_RETRY" -ge "$MAX_RETRIES_BEFORE_ESCALATE" ]; then
    log "CIRCUIT BREAKER: Reached $MAX_RETRIES_BEFORE_ESCALATE stuck retries (on same work), approving to break loop"

    CIRCUIT_MSG="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 STUCK SESSION BREAKER (retry $CURRENT_RETRY/$MAX_RETRIES_BEFORE_ESCALATE on same work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Stop hook has fired $CURRENT_RETRY times on the SAME incomplete work.
    This suggests the session is stuck and not making progress.

📋 REMAINING WORK:
   • $REMAINING_COUNT active increment(s): $REMAINING_INCS

🔧 RECOMMENDED ACTIONS:
   1. Run /sw:status to see what's incomplete
   2. Run /sw:do to complete remaining tasks
   3. Run /sw:done $FIRST_INC when ready to close

💡 To increase stuck retry limit, set in .specweave/config.json:
   { \"auto\": { \"maxRetries\": 50 } }

   NOTE: maxRetries tracks stuck retries on SAME work.
   For total session limit, use maxTurns instead.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Clear retry counter and auto session to prevent immediate re-triggering
    clear_retry_counter
    clear_auto_session  # End auto mode on circuit breaker

    # Log structured decision
    if type log_decision &>/dev/null; then
        _circuit_context=$(jq -n \
            --argjson turnCurrent "$CURRENT_TURN" \
            --argjson turnMax "$MAX_TURNS" \
            --argjson retryCurrent "$CURRENT_RETRY" \
            --argjson retryMax "$MAX_RETRIES_BEFORE_ESCALATE" \
            --arg activeIncs "$REMAINING_INCS" \
            '{sessionActive: false, turn: {current: $turnCurrent, max: $turnMax}, retry: {current: $retryCurrent, max: $retryMax, stuck: true}, increments: {active: ($activeIncs | split(", ") | map(select(length > 0)))}}')
        log_decision "stop-auto" "approve" "retry_limit" "Stuck session: $CURRENT_RETRY retries on same incomplete work" "$_circuit_context" "$(_get_duration_ms)"
    fi

    jq -n \
        --arg decision "approve" \
        --arg reason "Stuck session: $CURRENT_RETRY retries on same incomplete work" \
        --arg msg "$CIRCUIT_MSG" \
        '{decision: $decision, reason: $reason, systemMessage: $msg}'
    exit 0
fi

# ============================================================================
# ESCAPE GUIDANCE: Help user understand when to pivot vs continue
# Adds guidance for new functionality/bug fixes that don't fit current increment
# ============================================================================

# Build escape options section for the message
ESCAPE_OPTIONS="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 WORKING ON SOMETHING DIFFERENT? (New functionality, bug fix, or urgent work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the current increment ($FIRST_INC) doesn't match what you need to work on:

📋 OPTION 1: Create a NEW increment for new functionality
   → Run: /sw:cancel-auto (stop auto mode first)
   → Then: /sw:increment \"your new feature or bug fix description\"
   → This will involve PM and Architect roles to properly plan

📋 OPTION 2: Pause current work and start something new
   → Run: /sw:pause $FIRST_INC
   → Then: /sw:increment \"urgent bug fix\" --type=bug
   → Resume later: /sw:resume $FIRST_INC

📋 OPTION 3: Emergency quick fix (skip planning)
   → Run: /sw:cancel-auto
   → Work directly without increment tracking
   → Better for tiny fixes that don't need tracking

💡 TIP: If you're stuck in a loop, the RIGHT answer is often to:
   1. Cancel auto mode: /sw:cancel-auto
   2. Think about what you actually need
   3. Start fresh with a proper increment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show escape options after 3+ retries or when turn count is high
if [ "$CURRENT_RETRY" -ge 3 ] || [ "$CURRENT_TURN" -ge $((MAX_TURNS / 2)) ]; then
    log "Adding escape guidance (retry=$CURRENT_RETRY, turn=$CURRENT_TURN)"
    MSG="$MSG
$ESCAPE_OPTIONS"
fi

# ============================================================================
# BUILD CLEAR SUCCESS CRITERIA FOR THE REASON FIELD
# This is what shows in Claude Code UI - must be ACTIONABLE
# ============================================================================

# Extract first blocking issue
FIRST_BLOCKER=""
if [ -n "$VALIDATION_ERRORS" ]; then
    FIRST_BLOCKER=$(echo "$VALIDATION_ERRORS" | tr '|' '\n' | grep -v '^$' | head -1)
fi

# Build success criteria string with MANDATORY instructions
SUCCESS_CRITERIA=""
NEXT_COMMAND=""

# Use cached values if available, otherwise calculate (fallback)
if [ -n "$FIRST_INC_CACHED" ] && [ "$FIRST_INC_CACHED" = "$FIRST_INC" ]; then
    pending_count="$FIRST_INC_PENDING_CACHED"
    open_acs="$FIRST_INC_ACS_CACHED"
else
    pending_count=$(count_pending_tasks "$FIRST_INC")
    open_acs=$(count_open_acs "$FIRST_INC")
fi

if [ -n "$FIRST_BLOCKER" ]; then
    SUCCESS_CRITERIA="FIX: $FIRST_BLOCKER"
    NEXT_COMMAND="/sw:do"
elif [ "$pending_count" -gt 0 ]; then
    SUCCESS_CRITERIA="MUST COMPLETE $pending_count pending task(s)"
    NEXT_COMMAND="/sw:do"
elif [ "$open_acs" -gt 0 ]; then
    SUCCESS_CRITERIA="MUST SATISFY $open_acs open AC(s)"
    NEXT_COMMAND="/sw:do"
else
    # All tasks and ACs done - MUST close now!
    SUCCESS_CRITERIA="ALL DONE → MUST RUN /sw:done $FIRST_INC NOW"
    NEXT_COMMAND="/sw:done $FIRST_INC"
fi

log "BLOCK: $REMAINING_COUNT increment(s) remaining - turn $CURRENT_TURN/$MAX_TURNS, retry $CURRENT_RETRY - $SUCCESS_CRITERIA"

# Build actionable reason for Claude Code UI - this is the INSTRUCTION
# Show turn/maxTurns (total session limit) in reason for visibility
if [ "$pending_count" -eq 0 ] && [ "$open_acs" -eq 0 ]; then
    # Everything complete - direct to close
    ACTIONABLE_REASON="✅ [turn $CURRENT_TURN/$MAX_TURNS] ALL COMPLETE! RUN NOW: /sw:done $FIRST_INC"
else
    # Work remains - show what and then remind to close
    ACTIONABLE_REASON="⏳ [turn $CURRENT_TURN/$MAX_TURNS] $SUCCESS_CRITERIA → RUN: $NEXT_COMMAND → THEN: /sw:done $FIRST_INC"
fi

# Append mandatory instruction to systemMessage
MSG="$MSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MANDATORY INSTRUCTION (YOU MUST FOLLOW THIS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COMPLETE ALL PENDING TASKS: Run /sw:do and finish every [ ] task
2. SATISFY ALL ACCEPTANCE CRITERIA: Mark all ACs as [x] in spec.md
3. CLOSE THE INCREMENT: Run /sw:done $FIRST_INC

⚠️  DO NOT STOP until you have run /sw:done $FIRST_INC successfully!
⚠️  Session: turn $CURRENT_TURN of $MAX_TURNS (hard limit)

Current status: $pending_count pending task(s), $open_acs open AC(s)
Next command to run: $NEXT_COMMAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Log structured decision before blocking
if type log_decision &>/dev/null; then
    # Get previous reasons from retry file
    _prev_reasons_json="[]"
    if [ -f "$RETRY_FILE" ] && [ -s "$RETRY_FILE" ]; then
        _tmp_reasons=$(jq -c '.reasons // []' "$RETRY_FILE" 2>/dev/null)
        [ -n "$_tmp_reasons" ] && _prev_reasons_json="$_tmp_reasons"
    fi

    # Build blocked increments array
    _blocked_json="[]"
    if [ -n "$FIRST_INC" ]; then
        _blocked_json=$(jq -n \
            --arg id "$FIRST_INC" \
            --argjson tasksPending "$pending_count" \
            --argjson acsOpen "$open_acs" \
            --arg reason "$SUCCESS_CRITERIA" \
            '[{id: $id, tasksPending: $tasksPending, acsOpen: $acsOpen, reason: $reason}]')
    fi

    # Pre-compute stuck value (avoid subshell in jq args)
    _stuck_val="false"
    [ "$CURRENT_RETRY" -ge "$MAX_RETRIES_BEFORE_ESCALATE" ] && _stuck_val="true"

    # Build full context JSON
    _block_context=$(jq -n \
        --argjson turnCurrent "$CURRENT_TURN" \
        --argjson turnMax "$MAX_TURNS" \
        --argjson retryCurrent "$CURRENT_RETRY" \
        --argjson retryMax "$MAX_RETRIES_BEFORE_ESCALATE" \
        --argjson stuck "$_stuck_val" \
        --arg activeIncs "$REMAINING_INCS" \
        --argjson blocked "$_blocked_json" \
        --argjson previousReasons "$_prev_reasons_json" \
        '{sessionActive: true, turn: {current: $turnCurrent, max: $turnMax}, retry: {current: $retryCurrent, max: $retryMax, stuck: $stuck}, increments: {active: ($activeIncs | split(", ") | map(select(length > 0))), blocked: $blocked}, previousReasons: $previousReasons}')

    log_decision "stop-auto" "block" "work_remaining" "$SUCCESS_CRITERIA" "$_block_context" "$(_get_duration_ms)"
fi

jq -n \
    --arg decision "block" \
    --arg reason "$ACTIONABLE_REASON" \
    --arg msg "$MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $msg}'
