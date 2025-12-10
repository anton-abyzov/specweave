#!/usr/bin/env bash
# SpecWeave Session Watchdog v2.0
# Monitors Claude Code sessions and alerts ONLY when something is REALLY wrong
#
# FIXES (2025-12-10):
# - ELIMINATED FALSE POSITIVES: No longer triggers on stale files alone
# - SMART DETECTION: Verifies actual stuck processes, not just file ages
# - SEVERITY LEVELS: Only CRITICAL issues trigger notifications
# - DIAGNOSTICS: Writes detailed logs for /specweave:jobs to display
#
# Usage: bash session-watchdog.sh [--daemon] [--interval=60] [--threshold=300]

set -euo pipefail

# Configuration
STUCK_THRESHOLD_SECONDS="${STUCK_THRESHOLD:-300}"  # 5 minutes
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"             # 1 minute
SPECWEAVE_ROOT="${SPECWEAVE_ROOT:-.specweave}"
SIGNAL_FILE="${SPECWEAVE_ROOT}/state/.session-stuck"
DIAGNOSTICS_FILE="${SPECWEAVE_ROOT}/state/.watchdog-diagnostics.json"
DAEMON_MODE=false
QUIET_MODE=false

# Severity levels (only CRITICAL triggers notifications)
SEVERITY_INFO=0
SEVERITY_WARNING=1
SEVERITY_CRITICAL=2

# Track consecutive warnings (avoids single-check false positives)
CONSECUTIVE_WARNINGS=0
CONSECUTIVE_THRESHOLD=3  # Need 3 consecutive warnings before alerting

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
for arg in "$@"; do
  case $arg in
    --daemon)
      DAEMON_MODE=true
      ;;
    --quiet)
      QUIET_MODE=true
      ;;
    --interval=*)
      CHECK_INTERVAL="${arg#*=}"
      ;;
    --threshold=*)
      STUCK_THRESHOLD_SECONDS="${arg#*=}"
      ;;
  esac
done

log() {
  [[ "$QUIET_MODE" == "true" ]] && return
  echo -e "[$(date '+%H:%M:%S')] $1"
}

log_debug() {
  # Always write to diagnostics file even in quiet mode
  echo "[$(date '+%H:%M:%S')] $1" >> "${SPECWEAVE_ROOT}/logs/watchdog.log" 2>/dev/null || true
}

# Send notification ONLY for critical issues
send_notification() {
  local severity="$1"
  local title="$2"
  local message="$3"

  # Only notify for CRITICAL severity
  if [[ "$severity" -lt "$SEVERITY_CRITICAL" ]]; then
    log_debug "Skipping notification (severity=$severity, need=$SEVERITY_CRITICAL): $message"
    return
  fi

  # macOS notification - use "Submarine" for warnings (not alarming like "Basso")
  # Per CLAUDE.md section 11: Basso = ONLY critical errors requiring IMMEDIATE action
  # Zombie detection is recoverable - user can run cleanup script when convenient
  if command -v osascript &> /dev/null; then
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"Submarine\""
  fi

  # Linux notification (if available) - use "normal" urgency (not "critical")
  # Critical urgency can bypass Do Not Disturb, which is too aggressive
  if command -v notify-send &> /dev/null; then
    notify-send "$title" "$message" --urgency=normal
  fi

  # Windows: notifications sent via PowerShell toast don't have urgency levels
  # They're always non-alarming by design
}

get_file_age_seconds() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "-1"  # -1 means file doesn't exist (not an error)
    return
  fi

  local now mtime
  now=$(date +%s)

  if [[ "$(uname)" == "Darwin" ]]; then
    mtime=$(stat -f %m "$file" 2>/dev/null || echo "$now")
  else
    mtime=$(stat -c %Y "$file" 2>/dev/null || echo "$now")
  fi

  echo $((now - mtime))
}

# Check if a process is actually running
is_process_running() {
  local pid="$1"
  if [[ -z "$pid" ]] || [[ "$pid" == "0" ]]; then
    return 1
  fi
  kill -0 "$pid" 2>/dev/null
}

# SMART lock file check - verifies the PROCESS is actually stuck, not just file age
check_lock_file() {
  local lock_dir="${SPECWEAVE_ROOT}/state/.processor.lock.d"
  local lock_file="${SPECWEAVE_ROOT}/state/.processor.lock"
  local result_severity=$SEVERITY_INFO
  local result_message=""

  # Check new lock directory format first (v2)
  if [[ -d "$lock_dir" ]] && [[ -f "$lock_dir/pid" ]]; then
    local lock_pid
    lock_pid=$(cat "$lock_dir/pid" 2>/dev/null || echo "")

    if [[ -n "$lock_pid" ]]; then
      if is_process_running "$lock_pid"; then
        # Process is actually running - check how long
        local age
        age=$(get_file_age_seconds "$lock_dir/pid")
        if [[ "$age" -gt "$STUCK_THRESHOLD_SECONDS" ]]; then
          result_severity=$SEVERITY_WARNING
          result_message="Processor PID $lock_pid running for ${age}s (might be legitimate long operation)"
        else
          result_message="Processor PID $lock_pid active (${age}s)"
        fi
      else
        # PID file exists but process is dead = STALE LOCK (cleanup needed, not stuck)
        result_severity=$SEVERITY_WARNING
        result_message="Stale lock: PID $lock_pid no longer running (auto-cleanup will handle)"
        # Don't trigger alert - processor will clean this up on next run
      fi
    fi
  # Check old lock file format (legacy)
  elif [[ -f "$lock_file" ]]; then
    local age
    age=$(get_file_age_seconds "$lock_file")
    if [[ "$age" -gt "$STUCK_THRESHOLD_SECONDS" ]]; then
      result_severity=$SEVERITY_WARNING
      result_message="Legacy lock file age: ${age}s (consider running cleanup-state.sh)"
    fi
  fi

  # Write diagnostic
  echo "lock_status=$result_severity" >> "$DIAGNOSTICS_FILE.tmp"
  echo "lock_message=$result_message" >> "$DIAGNOSTICS_FILE.tmp"

  if [[ -n "$result_message" ]]; then
    log_debug "Lock check: $result_message"
  fi

  return $result_severity
}

# Check for ACTUAL zombie heredoc processes (CRITICAL - this is a real stuck indicator)
check_zombie_processes() {
  local result_severity=$SEVERITY_INFO
  local result_message=""

  # Look for cat processes waiting for EOF (heredoc stuck)
  local cat_zombies
  cat_zombies=$(pgrep -f "cat.*EOF" 2>/dev/null | wc -l | tr -d ' \n' || echo "0")
  cat_zombies="${cat_zombies:-0}"
  [[ ! "$cat_zombies" =~ ^[0-9]+$ ]] && cat_zombies=0

  # Look for bash processes that seem stuck on heredoc
  local bash_heredocs
  bash_heredocs=$(pgrep -f "bash.*<<" 2>/dev/null | wc -l | tr -d ' \n' || echo "0")
  bash_heredocs="${bash_heredocs:-0}"
  [[ ! "$bash_heredocs" =~ ^[0-9]+$ ]] && bash_heredocs=0

  local total_zombies=$((cat_zombies + bash_heredocs))

  if [[ "$total_zombies" -gt 0 ]]; then
    result_severity=$SEVERITY_CRITICAL  # This is DEFINITELY stuck!
    result_message="$total_zombies zombie heredoc processes detected (cat=$cat_zombies, bash=$bash_heredocs)"
    log "${RED}🚨 CRITICAL: $result_message${NC}"
  fi

  echo "zombie_count=$total_zombies" >> "$DIAGNOSTICS_FILE.tmp"
  echo "zombie_message=$result_message" >> "$DIAGNOSTICS_FILE.tmp"

  return $result_severity
}

# Check MCP connection health (WARNING level, not critical)
check_mcp_health() {
  local result_severity=$SEVERITY_INFO
  local result_message=""
  local drops=0
  local debug_log="$HOME/.claude/debug/latest"

  if [[ -f "$debug_log" ]]; then
    # Count MCP drops in last 500 lines
    drops=$(tail -500 "$debug_log" 2>/dev/null | grep -c "WS-IDE connection dropped" 2>/dev/null || echo "0")
    drops="${drops//[^0-9]/}"
    drops="${drops:-0}"
    [[ ! "$drops" =~ ^[0-9]+$ ]] && drops=0

    if [[ "$drops" -gt 10 ]]; then
      result_severity=$SEVERITY_WARNING
      result_message="MCP instability: $drops connection drops (consider restarting VS Code Extension Host)"
    elif [[ "$drops" -gt 3 ]]; then
      result_message="MCP: $drops drops detected (minor instability)"
    fi
  fi

  echo "mcp_drops=$drops" >> "$DIAGNOSTICS_FILE.tmp"
  echo "mcp_message=$result_message" >> "$DIAGNOSTICS_FILE.tmp"

  return $result_severity
}

# Check for orphaned background jobs (informational, not critical)
check_orphaned_jobs() {
  local result_severity=$SEVERITY_INFO
  local result_message=""
  local jobs_dir="${SPECWEAVE_ROOT}/state/jobs"
  local orphaned_count=0

  if [[ -d "$jobs_dir" ]]; then
    for job_dir in "$jobs_dir"/*/; do
      [[ ! -d "$job_dir" ]] && continue

      local pid_file="${job_dir}worker.pid"
      local config_file="${job_dir}config.json"

      if [[ -f "$pid_file" ]] && [[ -f "$config_file" ]]; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && ! is_process_running "$pid"; then
          orphaned_count=$((orphaned_count + 1))
        fi
      fi
    done
  fi

  if [[ "$orphaned_count" -gt 0 ]]; then
    result_message="$orphaned_count orphaned job(s) found (run /specweave:jobs to see details)"
  fi

  echo "orphaned_jobs=$orphaned_count" >> "$DIAGNOSTICS_FILE.tmp"
  echo "orphaned_message=$result_message" >> "$DIAGNOSTICS_FILE.tmp"

  return $result_severity
}

# Write diagnostics file for /specweave:jobs to read
write_diagnostics() {
  local overall_severity="$1"
  local overall_status="$2"

  {
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"severity\": $overall_severity,"
    echo "  \"status\": \"$overall_status\","

    # Parse temp file into JSON
    local lock_status="" lock_message="" zombie_count="" zombie_message=""
    local mcp_drops="" mcp_message="" orphaned_jobs="" orphaned_message=""

    while IFS='=' read -r key value; do
      case "$key" in
        lock_status) lock_status="$value" ;;
        lock_message) lock_message="$value" ;;
        zombie_count) zombie_count="$value" ;;
        zombie_message) zombie_message="$value" ;;
        mcp_drops) mcp_drops="$value" ;;
        mcp_message) mcp_message="$value" ;;
        orphaned_jobs) orphaned_jobs="$value" ;;
        orphaned_message) orphaned_message="$value" ;;
      esac
    done < "$DIAGNOSTICS_FILE.tmp" 2>/dev/null || true

    # Sanitize numeric values (ensure single digit format)
    lock_status="${lock_status:-0}"; [[ ! "$lock_status" =~ ^[0-9]+$ ]] && lock_status=0
    zombie_count="${zombie_count:-0}"; [[ ! "$zombie_count" =~ ^[0-9]+$ ]] && zombie_count=0
    mcp_drops="${mcp_drops:-0}"; [[ ! "$mcp_drops" =~ ^[0-9]+$ ]] && mcp_drops=0
    orphaned_jobs="${orphaned_jobs:-0}"; [[ ! "$orphaned_jobs" =~ ^[0-9]+$ ]] && orphaned_jobs=0

    echo "  \"checks\": {"
    echo "    \"lock\": { \"severity\": $((lock_status)), \"message\": \"${lock_message:-ok}\" },"
    echo "    \"zombies\": { \"count\": $((zombie_count)), \"message\": \"${zombie_message:-none}\" },"
    echo "    \"mcp\": { \"drops\": $((mcp_drops)), \"message\": \"${mcp_message:-stable}\" },"
    echo "    \"orphanedJobs\": { \"count\": $((orphaned_jobs)), \"message\": \"${orphaned_message:-none}\" }"
    echo "  },"
    echo "  \"consecutiveWarnings\": $CONSECUTIVE_WARNINGS,"
    echo "  \"thresholdSeconds\": $STUCK_THRESHOLD_SECONDS,"
    echo "  \"checkIntervalSeconds\": $CHECK_INTERVAL"
    echo "}"
  } > "$DIAGNOSTICS_FILE"

  rm -f "$DIAGNOSTICS_FILE.tmp"
}

check_session_health() {
  local max_severity=$SEVERITY_INFO
  local issues=()

  # Initialize temp diagnostics file
  mkdir -p "$(dirname "$DIAGNOSTICS_FILE")"
  : > "$DIAGNOSTICS_FILE.tmp"

  # Run all checks
  check_lock_file || true
  local lock_sev=$?
  [[ $lock_sev -gt $max_severity ]] && max_severity=$lock_sev

  check_zombie_processes || true
  local zombie_sev=$?
  [[ $zombie_sev -gt $max_severity ]] && max_severity=$zombie_sev

  check_mcp_health || true
  local mcp_sev=$?
  [[ $mcp_sev -gt $max_severity ]] && max_severity=$mcp_sev

  check_orphaned_jobs || true

  # Determine overall status
  local overall_status="healthy"
  if [[ $max_severity -eq $SEVERITY_CRITICAL ]]; then
    overall_status="critical"
    CONSECUTIVE_WARNINGS=$((CONSECUTIVE_WARNINGS + 1))
  elif [[ $max_severity -eq $SEVERITY_WARNING ]]; then
    overall_status="warning"
    CONSECUTIVE_WARNINGS=$((CONSECUTIVE_WARNINGS + 1))
  else
    overall_status="healthy"
    CONSECUTIVE_WARNINGS=0  # Reset on healthy check
  fi

  # Write diagnostics for /specweave:jobs
  write_diagnostics "$max_severity" "$overall_status"

  # Only alert if CRITICAL and seen multiple consecutive times
  if [[ $max_severity -eq $SEVERITY_CRITICAL ]] && [[ $CONSECUTIVE_WARNINGS -ge $CONSECUTIVE_THRESHOLD ]]; then
    # Create signal file
    echo "stuck_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SIGNAL_FILE"
    echo "severity=critical" >> "$SIGNAL_FILE"
    echo "consecutive_warnings=$CONSECUTIVE_WARNINGS" >> "$SIGNAL_FILE"

    send_notification $SEVERITY_CRITICAL "🚨 Claude Code STUCK" "Zombie processes detected - Run cleanup-state.sh"

    log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "${RED}CRITICAL: SESSION STUCK DETECTED${NC}"
    log "${RED}Consecutive warnings: $CONSECUTIVE_WARNINGS${NC}"
    log ""
    log "Recovery steps:"
    log "  1. Press Ctrl+C multiple times in Claude Code terminal"
    log "  2. Run: bash plugins/specweave/scripts/cleanup-state.sh"
    log "  3. If VS Code, restart Extension Host (Cmd+Shift+P)"
    log "  4. Restart Claude Code"
    log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    return 1

  elif [[ $max_severity -eq $SEVERITY_WARNING ]]; then
    # Log warning but don't notify (might be false positive)
    log "${YELLOW}⚠️  Warning detected (${CONSECUTIVE_WARNINGS}/${CONSECUTIVE_THRESHOLD} before alert)${NC}"
    return 0

  else
    # Healthy - remove signal file if exists
    rm -f "$SIGNAL_FILE"
    log "${GREEN}✓ Session healthy${NC}"
    return 0
  fi
}

# Main execution
if [[ "$DAEMON_MODE" == "true" ]]; then
  log "${BLUE}Starting session watchdog v2.0 (smart detection, CRITICAL-only alerts)${NC}"
  log "  Interval: ${CHECK_INTERVAL}s | Threshold: ${STUCK_THRESHOLD_SECONDS}s"
  log "  Consecutive warnings needed: ${CONSECUTIVE_THRESHOLD}"
  log "  Diagnostics: ${DIAGNOSTICS_FILE}"
  log "Press Ctrl+C to stop"

  # Create log directory
  mkdir -p "${SPECWEAVE_ROOT}/logs"

  while true; do
    check_session_health || true
    sleep "$CHECK_INTERVAL"
  done
else
  log "Running single health check..."
  check_session_health
  exit $?
fi
