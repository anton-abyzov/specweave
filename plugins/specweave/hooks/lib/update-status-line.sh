#!/usr/bin/env bash
#
# update-status-line.sh (Simplified)
#
# Updates status line cache with current increment progress.
# Shows: [increment-name] ████░░░░ X/Y tasks (Z open)
#
# Logic:
# 1. Scan all metadata.json for status=active/in-progress/planning
# 2. Take first (oldest) as current increment
# 3. Count all active/in-progress/planning as openCount
# 4. Parse current increment's tasks.md for progress
# 5. Write to cache
#
# Performance: 50-100ms (runs async, user doesn't wait)

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
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
TMP_FILE="$PROJECT_ROOT/.specweave/state/.status-line-tmp.txt"

# Ensure state directory exists
mkdir -p "$PROJECT_ROOT/.specweave/state"

# Step 1: Find all open increments (active/in-progress/planning)
# Write to temp file: "timestamp increment_id"
> "$TMP_FILE"

if [[ -d "$INCREMENTS_DIR" ]]; then
  for metadata in "$INCREMENTS_DIR"/*/metadata.json; do
    if [[ -f "$metadata" ]]; then
      status=$(jq -r '.status // ""' "$metadata" 2>/dev/null || echo "")

      # Check if increment is open (active, in-progress, or planning)
      if [[ "$status" == "active" ]] || [[ "$status" == "in-progress" ]] || [[ "$status" == "planning" ]]; then
        increment_id=$(basename "$(dirname "$metadata")")
        created=$(jq -r '.created // ""' "$metadata" 2>/dev/null || echo "1970-01-01T00:00:00Z")

        # Write to temp file
        echo "$created $increment_id" >> "$TMP_FILE"
      fi
    fi
  done
fi

# Step 2: Count open increments
OPEN_COUNT=$(wc -l < "$TMP_FILE" | tr -d ' ')

if [[ $OPEN_COUNT -eq 0 ]]; then
  # No open increments
  jq -n '{
    current: null,
    openCount: 0,
    lastUpdate: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }' > "$CACHE_FILE"
  rm -f "$TMP_FILE"
  exit 0
fi

# Step 3: Sort by timestamp (oldest first) and take first
CURRENT_INCREMENT=$(sort "$TMP_FILE" | head -1 | awk '{print $2}')

# Clean up temp file
rm -f "$TMP_FILE"

# Step 4: Parse current increment's tasks.md for progress
TASKS_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/tasks.md"
TOTAL_TASKS=0
COMPLETED_TASKS=0
PERCENTAGE=0

if [[ -f "$TASKS_FILE" ]]; then
  # Count total tasks (## T- or ### T- headings)
  TOTAL_TASKS=$(grep -cE '^##+ T-' "$TASKS_FILE" 2>/dev/null || echo 0)
  TOTAL_TASKS=$(echo "$TOTAL_TASKS" | tr -d '\n\r ' || echo 0)

  # Count completed tasks (multiple formats)
  # Format 1: [x] at line start (legacy)
  COMPLETED_STANDARD=$(grep -c '^\[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
  COMPLETED_STANDARD=$(echo "$COMPLETED_STANDARD" | tr -d '\n\r ' || echo 0)

  # Format 2: **Status**: [x] inline (legacy)
  COMPLETED_INLINE=$(grep -c '\*\*Status\*\*: \[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
  COMPLETED_INLINE=$(echo "$COMPLETED_INLINE" | tr -d '\n\r ' || echo 0)

  # Format 3: **Completed**: <date> (current format)
  COMPLETED_DATE=$(grep -c '\*\*Completed\*\*:' "$TASKS_FILE" 2>/dev/null || echo 0)
  COMPLETED_DATE=$(echo "$COMPLETED_DATE" | tr -d '\n\r ' || echo 0)

  COMPLETED_TASKS=$((COMPLETED_STANDARD + COMPLETED_INLINE + COMPLETED_DATE))

  # Calculate percentage
  if [[ $TOTAL_TASKS -gt 0 ]]; then
    PERCENTAGE=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))
  fi
fi

# Step 5: Extract increment name (remove 4-digit prefix)
INCREMENT_NAME=$(echo "$CURRENT_INCREMENT" | sed 's/^[0-9]\{4\}-//')

# Step 6: Write cache
jq -n \
  --arg id "$CURRENT_INCREMENT" \
  --arg name "$INCREMENT_NAME" \
  --argjson completed "$COMPLETED_TASKS" \
  --argjson total "$TOTAL_TASKS" \
  --argjson percentage "$PERCENTAGE" \
  --argjson openCount "$OPEN_COUNT" \
  '{
    current: {
      id: $id,
      name: $name,
      completed: $completed,
      total: $total,
      percentage: $percentage
    },
    openCount: $openCount,
    lastUpdate: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }' > "$CACHE_FILE"

exit 0
