#!/bin/bash
# dequeue.sh - Get and remove next event from queue
# Usage: dequeue.sh [--peek]
# Returns JSON event or empty if queue is empty
set +e

PEEK=false
[[ "$1" == "--peek" ]] && PEEK=true

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

QUEUE_DIR="$PROJECT_ROOT/.specweave/state/event-queue"
[[ ! -d "$QUEUE_DIR" ]] && exit 0

# Get oldest event file (FIFO)
OLDEST=$(ls -1 "$QUEUE_DIR"/*.event 2>/dev/null | head -1)
[[ -z "$OLDEST" ]] && exit 0

# Output event content
cat "$OLDEST" 2>/dev/null

# Remove if not peeking
[[ "$PEEK" == "false" ]] && rm -f "$OLDEST" 2>/dev/null

exit 0
