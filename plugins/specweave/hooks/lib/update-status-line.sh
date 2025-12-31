#!/usr/bin/env bash
#
# update-status-line.sh (v0.26.13 - ULTRA-OPTIMIZED for crash prevention)
#
# Updates status line cache with current increment progress.
# Shows: [increment-name] ████░░░░ X/Y tasks | A/B ACs (Z open)
#
# OPTIMIZATIONS (v0.26.13):
# 1. TTL-based throttling (10s) - longer cache = fewer runs
# 2. Mtime checking via find -newer (no stat loops!)
# 3. Pure bash counting + JSON generation (NO jq!)
# 4. Single-pass awk for all counting (1 process vs 5 greps)
# 5. Exclude _archive/ with find -not -path
# 6. Lock file to prevent concurrent runs
#
# Performance: <5ms (cached) / 15-25ms (full scan)
#
set +e

# ============================================================================
# PROJECT ROOT (FAST - cached in env if available)
# CRITICAL: Must NOT fallback to pwd (prevents .specweave pollution)
# ============================================================================
if [[ -n "$SPECWEAVE_PROJECT_ROOT" ]] && [[ -d "$SPECWEAVE_PROJECT_ROOT/.specweave" ]]; then
  PROJECT_ROOT="$SPECWEAVE_PROJECT_ROOT"
else
  PROJECT_ROOT="$PWD"
  while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
  done
fi

# No .specweave? Exit immediately BEFORE any variable init (prevents pollution)
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# ============================================================================
# ULTRA-FAST EXITS
# ============================================================================
STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-line.json"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
LOCK_FILE="$STATE_DIR/.status-update.lock"

# Recursion guard
[[ -f "$STATE_DIR/.hook-recursion-guard" ]] && exit 0

# Lock check (prevent concurrent runs - causes crashes!)
if [[ -f "$LOCK_FILE" ]]; then
  # Check if lock is stale (>30s)
  if [[ "$(uname)" == "Darwin" ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0) ))
  else
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
  fi
  [[ $LOCK_AGE -lt 30 ]] && exit 0
fi

# ============================================================================
# TTL CHECK (10 seconds - balanced for UX vs performance)
# ============================================================================
# TTL check (skip if --force flag provided or SPECWEAVE_FORCE_STATUS_UPDATE=1)
# ============================================================================
TTL_SECONDS=10
FORCE_UPDATE=0

# Check for --force flag
if [[ "${1:-}" == "--force" ]] || [[ "${SPECWEAVE_FORCE_STATUS_UPDATE:-0}" == "1" ]]; then
  FORCE_UPDATE=1
fi

if [[ "$FORCE_UPDATE" -eq 0 ]] && [[ -f "$CACHE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    CACHE_AGE=$(( $(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0) ))
  else
    CACHE_AGE=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0) ))
  fi
  [[ $CACHE_AGE -lt $TTL_SECONDS ]] && exit 0
fi

# ============================================================================
# NO INCREMENTS? Write empty cache and exit
# ============================================================================
if [[ ! -d "$INCREMENTS_DIR" ]]; then
  mkdir -p "$STATE_DIR"
  printf '{"current":null,"openCount":0,"lastUpdate":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$CACHE_FILE"
  exit 0
fi

# ============================================================================
# ACQUIRE LOCK (ATOMIC - mkdir pattern prevents TOCTOU race!)
# ============================================================================
mkdir -p "$STATE_DIR"
LOCK_DIR="$STATE_DIR/.status-update.lockdir"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  # Lock exists - check if stale (>30s)
  if [[ "$(uname)" == "Darwin" ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  else
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_DIR" 2>/dev/null || echo 0) ))
  fi
  if [[ $LOCK_AGE -lt 30 ]]; then
    exit 0  # Another process holds lock
  fi
  # Stale lock - remove and retry
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR" 2>/dev/null || exit 0
fi
echo $$ > "$LOCK_DIR/pid"
trap 'rm -rf "$LOCK_DIR"' EXIT

# ============================================================================
# FIND ACTIVE INCREMENTS (uses metadata.json - SOURCE OF TRUTH!)
# ============================================================================
ACTIVE_FILES=""
OPEN_COUNT=0
OLDEST_DATE="9999-99-99"
CURRENT_INCREMENT=""

while IFS= read -r metadata_file; do
  [[ -z "$metadata_file" ]] && continue

  # Extract status from metadata.json (jq if available, grep fallback)
  if command -v jq >/dev/null 2>&1; then
    status=$(jq -r '.status // "unknown"' "$metadata_file" 2>/dev/null || echo "unknown")
    created=$(jq -r '.created // "9999-99-99"' "$metadata_file" 2>/dev/null || echo "9999-99-99")
  else
    status=$(grep -oP '"status"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "unknown")
    created=$(grep -oP '"created"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "9999-99-99")
  fi

  # Check if active
  if [[ "$status" == "active" || "$status" == "planning" || "$status" == "backlog" || "$status" == "ready_for_review" ]]; then
    OPEN_COUNT=$((OPEN_COUNT + 1))
    increment_id=$(basename "$(dirname "$metadata_file")")

    if [[ "$created" < "$OLDEST_DATE" ]]; then
      OLDEST_DATE="$created"
      CURRENT_INCREMENT="$increment_id"
    fi

    spec_file="$(dirname "$metadata_file")/spec.md"
    ACTIVE_FILES="$ACTIVE_FILES $spec_file"
  fi
done < <(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" -not -path "*/_archive/*" 2>/dev/null)

# No active increments?
if [[ -z "$CURRENT_INCREMENT" ]]; then
  printf '{"current":null,"openCount":0,"lastUpdate":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$CACHE_FILE"
  exit 0
fi

# ============================================================================
# MTIME CHECK (using find -newer - single syscall!)
# ============================================================================
MTIME_FILE="$STATE_DIR/.status-mtime-$CURRENT_INCREMENT"

if [[ -f "$MTIME_FILE" ]] && [[ -f "$CACHE_FILE" ]]; then
  # Check if any relevant files are newer than our marker
  TASKS_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/tasks.md"
  SPEC_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/spec.md"

  NEWER_FILES=$(find "$SPEC_FILE" "$TASKS_FILE" -newer "$MTIME_FILE" 2>/dev/null | head -1)

  if [[ -z "$NEWER_FILES" ]]; then
    # No changes - just touch cache to reset TTL
    touch "$CACHE_FILE"
    exit 0
  fi
fi

# ============================================================================
# SINGLE-PASS COUNTING WITH AWK (replaces 5 grep calls!)
# ============================================================================
TASKS_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/tasks.md"
SPEC_FILE="$INCREMENTS_DIR/$CURRENT_INCREMENT/spec.md"

# Count tasks with single awk call (per-task completion tracking!)
# Bug fix: Each task counts as 0 or 1 completed, regardless of marker count
read -r TOTAL_TASKS COMPLETED_TASKS < <(
  awk '
    BEGIN { total=0; completed=0; in_task=0; task_complete=0 }
    /^###? T-/ {
      if (in_task && task_complete) completed++
      total++
      in_task=1
      task_complete=0
    }
    /\*\*Completed\*\*:|\*\*Status\*\*:[ \t]*\[x\]|^\[x\]/ {
      if (in_task) task_complete=1
    }
    END {
      if (in_task && task_complete) completed++
      print total, completed
    }
  ' "$TASKS_FILE" 2>/dev/null || echo "0 0"
)

# Count ACs with single awk call
# Supports both formats: "- [ ] AC-US1-01:" and "- [ ] **AC-US1-01**:"
read -r TOTAL_ACS COMPLETED_ACS < <(
  awk '
    /^- \[(x| )\] (\*\*)?AC-/ { total++ }
    /^- \[x\] (\*\*)?AC-/ { completed++ }
    END { print total+0, completed+0 }
  ' "$SPEC_FILE" 2>/dev/null || echo "0 0"
)

# Calculate percentage (pure bash)
PERCENTAGE=0
[[ ${TOTAL_TASKS:-0} -gt 0 ]] && PERCENTAGE=$((${COMPLETED_TASKS:-0} * 100 / TOTAL_TASKS))

# ============================================================================
# WRITE CACHE (PURE BASH - NO jq!)
# ============================================================================
# Sanitize values
TOTAL_TASKS=${TOTAL_TASKS:-0}
COMPLETED_TASKS=${COMPLETED_TASKS:-0}
TOTAL_ACS=${TOTAL_ACS:-0}
COMPLETED_ACS=${COMPLETED_ACS:-0}
OPEN_COUNT=${OPEN_COUNT:-0}
PERCENTAGE=${PERCENTAGE:-0}

# Generate JSON directly (ATOMIC: write temp then mv to prevent partial reads!)
TEMP_CACHE="$CACHE_FILE.tmp.$$"
cat > "$TEMP_CACHE" << EOF
{"current":{"id":"$CURRENT_INCREMENT","name":"$CURRENT_INCREMENT","completed":$COMPLETED_TASKS,"total":$TOTAL_TASKS,"percentage":$PERCENTAGE,"acsCompleted":$COMPLETED_ACS,"acsTotal":$TOTAL_ACS},"openCount":$OPEN_COUNT,"lastUpdate":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF
mv "$TEMP_CACHE" "$CACHE_FILE"

# Update mtime marker
touch "$MTIME_FILE"

exit 0
