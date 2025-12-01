#!/bin/bash
# github-sync-handler.sh - Sync increment status to GitHub issue
# Called async by processor, non-blocking, error-tolerant
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

INC_ID="${1:-}"
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
if [[ -f "$THROTTLE_FILE" ]]; then
  AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  [[ $AGE -lt 300 ]] && exit 0
fi
touch "$THROTTLE_FILE"

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
GITHUB_TOKEN="$GITHUB_TOKEN" timeout 60 node "$SYNC_SCRIPT" "$FEATURE_ID" >/dev/null 2>&1
exit 0
