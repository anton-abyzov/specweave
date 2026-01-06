#!/bin/bash
# stop-dispatcher.sh - Stop Hook Dispatcher
#
# Chains multiple stop hooks in order:
# 1. stop-reflect.sh (always runs, extracts learnings)
# 2. stop-auto.sh (only if auto session active)
#
# Design:
# - Each hook runs independently
# - If ANY hook returns "block", the session is blocked
# - Reflect always runs first (lightweight, never blocks)
# - Auto only runs if there's an active auto session
#
# This dispatcher ensures:
# - Reflect works on ALL sessions (not just auto mode)
# - Auto mode continues to work when active
# - No collision between reflect and auto

set +e  # Don't exit on error

# Read input from stdin (capture for passing to sub-hooks)
INPUT=$(cat)

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default response
FINAL_DECISION="approve"
FINAL_REASON="Session complete"
SYSTEM_MESSAGE=""

# ============================================================================
# HOOK 1: REFLECT (always runs, never blocks)
# ============================================================================

REFLECT_HOOK="$SCRIPT_DIR/stop-reflect.sh"
if [ -x "$REFLECT_HOOK" ]; then
    # Run reflect hook - it handles its own async processing
    REFLECT_RESULT=$(echo "$INPUT" | bash "$REFLECT_HOOK" 2>/dev/null || echo '{"decision":"approve"}')
    # Reflect never blocks, so we don't check its decision
fi

# ============================================================================
# HOOK 2: AUTO (only if auto session is active)
# ============================================================================

AUTO_SESSION="$STATE_DIR/auto-session.json"
AUTO_HOOK="$SCRIPT_DIR/stop-auto.sh"

# Only run auto hook if:
# 1. Auto session file exists
# 2. Session status is "running"
# 3. Auto hook is executable
if [ -f "$AUTO_SESSION" ] && [ -x "$AUTO_HOOK" ]; then
    SESSION_STATUS=$(jq -r '.status // "unknown"' "$AUTO_SESSION" 2>/dev/null)

    if [ "$SESSION_STATUS" = "running" ]; then
        # Run auto hook and capture result
        AUTO_RESULT=$(echo "$INPUT" | bash "$AUTO_HOOK" 2>/dev/null || echo '{"decision":"approve"}')

        # Parse auto hook decision
        AUTO_DECISION=$(echo "$AUTO_RESULT" | jq -r '.decision // "approve"' 2>/dev/null)
        AUTO_REASON=$(echo "$AUTO_RESULT" | jq -r '.reason // ""' 2>/dev/null)
        AUTO_SYSTEM=$(echo "$AUTO_RESULT" | jq -r '.systemMessage // ""' 2>/dev/null)

        # If auto wants to block, propagate that
        if [ "$AUTO_DECISION" = "block" ]; then
            FINAL_DECISION="block"
            FINAL_REASON="$AUTO_REASON"
            SYSTEM_MESSAGE="$AUTO_SYSTEM"
        fi
    fi
fi

# ============================================================================
# OUTPUT FINAL DECISION
# ============================================================================

if [ -n "$SYSTEM_MESSAGE" ]; then
    # Escape system message for JSON
    ESCAPED_MSG=$(echo "$SYSTEM_MESSAGE" | jq -Rs '.' | sed 's/^"//;s/"$//')
    echo "{\"decision\":\"$FINAL_DECISION\",\"reason\":\"$FINAL_REASON\",\"systemMessage\":\"$ESCAPED_MSG\"}"
else
    echo "{\"decision\":\"$FINAL_DECISION\",\"reason\":\"$FINAL_REASON\"}"
fi
