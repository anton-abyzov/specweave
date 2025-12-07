#!/bin/bash
# session-start.sh - Launch background processor on session start
# Ultra-fast, non-blocking
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Consume stdin
cat > /dev/null

# === CRITICAL: Guard Verification ===
# Check that essential guards are available to prevent session hangs
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARDS_DIR="$HOOK_DIR/../guards"
BASH_FILE_GUARD="$GUARDS_DIR/bash-file-guard.sh"

if [[ ! -f "$BASH_FILE_GUARD" ]] || [[ ! -x "$BASH_FILE_GUARD" ]]; then
  # Output warning as system message
  echo '{"continue":true,"systemMessage":"⚠️ CRITICAL: bash-file-guard.sh not found or not executable! Session hang protection DISABLED. Run: bash scripts/refresh-marketplace.sh"}'
  # Continue session but warn about missing protection
fi

# === MCP Connection Health Check ===
# Check for recent MCP drops that could cause session hangs
CLAUDE_DEBUG="$HOME/.claude/debug/latest"
if [[ -f "$CLAUDE_DEBUG" ]]; then
  # Count MCP drops in last debug log (only check last 500 lines for speed)
  MCP_DROPS=$(tail -500 "$CLAUDE_DEBUG" 2>/dev/null | grep -c "WS-IDE connection dropped" 2>/dev/null || echo "0")
  if [[ "$MCP_DROPS" -gt 2 ]]; then
    echo "{\"continue\":true,\"systemMessage\":\"⚠️ MCP Connection Issues Detected: $MCP_DROPS drops in last session. Consider: (1) Restart VS Code Extension Host (Cmd+Shift+P), (2) Close extra files, (3) Use terminal mode if issues persist.\"}"
  fi
fi

# Background processor paths (HOOK_DIR already defined above)
PROCESSOR="$HOOK_DIR/../queue/processor.sh"
SCHEDULER_STARTUP="$HOOK_DIR/../../lib/scheduler-startup.sh"
SESSION_WATCHDOG="$PROJECT_ROOT/plugins/specweave/scripts/session-watchdog.sh"
SCRIPTS_WATCHDOG="$(dirname "$HOOK_DIR")/../../scripts/session-watchdog.sh"
PLUGIN_ROOT="$(dirname "$HOOK_DIR")/.."
SCRIPTS_DIR="$PLUGIN_ROOT/scripts"

# === Dashboard Cache Validation (v0.34.0 - Instant Status Commands) ===
# Rebuild cache if missing or schema version mismatch
CACHE_FILE="$PROJECT_ROOT/.specweave/state/dashboard.json"
REBUILD_SCRIPT="$SCRIPTS_DIR/rebuild-dashboard-cache.sh"
CACHE_VERSION_EXPECTED=1

if [[ -f "$REBUILD_SCRIPT" ]]; then
  SHOULD_REBUILD=false

  if [[ ! -f "$CACHE_FILE" ]]; then
    # Cache missing - rebuild
    SHOULD_REBUILD=true
  elif command -v jq >/dev/null 2>&1; then
    # Check version (only if jq available)
    CACHE_VERSION=$(jq -r '.version // 0' "$CACHE_FILE" 2>/dev/null)
    if [[ "$CACHE_VERSION" != "$CACHE_VERSION_EXPECTED" ]]; then
      SHOULD_REBUILD=true
    fi
  fi

  if [[ "$SHOULD_REBUILD" == "true" ]]; then
    # Rebuild in background to not block session start
    nohup bash "$REBUILD_SCRIPT" --quiet > /dev/null 2>&1 &
    disown 2>/dev/null
  fi
fi

# Launch queue processor in background (daemon mode)
if [[ -f "$PROCESSOR" ]]; then
  nohup bash "$PROCESSOR" --daemon > /dev/null 2>&1 &
  disown 2>/dev/null
fi

# Check for due scheduled jobs (non-blocking)
if [[ -f "$SCHEDULER_STARTUP" ]]; then
  bash "$SCHEDULER_STARTUP" 2>/dev/null || true
fi

# === LAYER 2: Auto-Start Session Watchdog ===
# Start the watchdog daemon to detect stuck sessions
# Uses short interval (30s) and threshold (120s) for fast detection
WATCHDOG_SCRIPT=""
if [[ -f "$SESSION_WATCHDOG" ]]; then
  WATCHDOG_SCRIPT="$SESSION_WATCHDOG"
elif [[ -f "$SCRIPTS_WATCHDOG" ]]; then
  WATCHDOG_SCRIPT="$SCRIPTS_WATCHDOG"
fi

if [[ -n "$WATCHDOG_SCRIPT" ]]; then
  # Check if watchdog is already running
  WATCHDOG_PID_FILE="$PROJECT_ROOT/.specweave/state/.watchdog.pid"
  if [[ -f "$WATCHDOG_PID_FILE" ]]; then
    EXISTING_PID=$(cat "$WATCHDOG_PID_FILE" 2>/dev/null)
    if ! kill -0 "$EXISTING_PID" 2>/dev/null; then
      # Stale PID file, clean it up
      rm -f "$WATCHDOG_PID_FILE"
    fi
  fi

  # Start watchdog if not already running
  if [[ ! -f "$WATCHDOG_PID_FILE" ]] || ! kill -0 "$(cat "$WATCHDOG_PID_FILE" 2>/dev/null)" 2>/dev/null; then
    mkdir -p "$PROJECT_ROOT/.specweave/state"
    (
      export STUCK_THRESHOLD=120  # 2 minutes - faster detection
      export CHECK_INTERVAL=30    # Check every 30 seconds
      export SPECWEAVE_ROOT="$PROJECT_ROOT/.specweave"
      nohup bash "$WATCHDOG_SCRIPT" --daemon > /dev/null 2>&1 &
      echo $! > "$WATCHDOG_PID_FILE"
    )
    disown 2>/dev/null
  fi
fi

exit 0
