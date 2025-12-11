#!/usr/bin/env bash
# rebuild-dashboard-cache.sh - Full rebuild of dashboard cache
#
# Usage: bash rebuild-dashboard-cache.sh [--quiet]
#
# Scans all increments in .specweave/increments/ and builds complete cache.
# Uses atomic write pattern (temp file + rename) to prevent corruption.
#
# Output: .specweave/state/dashboard.json
#
# Compatible with bash 3.x (macOS default)

set -e

QUIET="${1:-}"
log() {
  [[ "$QUIET" == "--quiet" ]] || echo "$@"
}

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
TEMP_FILE="$STATE_DIR/.dashboard.json.tmp.$$"
ARCHIVE_DIR="$INCREMENTS_DIR/_archive"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq is required for cache operations. Install with: brew install jq"
  exit 1
fi

log "🔄 Rebuilding dashboard cache..."

# Initialize counters using simple variables (bash 3.x compatible)
status_backlog=0
status_planning=0
status_active=0
status_paused=0
status_ready_for_review=0
status_completed=0
status_abandoned=0

type_feature=0
type_hotfix=0
type_bug=0
type_refactor=0
type_experiment=0
type_change_request=0

priority_P0=0
priority_P1=0
priority_P2=0
priority_P3=0

archived_count=0
total_count=0

# Start building JSON
increments_json="{}"
mtimes_json="{}"

# Process each increment directory
for increment_dir in "$INCREMENTS_DIR"/[0-9]*/; do
  [[ -d "$increment_dir" ]] || continue

  increment_id=$(basename "$increment_dir")
  metadata_file="$increment_dir/metadata.json"
  tasks_file="$increment_dir/tasks.md"
  spec_file="$increment_dir/spec.md"

  # Skip if no metadata
  [[ -f "$metadata_file" ]] || continue

  total_count=$((total_count + 1))

  # Read metadata
  status=$(jq -r '.status // "backlog"' "$metadata_file" 2>/dev/null)
  type=$(jq -r '.type // "feature"' "$metadata_file" 2>/dev/null)
  priority=$(jq -r '.priority // "P1"' "$metadata_file" 2>/dev/null)
  title=$(jq -r '.title // ""' "$metadata_file" 2>/dev/null)
  project=$(jq -r '.project // ""' "$metadata_file" 2>/dev/null)
  created_at=$(jq -r '.createdAt // ""' "$metadata_file" 2>/dev/null)

  # Read user stories
  user_stories=$(jq -c '.userStories // []' "$metadata_file" 2>/dev/null || echo "[]")

  # Count tasks
  total_tasks=0
  completed_tasks=0
  if [[ -f "$tasks_file" ]]; then
    # Count ### T- headers for total
    total_tasks=$(grep -c "^### T-" "$tasks_file" 2>/dev/null) || total_tasks=0
    # Count [x] for completed
    completed_tasks=$(grep "^\*\*Status\*\*:.*\[x\]" "$tasks_file" 2>/dev/null | wc -l | tr -d ' ') || completed_tasks=0
    # Ensure numeric
    total_tasks="${total_tasks:-0}"
    completed_tasks="${completed_tasks:-0}"
  fi

  # Fallback to metadata task counts if available
  if [[ "$total_tasks" -eq 0 ]]; then
    total_tasks=$(jq -r '.tasks.total // 0' "$metadata_file" 2>/dev/null) || total_tasks=0
    completed_tasks=$(jq -r '.tasks.completed // 0' "$metadata_file" 2>/dev/null) || completed_tasks=0
    total_tasks="${total_tasks:-0}"
    completed_tasks="${completed_tasks:-0}"
  fi

  # Count ACs from spec.md
  total_acs=0
  completed_acs=0
  if [[ -f "$spec_file" ]]; then
    # Count all AC checkboxes
    total_acs=$(grep -c "\- \[.\] \*\*AC-" "$spec_file" 2>/dev/null) || total_acs=0
    completed_acs=$(grep -c "\- \[x\] \*\*AC-" "$spec_file" 2>/dev/null) || completed_acs=0
    total_acs="${total_acs:-0}"
    completed_acs="${completed_acs:-0}"
  fi

  # Fallback to metadata AC counts
  if [[ "$total_acs" -eq 0 ]]; then
    total_acs=$(jq -r '.acceptanceCriteria.total // 0' "$metadata_file" 2>/dev/null) || total_acs=0
    completed_acs=$(jq -r '.acceptanceCriteria.satisfied // 0' "$metadata_file" 2>/dev/null) || completed_acs=0
    total_acs="${total_acs:-0}"
    completed_acs="${completed_acs:-0}"
  fi

  # Get last activity from file mtime
  last_activity=""
  if [[ "$(uname)" == "Darwin" ]]; then
    last_activity=$(stat -f "%Sm" -t "%Y-%m-%dT%H:%M:%SZ" "$metadata_file" 2>/dev/null || echo "")
  else
    last_activity=$(stat -c "%y" "$metadata_file" 2>/dev/null | sed 's/ /T/' | cut -d. -f1)Z || echo ""
  fi

  # Build increment JSON
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

  # Add to increments object
  increments_json=$(echo "$increments_json" | jq --arg id "$increment_id" --argjson inc "$increment_json" '.[$id] = $inc')

  # Collect mtimes for stale detection
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

  mtimes_json=$(echo "$mtimes_json" | jq --arg id "$increment_id" \
    --argjson meta "$meta_mtime" \
    --argjson tasks "$tasks_mtime" \
    --argjson spec "$spec_mtime" \
    '.[$id] = { metadata: $meta, tasks: $tasks, spec: $spec }')

  # Update status counters (bash 3.x compatible)
  # Note: "planned" is a legacy typo for "planning" - both map to planning counter
  case "$status" in
    backlog) status_backlog=$((status_backlog + 1)) ;;
    planning|planned) status_planning=$((status_planning + 1)) ;;
    active) status_active=$((status_active + 1)) ;;
    paused) status_paused=$((status_paused + 1)) ;;
    ready_for_review) status_ready_for_review=$((status_ready_for_review + 1)) ;;
    completed) status_completed=$((status_completed + 1)) ;;
    abandoned) status_abandoned=$((status_abandoned + 1)) ;;
    *) status_backlog=$((status_backlog + 1)) ;;
  esac

  # Update type counters
  case "$type" in
    feature) type_feature=$((type_feature + 1)) ;;
    hotfix) type_hotfix=$((type_hotfix + 1)) ;;
    bug) type_bug=$((type_bug + 1)) ;;
    refactor) type_refactor=$((type_refactor + 1)) ;;
    experiment) type_experiment=$((type_experiment + 1)) ;;
    change-request) type_change_request=$((type_change_request + 1)) ;;
    *) type_feature=$((type_feature + 1)) ;;
  esac

  # Update priority counters
  case "$priority" in
    P0) priority_P0=$((priority_P0 + 1)) ;;
    P1) priority_P1=$((priority_P1 + 1)) ;;
    P2) priority_P2=$((priority_P2 + 1)) ;;
    P3) priority_P3=$((priority_P3 + 1)) ;;
    *) priority_P1=$((priority_P1 + 1)) ;;
  esac
done

# Count archived increments
if [[ -d "$ARCHIVE_DIR" ]]; then
  archived_count=$(find "$ARCHIVE_DIR" -maxdepth 1 -type d -name "[0-9]*" 2>/dev/null | wc -l | tr -d ' ')
fi

# Build jobs section (read from existing jobs file if present)
jobs_json='{"running":[],"paused":[],"failed":[],"completedCount":0}'
JOBS_FILE="$STATE_DIR/background-jobs.json"
if [[ -f "$JOBS_FILE" ]]; then
  running=$(jq -c '[.[] | select(.status == "running")]' "$JOBS_FILE" 2>/dev/null || echo "[]")
  paused=$(jq -c '[.[] | select(.status == "paused")]' "$JOBS_FILE" 2>/dev/null || echo "[]")
  failed=$(jq -c '[.[] | select(.status == "failed")]' "$JOBS_FILE" 2>/dev/null || echo "[]")
  completed_count=$(jq '[.[] | select(.status == "completed")] | length' "$JOBS_FILE" 2>/dev/null || echo "0")
  jobs_json=$(jq -n \
    --argjson running "$running" \
    --argjson paused "$paused" \
    --argjson failed "$failed" \
    --argjson completed_count "$completed_count" \
    '{running: $running, paused: $paused, failed: $failed, completedCount: $completed_count}')
fi

# Build costs section (placeholder - populated by cost tracking hooks)
costs_json='{"totalTokens":0,"totalCost":0,"totalSavings":0,"byIncrement":{}}'
COSTS_FILE="$STATE_DIR/costs.json"
if [[ -f "$COSTS_FILE" ]]; then
  costs_json=$(cat "$COSTS_FILE" 2>/dev/null || echo "$costs_json")
fi

# Build complete cache
cache_json=$(jq -n \
  --argjson version 1 \
  --arg updated_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson increments "$increments_json" \
  --argjson total "$total_count" \
  --argjson active "$status_active" \
  --argjson paused "$status_paused" \
  --argjson backlog "$status_backlog" \
  --argjson planning "$status_planning" \
  --argjson ready_for_review "$status_ready_for_review" \
  --argjson completed "$status_completed" \
  --argjson abandoned "$status_abandoned" \
  --argjson archived "$archived_count" \
  --argjson feature "$type_feature" \
  --argjson hotfix "$type_hotfix" \
  --argjson bug "$type_bug" \
  --argjson refactor "$type_refactor" \
  --argjson experiment "$type_experiment" \
  --argjson change_request "$type_change_request" \
  --argjson p0 "$priority_P0" \
  --argjson p1 "$priority_P1" \
  --argjson p2 "$priority_P2" \
  --argjson p3 "$priority_P3" \
  --argjson jobs "$jobs_json" \
  --argjson costs "$costs_json" \
  --argjson mtimes "$mtimes_json" \
  '{
    version: $version,
    updatedAt: $updated_at,
    increments: $increments,
    summary: {
      total: $total,
      active: $active,
      paused: $paused,
      backlog: $backlog,
      planning: $planning,
      ready_for_review: $ready_for_review,
      completed: $completed,
      abandoned: $abandoned,
      archived: $archived,
      byType: {
        feature: $feature,
        hotfix: $hotfix,
        bug: $bug,
        refactor: $refactor,
        experiment: $experiment,
        "change-request": $change_request
      },
      byPriority: {
        P0: $p0,
        P1: $p1,
        P2: $p2,
        P3: $p3
      }
    },
    jobs: $jobs,
    costs: $costs,
    mtimes: $mtimes
  }')

# Atomic write: write to temp file, then rename
echo "$cache_json" > "$TEMP_FILE"
mv "$TEMP_FILE" "$CACHE_FILE"

log "✅ Dashboard cache rebuilt"
log "   📊 $total_count increments | $status_active active | $status_planning planning | $status_completed completed"
log "   📁 Cache: $CACHE_FILE"
