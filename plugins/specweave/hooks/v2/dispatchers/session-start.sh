#!/bin/bash
# session-start.sh - Session initialization with auto plugin loading
# Ultra-fast, non-blocking
#
# v1.0.127: AUTO-LOAD PLUGINS based on project type (React, Express, K8s, etc.)
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

# Background processor paths (HOOK_DIR already defined above)
# HOOK_DIR is hooks/v2/dispatchers (where this script is)
# Need to go up THREE levels to reach plugin root: dispatchers -> v2 -> hooks -> plugin
PROCESSOR="$HOOK_DIR/../queue/processor.sh"
SCHEDULER_STARTUP="$HOOK_DIR/../../../lib/scheduler-startup.sh"
SESSION_WATCHDOG="$PROJECT_ROOT/plugins/specweave/scripts/session-watchdog.sh"
SCRIPTS_WATCHDOG="$HOOK_DIR/../../../scripts/session-watchdog.sh"
PLUGIN_ROOT="$(cd "$HOOK_DIR/../../.." && pwd)"
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

# === AUTO-LOAD PLUGINS BASED ON PROJECT TYPE (v1.0.127 - Increment 0172) ===
# Detect project type (React, Express, K8s, etc.) and pre-install relevant plugins
# Runs in background to not block session start
# Controlled by SPECWEAVE_DISABLE_AUTO_LOAD environment variable

if [[ "${SPECWEAVE_DISABLE_AUTO_LOAD:-0}" != "1" ]]; then
  if command -v specweave >/dev/null 2>&1; then
    # Setup lazy-loading log for graceful degradation (T-010)
    LAZY_LOAD_LOG="$HOME/.specweave/logs/lazy-loading.log"
    mkdir -p "$(dirname "$LAZY_LOAD_LOG")" 2>/dev/null

    # T-012: Check project detection cache (1 hour TTL)
    # Cache avoids redundant project detection on every session start
    AUTO_LOAD_CACHE="$HOME/.specweave/state/auto-load-cache.json"
    CACHE_TTL_SECONDS=3600  # 1 hour
    SHOULD_DETECT=true

    if [[ -f "$AUTO_LOAD_CACHE" ]] && command -v jq >/dev/null 2>&1; then
      CACHED_PATH=$(jq -r '.projectPath // ""' "$AUTO_LOAD_CACHE" 2>/dev/null)
      CACHED_TIME=$(jq -r '.timestamp // 0' "$AUTO_LOAD_CACHE" 2>/dev/null)
      CURRENT_TIME=$(date +%s)

      # Skip detection if same project and cache is fresh
      if [[ "$CACHED_PATH" == "$PROJECT_ROOT" ]]; then
        CACHE_AGE=$((CURRENT_TIME - CACHED_TIME))
        if [[ "$CACHE_AGE" -lt "$CACHE_TTL_SECONDS" ]]; then
          SHOULD_DETECT=false
          echo "[$(date -Iseconds)] Cache hit: skipping project detection (age: ${CACHE_AGE}s)" >> "$LAZY_LOAD_LOG"
        fi
      fi
    fi

    if [[ "$SHOULD_DETECT" == "true" ]]; then
      # Run detect-project in background with --install --silent
      # This will analyze project files (package.json, Dockerfile, etc.) and install relevant plugins
      # T-011: Background timeout is 15s; hook itself returns immediately (<3000ms)
      # Graceful degradation: errors logged but don't block Claude session start
      (
        mkdir -p "$(dirname "$AUTO_LOAD_CACHE")" 2>/dev/null

        # T-014: Performance logging
        START_TIME=$(date +%s%3N 2>/dev/null || date +%s)
        PROJECT_NAME=$(basename "$PROJECT_ROOT")

        if command -v timeout >/dev/null 2>&1; then
          timeout 15 specweave detect-project "$PROJECT_ROOT" --install --silent 2>>"$LAZY_LOAD_LOG"
          EXIT_CODE=$?
        else
          specweave detect-project "$PROJECT_ROOT" --install --silent 2>>"$LAZY_LOAD_LOG"
          EXIT_CODE=$?
        fi

        END_TIME=$(date +%s%3N 2>/dev/null || date +%s)
        DURATION=$((END_TIME - START_TIME))

        if [[ "$EXIT_CODE" -eq 0 ]]; then
          echo "{\"projectPath\":\"$PROJECT_ROOT\",\"timestamp\":$(date +%s)}" > "$AUTO_LOAD_CACHE"
          echo "[$(date -Iseconds)] detect-project success | duration=${DURATION}ms | project=$PROJECT_NAME" >> "$LAZY_LOAD_LOG"
        else
          echo "[$(date -Iseconds)] detect-project failed (code=$EXIT_CODE) | duration=${DURATION}ms | path=$PROJECT_ROOT" >> "$LAZY_LOAD_LOG"
        fi
      ) &
      disown 2>/dev/null
    fi
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
