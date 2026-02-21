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

# Project root detection (walk up to find .specweave/ — prevents pollution of subdirectories)
if [[ -n "${PROJECT_ROOT:-}" ]] && [[ -d "$PROJECT_ROOT/.specweave" ]]; then
    : # env var already set and valid
else
    PROJECT_ROOT="$PWD"
    while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
        PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
    done
fi

# Silent approve helper
silent_approve() {
    echo '{"decision":"approve"}'
    exit 0
}

# Not a SpecWeave project — approve and exit (MUST be before any mkdir)
[ ! -d "$PROJECT_ROOT/.specweave" ] && silent_approve

STATE_DIR="$PROJECT_ROOT/.specweave/state"
QUEUE_DIR="$STATE_DIR/event-queue"
PENDING_FILE="$QUEUE_DIR/pending.jsonl"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/stop-sync.log"
HANDLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/v2/handlers" 2>/dev/null && pwd)"

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
# FIXED (v1.0.302): Don't suppress stderr from inner commands
run_with_timeout() {
    local timeout_secs="$1"
    shift
    if command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_secs" "$@" || true
    elif command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_secs" "$@" || true
    else
        "$@" || true
    fi
}

# ============================================================================
# COLLECT UNIQUE INCREMENTS TO SYNC
# Deduplication: each increment synced only ONCE regardless of event count
# ============================================================================

INCREMENTS_TO_SYNC=""
PROCESSED_FILE="$QUEUE_DIR/.processed-$$"
EVENT_TYPES_FILE="$QUEUE_DIR/.event-types-$$"
> "$EVENT_TYPES_FILE" 2>/dev/null || true

# Process new-style pending.jsonl
if [ -f "$PENDING_FILE" ] && [ -s "$PENDING_FILE" ]; then
    log "Processing pending.jsonl..."

    # Extract unique increment IDs and track event types
    while IFS= read -r line; do
        [ -z "$line" ] && continue

        # Extract increment ID from event data
        # Format: {"type":"task.updated","data":"0001-feature-name","ts":"..."}
        INC_ID=$(echo "$line" | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | grep -o '^[0-9][0-9][0-9][0-9]-[^:]*' | head -1)
        EVENT_TYPE=$(echo "$line" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$INC_ID" ]; then
            # Add to list if not already present
            if ! echo "$INCREMENTS_TO_SYNC" | grep -q "$INC_ID"; then
                INCREMENTS_TO_SYNC="$INCREMENTS_TO_SYNC $INC_ID"
                log "Queued for sync: $INC_ID"
            fi
            # Track event type for this increment
            if [ -n "$EVENT_TYPE" ]; then
                echo "${INC_ID}|${EVENT_TYPE}" >> "$EVENT_TYPES_FILE" 2>/dev/null
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

# Determine best event type for an increment from queued events
# Priority: done > created > user-story.completed > reopened > user-story.reopened > sync (catch-all)
get_best_event_type() {
    local inc_id="$1"
    if [ -f "$EVENT_TYPES_FILE" ]; then
        if grep -q "^${inc_id}|increment\.done$" "$EVENT_TYPES_FILE" 2>/dev/null; then
            echo "increment.done"
        elif grep -q "^${inc_id}|increment\.created$" "$EVENT_TYPES_FILE" 2>/dev/null; then
            echo "increment.created"
        elif grep -q "^${inc_id}|user-story\.completed$" "$EVENT_TYPES_FILE" 2>/dev/null; then
            echo "user-story.completed"
        elif grep -q "^${inc_id}|increment\.reopened$" "$EVENT_TYPES_FILE" 2>/dev/null; then
            echo "increment.reopened"
        elif grep -q "^${inc_id}|user-story\.reopened$" "$EVENT_TYPES_FILE" 2>/dev/null; then
            echo "user-story.reopened"
        else
            echo "increment.sync"
        fi
    else
        echo "increment.sync"
    fi
}

# Resolve github-sync-handler path (for user-story event routing)
GITHUB_SYNC_HANDLER="$HANDLER_DIR/github-sync-handler.sh"

for INC_ID in $INCREMENTS_TO_SYNC; do
    [ -z "$INC_ID" ] && continue

    # Preserve original event type from pending.jsonl (best priority wins)
    EVENT_TYPE=$(get_best_event_type "$INC_ID")
    log "Syncing increment: $INC_ID (event: $EVENT_TYPE)"

    if run_with_timeout 30 bash "$BRIDGE_HANDLER" "$EVENT_TYPE" "$INC_ID"; then
        SYNC_COUNT=$((SYNC_COUNT + 1))
        log "Sync succeeded: $INC_ID"
    else
        SYNC_FAILED=$((SYNC_FAILED + 1))
        log "Sync failed: $INC_ID"
    fi

    # Route user-story events to github-sync-handler (v1.0.262+)
    # github-sync-handler understands user-story.completed/reopened with INC_ID:US_ID data
    # FIXED (v1.0.302): Filter by BOTH event type AND increment ID to prevent
    # routing all events to the first matching increment's US event.
    if [ -f "$GITHUB_SYNC_HANDLER" ] && [ -f "$EVENT_TYPES_FILE" ]; then
        while IFS='|' read -r _inc_id us_event_type; do
            [ -z "$us_event_type" ] && continue
            # Extract US data (INC_ID:US_ID) from pending.jsonl for THIS increment
            # Must match both the event type AND the increment ID in the data field
            US_DATA=$(grep "\"type\":\"${us_event_type}\"" "$PENDING_FILE" 2>/dev/null \
                | grep "\"data\":\"${INC_ID}:" \
                | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | head -1)
            if [ -n "$US_DATA" ]; then
                log "Routing user-story event to github-sync-handler: $us_event_type $US_DATA"
                run_with_timeout 30 bash "$GITHUB_SYNC_HANDLER" "$us_event_type" "$US_DATA"
            fi
        done < <(grep "^${INC_ID}|user-story\." "$EVENT_TYPES_FILE" 2>/dev/null | sort -u)
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

# Clean up event-types temp file
rm -f "$EVENT_TYPES_FILE" 2>/dev/null

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
