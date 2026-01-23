#!/bin/bash
# cleanup-legacy-state.sh - Remove old processor state files (v1.0.148 migration)
#
# Cleans up legacy files from the deprecated background processor:
# - .processor.pid (old PID file)
# - .processor.lock.d (old lock directory)
# - *.event files (old event format, replaced by pending.jsonl)
# - .dedup-* files older than 1 minute
#
# This script runs on session start and is idempotent (safe to run multiple times)
#
# IMPORTANT: Always returns success, never blocks session start
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"
QUEUE_DIR="$STATE_DIR/event-queue"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/cleanup.log"

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE" 2>/dev/null
}

CLEANED=0

# ============================================================================
# CLEANUP OLD PROCESSOR FILES (v1.0.148 - Processor removed)
# ============================================================================

# Remove old processor PID file
if [[ -f "$STATE_DIR/.processor.pid" ]]; then
  rm -f "$STATE_DIR/.processor.pid" 2>/dev/null
  log "Removed legacy .processor.pid"
  CLEANED=$((CLEANED + 1))
fi

# Remove old processor lock directory
if [[ -d "$STATE_DIR/.processor.lock.d" ]]; then
  rmdir "$STATE_DIR/.processor.lock.d" 2>/dev/null || rm -rf "$STATE_DIR/.processor.lock.d" 2>/dev/null
  log "Removed legacy .processor.lock.d"
  CLEANED=$((CLEANED + 1))
fi

# Remove old .event files (replaced by pending.jsonl)
if [[ -d "$QUEUE_DIR" ]]; then
  EVENT_COUNT=$(find "$QUEUE_DIR" -name "*.event" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$EVENT_COUNT" -gt 0 ]]; then
    rm -f "$QUEUE_DIR"/*.event 2>/dev/null
    log "Removed $EVENT_COUNT legacy .event files"
    CLEANED=$((CLEANED + EVENT_COUNT))
  fi
fi

# Remove stale dedup files (older than 1 minute)
if [[ -d "$QUEUE_DIR" ]]; then
  find "$QUEUE_DIR" -name ".dedup-*" -mmin +1 -delete 2>/dev/null
fi

# Remove old project-bridge throttle files (older than 5 minutes)
find "$STATE_DIR" -name ".project-bridge-*" -mmin +5 -delete 2>/dev/null

# ============================================================================
# SUMMARY
# ============================================================================

if [[ "$CLEANED" -gt 0 ]]; then
  log "Legacy state cleanup: removed $CLEANED files"
fi

exit 0
