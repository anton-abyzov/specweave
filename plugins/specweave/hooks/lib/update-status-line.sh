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
# ============================================================================
if [[ -n "$SPECWEAVE_PROJECT_ROOT" ]] && [[ -d "$SPECWEAVE_PROJECT_ROOT/.specweave" ]]; then
  PROJECT_ROOT="$SPECWEAVE_PROJECT_ROOT"
else
  PROJECT_ROOT="$PWD"
  while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
  done
  [[ ! -d "$PROJECT_ROOT/.specweave" ]] && PROJECT_ROOT="$PWD"
fi

# ============================================================================
# ULTRA-FAST EXITS
# ============================================================================
STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-line.json"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
LOCK_FILE="$STATE_DIR/.status-update.lock"

# No .specweave? Exit immediately
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

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
TTL_SECONDS=10

if [[ -f "$CACHE_FILE" ]]; then
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
# ACQUIRE LOCK
# ============================================================================
mkdir -p "$STATE_DIR"
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ============================================================================
# FIND ACTIVE INCREMENTS (single find, no xargs)
# ============================================================================
ACTIVE_FILES=""
OPEN_COUNT=0
OLDEST_DATE="9999-99-99"
CURRENT_INCREMENT=""

while IFS= read -r spec_file; do
  [[ -z "$spec_file" ]] && continue

  # Quick status check with head + grep (faster than full file grep)
  if head -20 "$spec_file" 2>/dev/null | grep -qE '^status:\s*(active|planning|in-progress)'; then
    OPEN_COUNT=$((OPEN_COUNT + 1))
    increment_id=$(basename "$(dirname "$spec_file")")

    # Get created date (first 30 lines only)
    created=$(head -30 "$spec_file" 2>/dev/null | grep -m1 "^created:" | cut -d: -f2- | tr -d ' "' || echo "9999-99-99")

    if [[ "$created" < "$OLDEST_DATE" ]]; then
      OLDEST_DATE="$created"
      CURRENT_INCREMENT="$increment_id"
    fi

    ACTIVE_FILES="$ACTIVE_FILES $spec_file"
  fi
done < <(find "$INCREMENTS_DIR" -maxdepth 2 -name "spec.md" -not -path "*/_archive/*" 2>/dev/null)

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

# Count tasks with single awk call
read -r TOTAL_TASKS COMPLETED_TASKS < <(
  awk '
    /^###? T-/ { total++ }
    /\*\*Completed\*\*:|\*\*Status\*\*:[ \t]*\[x\]/ { completed++ }
    END { print total+0, completed+0 }
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

# Generate JSON directly (avoids jq subprocess entirely!)
cat > "$CACHE_FILE" << EOF
{"current":{"id":"$CURRENT_INCREMENT","name":"$CURRENT_INCREMENT","completed":$COMPLETED_TASKS,"total":$TOTAL_TASKS,"percentage":$PERCENTAGE,"acsCompleted":$COMPLETED_ACS,"acsTotal":$TOTAL_ACS},"openCount":$OPEN_COUNT,"lastUpdate":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF

# Update mtime marker
touch "$MTIME_FILE"

exit 0
