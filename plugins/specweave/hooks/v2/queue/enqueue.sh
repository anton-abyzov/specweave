#!/bin/bash
# enqueue.sh - Add event to queue with deduplication
# Usage: enqueue.sh <event_type> <event_data>
# Events are deduplicated by type+data hash within 5 second window
set +e

EVENT_TYPE="${1:-unknown}"
EVENT_DATA="${2:-}"

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

QUEUE_DIR="$PROJECT_ROOT/.specweave/state/event-queue"
mkdir -p "$QUEUE_DIR" 2>/dev/null || exit 0

# Deduplication: hash event type + data
HASH=$(echo "${EVENT_TYPE}:${EVENT_DATA}" | md5 | cut -c1-8)
DEDUP_FILE="$QUEUE_DIR/.dedup-$HASH"
DEDUP_TTL=5

# Check if duplicate (within TTL)
if [[ -f "$DEDUP_FILE" ]]; then
  AGE=$(($(date +%s) - $(stat -f %m "$DEDUP_FILE" 2>/dev/null || echo 0)))
  [[ $AGE -lt $DEDUP_TTL ]] && exit 0
fi
touch "$DEDUP_FILE"

# Enqueue event (atomic write)
TIMESTAMP=$(date +%s%N)
EVENT_FILE="$QUEUE_DIR/${TIMESTAMP}-${EVENT_TYPE}.event"
cat > "$EVENT_FILE" << EOF
{"type":"$EVENT_TYPE","data":"$EVENT_DATA","ts":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF

# Cleanup old dedup files (>30s)
find "$QUEUE_DIR" -name ".dedup-*" -mmin +1 -delete 2>/dev/null &
exit 0
