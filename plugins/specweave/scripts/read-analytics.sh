#!/bin/bash
# read-analytics.sh - Display SpecWeave usage analytics dashboard
#
# Usage:
#   bash read-analytics.sh [OPTIONS]
#
# Options:
#   --since DATE      Start date (YYYY-MM-DD)
#   --until DATE      End date (YYYY-MM-DD)
#   --limit N         Number of items in top lists (default: 10)
#   --type TYPE       Filter by type (command|skill|agent)
#   --export FORMAT   Export to json or csv
#
# Performance: ~50ms for typical datasets

set +e

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "Not a SpecWeave project"
  exit 0
fi

ANALYTICS_DIR="$PROJECT_ROOT/.specweave/state/analytics"
EVENTS_FILE="$ANALYTICS_DIR/events.jsonl"

# Parse arguments
SINCE=""
UNTIL=""
LIMIT=10
TYPE_FILTER=""
EXPORT_FORMAT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since)
      SINCE="$2"
      shift 2
      ;;
    --until)
      UNTIL="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --type)
      TYPE_FILTER="$2"
      shift 2
      ;;
    --export)
      EXPORT_FORMAT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Default to last 30 days if no since date
if [[ -z "$SINCE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    SINCE=$(date -v-30d +%Y-%m-%d)
  else
    SINCE=$(date -d "30 days ago" +%Y-%m-%d)
  fi
fi

# Check if events file exists
if [[ ! -f "$EVENTS_FILE" ]] || [[ ! -s "$EVENTS_FILE" ]]; then
  echo ""
  echo "📊 SpecWeave Usage Analytics"
  echo "════════════════════════════════════════════════════════════════════"
  echo ""
  echo "No analytics data recorded yet."
  echo ""
  echo "Analytics will be collected as you use SpecWeave commands."
  echo ""
  exit 0
fi

# Read and filter events
EVENTS=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  # Extract timestamp for filtering
  if command -v jq >/dev/null 2>&1; then
    TS=$(echo "$line" | jq -r '.timestamp // ""' 2>/dev/null)
    EVT_TYPE=$(echo "$line" | jq -r '.type // ""' 2>/dev/null)
  else
    TS=$(echo "$line" | grep -oP '"timestamp"\s*:\s*"\K[^"]+' 2>/dev/null || echo "")
    EVT_TYPE=$(echo "$line" | grep -oP '"type"\s*:\s*"\K[^"]+' 2>/dev/null || echo "")
  fi

  # Date filter
  [[ -n "$SINCE" ]] && [[ "$TS" < "${SINCE}T00:00:00" ]] && continue
  [[ -n "$UNTIL" ]] && [[ "$TS" > "${UNTIL}T23:59:59" ]] && continue

  # Type filter
  [[ -n "$TYPE_FILTER" ]] && [[ "$EVT_TYPE" != "$TYPE_FILTER" ]] && continue

  EVENTS="${EVENTS}${line}\n"
done < "$EVENTS_FILE"

# Count totals
TOTAL_EVENTS=$(echo -e "$EVENTS" | grep -c '"type"' 2>/dev/null || echo "0")
COMMAND_COUNT=$(echo -e "$EVENTS" | grep -c '"type":"command"' 2>/dev/null || echo "0")
SKILL_COUNT=$(echo -e "$EVENTS" | grep -c '"type":"skill"' 2>/dev/null || echo "0")
AGENT_COUNT=$(echo -e "$EVENTS" | grep -c '"type":"agent"' 2>/dev/null || echo "0")
SUCCESS_COUNT=$(echo -e "$EVENTS" | grep -c '"success":true' 2>/dev/null || echo "0")

# Calculate success rate
if [[ "$TOTAL_EVENTS" -gt 0 ]]; then
  SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_EVENTS))
else
  SUCCESS_RATE=100
fi

# Export if requested
if [[ "$EXPORT_FORMAT" == "json" ]]; then
  EXPORT_DIR="$ANALYTICS_DIR/exports"
  mkdir -p "$EXPORT_DIR" 2>/dev/null
  EXPORT_FILE="$EXPORT_DIR/analytics-$(date +%Y-%m-%d).json"

  echo '{' > "$EXPORT_FILE"
  echo "  \"exportedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$EXPORT_FILE"
  echo "  \"since\": \"$SINCE\"," >> "$EXPORT_FILE"
  echo "  \"until\": \"${UNTIL:-$(date +%Y-%m-%d)}\"," >> "$EXPORT_FILE"
  echo "  \"totalEvents\": $TOTAL_EVENTS," >> "$EXPORT_FILE"
  echo "  \"commands\": $COMMAND_COUNT," >> "$EXPORT_FILE"
  echo "  \"skills\": $SKILL_COUNT," >> "$EXPORT_FILE"
  echo "  \"agents\": $AGENT_COUNT," >> "$EXPORT_FILE"
  echo "  \"successRate\": $SUCCESS_RATE" >> "$EXPORT_FILE"
  echo '}' >> "$EXPORT_FILE"

  echo ""
  echo "✅ Analytics exported to: $EXPORT_FILE"
  echo ""
  exit 0
fi

if [[ "$EXPORT_FORMAT" == "csv" ]]; then
  EXPORT_DIR="$ANALYTICS_DIR/exports"
  mkdir -p "$EXPORT_DIR" 2>/dev/null
  EXPORT_FILE="$EXPORT_DIR/analytics-$(date +%Y-%m-%d).csv"

  echo "timestamp,type,name,plugin,increment,success,duration" > "$EXPORT_FILE"

  echo -e "$EVENTS" | while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if command -v jq >/dev/null 2>&1; then
      TS=$(echo "$line" | jq -r '.timestamp // ""')
      TYPE=$(echo "$line" | jq -r '.type // ""')
      NAME=$(echo "$line" | jq -r '.name // ""')
      PLUGIN=$(echo "$line" | jq -r '.plugin // ""')
      INC=$(echo "$line" | jq -r '.increment // ""')
      SUCCESS=$(echo "$line" | jq -r '.success // true')
      DUR=$(echo "$line" | jq -r '.duration // ""')
      echo "$TS,$TYPE,$NAME,$PLUGIN,$INC,$SUCCESS,$DUR" >> "$EXPORT_FILE"
    fi
  done

  echo ""
  echo "✅ Analytics exported to: $EXPORT_FILE"
  echo ""
  exit 0
fi

# Display dashboard
LINE68="════════════════════════════════════════════════════════════════════"
LINE68_THIN="────────────────────────────────────────────────────────────────────"

echo ""
echo "📊 SpecWeave Usage Analytics"
echo "$LINE68"
echo ""
echo "Period: $SINCE to ${UNTIL:-$(date +%Y-%m-%d)}"
echo "Total Events: $TOTAL_EVENTS | Success Rate: ${SUCCESS_RATE}%"
echo ""

# Top Commands
if [[ "$COMMAND_COUNT" -gt 0 ]]; then
  echo "TOP COMMANDS                          Count    Success   Avg(ms)"
  echo "$LINE68_THIN"

  if command -v jq >/dev/null 2>&1; then
    echo -e "$EVENTS" | grep '"type":"command"' | jq -r '.name' 2>/dev/null | sort | uniq -c | sort -rn | head -$LIMIT | while read -r count name; do
      # Calculate success rate for this command
      CMD_TOTAL=$(echo -e "$EVENTS" | grep "\"name\":\"$name\"" | wc -l | tr -d ' ')
      CMD_SUCCESS=$(echo -e "$EVENTS" | grep "\"name\":\"$name\"" | grep '"success":true' | wc -l | tr -d ' ')
      CMD_RATE=$((CMD_SUCCESS * 100 / CMD_TOTAL))

      # Pad name with dots
      PADDED_NAME=$(printf "%-35s" "$name" | tr ' ' '.')
      printf "%s %8s %7s%%\n" "$PADDED_NAME" "$count" "$CMD_RATE"
    done
  else
    echo -e "$EVENTS" | grep '"type":"command"' | grep -oP '"name"\s*:\s*"\K[^"]+' | sort | uniq -c | sort -rn | head -$LIMIT | while read -r count name; do
      PADDED_NAME=$(printf "%-35s" "$name" | tr ' ' '.')
      printf "%s %8s\n" "$PADDED_NAME" "$count"
    done
  fi
  echo ""
fi

# Top Skills
if [[ "$SKILL_COUNT" -gt 0 ]]; then
  echo "TOP SKILLS                            Count    Success   Plugin"
  echo "$LINE68_THIN"

  if command -v jq >/dev/null 2>&1; then
    echo -e "$EVENTS" | grep '"type":"skill"' | jq -r '.name' 2>/dev/null | sort | uniq -c | sort -rn | head -$LIMIT | while read -r count name; do
      PADDED_NAME=$(printf "%-35s" "$name" | tr ' ' '.')
      PLUGIN=$(echo -e "$EVENTS" | grep "\"name\":\"$name\"" | jq -r '.plugin // "-"' 2>/dev/null | head -1)
      printf "%s %8s          %s\n" "$PADDED_NAME" "$count" "$PLUGIN"
    done
  else
    echo -e "$EVENTS" | grep '"type":"skill"' | grep -oP '"name"\s*:\s*"\K[^"]+' | sort | uniq -c | sort -rn | head -$LIMIT
  fi
  echo ""
fi

# Top Agents
if [[ "$AGENT_COUNT" -gt 0 ]]; then
  echo "TOP AGENTS                            Count    Success   Plugin"
  echo "$LINE68_THIN"

  if command -v jq >/dev/null 2>&1; then
    echo -e "$EVENTS" | grep '"type":"agent"' | jq -r '.name' 2>/dev/null | sort | uniq -c | sort -rn | head -$LIMIT | while read -r count name; do
      PADDED_NAME=$(printf "%-35s" "$name" | tr ' ' '.')
      PLUGIN=$(echo -e "$EVENTS" | grep "\"name\":\"$name\"" | jq -r '.plugin // "-"' 2>/dev/null | head -1)
      printf "%s %8s          %s\n" "$PADDED_NAME" "$count" "$PLUGIN"
    done
  else
    echo -e "$EVENTS" | grep '"type":"agent"' | grep -oP '"name"\s*:\s*"\K[^"]+' | sort | uniq -c | sort -rn | head -$LIMIT
  fi
  echo ""
fi

# Show summary if no events of specific types
if [[ "$COMMAND_COUNT" -eq 0 ]] && [[ "$SKILL_COUNT" -eq 0 ]] && [[ "$AGENT_COUNT" -eq 0 ]]; then
  echo "No events matching filters."
  echo ""
fi

# Daily activity (last 7 days)
echo "ACTIVITY (recent days)"
echo "$LINE68_THIN"

for i in 6 5 4 3 2 1 0; do
  if [[ "$(uname)" == "Darwin" ]]; then
    DAY=$(date -v-${i}d +%Y-%m-%d)
    DAY_NAME=$(date -v-${i}d +%a)
  else
    DAY=$(date -d "$i days ago" +%Y-%m-%d)
    DAY_NAME=$(date -d "$i days ago" +%a)
  fi

  DAY_COUNT=$(echo -e "$EVENTS" | grep "\"timestamp\":\"$DAY" | wc -l | tr -d ' ')

  # Simple bar chart
  BAR=""
  BAR_LEN=$((DAY_COUNT / 3))  # Scale down for display
  [[ $BAR_LEN -gt 10 ]] && BAR_LEN=10

  for ((j=0; j<BAR_LEN; j++)); do
    BAR="${BAR}█"
  done
  for ((j=BAR_LEN; j<10; j++)); do
    BAR="${BAR}░"
  done

  printf "%s: %s %s\n" "$DAY_NAME" "$BAR" "$DAY_COUNT"
done

echo ""
