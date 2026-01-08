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
# v4.1: Supports both plain text and JSONL (Claude Code) transcript formats
has_reflection_signals() {
    local transcript="$1"

    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        return 1
    fi

    # Pattern for correction/approval detection
    local SIGNAL_PATTERN="(No, don't|No, use|Wrong[,!]|That's incorrect|Always use|Never use|The correct way|Perfect!|That's right|That's correct|Exactly!|Well done)"

    # Check file extension and content type
    if [[ "$transcript" == *.jsonl ]] || head -1 "$transcript" 2>/dev/null | grep -q '^{'; then
        # JSONL format (Claude Code transcripts)
        # Extract user message text content and search for signals
        # Only look at user messages (role: user) to catch corrections
        if jq -r 'select(.message.role == "user") | .message.content[]? | select(.text) | .text' "$transcript" 2>/dev/null | \
           grep -qiE "$SIGNAL_PATTERN"; then
            return 0
        fi
    else
        # Plain text format (fallback)
        if grep -qiE "$SIGNAL_PATTERN" "$transcript" 2>/dev/null; then
            return 0
        fi
    fi

    return 1
}

# Queue reflection for async processing
# Following Ralph plugin best practice: Don't spawn background processes in hooks
# Instead, queue work and let external processor handle it (session-start hook or cron)
queue_reflection() {
    local transcript="$1"
    local queue_file="$STATE_DIR/reflect-queue.jsonl"

    # ============================================
    # PRE-FLIGHT VALIDATION (prevents silent failures)
    # Following ADR-0189: validate BEFORE queueing
    # ============================================

    # Check 1: Reflect script exists and has valid syntax
    local reflect_script="$SCRIPT_DIR/../scripts/reflect.sh"
    if [ ! -f "$reflect_script" ]; then
        log_reflect "error" "Reflect script not found: $reflect_script"
        return 1
    fi

    if ! bash -n "$reflect_script" 2>/dev/null; then
        log_reflect "error" "Reflect script has syntax errors - reflection disabled"
        log_reflect "error" "Run 'bash -n $reflect_script' to see errors"
        return 1
    fi

    # Check 2: Transcript is readable
    if [ ! -r "$transcript" ]; then
        log_reflect "warn" "Transcript not readable: $transcript"
        return 1
    fi

    # Check 3: jq is available (required for config parsing)
    if ! command -v jq >/dev/null 2>&1; then
        log_reflect "error" "jq not found - cannot parse reflect config"
        return 1
    fi

    # ============================================
    # QUEUE WORK (non-blocking, fast)
    # ============================================

    # Get config values
    local confidence=$(jq -r '.confidenceThreshold // "medium"' "$REFLECT_CONFIG" 2>/dev/null || echo "medium")
    local max_learnings=$(jq -r '.maxLearningsPerSession // 10' "$REFLECT_CONFIG" 2>/dev/null || echo "10")
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)

    # Create queue entry (JSONL format for atomic append)
    # v4.1: Validate JSON before writing to prevent corruption
    local queue_entry=$(jq -n -c \
        --arg transcript "$transcript" \
        --arg confidence "$confidence" \
        --arg max "$max_learnings" \
        --arg ts "$timestamp" \
        --arg status "queued" \
        '{
            transcript: $transcript,
            confidence: $confidence,
            maxLearnings: $max,
            queuedAt: $ts,
            status: $status
        }')

    # Validate the generated JSON before writing
    if ! echo "$queue_entry" | jq empty 2>/dev/null; then
        log_reflect "error" "Failed to create valid JSON queue entry"
        return 1
    fi

    # Use a temporary file and atomic move to prevent partial writes
    local temp_queue="${queue_file}.tmp.$$"
    if [ -f "$queue_file" ]; then
        cp "$queue_file" "$temp_queue" 2>/dev/null || true
    fi
    echo "$queue_entry" >> "$temp_queue" 2>/dev/null || {
        log_reflect "error" "Failed to write to temp queue file"
        rm -f "$temp_queue"
        return 1
    }
    mv "$temp_queue" "$queue_file" 2>/dev/null || {
        log_reflect "error" "Failed to atomically update queue file: $queue_file"
        rm -f "$temp_queue"
        return 1
    }

    log_reflect "info" "Reflection queued for async processing (transcript: $transcript)"

    # ============================================
    # IMMEDIATE PROCESSING ATTEMPT
    # ============================================
    # Try to process immediately via detached process (fire-and-forget)
    # If this fails, session-start hook will pick it up next time

    (
        # Double-fork pattern: Parent exits immediately, child is reparented to init
        # This prevents zombie processes and ensures clean detachment
        nohup bash "$SCRIPT_DIR/process-reflect-queue.sh" \
            >> "$LOGS_DIR/queue-processor.log" 2>&1 &
    ) &

    # Disown to prevent job control messages
    disown 2>/dev/null || true

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

    # Queue reflection for async processing (don't block session exit)
    queue_reflection "$TRANSCRIPT_PATH"

    # Always approve - session can exit immediately
    echo "$approve_response"
    exit 0
}

main
