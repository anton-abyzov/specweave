#!/bin/bash
# common-setup.sh - Minimal Hook Library
#
# Only essential utilities for hooks. Crash prevention is handled by:
# - Claude Code's native tool timeouts
# - fail-fast-wrapper.sh (5s timeout for hook scripts)
#
# USAGE:
#   source "${CLAUDE_PLUGIN_ROOT}/hooks/lib/common-setup.sh"

set +e  # NEVER use set -e in hooks

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

find_project_root() {
  local dir="${1:-$(pwd)}"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

# ============================================================================
# KILL SWITCH
# ============================================================================

check_kill_switch() {
  [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]
}

# ============================================================================
# PRE-TOOL-USE GUARD HELPERS
# ============================================================================

# Global variables set by init_pretool_guard
HOOK_INPUT=""
HOOK_TOOL_NAME=""
HOOK_FILE_PATH=""
HOOK_CONTENT=""

# Initialize PreToolUse guard environment
# Returns 1 if hook should exit early (kill switch, no jq, etc.)
init_pretool_guard() {
  if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
    echo '{"decision":"allow"}'
    return 1
  fi

  HOOK_INPUT=$(cat 2>/dev/null || echo '{}')

  if ! command -v jq >/dev/null 2>&1; then
    echo '{"decision":"allow"}'
    return 1
  fi

  HOOK_TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
  HOOK_FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // .file_path // ""' 2>/dev/null || echo "")
  HOOK_CONTENT=$(echo "$HOOK_INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""' 2>/dev/null || echo "")

  return 0
}

# Allow the tool call with optional message
guard_allow() {
  local message="${1:-}"
  if [[ -n "$message" ]]; then
    printf '{"decision":"allow","message":"%s"}\n' "$message"
  else
    echo '{"decision":"allow"}'
  fi
  exit 0
}

# ============================================================================
# SIMPLE LOGGING (optional, writes to .specweave/logs/hooks.log)
# ============================================================================

log_hook() {
  local level="$1"
  shift
  local msg="$*"
  local project_root
  project_root=$(find_project_root) || return
  local log_file="$project_root/.specweave/logs/hooks.log"
  mkdir -p "$(dirname "$log_file")" 2>/dev/null
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$level] $msg" >> "$log_file" 2>/dev/null
}
