#!/usr/bin/env bash
#
# SessionStart Hook - Register session in registry and start heartbeat
#
# Triggered: When Claude Code session starts
# Purpose: Track session for zombie prevention
#
# v0.35.3 - Fixed: use set +e for hook safety
# v0.35.x - Fixed: Don't create .specweave in non-project directories
# v1.0.71 - Fixed: Use specweave package location, not PROJECT_ROOT/dist

set +e  # CRITICAL: Never use set -e in hooks (causes cascading failures)

# =============================================================================
# CRITICAL FIX: Resolve specweave package location for CLI scripts
# =============================================================================
# Problem: Hooks referenced ${PROJECT_ROOT}/dist/src/cli/*.js which doesn't
# exist on user machines - they only have npm-installed specweave package.
#
# Solution: Find the specweave package via:
# 1. This hook's own location (hooks are inside the package)
# 2. Global npm root as fallback
# =============================================================================

# Get the directory where this hook script lives
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve specweave package root (hooks are at plugins/specweave/hooks/v2/)
# Walk up: v2 -> hooks -> specweave -> plugins -> package_root
resolve_specweave_package() {
  local hook_dir="$1"

  # From hooks/v2/ go up 4 levels to package root
  local package_root="$(cd "$hook_dir/../../../.." 2>/dev/null && pwd)"

  # Verify it's a valid specweave package (has dist/src/cli/)
  if [[ -d "$package_root/dist/src/cli" ]]; then
    echo "$package_root"
    return 0
  fi

  # Fallback: Try global npm installation
  local npm_root
  npm_root="$(npm root -g 2>/dev/null)"
  if [[ -d "$npm_root/specweave/dist/src/cli" ]]; then
    echo "$npm_root/specweave"
    return 0
  fi

  # Fallback: Try npx resolution
  local npx_path
  npx_path="$(which specweave 2>/dev/null)"
  if [[ -n "$npx_path" ]]; then
    # specweave binary is at package/bin/specweave.js, go up one level
    local bin_dir="$(dirname "$npx_path")"
    local pkg_dir="$(cd "$bin_dir/.." 2>/dev/null && pwd)"
    if [[ -d "$pkg_dir/dist/src/cli" ]]; then
      echo "$pkg_dir"
      return 0
    fi
  fi

  return 1
}

SPECWEAVE_PKG="$(resolve_specweave_package "$HOOK_DIR")"

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
  log "SPECWEAVE_PKG resolved to: ${SPECWEAVE_PKG:-NOT_FOUND}"

  # If specweave package not found, skip session tracking (non-fatal)
  if [[ -z "$SPECWEAVE_PKG" ]]; then
    log "WARNING: Could not resolve specweave package location - skipping session tracking"
    echo '{"continue": true}'
    exit 0
  fi

  # Check if CI mode
  if is_ci_mode; then
    log "CI/non-interactive mode detected - using simplified tracking"

    # Register session but skip background processes
    if node "${SPECWEAVE_PKG}/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code" >> "$LOG_FILE" 2>&1; then
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
  if node "${SPECWEAVE_PKG}/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code" >> "$LOG_FILE" 2>&1; then
    log "Session registered: $SESSION_ID"
  else
    log "WARNING: Failed to register session (non-fatal)"
  fi

  # Start heartbeat process in background (detached)
  # Use SPECWEAVE_PKG for the heartbeat script location
  nohup bash "${SPECWEAVE_PKG}/plugins/specweave/scripts/heartbeat.sh" "$SESSION_ID" \
    > "${PROJECT_ROOT}/.specweave/logs/heartbeat-${SESSION_ID}.log" 2>&1 &

  HEARTBEAT_PID=$!
  log "Heartbeat process started (PID: $HEARTBEAT_PID)"

  # Add heartbeat PID to session's child PIDs
  if [ -n "$HEARTBEAT_PID" ]; then
    node "${SPECWEAVE_PKG}/dist/src/cli/add-child-pid.js" "$SESSION_ID" "$HEARTBEAT_PID" >> "$LOG_FILE" 2>&1 || true
  fi

  log "SessionStart hook completed successfully"

  # Return success JSON for Claude Code
  echo '{"continue": true}'
} || {
  # Hook failure should not block Claude Code startup
  log "ERROR: SessionStart hook failed, but allowing session to continue"
  echo '{"continue": true, "systemMessage": "Session tracking failed (non-fatal)"}'
}
