#!/usr/bin/env bash
#
# post-task-edit.sh (v0.26.16)
#
# Lightweight hook triggered after Edit on tasks.md
# ONLY updates status line cache - no heavy processing!
#
# Purpose: Keep status line in sync when tasks are marked complete via Edit
#
# Performance target: <20ms (just calls update-status-line.sh)
#
set +e

# EMERGENCY KILL SWITCH
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find hook directory
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Consume stdin (required for PostToolUse hooks)
cat > /dev/null

# Update status line cache (force refresh by removing mtime marker)
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ -d "$PROJECT_ROOT/.specweave" ]]; then
  # Remove mtime markers to force full refresh
  rm -f "$PROJECT_ROOT/.specweave/state/.status-mtime-"* 2>/dev/null || true

  # Update status line
  bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

  # CRASH PREVENTION: Check task count in active increments
  for tasks_file in "$PROJECT_ROOT/.specweave/increments"/[0-9]*/tasks.md; do
    [[ -f "$tasks_file" ]] || continue
    task_count=$(grep -c "^### T-" "$tasks_file" 2>/dev/null || echo "0")
    if [[ "$task_count" -gt 8 ]]; then
      inc_name=$(basename "$(dirname "$tasks_file")")
      echo "⚠️ CRASH RISK: $inc_name has $task_count tasks (max 8). Split increment!" >&2
    fi
  done
fi

exit 0
