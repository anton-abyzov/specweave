#!/usr/bin/env bash
# update-dashboard-cache.sh - Incremental update of dashboard cache
#
# Usage: bash update-dashboard-cache.sh <incrementId> <changeType>
#
# Arguments:
#   incrementId  - Increment ID (e.g., "0117-instant-dashboard-cache")
#   changeType   - Type of change: metadata|tasks|spec|jobs
#
# Updates only the affected increment in the cache, not a full rebuild.
# Uses file locking for concurrent safety.
#
# Compatible with bash 3.x (macOS default)

set -e

INCREMENT_ID="${1:-}"
CHANGE_TYPE="${2:-}"

if [[ -z "$INCREMENT_ID" ]]; then
  echo "❌ Usage: update-dashboard-cache.sh <incrementId> <changeType>"
  exit 1
fi

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "❌ No .specweave directory found"
  exit 1
fi

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/dashboard.json"
LOCK_FILE="$STATE_DIR/.dashboard.lock"
TEMP_FILE="$STATE_DIR/.dashboard.json.tmp.$$"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq is required. Install with: brew install jq"
  exit 1
fi

# Acquire file lock (with timeout)
acquire_lock() {
  local timeout=5
  local count=0
  while [[ -f "$LOCK_FILE" ]] && [[ $count -lt $timeout ]]; do
    sleep 0.1
    count=$((count + 1))
  done
  echo "$$" > "$LOCK_FILE"
}

release_lock() {
  rm -f "$LOCK_FILE"
}

# Cleanup on exit
cleanup() {
  release_lock
  rm -f "$TEMP_FILE"
}
trap cleanup EXIT

# If cache doesn't exist, do full rebuild
if [[ ! -f "$CACHE_FILE" ]]; then
  bash "$PROJECT_ROOT/plugins/specweave/scripts/rebuild-dashboard-cache.sh" --quiet
  exit 0
fi

# Find increment directory
INCREMENT_DIR=""
for dir in "$INCREMENTS_DIR"/*"$INCREMENT_ID"*/; do
  if [[ -d "$dir" ]]; then
    INCREMENT_DIR="$dir"
    INCREMENT_ID=$(basename "$dir")
    break
  fi
done

# Helper to normalize status for counter keys (planned → planning)
# Defined early so it can be used in removal section
normalize_status_key() {
  case "$1" in
    planned) echo "planning" ;;  # Legacy typo - map to planning counter
    *) echo "$1" ;;
  esac
}

if [[ -z "$INCREMENT_DIR" ]] || [[ ! -d "$INCREMENT_DIR" ]]; then
  # Increment might have been archived or deleted
  # Remove from cache if it exists
  acquire_lock
  if jq -e --arg id "$INCREMENT_ID" '.increments[$id]' "$CACHE_FILE" >/dev/null 2>&1; then
    # Get old status for counter updates
    old_status=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].status // "backlog"' "$CACHE_FILE")
    old_status_key=$(normalize_status_key "$old_status")
    old_type=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].type // "feature"' "$CACHE_FILE")
    old_priority=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].priority // "P1"' "$CACHE_FILE")

    # Remove increment and update counters (use normalized status key)
    jq --arg id "$INCREMENT_ID" \
       --arg old_status_key "$old_status_key" \
       --arg old_type "$old_type" \
       --arg old_priority "$old_priority" '
      del(.increments[$id]) |
      del(.mtimes[$id]) |
      .summary.total -= 1 |
      .summary[$old_status_key] -= 1 |
      .summary.byType[$old_type] -= 1 |
      .summary.byPriority[$old_priority] -= 1 |
      .updatedAt = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    ' "$CACHE_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$CACHE_FILE"
  fi
  exit 0
fi

metadata_file="$INCREMENT_DIR/metadata.json"
tasks_file="$INCREMENT_DIR/tasks.md"
spec_file="$INCREMENT_DIR/spec.md"

# Skip if no metadata
if [[ ! -f "$metadata_file" ]]; then
  exit 0
fi

# Read current values
status=$(jq -r '.status // "backlog"' "$metadata_file" 2>/dev/null)
# Normalize status for counter keys (planned → planning for backwards compatibility)
# The raw status is preserved in increment data, but counters use normalized key
status_key=$(normalize_status_key "$status")

type=$(jq -r '.type // "feature"' "$metadata_file" 2>/dev/null)
priority=$(jq -r '.priority // "P1"' "$metadata_file" 2>/dev/null)
title=$(jq -r '.title // ""' "$metadata_file" 2>/dev/null)
project=$(jq -r '.project // ""' "$metadata_file" 2>/dev/null)
created_at=$(jq -r '.createdAt // ""' "$metadata_file" 2>/dev/null)
user_stories=$(jq -c '.userStories // []' "$metadata_file" 2>/dev/null || echo "[]")

# Count tasks
total_tasks=0
completed_tasks=0
if [[ -f "$tasks_file" ]]; then
  total_tasks=$(grep -c "^### T-" "$tasks_file" 2>/dev/null) || total_tasks=0
  completed_tasks=$(grep "^\*\*Status\*\*:.*\[x\]" "$tasks_file" 2>/dev/null | wc -l | tr -d ' ') || completed_tasks=0
  total_tasks="${total_tasks:-0}"
  completed_tasks="${completed_tasks:-0}"
fi
if [[ "$total_tasks" -eq 0 ]]; then
  total_tasks=$(jq -r '.tasks.total // 0' "$metadata_file" 2>/dev/null) || total_tasks=0
  completed_tasks=$(jq -r '.tasks.completed // 0' "$metadata_file" 2>/dev/null) || completed_tasks=0
  total_tasks="${total_tasks:-0}"
  completed_tasks="${completed_tasks:-0}"
fi

# Count ACs
total_acs=0
completed_acs=0
if [[ -f "$spec_file" ]]; then
  total_acs=$(grep -c "\- \[.\] \*\*AC-" "$spec_file" 2>/dev/null) || total_acs=0
  completed_acs=$(grep -c "\- \[x\] \*\*AC-" "$spec_file" 2>/dev/null) || completed_acs=0
  total_acs="${total_acs:-0}"
  completed_acs="${completed_acs:-0}"
fi
if [[ "$total_acs" -eq 0 ]]; then
  total_acs=$(jq -r '.acceptanceCriteria.total // 0' "$metadata_file" 2>/dev/null) || total_acs=0
  completed_acs=$(jq -r '.acceptanceCriteria.satisfied // 0' "$metadata_file" 2>/dev/null) || completed_acs=0
  total_acs="${total_acs:-0}"
  completed_acs="${completed_acs:-0}"
fi

# Get last activity
last_activity=""
if [[ "$(uname)" == "Darwin" ]]; then
  last_activity=$(stat -f "%Sm" -t "%Y-%m-%dT%H:%M:%SZ" "$metadata_file" 2>/dev/null || echo "")
else
  last_activity=$(stat -c "%y" "$metadata_file" 2>/dev/null | sed 's/ /T/' | cut -d. -f1)Z || echo ""
fi

# Get mtimes for stale detection
meta_mtime=0
tasks_mtime=0
spec_mtime=0
if [[ "$(uname)" == "Darwin" ]]; then
  [[ -f "$metadata_file" ]] && meta_mtime=$(stat -f "%m" "$metadata_file" 2>/dev/null || echo "0")
  [[ -f "$tasks_file" ]] && tasks_mtime=$(stat -f "%m" "$tasks_file" 2>/dev/null || echo "0")
  [[ -f "$spec_file" ]] && spec_mtime=$(stat -f "%m" "$spec_file" 2>/dev/null || echo "0")
else
  [[ -f "$metadata_file" ]] && meta_mtime=$(stat -c "%Y" "$metadata_file" 2>/dev/null || echo "0")
  [[ -f "$tasks_file" ]] && tasks_mtime=$(stat -c "%Y" "$tasks_file" 2>/dev/null || echo "0")
  [[ -f "$spec_file" ]] && spec_mtime=$(stat -c "%Y" "$spec_file" 2>/dev/null || echo "0")
fi

# Acquire lock for update
acquire_lock

# Get old values for delta update
old_status=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].status // ""' "$CACHE_FILE" 2>/dev/null)
old_type=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].type // ""' "$CACHE_FILE" 2>/dev/null)
old_priority=$(jq -r --arg id "$INCREMENT_ID" '.increments[$id].priority // ""' "$CACHE_FILE" 2>/dev/null)
is_new=false
if [[ -z "$old_status" ]]; then
  is_new=true
fi

# Build the increment update
increment_json=$(jq -n \
  --arg status "$status" \
  --arg type "$type" \
  --arg priority "$priority" \
  --arg title "$title" \
  --arg project "$project" \
  --argjson total_tasks "$total_tasks" \
  --argjson completed_tasks "$completed_tasks" \
  --argjson total_acs "$total_acs" \
  --argjson completed_acs "$completed_acs" \
  --arg created_at "$created_at" \
  --arg last_activity "$last_activity" \
  --argjson user_stories "$user_stories" \
  '{
    status: $status,
    type: $type,
    priority: $priority,
    title: $title,
    project: $project,
    tasks: { total: $total_tasks, completed: $completed_tasks },
    acs: { total: $total_acs, completed: $completed_acs },
    createdAt: $created_at,
    lastActivity: $last_activity,
    userStories: $user_stories
  }')

# Build mtime update
mtime_json=$(jq -n \
  --argjson meta "$meta_mtime" \
  --argjson tasks "$tasks_mtime" \
  --argjson spec "$spec_mtime" \
  '{ metadata: $meta, tasks: $tasks, spec: $spec }')

# Apply incremental update
if [[ "$is_new" == "true" ]]; then
  # New increment - add to cache and increment counters
  # Note: Use status_key for counter updates (normalizes planned → planning)
  jq --arg id "$INCREMENT_ID" \
     --argjson inc "$increment_json" \
     --argjson mtime "$mtime_json" \
     --arg status_key "$status_key" \
     --arg type "$type" \
     --arg priority "$priority" '
    .increments[$id] = $inc |
    .mtimes[$id] = $mtime |
    .summary.total += 1 |
    .summary[$status_key] += 1 |
    .summary.byType[$type] += 1 |
    .summary.byPriority[$priority] += 1 |
    .updatedAt = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  ' "$CACHE_FILE" > "$TEMP_FILE"
else
  # Existing increment - update and adjust counters if status/type/priority changed
  # Normalize old_status for counter lookup (planned → planning)
  old_status_key=$(normalize_status_key "$old_status")

  jq --arg id "$INCREMENT_ID" \
     --argjson inc "$increment_json" \
     --argjson mtime "$mtime_json" \
     --arg old_status_key "$old_status_key" \
     --arg new_status_key "$status_key" \
     --arg old_type "$old_type" \
     --arg new_type "$type" \
     --arg old_priority "$old_priority" \
     --arg new_priority "$priority" '
    .increments[$id] = $inc |
    .mtimes[$id] = $mtime |
    (if $old_status_key != $new_status_key then
      .summary[$old_status_key] -= 1 |
      .summary[$new_status_key] += 1
    else . end) |
    (if $old_type != $new_type then
      .summary.byType[$old_type] -= 1 |
      .summary.byType[$new_type] += 1
    else . end) |
    (if $old_priority != $new_priority then
      .summary.byPriority[$old_priority] -= 1 |
      .summary.byPriority[$new_priority] += 1
    else . end) |
    .updatedAt = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  ' "$CACHE_FILE" > "$TEMP_FILE"
fi

# Atomic write
mv "$TEMP_FILE" "$CACHE_FILE"

# Success - no output for silent operation in hooks
