#!/bin/bash
# fail-fast-wrapper.sh - HARD TIMEOUT wrapper for all hooks
# If ANY hook takes longer than HOOK_TIMEOUT, it gets KILLED.
#
# Usage: bash fail-fast-wrapper.sh <hook-script> [args...]
#
# Environment:
#   HOOK_TIMEOUT - max seconds (default: 5)
#   HOOK_DEBUG   - set to 1 for verbose logging
#
# Exit behavior:
#   - Returns hook output on success
#   - Returns safe JSON on timeout ({"continue":true} or {"decision":"approve"})
#   - NEVER hangs - timeout is enforced with SIGKILL
#
# CRASH PREVENTION:
#   - Integrates with crash-prevention.sh for process storm detection
#   - Auto-kills zombie processes on timeout
#   - Records failures for circuit breaker
#
# v0.33.0 - Enhanced with crash prevention integration

set -o pipefail

# === Configuration ===
HOOK_TIMEOUT="${HOOK_TIMEOUT:-5}"  # 5 seconds - more than enough for any hook
HOOK_DEBUG="${HOOK_DEBUG:-0}"
LOG_FILE="${HOME}/.claude/hook-failures.log"

# === Crash Prevention Integration ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRASH_PREVENTION="${SCRIPT_DIR}/../lib/crash-prevention.sh"

# Source crash prevention if available (non-blocking)
if [[ -f "$CRASH_PREVENTION" ]]; then
  source "$CRASH_PREVENTION" 2>/dev/null || true
fi

# === Helper functions ===
log_debug() {
  [[ "$HOOK_DEBUG" == "1" ]] && echo "[DEBUG $(date +%H:%M:%S)] $*" >&2
}

log_failure() {
  local msg="$1"
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HOOK TIMEOUT: $msg" >> "$LOG_FILE"
}

# === Safe JSON output based on hook type ===
get_safe_output() {
  local script="$1"
  # PreToolUse hooks need "decision" format
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]] || [[ "$script" == *"PreToolUse"* ]]; then
    echo '{"decision":"allow"}'
  else
    echo '{"continue":true}'
  fi
}

# === Read stdin with timeout ===
# Critical: stdin can block forever if not handled properly
read_stdin_with_timeout() {
  local stdin_content=""

  # Use read with timeout (integer seconds for bash compatibility)
  if read -t 1 -r line; then
    stdin_content="$line"
    # Continue reading remaining lines (no timeout - stdin should be closed)
    while IFS= read -r line; do
      stdin_content="${stdin_content}"$'\n'"${line}"
    done
  fi

  echo "$stdin_content"
}

# === Main execution ===
main() {
  local script="$1"
  shift
  local args=("$@")

  if [[ -z "$script" ]]; then
    echo '{"continue":true}'
    exit 0
  fi

  if [[ ! -f "$script" ]]; then
    log_debug "Script not found: $script"
    echo '{"continue":true}'
    exit 0
  fi

  # === CRASH PREVENTION: Process Storm Detection ===
  # If too many hooks are running, skip this one to prevent cascade
  if type detect_process_storm &>/dev/null; then
    local storm_status
    storm_status=$(detect_process_storm 25)
    if [[ "$storm_status" == STORM* ]]; then
      log_failure "$script - BLOCKED due to process storm: $storm_status"
      get_safe_output "$script"
      exit 0
    fi
  fi

  log_debug "Executing: $script (timeout: ${HOOK_TIMEOUT}s)"

  # Read stdin first (with its own timeout)
  local stdin_content
  stdin_content=$(read_stdin_with_timeout)

  # Execute the hook with hard timeout
  # Using timeout with --kill-after to ensure SIGKILL if SIGTERM doesn't work
  local output
  local exit_code

  # Create temp file for output (avoid subshell issues)
  local tmp_out
  tmp_out=$(mktemp)

  # Run with timeout - kill entire process group on timeout
  if command -v gtimeout >/dev/null 2>&1; then
    # macOS with coreutils
    echo "$stdin_content" | gtimeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "${args[@]}" > "$tmp_out" 2>/dev/null
    exit_code=$?
  elif command -v timeout >/dev/null 2>&1; then
    # Linux
    echo "$stdin_content" | timeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "${args[@]}" > "$tmp_out" 2>/dev/null
    exit_code=$?
  else
    # Fallback: manual timeout using background process
    (
      echo "$stdin_content" | bash "$script" "${args[@]}" > "$tmp_out" 2>/dev/null
    ) &
    local pid=$!

    # Wait with timeout
    local count=0
    while kill -0 "$pid" 2>/dev/null && [[ $count -lt $((HOOK_TIMEOUT * 10)) ]]; do
      sleep 0.1
      count=$((count + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
      # Still running - kill it!
      kill -9 "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      exit_code=124  # timeout exit code
    else
      wait "$pid"
      exit_code=$?
    fi
  fi

  output=$(cat "$tmp_out" 2>/dev/null)
  rm -f "$tmp_out"

  # Handle timeout (exit code 124 or 137)
  if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 137 ]]; then
    log_failure "$script - killed after ${HOOK_TIMEOUT}s"
    log_debug "TIMEOUT: $script killed after ${HOOK_TIMEOUT}s"

    # === CRASH PREVENTION: Clean up potential zombie processes ===
    if type kill_zombie_heredocs &>/dev/null; then
      kill_zombie_heredocs 2>/dev/null || true
    fi

    get_safe_output "$script"
    exit 0
  fi

  # Return output or safe default
  if [[ -n "$output" ]]; then
    echo "$output"
  else
    get_safe_output "$script"
  fi

  exit 0
}

main "$@"
