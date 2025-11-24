#!/bin/bash
# Bulk Operation Detector (v0.26.0)
#
# Detects bulk edit operations (5+ edits in 10 seconds) and triggers batch mode.
# Part of ADR-0130: Hook Bulk Operation Detection and Batching
#
# Usage:
#   source bulk-operation-detector.sh
#   BULK_STATUS=$(detect_bulk_operation "$INCREMENT_ID")
#
#   if [ "$BULK_STATUS" = "BULK_MODE_DETECTED" ]; then
#     # Skip individual hook, batch job will run later
#     exit 0
#   fi

# Configuration
BULK_THRESHOLD=${SPECWEAVE_BULK_THRESHOLD:-5}      # 5+ operations = bulk mode
BULK_WINDOW=${SPECWEAVE_BULK_WINDOW:-10}            # seconds
IDLE_DELAY=${SPECWEAVE_IDLE_DELAY:-5}               # seconds before batch execution

# State files
STATE_DIR="$PROJECT_ROOT/.specweave/state"
OPERATION_COUNTER="$STATE_DIR/.hook-operation-counter"
OPERATION_TIMESTAMP="$STATE_DIR/.hook-operation-timestamp"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

##
# Detect bulk operation
#
# Uses sliding window counter to detect operation bursts:
# - Counts operations within BULK_WINDOW (10 seconds)
# - If count >= BULK_THRESHOLD (5 operations) → bulk mode
# - Resets counter after idle period
#
# Args:
#   $1 - INCREMENT_ID (optional, for logging)
#
# Returns:
#   BULK_MODE_DETECTED - Bulk operation detected, skip individual hook
#   SINGLE_OPERATION   - Single operation, run hook normally
##
detect_bulk_operation() {
  local INCREMENT_ID="${1:-unknown}"
  local CURRENT_TIME=$(date +%s)

  # Read existing counter and timestamp
  local RECENT_OPS=0
  local LAST_OP_TIME=0

  if [ -f "$OPERATION_COUNTER" ]; then
    RECENT_OPS=$(cat "$OPERATION_COUNTER" 2>/dev/null || echo 0)
  fi

  if [ -f "$OPERATION_TIMESTAMP" ]; then
    LAST_OP_TIME=$(cat "$OPERATION_TIMESTAMP" 2>/dev/null || echo 0)
  fi

  # Reset counter if outside window (idle period detected)
  local TIME_SINCE_LAST_OP=$((CURRENT_TIME - LAST_OP_TIME))
  if (( TIME_SINCE_LAST_OP > BULK_WINDOW )); then
    RECENT_OPS=0
  fi

  # Increment operation counter
  RECENT_OPS=$((RECENT_OPS + 1))

  # Write atomically (use temp file + rename for atomicity)
  echo "$RECENT_OPS" > "${OPERATION_COUNTER}.tmp"
  mv "${OPERATION_COUNTER}.tmp" "$OPERATION_COUNTER"

  echo "$CURRENT_TIME" > "${OPERATION_TIMESTAMP}.tmp"
  mv "${OPERATION_TIMESTAMP}.tmp" "$OPERATION_TIMESTAMP"

  # Bulk operation detected?
  if (( RECENT_OPS >= BULK_THRESHOLD )); then
    # Log bulk mode activation
    local DEBUG_LOG="$PROJECT_ROOT/.specweave/logs/hook-debug.log"
    echo "[$(date)] [BULK] Detected bulk operation for $INCREMENT_ID (op #$RECENT_OPS)" >> "$DEBUG_LOG" 2>/dev/null || true

    # Schedule batch job (if not already scheduled)
    schedule_batch_job "$INCREMENT_ID"

    echo "BULK_MODE_DETECTED"
    return 0
  fi

  # Single operation
  echo "SINGLE_OPERATION"
  return 0
}

##
# Schedule batch job
#
# Schedules a batch job to run after idle period (IDLE_DELAY seconds).
# If a batch job is already scheduled, it gets canceled and rescheduled.
#
# Args:
#   $1 - INCREMENT_ID
##
schedule_batch_job() {
  local INCREMENT_ID="$1"
  local BATCH_LOCK="$STATE_DIR/.batch-job-${INCREMENT_ID}.lock"
  local DEBUG_LOG="$PROJECT_ROOT/.specweave/logs/hook-debug.log"

  # Cancel existing batch job (if any)
  if [ -f "$BATCH_LOCK" ]; then
    local OLD_PID=$(cat "$BATCH_LOCK" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      kill "$OLD_PID" 2>/dev/null || true
      echo "[$(date)] [BATCH] Canceled previous batch job (PID: $OLD_PID)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
    rm -f "$BATCH_LOCK"
  fi

  # Schedule new batch job (background process)
  (
    # Wait for idle period
    sleep "$IDLE_DELAY"

    # If operation counter still exists → run batched hook
    if [ -f "$OPERATION_COUNTER" ]; then
      local OPERATION_COUNT=$(cat "$OPERATION_COUNTER" 2>/dev/null || echo 0)

      echo "[$(date)] [BATCH] Idle period detected, running batch job for $INCREMENT_ID ($OPERATION_COUNT ops)" >> "$DEBUG_LOG" 2>/dev/null || true

      # Clear operation counter (batch job starting)
      rm -f "$OPERATION_COUNTER" "$OPERATION_TIMESTAMP"

      # Run consolidated hook in batch mode
      bash "$PROJECT_ROOT/plugins/specweave/hooks/post-task-completion.sh" \
        --batch-mode \
        --increment "$INCREMENT_ID" \
        >> "$PROJECT_ROOT/.specweave/logs/batch-jobs.log" 2>&1

      echo "[$(date)] [BATCH] ✅ Batch job completed for $INCREMENT_ID" >> "$DEBUG_LOG" 2>/dev/null || true
    else
      echo "[$(date)] [BATCH] Operation counter cleared before batch job ran (duplicate batch?)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi

    # Cleanup batch lock
    rm -f "$BATCH_LOCK"
  ) &

  # Save PID for cancellation
  local BATCH_PID=$!
  echo "$BATCH_PID" > "$BATCH_LOCK"

  echo "[$(date)] [BATCH] Scheduled batch job for $INCREMENT_ID (PID: $BATCH_PID, delay: ${IDLE_DELAY}s)" >> "$DEBUG_LOG" 2>/dev/null || true
}

##
# Reset bulk operation counter
#
# Manually resets the operation counter (useful for testing or troubleshooting).
##
reset_bulk_counter() {
  rm -f "$OPERATION_COUNTER" "$OPERATION_TIMESTAMP"
  echo "[$(date)] [BULK] Operation counter reset" >> "$PROJECT_ROOT/.specweave/logs/hook-debug.log" 2>/dev/null || true
}

# Export functions for use in hooks
export -f detect_bulk_operation
export -f schedule_batch_job
export -f reset_bulk_counter
