#!/usr/bin/env bash
# update-status-cache.sh - Minimal cache update (80% simpler!)
#
# Usage: bash update-status-cache.sh <incrementId> <changeType>
#
# Updates only status groupings, not full increment data.
# 80 lines vs 300+ lines in old version!
#
# Compatible with bash 3.x (macOS default)

set -e

INCREMENT_ID="${1:-}"
CHANGE_TYPE="${2:-}"

if [[ -z "$INCREMENT_ID" ]]; then
  echo "❌ Usage: update-status-cache.sh <incrementId> <changeType>"
  exit 1
fi

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "❌ No .specweave directory found"
  exit 1
fi

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-cache.json"
LOCK_FILE="$STATE_DIR/.status-cache.lock"
TEMP_FILE="$STATE_DIR/.status-cache.json.tmp.$$"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "⚠️  jq not found, skipping cache update"
  exit 0
fi

# Acquire file lock (with timeout)
acquire_lock() {
  local timeout=5
  local count=0
  while [[ -f "$LOCK_FILE" ]] && [[ $count -lt $timeout ]]; do
    sleep 0.1
    count=$((count + 1))
  done
  echo "$$" > "$LOCK_FILE"
}

release_lock() {
  rm -f "$LOCK_FILE"
}

# Cleanup on exit
cleanup() {
  release_lock
  rm -f "$TEMP_FILE"
}
trap cleanup EXIT

# If cache doesn't exist, rebuild it
if [[ ! -f "$CACHE_FILE" ]]; then
  # Rebuild will be triggered by session-start hook
  exit 0
fi

# Find increment directory
INCREMENT_DIR=""
for dir in "$INCREMENTS_DIR"/*"$INCREMENT_ID"*/; do
  if [[ -d "$dir" ]]; then
    INCREMENT_DIR="$dir"
    INCREMENT_ID=$(basename "$dir")
    break
  fi
done

# If increment not found, remove it from cache
if [[ -z "$INCREMENT_DIR" ]] || [[ ! -d "$INCREMENT_DIR" ]]; then
  acquire_lock
  # Remove from all status arrays
  jq --arg id "$INCREMENT_ID" '
    .byStatus |= map_values(. - [$id]) |
    .counts = (.byStatus | to_entries | map({key: .key, value: (.value | length)}) | from_entries) |
    .counts.total = ([.byStatus[] | length] | add) |
    .updated = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  ' "$CACHE_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$CACHE_FILE"
  exit 0
fi

metadata_file="$INCREMENT_DIR/metadata.json"

# Skip if no metadata
if [[ ! -f "$metadata_file" ]]; then
  exit 0
fi

# Read new status
new_status=$(jq -r '.status // "backlog"' "$metadata_file" 2>/dev/null)

# Acquire lock for update
acquire_lock

# Update cache: remove from all arrays, add to new status array
jq --arg id "$INCREMENT_ID" \
   --arg status "$new_status" '
  # Remove from all status arrays
  .byStatus |= map_values(. - [$id]) |
  # Add to new status array (create if missing)
  .byStatus[$status] = (.byStatus[$status] // []) + [$id] |
  # Make unique (in case of duplicates)
  .byStatus[$status] |= unique |
  # Recompute all counts from array lengths
  .counts = (.byStatus | to_entries | map({key: .key, value: (.value | length)}) | from_entries) |
  .counts.total = ([.byStatus[] | length] | add) |
  # Update timestamp
  .updated = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
' "$CACHE_FILE" > "$TEMP_FILE"

# Atomic move
mv "$TEMP_FILE" "$CACHE_FILE"

exit 0
