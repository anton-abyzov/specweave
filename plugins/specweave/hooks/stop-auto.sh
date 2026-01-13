#!/bin/bash
# stop-auto.sh - Ralph Wiggum Pattern Stop Hook
#
# Core principle: The increment's metadata.json status IS the state.
# - If active increments exist AND auto-mode flag is set → block exit
# - Otherwise → approve exit
#
# No complex session tracking needed. Simple and reliable.

set +e  # Don't exit on errors

# Read stdin (Claude Code passes context here)
INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# ============================================================================
# Quick exits - not a SpecWeave project or auto mode not active
# ============================================================================

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
AUTO_FLAG="$PROJECT_ROOT/.specweave/state/auto-mode.json"

# Not a SpecWeave project
[ ! -d "$INCREMENTS_DIR" ] && echo '{"decision":"approve"}' && exit 0

# Auto mode not active (flag file missing)
[ ! -f "$AUTO_FLAG" ] && echo '{"decision":"approve"}' && exit 0

# Check if auto mode is actually active
AUTO_ACTIVE=$(jq -r '.active // false' "$AUTO_FLAG" 2>/dev/null || echo "false")
[ "$AUTO_ACTIVE" != "true" ] && echo '{"decision":"approve"}' && exit 0

# ============================================================================
# Count active increments (THE source of truth!)
# ============================================================================

ACTIVE_COUNT=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null | wc -l | tr -d ' ')

# ============================================================================
# Decision: Continue or Complete
# ============================================================================

if [ "$ACTIVE_COUNT" -eq 0 ]; then
    # All done! Clean up and exit
    rm -f "$AUTO_FLAG" 2>/dev/null

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
