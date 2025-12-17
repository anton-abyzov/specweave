#!/bin/bash
# circuit-breaker.sh - Proper Circuit Breaker Pattern for SpecWeave Hooks
#
# PROBLEM SOLVED:
#   The old circuit breaker was too simple - it just counted failures and blocked everything.
#   This implementation follows the proper circuit breaker pattern with three states:
#   - CLOSED: Normal operation, requests flow through
#   - OPEN: Too many failures, requests are rejected immediately (fail-fast)
#   - HALF-OPEN: Testing if system recovered, allows limited requests
#
# DESIGN:
#   - Failure threshold before opening (default: 5 failures in 60s window)
#   - Recovery timeout before half-open (default: 30s)
#   - Success threshold to close (default: 3 successes in half-open)
#   - Per-hook circuit breakers (not global)
#   - Sliding window for failure counting
#   - Automatic state transitions
#
# USAGE:
#   source circuit-breaker.sh
#
#   # Before executing hook:
#   if cb_allow_request "hook-name"; then
#     # Execute hook
#     if hook_succeeded; then
#       cb_record_success "hook-name"
#     else
#       cb_record_failure "hook-name"
#     fi
#   else
#     # Circuit is open, return safe default
#   fi
#
# v1.0.0 - Initial implementation (2025-12-17)

set -o pipefail

# === Configuration ===
CB_STATE_DIR="${SPECWEAVE_STATE_DIR:-.specweave/state}/circuit-breakers"
CB_FAILURE_THRESHOLD="${CB_FAILURE_THRESHOLD:-5}"       # Failures before OPEN
CB_FAILURE_WINDOW_SEC="${CB_FAILURE_WINDOW_SEC:-60}"    # Sliding window for counting failures
CB_RECOVERY_TIMEOUT_SEC="${CB_RECOVERY_TIMEOUT_SEC:-30}" # Time in OPEN before HALF-OPEN
CB_SUCCESS_THRESHOLD="${CB_SUCCESS_THRESHOLD:-3}"       # Successes in HALF-OPEN to CLOSE
CB_DEBUG="${CB_DEBUG:-0}"

# States
CB_STATE_CLOSED="CLOSED"
CB_STATE_OPEN="OPEN"
CB_STATE_HALF_OPEN="HALF_OPEN"

# === Initialization ===
_cb_init() {
  mkdir -p "$CB_STATE_DIR" 2>/dev/null || true
}

# === Logging ===
_cb_log() {
  [[ "$CB_DEBUG" == "1" ]] && echo "[CB $(date +%H:%M:%S)] $*" >&2
}

# === State File Paths ===
_cb_state_file() {
  local name="$1"
  echo "$CB_STATE_DIR/${name}.state"
}

_cb_failures_file() {
  local name="$1"
  echo "$CB_STATE_DIR/${name}.failures"
}

_cb_successes_file() {
  local name="$1"
  echo "$CB_STATE_DIR/${name}.successes"
}

# === Read/Write State ===
_cb_read_state() {
  local name="$1"
  local state_file
  state_file=$(_cb_state_file "$name")

  if [[ -f "$state_file" ]]; then
    cat "$state_file" 2>/dev/null || echo "$CB_STATE_CLOSED"
  else
    echo "$CB_STATE_CLOSED"
  fi
}

_cb_write_state() {
  local name="$1"
  local state="$2"
  local state_file
  state_file=$(_cb_state_file "$name")

  _cb_init
  echo "$state" > "$state_file" 2>/dev/null || true
  _cb_log "State transition for $name: -> $state"
}

# === Timestamp helpers ===
_cb_now() {
  date +%s
}

_cb_file_mtime() {
  local file="$1"
  if [[ "$(uname)" == "Darwin" ]]; then
    stat -f %m "$file" 2>/dev/null || echo "0"
  else
    stat -c %Y "$file" 2>/dev/null || echo "0"
  fi
}

# === Failure Tracking (Sliding Window) ===
_cb_count_recent_failures() {
  local name="$1"
  local failures_file
  failures_file=$(_cb_failures_file "$name")

  [[ ! -f "$failures_file" ]] && echo "0" && return

  local now
  now=$(_cb_now)
  local window_start=$((now - CB_FAILURE_WINDOW_SEC))
  local count=0

  # Read failure timestamps and count those within window
  while IFS= read -r timestamp; do
    [[ -z "$timestamp" ]] && continue
    if [[ "$timestamp" -ge "$window_start" ]]; then
      count=$((count + 1))
    fi
  done < "$failures_file"

  echo "$count"
}

_cb_add_failure() {
  local name="$1"
  local failures_file
  failures_file=$(_cb_failures_file "$name")

  _cb_init
  local now
  now=$(_cb_now)

  # Append timestamp
  echo "$now" >> "$failures_file" 2>/dev/null || true

  # Cleanup old entries (keep only last 100)
  if [[ -f "$failures_file" ]]; then
    tail -100 "$failures_file" > "${failures_file}.tmp" 2>/dev/null && \
      mv "${failures_file}.tmp" "$failures_file" 2>/dev/null || true
  fi
}

_cb_clear_failures() {
  local name="$1"
  local failures_file
  failures_file=$(_cb_failures_file "$name")
  rm -f "$failures_file" 2>/dev/null || true
}

# === Success Tracking (Half-Open State) ===
_cb_count_successes() {
  local name="$1"
  local successes_file
  successes_file=$(_cb_successes_file "$name")

  [[ ! -f "$successes_file" ]] && echo "0" && return

  wc -l < "$successes_file" 2>/dev/null | tr -d ' '
}

_cb_add_success() {
  local name="$1"
  local successes_file
  successes_file=$(_cb_successes_file "$name")

  _cb_init
  echo "$(_cb_now)" >> "$successes_file" 2>/dev/null || true
}

_cb_clear_successes() {
  local name="$1"
  local successes_file
  successes_file=$(_cb_successes_file "$name")
  rm -f "$successes_file" 2>/dev/null || true
}

# === State Transitions ===
_cb_check_should_open() {
  local name="$1"
  local failure_count
  failure_count=$(_cb_count_recent_failures "$name")

  if [[ "$failure_count" -ge "$CB_FAILURE_THRESHOLD" ]]; then
    _cb_log "$name: Failure threshold reached ($failure_count >= $CB_FAILURE_THRESHOLD)"
    return 0  # Should open
  fi
  return 1  # Should not open
}

_cb_check_should_half_open() {
  local name="$1"
  local state_file
  state_file=$(_cb_state_file "$name")

  [[ ! -f "$state_file" ]] && return 1

  local state_mtime
  state_mtime=$(_cb_file_mtime "$state_file")
  local now
  now=$(_cb_now)
  local age=$((now - state_mtime))

  if [[ "$age" -ge "$CB_RECOVERY_TIMEOUT_SEC" ]]; then
    _cb_log "$name: Recovery timeout reached (${age}s >= ${CB_RECOVERY_TIMEOUT_SEC}s)"
    return 0  # Should transition to half-open
  fi
  return 1
}

_cb_check_should_close() {
  local name="$1"
  local success_count
  success_count=$(_cb_count_successes "$name")

  if [[ "$success_count" -ge "$CB_SUCCESS_THRESHOLD" ]]; then
    _cb_log "$name: Success threshold reached ($success_count >= $CB_SUCCESS_THRESHOLD)"
    return 0  # Should close
  fi
  return 1
}

# === Public API ===

# Check if request should be allowed
# Returns 0 if allowed, 1 if circuit is open
cb_allow_request() {
  local name="${1:-default}"

  _cb_init

  local state
  state=$(_cb_read_state "$name")

  case "$state" in
    "$CB_STATE_CLOSED")
      _cb_log "$name: CLOSED - allowing request"
      return 0
      ;;

    "$CB_STATE_OPEN")
      # Check if we should transition to half-open
      if _cb_check_should_half_open "$name"; then
        _cb_write_state "$name" "$CB_STATE_HALF_OPEN"
        _cb_clear_successes "$name"
        _cb_log "$name: OPEN -> HALF_OPEN - allowing test request"
        return 0
      fi
      _cb_log "$name: OPEN - rejecting request (fail-fast)"
      return 1
      ;;

    "$CB_STATE_HALF_OPEN")
      _cb_log "$name: HALF_OPEN - allowing test request"
      return 0
      ;;

    *)
      # Unknown state, default to closed
      _cb_write_state "$name" "$CB_STATE_CLOSED"
      return 0
      ;;
  esac
}

# Record successful request
cb_record_success() {
  local name="${1:-default}"

  local state
  state=$(_cb_read_state "$name")

  case "$state" in
    "$CB_STATE_CLOSED")
      # Clear any old failures on success
      # (helps prevent lingering failures from keeping count high)
      ;;

    "$CB_STATE_HALF_OPEN")
      _cb_add_success "$name"
      if _cb_check_should_close "$name"; then
        _cb_write_state "$name" "$CB_STATE_CLOSED"
        _cb_clear_failures "$name"
        _cb_clear_successes "$name"
        _cb_log "$name: HALF_OPEN -> CLOSED (recovered)"
      fi
      ;;
  esac
}

# Record failed request
cb_record_failure() {
  local name="${1:-default}"

  local state
  state=$(_cb_read_state "$name")

  _cb_add_failure "$name"

  case "$state" in
    "$CB_STATE_CLOSED")
      if _cb_check_should_open "$name"; then
        _cb_write_state "$name" "$CB_STATE_OPEN"
        _cb_log "$name: CLOSED -> OPEN (too many failures)"
      fi
      ;;

    "$CB_STATE_HALF_OPEN")
      # Any failure in half-open immediately opens circuit
      _cb_write_state "$name" "$CB_STATE_OPEN"
      _cb_clear_successes "$name"
      _cb_log "$name: HALF_OPEN -> OPEN (failed during recovery)"
      ;;
  esac
}

# Get circuit breaker status
cb_get_status() {
  local name="${1:-default}"

  _cb_init

  local state
  state=$(_cb_read_state "$name")
  local failures
  failures=$(_cb_count_recent_failures "$name")
  local successes
  successes=$(_cb_count_successes "$name")

  echo "{\"name\":\"$name\",\"state\":\"$state\",\"failures\":$failures,\"successes\":$successes,\"failure_threshold\":$CB_FAILURE_THRESHOLD,\"recovery_timeout_sec\":$CB_RECOVERY_TIMEOUT_SEC}"
}

# Force reset circuit breaker
cb_reset() {
  local name="${1:-default}"

  _cb_write_state "$name" "$CB_STATE_CLOSED"
  _cb_clear_failures "$name"
  _cb_clear_successes "$name"
  _cb_log "$name: Force reset to CLOSED"
}

# List all circuit breakers
cb_list_all() {
  _cb_init

  local result="["
  local first=true

  for state_file in "$CB_STATE_DIR"/*.state; do
    [[ ! -f "$state_file" ]] && continue

    local name
    name=$(basename "$state_file" .state)

    if [[ "$first" == "true" ]]; then
      first=false
    else
      result="$result,"
    fi

    result="$result$(cb_get_status "$name")"
  done

  result="$result]"
  echo "$result"
}
