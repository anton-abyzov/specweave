#!/usr/bin/env bash
#
# update-status-line.sh (Enhanced with AC Metrics)
#
# Updates status line cache with current increment progress.
# Shows: [increment-name] ████░░░░ X/Y tasks | A/B ACs (Z open)
#
# Logic:
# 1. Scan all spec.md for status=active/planning (SOURCE OF TRUTH!)
# 2. Take first (oldest) as current increment
# 3. Count all active/planning as openCount
# 4. Parse current increment's tasks.md for task progress
# 5. Parse current increment's spec.md for AC progress
# 6. Write to cache
#
# Performance: 50-100ms (runs async, user doesn't wait)
#
# EMERGENCY FIX (v0.24.4): Changed from set -euo pipefail to set +e
# CRITICAL: Hooks MUST use set +e to prevent Claude Code crashes!
# See: CLAUDE.md section 9a - Hook Performance & Safety

set +e

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

# ============================================================================
# RECURSION PREVENTION (CRITICAL - v0.26.0 - FILE-BASED GUARD)
# ============================================================================
# FIX: Don't update status line from within hook chain
# WHY: Status line writes status-line.json which triggers post-edit-write hook
#      which tries to update status line AGAIN → infinite recursion!
#
# This is a CRITICAL part of Fix #4 in the root cause analysis:
# See: .specweave/increments/0051-*/reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # We're inside a hook chain - skip status line update to prevent recursion
  # This is NORMAL behavior (not an error!)
  exit 0
fi

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

    # Count completed tasks - recognize all three completion marker formats:
    # 1. **Completed**: <date> (preferred format)
    # 2. **Status**: [x] (legacy format)
    # 3. [x] at line start (legacy checkbox format)
    COMPLETED_TASKS=$(grep -cE '(\*\*Completed\*\*:|\*\*Status\*\*:\s*\[x\]|^\[x\])' "$TASKS_FILE" 2>/dev/null || echo 0)
    COMPLETED_TASKS=$(echo "$COMPLETED_TASKS" | tr -d '\n\r ' || echo 0)

    # Calculate percentage
    if [[ $TOTAL_TASKS -gt 0 ]]; then
      PERCENTAGE=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))
    fi
  fi
fi

# Step 4b: Parse spec.md for AC (Acceptance Criteria) progress
SPEC_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/spec.md"
TOTAL_ACS=0
COMPLETED_ACS=0
OPEN_ACS=0

if [[ -f "$SPEC_FILE" ]]; then
  # Count total ACs: both checked and unchecked
  # Pattern: - [ ] **AC- OR - [x] **AC-
  TOTAL_ACS=$(grep -cE '^- \[(x| )\] \*\*AC-' "$SPEC_FILE" 2>/dev/null || echo 0)
  TOTAL_ACS=$(echo "$TOTAL_ACS" | tr -d '\n\r ' || echo 0)

  # Count completed ACs (checked)
  # Pattern: - [x] **AC-
  COMPLETED_ACS=$(grep -cE '^- \[x\] \*\*AC-' "$SPEC_FILE" 2>/dev/null || echo 0)
  COMPLETED_ACS=$(echo "$COMPLETED_ACS" | tr -d '\n\r ' || echo 0)

  # Count open ACs (unchecked)
  # Pattern: - [ ] **AC-
  OPEN_ACS=$(grep -cE '^- \[ \] \*\*AC-' "$SPEC_FILE" 2>/dev/null || echo 0)
  OPEN_ACS=$(echo "$OPEN_ACS" | tr -d '\n\r ' || echo 0)
fi

# Step 5: Extract increment ID and name
# Format: XXXX-name where XXXX is 4-digit prefix (brackets added by manager)
INCREMENT_ID=$(echo "$CURRENT_INCREMENT" | grep -oE '^[0-9]{4}')
INCREMENT_NAME_ONLY=$(echo "$CURRENT_INCREMENT" | sed 's/^[0-9]\{4\}-//')
INCREMENT_NAME="$INCREMENT_ID-$INCREMENT_NAME_ONLY"

# Step 6: Write cache with atomic validation (v0.24.4 - prevents corruption)
TMP_CACHE_FILE="$PROJECT_ROOT/.specweave/state/.status-line-tmp.json"

# Validate all numeric inputs before jq (prevents jq failures)
[[ "$TOTAL_TASKS" =~ ^[0-9]+$ ]] || TOTAL_TASKS=0
[[ "$COMPLETED_TASKS" =~ ^[0-9]+$ ]] || COMPLETED_TASKS=0
[[ "$PERCENTAGE" =~ ^[0-9]+$ ]] || PERCENTAGE=0
[[ "$TOTAL_ACS" =~ ^[0-9]+$ ]] || TOTAL_ACS=0
[[ "$COMPLETED_ACS" =~ ^[0-9]+$ ]] || COMPLETED_ACS=0
[[ "$OPEN_ACS" =~ ^[0-9]+$ ]] || OPEN_ACS=0
[[ "$OPEN_COUNT" =~ ^[0-9]+$ ]] || OPEN_COUNT=0

# Generate cache to temp file first (atomic operation)
if jq -n \
  --arg id "$CURRENT_INCREMENT" \
  --arg name "$INCREMENT_NAME" \
  --argjson completed "$COMPLETED_TASKS" \
  --argjson total "$TOTAL_TASKS" \
  --argjson percentage "$PERCENTAGE" \
  --argjson acsCompleted "$COMPLETED_ACS" \
  --argjson acsTotal "$TOTAL_ACS" \
  --argjson openCount "$OPEN_COUNT" \
  '{
    current: {
      id: $id,
      name: $name,
      completed: $completed,
      total: $total,
      percentage: $percentage,
      acsCompleted: $acsCompleted,
      acsTotal: $acsTotal
    },
    openCount: $openCount,
    lastUpdate: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }' > "$TMP_CACHE_FILE" 2>/dev/null; then

  # Validate generated JSON before replacing cache (corruption prevention)
  if jq empty "$TMP_CACHE_FILE" 2>/dev/null; then
    mv "$TMP_CACHE_FILE" "$CACHE_FILE"
  else
    # Invalid JSON generated - keep old cache
    echo "[$(date)] ERROR: Generated invalid JSON, keeping old cache" >> "$DEBUG_LOG" 2>/dev/null || true
    rm -f "$TMP_CACHE_FILE"
  fi
else
  # jq generation failed - keep old cache
  echo "[$(date)] ERROR: jq failed to generate status cache (exit $?)" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$TMP_CACHE_FILE"
fi

exit 0
