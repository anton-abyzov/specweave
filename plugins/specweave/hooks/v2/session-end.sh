#!/usr/bin/env bash
#
# SessionEnd Hook - Cleanup session and kill child processes
#
# Triggered: When Claude Code session ends normally
# Purpose: Clean up session registry and child processes
#
# v0.35.3 - Fixed: use set +e for hook safety
# v0.35.x - Fixed: Don't create .specweave in non-project directories
# v1.0.71 - Fixed: Use specweave package location, not PROJECT_ROOT/dist

set +e  # CRITICAL: Never use set -e in hooks (causes cascading failures)

# =============================================================================
# CRITICAL FIX: Resolve specweave package location for CLI scripts
# =============================================================================
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_specweave_package() {
  local hook_dir="$1"

  # From hooks/v2/ go up 4 levels to package root
  local package_root="$(cd "$hook_dir/../../../.." 2>/dev/null && pwd)"

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

  # Fallback: Try which specweave
  local npx_path
  npx_path="$(which specweave 2>/dev/null)"
  if [[ -n "$npx_path" ]]; then
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
  # NOT a SpecWeave project - exit silently
  echo '{"continue": true}'
  exit 0
fi

# If specweave package not found, exit gracefully
if [[ -z "$SPECWEAVE_PKG" ]]; then
  echo '{"continue": true}'
  exit 0
fi

LOG_DIR="${PROJECT_ROOT}/.specweave/logs/sessions"

# Find session by current PID
SESSION_INFO=$(node "${SPECWEAVE_PKG}/dist/src/cli/find-session-by-pid.js" $$ 2>/dev/null || echo "")

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
  if node "${SPECWEAVE_PKG}/dist/src/cli/remove-session.js" "$SESSION_ID" >> "$LOG_FILE" 2>&1; then
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
