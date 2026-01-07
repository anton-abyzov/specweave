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

# Hook directory for finding other scripts
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# === Queue Processor (DISABLED BY DEFAULT) ===
# Background processor daemon is now OPT-IN ONLY
# Reason: Most hooks execute synchronously, making async queue unnecessary in VSCode
# To enable: export SPECWEAVE_ENABLE_PROCESSOR=1
#
# PROCESSOR DISABLED - Removed to eliminate:
# - Background daemon processes consuming resources
# - Complex async execution model when synchronous works fine
# - Lock contention between processor and hook execution
#
# Event handlers now execute directly in hooks (synchronous, simpler)

if [[ "${SPECWEAVE_ENABLE_PROCESSOR:-0}" == "1" ]] && [[ -f "$PROCESSOR" ]]; then
  nohup bash "$PROCESSOR" --daemon > /dev/null 2>&1 &
  disown 2>/dev/null
fi

# Check for due scheduled jobs (non-blocking)
if [[ -f "$SCHEDULER_STARTUP" ]]; then
  bash "$SCHEDULER_STARTUP" 2>/dev/null || true
fi

# Session watchdog REMOVED (ADR-0224)
# VSCode extension manages session lifecycle - no daemon needed
# For stuck sessions: Close Claude Code or restart Extension Host

exit 0
