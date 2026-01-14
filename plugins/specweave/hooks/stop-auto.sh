#!/bin/bash
# stop-auto.sh - Auto Mode Stop Hook (v2.0 - Deduplication + Strict Guards)
#
# PURPOSE: ONLY fires when auto mode is EXPLICITLY active via /sw:auto command.
# This hook should NEVER fire during normal development sessions.
#
# Core principle: The increment's metadata.json status IS the state.
# - If active increments exist AND auto-mode flag is set → block exit
# - Otherwise → approve exit (SILENTLY - no output!)
#
# IMPORTANT: This hook includes deduplication to prevent feedback loops
# caused by Claude Code UI bug (2.0.17-2.0.22) that shows duplicate messages.
# See: https://github.com/anthropics/claude-code/issues/9602

set +e  # Don't exit on errors

# Read stdin (Claude Code passes context here)
INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# ============================================================================
# SILENT APPROVE HELPER (prevents feedback loops)
# ============================================================================
# Returns approve with NO systemMessage to avoid triggering UI display loops
silent_approve() {
    echo '{"decision":"approve"}'
    exit 0
}

# ============================================================================
# Quick exits - not a SpecWeave project or auto mode not active
# ============================================================================

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
AUTO_FLAG="$PROJECT_ROOT/.specweave/state/auto-mode.json"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
DEDUP_FILE="$STATE_DIR/.stop-auto-last-fire"

# Not a SpecWeave project - SILENT approve
[ ! -d "$INCREMENTS_DIR" ] && silent_approve

# Auto mode not active (flag file missing) - SILENT approve
# This is the CRITICAL check: no auto-mode.json = normal session = no output!
[ ! -f "$AUTO_FLAG" ] && silent_approve

# Check if auto mode is actually active (file exists but might have active=false)
AUTO_ACTIVE=$(jq -r '.active // false' "$AUTO_FLAG" 2>/dev/null || echo "false")
[ "$AUTO_ACTIVE" != "true" ] && silent_approve

# ============================================================================
# DEDUPLICATION: Prevent feedback loops (Claude Code UI bug workaround)
# ============================================================================
# If we've shown this message in the last 5 seconds, skip to prevent loops
# This addresses the Claude Code 2.0.17-2.0.22 bug where stop hooks display
# multiple times even though they execute once.

NOW=$(date +%s)
if [ -f "$DEDUP_FILE" ]; then
    LAST_FIRE=$(cat "$DEDUP_FILE" 2>/dev/null || echo "0")
    ELAPSED=$((NOW - LAST_FIRE))
    # If fired within last 5 seconds, approve silently to break the loop
    if [ "$ELAPSED" -lt 5 ]; then
        silent_approve
    fi
fi

# Record this fire time for deduplication
mkdir -p "$STATE_DIR" 2>/dev/null
echo "$NOW" > "$DEDUP_FILE" 2>/dev/null

# ============================================================================
# Count active increments (THE source of truth!)
# ============================================================================

ACTIVE_COUNT=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null | wc -l | tr -d ' ')

# ============================================================================
# Decision: Continue or Complete
# ============================================================================

if [ "$ACTIVE_COUNT" -eq 0 ]; then
    # All done! Clean up auto mode state
    rm -f "$AUTO_FLAG" 2>/dev/null
    rm -f "$DEDUP_FILE" 2>/dev/null

    echo '{"decision":"approve","reason":"All increments complete","systemMessage":"✅ Auto mode complete - all work finished"}'
    exit 0
fi

# Work remains - block exit and continue
# Get first active increment for context
ACTIVE_INC=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
    | head -1 | sed 's|.*/\([^/]*\)/metadata.json|\1|')

jq -n \
    --arg decision "block" \
    --arg reason "$ACTIVE_COUNT active increment(s): $ACTIVE_INC" \
    --arg msg "🔄 Auto mode: $ACTIVE_COUNT increment(s) in progress. Continue with /sw:do" \
    '{decision: $decision, reason: $reason, systemMessage: $msg}'
