#!/bin/bash
# logging.sh - Structured logging for SpecWeave hooks
#
# FEATURES:
#   - Structured JSON logs for machine parsing
#   - Human-readable console output
#   - Request ID tracing across hook chains
#   - Log levels (DEBUG, INFO, WARN, ERROR)
#   - Automatic log rotation
#   - Performance timing
#
# USAGE:
#   source logging.sh
#   log_init "hook-name"
#   log_info "Processing request"
#   log_error "Something failed" "error_code=123"
#   log_timing_start "operation"
#   # ... do work ...
#   log_timing_end "operation"
#
# v1.0.0 - Initial implementation (2025-12-17)

# === Configuration ===
LOG_DIR="${SPECWEAVE_LOG_DIR:-.specweave/logs/hooks}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"  # DEBUG, INFO, WARN, ERROR
LOG_FORMAT="${LOG_FORMAT:-json}"  # json, text
LOG_MAX_SIZE_KB="${LOG_MAX_SIZE_KB:-1024}"  # 1MB per file
LOG_ROTATION_COUNT="${LOG_ROTATION_COUNT:-5}"

# Log level numeric values
declare -A LOG_LEVELS=([DEBUG]=0 [INFO]=1 [WARN]=2 [ERROR]=3)

# Request context
_LOG_REQUEST_ID=""
_LOG_HOOK_NAME=""
_LOG_START_TIME=""
declare -A _LOG_TIMINGS

# === Initialization ===
log_init() {
  local hook_name="$1"

  mkdir -p "$LOG_DIR" 2>/dev/null || true

  _LOG_HOOK_NAME="$hook_name"
  _LOG_REQUEST_ID="${REQUEST_ID:-$(generate_request_id)}"
  _LOG_START_TIME=$(get_timestamp_ms)

  export REQUEST_ID="$_LOG_REQUEST_ID"
}

# === Request ID Generation ===
generate_request_id() {
  # Format: HHMMSS-RANDOM (compact but unique enough for tracing)
  local time_part
  time_part=$(date +%H%M%S)
  local random_part
  random_part=$(printf '%04x' $((RANDOM % 65536)))
  echo "${time_part}-${random_part}"
}

# === Timestamp ===
get_timestamp_ms() {
  if command -v gdate &>/dev/null; then
    gdate +%s%3N
  elif date +%s%N &>/dev/null 2>&1; then
    echo $(($(date +%s%N) / 1000000))
  else
    echo "$(($(date +%s) * 1000))"
  fi
}

get_timestamp_iso() {
  date -u +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# === Level Check ===
_should_log() {
  local level="$1"
  local level_num="${LOG_LEVELS[$level]:-1}"
  local threshold_num="${LOG_LEVELS[$LOG_LEVEL]:-1}"
  [[ "$level_num" -ge "$threshold_num" ]]
}

# === Log Rotation ===
_rotate_log_if_needed() {
  local log_file="$1"

  [[ ! -f "$log_file" ]] && return

  local size_kb
  if [[ "$(uname)" == "Darwin" ]]; then
    size_kb=$(($(stat -f %z "$log_file" 2>/dev/null || echo 0) / 1024))
  else
    size_kb=$(($(stat -c %s "$log_file" 2>/dev/null || echo 0) / 1024))
  fi

  if [[ "$size_kb" -gt "$LOG_MAX_SIZE_KB" ]]; then
    # Rotate logs
    for i in $(seq $((LOG_ROTATION_COUNT - 1)) -1 1); do
      [[ -f "${log_file}.$i" ]] && mv "${log_file}.$i" "${log_file}.$((i + 1))" 2>/dev/null
    done
    mv "$log_file" "${log_file}.1" 2>/dev/null || true
  fi
}

# === Core Logging Function ===
_log() {
  local level="$1"
  local message="$2"
  shift 2
  local extra_fields=("$@")

  _should_log "$level" || return 0

  local timestamp
  timestamp=$(get_timestamp_iso)

  local log_file="$LOG_DIR/${_LOG_HOOK_NAME:-hooks}.log"
  _rotate_log_if_needed "$log_file"

  if [[ "$LOG_FORMAT" == "json" ]]; then
    # Build JSON log entry
    local json="{\"ts\":\"$timestamp\",\"level\":\"$level\",\"hook\":\"${_LOG_HOOK_NAME:-unknown}\",\"rid\":\"${_LOG_REQUEST_ID:-none}\",\"msg\":\"$message\""

    # Add extra fields
    for field in "${extra_fields[@]}"; do
      local key="${field%%=*}"
      local value="${field#*=}"
      # Escape quotes in value
      value="${value//\"/\\\"}"
      json="$json,\"$key\":\"$value\""
    done

    json="$json}"
    echo "$json" >> "$log_file" 2>/dev/null || true
  else
    # Text format
    local prefix="[$timestamp] [$level] [${_LOG_HOOK_NAME:-unknown}] [${_LOG_REQUEST_ID:-none}]"
    echo "$prefix $message ${extra_fields[*]}" >> "$log_file" 2>/dev/null || true
  fi

  # Also output to stderr if DEBUG level and debug mode enabled
  if [[ "$level" == "DEBUG" ]] && [[ "${HOOK_DEBUG:-0}" == "1" ]]; then
    echo "[HOOK-$level] $_LOG_HOOK_NAME: $message" >&2
  fi
}

# === Public Logging Functions ===
log_debug() {
  _log "DEBUG" "$1" "${@:2}"
}

log_info() {
  _log "INFO" "$1" "${@:2}"
}

log_warn() {
  _log "WARN" "$1" "${@:2}"
}

log_error() {
  _log "ERROR" "$1" "${@:2}"
}

# === Performance Timing ===
log_timing_start() {
  local operation="$1"
  _LOG_TIMINGS[$operation]=$(get_timestamp_ms)
}

log_timing_end() {
  local operation="$1"
  local start_time="${_LOG_TIMINGS[$operation]:-0}"

  if [[ "$start_time" -gt 0 ]]; then
    local end_time
    end_time=$(get_timestamp_ms)
    local duration_ms=$((end_time - start_time))

    log_debug "Timing: $operation completed" "duration_ms=$duration_ms"
    unset "_LOG_TIMINGS[$operation]"

    echo "$duration_ms"
  else
    echo "0"
  fi
}

# === Request Summary ===
log_request_summary() {
  local status="$1"
  local details="$2"

  local total_duration=0
  if [[ -n "$_LOG_START_TIME" ]]; then
    local end_time
    end_time=$(get_timestamp_ms)
    total_duration=$((end_time - _LOG_START_TIME))
  fi

  log_info "Request completed" "status=$status" "total_ms=$total_duration" "details=$details"
}

# === Aggregate Log Stats ===
get_log_stats() {
  local hook_name="${1:-$_LOG_HOOK_NAME}"
  local log_file="$LOG_DIR/${hook_name}.log"

  [[ ! -f "$log_file" ]] && echo '{"total":0,"errors":0,"warns":0}' && return

  local total errors warns
  total=$(wc -l < "$log_file" 2>/dev/null | tr -d ' ')
  errors=$(grep -c '"level":"ERROR"' "$log_file" 2>/dev/null || echo 0)
  warns=$(grep -c '"level":"WARN"' "$log_file" 2>/dev/null || echo 0)

  echo "{\"total\":$total,\"errors\":$errors,\"warns\":$warns}"
}

# === Correlation ID Propagation ===
# Use this to pass request ID to child processes
export_request_context() {
  export REQUEST_ID="$_LOG_REQUEST_ID"
  export HOOK_NAME="$_LOG_HOOK_NAME"
}

# Import context from parent
import_request_context() {
  _LOG_REQUEST_ID="${REQUEST_ID:-$(generate_request_id)}"
  _LOG_HOOK_NAME="${HOOK_NAME:-unknown}"
}
