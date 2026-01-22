#!/bin/bash
# reflect-stop-hook.sh - Auto-Reflection on Session End (v2.0 - Simplified)
#
# ARCHITECTURE (v2.0):
# - Always uses LLM for extraction (no quick signal check)
# - Learnings go to CLAUDE.md under "## Skill Memories" section
# - User can disable via config: { "reflect": { "enabled": false } }
#
# Called from stop-auto.sh when:
# 1. Session is completing successfully
# 2. Auto-reflect is enabled in config
# 3. Transcript is available
#
# Usage (from stop-auto.sh):
#   source reflect-stop-hook.sh
#   maybe_auto_reflect "$TRANSCRIPT_PATH" "$SESSION_ID"

set +e  # Hook safety

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"

# ============================================================================
# CHECK IF REFLECTION IS ENABLED
# ============================================================================

is_reflect_enabled() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return 0  # Default to enabled if no config
    fi

    local enabled=$(jq -r '.reflect.enabled // true' "$CONFIG_FILE" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# ============================================================================
# LOGGING
# ============================================================================

log_reflect() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    mkdir -p "$LOGS_DIR" 2>/dev/null
    echo "[$timestamp] [$level] $*" >> "$LOGS_DIR/reflect.log" 2>/dev/null
}

# ============================================================================
# MAIN AUTO-REFLECT FUNCTION
# ============================================================================

# Called from stop-auto.sh when session completes
maybe_auto_reflect() {
    local transcript="$1"
    local session_id="${2:-unknown}"

    # Check if reflect is enabled
    if ! is_reflect_enabled; then
        log_reflect "info" "Reflection disabled in config, skipping"
        return 0
    fi

    # Ensure transcript exists
    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        log_reflect "warn" "No transcript available for auto-reflection"
        return 0
    fi

    # Check transcript is not empty
    local lines=$(wc -l < "$transcript" 2>/dev/null | tr -d ' ')
    if [ "$lines" -lt 10 ]; then
        log_reflect "info" "Transcript too short ($lines lines), skipping"
        return 0
    fi

    log_reflect "info" "Starting auto-reflection for session $session_id ($lines lines)"

    # Use specweave CLI if available
    if command -v specweave >/dev/null 2>&1; then
        log_reflect "info" "Using specweave CLI for reflection"

        # Run in background with timeout
        (
            cd "$PROJECT_ROOT"
            timeout 60 specweave reflect-stop "$transcript" --silent >> "$LOGS_DIR/auto-reflect.log" 2>&1
            local result=$?

            if [ $result -eq 0 ]; then
                log_reflect "info" "Auto-reflection completed successfully"
            elif [ $result -eq 124 ]; then
                log_reflect "warn" "Auto-reflection timed out"
            else
                log_reflect "warn" "Auto-reflection completed with exit code $result"
            fi
        ) &

        # Don't wait - let it run async
        log_reflect "info" "Reflection started in background"
        return 0
    fi

    log_reflect "warn" "specweave CLI not found, skipping reflection"
    return 0
}

# ============================================================================
# INTEGRATION POINT FOR STOP-AUTO.SH
# ============================================================================

# This function is called from stop-auto.sh after session completion
# It's designed to be non-blocking and fail gracefully
run_auto_reflection() {
    local transcript="$1"
    local session_id="$2"

    # Run reflection in background to not block session completion
    maybe_auto_reflect "$transcript" "$session_id"

    # Always return success - reflection is optional
    return 0
}

# Export functions for sourcing
export -f maybe_auto_reflect
export -f is_reflect_enabled
export -f run_auto_reflection
export -f log_reflect
