#!/bin/bash
# project-bridge-handler.sh - Bridge increment events to project-level EDA
#
# This handler connects the increment-level EDA (hooks v2) to the
# project-level EDA (ProjectRegistry + Adapters).
#
# Events bridged:
# - increment.created -> May create project labels in GitHub
# - increment.done -> Triggers project sync to all external tools
# - increment.archived -> Updates project sync status
# - increment.reopened -> Triggers project sync
#
# Architecture:
# [Increment Event] -> [This Handler] -> [project-bridge.js] -> [ProjectService]
#                                                                      |
#                                                                      v
#                                                          [ProjectEventBus]
#                                                                      |
#                                    +----------------+----------------+
#                                    v                v                v
#                              [GitHub]          [ADO]           [JIRA]
#                              Adapter           Adapter         Adapter
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

EVENT_TYPE="${1:-}"
EVENT_DATA="${2:-}"

[[ -z "$EVENT_TYPE" ]] && exit 0
[[ -z "$EVENT_DATA" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Throttle: max once per 2 minutes per increment for project sync
# (More aggressive throttle since this triggers external API calls)
INC_ID="${EVENT_DATA%%:*}"  # Extract increment ID from INC_ID:US_ID format
STATE_DIR="$PROJECT_ROOT/.specweave/state"
THROTTLE_FILE="$STATE_DIR/.project-bridge-$INC_ID"
THROTTLE_WINDOW=120  # 2 minutes
mkdir -p "$STATE_DIR" 2>/dev/null

if [[ -f "$THROTTLE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  fi
  [[ $AGE -lt $THROTTLE_WINDOW ]] && exit 0
fi
touch "$THROTTLE_FILE"

# Log event
LOG_FILE="$PROJECT_ROOT/.specweave/logs/hooks.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
echo "[$(date '+%Y-%m-%d %H:%M:%S')] project-bridge-handler: $EVENT_TYPE $EVENT_DATA" >> "$LOG_FILE" 2>/dev/null

# Find the bridge script
BRIDGE_SCRIPT=""
for path in \
  "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/project-bridge.js" \
  "$PROJECT_ROOT/plugins/specweave/lib/hooks/project-bridge.js" \
  "${CLAUDE_PLUGIN_ROOT:-}/lib/hooks/project-bridge.js"; do
  [[ -f "$path" ]] && { BRIDGE_SCRIPT="$path"; break; }
done

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

# Run bridge script if available
if [[ -n "$BRIDGE_SCRIPT" ]]; then
  cd "$PROJECT_ROOT" || exit 0
  # Run with 60s timeout (external API calls can be slow)
  run_with_timeout 60 node "$BRIDGE_SCRIPT" "$EVENT_TYPE" "$EVENT_DATA" >> "$LOG_FILE" 2>&1 &
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] project-bridge-handler: No bridge script found, skipping" >> "$LOG_FILE" 2>/dev/null
fi

exit 0
