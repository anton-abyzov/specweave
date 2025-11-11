#!/usr/bin/env bash
#
# update-status-line.sh
#
# Updates the status line cache with current increment progress.
# Called by post-task-completion hook.
#
# Performance: 10-50ms (runs async in hook, user doesn't wait)
#
# Cache format (.specweave/state/status-line.json):
# {
#   "incrementId": "0017-sync-architecture-fix",
#   "incrementName": "sync-architecture-fix",
#   "totalTasks": 30,
#   "completedTasks": 15,
#   "percentage": 50,
#   "currentTask": {
#     "id": "T-016",
#     "title": "Update documentation"
#   },
#   "lastUpdate": "2025-11-10T15:30:00Z",
#   "lastModified": 1699632600
# }

set -euo pipefail

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
CACHE_FILE="$PROJECT_ROOT/.specweave/state/status-line.json"
STATE_FILE="$PROJECT_ROOT/.specweave/state/active-increment.json"

# Ensure state directory exists
mkdir -p "$PROJECT_ROOT/.specweave/state"

# Check if there's an active increment
if [[ ! -f "$STATE_FILE" ]]; then
  # No active increment = clear cache
  echo '{}' > "$CACHE_FILE"
  exit 0
fi

# Get active increment ID
INCREMENT_ID=$(jq -r '.id // empty' "$STATE_FILE" 2>/dev/null || echo "")
if [[ -z "$INCREMENT_ID" ]]; then
  echo '{}' > "$CACHE_FILE"
  exit 0
fi

TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID/tasks.md"

# No tasks file yet? (Planning phase)
if [[ ! -f "$TASKS_FILE" ]]; then
  echo '{}' > "$CACHE_FILE"
  exit 0
fi

# Get tasks.md mtime for invalidation detection
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  MTIME=$(stat -f %m "$TASKS_FILE" 2>/dev/null || echo 0)
else
  # Linux
  MTIME=$(stat -c %Y "$TASKS_FILE" 2>/dev/null || echo 0)
fi

# Parse tasks.md (THIS is the slow part: 10-50ms)
# Support both ## T- and ### T- formats (flexible task heading levels)
TOTAL_TASKS=$(grep -cE '^##+ T-' "$TASKS_FILE" 2>/dev/null || echo 0)

# Remove any whitespace/newlines and ensure integer
TOTAL_TASKS=$(echo "$TOTAL_TASKS" | tr -d '\n\r ' | grep -E '^[0-9]+$' || echo 0)

# Support both checkbox formats:
# 1. Standard: [x] at line start
# 2. Inline: **Status**: [x] (in task body)
COMPLETED_TASKS_STANDARD=$(grep -c '^\[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
COMPLETED_TASKS_INLINE=$(grep -c 'Status\*\*: \[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)

# Remove any whitespace/newlines and ensure integer
COMPLETED_TASKS_STANDARD=$(echo "$COMPLETED_TASKS_STANDARD" | tr -d '\n\r ' | grep -E '^[0-9]+$' || echo 0)
COMPLETED_TASKS_INLINE=$(echo "$COMPLETED_TASKS_INLINE" | tr -d '\n\r ' | grep -E '^[0-9]+$' || echo 0)

COMPLETED_TASKS=$((COMPLETED_TASKS_STANDARD + COMPLETED_TASKS_INLINE))

# Calculate percentage
if [[ "$TOTAL_TASKS" -gt 0 ]]; then
  PERCENTAGE=$(( COMPLETED_TASKS * 100 / TOTAL_TASKS ))
else
  PERCENTAGE=0
fi

# Find current task (first incomplete task)
# Strategy: Find first [ ] checkbox (either format), then get the task heading above it
# Try standard format first (checkbox at line start)
CURRENT_TASK_LINE=$(grep -B1 '^\[ \]' "$TASKS_FILE" 2>/dev/null | grep -E '^##+ T-' | head -1 || echo "")

# If not found, try inline format (**Status**: [ ])
if [[ -z "$CURRENT_TASK_LINE" ]]; then
  # Find line with **Status**: [ ], then look backward for task heading
  TASK_LINE_NUM=$(grep -n '\*\*Status\*\*: \[ \]' "$TASKS_FILE" 2>/dev/null | head -1 | cut -d: -f1 || echo "")
  if [[ -n "$TASK_LINE_NUM" ]]; then
    # Get lines before the status line and find the task heading
    CURRENT_TASK_LINE=$(head -n "$TASK_LINE_NUM" "$TASKS_FILE" | grep -E '^##+ T-' | tail -1 || echo "")
  fi
fi
CURRENT_TASK_ID=""
CURRENT_TASK_TITLE=""

if [[ -n "$CURRENT_TASK_LINE" ]]; then
  # Extract task ID (T-NNN)
  CURRENT_TASK_ID=$(echo "$CURRENT_TASK_LINE" | grep -o 'T-[0-9][0-9]*' || echo "")

  # Extract task title (after "## T-NNN: ")
  # Use parameter expansion to remove prefix
  TEMP="${CURRENT_TASK_LINE#*: }"
  CURRENT_TASK_TITLE=$(echo "$TEMP" | head -c 50)
fi

# Extract increment name (remove leading 4-digit number and dash)
INCREMENT_NAME=$(echo "$INCREMENT_ID" | sed 's/^[0-9]\{4\}-//')

# Build current task JSON
if [[ -n "$CURRENT_TASK_ID" ]]; then
  CURRENT_TASK_JSON=$(jq -n \
    --arg id "$CURRENT_TASK_ID" \
    --arg title "$CURRENT_TASK_TITLE" \
    '{id: $id, title: $title}')
else
  CURRENT_TASK_JSON="null"
fi

# Write cache atomically using jq
jq -n \
  --arg id "$INCREMENT_ID" \
  --arg name "$INCREMENT_NAME" \
  --argjson total "$TOTAL_TASKS" \
  --argjson completed "$COMPLETED_TASKS" \
  --argjson percentage "$PERCENTAGE" \
  --argjson task "$CURRENT_TASK_JSON" \
  --argjson mtime "$MTIME" \
  '{
    incrementId: $id,
    incrementName: $name,
    totalTasks: $total,
    completedTasks: $completed,
    percentage: $percentage,
    currentTask: $task,
    lastUpdate: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
    lastModified: $mtime
  }' > "$CACHE_FILE"

exit 0
