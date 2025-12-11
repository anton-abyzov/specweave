#!/usr/bin/env bash
# read-progress.sh - Pure bash reader for /specweave:progress
#
# Reads from pre-computed dashboard cache for <10ms response time.
# Falls back to Node.js script if jq is not available.
#
# Usage: bash read-progress.sh [incrementId]
#
# Compatible with bash 3.x (macOS default)

set -e

INCREMENT_ID="${1:-}"

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
SCRIPTS_DIR="$PROJECT_ROOT/plugins/specweave/scripts"

# Check if jq is available, fall back to Node if not
if ! command -v jq >/dev/null 2>&1; then
  if [[ -f "$SCRIPTS_DIR/progress.js" ]]; then
    echo "⚠️  Install jq for instant status commands: brew install jq"
    exec node "$SCRIPTS_DIR/progress.js" "$@"
  else
    echo "❌ jq not found and no fallback script available"
    exit 1
  fi
fi

# If cache doesn't exist or is corrupted, rebuild it
NEED_REBUILD=false
if [[ ! -f "$CACHE_FILE" ]]; then
  NEED_REBUILD=true
elif ! jq -e '.' "$CACHE_FILE" >/dev/null 2>&1; then
  # Cache exists but is corrupted (invalid JSON)
  NEED_REBUILD=true
fi

if [[ "$NEED_REBUILD" == "true" ]]; then
  bash "$SCRIPTS_DIR/rebuild-dashboard-cache.sh" --quiet 2>/dev/null || true
fi

# If still no cache, fall back to Node
if [[ ! -f "$CACHE_FILE" ]] || ! jq -e '.' "$CACHE_FILE" >/dev/null 2>&1; then
  exec node "$SCRIPTS_DIR/progress.js" "$@"
fi

# Helper: create progress bar
progress_bar() {
  local pct="$1"
  local width="${2:-20}"
  local filled=$((pct * width / 100))
  local empty=$((width - filled))

  local bar="["
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  bar+="]"
  echo "$bar"
}

# Helper: format status with icon
format_status() {
  case "$1" in
    active) echo "🔄 active" ;;
    planning|planned) echo "📝 planning" ;;
    paused) echo "⏸️ paused" ;;
    completed) echo "✅ completed" ;;
    abandoned) echo "❌ abandoned" ;;
    ready_for_review) echo "👀 ready for review" ;;
    backlog) echo "📋 backlog" ;;
    *) echo "$1" ;;
  esac
}

# If specific increment requested
if [[ -n "$INCREMENT_ID" ]]; then
  # Find increment (partial match)
  FULL_ID=$(jq -r --arg id "$INCREMENT_ID" '
    .increments | keys[] | select(. == $id or startswith($id))
  ' "$CACHE_FILE" | head -1)

  if [[ -z "$FULL_ID" ]]; then
    echo "Increment not found: $INCREMENT_ID"
    exit 1
  fi

  # Read increment data
  INC_DATA=$(jq --arg id "$FULL_ID" '.increments[$id]' "$CACHE_FILE")
  STATUS=$(echo "$INC_DATA" | jq -r '.status // "unknown"')
  TYPE=$(echo "$INC_DATA" | jq -r '.type // "feature"')
  TOTAL=$(echo "$INC_DATA" | jq -r '.tasks.total // 0')
  COMPLETED=$(echo "$INC_DATA" | jq -r '.tasks.completed // 0')

  if [[ "$TOTAL" -gt 0 ]]; then
    PCT=$((COMPLETED * 100 / TOTAL))
  else
    PCT=0
  fi

  BAR=$(progress_bar "$PCT")
  STATUS_FMT=$(format_status "$STATUS")

  echo ""
  echo "📊 Progress: $FULL_ID"
  echo ""
  echo "Status: $STATUS_FMT"
  echo "Type: $TYPE"
  echo "Tasks: $COMPLETED/$TOTAL ($PCT%)"
  echo "Progress: $BAR"
  exit 0
fi

# Show all active increments
echo ""
echo "📊 Increment Progress"
echo ""

# Get ready_for_review increments FIRST (needs attention!)
READY_FOR_REVIEW=$(jq -r '
  .increments | to_entries[] |
  select(.value.status == "ready_for_review") |
  "\(.key)|\(.value.tasks.completed)|\(.value.tasks.total)"
' "$CACHE_FILE" 2>/dev/null)

REVIEW_COUNT=0
if [[ -n "$READY_FOR_REVIEW" ]]; then
  echo "👀 Ready for Review:"
  while IFS='|' read -r id completed total; do
    [[ -z "$id" ]] && continue
    REVIEW_COUNT=$((REVIEW_COUNT + 1))
    if [[ "$total" -gt 0 ]]; then
      pct=$((completed * 100 / total))
    else
      pct=0
    fi
    bar=$(progress_bar "$pct" 15)
    echo "  $id"
    echo "     $bar $completed/$total ($pct%)"
    echo "     → /specweave:done $id"
  done <<< "$READY_FOR_REVIEW"
  echo ""
fi

# Get active increments (excluding ready_for_review)
# Note: "planned" is a legacy typo for "planning" - support both for backwards compatibility
ACTIVE=$(jq -r '
  .increments | to_entries[] |
  select(.value.status == "active" or .value.status == "planning" or .value.status == "planned" or .value.status == "backlog") |
  "\(.key)|\(.value.tasks.completed)|\(.value.tasks.total)|\(.value.status)"
' "$CACHE_FILE" 2>/dev/null)

ACTIVE_COUNT=0
if [[ -n "$ACTIVE" ]]; then
  echo "🔄 Active:"
  while IFS='|' read -r id completed total inc_status; do
    [[ -z "$id" ]] && continue
    ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
    if [[ "$total" -gt 0 ]]; then
      pct=$((completed * 100 / total))
    else
      pct=0
    fi
    bar=$(progress_bar "$pct" 15)
    # Show status indicator if not "active"
    status_indicator=""
    case "$inc_status" in
      planning|planned) status_indicator=" (📝 planning)" ;;
      backlog) status_indicator=" (📋 backlog)" ;;
    esac
    echo "  $id$status_indicator"
    echo "     $bar $completed/$total ($pct%)"
  done <<< "$ACTIVE"
  echo ""
fi

# Get paused increments
PAUSED=$(jq -r '
  .increments | to_entries[] |
  select(.value.status == "paused") |
  "\(.key)|\(.value.tasks.completed)|\(.value.tasks.total)"
' "$CACHE_FILE" 2>/dev/null)

if [[ -n "$PAUSED" ]]; then
  PAUSED_COUNT=$(echo "$PAUSED" | wc -l | tr -d ' ')
  echo "⏸️  Paused ($PAUSED_COUNT):"
  while IFS='|' read -r id completed total; do
    [[ -z "$id" ]] && continue
    if [[ "$total" -gt 0 ]]; then
      pct=$((completed * 100 / total))
    else
      pct=0
    fi
    echo "  $id - $pct%"
  done <<< "$PAUSED"
  echo ""
fi

# Summary section
if [[ "$REVIEW_COUNT" -gt 0 ]] || [[ "$ACTIVE_COUNT" -gt 0 ]] || [[ -n "$PAUSED" ]]; then
  # Has work - show summary
  echo "────────────────────────────────────────"
  SUMMARY_PARTS=()
  [[ "$REVIEW_COUNT" -gt 0 ]] && SUMMARY_PARTS+=("$REVIEW_COUNT ready for review")
  [[ "$ACTIVE_COUNT" -gt 0 ]] && SUMMARY_PARTS+=("$ACTIVE_COUNT active")
  PAUSED_COUNT=0
  [[ -n "$PAUSED" ]] && PAUSED_COUNT=$(echo "$PAUSED" | grep -c '|' || echo 0)
  [[ "$PAUSED_COUNT" -gt 0 ]] && SUMMARY_PARTS+=("$PAUSED_COUNT paused")

  IFS=', '; echo "Summary: ${SUMMARY_PARTS[*]}"
else
  # No work in progress
  echo "No active increments."
  COMPLETED_COUNT=$(jq '.summary.completed // 0' "$CACHE_FILE")
  if [[ "$COMPLETED_COUNT" -gt 0 ]]; then
    echo "$COMPLETED_COUNT completed increment(s)."
  fi
fi

echo ""
if [[ "$REVIEW_COUNT" -gt 0 ]]; then
  echo "💡 Run /specweave:done <id> to close reviewed increments"
elif [[ "$ACTIVE_COUNT" -eq 0 ]]; then
  echo "💡 Run /specweave:increment to start new work"
else
  echo "💡 For details: /specweave:progress <incrementId>"
fi
