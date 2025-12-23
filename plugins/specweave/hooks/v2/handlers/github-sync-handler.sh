#!/bin/bash
# github-sync-handler.sh - Sync increment to GitHub (create issues for User Stories)
# Called async by processor, non-blocking, error-tolerant
#
# Argument formats supported:
# 1. (event_type, increment_id) - from lifecycle/spec.updated events
# 2. (increment_id) - from metadata.changed events (legacy)
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Support both argument formats:
# - Called from increment.created/spec.updated: $1 = event_type, $2 = increment_id
# - Called from metadata.changed: $1 = increment_id
INC_ID="${1:-}"
if [[ "$INC_ID" == increment.* ]] || [[ "$INC_ID" == spec.* ]] || [[ "$INC_ID" == metadata.* ]]; then
  # First arg is event type, second is increment ID
  INC_ID="${2:-}"
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

# Throttle: max once per 5 minutes per increment
THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.github-sync-$INC_ID"
THROTTLE_LOG="$PROJECT_ROOT/.specweave/logs/throttle.log"
THROTTLE_WINDOW=300  # 5 minutes
mkdir -p "$(dirname "$THROTTLE_LOG")" 2>/dev/null

if [[ -f "$THROTTLE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  fi
  if [[ $AGE -lt $THROTTLE_WINDOW ]]; then
    REMAINING=$((THROTTLE_WINDOW - AGE))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] THROTTLED $INC_ID (wait ${REMAINING}s, use /sw:sync-progress to bypass)" >> "$THROTTLE_LOG" 2>/dev/null
    exit 0
  fi
fi
touch "$THROTTLE_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] EXECUTING $INC_ID" >> "$THROTTLE_LOG" 2>/dev/null

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
cd "$PROJECT_ROOT" || exit 0
GITHUB_TOKEN="$GITHUB_TOKEN" run_with_timeout 60 node "$SYNC_SCRIPT" "$FEATURE_ID" >/dev/null 2>&1
exit 0
