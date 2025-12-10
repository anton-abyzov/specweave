#!/usr/bin/env bash
# cleanup-existing-zombies.sh
# One-time cleanup of existing zombie SpecWeave processes
# Usage: bash cleanup-existing-zombies.sh [--dry-run]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}🔍 DRY RUN MODE - No processes will be killed${NC}"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/zombie-cleanup-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

log "${BLUE}🚨 SpecWeave Zombie Process Cleanup${NC}"
log "${BLUE}========================================${NC}"
log "Started: $(date)"
log "Project: $PROJECT_ROOT"
log ""

# Minimum age in seconds (1 hour = 3600 seconds)
MIN_AGE_SECONDS=3600

# Zombie patterns to detect
PATTERNS=(
  "cat.*EOF"
  "esbuild.*--service"
  "bash.*session-watchdog"
  "bash.*processor\.sh"
  "node.*claude"
)

TOTAL_KILLED=0
ZOMBIES_FOUND=()

# Function to get process age in seconds (macOS/Linux compatible)
get_process_age() {
  local pid=$1

  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    local start_time
    start_time=$(ps -p "$pid" -o lstart= 2>/dev/null || echo "")
    if [[ -z "$start_time" ]]; then
      echo "0"
      return
    fi
    local start_epoch
    start_epoch=$(date -j -f "%c" "$start_time" "+%s" 2>/dev/null || echo "0")
    local now_epoch
    now_epoch=$(date "+%s")
    echo $((now_epoch - start_epoch))
  else
    # Linux
    local start_time
    start_time=$(ps -p "$pid" -o etimes= 2>/dev/null | tr -d ' ' || echo "0")
    echo "$start_time"
  fi
}

# Function to kill process safely with validation
kill_process_safe() {
  local pid=$1
  local pattern=$2
  local age=$3

  # Validate PID exists
  if ! kill -0 "$pid" 2>/dev/null; then
    log "${YELLOW}⚠️  PID $pid already dead${NC}"
    return 1
  fi

  # Get process command for validation
  local cmd
  cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "")

  if [[ -z "$cmd" ]]; then
    log "${YELLOW}⚠️  Cannot get command for PID $pid, skipping${NC}"
    return 1
  fi

  log "${RED}🔫 Killing: PID $pid (age: ${age}s)${NC}"
  log "   Command: $cmd"
  log "   Pattern: $pattern"

  if [[ "$DRY_RUN" == "false" ]]; then
    # Try graceful kill first (SIGTERM)
    if kill -TERM "$pid" 2>/dev/null; then
      log "${GREEN}   ✅ Sent SIGTERM${NC}"

      # Wait 2 seconds for graceful shutdown
      sleep 2

      # Check if still alive
      if kill -0 "$pid" 2>/dev/null; then
        log "${YELLOW}   ⚠️  Still alive, sending SIGKILL${NC}"
        kill -9 "$pid" 2>/dev/null || true
      else
        log "${GREEN}   ✅ Process terminated gracefully${NC}"
      fi
    else
      log "${RED}   ❌ Failed to send SIGTERM${NC}"
      return 1
    fi
  else
    log "${BLUE}   🔍 [DRY RUN] Would kill this process${NC}"
  fi

  return 0
}

# Scan for each pattern
for pattern in "${PATTERNS[@]}"; do
  log ""
  log "${BLUE}🔍 Scanning for pattern: $pattern${NC}"

  # Get PIDs matching pattern (excluding this script and grep itself)
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS: use -e flag
    pids=$(ps -A -o pid,command | grep -E "$pattern" | grep -v grep | grep -v "cleanup-existing-zombies" | awk '{print $1}' || true)
  else
    # Linux
    pids=$(ps aux | grep -E "$pattern" | grep -v grep | grep -v "cleanup-existing-zombies" | awk '{print $2}' || true)
  fi

  if [[ -z "$pids" ]]; then
    log "${GREEN}   ✅ No zombie processes found${NC}"
    continue
  fi

  # Process each PID
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue

    # Get process age
    age=$(get_process_age "$pid")

    if [[ "$age" -lt "$MIN_AGE_SECONDS" ]]; then
      log "${YELLOW}   ⏭️  PID $pid too young (${age}s < ${MIN_AGE_SECONDS}s), skipping${NC}"
      continue
    fi

    # Kill the process
    if kill_process_safe "$pid" "$pattern" "$age"; then
      TOTAL_KILLED=$((TOTAL_KILLED + 1))
      ZOMBIES_FOUND+=("PID $pid - $pattern - ${age}s old")
    fi
  done <<< "$pids"
done

# Summary
log ""
log "${BLUE}========================================${NC}"
log "${BLUE}🏁 Cleanup Summary${NC}"
log "${BLUE}========================================${NC}"
log "Total zombie processes killed: $TOTAL_KILLED"

if [[ ${#ZOMBIES_FOUND[@]} -gt 0 ]]; then
  log ""
  log "${RED}🧟 Zombies killed:${NC}"
  for zombie in "${ZOMBIES_FOUND[@]}"; do
    log "   - $zombie"
  done
fi

log ""
log "Completed: $(date)"
log "Log saved: $LOG_FILE"

# macOS notification (if not dry run and killed >0)
# Use explicit, user-friendly messages - not vague red alerts!
if [[ "$DRY_RUN" == "false" && "$TOTAL_KILLED" -gt 0 ]]; then
  NOTIF_TITLE="SpecWeave: Cleanup Done"
  NOTIF_MSG="Cleaned up $TOTAL_KILLED zombie processes. No action needed."
  if command -v osascript &>/dev/null; then
    # Use "Pop" sound (neutral) instead of alarming sounds
    osascript -e "display notification \"$NOTIF_MSG\" with title \"$NOTIF_TITLE\" sound name \"Pop\"" 2>/dev/null || true
  elif command -v notify-send &>/dev/null; then
    notify-send "$NOTIF_TITLE" "$NOTIF_MSG" --urgency=low 2>/dev/null || true
  fi
fi

# Exit with count
if [[ "$DRY_RUN" == "true" ]]; then
  log ""
  log "${YELLOW}🔍 DRY RUN COMPLETE - Run without --dry-run to actually kill processes${NC}"
fi

exit 0
