#!/usr/bin/env bash
#
# Heartbeat Background Process
#
# Purpose:
#   - Updates session heartbeat timestamp every 5 seconds
#   - Polls parent process existence
#   - Self-terminates when parent dies
#   - Removes session from registry on exit
#
# Usage:
#   bash heartbeat.sh <session-id>
#
# Background Usage:
#   nohup bash heartbeat.sh <session-id> > .specweave/logs/heartbeat-<session-id>.log 2>&1 &

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SESSION_ID="${1:-}"
INTERVAL=5  # Heartbeat interval in seconds
PROJECT_ROOT="${PWD}"
REGISTRY_FILE="${PROJECT_ROOT}/.specweave/state/.session-registry.json"
LOG_FILE="${PROJECT_ROOT}/.specweave/logs/heartbeat-${SESSION_ID}.log"

# ============================================================================
# Validation
# ============================================================================

if [[ -z "$SESSION_ID" ]]; then
  echo "❌ ERROR: SESSION_ID required"
  echo "Usage: bash heartbeat.sh <session-id>"
  exit 1
fi

# Ensure logs directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# Helper Functions
# ============================================================================

log() {
  local level="$1"
  shift
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$level] [${SESSION_ID}] $*" >> "$LOG_FILE"
}

# Cross-platform parent process existence check
check_parent_alive() {
  local ppid="$PPID"

  if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows: Use tasklist
    tasklist /FI "PID eq $ppid" 2>/dev/null | grep -q "$ppid"
    return $?
  else
    # macOS/Linux: Use kill -0
    kill -0 "$ppid" 2>/dev/null
    return $?
  fi
}

# Update heartbeat timestamp via Node.js CLI
update_heartbeat() {
  node "${PROJECT_ROOT}/dist/src/cli/update-heartbeat.js" "$SESSION_ID" 2>&1 | \
    grep -v "^$" | head -5 >> "$LOG_FILE" || true
}

# Cleanup session on exit
cleanup_session() {
  log "INFO" "Parent process died, cleaning up session..."

  # Remove session from registry
  node "${PROJECT_ROOT}/dist/src/cli/remove-session.js" "$SESSION_ID" 2>&1 | \
    grep -v "^$" | head -5 >> "$LOG_FILE" || true

  log "INFO" "Session cleanup complete, exiting"
  exit 0
}

# ============================================================================
# Main Loop
# ============================================================================

log "INFO" "Heartbeat process started (parent PID: $PPID, interval: ${INTERVAL}s)"

# Trap signals for graceful shutdown
trap cleanup_session SIGTERM SIGINT

while true; do
  # Check if parent process still exists
  if ! check_parent_alive; then
    log "WARN" "Parent process (PID: $PPID) no longer exists"
    cleanup_session
  fi

  # Update heartbeat timestamp
  if update_heartbeat; then
    log "DEBUG" "Heartbeat updated"
  else
    log "ERROR" "Failed to update heartbeat"
  fi

  # Sleep for interval
  sleep "$INTERVAL"
done
