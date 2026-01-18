#!/bin/bash
# stop-auto.sh - Auto Mode Stop Hook (v3.0 - SpecWeave Auto Mode)
#
# PHILOSOPHY: No session files. No complex state. Just:
#   1. Is this a SpecWeave project with auto enabled?
#   2. Are there active increments?
#   3. YES → block exit, continue working
#   4. NO → approve exit
#
# Configuration is read from .specweave/config.json:
#   - auto.enabled: Master switch (default: true)
#   - auto.requireTests: Block until tests pass (default: false)
#   - testing.defaultTestMode: "tdd" enables strict test enforcement
#
# This implements SpecWeave's autonomous execution pattern.

set +e  # Don't exit on errors

# Read stdin (Claude Code passes context here)
INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# ============================================================================
# SILENT APPROVE - Normal sessions get NO output
# ============================================================================
silent_approve() {
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
[ ! -d "$SPECWEAVE_DIR" ] && silent_approve
[ ! -d "$INCREMENTS_DIR" ] && silent_approve

# ============================================================================
# READ PROJECT CONFIG (the ONLY state we need!)
# ============================================================================

# Check if auto mode is enabled in config (default: true)
AUTO_ENABLED="true"
REQUIRE_TESTS="false"
TDD_MODE="false"

if [ -f "$CONFIG_FILE" ]; then
    AUTO_ENABLED=$(jq -r '.auto.enabled // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
    REQUIRE_TESTS=$(jq -r '.auto.requireTests // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
    TDD_MODE_CONFIG=$(jq -r '.testing.defaultTestMode // "standard"' "$CONFIG_FILE" 2>/dev/null || echo "standard")
    [ "$TDD_MODE_CONFIG" = "tdd" ] && TDD_MODE="true"
fi

# Auto mode disabled in config - silent approve
[ "$AUTO_ENABLED" != "true" ] && silent_approve

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

    # Stale file (>1 hour) - ignore it
    [ "$ELAPSED" -gt 3600 ] && rm -f "$DEDUP_FILE" 2>/dev/null
    # Recent fire - deduplicate
    [ "$ELAPSED" -lt "$DEDUP_WINDOW" ] && silent_approve
fi

# Record this fire
mkdir -p "$STATE_DIR" 2>/dev/null
echo "$NOW" > "$DEDUP_FILE" 2>/dev/null

# ============================================================================
# CHECK FOR PARALLEL SESSION
# ============================================================================

PARALLEL_SESSION="$STATE_DIR/parallel/session.json"

if [ -f "$PARALLEL_SESSION" ]; then
    SESSION_STATUS=$(jq -r '.status // "unknown"' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

    if [ "$SESSION_STATUS" = "active" ]; then
        # Count pending agents (not completed or failed)
        PENDING_AGENTS=$(jq '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled")] | length' "$PARALLEL_SESSION" 2>/dev/null || echo "0")

        if [ "$PENDING_AGENTS" -gt 0 ]; then
            # Get list of pending agents
            AGENT_LIST=$(jq -r '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled") | "\(.domain):\(.status)"] | join(", ")' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

            MSG="🔄 $PENDING_AGENTS parallel agent(s) running: $AGENT_LIST → wait for completion"

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
# COUNT ACTIVE INCREMENTS (the source of truth!)
# ============================================================================

ACTIVE_COUNT=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null | wc -l | tr -d ' ')

# ============================================================================
# DECISION: Continue or Complete
# ============================================================================

if [ "$ACTIVE_COUNT" -eq 0 ]; then
    # No active work - approve exit
    rm -f "$DEDUP_FILE" 2>/dev/null
    silent_approve
fi

# Work remains - get ALL active increments (WIP limits don't apply to completion!)
ACTIVE_INCS=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | tr '\n' ', ' | sed 's/,$//')

# Build the message - MUST complete ALL increments before exit
MSG="🔄 $ACTIVE_COUNT increment(s) to complete: $ACTIVE_INCS"

if [ "$TDD_MODE" = "true" ]; then
    MSG="🔴 TDD | $ACTIVE_COUNT to complete: $ACTIVE_INCS (tests must pass!)"
elif [ "$REQUIRE_TESTS" = "true" ]; then
    MSG="🧪 $ACTIVE_COUNT to complete: $ACTIVE_INCS (run tests)"
fi

# Add clear instruction
MSG="$MSG → /sw:do"

# Block exit - MUST complete ALL active increments (WIP limits = creation, not completion)
jq -n \
    --arg decision "block" \
    --arg reason "Complete all $ACTIVE_COUNT increment(s): $ACTIVE_INCS" \
    --arg msg "$MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $msg}'
