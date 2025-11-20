#!/bin/bash
#
# Post-Write Hook: Update Status Line After spec.md or tasks.md Writes
#
# Triggers: After Write tool creates/replaces spec.md or tasks.md
# Action: Updates status line cache to reflect latest AC/task progress

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

# Get the file that was written from TOOL_USE_CONTENT environment variable
WRITTEN_FILE="${TOOL_USE_CONTENT:-}"

# Only update status line if spec.md or tasks.md was written
if [[ "$WRITTEN_FILE" == *"/spec.md"* ]] || [[ "$WRITTEN_FILE" == *"/tasks.md"* ]]; then
  # Check if the write is in an increment folder
  if [[ "$WRITTEN_FILE" == *"/.specweave/increments/"* ]]; then
    # Run status line update
    "$PROJECT_ROOT/plugins/specweave/hooks/lib/update-status-line.sh" &>/dev/null || true
  fi
fi

exit 0
