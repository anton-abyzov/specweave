#!/usr/bin/env bash
#
# Beta Testing - Metrics Collection Script
#
# Collects zombie prevention metrics from local system:
# - Cleanup events from cleanup.log
# - Notifications sent
# - Errors in session logs
# - Zombie process incidents
# - Uptime statistics
#
# Usage: bash scripts/beta/collect-metrics.sh [--output-dir DIR]
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

OUTPUT_DIR="${1:-.specweave/beta-metrics}"
METRICS_FILE="$OUTPUT_DIR/metrics-$(date +%Y%m%d-%H%M%S).json"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Beta Testing - Metrics Collection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. System information
echo "Collecting system information..."
PLATFORM=$(uname -s)
OS_VERSION=$(uname -r)
NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
SPECWEAVE_VERSION=$(jq -r .version package.json 2>/dev/null || echo "unknown")

# 2. Cleanup events from cleanup.log
echo "Analyzing cleanup.log..."
CLEANUP_LOG=".specweave/state/cleanup.log"
if [ -f "$CLEANUP_LOG" ]; then
  TOTAL_CLEANUPS=$(grep -c "\[INFO\] Cleaning up stale session" "$CLEANUP_LOG" 2>/dev/null || echo "0")
  TOTAL_KILLS=$(grep -c "Killed process" "$CLEANUP_LOG" 2>/dev/null || echo "0")
  CLEANUP_ERRORS=$(grep -c "\[ERROR\]" "$CLEANUP_LOG" 2>/dev/null || echo "0")
else
  TOTAL_CLEANUPS=0
  TOTAL_KILLS=0
  CLEANUP_ERRORS=0
fi

# 3. Notification count (macOS osascript notifications)
echo "Checking notification count..."
NOTIFICATION_LOG=".specweave/state/notifications.log"
if [ -f "$NOTIFICATION_LOG" ]; then
  TOTAL_NOTIFICATIONS=$(wc -l < "$NOTIFICATION_LOG" 2>/dev/null || echo "0")
else
  TOTAL_NOTIFICATIONS=0
fi

# 4. Zombie process incidents (find stale sessions)
echo "Scanning for zombie incidents..."
REGISTRY=".specweave/state/.session-registry.json"
if [ -f "$REGISTRY" ]; then
  ACTIVE_SESSIONS=$(jq 'length' "$REGISTRY" 2>/dev/null || echo "0")

  # Count stale sessions (last heartbeat > 5 minutes ago)
  STALE_SESSIONS=$(node -e "
    try {
      const fs = require('fs');
      const registry = JSON.parse(fs.readFileSync('$REGISTRY', 'utf-8'));
      const now = Date.now();
      const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const stale = Object.values(registry).filter(s => {
        const lastHeartbeat = new Date(s.last_heartbeat).getTime();
        return (now - lastHeartbeat) > STALE_THRESHOLD;
      });
      console.log(stale.length);
    } catch (err) {
      console.log('0');
    }
  " 2>/dev/null || echo "0")
else
  ACTIVE_SESSIONS=0
  STALE_SESSIONS=0
fi

# 5. Error count from session logs
echo "Analyzing session logs..."
SESSION_LOGS_DIR=".specweave/state/sessions"
SESSION_ERRORS=0
if [ -d "$SESSION_LOGS_DIR" ]; then
  SESSION_ERRORS=$(find "$SESSION_LOGS_DIR" -name "*.log" -exec grep -c "\[ERROR\]" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
fi

# 6. Uptime calculation (time since first session created)
echo "Calculating uptime..."
if [ -f "$CLEANUP_LOG" ]; then
  FIRST_LOG=$(head -1 "$CLEANUP_LOG" | grep -oE '^\[.*?\]' | tr -d '[]' || echo "")
  if [ -n "$FIRST_LOG" ]; then
    FIRST_TIMESTAMP=$(date -j -f "%Y-%m-%d %H:%M:%S" "$FIRST_LOG" +%s 2>/dev/null || echo "0")
    NOW_TIMESTAMP=$(date +%s)
    UPTIME_HOURS=$(( (NOW_TIMESTAMP - FIRST_TIMESTAMP) / 3600 ))
  else
    UPTIME_HOURS=0
  fi
else
  UPTIME_HOURS=0
fi

# 7. Generate JSON output
echo "Generating metrics report..."
cat > "$METRICS_FILE" <<EOF
{
  "collection_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "system_info": {
    "platform": "$PLATFORM",
    "os_version": "$OS_VERSION",
    "node_version": "$NODE_VERSION",
    "specweave_version": "$SPECWEAVE_VERSION"
  },
  "cleanup_events": {
    "total_cleanups": $TOTAL_CLEANUPS,
    "total_kills": $TOTAL_KILLS,
    "cleanup_errors": $CLEANUP_ERRORS
  },
  "notifications": {
    "total_sent": $TOTAL_NOTIFICATIONS
  },
  "zombie_incidents": {
    "active_sessions": $ACTIVE_SESSIONS,
    "stale_sessions": $STALE_SESSIONS
  },
  "errors": {
    "session_errors": $SESSION_ERRORS
  },
  "uptime": {
    "hours": $UPTIME_HOURS
  },
  "health_score": {
    "manual_cleanups_needed": 0,
    "false_positive_notifications": 0,
    "performance_impact": "none",
    "critical_bugs": 0
  }
}
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Metrics Collection Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Platform:              $PLATFORM ($OS_VERSION)"
echo "Node.js:               $NODE_VERSION"
echo "SpecWeave:             $SPECWEAVE_VERSION"
echo ""
echo "Cleanup Events:        $TOTAL_CLEANUPS"
echo "Process Kills:         $TOTAL_KILLS"
echo "Cleanup Errors:        $CLEANUP_ERRORS"
echo ""
echo "Notifications Sent:    $TOTAL_NOTIFICATIONS"
echo ""
echo "Active Sessions:       $ACTIVE_SESSIONS"
echo "Stale Sessions:        $STALE_SESSIONS"
echo ""
echo "Session Errors:        $SESSION_ERRORS"
echo ""
echo "Uptime:                ${UPTIME_HOURS}h"
echo ""
echo "✅ Metrics saved to: $METRICS_FILE"
echo ""
echo "Next steps:"
echo "  1. Review health_score metrics (manual edits required)"
echo "  2. Complete beta-feedback-template.md"
echo "  3. Send metrics to beta coordinator"
echo ""
