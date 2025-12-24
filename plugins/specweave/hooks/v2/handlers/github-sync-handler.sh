#!/bin/bash
# github-sync-handler.sh - Sync increment to GitHub (create/update issues for User Stories)
# Called async by processor, non-blocking, error-tolerant
#
# Argument formats supported:
# 1. (event_type, increment_id) - from lifecycle/spec.updated events
# 2. (event_type, INC_ID:US_ID) - from user-story.completed/reopened events (v1.0.45+)
# 3. (increment_id) - from metadata.changed events (legacy)
#
# CRITICAL FIX (v1.0.45): Added user-story.completed/reopened support
# Root cause: GitHub issues were created but NEVER UPDATED when User Stories completed!
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Parse arguments - support multiple formats
EVENT_TYPE="${1:-}"
EVENT_DATA="${2:-}"
INC_ID=""
US_ID=""

if [[ "$EVENT_TYPE" == user-story.* ]]; then
  # user-story.completed/reopened: $2 = INC_ID:US_ID
  INC_ID="${EVENT_DATA%%:*}"
  US_ID="${EVENT_DATA##*:}"
elif [[ "$EVENT_TYPE" == increment.* ]] || [[ "$EVENT_TYPE" == spec.* ]] || [[ "$EVENT_TYPE" == metadata.* ]]; then
  # Lifecycle events: $2 = increment_id
  INC_ID="$EVENT_DATA"
else
  # Legacy format: $1 = increment_id directly
  INC_ID="$EVENT_TYPE"
fi

[[ -z "$INC_ID" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
[[ ! -f "$CONFIG_FILE" ]] && exit 0

# Check if GitHub sync is enabled
GITHUB_ENABLED=$(grep -o '"enabled"[[:space:]]*:[[:space:]]*true' "$CONFIG_FILE" | head -1)
[[ -z "$GITHUB_ENABLED" ]] && exit 0

# Throttle configuration:
# - Full sync (increment lifecycle): 5 minutes (creates all issues)
# - US completion sync: 60 seconds (more targeted, less aggressive)
THROTTLE_LOG="$PROJECT_ROOT/.specweave/logs/throttle.log"
mkdir -p "$(dirname "$THROTTLE_LOG")" 2>/dev/null

if [[ -n "$US_ID" ]]; then
  # Per-US throttle (60 seconds) - more frequent for targeted updates
  THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.github-sync-$INC_ID-$US_ID"
  THROTTLE_WINDOW=60
  SYNC_TYPE="US:$US_ID"
else
  # Per-increment throttle (5 minutes) - less frequent for full sync
  THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.github-sync-$INC_ID"
  THROTTLE_WINDOW=300
  SYNC_TYPE="increment"
fi

if [[ -f "$THROTTLE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  fi
  if [[ $AGE -lt $THROTTLE_WINDOW ]]; then
    REMAINING=$((THROTTLE_WINDOW - AGE))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] THROTTLED $INC_ID ($SYNC_TYPE, wait ${REMAINING}s)" >> "$THROTTLE_LOG" 2>/dev/null
    exit 0
  fi
fi
touch "$THROTTLE_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] EXECUTING $INC_ID ($SYNC_TYPE) event=$EVENT_TYPE" >> "$THROTTLE_LOG" 2>/dev/null

# Cross-platform timeout wrapper
run_with_timeout() {
  local timeout_secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_secs" "$@" 2>/dev/null || true
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$timeout_secs" "$@" 2>/dev/null || true
  else
    "$@" 2>/dev/null || true
  fi
}

# Load GitHub token
GITHUB_TOKEN=""
[[ -f "$PROJECT_ROOT/.env" ]] && GITHUB_TOKEN=$(grep -E "^GITHUB_TOKEN=" "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"'"'")
[[ -z "$GITHUB_TOKEN" ]] && exit 0

# Find sync script
SYNC_SCRIPT=""
for path in \
  "$PROJECT_ROOT/dist/plugins/specweave-github/lib/github-feature-sync-cli.js" \
  "${CLAUDE_PLUGIN_ROOT:-/specweave-github}/lib/github-feature-sync-cli.js"; do
  [[ -f "$path" ]] && { SYNC_SCRIPT="$path"; break; }
done
[[ -z "$SYNC_SCRIPT" ]] && exit 0

# Extract feature ID
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
FEATURE_ID=""
[[ -f "$SPEC_FILE" ]] && FEATURE_ID=$(grep -E "^(epic|feature_id):" "$SPEC_FILE" | head -1 | sed 's/.*:[[:space:]]*//' | tr -d '"'"'")
[[ -z "$FEATURE_ID" ]] && exit 0

# Run sync (timeout 60s)
# The github-feature-sync-cli.js script will:
# 1. Find all User Stories in the feature
# 2. For each US, call updateUserStoryIssue() which:
#    - Updates issue body with latest content
#    - Calculates completion via CompletionCalculator (verifies [x] checkboxes)
#    - CLOSES the issue if ALL ACs and tasks are verified complete
#    - Updates status labels (status:complete, status:active, status:not_started)
cd "$PROJECT_ROOT" || exit 0
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Running: node $SYNC_SCRIPT $FEATURE_ID" >> "$THROTTLE_LOG" 2>/dev/null
GITHUB_TOKEN="$GITHUB_TOKEN" run_with_timeout 60 node "$SYNC_SCRIPT" "$FEATURE_ID" >> "$THROTTLE_LOG" 2>&1
SYNC_EXIT=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] COMPLETED $INC_ID ($SYNC_TYPE) exit=$SYNC_EXIT" >> "$THROTTLE_LOG" 2>/dev/null
exit 0
