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

# Read stdin (Claude Code passes context here)
INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

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
    log "APPROVE: $1"
    echo '{"decision":"approve"}'
    exit 0
}

# ============================================================================
# QUICK EXITS - Not a SpecWeave project
# ============================================================================

SPECWEAVE_DIR="$PROJECT_ROOT/.specweave"
INCREMENTS_DIR="$SPECWEAVE_DIR/increments"
CONFIG_FILE="$SPECWEAVE_DIR/config.json"

# Not a SpecWeave project - silent approve
[ ! -d "$SPECWEAVE_DIR" ] && silent_approve "Not a SpecWeave project"
[ ! -d "$INCREMENTS_DIR" ] && silent_approve "No increments directory"

# ============================================================================
# READ PROJECT CONFIG
# ============================================================================

AUTO_ENABLED="true"
REQUIRE_TESTS="false"
REQUIRE_VALIDATION="true"
REQUIRE_JUDGE_LLM="false"
MAX_RETRIES="20"
TDD_MODE="false"
SKIP_QUALITY_GATES="false"
TEST_COMMAND=""

if [ -f "$CONFIG_FILE" ]; then
    AUTO_ENABLED=$(jq -r '.auto.enabled // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_TESTS=$(jq -r '.auto.requireTests // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    REQUIRE_VALIDATION=$(jq -r '.auto.requireValidation // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_JUDGE_LLM=$(jq -r '.auto.requireJudgeLLM // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    MAX_RETRIES=$(jq -r '.auto.maxRetries // 20' "$CONFIG_FILE" 2>/dev/null || echo "20")
    TEST_COMMAND=$(jq -r '.auto.testCommand // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    SKIP_QUALITY_GATES=$(jq -r '.auto.skipQualityGates // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    TDD_MODE_CONFIG=$(jq -r '.testing.defaultTestMode // "standard"' "$CONFIG_FILE" 2>/dev/null || echo "standard")
    [ "$TDD_MODE_CONFIG" = "tdd" ] || [ "$TDD_MODE_CONFIG" = "TDD" ] && TDD_MODE="true"
fi

# Auto mode disabled in config - silent approve
[ "$AUTO_ENABLED" != "true" ] && silent_approve "Auto mode disabled in config"

log "Config: TDD=$TDD_MODE, RequireTests=$REQUIRE_TESTS, RequireValidation=$REQUIRE_VALIDATION, RequireJudgeLLM=$REQUIRE_JUDGE_LLM, MaxRetries=$MAX_RETRIES"

# ============================================================================
# DEDUPLICATION - Prevent feedback loops (Claude Code UI bug workaround)
# ============================================================================

STATE_DIR="$SPECWEAVE_DIR/state"
DEDUP_FILE="$STATE_DIR/.stop-auto-dedup"
DEDUP_WINDOW="${SPECWEAVE_STOP_HOOK_DEDUP:-5}"
NOW=$(date +%s)

if [ -f "$DEDUP_FILE" ]; then
    LAST_FIRE=$(cat "$DEDUP_FILE" 2>/dev/null || echo "0")
    ELAPSED=$((NOW - LAST_FIRE))
    [ "$ELAPSED" -gt 3600 ] && rm -f "$DEDUP_FILE" 2>/dev/null
    [ "$ELAPSED" -lt "$DEDUP_WINDOW" ] && silent_approve "Deduplicated (${ELAPSED}s < ${DEDUP_WINDOW}s)"
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
    grep -c '^- \[ \] \*\*AC-' "$spec_file" 2>/dev/null || echo "0"
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

for meta_file in $ACTIVE_METADATA_FILES; do
    # Extract increment ID from path
    inc_id=$(echo "$meta_file" | sed 's|.*/\([^/]*\)/metadata.json|\1|')

    log "Checking increment: $inc_id"

    if [ "$SKIP_QUALITY_GATES" = "true" ]; then
        # Skip validation, just check task status
        pending=$(count_pending_tasks "$inc_id")
        if [ "$pending" -eq 0 ]; then
            log "SKIP_QUALITY_GATES: $inc_id has no pending tasks, marking ready"
            READY_TO_CLOSE="$READY_TO_CLOSE $inc_id"
        else
            INCOMPLETE_INCS="$INCOMPLETE_INCS $inc_id"
            VALIDATION_ERRORS="$VALIDATION_ERRORS|$inc_id:$pending tasks pending"
        fi
    else
        # Full validation
        result=$(validate_increment "$inc_id")

        if [ "$result" = "valid" ]; then
            log "VALID: $inc_id ready to close"
            READY_TO_CLOSE="$READY_TO_CLOSE $inc_id"
        else
            reason="${result#invalid:}"
            log "INVALID: $inc_id - $reason"
            INCOMPLETE_INCS="$INCOMPLETE_INCS $inc_id"
            VALIDATION_ERRORS="$VALIDATION_ERRORS|$inc_id:$reason"
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
# DECISION: Continue or Complete
# ============================================================================

# Recount after auto-close
REMAINING_COUNT=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$REMAINING_COUNT" -eq 0 ]; then
    # All work complete - approve exit and clear retry counter
    rm -f "$DEDUP_FILE" 2>/dev/null
    clear_retry_counter

    if [ "$CLOSED_COUNT" -gt 0 ]; then
        log "APPROVE: Auto-closed $CLOSED_COUNT increment(s), all work complete"
        silent_approve "Auto-closed $CLOSED_COUNT increment(s)"
    else
        silent_approve "No active increments"
    fi
fi

# Work remains - show what's blocking
REMAINING_INCS=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | tr '\n' ', ' | sed 's/,$//')

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

# Add closed count if any
if [ "$CLOSED_COUNT" -gt 0 ]; then
    MSG="✅ Auto-closed $CLOSED_COUNT increment(s)

"
fi

# Build header based on retry count
if [ "$CURRENT_RETRY" -ge "$MAX_RETRIES_BEFORE_ESCALATE" ]; then
    MSG="${MSG}🚨 STUCK SESSION (attempt $CURRENT_RETRY/$MAX_RETRIES_BEFORE_ESCALATE)

⚠️  This session has failed to complete $CURRENT_RETRY times.
    Consider: pausing (/sw:pause $FIRST_INC) or abandoning (/sw:abandon $FIRST_INC)

"
fi

MSG="${MSG}🔄 $REMAINING_COUNT increment(s) need work: $REMAINING_INCS (attempt $CURRENT_RETRY/$MAX_RETRIES_BEFORE_ESCALATE)"

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

log "BLOCK: $REMAINING_COUNT increment(s) remaining - attempt $CURRENT_RETRY"

jq -n \
    --arg decision "block" \
    --arg reason "Complete remaining $REMAINING_COUNT increment(s): $REMAINING_INCS (attempt $CURRENT_RETRY)" \
    --arg msg "$MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $msg}'
