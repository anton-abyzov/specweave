#!/usr/bin/env bash
# read-workflow.sh - Pure bash reader for /sw:workflow
#
# Shows current phase, suggests next actions based on increment state.
# Reads from pre-computed dashboard cache for <10ms response time.
#
# Usage: bash read-workflow.sh [incrementId]
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
  echo "❌ jq required for workflow command. Install with: brew install jq"
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
echo "📋 SpecWeave Workflow Navigator"
echo ""

# Get active increment (or use provided ID)
if [[ -n "$INCREMENT_ID" ]]; then
  # Find full ID
  ACTIVE_ID=$(jq -r --arg id "$INCREMENT_ID" '
    .increments | keys[] | select(. == $id or startswith($id))
  ' "$CACHE_FILE" | head -1)
else
  # Find first active increment
  ACTIVE_ID=$(jq -r '
    .increments | to_entries[] |
    select(.value.status == "active" or .value.status == "planning" or .value.status == "backlog" or .value.status == "ready_for_review") |
    .key
  ' "$CACHE_FILE" 2>/dev/null | head -1)
fi

if [[ -z "$ACTIVE_ID" ]]; then
  echo "📭 No Active Increment"
  echo ""
  echo "Ready to start something new!"
  echo ""

  # Check for backlog items
  BACKLOG_COUNT=$(jq '.summary.backlog // 0' "$CACHE_FILE")
  if [[ "$BACKLOG_COUNT" -gt 0 ]]; then
    echo "📋 Backlog: $BACKLOG_COUNT item(s) waiting"
    echo "   Resume with: /sw:resume <id>"
    echo ""
  fi

  echo "💡 Suggestions:"
  echo "   • /sw:increment \"feature name\"  - Plan new work"
  echo "   • /sw:status                     - View all increments"
  exit 0
fi

# Get increment data
INC_DATA=$(jq --arg id "$ACTIVE_ID" '.increments[$id]' "$CACHE_FILE")
STATUS=$(echo "$INC_DATA" | jq -r '.status // "unknown"')
TYPE=$(echo "$INC_DATA" | jq -r '.type // "feature"')
TASKS_TOTAL=$(echo "$INC_DATA" | jq -r '.tasks.total // 0')
TASKS_COMPLETED=$(echo "$INC_DATA" | jq -r '.tasks.completed // 0')
ACS_TOTAL=$(echo "$INC_DATA" | jq -r '.acs.total // 0')
ACS_COMPLETED=$(echo "$INC_DATA" | jq -r '.acs.completed // 0')

# Calculate percentages
if [[ "$TASKS_TOTAL" -gt 0 ]]; then
  TASK_PCT=$((TASKS_COMPLETED * 100 / TASKS_TOTAL))
else
  TASK_PCT=0
fi

if [[ "$ACS_TOTAL" -gt 0 ]]; then
  AC_PCT=$((ACS_COMPLETED * 100 / ACS_TOTAL))
else
  AC_PCT=0
fi

# Determine phase and suggestions
PHASE=""
SUGGESTIONS=""

if [[ "$STATUS" == "backlog" ]] || [[ "$STATUS" == "planned" ]]; then
  PHASE="📝 Planning"
  SUGGESTIONS="• /sw:do     - Start implementation
• /sw:plan   - Generate plan.md and tasks.md"

elif [[ "$TASKS_COMPLETED" -eq 0 ]]; then
  PHASE="🚀 Starting"
  SUGGESTIONS="• /sw:do     - Execute first task
• /sw:pause  - Pause if not ready"

elif [[ "$TASK_PCT" -lt 50 ]]; then
  PHASE="🔨 In Progress (Early)"
  SUGGESTIONS="• /sw:do         - Continue implementation
• /sw:progress   - Check task details"

elif [[ "$TASK_PCT" -lt 100 ]]; then
  PHASE="⚙️ In Progress (Late)"
  SUGGESTIONS="• /sw:do         - Complete remaining tasks
• /sw:validate   - Early quality check"

elif [[ "$STATUS" == "ready_for_review" ]]; then
  PHASE="👀 Review"
  SUGGESTIONS="• /sw:validate   - Full validation
• /sw:done       - Close increment (PM approval)"

elif [[ "$TASKS_COMPLETED" -eq "$TASKS_TOTAL" ]]; then
  PHASE="✅ Tasks Complete"
  SUGGESTIONS="• /sw:validate   - Run quality checks
• /sw:done       - Close increment"

else
  PHASE="❓ Unknown"
  SUGGESTIONS="• /sw:status     - Check status"
fi

# Display
echo "📍 Current Increment: $ACTIVE_ID"
echo ""
echo "Status: $STATUS"
echo "Type: $TYPE"
echo "Phase: $PHASE"
echo ""
echo "Progress:"
echo "  Tasks: $TASKS_COMPLETED/$TASKS_TOTAL ($TASK_PCT%)"
echo "  ACs:   $ACS_COMPLETED/$ACS_TOTAL ($AC_PCT%)"
echo ""
echo "💡 Next Actions:"
echo "$SUGGESTIONS"
echo ""

# Additional context
PAUSED_COUNT=$(jq '.summary.paused // 0' "$CACHE_FILE")
if [[ "$PAUSED_COUNT" -gt 0 ]]; then
  echo "ℹ️  $PAUSED_COUNT paused increment(s) - /sw:resume to continue"
  echo ""
fi
