#!/usr/bin/env bash
# read-status-minimal.sh - Status reader using minimal cache
#
# Reads from ultra-simple status-cache.json (<2KB vs 23KB!)
# Much simpler queries!
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

CACHE_FILE="$PROJECT_ROOT/.specweave/state/status-cache.json"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "⚠️  Install jq for instant status commands: brew install jq"
  exit 1
fi

# If cache doesn't exist, rebuild it
if [[ ! -f "$CACHE_FILE" ]]; then
  bash "$SCRIPTS_DIR/rebuild-status-cache.sh" --quiet 2>/dev/null || true
fi

# If still no cache, error
if [[ ! -f "$CACHE_FILE" ]]; then
  echo "❌ Status cache not available"
  exit 1
fi

echo ""
echo "📋 SpecWeave Status Overview"
echo ""

# Status display order
STATUS_ORDER=("active" "planning" "ready_for_review" "paused" "backlog" "completed" "abandoned")

status_icon() {
  case "$1" in
    active) echo "🔄" ;;
    planning) echo "📝" ;;
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
  # Get count for this status
  COUNT=$(jq -r --arg s "$status" '.counts[$s] // 0' "$CACHE_FILE" 2>/dev/null)

  if [[ "$COUNT" -gt 0 ]]; then
    HAS_OUTPUT=true
    ICON=$(status_icon "$status")
    DISPLAY_STATUS="${status//_/ }"

    echo "$ICON $DISPLAY_STATUS ($COUNT):"

    # Get increment IDs for this status
    ITEMS=$(jq -r --arg s "$status" '.byStatus[$s][]' "$CACHE_FILE" 2>/dev/null)

    # Show first 5
    SHOWN=0
    echo "$ITEMS" | while read -r item; do
      [[ -z "$item" ]] && continue
      if [[ $SHOWN -lt 5 ]]; then
        echo "   $item"
        SHOWN=$((SHOWN + 1))
      fi
    done

    # Show +N more if needed
    if [[ $COUNT -gt 5 ]]; then
      MORE=$((COUNT - 5))
      echo "   +$MORE more..."
    fi

    echo ""
  fi
done

if [[ "$HAS_OUTPUT" == "false" ]]; then
  echo "No increments found."
  echo ""
fi

# Show summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$(jq -r '.counts.total' "$CACHE_FILE")
ACTIVE=$(jq -r '.counts.active' "$CACHE_FILE")
COMPLETED=$(jq -r '.counts.completed' "$CACHE_FILE")
echo "📊 Total: $TOTAL | Active: $ACTIVE | Completed: $COMPLETED"
echo ""

exit 0
