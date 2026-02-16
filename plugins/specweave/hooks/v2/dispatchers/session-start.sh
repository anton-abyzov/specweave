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
  rm -f "$STATE_DIR/.stop-auto-dedup-prev" 2>/dev/null
  rm -f "$STATE_DIR/.stop-auto-turns" 2>/dev/null
  # Log cleanup (non-blocking, fire-and-forget)
  mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SessionStart: Cleared auto-mode session files (session-scoped)" >> "$PROJECT_ROOT/.specweave/logs/session.log" 2>/dev/null
fi

# ============================================================================
# CONTEXT PRESSURE RESET: Clear pressure state for fresh session budget (v1.0.262)
# Ensures new sessions start at user's configured base budget level
# ============================================================================
rm -f "$STATE_DIR/context-pressure.json" 2>/dev/null
rm -f "$STATE_DIR/.context-hash" 2>/dev/null
rm -f "$STATE_DIR/prompt-health-alert.json" 2>/dev/null

# ============================================================================
# PROMPT BASELINE HEALTH CHECK (v1.0.268)
# Calculates approximate baseline prompt size from controllable factors.
# Warns user if baseline is dangerously high (>80K warning, >120K critical).
# Writes prompt-health.json for dashboard consumption.
# ============================================================================
CLAUDE_MD_SIZE=0
MEMORY_MD_SIZE=0
SKILL_BUDGET="${SLASH_COMMAND_TOOL_CHAR_BUDGET:-15000}"
SYSTEM_ESTIMATE=12000
HOOK_PER_TURN=3000

# Measure CLAUDE.md
if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
  CLAUDE_MD_SIZE=$(wc -c < "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null | tr -d ' ')
  [[ ! "$CLAUDE_MD_SIZE" =~ ^[0-9]+$ ]] && CLAUDE_MD_SIZE=0
fi

# Measure global CLAUDE.md (user's global instructions)
GLOBAL_CLAUDE="$HOME/.claude/CLAUDE.md"
if [[ -f "$GLOBAL_CLAUDE" ]]; then
  _GC_SIZE=$(wc -c < "$GLOBAL_CLAUDE" 2>/dev/null | tr -d ' ')
  [[ "$_GC_SIZE" =~ ^[0-9]+$ ]] && MEMORY_MD_SIZE=$((_GC_SIZE))
fi

# Measure project-specific MEMORY.md
_PROJECT_SLUG=$(echo "$PROJECT_ROOT" | sed 's|^/||;s|/|-|g')
_PROJECT_MEMORY="$HOME/.claude/projects/-${_PROJECT_SLUG}/memory/MEMORY.md"
if [[ -f "$_PROJECT_MEMORY" ]]; then
  _PM_SIZE=$(wc -c < "$_PROJECT_MEMORY" 2>/dev/null | tr -d ' ')
  [[ "$_PM_SIZE" =~ ^[0-9]+$ ]] && MEMORY_MD_SIZE=$((MEMORY_MD_SIZE + _PM_SIZE))
fi

BASELINE=$((CLAUDE_MD_SIZE + MEMORY_MD_SIZE + SKILL_BUDGET + SYSTEM_ESTIMATE + HOOK_PER_TURN))

# Determine warning level
WARNING_THRESHOLD=80000
CRITICAL_THRESHOLD=120000
WARNING_LEVEL="normal"
if [[ $BASELINE -gt $CRITICAL_THRESHOLD ]]; then
  WARNING_LEVEL="critical"
elif [[ $BASELINE -gt $WARNING_THRESHOLD ]]; then
  WARNING_LEVEL="warning"
fi

# Write health check to state for dashboard
cat > "$STATE_DIR/prompt-health.json" <<EOF
{"baseline":$BASELINE,"claudeMdSize":$CLAUDE_MD_SIZE,"memoryMdSize":$MEMORY_MD_SIZE,"skillBudget":$SKILL_BUDGET,"systemEstimate":$SYSTEM_ESTIMATE,"hookPerTurn":$HOOK_PER_TURN,"warningLevel":"$WARNING_LEVEL","checkedAt":"$(date -Iseconds)"}
EOF

# Emit warnings
if [[ "$WARNING_LEVEL" == "critical" ]]; then
  echo "{\"continue\":true,\"systemMessage\":\"PROMPT HEALTH: CRITICAL - Baseline prompt size is ${BASELINE} chars ($((BASELINE / 1000))KB). CLAUDE.md=${CLAUDE_MD_SIZE}, MEMORY.md=${MEMORY_MD_SIZE}, Skills=${SKILL_BUDGET}. Risk of 'Prompt is too long' errors. Reduce MEMORY.md (<5KB), lower contextBudget.level, or reduce SLASH_COMMAND_TOOL_CHAR_BUDGET.\"}"
elif [[ "$WARNING_LEVEL" == "warning" ]]; then
  echo "{\"continue\":true,\"systemMessage\":\"PROMPT HEALTH: Elevated baseline prompt size (${BASELINE} chars / $((BASELINE / 1000))KB). CLAUDE.md=${CLAUDE_MD_SIZE}, MEMORY.md=${MEMORY_MD_SIZE}. Consider reducing MEMORY.md or lowering contextBudget level if you see compaction warnings.\"}"
fi

# Log health check
mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null
echo "[$(date -Iseconds)] HEALTH_CHECK | baseline=$BASELINE | level=$WARNING_LEVEL | claude_md=$CLAUDE_MD_SIZE | memory_md=$MEMORY_MD_SIZE | skills=$SKILL_BUDGET" >> "$PROJECT_ROOT/.specweave/logs/prompt-health.log" 2>/dev/null

# ============================================================================
# PLUGIN CACHE: Do NOT delete - Claude Code manages its own plugin cache
# v1.0.206: (REVERTED) Cache deletion broke plugin loading - installed_plugins.json
#           still referenced deleted paths, causing all commands/skills to fail
# ============================================================================

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
  esac
fi

# Hook directory for finding other scripts
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# === MCP Connection Health Check ===
# Check for recent MCP drops that could cause session hangs
CLAUDE_DEBUG="$HOME/.claude/debug/latest"
if [[ -f "$CLAUDE_DEBUG" ]]; then
  # Count MCP drops in last debug log (only check last 500 lines for speed)
  MCP_DROPS=$(tail -500 "$CLAUDE_DEBUG" 2>/dev/null | grep -c "WS-IDE connection dropped" 2>/dev/null | head -1 || echo "0")
  MCP_DROPS="${MCP_DROPS//[^0-9]/}"  # Strip non-numeric characters
  [[ -z "$MCP_DROPS" ]] && MCP_DROPS=0
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

# === LSP OPERATIONS (v1.0.197) ===
# LSP check and warm-up ONLY run if user has explicitly enabled LSP via ENABLE_LSP_TOOL=1
# This avoids wasted background work for users who don't use LSP features
#
# Why gate on ENABLE_LSP_TOOL:
# 1. LSP requires explicit setup (language server binaries, Claude plugins)
# 2. Not all users need semantic code intelligence
# 3. Background processes consume resources
# 4. LSP warm-up is triggered on-demand when user prompt contains LSP keywords
#
# To enable: Add "export ENABLE_LSP_TOOL=1" to ~/.zshrc or ~/.bashrc
if [[ -n "${ENABLE_LSP_TOOL:-}" ]]; then
  # === LSP LANGUAGE SERVER CHECK ===
  # Verify language server binaries are installed for dominant project languages
  LSP_CHECK_SCRIPT="$SCRIPTS_DIR/lsp-check.sh"
  if [[ -x "$LSP_CHECK_SCRIPT" ]] || [[ -f "$LSP_CHECK_SCRIPT" ]]; then
    mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null
    nohup bash "$LSP_CHECK_SCRIPT" "$PROJECT_ROOT" \
      >> "$PROJECT_ROOT/.specweave/logs/lsp-check.log" 2>&1 &
    disown 2>/dev/null
  fi

  # NOTE: LSP warm-up is NOT done here on session start
  # Instead, it's triggered lazily by user-prompt-submit.sh when:
  # 1. User prompt contains LSP keywords ("find references", "go to definition", etc.)
  # 2. AND warm-up hasn't been done yet this session
  # This avoids warming up LSP for sessions that never use it
fi

# Session watchdog REMOVED (ADR-0224)
# VSCode extension manages session lifecycle - no daemon needed
# For stuck sessions: Close Claude Code or restart Extension Host

exit 0
