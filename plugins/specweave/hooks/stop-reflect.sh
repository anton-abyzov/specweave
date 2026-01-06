#!/bin/bash
# stop-reflect.sh - Lightweight Reflect Hook (Session Learning)
#
# INDEPENDENT from auto mode - runs on EVERY session end.
# Extracts learnings from user corrections/approvals and saves to memory.
#
# Design principles:
# 1. LIGHTWEIGHT - ~100 lines, single responsibility
# 2. FAST - Quick checks, async processing
# 3. SAFE - Always returns approve, never blocks
# 4. CROSS-PLATFORM - POSIX-compatible, no bashisms where possible
#
# Claude Code Stop Hook receives:
# - stdin: JSON with transcript_path, stop_hook_active, etc.
# - Expected output: JSON with decision (approve/block)
#
# This hook ALWAYS approves (never blocks sessions) but may trigger
# background learning extraction if enabled.

set +e  # Never fail - this is a non-critical hook

# Read input from stdin
INPUT=$(cat)

# Parse input fields
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Quick logging function with rotation
MAX_LOG_LINES=100
log_reflect() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
    local log_file="$LOGS_DIR/reflect.log"

    # Rotate if too large (keep last 50 lines)
    if [ -f "$log_file" ]; then
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
            tail -n 50 "$log_file" > "$log_file.tmp" 2>/dev/null && mv "$log_file.tmp" "$log_file" 2>/dev/null || true
        fi
    fi

    echo "{\"ts\":\"$timestamp\",\"lvl\":\"$level\",\"msg\":\"$*\"}" >> "$log_file" 2>/dev/null || true
}

# Check if auto-reflect is enabled
is_auto_reflect_enabled() {
    if [ ! -f "$REFLECT_CONFIG" ]; then
        return 1
    fi

    local enabled=$(jq -r '.autoReflect // false' "$REFLECT_CONFIG" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# Check for reflection-worthy signals in transcript
has_reflection_signals() {
    local transcript="$1"

    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        return 1
    fi

    # Quick grep for correction/approval patterns
    # Uses POSIX grep -E for cross-platform compatibility
    if grep -qiE "(No, don't|No, use|Wrong|That's incorrect|Always use|Never use|The correct way|Perfect!|That's right|That's correct|Exactly!|Well done)" "$transcript" 2>/dev/null; then
        return 0
    fi

    return 1
}

# Run reflection in background
run_reflection_async() {
    local transcript="$1"
    local reflect_script="$SCRIPT_DIR/../scripts/reflect.sh"

    if [ ! -f "$reflect_script" ]; then
        log_reflect "warn" "Reflect script not found: $reflect_script"
        return 0
    fi

    # Get config values
    local confidence=$(jq -r '.confidenceThreshold // "medium"' "$REFLECT_CONFIG" 2>/dev/null || echo "medium")
    local max_learnings=$(jq -r '.maxLearningsPerSession // 10' "$REFLECT_CONFIG" 2>/dev/null || echo "10")

    log_reflect "info" "Starting async reflection"

    # Run in background - don't wait
    (
        bash "$reflect_script" reflect \
            --transcript "$transcript" \
            --confidence "$confidence" \
            --max "$max_learnings" \
            >> "$LOGS_DIR/auto-reflect.log" 2>&1

        if [ $? -eq 0 ]; then
            log_reflect "info" "Reflection completed successfully"
        else
            log_reflect "info" "Reflection completed with no new learnings"
        fi
    ) &

    return 0
}

# Main logic
main() {
    # Always approve - this hook should never block
    local approve_response='{"decision":"approve","reason":"Session complete"}'

    # Quick bail if no transcript
    if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
        echo "$approve_response"
        exit 0
    fi

    # Check if auto-reflect is enabled
    if ! is_auto_reflect_enabled; then
        echo "$approve_response"
        exit 0
    fi

    # Check for reflection signals
    if ! has_reflection_signals "$TRANSCRIPT_PATH"; then
        log_reflect "info" "No reflection signals detected"
        echo "$approve_response"
        exit 0
    fi

    # Run reflection async (don't block session exit)
    run_reflection_async "$TRANSCRIPT_PATH"

    # Always approve
    echo "$approve_response"
    exit 0
}

main
