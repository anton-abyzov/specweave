#!/usr/bin/env bash
# SpecWeave Session Watchdog
# Monitors Claude Code sessions and alerts when stuck
# Usage: bash session-watchdog.sh [--daemon] [--interval=60]

set -euo pipefail

# Configuration
STUCK_THRESHOLD_SECONDS="${STUCK_THRESHOLD:-300}"  # 5 minutes
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"             # 1 minute
SPECWEAVE_ROOT="${SPECWEAVE_ROOT:-.specweave}"
SIGNAL_FILE="${SPECWEAVE_ROOT}/state/.session-stuck"
HEARTBEAT_FILE="${SPECWEAVE_ROOT}/state/.heartbeat"
DAEMON_MODE=false

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Parse arguments
for arg in "$@"; do
  case $arg in
    --daemon)
      DAEMON_MODE=true
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
  echo -e "[$(date '+%H:%M:%S')] $1"
}

send_notification() {
  local title="$1"
  local message="$2"

  # macOS notification
  if command -v osascript &> /dev/null; then
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"Basso\""
  fi

  # Linux notification (if available)
  if command -v notify-send &> /dev/null; then
    notify-send "$title" "$message" --urgency=critical
  fi
}

get_file_age_seconds() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "999999"
    return
  fi

  local now
  local mtime
  now=$(date +%s)

  if [[ "$(uname)" == "Darwin" ]]; then
    mtime=$(stat -f %m "$file")
  else
    mtime=$(stat -c %Y "$file")
  fi

  echo $((now - mtime))
}

check_lock_file() {
  local lock_file="${SPECWEAVE_ROOT}/state/.processor.lock"
  if [[ -f "$lock_file" ]]; then
    local age
    age=$(get_file_age_seconds "$lock_file")
    if [[ "$age" -gt "$STUCK_THRESHOLD_SECONDS" ]]; then
      log "${RED}⚠️  STUCK DETECTED: Lock file held for ${age}s (threshold: ${STUCK_THRESHOLD_SECONDS}s)${NC}"
      return 1
    fi
  fi
  return 0
}

check_heartbeat() {
  if [[ -f "$HEARTBEAT_FILE" ]]; then
    local age
    age=$(get_file_age_seconds "$HEARTBEAT_FILE")
    if [[ "$age" -gt "$STUCK_THRESHOLD_SECONDS" ]]; then
      log "${RED}⚠️  STUCK DETECTED: No heartbeat for ${age}s${NC}"
      return 1
    fi
  fi
  return 0
}

check_mcp_drops() {
  local debug_log="$HOME/.claude/debug/latest"
  if [[ -f "$debug_log" ]]; then
    local drops
    drops=$(grep -c "WS-IDE connection dropped" "$debug_log" 2>/dev/null | head -1 || echo "0")
    drops="${drops//[^0-9]/}"
    drops="${drops:-0}"
    if [[ "$drops" -gt 3 ]]; then
      log "${YELLOW}⚠️  MCP instability: $drops connection drops detected${NC}"
      return 1
    fi
  fi
  return 0
}

check_zombie_processes() {
  local zombies
  zombies=$(pgrep -f "cat.*EOF" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$zombies" -gt 0 ]]; then
    log "${RED}⚠️  STUCK DETECTED: $zombies zombie heredoc processes${NC}"
    return 1
  fi
  return 0
}

check_session_health() {
  local stuck=false
  local reasons=()

  if ! check_lock_file; then
    stuck=true
    reasons+=("Lock file stale")
  fi

  if ! check_heartbeat; then
    stuck=true
    reasons+=("No heartbeat")
  fi

  if ! check_mcp_drops; then
    reasons+=("MCP unstable")
  fi

  if ! check_zombie_processes; then
    stuck=true
    reasons+=("Zombie processes")
  fi

  if [[ "$stuck" == "true" ]]; then
    local reason_str
    reason_str=$(IFS=", "; echo "${reasons[*]}")

    # Create signal file
    echo "stuck_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SIGNAL_FILE"
    echo "reasons=$reason_str" >> "$SIGNAL_FILE"

    send_notification "🚨 Claude Code Stuck" "$reason_str - Run cleanup-state.sh"

    log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "${RED}SESSION STUCK DETECTED${NC}"
    log "${RED}Reasons: $reason_str${NC}"
    log ""
    log "Recovery steps:"
    log "  1. Press Ctrl+C multiple times in Claude Code terminal"
    log "  2. Run: bash plugins/specweave/scripts/cleanup-state.sh"
    log "  3. If VS Code, restart Extension Host (Cmd+Shift+P)"
    log "  4. Restart Claude Code"
    log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    return 1
  else
    # Remove signal file if exists
    rm -f "$SIGNAL_FILE"
    log "${GREEN}✓ Session healthy${NC}"
    return 0
  fi
}

# Main execution
if [[ "$DAEMON_MODE" == "true" ]]; then
  log "Starting session watchdog daemon (interval: ${CHECK_INTERVAL}s, threshold: ${STUCK_THRESHOLD_SECONDS}s)"
  log "Press Ctrl+C to stop"

  while true; do
    check_session_health || true
    sleep "$CHECK_INTERVAL"
  done
else
  log "Running single health check..."
  check_session_health
  exit $?
fi
