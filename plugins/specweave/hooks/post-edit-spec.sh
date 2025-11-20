#!/bin/bash
#
# Post-Edit Hook: Update Status Line After spec.md or tasks.md Edits
#
# Triggers: After Edit tool modifies spec.md (AC updates) or tasks.md (task completion)
# Action: Updates status line cache to reflect latest AC/task progress
#
# This ensures status line stays in sync when ACs are marked complete via Edit tool
# (not just TodoWrite, which only tracks internal todo lists)

set -e

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

# Get the file that was edited from TOOL_USE_CONTENT environment variable
# Claude Code provides this in the hook context
EDITED_FILE="${TOOL_USE_CONTENT:-}"

# Only update status line if spec.md or tasks.md was edited
if [[ "$EDITED_FILE" == *"/spec.md"* ]] || [[ "$EDITED_FILE" == *"/tasks.md"* ]]; then
  # Check if the edit is in an increment folder
  if [[ "$EDITED_FILE" == *"/.specweave/increments/"* ]]; then
    # Run status line update
    "$PROJECT_ROOT/plugins/specweave/hooks/lib/update-status-line.sh" &>/dev/null || true
  fi
fi

exit 0
