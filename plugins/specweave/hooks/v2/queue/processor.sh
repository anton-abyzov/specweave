#!/bin/bash
# processor.sh - Background event processor
# Processes queued events asynchronously, routes to handlers
# Usage: processor.sh [--daemon]
# Self-terminates after 30s of idle
set +e

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
IDLE_TIMEOUT=30
IDLE_COUNT=0

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

# Check if already running
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  if kill -0 "$OLD_PID" 2>/dev/null; then
    exit 0  # Already running
  fi
fi
echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT

log() { echo "[$(date +%H:%M:%S)] $1" >> "$LOG_FILE" 2>/dev/null; }
log "Processor started (PID: $$)"

process_event() {
  local EVENT_JSON="$1"
  local EVENT_TYPE=$(echo "$EVENT_JSON" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
  local EVENT_DATA=$(echo "$EVENT_JSON" | grep -o '"data":"[^"]*"' | cut -d'"' -f4)

  log "Processing: $EVENT_TYPE ($EVENT_DATA)"

  case "$EVENT_TYPE" in
    task.updated|spec.updated)
      bash "$HANDLER_DIR/living-docs-handler.sh" "$EVENT_DATA" 2>/dev/null
      bash "$HANDLER_DIR/ac-validation-handler.sh" "$EVENT_DATA" 2>/dev/null
      ;;
    metadata.changed)
      bash "$HANDLER_DIR/github-sync-handler.sh" "$EVENT_DATA" 2>/dev/null
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
    [[ $IDLE_COUNT -ge $IDLE_TIMEOUT ]] && { log "Idle timeout, exiting"; exit 0; }
    sleep 1
  fi

  [[ "$DAEMON_MODE" == "false" ]] && [[ $IDLE_COUNT -ge 3 ]] && exit 0
done
