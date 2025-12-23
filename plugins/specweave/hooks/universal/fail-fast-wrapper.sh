#!/bin/bash
# fail-fast-wrapper.sh - HARD TIMEOUT wrapper for all hooks with proper concurrency control
# If ANY hook takes longer than HOOK_TIMEOUT, it gets KILLED.
#
# Usage: bash fail-fast-wrapper.sh <hook-script> [args...]
#
# Environment:
#   HOOK_TIMEOUT        - max seconds (default: 5)
#   HOOK_DEBUG          - set to 1 for verbose logging
#   HOOK_MAX_CONCURRENT - max concurrent hooks (default: 15)
#   HOOK_ACQUIRE_TIMEOUT_MS - semaphore acquire timeout (default: 3000)
#
# Exit behavior:
#   - Returns hook output on success
#   - Returns safe JSON on timeout ({"continue":true} or {"decision":"approve"})
#   - NEVER hangs - timeout is enforced with SIGKILL
#
# CONCURRENCY CONTROL (v1.0.30):
#   - Semaphore-based concurrency limiting (NOT process storm detection)
#   - Proper circuit breaker with CLOSED/OPEN/HALF_OPEN states
#   - Structured logging with request tracing
#   - Metrics collection for observability
#
# v0.33.0 - Enhanced with crash prevention integration
# v1.0.30 - Complete rewrite with proper concurrency primitives
# v1.0.33 - Fixed: removed set -o pipefail for hook safety

set +e  # CRITICAL: Never use set -e or pipefail in hooks (causes cascading failures)

# === Configuration ===
HOOK_TIMEOUT="${HOOK_TIMEOUT:-5}"  # 5 seconds - more than enough for any hook
HOOK_DEBUG="${HOOK_DEBUG:-0}"
HOOK_MAX_CONCURRENT="${HOOK_MAX_CONCURRENT:-15}"  # Max concurrent hooks
HOOK_ACQUIRE_TIMEOUT_MS="${HOOK_ACQUIRE_TIMEOUT_MS:-3000}"  # 3 seconds to acquire semaphore
LOG_FILE="${HOME}/.claude/hook-failures.log"

# === Library paths ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../lib"

# === Source libraries (fail gracefully if missing) ===
SEMAPHORE_LOADED=false
CIRCUIT_BREAKER_LOADED=false
LOGGING_LOADED=false
METRICS_LOADED=false

# Set state dir for all libraries
export SPECWEAVE_STATE_DIR="${SPECWEAVE_STATE_DIR:-.specweave/state}"
export SPECWEAVE_LOG_DIR="${SPECWEAVE_LOG_DIR:-.specweave/logs/hooks}"

if [[ -f "$LIB_DIR/semaphore.sh" ]]; then
  source "$LIB_DIR/semaphore.sh" 2>/dev/null && SEMAPHORE_LOADED=true
fi

if [[ -f "$LIB_DIR/circuit-breaker.sh" ]]; then
  source "$LIB_DIR/circuit-breaker.sh" 2>/dev/null && CIRCUIT_BREAKER_LOADED=true
fi

if [[ -f "$LIB_DIR/logging.sh" ]]; then
  source "$LIB_DIR/logging.sh" 2>/dev/null && LOGGING_LOADED=true
fi

if [[ -f "$LIB_DIR/metrics.sh" ]]; then
  source "$LIB_DIR/metrics.sh" 2>/dev/null && METRICS_LOADED=true
fi

# Legacy crash prevention (fallback)
CRASH_PREVENTION="${LIB_DIR}/crash-prevention.sh"
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
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HOOK FAILURE: $msg" >> "$LOG_FILE"
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

# === Get hook name from script path ===
get_hook_name() {
  local script="$1"
  basename "$script" .sh | tr '/' '-'
}

# === Read stdin with timeout ===
# Critical: stdin can block forever if not handled properly
read_stdin_with_timeout() {
  local stdin_content=""
  local line_count=0
  local max_lines=1000  # Safety limit to prevent infinite loops

  # Use read with timeout (integer seconds for bash compatibility)
  # ALL reads have 1 second timeout to prevent blocking
  while read -t 1 -r line && [[ $line_count -lt $max_lines ]]; do
    if [[ -z "$stdin_content" ]]; then
      stdin_content="$line"
    else
      stdin_content="${stdin_content}"$'\n'"${line}"
    fi
    line_count=$((line_count + 1))
  done

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

  local hook_name
  hook_name=$(get_hook_name "$script")

  # === Initialize libraries ===
  if [[ "$LOGGING_LOADED" == "true" ]]; then
    log_init "$hook_name"
    log_debug "Starting hook execution" "script=$script"
  fi

  if [[ "$METRICS_LOADED" == "true" ]]; then
    metrics_init "$hook_name"
    metrics_start_request
  fi

  # === CIRCUIT BREAKER CHECK ===
  # If circuit is open for this hook, fail fast
  if [[ "$CIRCUIT_BREAKER_LOADED" == "true" ]]; then
    if ! cb_allow_request "$hook_name"; then
      local cb_status
      cb_status=$(cb_get_status "$hook_name")
      log_debug "Circuit breaker OPEN for $hook_name: $cb_status"

      if [[ "$LOGGING_LOADED" == "true" ]]; then
        log_warn "Circuit breaker open - failing fast" "hook=$hook_name"
      fi

      if [[ "$METRICS_LOADED" == "true" ]]; then
        metrics_end_request "skipped"
      fi

      get_safe_output "$script"
      exit 0
    fi
  fi

  # === SEMAPHORE: Acquire concurrency slot ===
  local semaphore_acquired=false
  if [[ "$SEMAPHORE_LOADED" == "true" ]]; then
    if acquire_semaphore "hooks" "$HOOK_MAX_CONCURRENT" "$HOOK_ACQUIRE_TIMEOUT_MS"; then
      semaphore_acquired=true
      log_debug "Acquired semaphore slot for $hook_name"
    else
      # Could not acquire semaphore in time - graceful degradation
      log_debug "Semaphore timeout for $hook_name - graceful skip"

      if [[ "$LOGGING_LOADED" == "true" ]]; then
        log_warn "Semaphore acquisition timeout - graceful degradation" "hook=$hook_name" "max_concurrent=$HOOK_MAX_CONCURRENT"
      fi

      if [[ "$METRICS_LOADED" == "true" ]]; then
        metrics_end_request "skipped"
      fi

      # DON'T record as failure - this is graceful degradation, not an error
      get_safe_output "$script"
      exit 0
    fi
  fi

  # Ensure semaphore is released on exit
  trap 'release_semaphore 2>/dev/null || true' EXIT INT TERM

  log_debug "Executing: $script (timeout: ${HOOK_TIMEOUT}s)"

  # Read stdin first (with its own timeout)
  local stdin_content
  stdin_content=$(read_stdin_with_timeout)

  # Execute the hook with hard timeout
  local output
  local exit_code
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

  # Release semaphore immediately after execution
  if [[ "$semaphore_acquired" == "true" ]]; then
    release_semaphore
  fi

  # Handle timeout (exit code 124 or 137)
  if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 137 ]]; then
    log_failure "$script - killed after ${HOOK_TIMEOUT}s"
    log_debug "TIMEOUT: $script killed after ${HOOK_TIMEOUT}s"

    if [[ "$LOGGING_LOADED" == "true" ]]; then
      log_error "Hook timeout - killed after ${HOOK_TIMEOUT}s" "hook=$hook_name"
    fi

    if [[ "$METRICS_LOADED" == "true" ]]; then
      metrics_end_request "timeout"
    fi

    # Record failure for circuit breaker
    if [[ "$CIRCUIT_BREAKER_LOADED" == "true" ]]; then
      cb_record_failure "$hook_name"
    fi

    # Clean up potential zombie processes (legacy)
    if type kill_zombie_heredocs &>/dev/null; then
      kill_zombie_heredocs 2>/dev/null || true
    fi

    get_safe_output "$script"
    exit 0
  fi

  # Handle hook errors (non-zero exit, excluding block exit code 2)
  if [[ $exit_code -ne 0 ]] && [[ $exit_code -ne 2 ]]; then
    log_debug "Hook error: $script exited with $exit_code"

    if [[ "$LOGGING_LOADED" == "true" ]]; then
      log_warn "Hook exited with error" "hook=$hook_name" "exit_code=$exit_code"
    fi

    if [[ "$METRICS_LOADED" == "true" ]]; then
      metrics_end_request "failure"
    fi

    if [[ "$CIRCUIT_BREAKER_LOADED" == "true" ]]; then
      cb_record_failure "$hook_name"
    fi
  else
    # Success!
    if [[ "$METRICS_LOADED" == "true" ]]; then
      metrics_end_request "success"
    fi

    if [[ "$CIRCUIT_BREAKER_LOADED" == "true" ]]; then
      cb_record_success "$hook_name"
    fi

    if [[ "$LOGGING_LOADED" == "true" ]]; then
      log_debug "Hook completed successfully" "hook=$hook_name"
    fi
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
