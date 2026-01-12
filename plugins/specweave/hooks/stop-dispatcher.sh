#!/bin/bash
# stop-dispatcher.sh - Stop Hook Dispatcher
#
# Chains multiple stop hooks in order:
# 1. stop-reflect.sh (always runs, extracts learnings)
# 2. stop-auto-simple.sh (only if auto session active)
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
# STOP HOOK NOTIFICATION (always visible)
# This appears on EVERY stop hook call to give visibility to the user
# ============================================================================
STOP_HOOK_HEADER="
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛑 STOP HOOK TRIGGERED                                                      │
└─────────────────────────────────────────────────────────────────────────────┘"

# ============================================================================
# HOOK 1: REFLECT (always runs, never blocks, but may have notification)
# ============================================================================

REFLECT_HOOK="$SCRIPT_DIR/stop-reflect.sh"
REFLECT_MESSAGE=""
if [ -x "$REFLECT_HOOK" ]; then
    # Run reflect hook - it handles its own async processing
    REFLECT_RESULT=$(echo "$INPUT" | bash "$REFLECT_HOOK" 2>/dev/null || echo '{"decision":"approve"}')
    # Reflect never blocks, but capture its systemMessage if present
    REFLECT_MESSAGE=$(echo "$REFLECT_RESULT" | jq -r '.systemMessage // ""' 2>/dev/null || echo "")
fi

# ============================================================================
# HOOK 2: AUTO (only if auto session is active)
# ============================================================================

AUTO_SESSION="$STATE_DIR/auto-session.json"
AUTO_HOOK="$SCRIPT_DIR/stop-auto-simple.sh"

# Only run auto hook if:
# 1. Auto session file exists
# 2. Session status is "running"
# 3. Auto hook is executable
if [ -f "$AUTO_SESSION" ] && [ -x "$AUTO_HOOK" ]; then
    SESSION_STATUS=$(jq -r '.status // "unknown"' "$AUTO_SESSION" 2>/dev/null)

    if [ "$SESSION_STATUS" = "running" ]; then
        # Run auto hook and capture result
        # Note: We log stderr to a temp file for debugging but don't suppress it entirely
        AUTO_STDERR_LOG=$(mktemp 2>/dev/null || echo "/tmp/auto-hook-stderr-$$")
        AUTO_RESULT=$(echo "$INPUT" | bash "$AUTO_HOOK" 2>"$AUTO_STDERR_LOG")
        AUTO_EXIT_CODE=$?

        # If hook failed, log it but fall back to approve to prevent stuck sessions
        if [ $AUTO_EXIT_CODE -ne 0 ] || [ -z "$AUTO_RESULT" ]; then
            # Log the error for debugging
            if [ -f "$AUTO_STDERR_LOG" ] && [ -s "$AUTO_STDERR_LOG" ]; then
                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"auto_hook_error\",\"exitCode\":$AUTO_EXIT_CODE,\"stderr\":\"$(head -c 500 "$AUTO_STDERR_LOG" | tr '\n' ' ')\"}" >> "$PROJECT_ROOT/.specweave/logs/hook-errors.log" 2>/dev/null || true
            fi
            rm -f "$AUTO_STDERR_LOG" 2>/dev/null || true
            AUTO_RESULT='{"decision":"approve","reason":"Auto hook failed, allowing exit"}'
        fi
        rm -f "$AUTO_STDERR_LOG" 2>/dev/null || true

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
# OUTPUT FINAL DECISION (with stop hook header for visibility)
# ============================================================================

# Build full message with all components
# 1. Stop hook header (always)
# 2. Reflect message (if learnings queued)
# 3. Auto/session message

FULL_MESSAGE="${STOP_HOOK_HEADER}"

# Add reflect message if present (learnings were queued)
if [ -n "$REFLECT_MESSAGE" ]; then
    FULL_MESSAGE="${FULL_MESSAGE}
${REFLECT_MESSAGE}"
fi

# Add auto/session message
if [ -n "$SYSTEM_MESSAGE" ]; then
    FULL_MESSAGE="${FULL_MESSAGE}
${SYSTEM_MESSAGE}"
else
    # Minimal message for non-auto sessions
    FULL_MESSAGE="${FULL_MESSAGE}
Session ending normally."
fi

# Use jq to properly construct JSON with escaped strings
# This avoids manual escaping which can break on special characters
jq -n \
    --arg decision "$FINAL_DECISION" \
    --arg reason "$FINAL_REASON" \
    --arg systemMessage "$FULL_MESSAGE" \
    '{decision: $decision, reason: $reason, systemMessage: $systemMessage}'
