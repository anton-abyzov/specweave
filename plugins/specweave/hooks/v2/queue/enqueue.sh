#!/bin/bash
# enqueue.sh - Add event to queue (v1.0.148 - simplified)
# Usage: enqueue.sh <event_type> <event_data>
#
# v1.0.148: Writes to pending.jsonl (processed by stop-sync.sh at session end)
# Events are coalesced (deduplicated) by type+data hash within 10 second window.
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
PENDING_FILE="$QUEUE_DIR/pending.jsonl"
mkdir -p "$QUEUE_DIR" 2>/dev/null || exit 0

# ============================================================================
# DEDUPLICATION: Skip if same event within 10s window
# ============================================================================

# Cross-platform md5 (works on macOS, Linux, Windows Git Bash)
if command -v md5 >/dev/null 2>&1; then
  HASH=$(echo "${EVENT_TYPE}:${EVENT_DATA}" | md5 | cut -c1-8)
elif command -v md5sum >/dev/null 2>&1; then
  HASH=$(echo "${EVENT_TYPE}:${EVENT_DATA}" | md5sum | cut -c1-8)
else
  # Fallback: simple hash from type and data
  HASH=$(printf "%s" "${EVENT_TYPE}:${EVENT_DATA}" | cksum | cut -d' ' -f1)
fi

DEDUP_FILE="$QUEUE_DIR/.dedup-$HASH"
DEDUP_TTL=10  # 10 second deduplication window

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

# ============================================================================
# ENQUEUE: Append to pending.jsonl (atomic via temp file)
# ============================================================================

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
EVENT_JSON="{\"type\":\"$EVENT_TYPE\",\"data\":\"$EVENT_DATA\",\"ts\":\"$TIMESTAMP\",\"hash\":\"$HASH\"}"

# Atomic append: write to temp, then append and rename
# This prevents partial writes if process is killed
TMP_FILE="$QUEUE_DIR/.pending-$$.tmp"
{
  [[ -f "$PENDING_FILE" ]] && cat "$PENDING_FILE"
  echo "$EVENT_JSON"
} > "$TMP_FILE" 2>/dev/null

mv "$TMP_FILE" "$PENDING_FILE" 2>/dev/null || {
  # Fallback: direct append (less safe but usually works)
  echo "$EVENT_JSON" >> "$PENDING_FILE" 2>/dev/null
  rm -f "$TMP_FILE" 2>/dev/null
}

# ============================================================================
# CLEANUP: Remove old dedup files (>1 minute) - non-blocking background
# ============================================================================

find "$QUEUE_DIR" -name ".dedup-*" -mmin +1 -delete 2>/dev/null &
exit 0
