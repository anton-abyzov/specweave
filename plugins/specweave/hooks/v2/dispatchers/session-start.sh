#!/bin/bash
# session-start.sh - Session initialization dispatcher (ACTIVE HOOK)
#
# ✅ This is the ACTIVE session-start hook (configured in hooks.json)
# Ultra-fast, non-blocking startup for every Claude Code session
#
# v1.0.127: AUTO-LOAD PLUGINS based on project type (React, Express, K8s, etc.)
# v1.0.180: LSP language server check (detects missing binaries)
#
# Claude Code 2.1.2+ Enhancement:
# - Reads agent_type from SessionStart input for agent-specific initialization
# - Enables customized startup behavior based on which agent is running
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# ============================================================================
# SESSION CLEANUP: ALWAYS clear auto-mode.json (CRITICAL for session-scoped auto)
# Auto mode MUST be session-scoped - each new Claude Code session starts FRESH.
# This ensures: Session A runs /sw:auto → closes → Session B starts CLEAN
# ============================================================================
STATE_DIR="$PROJECT_ROOT/.specweave/state"
AUTO_MODE_FILE="$STATE_DIR/auto-mode.json"

if [[ -f "$AUTO_MODE_FILE" ]]; then
  rm -f "$AUTO_MODE_FILE" 2>/dev/null
  rm -f "$STATE_DIR/.stop-auto-dedup" 2>/dev/null
  rm -f "$STATE_DIR/.stop-auto-retry" 2>/dev/null
  rm -f "$STATE_DIR/.stop-auto-turns" 2>/dev/null
  # Log cleanup (non-blocking, fire-and-forget)
  mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SessionStart: Cleared auto-mode session files (session-scoped)" >> "$PROJECT_ROOT/.specweave/logs/session.log" 2>/dev/null
fi

# Read stdin to extract agent_type (Claude Code 2.1.2+)
INPUT=$(cat 2>/dev/null || echo '{}')
AGENT_TYPE=""
if command -v jq >/dev/null 2>&1; then
  AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // ""' 2>/dev/null || echo "")
fi

# Agent-specific initialization (Claude Code 2.1.2+)
if [[ -n "$AGENT_TYPE" ]]; then
  STATE_DIR="$PROJECT_ROOT/.specweave/state"
  mkdir -p "$STATE_DIR" 2>/dev/null

  # Store agent type for other hooks to use
  echo "$AGENT_TYPE" > "$STATE_DIR/.current-agent-type" 2>/dev/null

  # Agent-specific startup messages
  case "$AGENT_TYPE" in
    sw:pm|sw-pm)
      echo '{"continue":true,"systemMessage":"🎯 PM Agent: Product Management context loaded. Focus on user stories, acceptance criteria, and business value."}'
      ;;
    sw:architect|sw-architect)
      echo '{"continue":true,"systemMessage":"🏗️ Architect Agent: Technical design context loaded. Focus on ADRs, system design, and architecture patterns."}'
      ;;
    sw:tech-lead|sw-tech-lead)
      echo '{"continue":true,"systemMessage":"👨‍💻 Tech Lead Agent: Implementation context loaded. Focus on code quality, best practices, and task execution."}'
      ;;
  esac
fi

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

# Script paths (HOOK_DIR already defined above)
# HOOK_DIR is hooks/v2/dispatchers (where this script is)
# Need to go up THREE levels to reach plugin root: dispatchers -> v2 -> hooks -> plugin
PLUGIN_ROOT="$(cd "$HOOK_DIR/../../.." && pwd)"
SCRIPTS_DIR="$PLUGIN_ROOT/scripts"
SCHEDULER_STARTUP="$PLUGIN_ROOT/lib/scheduler-startup.sh"
CLEANUP_SCRIPT="$SCRIPTS_DIR/cleanup-legacy-state.sh"

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

# === AUTO-LOAD PLUGINS REMOVED (v1.0.159) ===
# Project-file-based detection (specweave detect-project) was removed.
#
# REASON: Users want plugins installed ONLY when LLM determines they need them
# for a specific BUILD task, not based on project file scanning.
#
# Plugin auto-loading now happens ONLY in user-prompt-submit.sh via LLM detection.
# When user submits a prompt like "Build React dashboard", the LLM analyzes
# the request and installs relevant plugins (sw-frontend, etc.)
#
# To install plugins manually: claude plugin install sw-frontend@specweave

# === LEGACY STATE CLEANUP (v1.0.148) ===
# Clean up old processor state files on session start
# This is a one-time migration - old files are removed automatically
if [[ -f "$CLEANUP_SCRIPT" ]]; then
  bash "$CLEANUP_SCRIPT" 2>/dev/null || true
fi

# Check for due scheduled jobs (non-blocking)
if [[ -f "$SCHEDULER_STARTUP" ]]; then
  bash "$SCHEDULER_STARTUP" 2>/dev/null || true
fi

# === LSP LANGUAGE SERVER CHECK (v1.0.180) ===
# Spawn lsp-check.sh in background to detect missing language server binaries
# Results written to .specweave/state/lsp-check.json for user-prompt-submit to read
# Shows one-time warning if language servers are missing (e.g., csharp-ls, typescript-language-server)
LSP_CHECK_SCRIPT="$SCRIPTS_DIR/lsp-check.sh"
if [[ -x "$LSP_CHECK_SCRIPT" ]] || [[ -f "$LSP_CHECK_SCRIPT" ]]; then
  mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null
  nohup bash "$LSP_CHECK_SCRIPT" "$PROJECT_ROOT" \
    >> "$PROJECT_ROOT/.specweave/logs/lsp-check.log" 2>&1 &
  disown 2>/dev/null
fi

# Session watchdog REMOVED (ADR-0224)
# VSCode extension manages session lifecycle - no daemon needed
# For stuck sessions: Close Claude Code or restart Extension Host

exit 0
