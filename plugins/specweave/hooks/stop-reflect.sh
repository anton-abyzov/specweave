#!/bin/bash
# stop-reflect.sh - Session Reflection Hook (v3.0 - Uses TypeScript)
#
# ARCHITECTURE (v3.0):
# - Uses specweave CLI (TypeScript) for reflection
# - Learnings go to CLAUDE.md under "## Skill Memories" section
# - User can disable via config: { "reflect": { "enabled": false } }
#
# This hook ALWAYS approves (never blocks sessions) but may trigger
# background learning extraction if enabled.

set +e  # Never fail - this is a non-critical hook

# Read input from stdin (required by Claude Code hooks)
INPUT=$(cat)

# Parse input fields
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
STATE_DIR="$PROJECT_ROOT/.specweave/state"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Logging function
log_reflect() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
    local log_file="$LOGS_DIR/reflect.log"

    # Rotate if too large (keep last 50 lines)
    if [ -f "$log_file" ]; then
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        if [ "$lines" -gt 100 ]; then
            tail -n 50 "$log_file" > "$log_file.tmp" 2>/dev/null && mv "$log_file.tmp" "$log_file" 2>/dev/null || true
        fi
    fi

    echo "[$timestamp] [$level] $*" >> "$log_file" 2>/dev/null || true
}

# Check if reflection is enabled
is_reflect_enabled() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return 0  # Default to enabled if no config
    fi

    local enabled=$(jq -r '.reflect.enabled // true' "$CONFIG_FILE" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# Cleanup ephemeral state files
cleanup_session_state() {
    rm -f "$STATE_DIR/.current-agent-type" 2>/dev/null || true
}

# Run reflection using TypeScript implementation
run_reflection() {
    local transcript="$1"

    # Check if reflect is enabled
    if ! is_reflect_enabled; then
        log_reflect "info" "Reflection disabled in config"
        return 0
    fi

    # Ensure transcript exists
    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        log_reflect "info" "No transcript available"
        return 0
    fi

    # Check transcript has meaningful content
    local lines=$(wc -l < "$transcript" 2>/dev/null | tr -d ' ')
    if [ "$lines" -lt 10 ]; then
        log_reflect "info" "Transcript too short ($lines lines)"
        return 0
    fi

    log_reflect "info" "Starting reflection ($lines lines)"

    # Use specweave CLI (TypeScript implementation)
    if command -v specweave >/dev/null 2>&1; then
        (
            cd "$PROJECT_ROOT"
            timeout 60 specweave reflect-stop "$transcript" --silent >> "$LOGS_DIR/auto-reflect.log" 2>&1
            local result=$?

            if [ $result -eq 0 ]; then
                log_reflect "info" "Reflection completed successfully"
            elif [ $result -eq 124 ]; then
                log_reflect "warn" "Reflection timed out"
            else
                log_reflect "warn" "Reflection completed with exit code $result"
            fi
        ) &
        log_reflect "info" "Reflection started in background"
    else
        log_reflect "warn" "specweave CLI not found"
    fi

    return 0
}

# Main execution
main() {
    # SILENT approve - prevents UI feedback loops
    local silent_approve='{"decision":"approve"}'

    # Always cleanup ephemeral session state
    cleanup_session_state

    # Quick bail if no transcript
    if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
        echo "$silent_approve"
        exit 0
    fi

    # Run reflection (async, non-blocking)
    run_reflection "$TRANSCRIPT_PATH"

    # Always approve
    echo "$silent_approve"
    exit 0
}

main
