#!/usr/bin/env bash
# read-costs.sh - Pure bash reader for /specweave:costs
#
# Shows cost/token tracking dashboard.
# Reads from pre-computed dashboard cache for <10ms response time.
#
# Usage: bash read-costs.sh [incrementId]
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
SCRIPTS_DIR="$(dirname "${BASH_SOURCE[0]}")"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq required for costs command. Install with: brew install jq"
  exit 1
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

if [[ ! -f "$CACHE_FILE" ]] || ! jq -e '.' "$CACHE_FILE" >/dev/null 2>&1; then
  echo "❌ Cache unavailable. Try: bash plugins/specweave/scripts/rebuild-dashboard-cache.sh"
  exit 1
fi

echo ""
echo "💰 SpecWeave Cost Dashboard"
echo ""

# Read costs from cache
TOTAL_TOKENS=$(jq '.costs.totalTokens // 0' "$CACHE_FILE")
TOTAL_COST=$(jq '.costs.totalCost // 0' "$CACHE_FILE")
TOTAL_SAVINGS=$(jq '.costs.totalSavings // 0' "$CACHE_FILE")

if [[ "$TOTAL_TOKENS" -eq 0 ]] && [[ "$TOTAL_COST" == "0" ]]; then
  echo "📊 No cost data yet"
  echo ""
  echo "Cost tracking starts when you run agents with model hints."
  echo ""
  echo "💡 Tips:"
  echo "   • Use ⚡ haiku for simple tasks (3x faster, 20x cheaper)"
  echo "   • Use 💎 opus for complex reasoning (default, best quality)"
  echo "   • Use 🧠 sonnet only for legacy compatibility (rarely needed)"
  echo ""
  echo "Model hints in tasks.md:"
  echo "   ### T-001: Setup project structure ⚡"
  echo "   ### T-002: Design architecture 💎"
  exit 0
fi

# Format numbers
format_tokens() {
  local tokens=$1
  if [[ "$tokens" -ge 1000000 ]]; then
    echo "$((tokens / 1000000))M"
  elif [[ "$tokens" -ge 1000 ]]; then
    echo "$((tokens / 1000))k"
  else
    echo "$tokens"
  fi
}

format_cost() {
  local cost=$1
  if [[ "${cost%.*}" -ge 100 ]]; then
    printf "\$%.0f" "$cost"
  else
    printf "\$%.2f" "$cost"
  fi
}

# Display totals
echo "📈 Totals:"
echo "   Tokens: $(format_tokens "$TOTAL_TOKENS")"
echo "   Cost: $(format_cost "$TOTAL_COST")"
echo "   Savings: $(format_cost "$TOTAL_SAVINGS") (vs all-Sonnet)"
echo ""

# If specific increment requested
if [[ -n "$INCREMENT_ID" ]]; then
  INC_COSTS=$(jq --arg id "$INCREMENT_ID" '.costs.byIncrement[$id] // empty' "$CACHE_FILE" 2>/dev/null)
  if [[ -n "$INC_COSTS" ]]; then
    INC_TOKENS=$(echo "$INC_COSTS" | jq -r '.tokens // 0')
    INC_COST=$(echo "$INC_COSTS" | jq -r '.cost // 0')
    INC_SAVINGS=$(echo "$INC_COSTS" | jq -r '.savings // 0')
    echo "📦 Increment: $INCREMENT_ID"
    echo "   Tokens: $(format_tokens "$INC_TOKENS")"
    echo "   Cost: $(format_cost "$INC_COST")"
    echo "   Savings: $(format_cost "$INC_SAVINGS")"
    echo ""
  else
    echo "No cost data for increment: $INCREMENT_ID"
    echo ""
  fi
fi

# Show top increments by cost
echo "📊 Cost by Increment (top 5):"
jq -r '.costs.byIncrement | to_entries | sort_by(-.value.cost) | .[0:5][] |
  "   \(.key): $\(.value.cost | tostring | .[0:6])"' "$CACHE_FILE" 2>/dev/null || echo "   (no data)"
echo ""

echo "💡 Commands:"
echo "   /specweave:costs <id>     View increment costs"
echo "   /specweave:progress       View task progress"
