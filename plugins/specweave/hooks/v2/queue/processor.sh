#!/bin/bash
# processor.sh - Background event processor with EDA routing
# Processes queued events asynchronously, routes to specialized handlers
#
# Usage: processor.sh [--daemon]
#
# Event routing:
# - increment.created/done/archived/reopened -> living-specs-handler
# - user-story.completed/reopened -> status-line-handler
# - task.updated/spec.updated -> living-docs-handler (legacy)
#
# Self-terminates after 60s of idle
#
# IMPORTANT: Uses cross-platform locking (mkdir is atomic on all POSIX systems)
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

DAEMON_MODE=false
[[ "$1" == "--daemon" ]] && DAEMON_MODE=true

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

QUEUE_DIR="$PROJECT_ROOT/.specweave/state/event-queue"
HANDLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../handlers" && pwd)"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/processor.log"
PID_FILE="$PROJECT_ROOT/.specweave/state/.processor.pid"
LOCK_DIR="$PROJECT_ROOT/.specweave/state/.processor.lock.d"
IDLE_TIMEOUT=60  # Increased from 30s to 60s
IDLE_COUNT=0
HANDLER_TIMEOUT=30  # Max time per handler call
STALE_LOCK_SECONDS=300  # Consider lock stale after 5 minutes

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
mkdir -p "$QUEUE_DIR" 2>/dev/null

# Cross-platform atomic lock using mkdir
# mkdir is atomic on all POSIX systems (Linux, macOS, BSD)
acquire_lock() {
  # Try to create lock directory (atomic operation)
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo $$ > "$LOCK_DIR/pid"
    return 0
  fi

  # Lock exists - check if stale
  if [[ -f "$LOCK_DIR/pid" ]]; then
    local lock_pid=$(cat "$LOCK_DIR/pid" 2>/dev/null)

    # Check if process is still running
    if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
      return 1  # Lock held by active process
    fi

    # Check if lock is stale (older than STALE_LOCK_SECONDS)
    local lock_age=0
    if [[ "$(uname)" == "Darwin" ]]; then
      lock_age=$(($(date +%s) - $(stat -f %m "$LOCK_DIR/pid" 2>/dev/null || echo 0)))
    else
      lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_DIR/pid" 2>/dev/null || echo 0)))
    fi

    if [[ $lock_age -gt $STALE_LOCK_SECONDS ]]; then
      # Stale lock - remove and retry
      rm -rf "$LOCK_DIR" 2>/dev/null
      if mkdir "$LOCK_DIR" 2>/dev/null; then
        echo $$ > "$LOCK_DIR/pid"
        return 0
      fi
    fi
  fi

  return 1  # Failed to acquire lock
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null
  rm -f "$PID_FILE" 2>/dev/null
}

# Try to acquire lock
if ! acquire_lock; then
  exit 0  # Another processor is running
fi

# Double-check PID file for extra safety (legacy compatibility)
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    release_lock
    exit 0  # Already running
  fi
fi
echo $$ > "$PID_FILE"
trap 'release_lock' EXIT

log() { echo "[$(date +%H:%M:%S)] $1" >> "$LOG_FILE" 2>/dev/null; }
log "Processor started (PID: $$, IDLE_TIMEOUT: ${IDLE_TIMEOUT}s)"

# Cross-platform timeout function
# Uses GNU timeout, gtimeout (macOS with coreutils), or fallback to no timeout
run_with_timeout() {
  local timeout_secs="$1"
  shift

  # Try GNU timeout (Linux)
  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_secs" "$@" 2>/dev/null || true
    return
  fi

  # Try gtimeout (macOS with brew install coreutils)
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$timeout_secs" "$@" 2>/dev/null || true
    return
  fi

  # Fallback: run without timeout (handlers should be fast anyway)
  # This is safe because handlers have their own error handling
  "$@" 2>/dev/null || true
}

# Run handler with timeout (prevents stuck handlers from blocking queue)
run_handler() {
  local handler="$1"
  local event_type="$2"
  local event_data="$3"

  if [[ -x "$handler" ]]; then
    run_with_timeout "$HANDLER_TIMEOUT" bash "$handler" "$event_type" "$event_data"
  fi
}

process_event() {
  local EVENT_JSON="$1"
  local EVENT_TYPE=$(echo "$EVENT_JSON" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
  local EVENT_DATA=$(echo "$EVENT_JSON" | grep -o '"data":"[^"]*"' | cut -d'"' -f4)

  log "Processing: $EVENT_TYPE ($EVENT_DATA)"

  case "$EVENT_TYPE" in
    # ========================================
    # EDA Event Routing (new architecture)
    # ========================================

    # Lifecycle events -> living-specs-handler
    increment.created|increment.done|increment.archived|increment.reopened)
      run_handler "$HANDLER_DIR/living-specs-handler.sh" "$EVENT_TYPE" "$EVENT_DATA"
      # Also update status line on lifecycle changes
      run_handler "$HANDLER_DIR/status-line-handler.sh" "$EVENT_TYPE" "$EVENT_DATA"
      ;;

    # User story events -> status-line-handler
    user-story.completed|user-story.reopened)
      run_handler "$HANDLER_DIR/status-line-handler.sh" "$EVENT_TYPE" "$EVENT_DATA"
      ;;

    # ========================================
    # Legacy event routing (backward compat)
    # ========================================
    task.updated|spec.updated)
      # Legacy: don't update status line on every task edit
      # That causes race conditions and flickering
      run_handler "$HANDLER_DIR/living-docs-handler.sh" "" "$EVENT_DATA"
      run_handler "$HANDLER_DIR/ac-validation-handler.sh" "" "$EVENT_DATA"
      ;;

    metadata.changed)
      run_handler "$HANDLER_DIR/github-sync-handler.sh" "" "$EVENT_DATA"
      ;;

    *)
      log "Unknown event type: $EVENT_TYPE"
      ;;
  esac
}

# Main loop
while true; do
  EVENT=$(bash "$(dirname "${BASH_SOURCE[0]}")/dequeue.sh" 2>/dev/null)

  if [[ -n "$EVENT" ]]; then
    IDLE_COUNT=0
    process_event "$EVENT"
  else
    IDLE_COUNT=$((IDLE_COUNT + 1))
    if [[ $IDLE_COUNT -ge $IDLE_TIMEOUT ]]; then
      log "Idle timeout (${IDLE_TIMEOUT}s), exiting"
      exit 0
    fi
    sleep 1
  fi

  # In non-daemon mode, exit after 3s of idle (quick processing)
  [[ "$DAEMON_MODE" == "false" ]] && [[ $IDLE_COUNT -ge 3 ]] && exit 0
done
