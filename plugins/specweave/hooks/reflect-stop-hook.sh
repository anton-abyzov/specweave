#!/bin/bash
# reflect-stop-hook.sh - Auto-Reflection on Session End
#
# This hook integrates with the stop-auto.sh hook to automatically
# trigger reflection when sessions end (if auto-reflect is enabled).
#
# Called from stop-auto.sh when:
# 1. Session is completing successfully
# 2. Auto-reflect is enabled in config
# 3. Transcript is available
#
# Usage (from stop-auto.sh):
#   source reflect-stop-hook.sh
#   maybe_auto_reflect "$TRANSCRIPT_PATH"

set +e  # Hook safety

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"

# ============================================================================
# AUTO-REFLECTION CHECK
# ============================================================================

# Check if auto-reflection is enabled
is_auto_reflect_enabled() {
    if [ ! -f "$REFLECT_CONFIG" ]; then
        return 1
    fi

    local enabled=$(jq -r '.autoReflect // false' "$REFLECT_CONFIG" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# Check if reflection is globally enabled
is_reflect_enabled() {
    if [ ! -f "$REFLECT_CONFIG" ]; then
        return 0  # Default to enabled if no config
    fi

    local enabled=$(jq -r '.enabled // true' "$REFLECT_CONFIG" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# ============================================================================
# MAIN AUTO-REFLECT FUNCTION
# ============================================================================

# Called from stop-auto.sh when session completes
maybe_auto_reflect() {
    local transcript="$1"
    local session_id="${2:-unknown}"

    # Check if auto-reflect is enabled
    if ! is_reflect_enabled; then
        return 0
    fi

    if ! is_auto_reflect_enabled; then
        return 0
    fi

    # Ensure transcript exists
    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        log_reflect "warn" "No transcript available for auto-reflection"
        return 0
    fi

    log_reflect "info" "Starting auto-reflection for session $session_id"

    # Get configuration
    local confidence=$(jq -r '.confidenceThreshold // "medium"' "$REFLECT_CONFIG" 2>/dev/null)
    local max_learnings=$(jq -r '.maxLearningsPerSession // 10' "$REFLECT_CONFIG" 2>/dev/null)

    # Run reflection
    local reflect_script="$SCRIPT_DIR/../scripts/reflect.sh"

    if [ -f "$reflect_script" ]; then
        bash "$reflect_script" reflect \
            --transcript "$transcript" \
            --confidence "$confidence" \
            --max "$max_learnings" \
            >> "$LOGS_DIR/auto-reflect.log" 2>&1

        local result=$?

        if [ $result -eq 0 ]; then
            log_reflect "info" "Auto-reflection completed successfully"
            echo "🧠 Learned from session"
        else
            log_reflect "warn" "Auto-reflection completed with no new learnings"
        fi
    else
        log_reflect "error" "Reflect script not found: $reflect_script"
    fi

    return 0
}

# ============================================================================
# LOGGING
# ============================================================================

log_reflect() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    mkdir -p "$LOGS_DIR"
    echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"message\":\"$*\"}" >> "$LOGS_DIR/reflect.log"
}

# ============================================================================
# SIGNAL ANALYSIS (Quick check for stop hook)
# ============================================================================

# Quick check if transcript has reflection-worthy signals
has_reflection_signals() {
    local transcript="$1"

    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        return 1
    fi

    # Check for correction patterns
    if grep -qiE "(No, don't|No, use|Wrong|That's incorrect|Always use|Never use|The correct way)" "$transcript" 2>/dev/null; then
        return 0
    fi

    # Check for approval patterns
    if grep -qiE "(Perfect!|That's right|That's correct|Exactly!|Well done|That's exactly how)" "$transcript" 2>/dev/null; then
        return 0
    fi

    return 1
}

# ============================================================================
# INTEGRATION POINT FOR STOP-AUTO.SH
# ============================================================================

# This function is called from stop-auto.sh after session completion
# It's designed to be non-blocking and fail gracefully
run_auto_reflection() {
    local transcript="$1"
    local session_id="$2"

    # Quick check if there are any signals worth reflecting on
    if ! has_reflection_signals "$transcript"; then
        log_reflect "info" "No reflection signals detected, skipping auto-reflect"
        return 0
    fi

    # Run reflection in background to not block session completion
    maybe_auto_reflect "$transcript" "$session_id" &

    # Don't wait - let it run async
    return 0
}

# Export functions for sourcing
export -f maybe_auto_reflect
export -f is_auto_reflect_enabled
export -f has_reflection_signals
export -f run_auto_reflection
