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
# IMPORTANT: This script uses flock for safe concurrent access
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
LOCK_FILE="$PROJECT_ROOT/.specweave/state/.processor.lock"
IDLE_TIMEOUT=60  # Increased from 30s to 60s
IDLE_COUNT=0
HANDLER_TIMEOUT=30  # Max time per handler call

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
mkdir -p "$QUEUE_DIR" 2>/dev/null

# Acquire exclusive lock using flock
exec 200>"$LOCK_FILE"
if ! flock -n 200 2>/dev/null; then
  # Another processor is running - exit silently
  exit 0
fi

# Double-check PID file for extra safety
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    exit 0  # Already running
  fi
fi
echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"; flock -u 200 2>/dev/null' EXIT

log() { echo "[$(date +%H:%M:%S)] $1" >> "$LOG_FILE" 2>/dev/null; }
log "Processor started (PID: $$, IDLE_TIMEOUT: ${IDLE_TIMEOUT}s)"

# Run handler with timeout (prevents stuck handlers from blocking queue)
run_handler() {
  local handler="$1"
  local event_type="$2"
  local event_data="$3"

  if [[ -x "$handler" ]]; then
    timeout "$HANDLER_TIMEOUT" bash "$handler" "$event_type" "$event_data" 2>/dev/null || true
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
