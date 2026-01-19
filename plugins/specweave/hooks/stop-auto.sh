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
TDD_MODE="false"
SKIP_QUALITY_GATES="false"

if [ -f "$CONFIG_FILE" ]; then
    AUTO_ENABLED=$(jq -r '.auto.enabled // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_TESTS=$(jq -r '.auto.requireTests // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    SKIP_QUALITY_GATES=$(jq -r '.auto.skipQualityGates // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    TDD_MODE_CONFIG=$(jq -r '.testing.defaultTestMode // "standard"' "$CONFIG_FILE" 2>/dev/null || echo "standard")
    [ "$TDD_MODE_CONFIG" = "tdd" ] || [ "$TDD_MODE_CONFIG" = "TDD" ] && TDD_MODE="true"
fi

# Auto mode disabled in config - silent approve
[ "$AUTO_ENABLED" != "true" ] && silent_approve "Auto mode disabled in config"

log "Config: TDD=$TDD_MODE, RequireTests=$REQUIRE_TESTS, SkipQualityGates=$SKIP_QUALITY_GATES"

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
    # All work complete - approve exit
    rm -f "$DEDUP_FILE" 2>/dev/null

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

# Build detailed message
MSG="🔄 $REMAINING_COUNT increment(s) need work: $REMAINING_INCS"

# Add validation errors if any
if [ -n "$VALIDATION_ERRORS" ]; then
    # Parse errors and format nicely
    error_details=$(echo "$VALIDATION_ERRORS" | tr '|' '\n' | grep -v '^$' | head -5 | while read line; do
        echo "   • $line"
    done)
    MSG="$MSG

📋 Blocking issues:
$error_details"
fi

# Add mode indicators
if [ "$TDD_MODE" = "true" ]; then
    MSG="🔴 TDD MODE | $MSG

✓ Tests must pass before auto-close"
elif [ "$REQUIRE_TESTS" = "true" ]; then
    MSG="🧪 TEST MODE | $MSG"
fi

# Add closed count if any
if [ "$CLOSED_COUNT" -gt 0 ]; then
    MSG="✅ Auto-closed $CLOSED_COUNT increment(s)

$MSG"
fi

MSG="$MSG

→ Continue with /sw:do"

log "BLOCK: $REMAINING_COUNT increment(s) remaining"

jq -n \
    --arg decision "block" \
    --arg reason "Complete remaining $REMAINING_COUNT increment(s): $REMAINING_INCS" \
    --arg msg "$MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $msg}'
