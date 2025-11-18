#!/usr/bin/env bash
#
# update-status-line.sh (Simplified)
#
# Updates status line cache with current increment progress.
# Shows: [increment-name] ████░░░░ X/Y tasks (Z open)
#
# Logic:
# 1. Scan all spec.md for status=active/planning (SOURCE OF TRUTH!)
# 2. Take first (oldest) as current increment
# 3. Count all active/planning as openCount
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

# Step 1: Find all open increments (active/planning)
# Read from spec.md (source of truth), not metadata.json
# ONLY accepts official IncrementStatus enum values
# Write to temp file: "timestamp increment_id"
> "$TMP_FILE"

if [[ -d "$INCREMENTS_DIR" ]]; then
  for spec_file in "$INCREMENTS_DIR"/*/spec.md; do
    if [[ -f "$spec_file" ]]; then
      # Parse YAML frontmatter for status (source of truth)
      status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "")

      # Check if increment is open (active, planning, or in-progress)
      # ONLY accepts official IncrementStatus enum values
      if [[ "$status" == "active" ]] || [[ "$status" == "planning" ]] || [[ "$status" == "in-progress" ]]; then
        increment_id=$(basename "$(dirname "$spec_file")")
        # Parse created date from spec.md YAML frontmatter
        created=$(grep -m1 "^created:" "$spec_file" 2>/dev/null | cut -d: -f2- | tr -d ' ' || echo "1970-01-01")

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
  # Use TaskCounter CLI for accurate counting (fixes overcounting bug)
  COUNT_TASKS_CLI="$PROJECT_ROOT/dist/src/cli/count-tasks.js"

  if [[ -f "$COUNT_TASKS_CLI" ]]; then
    # Call CLI and parse JSON output
    TASK_COUNTS=$(node "$COUNT_TASKS_CLI" "$TASKS_FILE" 2>/dev/null || echo '{"total":0,"completed":0,"percentage":0}')
    TOTAL_TASKS=$(echo "$TASK_COUNTS" | jq -r '.total' 2>/dev/null || echo 0)
    COMPLETED_TASKS=$(echo "$TASK_COUNTS" | jq -r '.completed' 2>/dev/null || echo 0)
    PERCENTAGE=$(echo "$TASK_COUNTS" | jq -r '.percentage' 2>/dev/null || echo 0)
  else
    # Fallback to legacy counting if CLI not available (graceful degradation)
    # Count total tasks (## T- or ### T- headings)
    TOTAL_TASKS=$(grep -cE '^##+ T-' "$TASKS_FILE" 2>/dev/null || echo 0)
    TOTAL_TASKS=$(echo "$TOTAL_TASKS" | tr -d '\n\r ' || echo 0)

    # Count completed tasks - use most reliable single marker (**Completed**: format)
    COMPLETED_TASKS=$(grep -c '\*\*Completed\*\*:' "$TASKS_FILE" 2>/dev/null || echo 0)
    COMPLETED_TASKS=$(echo "$COMPLETED_TASKS" | tr -d '\n\r ' || echo 0)

    # Calculate percentage
    if [[ $TOTAL_TASKS -gt 0 ]]; then
      PERCENTAGE=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))
    fi
  fi
fi

# Step 5: Extract increment ID and name
# Format: XXXX-name where XXXX is 4-digit prefix (brackets added by manager)
INCREMENT_ID=$(echo "$CURRENT_INCREMENT" | grep -oE '^[0-9]{4}')
INCREMENT_NAME_ONLY=$(echo "$CURRENT_INCREMENT" | sed 's/^[0-9]\{4\}-//')
INCREMENT_NAME="$INCREMENT_ID-$INCREMENT_NAME_ONLY"

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
