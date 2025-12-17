#!/bin/bash
# hook-health.sh - Hook Health Dashboard
#
# Provides comprehensive visibility into hook system health:
# - Circuit breaker states
# - Semaphore utilization
# - Metrics and performance stats
# - Recent failures and errors
#
# Usage:
#   bash hook-health.sh              # Full dashboard
#   bash hook-health.sh --status     # Quick status check
#   bash hook-health.sh --metrics    # Detailed metrics
#   bash hook-health.sh --reset      # Reset all circuit breakers
#   bash hook-health.sh --clean      # Clean up stale state
#
# v1.0.0 - Initial implementation (2025-12-17)

set -uo pipefail

# === Configuration ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_LIB_DIR="${SCRIPT_DIR}/../hooks/lib"
STATE_DIR="${SPECWEAVE_STATE_DIR:-.specweave/state}"
LOG_DIR="${SPECWEAVE_LOG_DIR:-.specweave/logs/hooks}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# === Source libraries ===
source_lib() {
  local lib="$1"
  if [[ -f "$HOOK_LIB_DIR/$lib" ]]; then
    source "$HOOK_LIB_DIR/$lib" 2>/dev/null
    return 0
  fi
  return 1
}

# === Print helpers ===
print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
  echo ""
  echo -e "${CYAN}▸ $1${NC}"
  echo -e "${CYAN}─────────────────────────────────────${NC}"
}

print_status() {
  local status="$1"
  local label="$2"
  case "$status" in
    healthy|CLOSED|success)
      echo -e "  ${GREEN}●${NC} $label"
      ;;
    degraded|HALF_OPEN|warning)
      echo -e "  ${YELLOW}●${NC} $label"
      ;;
    unhealthy|OPEN|error)
      echo -e "  ${RED}●${NC} $label"
      ;;
    *)
      echo -e "  ○ $label"
      ;;
  esac
}

# === Circuit Breaker Status ===
show_circuit_breakers() {
  print_section "Circuit Breakers"

  if ! source_lib "circuit-breaker.sh"; then
    echo "  Circuit breaker library not found"
    return
  fi

  local cb_dir="$STATE_DIR/circuit-breakers"
  if [[ ! -d "$cb_dir" ]] || [[ -z "$(ls -A "$cb_dir" 2>/dev/null)" ]]; then
    echo "  No circuit breakers active (all hooks healthy)"
    return
  fi

  local found=false
  for state_file in "$cb_dir"/*.state; do
    [[ ! -f "$state_file" ]] && continue
    found=true

    local name
    name=$(basename "$state_file" .state)
    local status
    status=$(cb_get_status "$name")

    local state failures
    state=$(echo "$status" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
    failures=$(echo "$status" | grep -o '"failures":[0-9]*' | cut -d':' -f2)

    print_status "$state" "$name: $state (failures: $failures)"
  done
  [[ "$found" == "false" ]] && echo "  All circuits healthy (no breakers active)"
}

# === Semaphore Status ===
show_semaphore_status() {
  print_section "Semaphore Status"

  if ! source_lib "semaphore.sh"; then
    echo "  Semaphore library not found"
    return
  fi

  local max_concurrent="${HOOK_MAX_CONCURRENT:-15}"
  local status
  status=$(get_semaphore_status "hooks" "$max_concurrent")

  local active available
  active=$(echo "$status" | grep -o '"active":[0-9]*' | cut -d':' -f2)
  available=$(echo "$status" | grep -o '"available":[0-9]*' | cut -d':' -f2)

  echo "  Max concurrent: $max_concurrent"
  echo "  Active slots:   $active"
  echo "  Available:      $available"

  # Show utilization bar
  local pct=$((active * 100 / max_concurrent))
  local bar_width=30
  local filled=$((pct * bar_width / 100))

  printf "  Utilization:    ["
  for ((i=0; i<bar_width; i++)); do
    if [[ $i -lt $filled ]]; then
      if [[ $pct -gt 80 ]]; then
        printf "${RED}█${NC}"
      elif [[ $pct -gt 60 ]]; then
        printf "${YELLOW}█${NC}"
      else
        printf "${GREEN}█${NC}"
      fi
    else
      printf "░"
    fi
  done
  printf "] %d%%\n" "$pct"
}

# === Metrics Summary ===
show_metrics() {
  print_section "Hook Metrics"

  if ! source_lib "metrics.sh"; then
    echo "  Metrics library not found"
    return
  fi

  local metrics_dir="$STATE_DIR/metrics"
  if [[ ! -d "$metrics_dir" ]] || [[ -z "$(ls -A "$metrics_dir" 2>/dev/null)" ]]; then
    echo "  No metrics collected yet"
    return
  fi

  # System health
  local system_health
  system_health=$(metrics_system_health)
  local status total_hooks healthy degraded unhealthy
  status=$(echo "$system_health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  total_hooks=$(echo "$system_health" | grep -o '"total_hooks":[0-9]*' | cut -d':' -f2)
  healthy=$(echo "$system_health" | grep -o '"healthy":[0-9]*' | cut -d':' -f2)
  degraded=$(echo "$system_health" | grep -o '"degraded":[0-9]*' | cut -d':' -f2)
  unhealthy=$(echo "$system_health" | grep -o '"unhealthy":[0-9]*' | cut -d':' -f2)

  print_status "$status" "System Health: $status"
  echo "  Total hooks tracked: $total_hooks"
  echo "  Healthy:   ${GREEN}$healthy${NC}"
  echo "  Degraded:  ${YELLOW}$degraded${NC}"
  echo "  Unhealthy: ${RED}$unhealthy${NC}"

  # Per-hook metrics
  if [[ "${1:-}" == "--detailed" ]]; then
    echo ""
    echo "  Per-Hook Metrics:"
    echo "  ────────────────────────────────────────────────────────────────"
    printf "  %-25s %8s %8s %8s %8s\n" "Hook" "Total" "Success%" "Avg(ms)" "P95(ms)"
    echo "  ────────────────────────────────────────────────────────────────"

    for stats_file in "$metrics_dir"/*.stats; do
      [[ ! -f "$stats_file" ]] && continue

      local name
      name=$(basename "$stats_file" .stats)
      local metrics
      metrics=$(metrics_get "$name")

      local total success_rate avg_ms p95_ms
      total=$(echo "$metrics" | grep -o '"total":[0-9]*' | cut -d':' -f2)
      success_rate=$(echo "$metrics" | grep -o '"success_rate":[0-9]*' | cut -d':' -f2)
      avg_ms=$(echo "$metrics" | grep -o '"avg_ms":[0-9]*' | cut -d':' -f2)
      p95_ms=$(echo "$metrics" | grep -o '"p95_ms":[0-9]*' | cut -d':' -f2)

      printf "  %-25s %8s %7s%% %8s %8s\n" "$name" "$total" "$success_rate" "$avg_ms" "$p95_ms"
    done
  fi
}

# === Recent Failures ===
show_recent_failures() {
  print_section "Recent Failures"

  local failure_log="$HOME/.claude/hook-failures.log"
  if [[ ! -f "$failure_log" ]]; then
    echo "  No failures recorded"
    return
  fi

  local count
  count=$(wc -l < "$failure_log" 2>/dev/null | tr -d ' ')

  if [[ "$count" -eq 0 ]]; then
    echo "  No failures recorded"
    return
  fi

  echo "  Total failures recorded: $count"
  echo ""
  echo "  Last 5 failures:"
  tail -5 "$failure_log" | while read -r line; do
    echo "    $line"
  done
}

# === Hook Logs ===
show_recent_logs() {
  print_section "Recent Hook Logs"

  if [[ ! -d "$LOG_DIR" ]] || [[ -z "$(ls -A "$LOG_DIR" 2>/dev/null)" ]]; then
    echo "  No hook logs found"
    return
  fi

  echo "  Log files:"
  for log_file in "$LOG_DIR"/*.log; do
    [[ ! -f "$log_file" ]] && continue
    local name size lines
    name=$(basename "$log_file")
    size=$(du -h "$log_file" 2>/dev/null | cut -f1)
    lines=$(wc -l < "$log_file" 2>/dev/null | tr -d ' ')
    echo "    $name: $lines lines, $size"
  done

  echo ""
  echo "  Recent errors (last 5):"
  grep '"level":"ERROR"' "$LOG_DIR"/*.log 2>/dev/null | tail -5 | while read -r line; do
    local msg
    msg=$(echo "$line" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
    echo "    ERROR: $msg"
  done || echo "    No errors found"
}

# === Quick Status ===
show_quick_status() {
  echo -e "${BOLD}Hook System Status${NC}"
  echo ""

  # Check libraries
  local libs_ok=true
  for lib in semaphore.sh circuit-breaker.sh metrics.sh logging.sh; do
    if [[ -f "$HOOK_LIB_DIR/$lib" ]]; then
      echo -e "  ${GREEN}✓${NC} $lib"
    else
      echo -e "  ${RED}✗${NC} $lib (missing)"
      libs_ok=false
    fi
  done

  echo ""

  # System health
  if source_lib "metrics.sh"; then
    local health
    health=$(metrics_system_health)
    local status
    status=$(echo "$health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    print_status "$status" "System health: $status"
  fi

  # Semaphore
  if source_lib "semaphore.sh"; then
    local sem_status
    sem_status=$(get_semaphore_status "hooks" 15)
    local active
    active=$(echo "$sem_status" | grep -o '"active":[0-9]*' | cut -d':' -f2)
    echo "  Active hooks: $active/15"
  fi

  # Recent failures
  local failure_log="$HOME/.claude/hook-failures.log"
  if [[ -f "$failure_log" ]]; then
    local recent_failures
    recent_failures=$(tail -100 "$failure_log" 2>/dev/null | grep -c "$(date +%Y-%m-%d)" 2>/dev/null) || recent_failures=0
    if [[ "$recent_failures" -gt 0 ]]; then
      echo -e "  ${YELLOW}⚠${NC}  Today's failures: $recent_failures"
    fi
  fi
}

# === Reset Circuit Breakers ===
reset_circuit_breakers() {
  print_section "Resetting Circuit Breakers"

  if ! source_lib "circuit-breaker.sh"; then
    echo "  Circuit breaker library not found"
    return 1
  fi

  local cb_dir="$STATE_DIR/circuit-breakers"
  if [[ ! -d "$cb_dir" ]]; then
    echo "  No circuit breakers to reset"
    return 0
  fi

  for state_file in "$cb_dir"/*.state; do
    [[ ! -f "$state_file" ]] && continue

    local name
    name=$(basename "$state_file" .state)
    cb_reset "$name"
    echo "  ✓ Reset: $name"
  done

  echo ""
  echo "  All circuit breakers reset to CLOSED state"
}

# === Cleanup Stale State ===
cleanup_state() {
  print_section "Cleaning Up Stale State"

  # Clean semaphore locks
  local sem_dir="$STATE_DIR/semaphores"
  if [[ -d "$sem_dir" ]]; then
    local stale_count=0
    for lock_dir in "$sem_dir"/*; do
      [[ ! -d "$lock_dir" ]] && continue
      if source_lib "semaphore.sh"; then
        local name
        name=$(basename "$lock_dir")
        cleanup_stale_locks "$name"
        stale_count=$((stale_count + 1))
      fi
    done
    echo "  ✓ Cleaned semaphore locks ($stale_count pools)"
  fi

  # Clean old metrics
  local metrics_dir="$STATE_DIR/metrics"
  if [[ -d "$metrics_dir" ]]; then
    # Remove hourly files older than 24 hours
    find "$metrics_dir" -name "*.hourly.*" -mtime +1 -delete 2>/dev/null || true
    echo "  ✓ Cleaned old hourly metrics"
  fi

  # Rotate log files
  if [[ -d "$LOG_DIR" ]]; then
    for log_file in "$LOG_DIR"/*.log; do
      [[ ! -f "$log_file" ]] && continue
      local lines
      lines=$(wc -l < "$log_file" 2>/dev/null | tr -d ' ')
      if [[ "$lines" -gt 10000 ]]; then
        tail -5000 "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
        echo "  ✓ Rotated $(basename "$log_file") ($lines -> 5000 lines)"
      fi
    done
  fi

  echo ""
  echo "  Cleanup complete"
}

# === Full Dashboard ===
show_dashboard() {
  print_header "SpecWeave Hook Health Dashboard"
  echo "  $(date)"

  show_circuit_breakers
  show_semaphore_status
  show_metrics
  show_recent_failures
  show_recent_logs

  echo ""
  echo -e "${CYAN}Commands:${NC}"
  echo "  bash hook-health.sh --status     Quick status check"
  echo "  bash hook-health.sh --metrics    Detailed metrics"
  echo "  bash hook-health.sh --reset      Reset circuit breakers"
  echo "  bash hook-health.sh --clean      Clean stale state"
  echo ""
}

# === Main ===
main() {
  case "${1:-}" in
    --status|-s)
      show_quick_status
      ;;
    --metrics|-m)
      source_lib "metrics.sh" && show_metrics "--detailed"
      ;;
    --reset|-r)
      reset_circuit_breakers
      ;;
    --clean|-c)
      cleanup_state
      ;;
    --help|-h)
      echo "Usage: hook-health.sh [option]"
      echo ""
      echo "Options:"
      echo "  --status, -s   Quick status check"
      echo "  --metrics, -m  Detailed metrics"
      echo "  --reset, -r    Reset circuit breakers"
      echo "  --clean, -c    Clean stale state"
      echo "  --help, -h     Show this help"
      echo ""
      echo "No option: Full dashboard"
      ;;
    *)
      show_dashboard
      ;;
  esac
}

main "$@"
