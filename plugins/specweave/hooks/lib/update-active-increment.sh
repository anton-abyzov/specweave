#!/usr/bin/env bash
#
# update-active-increment.sh (v0.26.15)
#
# Maintains .specweave/state/active-increment.json in sync with metadata.json
#
# CRITICAL FIX: Hooks depend on active-increment.json to know which increments to sync.
# Without this, post-task-completion.sh sees empty array and skips ALL sync work!
#
# See: Root cause analysis in increment 0059
#
set +e

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================
if [[ -n "$SPECWEAVE_PROJECT_ROOT" ]] && [[ -d "$SPECWEAVE_PROJECT_ROOT/.specweave" ]]; then
  PROJECT_ROOT="$SPECWEAVE_PROJECT_ROOT"
else
  PROJECT_ROOT="$PWD"
  while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
  done
  [[ ! -d "$PROJECT_ROOT/.specweave" ]] && PROJECT_ROOT="$PWD"
fi

STATE_DIR="$PROJECT_ROOT/.specweave/state"
ACTIVE_FILE="$STATE_DIR/active-increment.json"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
DEBUG_LOG="$PROJECT_ROOT/.specweave/logs/hooks-debug.log"

# No .specweave? Exit
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

mkdir -p "$STATE_DIR" 2>/dev/null || true

# ============================================================================
# SCAN ALL INCREMENTS FOR ACTIVE STATUS
# ============================================================================
# Strategy: Scan metadata.json files for status=active|planning|in-progress
# This matches what ActiveIncrementManager.smartUpdate() does in TypeScript

ACTIVE_IDS=()

while IFS= read -r metadata_file; do
  [[ -z "$metadata_file" ]] && continue

  # Extract status from metadata.json
  if command -v jq >/dev/null 2>&1; then
    status=$(jq -r '.status // "unknown"' "$metadata_file" 2>/dev/null || echo "unknown")
  else
    # Fallback: grep parsing
    status=$(grep -oP '"status"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "unknown")
  fi

  # Check if status is active-like
  if [[ "$status" == "active" ]] || [[ "$status" == "planning" ]] || [[ "$status" == "in-progress" ]]; then
    increment_id=$(basename "$(dirname "$metadata_file")")
    ACTIVE_IDS+=("$increment_id")
    echo "[$(date)] update-active-increment: Found active: $increment_id (status: $status)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
done < <(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" -not -path "*/_archive/*" 2>/dev/null)

# ============================================================================
# WRITE ACTIVE INCREMENT STATE (max 2)
# ============================================================================
# Take first 2 active increments (matches ActiveIncrementManager behavior)
ACTIVE_IDS=("${ACTIVE_IDS[@]:0:2}")

# Build JSON array
if [[ ${#ACTIVE_IDS[@]} -eq 0 ]]; then
  IDS_JSON="[]"
else
  # Build JSON array manually (no jq dependency)
  IDS_JSON="["
  for i in "${!ACTIVE_IDS[@]}"; do
    [[ $i -gt 0 ]] && IDS_JSON+=","
    IDS_JSON+="\"${ACTIVE_IDS[$i]}\""
  done
  IDS_JSON+="]"
fi

# Atomic write
TEMP_FILE="$ACTIVE_FILE.tmp"
cat > "$TEMP_FILE" << EOF
{
  "ids": $IDS_JSON,
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

mv "$TEMP_FILE" "$ACTIVE_FILE"

echo "[$(date)] update-active-increment: Updated with ${#ACTIVE_IDS[@]} active increment(s): ${ACTIVE_IDS[*]}" >> "$DEBUG_LOG" 2>/dev/null || true

exit 0
