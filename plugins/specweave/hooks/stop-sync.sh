#!/bin/bash
# stop-sync.sh - Batched external tool sync at session end
#
# NEW ARCHITECTURE (v1.0.148):
# - NO background processor - sync happens at session end
# - Batches all pending events, deduplicates, syncs once per increment
# - Calls project-bridge-handler for universal sync (GitHub/JIRA/ADO)
#
# This runs AFTER stop-reflect.sh and stop-auto.sh in the Stop hook chain.
#
# Design:
# 1. Read pending events from .specweave/state/event-queue/pending.jsonl
# 2. Deduplicate by increment ID (process each increment ONCE)
# 3. Call project-bridge-handler for each unique increment
# 4. Clean up processed events
#
# IMPORTANT: Always returns approve, never blocks session exit

set +e  # Never fail

# Read input from stdin (required by Claude Code)
INPUT=$(cat)

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
QUEUE_DIR="$STATE_DIR/event-queue"
PENDING_FILE="$QUEUE_DIR/pending.jsonl"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/stop-sync.log"
HANDLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/v2/handlers" 2>/dev/null && pwd)"

# Silent approve helper
silent_approve() {
    echo '{"decision":"approve"}'
    exit 0
}

# Not a SpecWeave project
[ ! -d "$PROJECT_ROOT/.specweave" ] && silent_approve

# Create logs directory
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE" 2>/dev/null
}

log "Stop-sync started"

# Check if there are pending events
if [ ! -f "$PENDING_FILE" ] || [ ! -s "$PENDING_FILE" ]; then
    # Also check old-style .event files for migration
    OLD_EVENTS=$(find "$QUEUE_DIR" -name "*.event" 2>/dev/null | head -1)
    if [ -z "$OLD_EVENTS" ]; then
        log "No pending events to sync"
        silent_approve
    fi
fi

# Check if project-bridge-handler exists
BRIDGE_HANDLER="$HANDLER_DIR/project-bridge-handler.sh"
if [ ! -f "$BRIDGE_HANDLER" ]; then
    log "WARN: project-bridge-handler.sh not found at $BRIDGE_HANDLER"
    silent_approve
fi

# Cross-platform timeout wrapper
run_with_timeout() {
    local timeout_secs="$1"
    shift
    if command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_secs" "$@" 2>/dev/null || true
    elif command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_secs" "$@" 2>/dev/null || true
    else
        "$@" 2>/dev/null || true
    fi
}

# ============================================================================
# COLLECT UNIQUE INCREMENTS TO SYNC
# Deduplication: each increment synced only ONCE regardless of event count
# ============================================================================

INCREMENTS_TO_SYNC=""
PROCESSED_FILE="$QUEUE_DIR/.processed-$$"

# Process new-style pending.jsonl
if [ -f "$PENDING_FILE" ] && [ -s "$PENDING_FILE" ]; then
    log "Processing pending.jsonl..."

    # Extract unique increment IDs from pending events
    while IFS= read -r line; do
        [ -z "$line" ] && continue

        # Extract increment ID from event data
        # Format: {"type":"task.updated","data":"0001-feature-name","ts":"..."}
        INC_ID=$(echo "$line" | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | grep -o '^[0-9][0-9][0-9][0-9]-[^:]*' | head -1)

        if [ -n "$INC_ID" ]; then
            # Add to list if not already present
            if ! echo "$INCREMENTS_TO_SYNC" | grep -q "$INC_ID"; then
                INCREMENTS_TO_SYNC="$INCREMENTS_TO_SYNC $INC_ID"
                log "Queued for sync: $INC_ID"
            fi
        fi
    done < "$PENDING_FILE"
fi

# Process old-style .event files (migration path)
# Use nullglob to handle empty glob (no matching files)
shopt -s nullglob
for event_file in "$QUEUE_DIR"/*.event; do
    [ ! -f "$event_file" ] && continue

    # Extract increment ID from event
    INC_ID=$(cat "$event_file" 2>/dev/null | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | grep -o '^[0-9][0-9][0-9][0-9]-[^:]*' | head -1)

    if [ -n "$INC_ID" ]; then
        if ! echo "$INCREMENTS_TO_SYNC" | grep -q "$INC_ID"; then
            INCREMENTS_TO_SYNC="$INCREMENTS_TO_SYNC $INC_ID"
            log "Queued for sync (legacy): $INC_ID"
        fi
    fi

    # Mark for cleanup
    echo "$event_file" >> "$PROCESSED_FILE"
done
shopt -u nullglob  # Restore default glob behavior

# ============================================================================
# SYNC EACH INCREMENT (batched, deduplicated)
# ============================================================================

SYNC_COUNT=0
SYNC_FAILED=0

for INC_ID in $INCREMENTS_TO_SYNC; do
    [ -z "$INC_ID" ] && continue

    log "Syncing increment: $INC_ID"

    # Call project-bridge-handler with generic "sync" event
    # The handler will determine what needs syncing based on current state
    if run_with_timeout 30 bash "$BRIDGE_HANDLER" "increment.sync" "$INC_ID"; then
        SYNC_COUNT=$((SYNC_COUNT + 1))
        log "Sync succeeded: $INC_ID"
    else
        SYNC_FAILED=$((SYNC_FAILED + 1))
        log "Sync failed: $INC_ID"
    fi
done

# ============================================================================
# CLEANUP PROCESSED EVENTS
# ============================================================================

# Clear pending.jsonl (all events processed)
if [ -f "$PENDING_FILE" ]; then
    > "$PENDING_FILE"  # Truncate file
    log "Cleared pending.jsonl"
fi

# Remove old-style .event files
if [ -f "$PROCESSED_FILE" ]; then
    while IFS= read -r event_file; do
        rm -f "$event_file" 2>/dev/null
    done < "$PROCESSED_FILE"
    rm -f "$PROCESSED_FILE"
    log "Cleaned up legacy .event files"
fi

# ============================================================================
# REPORT RESULTS
# ============================================================================

if [ "$SYNC_COUNT" -gt 0 ] || [ "$SYNC_FAILED" -gt 0 ]; then
    log "Sync complete: $SYNC_COUNT succeeded, $SYNC_FAILED failed"

    if [ "$SYNC_FAILED" -gt 0 ]; then
        # Show warning but don't block
        SYNC_MSG="
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔄 EXTERNAL SYNC: $SYNC_COUNT synced, $SYNC_FAILED failed                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Some increments failed to sync to external tools.                          │
│  Check logs: .specweave/logs/stop-sync.log                                  │
│                                                                             │
│  💡 Run /sw-github:sync or /sw-jira:sync manually to retry                 │
└─────────────────────────────────────────────────────────────────────────────┘"

        jq -n \
            --arg decision "approve" \
            --arg reason "External sync completed with $SYNC_FAILED failures" \
            --arg systemMessage "$SYNC_MSG" \
            '{decision: $decision, reason: $reason, systemMessage: $systemMessage}'
        exit 0
    fi
fi

# Silent success
silent_approve
