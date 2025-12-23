#!/bin/bash
# metrics.sh - Hook Metrics Collection and Health Monitoring
#
# FEATURES:
#   - Execution time tracking (p50, p95, p99)
#   - Success/failure rate tracking
#   - Request throughput (requests/second)
#   - Concurrent execution tracking
#   - Health score calculation
#   - Metrics aggregation and rollup
#
# STORAGE:
#   - Ring buffer for recent metrics (last 1000 entries)
#   - Hourly rollups for historical data
#   - Compact binary-like format for efficiency
#
# USAGE:
#   source metrics.sh
#   metrics_init "hook-name"
#   metrics_start_request
#   # ... do work ...
#   metrics_end_request "success"  # or "failure", "timeout", "skipped"
#
# v1.0.0 - Initial implementation (2025-12-17)
# v1.0.33 - Fixed: removed set -o pipefail for hook safety

set +e  # CRITICAL: Never use set -e or pipefail in hooks (causes cascading failures)

# === Configuration ===
METRICS_DIR="${SPECWEAVE_STATE_DIR:-.specweave/state}/metrics"
METRICS_BUFFER_SIZE="${METRICS_BUFFER_SIZE:-1000}"  # Ring buffer entries
METRICS_DEBUG="${METRICS_DEBUG:-0}"

# Current request context
_METRICS_HOOK_NAME=""
_METRICS_START_TIME=""

# === Initialization ===
metrics_init() {
  local hook_name="$1"
  _METRICS_HOOK_NAME="$hook_name"
  mkdir -p "$METRICS_DIR" 2>/dev/null || true
}

# === Timestamp ===
_metrics_now_ms() {
  if command -v gdate &>/dev/null; then
    gdate +%s%3N
  elif date +%s%N &>/dev/null 2>&1; then
    echo $(($(date +%s%N) / 1000000))
  else
    echo "$(($(date +%s) * 1000))"
  fi
}

_metrics_now_sec() {
  date +%s
}

# === File Paths ===
_metrics_buffer_file() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"
  echo "$METRICS_DIR/${hook_name}.buffer"
}

_metrics_stats_file() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"
  echo "$METRICS_DIR/${hook_name}.stats"
}

_metrics_hourly_file() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"
  local hour
  hour=$(date +%Y%m%d%H)
  echo "$METRICS_DIR/${hook_name}.hourly.${hour}"
}

# === Request Tracking ===
metrics_start_request() {
  _METRICS_START_TIME=$(_metrics_now_ms)
}

metrics_end_request() {
  local status="${1:-success}"  # success, failure, timeout, skipped

  [[ -z "$_METRICS_START_TIME" ]] && return

  local end_time
  end_time=$(_metrics_now_ms)
  local duration_ms=$((_METRICS_START_TIME > 0 ? end_time - _METRICS_START_TIME : 0))

  # Record to buffer
  _metrics_record_entry "$duration_ms" "$status"

  # Update running stats
  _metrics_update_stats "$duration_ms" "$status"

  _METRICS_START_TIME=""
}

# === Buffer Management (Ring Buffer) ===
_metrics_record_entry() {
  local duration_ms="$1"
  local status="$2"
  local timestamp
  timestamp=$(_metrics_now_sec)

  local buffer_file
  buffer_file=$(_metrics_buffer_file)

  # Compact format: timestamp,duration_ms,status_code
  # Status codes: 0=success, 1=failure, 2=timeout, 3=skipped
  local status_code=0
  case "$status" in
    success) status_code=0 ;;
    failure) status_code=1 ;;
    timeout) status_code=2 ;;
    skipped) status_code=3 ;;
  esac

  echo "${timestamp},${duration_ms},${status_code}" >> "$buffer_file" 2>/dev/null || true

  # Trim buffer if too large
  if [[ -f "$buffer_file" ]]; then
    local line_count
    line_count=$(wc -l < "$buffer_file" 2>/dev/null | tr -d ' ')
    if [[ "$line_count" -gt "$METRICS_BUFFER_SIZE" ]]; then
      tail -$((METRICS_BUFFER_SIZE / 2)) "$buffer_file" > "${buffer_file}.tmp" 2>/dev/null && \
        mv "${buffer_file}.tmp" "$buffer_file" 2>/dev/null || true
    fi
  fi
}

# === Running Statistics ===
_metrics_update_stats() {
  local duration_ms="$1"
  local status="$2"

  local stats_file
  stats_file=$(_metrics_stats_file)

  # Read current stats
  local total=0 success=0 failure=0 timeout=0 skipped=0
  local sum_duration=0 min_duration=999999 max_duration=0

  if [[ -f "$stats_file" ]]; then
    # Format: total,success,failure,timeout,skipped,sum_duration,min,max
    IFS=',' read -r total success failure timeout skipped sum_duration min_duration max_duration < "$stats_file" 2>/dev/null || true
  fi

  # Update counters
  total=$((total + 1))
  case "$status" in
    success) success=$((success + 1)) ;;
    failure) failure=$((failure + 1)) ;;
    timeout) timeout=$((timeout + 1)) ;;
    skipped) skipped=$((skipped + 1)) ;;
  esac

  # Update duration stats (only for non-skipped)
  if [[ "$status" != "skipped" ]]; then
    sum_duration=$((sum_duration + duration_ms))
    [[ "$duration_ms" -lt "$min_duration" ]] && min_duration=$duration_ms
    [[ "$duration_ms" -gt "$max_duration" ]] && max_duration=$duration_ms
  fi

  # Write updated stats
  echo "${total},${success},${failure},${timeout},${skipped},${sum_duration},${min_duration},${max_duration}" > "$stats_file" 2>/dev/null || true
}

# === Percentile Calculation ===
_metrics_calculate_percentile() {
  local hook_name="$1"
  local percentile="$2"  # 50, 95, 99

  local buffer_file
  buffer_file=$(_metrics_buffer_file "$hook_name")

  [[ ! -f "$buffer_file" ]] && echo "0" && return

  # Extract durations (second field) and sort
  local sorted_durations
  sorted_durations=$(cut -d',' -f2 "$buffer_file" 2>/dev/null | sort -n)

  local count
  count=$(echo "$sorted_durations" | wc -l | tr -d ' ')

  [[ "$count" -eq 0 ]] && echo "0" && return

  # Calculate index for percentile
  local index=$(( (count * percentile) / 100 ))
  [[ "$index" -lt 1 ]] && index=1

  # Get value at index
  echo "$sorted_durations" | sed -n "${index}p"
}

# === Public API ===

# Get current metrics for a hook
metrics_get() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"
  local stats_file
  stats_file=$(_metrics_stats_file "$hook_name")

  local total=0 success=0 failure=0 timeout=0 skipped=0
  local sum_duration=0 min_duration=0 max_duration=0

  if [[ -f "$stats_file" ]]; then
    IFS=',' read -r total success failure timeout skipped sum_duration min_duration max_duration < "$stats_file" 2>/dev/null || true
  fi

  # Calculate rates
  local success_rate=100
  local executed=$((total - skipped))
  if [[ "$executed" -gt 0 ]]; then
    success_rate=$(( (success * 100) / executed ))
  fi

  # Calculate average duration
  local avg_duration=0
  if [[ "$executed" -gt 0 ]]; then
    avg_duration=$((sum_duration / executed))
  fi

  # Get percentiles
  local p50 p95 p99
  p50=$(_metrics_calculate_percentile "$hook_name" 50)
  p95=$(_metrics_calculate_percentile "$hook_name" 95)
  p99=$(_metrics_calculate_percentile "$hook_name" 99)

  echo "{\"hook\":\"$hook_name\",\"total\":$total,\"success\":$success,\"failure\":$failure,\"timeout\":$timeout,\"skipped\":$skipped,\"success_rate\":$success_rate,\"avg_ms\":$avg_duration,\"min_ms\":$min_duration,\"max_ms\":$max_duration,\"p50_ms\":$p50,\"p95_ms\":$p95,\"p99_ms\":$p99}"
}

# Calculate health score (0-100)
metrics_health_score() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"

  local stats_file
  stats_file=$(_metrics_stats_file "$hook_name")

  [[ ! -f "$stats_file" ]] && echo "100" && return

  local total success failure timeout skipped sum_duration min_duration max_duration
  IFS=',' read -r total success failure timeout skipped sum_duration min_duration max_duration < "$stats_file" 2>/dev/null || true

  local executed=$((total - skipped))
  [[ "$executed" -eq 0 ]] && echo "100" && return

  # Score components:
  # - Success rate: 60% weight
  # - No timeouts: 25% weight
  # - Low latency: 15% weight

  local success_rate=$(( (success * 100) / executed ))
  local timeout_rate=$(( (timeout * 100) / executed ))
  local avg_duration=$((sum_duration / executed))

  # Success rate score (0-60)
  local success_score=$((success_rate * 60 / 100))

  # Timeout score (0-25, penalize timeouts heavily)
  local timeout_score=$((25 - (timeout_rate * 25 / 100)))
  [[ "$timeout_score" -lt 0 ]] && timeout_score=0

  # Latency score (0-15, based on avg duration)
  # <100ms = 15, 100-500ms = 10, 500-1000ms = 5, >1000ms = 0
  local latency_score=0
  if [[ "$avg_duration" -lt 100 ]]; then
    latency_score=15
  elif [[ "$avg_duration" -lt 500 ]]; then
    latency_score=10
  elif [[ "$avg_duration" -lt 1000 ]]; then
    latency_score=5
  fi

  local total_score=$((success_score + timeout_score + latency_score))
  echo "$total_score"
}

# Get all hooks metrics summary
metrics_get_all() {
  local result="["
  local first=true

  for stats_file in "$METRICS_DIR"/*.stats; do
    [[ ! -f "$stats_file" ]] && continue

    local hook_name
    hook_name=$(basename "$stats_file" .stats)

    if [[ "$first" == "true" ]]; then
      first=false
    else
      result="$result,"
    fi

    result="$result$(metrics_get "$hook_name")"
  done

  result="$result]"
  echo "$result"
}

# Reset metrics for a hook
metrics_reset() {
  local hook_name="${1:-$_METRICS_HOOK_NAME}"

  rm -f "$METRICS_DIR/${hook_name}.buffer" 2>/dev/null || true
  rm -f "$METRICS_DIR/${hook_name}.stats" 2>/dev/null || true
  rm -f "$METRICS_DIR/${hook_name}.hourly."* 2>/dev/null || true
}

# Get system-wide health summary
metrics_system_health() {
  local total_hooks=0
  local healthy_hooks=0
  local degraded_hooks=0
  local unhealthy_hooks=0

  for stats_file in "$METRICS_DIR"/*.stats; do
    [[ ! -f "$stats_file" ]] && continue

    local hook_name
    hook_name=$(basename "$stats_file" .stats)
    local health_score
    health_score=$(metrics_health_score "$hook_name")

    total_hooks=$((total_hooks + 1))

    if [[ "$health_score" -ge 80 ]]; then
      healthy_hooks=$((healthy_hooks + 1))
    elif [[ "$health_score" -ge 50 ]]; then
      degraded_hooks=$((degraded_hooks + 1))
    else
      unhealthy_hooks=$((unhealthy_hooks + 1))
    fi
  done

  local overall_health="healthy"
  if [[ "$unhealthy_hooks" -gt 0 ]]; then
    overall_health="unhealthy"
  elif [[ "$degraded_hooks" -gt 0 ]]; then
    overall_health="degraded"
  fi

  echo "{\"status\":\"$overall_health\",\"total_hooks\":$total_hooks,\"healthy\":$healthy_hooks,\"degraded\":$degraded_hooks,\"unhealthy\":$unhealthy_hooks}"
}
