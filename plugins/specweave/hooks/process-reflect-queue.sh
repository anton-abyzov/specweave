#!/bin/bash
# process-reflect-queue.sh - Queue Processor for Async Reflection
#
# Processes queued reflection jobs from reflect-queue.jsonl
# Designed to run detached from the main session (via double-fork pattern)
#
# Features:
# - Lock-based concurrency control (only one processor at a time)
# - Atomic queue updates (JSONL append-only, then rewrite on completion)
# - Graceful degradation (failures don't block queue)
# - Automatic cleanup (removes processed entries)
#
# Usage:
#   bash process-reflect-queue.sh
#
# Called by:
#   - stop-reflect.sh (fire-and-forget immediate processing)
#   - session-start hook (cleanup of stale queue)
#   - Manual: `bash plugins/specweave/hooks/process-reflect-queue.sh`

set +e  # Don't exit on errors - process what we can

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
QUEUE_FILE="$STATE_DIR/reflect-queue.jsonl"
LOCK_FILE="$STATE_DIR/reflect-queue.lock"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure directories exist
mkdir -p "$STATE_DIR" "$LOGS_DIR" 2>/dev/null || true

# Logging function
log_processor() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
    echo "{\"ts\":\"$timestamp\",\"lvl\":\"$level\",\"msg\":\"$*\"}" >> "$LOGS_DIR/queue-processor.log" 2>/dev/null || true
}

# Acquire lock with timeout
acquire_lock() {
    local timeout=30  # seconds
    local elapsed=0

    while [ -f "$LOCK_FILE" ]; do
        if [ $elapsed -ge $timeout ]; then
            log_processor "warn" "Lock timeout - removing stale lock"
            rm -f "$LOCK_FILE" 2>/dev/null || true
            break
        fi

        sleep 1
        elapsed=$((elapsed + 1))
    done

    # Create lock file with PID
    echo "$$" > "$LOCK_FILE" 2>/dev/null || {
        log_processor "error" "Failed to acquire lock"
        return 1
    }

    return 0
}

# Release lock
release_lock() {
    rm -f "$LOCK_FILE" 2>/dev/null || true
}

# Process a single queue entry
process_entry() {
    local entry="$1"
    local transcript=$(echo "$entry" | jq -r '.transcript')
    local confidence=$(echo "$entry" | jq -r '.confidence // "medium"')
    local max_learnings=$(echo "$entry" | jq -r '.maxLearnings // 10')

    if [ ! -f "$transcript" ]; then
        log_processor "warn" "Transcript not found: $transcript - skipping"
        return 1
    fi

    local reflect_script="$SCRIPT_DIR/../scripts/reflect.sh"

    if [ ! -f "$reflect_script" ]; then
        log_processor "error" "Reflect script not found: $reflect_script"
        return 1
    fi

    log_processor "info" "Processing reflection: transcript=$transcript confidence=$confidence max=$max_learnings"

    # Run reflection
    bash "$reflect_script" reflect \
        --transcript "$transcript" \
        --confidence "$confidence" \
        --max "$max_learnings" \
        >> "$LOGS_DIR/auto-reflect.log" 2>&1

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_processor "info" "Reflection completed successfully"
        return 0
    else
        log_processor "warn" "Reflection exited with code $exit_code"
        return 1
    fi
}

# Main processing loop
main() {
    # Quick exit if no queue file
    if [ ! -f "$QUEUE_FILE" ]; then
        exit 0
    fi

    # Acquire lock
    if ! acquire_lock; then
        log_processor "info" "Another processor is running - exiting"
        exit 0
    fi

    # Ensure lock is released on exit
    trap release_lock EXIT

    # Read queue entries
    local line_num=0
    local processed=0
    local failed=0
    local temp_queue=$(mktemp)

    while IFS= read -r entry; do
        line_num=$((line_num + 1))

        # Skip empty lines
        if [ -z "$entry" ]; then
            continue
        fi

        # Validate JSON
        if ! echo "$entry" | jq empty 2>/dev/null; then
            log_processor "warn" "Invalid JSON at line $line_num - skipping"
            continue
        fi

        # Process entry
        if process_entry "$entry"; then
            processed=$((processed + 1))
        else
            failed=$((failed + 1))
            # Keep failed entries in queue for retry
            echo "$entry" >> "$temp_queue"
        fi

    done < "$QUEUE_FILE"

    # Replace queue with failed entries (successful ones are removed)
    if [ $failed -gt 0 ]; then
        mv "$temp_queue" "$QUEUE_FILE" 2>/dev/null || true
        log_processor "info" "Queue updated: $processed processed, $failed failed (will retry)"
    else
        # All processed successfully - remove queue file
        rm -f "$QUEUE_FILE" "$temp_queue" 2>/dev/null || true
        log_processor "info" "Queue empty: all $processed entries processed successfully"
    fi

    exit 0
}

main
