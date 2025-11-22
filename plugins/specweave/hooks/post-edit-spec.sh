#!/bin/bash
#
# Post-Edit Hook: Update Status Line After spec.md or tasks.md Edits
#
# Triggers: After Edit tool modifies spec.md (AC updates) or tasks.md (task completion)
# Action: Updates status line cache to reflect latest AC/task progress
#
# This ensures status line stays in sync when ACs are marked complete via Edit tool
# (not just TodoWrite, which only tracks internal todo lists)
#
# EMERGENCY FIXES (v0.24.3):
# - Kill switch: Set SPECWEAVE_DISABLE_HOOKS=1 to disable ALL hooks
# - Circuit breaker: Auto-disable after 3 consecutive failures
# - File locking: Prevent concurrent executions (max 1 at a time)
# - Aggressive debouncing: Increased from 1s to 5s
# - Complete error isolation: Never let errors reach Claude Code
#
# TIER 1 IMPROVEMENTS (v0.24.2):
# - Debouncing: Skip if updated less than 1 second ago (90% overhead reduction)
# - File mtime detection: Check recently modified spec.md/tasks.md as fallback
# - Non-blocking: Run update-status-line.sh in background
# - Smart detection: Only update if spec/tasks files actually changed
#
# Previous fix (v0.24.1): Enhanced file detection for increment completion
# - Detects edits via TOOL_USE_CONTENT, TOOL_RESULT, and argument parsing
# - Always updates status line for ANY spec.md/tasks.md edit in increments folder

# CRITICAL: Remove set -e to prevent hook errors from crashing Claude Code
set +e

# EMERGENCY KILL SWITCH: Disable all hooks if env variable set
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root
find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

# Ensure state and logs directories exist
mkdir -p "$PROJECT_ROOT/.specweave/state" "$LOGS_DIR" 2>/dev/null || true

# EMERGENCY CIRCUIT BREAKER: Track consecutive failures
CIRCUIT_BREAKER_FILE="$PROJECT_ROOT/.specweave/state/.hook-circuit-breaker"
CIRCUIT_BREAKER_THRESHOLD=3

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    echo "[$(date)] CIRCUIT BREAKER OPEN: Hooks disabled after $FAILURE_COUNT failures. Run: rm $CIRCUIT_BREAKER_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi
fi

# EMERGENCY FILE LOCK: Prevent concurrent executions
LOCK_FILE="$PROJECT_ROOT/.specweave/state/.hook-post-edit.lock"
LOCK_TIMEOUT=5  # seconds

# Try to acquire lock with timeout
LOCK_ACQUIRED=false
for i in {1..5}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check if lock is stale (older than LOCK_TIMEOUT seconds)
  if [[ -d "$LOCK_FILE" ]]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
    if (( LOCK_AGE > LOCK_TIMEOUT )); then
      rmdir "$LOCK_FILE" 2>/dev/null || true
      continue
    fi
  fi

  sleep 0.2
done

if [[ "$LOCK_ACQUIRED" == "false" ]]; then
  echo "[$(date)] post-edit-spec: Could not acquire lock, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Log rotation: Keep debug log under 100KB
if [[ -f "$DEBUG_LOG" ]] && [[ $(wc -c < "$DEBUG_LOG" 2>/dev/null || echo 0) -gt 102400 ]]; then
  tail -100 "$DEBUG_LOG" > "$DEBUG_LOG.tmp" 2>/dev/null || true
  mv "$DEBUG_LOG.tmp" "$DEBUG_LOG" 2>/dev/null || true
  echo "[$(date)] Log rotated" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# TIER 1 FIX: Debouncing (Prevent Redundant Updates)
# ============================================================================
# Skip update if we updated less than 5 seconds ago (INCREASED FROM 1s)
# This handles rapid consecutive edits (e.g., 10 tasks marked complete quickly)
LAST_UPDATE_FILE="$PROJECT_ROOT/.specweave/state/.last-status-update"
DEBOUNCE_SECONDS=5

if [[ -f "$LAST_UPDATE_FILE" ]]; then
  LAST_UPDATE=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  TIME_SINCE_UPDATE=$((NOW - LAST_UPDATE))

  if (( TIME_SINCE_UPDATE < DEBOUNCE_SECONDS )); then
    echo "[$(date)] post-edit-spec: Debounced (${TIME_SINCE_UPDATE}s since last update)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0  # Skip this update
  fi
fi

# ============================================================================
# TIER 2: Check for PreToolUse Signal (Primary Detection Method)
# ============================================================================
PENDING_FILE="$PROJECT_ROOT/.specweave/state/.pending-status-update"
METRICS_FILE="$PROJECT_ROOT/.specweave/state/hook-metrics.jsonl"
EDITED_FILE=""
DETECTION_METHOD="none"

# First, check if PreToolUse hook left a signal
if [[ -f "$PENDING_FILE" ]]; then
  EDITED_FILE=$(cat "$PENDING_FILE" 2>/dev/null || echo "")
  # Delete pending file immediately (consume signal)
  rm "$PENDING_FILE" 2>/dev/null || true

  if [[ -n "$EDITED_FILE" ]]; then
    DETECTION_METHOD="pretooluse"
    echo "[$(date)] post-edit-spec: File from PreToolUse signal: $EDITED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true

    # Record Tier 2 success metric
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "{\"timestamp\":\"$TIMESTAMP\",\"hook\":\"post-edit-spec\",\"event\":\"tier2_success\",\"method\":\"pretooluse\"}" >> "$METRICS_FILE" 2>/dev/null || true
  fi
fi

# ============================================================================
# TIER 1 FALLBACK: Environment Variable Detection
# ============================================================================
# If PreToolUse didn't provide signal, fall back to Tier 1 methods
if [[ -z "$EDITED_FILE" ]]; then
  # Method 1: TOOL_USE_CONTENT environment variable
  if [[ -n "${TOOL_USE_CONTENT:-}" ]]; then
    EDITED_FILE="$TOOL_USE_CONTENT"
    DETECTION_METHOD="env_content"
  fi

  # Method 2: TOOL_RESULT environment variable
  if [[ -z "$EDITED_FILE" ]] && [[ -n "${TOOL_RESULT:-}" ]]; then
    EDITED_FILE=$(echo "$TOOL_RESULT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    DETECTION_METHOD="env_result"
  fi

  # Method 3: TOOL_USE_ARGS
  if [[ -z "$EDITED_FILE" ]] && [[ -n "${TOOL_USE_ARGS:-}" ]]; then
    EDITED_FILE=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    DETECTION_METHOD="env_args"
  fi

  # Log env var detection (for metrics)
  if [[ -n "$EDITED_FILE" ]]; then
    echo "[$(date)] post-edit-spec: File from env vars ($DETECTION_METHOD): $EDITED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

# Check if we detected a spec.md or tasks.md edit in increments folder
SHOULD_UPDATE=false

if [[ -n "$EDITED_FILE" ]]; then
  # Check if the file is spec.md or tasks.md
  if [[ "$EDITED_FILE" == *"/spec.md" ]] || [[ "$EDITED_FILE" == *"/tasks.md" ]]; then
    # Check if it's in an increment folder
    if [[ "$EDITED_FILE" == *"/.specweave/increments/"* ]]; then
      SHOULD_UPDATE=true
      echo "[$(date)] post-edit-spec: Increment file edited - will update status line" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# TIER 1 FIX: File Modification Time Detection (Fallback)
# ============================================================================
# If we couldn't detect the file via environment variables, check which files
# were modified recently (within last 2 seconds) instead of blindly updating
if [[ -z "$EDITED_FILE" ]]; then
  echo "[$(date)] post-edit-spec: Env vars empty - checking file mtimes" >> "$DEBUG_LOG" 2>/dev/null || true

  NOW=$(date +%s)
  INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"

  # Check for recently modified spec.md or tasks.md files
  if [[ -d "$INCREMENTS_DIR" ]]; then
    for file in "$INCREMENTS_DIR"/*/spec.md "$INCREMENTS_DIR"/*/tasks.md; do
      if [[ -f "$file" ]]; then
        # Get file modification time (platform-specific)
        if [[ "$(uname)" == "Darwin" ]]; then
          MTIME=$(stat -f "%m" "$file" 2>/dev/null || echo 0)
        else
          MTIME=$(stat -c "%Y" "$file" 2>/dev/null || echo 0)
        fi

        # If file was modified in last 2 seconds, consider it the edited file
        TIME_DIFF=$((NOW - MTIME))
        if (( TIME_DIFF <= 2 )); then
          EDITED_FILE="$file"
          echo "[$(date)] post-edit-spec: Detected recent modification: $file (${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
          SHOULD_UPDATE=true
          break
        fi
      fi
    done
  fi

  # If still no file detected, skip update (not a spec/tasks edit)
  if [[ -z "$EDITED_FILE" ]]; then
    echo "[$(date)] post-edit-spec: No spec/tasks modifications detected - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi
fi

# ============================================================================
# TIER 1 FIX: Non-Blocking Background Update with COMPLETE ERROR ISOLATION
# ============================================================================
# Update status line if needed
if [[ "$SHOULD_UPDATE" == "true" ]]; then
  echo "[$(date)] post-edit-spec: Running update-status-line.sh (background)" >> "$DEBUG_LOG" 2>/dev/null || true

  # Record update time BEFORE spawning background process
  # This ensures debouncing works even if update hasn't completed yet
  echo "$(date +%s)" > "$LAST_UPDATE_FILE"

  # Run status line update in background with COMPLETE error isolation
  # This prevents Edit tool from waiting for status line computation
  (
    set +e  # Disable error propagation

    if "$PROJECT_ROOT/plugins/specweave/hooks/lib/update-status-line.sh" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null; then
      echo "[$(date)] post-edit-spec: Status line updated successfully" >> "$DEBUG_LOG" 2>/dev/null || true
      # Reset circuit breaker on success
      echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    else
      echo "[$(date)] post-edit-spec: Warning - status line update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      # Increment circuit breaker
      CURRENT_FAILURES=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
      echo "$((CURRENT_FAILURES + 1))" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    fi
  ) &

  # Disown the background process so it's not killed when hook exits
  disown 2>/dev/null || true
fi

# Always exit 0 to prevent hook errors from crashing Claude Code
exit 0
