#!/bin/bash
# enqueue.sh - Add event to queue with deduplication and coalescing
# Usage: enqueue.sh <event_type> <event_data>
#
# Events are coalesced (deduplicated) by type+data hash within 10 second window.
# Events have priorities: lifecycle=1 (highest), user-story=2, other=3 (lowest)
#
# IMPORTANT: This script must be fast (<5ms) and never crash
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

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

# Assign event priority
# Priority 1: Lifecycle events (most important)
# Priority 2: User story events
# Priority 3: Other events
PRIORITY=3
case "$EVENT_TYPE" in
  increment.created|increment.done|increment.archived|increment.reopened)
    PRIORITY=1
    ;;
  user-story.completed|user-story.reopened)
    PRIORITY=2
    ;;
esac

# Coalescing: hash event type + data for deduplication
# Cross-platform md5 (works on macOS and Linux)
if command -v md5 >/dev/null 2>&1; then
  HASH=$(echo "${EVENT_TYPE}:${EVENT_DATA}" | md5 | cut -c1-8)
elif command -v md5sum >/dev/null 2>&1; then
  HASH=$(echo "${EVENT_TYPE}:${EVENT_DATA}" | md5sum | cut -c1-8)
else
  # Fallback: simple hash from type and data
  HASH=$(printf "%s" "${EVENT_TYPE}:${EVENT_DATA}" | cksum | cut -d' ' -f1)
fi

DEDUP_FILE="$QUEUE_DIR/.dedup-$HASH"
DEDUP_TTL=10  # Increased from 5s to 10s for better coalescing

# Coalescing check: skip if same event within TTL
if [[ -f "$DEDUP_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$DEDUP_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$DEDUP_FILE" 2>/dev/null || echo 0)))
  fi
  [[ $AGE -lt $DEDUP_TTL ]] && exit 0
fi
touch "$DEDUP_FILE"

# Enqueue event (atomic write)
# Filename includes priority for priority-ordered processing
TIMESTAMP=$(date +%s%N 2>/dev/null || date +%s)
EVENT_FILE="$QUEUE_DIR/${PRIORITY}-${TIMESTAMP}-${EVENT_TYPE}.event"

# Create event file atomically
TMP_FILE="$EVENT_FILE.tmp.$$"
cat > "$TMP_FILE" << EOF
{"type":"$EVENT_TYPE","data":"$EVENT_DATA","priority":$PRIORITY,"ts":"$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)"}
EOF
mv "$TMP_FILE" "$EVENT_FILE" 2>/dev/null

# Cleanup old dedup files (>30s) - non-blocking
find "$QUEUE_DIR" -name ".dedup-*" -mmin +1 -delete 2>/dev/null &
exit 0
