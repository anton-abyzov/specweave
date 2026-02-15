#!/bin/bash
# track-analytics.sh - Track SpecWeave command/skill/agent usage
#
# Usage:
#   bash track-analytics.sh command <name> [--plugin <plugin>] [--success] [--error <msg>] [--duration <ms>]
#   bash track-analytics.sh skill <name> [--plugin <plugin>] [--success] [--error <msg>]
#   bash track-analytics.sh agent <name> [--plugin <plugin>] [--success] [--error <msg>]
#
# This script appends events to .specweave/state/analytics/events.jsonl
# It is designed to be fast (<10ms) and non-blocking.

set +e

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

ANALYTICS_DIR="$PROJECT_ROOT/.specweave/state/analytics"
EVENTS_FILE="$ANALYTICS_DIR/events.jsonl"

# Create analytics directory if needed
mkdir -p "$ANALYTICS_DIR" 2>/dev/null

# Parse arguments
# IMPORTANT: Event type values ("command", "skill", "agent") are consumed by:
#   - src/dashboard/server/data/dashboard-data-aggregator.ts (aggregation)
#   - src/core/analytics/analytics-aggregator.ts (CLI analytics)
# If you change these type names, update the TypeScript consumers.
EVENT_TYPE="${1:-command}"
EVENT_NAME="${2:-unknown}"
shift 2 2>/dev/null || true

PLUGIN=""
SUCCESS="true"
ERROR=""
DURATION=""
INCREMENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plugin)
      PLUGIN="$2"
      shift 2
      ;;
    --success)
      SUCCESS="true"
      shift
      ;;
    --error)
      SUCCESS="false"
      ERROR="$2"
      shift 2
      ;;
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --increment)
      INCREMENT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Detect current active increment if not provided
if [[ -z "$INCREMENT" ]]; then
  CACHE_FILE="$PROJECT_ROOT/.specweave/state/status-line.json"
  if [[ -f "$CACHE_FILE" ]] && command -v jq >/dev/null 2>&1; then
    INCREMENT=$(jq -r '.incrementId // ""' "$CACHE_FILE" 2>/dev/null || echo "")
  fi
fi

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Build JSON event
EVENT='{"timestamp":"'"$TIMESTAMP"'","type":"'"$EVENT_TYPE"'","name":"'"$EVENT_NAME"'","success":'"$SUCCESS"

[[ -n "$PLUGIN" ]] && EVENT="$EVENT"',"plugin":"'"$PLUGIN"'"'
[[ -n "$INCREMENT" ]] && EVENT="$EVENT"',"increment":"'"$INCREMENT"'"'
[[ -n "$DURATION" ]] && EVENT="$EVENT"',"duration":'"$DURATION"
[[ -n "$ERROR" ]] && EVENT="$EVENT"',"error":"'"${ERROR//\"/\\\"}"'"'

EVENT="$EVENT"'}'

# Append to events file
echo "$EVENT" >> "$EVENTS_FILE" 2>/dev/null

exit 0
