#!/bin/bash
# post-tool-use.sh - Single dispatcher for ALL PostToolUse events
# Replaces: post-task-edit, post-metadata-change, post-increment-planning, etc.
# Goal: <10ms execution, queue heavy work for async processing
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

# Detect event type based on file
EVENT_TYPE=""
case "$FILE_PATH" in
  */.specweave/increments/*/tasks.md)   EVENT_TYPE="task.updated" ;;
  */.specweave/increments/*/spec.md)    EVENT_TYPE="spec.updated" ;;
  */.specweave/increments/*/metadata.json) EVENT_TYPE="metadata.changed" ;;
  */.specweave/increments/*/plan.md)    EVENT_TYPE="plan.updated" ;;
  *) exit 0 ;;  # Not a specweave file, ignore
esac

# Extract increment ID
INC_ID=$(echo "$FILE_PATH" | grep -o '[0-9][0-9][0-9][0-9]-[^/]*' | head -1)

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# SYNCHRONOUS: Status update only (fast, always needed)
bash "$HOOK_DIR/handlers/status-update.sh" "$INC_ID" 2>/dev/null &

# ASYNC: Queue heavy operations for background processing
bash "$HOOK_DIR/queue/enqueue.sh" "$EVENT_TYPE" "$INC_ID" 2>/dev/null

exit 0
