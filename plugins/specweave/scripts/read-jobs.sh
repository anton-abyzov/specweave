#!/usr/bin/env bash
# read-jobs.sh - Pure bash reader for /specweave:jobs
#
# Shows current work status (increments) + background jobs + helpful context.
# Reads from pre-computed dashboard cache for <10ms response time.
#
# Usage: bash read-jobs.sh [--all] [--id <jobId>]
#
# Compatible with bash 3.x (macOS default)

set -e

# Parse arguments
SHOW_ALL=false
SPECIFIC_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) SHOW_ALL=true; shift ;;
    --id) SPECIFIC_ID="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "No SpecWeave project found (missing .specweave/)"
  exit 0
fi

CACHE_FILE="$PROJECT_ROOT/.specweave/state/dashboard.json"
JOBS_FILE="$PROJECT_ROOT/.specweave/state/background-jobs.json"
SCRIPTS_DIR="$PROJECT_ROOT/plugins/specweave/scripts"

# Check if jq is available, fall back to Node if not
if ! command -v jq >/dev/null 2>&1; then
  if [[ -f "$SCRIPTS_DIR/jobs.js" ]]; then
    echo "⚠️  Install jq for instant status commands: brew install jq"
    exec node "$SCRIPTS_DIR/jobs.js" "$@"
  else
    echo "❌ jq not found and no fallback script available"
    exit 1
  fi
fi

# ============================================================================
# If specific job ID requested, show details and exit
# ============================================================================

if [[ -n "$SPECIFIC_ID" ]] && [[ -f "$JOBS_FILE" ]]; then
  JOB=$(jq --arg id "$SPECIFIC_ID" '
    .jobs[] | select(.id == $id or (.id | startswith($id)))
  ' "$JOBS_FILE" 2>/dev/null)

  if [[ -z "$JOB" ]]; then
    echo "Job not found: $SPECIFIC_ID"
    exit 1
  fi

  ID=$(echo "$JOB" | jq -r '.id')
  TYPE=$(echo "$JOB" | jq -r '.type')
  STATUS=$(echo "$JOB" | jq -r '.status')
  STARTED=$(echo "$JOB" | jq -r '.startedAt')
  UPDATED=$(echo "$JOB" | jq -r '.updatedAt')
  CURRENT=$(echo "$JOB" | jq -r '.progress.current // 0')
  TOTAL=$(echo "$JOB" | jq -r '.progress.total // 0')
  ERROR=$(echo "$JOB" | jq -r '.error // empty')

  if [[ "$TOTAL" -gt 0 ]]; then
    PCT=$((CURRENT * 100 / TOTAL))
  else
    PCT=0
  fi

  echo ""
  echo "📦 Job Details: $ID"
  echo ""
  echo "Type: $TYPE"
  echo "Status: $STATUS"
  echo "Started: $STARTED"
  echo "Updated: $UPDATED"
  echo "Progress: $CURRENT/$TOTAL ($PCT%)"

  if [[ -n "$ERROR" ]]; then
    echo "Error: $ERROR"
  fi
  exit 0
fi

# ============================================================================
# SECTION 1: Current Work Status (from dashboard cache)
# ============================================================================

echo ""
echo "📊 Current Work Status"
echo "────────────────────────────────────────"

# Rebuild cache if needed
if [[ ! -f "$CACHE_FILE" ]] || ! jq -e '.' "$CACHE_FILE" >/dev/null 2>&1; then
  if [[ -f "$SCRIPTS_DIR/rebuild-dashboard-cache.sh" ]]; then
    bash "$SCRIPTS_DIR/rebuild-dashboard-cache.sh" --quiet 2>/dev/null || true
  fi
fi

if [[ -f "$CACHE_FILE" ]] && jq -e '.' "$CACHE_FILE" >/dev/null 2>&1; then
  # Show active increments
  ACTIVE=$(jq -r '
    .increments | to_entries[] |
    select(.value.status == "active" or .value.status == "planning" or .value.status == "backlog" or .value.status == "ready_for_review") |
    "\(.key)|\(.value.status)|\(.value.tasks.completed)|\(.value.tasks.total)"
  ' "$CACHE_FILE" 2>/dev/null)

  if [[ -n "$ACTIVE" ]]; then
    echo ""
    echo "🔄 In Progress:"
    while IFS='|' read -r id status completed total; do
      [[ -z "$id" ]] && continue
      if [[ "$total" -gt 0 ]]; then
        pct=$((completed * 100 / total))
      else
        pct=0
      fi
      echo "   $id ($status)"
      echo "      Tasks: $completed/$total ($pct%)"
    done <<< "$ACTIVE"
  fi

  # Show paused increments
  PAUSED_INC=$(jq -r '
    .increments | to_entries[] |
    select(.value.status == "paused") |
    "\(.key)|\(.value.tasks.completed)|\(.value.tasks.total)"
  ' "$CACHE_FILE" 2>/dev/null)

  if [[ -n "$PAUSED_INC" ]]; then
    echo ""
    PAUSED_INC_COUNT=$(echo "$PAUSED_INC" | wc -l | tr -d ' ')
    echo "⏸️  Paused Increments ($PAUSED_INC_COUNT):"
    while IFS='|' read -r id completed total; do
      [[ -z "$id" ]] && continue
      if [[ "$total" -gt 0 ]]; then
        pct=$((completed * 100 / total))
      else
        pct=0
      fi
      echo "   $id - $pct% done"
    done <<< "$PAUSED_INC"
  fi

  # Show ready for review
  READY=$(jq -r '
    .increments | to_entries[] |
    select(.value.status == "ready_for_review") |
    .key
  ' "$CACHE_FILE" 2>/dev/null)

  if [[ -n "$READY" ]]; then
    echo ""
    echo "👀 Ready for Review:"
    while read -r id; do
      [[ -z "$id" ]] && continue
      echo "   $id"
    done <<< "$READY"
  fi

  # Summary stats
  TOTAL_INC=$(jq '.summary.total // 0' "$CACHE_FILE")
  ACTIVE_COUNT=$(jq '.summary.active // 0' "$CACHE_FILE")
  COMPLETED_INC_COUNT=$(jq '.summary.completed // 0' "$CACHE_FILE")

  if [[ -z "$ACTIVE" ]] && [[ -z "$PAUSED_INC" ]] && [[ -z "$READY" ]]; then
    echo ""
    echo "   No active increments."
    if [[ "$COMPLETED_INC_COUNT" -gt 0 ]]; then
      echo "   $COMPLETED_INC_COUNT increment(s) completed."
    fi
  fi

  echo ""
  echo "   Summary: $TOTAL_INC total | $ACTIVE_COUNT active | $COMPLETED_INC_COUNT completed"
else
  echo ""
  echo "   No increment data available (cache not found)."
  echo "   Run /specweave:status to rebuild cache."
fi

echo ""
echo "────────────────────────────────────────"

# ============================================================================
# SECTION 2: Background Jobs
# ============================================================================

echo ""
echo "⚙️  Background Jobs"
echo "────────────────────────────────────────"

# Check if jobs file exists and has jobs
HAS_JOBS=false
if [[ -f "$JOBS_FILE" ]] && jq -e '.jobs | length > 0' "$JOBS_FILE" >/dev/null 2>&1; then
  HAS_JOBS=true
fi

if [[ "$HAS_JOBS" == "false" ]]; then
  echo ""
  echo "   No background jobs."
  echo ""
  echo "   Background jobs are created for:"
  echo "   • Large issue imports (1000+ items from GitHub/JIRA/ADO)"
  echo "   • Multi-repository cloning (umbrella setup)"
  echo "   • Brownfield analysis (documentation gap detection)"
  echo ""
  echo "   Start jobs with:"
  echo "   • /specweave:import-external  - Import from external tools"
  echo "   • specweave init              - May spawn background jobs"
else
  echo ""

  # Running jobs
  RUNNING=$(jq -r '.jobs[] | select(.status == "running") | "\(.id)|\(.type)|\(.progress.current)|\(.progress.total)|\(.startedAt)"' "$JOBS_FILE" 2>/dev/null)

  if [[ -n "$RUNNING" ]]; then
    RUNNING_COUNT=$(echo "$RUNNING" | wc -l | tr -d ' ')
    echo "🔄 Running ($RUNNING_COUNT):"
    while IFS='|' read -r id type current total started; do
      [[ -z "$id" ]] && continue
      if [[ "$total" -gt 0 ]]; then
        pct=$((current * 100 / total))
      else
        pct=0
      fi
      echo "   [${id:0:8}] $type"
      echo "      Progress: $current/$total ($pct%)"
    done <<< "$RUNNING"
    echo ""
  fi

  # Paused jobs
  PAUSED=$(jq -r '.jobs[] | select(.status == "paused") | "\(.id)|\(.type)|\(.progress.current)|\(.progress.total)"' "$JOBS_FILE" 2>/dev/null)

  if [[ -n "$PAUSED" ]]; then
    PAUSED_COUNT=$(echo "$PAUSED" | wc -l | tr -d ' ')
    echo "⏸️  Paused ($PAUSED_COUNT):"
    while IFS='|' read -r id type current total; do
      [[ -z "$id" ]] && continue
      if [[ "$total" -gt 0 ]]; then
        pct=$((current * 100 / total))
      else
        pct=0
      fi
      echo "   [${id:0:8}] $type - $pct%"
    done <<< "$PAUSED"
    echo ""
  fi

  # Failed jobs
  FAILED=$(jq -r '.jobs[] | select(.status == "failed") | "\(.id)|\(.type)|\(.error // "unknown")"' "$JOBS_FILE" 2>/dev/null)

  if [[ -n "$FAILED" ]]; then
    FAILED_COUNT=$(echo "$FAILED" | wc -l | tr -d ' ')
    echo "❌ Failed ($FAILED_COUNT):"
    while IFS='|' read -r id type error; do
      [[ -z "$id" ]] && continue
      echo "   [${id:0:8}] $type"
      if [[ -n "$error" ]] && [[ "$error" != "null" ]]; then
        echo "      Error: $error"
      fi
    done <<< "$FAILED"
    echo ""
  fi

  # Completed jobs (only with --all)
  if [[ "$SHOW_ALL" == "true" ]]; then
    COMPLETED=$(jq -r '.jobs[] | select(.status == "completed") | "\(.id)|\(.type)|\(.progress.current)"' "$JOBS_FILE" 2>/dev/null)

    if [[ -n "$COMPLETED" ]]; then
      COMPLETED_COUNT=$(echo "$COMPLETED" | wc -l | tr -d ' ')
      echo "✅ Completed ($COMPLETED_COUNT):"
      COUNT=0
      while IFS='|' read -r id type items; do
        [[ -z "$id" ]] && continue
        if [[ $COUNT -lt 10 ]]; then
          echo "   [${id:0:8}] $type - $items items"
          COUNT=$((COUNT + 1))
        fi
      done <<< "$COMPLETED"
      if [[ $COMPLETED_COUNT -gt 10 ]]; then
        echo "   ... and $((COMPLETED_COUNT - 10)) more"
      fi
      echo ""
    fi
  fi

  # Summary if no active jobs
  RUNNING_COUNT=$(jq '[.jobs[] | select(.status == "running")] | length' "$JOBS_FILE" 2>/dev/null || echo "0")
  PAUSED_COUNT=$(jq '[.jobs[] | select(.status == "paused")] | length' "$JOBS_FILE" 2>/dev/null || echo "0")
  FAILED_COUNT=$(jq '[.jobs[] | select(.status == "failed")] | length' "$JOBS_FILE" 2>/dev/null || echo "0")
  COMPLETED_COUNT=$(jq '[.jobs[] | select(.status == "completed")] | length' "$JOBS_FILE" 2>/dev/null || echo "0")

  if [[ "$RUNNING_COUNT" -eq 0 ]] && [[ "$PAUSED_COUNT" -eq 0 ]] && [[ "$FAILED_COUNT" -eq 0 ]]; then
    if [[ "$COMPLETED_COUNT" -gt 0 ]]; then
      echo "   No active jobs. $COMPLETED_COUNT completed (use --all to see)."
    fi
  fi
fi

# ============================================================================
# SECTION 3: Commands Help
# ============================================================================

echo ""
echo "────────────────────────────────────────"
echo ""
echo "💡 Commands:"
echo "   /specweave:do               Execute current tasks"
echo "   /specweave:progress         Show task progress details"
echo "   /specweave:done <id>        Close increment"
echo "   /specweave:jobs --id <id>   View background job details"
echo "   /specweave:jobs --all       Show completed jobs"
echo ""
