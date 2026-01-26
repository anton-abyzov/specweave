#!/usr/bin/env bash
# rebuild-status-cache.sh - Full rebuild of minimal status cache
#
# Usage: bash rebuild-status-cache.sh [--quiet]
#
# Scans all increments and builds status → IDs mapping.
# Much simpler than old version (50 lines vs 200+)!
#
# Compatible with bash 3.x (macOS default)

set -e

QUIET=false
if [[ "$1" == "--quiet" ]]; then
  QUIET=true
fi

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  [[ "$QUIET" == "false" ]] && echo "❌ No .specweave directory found"
  exit 1
fi

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
CACHE_FILE="$STATE_DIR/status-cache.json"
TEMP_FILE="$STATE_DIR/.status-cache.json.tmp.$$"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  [[ "$QUIET" == "false" ]] && echo "⚠️  jq not found, skipping cache rebuild"
  exit 0
fi

# Initialize empty cache structure
jq -n '{
  version: 1,
  updated: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
  byStatus: {
    active: [],
    planning: [],
    ready_for_review: [],
    paused: [],
    backlog: [],
    completed: [],
    abandoned: []
  },
  counts: {
    total: 0,
    active: 0,
    planning: 0,
    ready_for_review: 0,
    paused: 0,
    backlog: 0,
    completed: 0,
    abandoned: 0
  }
}' > "$TEMP_FILE"

# Scan all increments (exclude _archive, _abandoned, _paused)
find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
  ! -path "*/_archive/*" \
  ! -path "*/_abandoned/*" \
  ! -path "*/_paused/*" \
  -type f 2>/dev/null | while read -r metadata_file; do
  increment_dir=$(dirname "$metadata_file")
  increment_id=$(basename "$increment_dir")

  # Read status
  status=$(jq -r '.status // "backlog"' "$metadata_file" 2>/dev/null)

  # Add to appropriate status array
  jq --arg id "$increment_id" \
     --arg status "$status" \
     '.byStatus[$status] += [$id]' \
     "$TEMP_FILE" > "$TEMP_FILE.2"
  mv "$TEMP_FILE.2" "$TEMP_FILE"
done

# Recompute all counts and make arrays unique
jq '
  # Make all status arrays unique (remove duplicates)
  .byStatus |= map_values(unique | sort) |
  # Recompute counts from array lengths
  .counts = (.byStatus | to_entries | map({key: .key, value: (.value | length)}) | from_entries) |
  .counts.total = ([.byStatus[] | length] | add) |
  # Update timestamp
  .updated = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
' "$TEMP_FILE" > "$CACHE_FILE"

# Cleanup
rm -f "$TEMP_FILE" "$TEMP_FILE.2"

if [[ "$QUIET" == "false" ]]; then
  total=$(jq -r '.counts.total' "$CACHE_FILE")
  echo "✅ Status cache rebuilt: $total increments"
fi

exit 0
