#!/bin/bash
# post-tool-use.sh - Single dispatcher for ALL PostToolUse events
# Replaces: post-task-edit, post-metadata-change, post-increment-planning, etc.
#
# Architecture (EDA v2):
# - Detectors run synchronously (fast, detect state transitions)
# - Detectors emit events to queue
# - Handlers process events asynchronously from queue
#
# Event flow:
# 1. metadata.json change -> lifecycle-detector -> increment.* events
# 2. tasks.md/spec.md change -> us-completion-detector -> user-story.* events
# 3. Events queued -> processor routes to handlers
#
# Goal: <10ms execution, all heavy work through event queue
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Read stdin (tool result JSON)
INPUT=$(cat)

# Extract file path (fast grep, no jq)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
[[ -z "$FILE_PATH" ]] && exit 0

# Extract increment ID from path
INC_ID=$(echo "$FILE_PATH" | grep -o '[0-9][0-9][0-9][0-9]-[^/]*' | head -1)
[[ -z "$INC_ID" ]] && exit 0

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DETECTOR_DIR="$HOOK_DIR/detectors"

# ============================================================================
# EDA DISPATCHER: Route to detectors based on file type
# Detectors detect state transitions and emit events to queue
# All heavy work is done by handlers processing the queue
# ============================================================================

case "$FILE_PATH" in
  */.specweave/increments/*/metadata.json)
    # Metadata changed -> check for lifecycle transitions
    # Events: increment.created, increment.done, increment.archived, increment.reopened
    bash "$DETECTOR_DIR/lifecycle-detector.sh" "$INC_ID" 2>/dev/null &
    ;;

  */.specweave/increments/*/tasks.md|*/.specweave/increments/*/spec.md)
    # Tasks or spec changed -> check for US completion
    # Events: user-story.completed, user-story.reopened
    bash "$DETECTOR_DIR/us-completion-detector.sh" "$INC_ID" 2>/dev/null &

    # Also queue legacy event for backward compatibility
    if [[ "$FILE_PATH" == *tasks.md ]]; then
      bash "$HOOK_DIR/queue/enqueue.sh" "task.updated" "$INC_ID" 2>/dev/null &
    else
      bash "$HOOK_DIR/queue/enqueue.sh" "spec.updated" "$INC_ID" 2>/dev/null &
    fi
    ;;

  */.specweave/increments/*/plan.md)
    # Plan updated (for future use, currently no special handling)
    bash "$HOOK_DIR/queue/enqueue.sh" "plan.updated" "$INC_ID" 2>/dev/null &
    ;;

  *)
    # Not a specweave increment file, ignore
    exit 0
    ;;
esac

# NOTE: Removed synchronous status-update.sh call
# Status line updates are now EVENT-DRIVEN:
# - Updated on user-story.completed/reopened events
# - Updated on increment lifecycle events
# - NOT updated on every file edit (reduces flickering, race conditions)

# Ensure processor is running to handle queued events
# (Processor may have timed out from idle after 60s)
PROCESSOR="$HOOK_DIR/queue/processor.sh"
PID_FILE="$PROJECT_ROOT/.specweave/state/.processor.pid"

# Quick check: if PID file exists and process running, skip
if [[ -f "$PID_FILE" ]]; then
  PROC_PID=$(cat "$PID_FILE" 2>/dev/null)
  if [[ -n "$PROC_PID" ]] && kill -0 "$PROC_PID" 2>/dev/null; then
    exit 0  # Processor running, events will be processed
  fi
fi

# Start processor in background (non-daemon mode for quick processing)
[[ -f "$PROCESSOR" ]] && nohup bash "$PROCESSOR" > /dev/null 2>&1 &

exit 0
