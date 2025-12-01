#!/bin/bash
# living-docs-handler.sh - Sync increment to living docs
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

# Throttle: max once per minute per increment
THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.living-docs-$INC_ID"
if [[ -f "$THROTTLE_FILE" ]]; then
  AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  [[ $AGE -lt 60 ]] && exit 0
fi
touch "$THROTTLE_FILE"

# Find sync script
SYNC_SCRIPT=""
for path in \
  "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" \
  "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" \
  "${CLAUDE_PLUGIN_ROOT:-}/lib/hooks/sync-living-docs.js"; do
  [[ -f "$path" ]] && { SYNC_SCRIPT="$path"; break; }
done
[[ -z "$SYNC_SCRIPT" ]] && exit 0

# Extract feature ID from spec.md
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
FEATURE_ID=""
[[ -f "$SPEC_FILE" ]] && FEATURE_ID=$(grep -E "^(epic|feature_id):" "$SPEC_FILE" | head -1 | sed 's/.*:[[:space:]]*//' | tr -d '"'"'")

# Run sync (timeout 30s)
cd "$PROJECT_ROOT" || exit 0
if [[ -n "$FEATURE_ID" ]]; then
  FEATURE_ID="$FEATURE_ID" timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1
else
  timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1
fi
exit 0
