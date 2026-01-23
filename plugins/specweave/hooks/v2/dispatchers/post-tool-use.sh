#!/bin/bash
# post-tool-use.sh - Single dispatcher for ALL PostToolUse events
#
# v1.0.148+: NEW ARCHITECTURE - No background processor
#
# CRITICAL DESIGN PRINCIPLE:
#   - Tool operations ALWAYS succeed (Edit/Write never blocked by hooks)
#   - All hook errors become visible warnings to user
#   - Logs captured for debugging
#   - Background processes for heavy work
#
# Architecture (v1.0.148 - Simplified):
# - Detectors run asynchronously (don't block tool results)
# - CRITICAL events (increment.done/reopened) sync IMMEDIATELY
# - Other events queued to pending.jsonl for stop-sync.sh (session end)
# - NO background processor daemon
#
# Event flow:
# 1. metadata.json change -> lifecycle-detector -> increment.* events
#    - IF done/reopened: IMMEDIATE sync via project-bridge-handler
#    - ELSE: queued for stop-sync.sh
# 2. tasks.md/spec.md change -> queued for stop-sync.sh (batched at session end)
#
# Goal: Never crash Claude, always exit 0, warn on errors

set +e  # CRITICAL: Never exit on error

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# ============================================================================
# CONSTANTS
# ============================================================================

HOOK_NAME="post-tool-use"
HOOK_VERSION="1.0.148"

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

STATE_DIR="$PROJECT_ROOT/.specweave/state"

# ============================================================================
# LOGGING INFRASTRUCTURE
# ============================================================================

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/post-tool-use.log"
WARNING_LOG="$LOGS_DIR/hook-warnings.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log_debug() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$HOOK_NAME] $*" >> "$DEBUG_LOG" 2>/dev/null || true
}

log_warning() {
  local message="$1"
  local details="${2:-}"

  # Always log to file
  {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING [$HOOK_NAME]: $message"
    [[ -n "$details" ]] && echo "  Details: $details"
  } >> "$WARNING_LOG" 2>/dev/null || true

  # Show to user so they know something went wrong
  echo ""
  echo "  [Hook Warning] $HOOK_NAME: $message"
  [[ -n "$details" ]] && echo "  $details"
  echo "  (Tool operation succeeded - hook issue only)"
  echo ""
}

# ============================================================================
# SAFE EXECUTION HELPERS
# ============================================================================

# Run a hook script safely in background (never blocks, logs errors)
safe_run_background() {
  local script="$1"
  local context="$2"
  shift 2

  if [[ ! -f "$script" ]]; then
    log_debug "Script not found (skipping): $script"
    return 0
  fi

  if [[ ! -x "$script" ]] && [[ ! "$script" == *.sh ]]; then
    log_debug "Script not executable (skipping): $script"
    return 0
  fi

  # Run in background, capture errors to log
  (
    set +e
    local output
    local exit_code

    output=$(bash "$script" "$@" 2>&1)
    exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] BACKGROUND ERROR [$context]: exit $exit_code" >> "$WARNING_LOG" 2>/dev/null || true
      echo "  Output: $output" >> "$WARNING_LOG" 2>/dev/null || true
    fi
  ) &

  return 0
}

# Run a hook script safely in foreground (for sync guards)
safe_run_sync() {
  local script="$1"
  local context="$2"
  local input="$3"

  if [[ ! -f "$script" ]]; then
    log_debug "Script not found (skipping): $script"
    return 0
  fi

  local output
  local exit_code

  # Run with timeout protection (5 second max)
  if command -v gtimeout >/dev/null 2>&1; then
    output=$(echo "$input" | gtimeout --kill-after=2 5 bash "$script" 2>&1)
    exit_code=$?
  elif command -v timeout >/dev/null 2>&1; then
    output=$(echo "$input" | timeout --kill-after=2 5 bash "$script" 2>&1)
    exit_code=$?
  else
    output=$(echo "$input" | bash "$script" 2>&1)
    exit_code=$?
  fi

  # Log errors but don't fail
  if [[ $exit_code -ne 0 ]]; then
    if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 137 ]]; then
      log_warning "Hook timed out: $context" "Script: $script"
    else
      log_debug "Hook exited with code $exit_code: $context"
    fi
  fi

  # Output any non-error output (for status messages, etc.)
  if [[ -n "$output" ]] && [[ "$output" != *"ERROR"* ]] && [[ "$output" != *"error"* ]]; then
    echo "$output"
  fi

  return 0  # Always succeed
}

# ============================================================================
# TASK COMPLETION SOUND (plays when task marked [x])
# ============================================================================

play_task_completion_sound() {
  local tasks_file="$1"
  local state_file="$STATE_DIR/.last-task-completion"
  local session_file="$STATE_DIR/auto-session.json"

  # DISABLED: Sound notifications are disabled by default
  # To re-enable, set SPECWEAVE_SOUND_ENABLED=1 in environment
  if [[ "${SPECWEAVE_SOUND_ENABLED:-0}" != "1" ]]; then
    log_debug "Sound disabled (set SPECWEAVE_SOUND_ENABLED=1 to enable)"
    return 0
  fi

  # CRITICAL: Skip sound if auto mode is active
  # Auto mode has its own completion sound via Stop hook (plays once at END)
  if [[ -f "$session_file" ]]; then
    local auto_status=$(jq -r '.status // "unknown"' "$session_file" 2>/dev/null || echo "unknown")
    if [[ "$auto_status" == "active" ]] || [[ "$auto_status" == "running" ]]; then
      log_debug "Auto mode active - skipping task completion sound (Stop hook will handle it)"
      return 0
    fi
  fi

  # Extract current completion count
  local current_count=$(grep -c '\*\*Status\*\*:.*\[x\]' "$tasks_file" 2>/dev/null || echo "0")

  # Read previous count
  local previous_count="0"
  if [[ -f "$state_file" ]]; then
    previous_count=$(cat "$state_file" 2>/dev/null || echo "0")
  fi

  # If count increased, a task was just completed
  if [[ "$current_count" -gt "$previous_count" ]]; then
    # Save new count
    echo "$current_count" > "$state_file" 2>/dev/null

    # Play completion sound (background, never blocks)
    (
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Glass.aiff for pleasant completion sound
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
      elif command -v paplay >/dev/null 2>&1; then
        # Linux with PulseAudio
        paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &
      elif command -v aplay >/dev/null 2>&1; then
        # Linux with ALSA
        aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null &
      fi
    ) &

    log_debug "Task completion sound played (count: $previous_count → $current_count)"
  fi
}

# ============================================================================
# INPUT PARSING (with safe fallbacks)
# ============================================================================

# Read stdin (tool result JSON) - with safe fallback and timeout
INPUT=""
if command -v gtimeout >/dev/null 2>&1; then
  INPUT=$(gtimeout 1 cat 2>/dev/null || echo '{}')
elif command -v timeout >/dev/null 2>&1; then
  INPUT=$(timeout 1 cat 2>/dev/null || echo '{}')
else
  INPUT=$(cat 2>/dev/null || echo '{}')
fi

# Extract file path (fast grep, no jq required)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
[[ -z "$FILE_PATH" ]] && exit 0

# Extract increment ID from path
INC_ID=$(echo "$FILE_PATH" | grep -o '[0-9][0-9][0-9][0-9]-[^/]*' | head -1)
[[ -z "$INC_ID" ]] && exit 0

log_debug "Processing: $FILE_PATH (increment: $INC_ID)"

# ============================================================================
# SETUP PATHS
# ============================================================================

# Script is at: hooks/v2/dispatchers/post-tool-use.sh
# HOOK_DIR should be: hooks/v2 (one level up from dispatchers)
# PLUGIN_ROOT should be: plugin root (TWO levels up from hooks/v2)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
DETECTOR_DIR="$HOOK_DIR/detectors"
SCRIPTS_DIR="$PLUGIN_ROOT/scripts"

# ============================================================================
# EDA DISPATCHER: Route to detectors based on file type
# All errors become warnings, never block the tool operation
# ============================================================================

case "$FILE_PATH" in
  */.specweave/increments/*/metadata.json)
    log_debug "Metadata change detected"

    # Metadata changed -> check for lifecycle transitions (background)
    safe_run_background "$DETECTOR_DIR/lifecycle-detector.sh" "lifecycle-detector" "$INC_ID"

    # Update dashboard cache (background)
    safe_run_background "$SCRIPTS_DIR/update-dashboard-cache.sh" "dashboard-cache" "$INC_ID" "metadata"

    # ========================================================================
    # IMMEDIATE EXTERNAL SYNC for done/reopened (v1.0.148)
    # ========================================================================
    # Critical events sync IMMEDIATELY - user expects external tools updated
    # Other events batched for session end (stop-sync.sh)
    METADATA_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
    if [[ -f "$METADATA_FILE" ]]; then
      CURRENT_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$METADATA_FILE" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

      if [[ "$CURRENT_STATUS" == "completed" ]] || [[ "$CURRENT_STATUS" == "done" ]] || [[ "$CURRENT_STATUS" == "reopened" ]]; then
        log_debug "IMMEDIATE SYNC: Status is $CURRENT_STATUS - syncing to external tools"
        BRIDGE_HANDLER="$HOOK_DIR/handlers/project-bridge-handler.sh"
        if [[ -f "$BRIDGE_HANDLER" ]]; then
          # Run synchronously but with timeout to not block too long
          (
            if command -v gtimeout >/dev/null 2>&1; then
              gtimeout 15 bash "$BRIDGE_HANDLER" "increment.$CURRENT_STATUS" "$INC_ID" 2>/dev/null || true
            elif command -v timeout >/dev/null 2>&1; then
              timeout 15 bash "$BRIDGE_HANDLER" "increment.$CURRENT_STATUS" "$INC_ID" 2>/dev/null || true
            else
              bash "$BRIDGE_HANDLER" "increment.$CURRENT_STATUS" "$INC_ID" 2>/dev/null || true
            fi
          )
          log_debug "IMMEDIATE SYNC completed for $INC_ID"
        fi
      fi
    fi
    ;;

  */.specweave/increments/*/tasks.md|*/.specweave/increments/*/spec.md)
    log_debug "Tasks/spec change detected"

    # ========================================================================
    # TASK-AC SYNC (v0.35.2+): Sync task completion to spec.md ACs
    # ========================================================================
    # When tasks.md is edited, sync completed task ACs to spec.md
    # This runs SYNCHRONOUSLY but is NON-BLOCKING (never fails)
    if [[ "$FILE_PATH" == *tasks.md ]]; then
      SYNC_SCRIPT="$HOOK_DIR/guards/task-ac-sync-guard.sh"
      if [[ -f "$SYNC_SCRIPT" ]]; then
        log_debug "Running task-ac-sync guard"
        safe_run_sync "$SYNC_SCRIPT" "task-ac-sync" "$INPUT"
      fi

      # ========================================================================
      # TDD ENFORCEMENT (v1.0.105+): Warn on TDD discipline violations
      # ========================================================================
      # When tasks.md is edited in TDD mode, check for violations
      # WARNING-ONLY: educates users, never blocks
      TDD_GUARD="$HOOK_DIR/guards/tdd-enforcement-guard.sh"
      if [[ -f "$TDD_GUARD" ]]; then
        log_debug "Running TDD enforcement guard"
        safe_run_background "$TDD_GUARD" "tdd-enforcement" "$PROJECT_ROOT" "$FILE_PATH" "Edit"
      fi

      # Play completion sound if task was marked complete (v1.0.77+)
      play_task_completion_sound "$FILE_PATH"
    fi

    # Tasks or spec changed -> check for US completion (background)
    safe_run_background "$DETECTOR_DIR/us-completion-detector.sh" "us-completion-detector" "$INC_ID"

    # Queue events for backward compatibility (background)
    if [[ "$FILE_PATH" == *tasks.md ]]; then
      safe_run_background "$HOOK_DIR/queue/enqueue.sh" "enqueue-task" "task.updated" "$INC_ID"
      safe_run_background "$SCRIPTS_DIR/update-dashboard-cache.sh" "dashboard-cache" "$INC_ID" "tasks"
    else
      safe_run_background "$HOOK_DIR/queue/enqueue.sh" "enqueue-spec" "spec.updated" "$INC_ID"
      safe_run_background "$SCRIPTS_DIR/update-dashboard-cache.sh" "dashboard-cache" "$INC_ID" "spec"
    fi
    ;;

  */.specweave/increments/*/plan.md)
    log_debug "Plan change detected"
    # Queue plan update event (background)
    safe_run_background "$HOOK_DIR/queue/enqueue.sh" "enqueue-plan" "plan.updated" "$INC_ID"
    ;;

  *)
    # Not a specweave increment file, ignore
    exit 0
    ;;
esac

# ============================================================================
# NO BACKGROUND PROCESSOR (v1.0.148)
# ============================================================================
# Events are now batched and processed by stop-sync.sh at session end.
# Critical events (increment.done/reopened) sync immediately above.
# This eliminates the need for a background processor daemon.

log_debug "Dispatcher completed successfully"
exit 0
