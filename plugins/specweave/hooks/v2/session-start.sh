#!/usr/bin/env bash
#
# SessionStart Hook - Register session in registry and start heartbeat
#
# Triggered: When Claude Code session starts
# Purpose: Track session for zombie prevention
#
# v0.35.3 - Fixed: use set +e for hook safety
# v0.35.x - Fixed: Don't create .specweave in non-project directories

set +e  # CRITICAL: Never use set -e in hooks (causes cascading failures)

# Find project root by searching upward for .specweave/ directory
find_specweave_root() {
  local dir="$1"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1  # NOT FOUND - do NOT fallback to pwd
}

PROJECT_ROOT="$(find_specweave_root "$PWD")"
if [[ -z "$PROJECT_ROOT" ]]; then
  # NOT a SpecWeave project - exit silently without creating any files
  echo '{"continue": true}'
  exit 0
fi

SESSION_ID="session-$$-$(date +%s)"
LOG_DIR="${PROJECT_ROOT}/.specweave/logs/sessions"

# Ensure log directory exists (now safe - PROJECT_ROOT is validated)
mkdir -p "$LOG_DIR"

# Log file for this session
LOG_FILE="${LOG_DIR}/${SESSION_ID}.log"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" >> "$LOG_FILE"
}

# Detect CI/non-interactive mode
is_ci_mode() {
  [[ "${CI:-}" == "true" ]] || \
  [[ -z "${TERM:-}" ]] || \
  [[ "${TERM:-}" == "dumb" ]]
}

# Main execution
{
  log "SessionStart hook triggered (PID: $$)"

  # Check if CI mode
  if is_ci_mode; then
    log "CI/non-interactive mode detected - using simplified tracking"

    # Register session but skip background processes
    if node "${PROJECT_ROOT}/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code" >> "$LOG_FILE" 2>&1; then
      log "Session registered (CI mode): $SESSION_ID"
    else
      log "WARNING: Failed to register session (non-fatal)"
    fi

    log "SessionStart hook completed (CI mode, no heartbeat)"
    echo '{"continue": true}'
    exit 0
  fi

  # Interactive mode: full registration with heartbeat
  log "Interactive mode detected - full session tracking enabled"

  # Register session in registry
  if node "${PROJECT_ROOT}/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code" >> "$LOG_FILE" 2>&1; then
    log "Session registered: $SESSION_ID"
  else
    log "WARNING: Failed to register session (non-fatal)"
  fi

  # Start heartbeat process in background (detached)
  nohup bash "${PROJECT_ROOT}/plugins/specweave/scripts/heartbeat.sh" "$SESSION_ID" \
    > "${PROJECT_ROOT}/.specweave/logs/heartbeat-${SESSION_ID}.log" 2>&1 &

  HEARTBEAT_PID=$!
  log "Heartbeat process started (PID: $HEARTBEAT_PID)"

  # Add heartbeat PID to session's child PIDs
  if [ -n "$HEARTBEAT_PID" ]; then
    node "${PROJECT_ROOT}/dist/src/cli/add-child-pid.js" "$SESSION_ID" "$HEARTBEAT_PID" >> "$LOG_FILE" 2>&1 || true
  fi

  log "SessionStart hook completed successfully"

  # Return success JSON for Claude Code
  echo '{"continue": true}'
} || {
  # Hook failure should not block Claude Code startup
  log "ERROR: SessionStart hook failed, but allowing session to continue"
  echo '{"continue": true, "systemMessage": "Session tracking failed (non-fatal)"}'
}
