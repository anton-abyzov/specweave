#!/usr/bin/env bash
#
# SessionEnd Hook - Cleanup session and kill child processes
#
# Triggered: When Claude Code session ends normally
# Purpose: Clean up session registry and child processes

set -euo pipefail

PROJECT_ROOT="${PWD}"
LOG_DIR="${PROJECT_ROOT}/.specweave/logs/sessions"

# Find session by current PID
SESSION_INFO=$(node "${PROJECT_ROOT}/dist/src/cli/find-session-by-pid.js" $$ 2>/dev/null || echo "")

if [ -z "$SESSION_INFO" ]; then
  # No session found, exit gracefully
  echo '{"continue": true}'
  exit 0
fi

# Extract session_id and child_pids from JSON
SESSION_ID=$(echo "$SESSION_INFO" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
CHILD_PIDS=$(echo "$SESSION_INFO" | grep -o '"child_pids":\[[^]]*\]' | grep -o '[0-9]\+' || echo "")

LOG_FILE="${LOG_DIR}/${SESSION_ID}.log"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" >> "$LOG_FILE" 2>&1 || true
}

# Main execution
{
  log "SessionEnd hook triggered (PID: $$)"

  # Kill all child processes
  if [ -n "$CHILD_PIDS" ]; then
    for pid in $CHILD_PIDS; do
      if kill -0 "$pid" 2>/dev/null; then
        log "Killing child PID: $pid (SIGTERM)"
        kill "$pid" 2>/dev/null || true

        # Wait 2 seconds, then SIGKILL if still alive
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
          log "Killing child PID: $pid (SIGKILL)"
          kill -9 "$pid" 2>/dev/null || true
        fi
      fi
    done
  fi

  # Remove session from registry
  if node "${PROJECT_ROOT}/dist/src/cli/remove-session.js" "$SESSION_ID" >> "$LOG_FILE" 2>&1; then
    log "Session removed from registry: $SESSION_ID"
  else
    log "WARNING: Failed to remove session from registry"
  fi

  # Clean up old session logs (>7 days)
  find "$LOG_DIR" -name "session-*.log" -mtime +7 -delete 2>/dev/null || true

  log "SessionEnd hook completed successfully"

  echo '{"continue": true}'
} || {
  # Hook failure should not block Claude Code shutdown
  echo '{"continue": true}'
}
