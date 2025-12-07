#!/usr/bin/env bash
# read-status.sh - Pure bash reader for /specweave:status
#
# Reads from pre-computed dashboard cache for <10ms response time.
# Falls back to Node.js script if jq is not available.
#
# Usage: bash read-status.sh
#
# Compatible with bash 3.x (macOS default)

set -e

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
  if [[ -f "$SCRIPTS_DIR/status.js" ]]; then
    echo "⚠️  Install jq for instant status commands: brew install jq"
    exec node "$SCRIPTS_DIR/status.js" "$@"
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
  exec node "$SCRIPTS_DIR/status.js" "$@"
fi

echo ""
echo "📋 SpecWeave Status Overview"
echo ""

# Status display order and icons
declare -a STATUS_ORDER
STATUS_ORDER=("active" "planning" "in-progress" "ready_for_review" "paused" "backlog" "completed" "abandoned")

status_icon() {
  case "$1" in
    active) echo "🔄" ;;
    planning) echo "📝" ;;
    in-progress) echo "⚙️" ;;
    ready_for_review) echo "👀" ;;
    paused) echo "⏸️" ;;
    backlog) echo "📋" ;;
    completed) echo "✅" ;;
    abandoned) echo "❌" ;;
    *) echo "•" ;;
  esac
}

HAS_OUTPUT=false

for status in "${STATUS_ORDER[@]}"; do
  # Get increments with this status
  ITEMS=$(jq -r --arg s "$status" '
    .increments | to_entries[] |
    select(.value.status == $s) | .key
  ' "$CACHE_FILE" 2>/dev/null)

  if [[ -n "$ITEMS" ]]; then
    HAS_OUTPUT=true
    COUNT=$(echo "$ITEMS" | wc -l | tr -d ' ')
    ICON=$(status_icon "$status")
    DISPLAY_STATUS="${status//_/ }"

    echo "$ICON $DISPLAY_STATUS ($COUNT):"

    # Show first 5
    SHOWN=0
    while read -r item; do
      [[ -z "$item" ]] && continue
      if [[ $SHOWN -lt 5 ]]; then
        echo "   $item"
        SHOWN=$((SHOWN + 1))
      fi
    done <<< "$ITEMS"

    if [[ $COUNT -gt 5 ]]; then
      echo "   ... and $((COUNT - 5)) more"
    fi
    echo ""
  fi
done

if [[ "$HAS_OUTPUT" == "false" ]]; then
  echo "No increments found."
fi

# Summary line
TOTAL=$(jq '.summary.total // 0' "$CACHE_FILE")
ACTIVE=$(jq '.summary.active // 0' "$CACHE_FILE")
COMPLETED=$(jq '.summary.completed // 0' "$CACHE_FILE")
ARCHIVED=$(jq '.summary.archived // 0' "$CACHE_FILE")

echo "────────────────────────────────────────"
echo "Total: $TOTAL increment(s) | Active: $ACTIVE | Completed: $COMPLETED | Archived: $ARCHIVED"

# Show cache age in debug mode
if [[ "${DEBUG:-}" == "1" ]] || [[ "${SPECWEAVE_DEBUG:-}" == "1" ]]; then
  CACHE_MTIME=$(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null)
  NOW=$(date +%s)
  AGE_SECONDS=$((NOW - CACHE_MTIME))
  if [[ $AGE_SECONDS -lt 60 ]]; then
    AGE_STR="${AGE_SECONDS}s ago"
  elif [[ $AGE_SECONDS -lt 3600 ]]; then
    AGE_STR="$((AGE_SECONDS / 60))m ago"
  else
    AGE_STR="$((AGE_SECONDS / 3600))h ago"
  fi
  CACHE_VERSION=$(jq -r '.version // "?"' "$CACHE_FILE")
  echo ""
  echo "🔧 Debug: Cache v${CACHE_VERSION}, updated ${AGE_STR}"
fi

echo ""
echo "💡 Commands:"
echo "   /specweave:progress        Show task progress"
echo "   /specweave:do              Execute current tasks"
echo "   /specweave:done <id>       Close increment"
