#!/bin/bash
# force-kill.sh - AGGRESSIVE process killer for stuck Claude Code sessions
#
# This script KILLS processes, not just warns about them.
# Use when Claude Code is stuck and won't respond.
#
# Usage:
#   bash force-kill.sh           # Kill all stuck processes
#   bash force-kill.sh --dry-run # Show what would be killed
#
# What gets killed:
#   - Heredoc processes (cat.*EOF)
#   - Stuck node processes from hooks
#   - Background SpecWeave processors
#   - Zombie bash processes

set -euo pipefail

DRY_RUN=false
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

for arg in "$@"; do
  case $arg in
    --dry-run|-n)
      DRY_RUN=true
      ;;
    --verbose|-v)
      VERBOSE=true
      ;;
  esac
done

log() {
  echo -e "$1"
}

kill_processes() {
  local pattern="$1"
  local desc="$2"
  local signal="${3:--9}"  # Default to SIGKILL

  local pids
  pids=$(pgrep -f "$pattern" 2>/dev/null || true)

  if [[ -n "$pids" ]]; then
    local count
    count=$(echo "$pids" | wc -l | tr -d ' ')

    if [[ "$DRY_RUN" == "true" ]]; then
      log "${YELLOW}[DRY-RUN]${NC} Would kill $count $desc process(es):"
      echo "$pids" | while read -r pid; do
        ps -p "$pid" -o pid,command 2>/dev/null | tail -1 || true
      done
    else
      log "${RED}Killing${NC} $count $desc process(es)..."
      echo "$pids" | xargs kill $signal 2>/dev/null || true
      sleep 0.5
      # Double-tap with SIGKILL if still alive
      for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
          kill -9 "$pid" 2>/dev/null || true
        fi
      done
    fi
    return 0
  fi
  return 1
}

# === Main execution ===
log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${RED}FORCE KILL - Aggressive Process Termination${NC}"
log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[[ "$DRY_RUN" == "true" ]] && log "${YELLOW}DRY RUN MODE - No processes will be killed${NC}"
echo

KILLED_ANY=false

# 1. Kill heredoc zombies (most common cause of hangs)
if kill_processes "cat.*EOF" "heredoc zombie"; then
  KILLED_ANY=true
fi

# 2. Kill stuck hook node processes
if kill_processes "node.*specweave.*hook" "hook node"; then
  KILLED_ANY=true
fi

# 3. Kill stuck dispatcher processes
if kill_processes "dispatcher.mjs" "dispatcher"; then
  KILLED_ANY=true
fi

# 4. Kill background processors
if kill_processes "processor.sh" "background processor"; then
  KILLED_ANY=true
fi

# 5. Kill stuck sync processes
if kill_processes "node.*sync.*specweave" "sync node"; then
  KILLED_ANY=true
fi

# 6. Kill any bash processes with specweave in command (older than 60s)
# This is more aggressive - use pattern carefully
if kill_processes "bash.*specweave.*hooks" "specweave bash"; then
  KILLED_ANY=true
fi

# 7. Clean up lock files
if [[ "$DRY_RUN" != "true" ]]; then
  log "\n${GREEN}Cleaning lock files...${NC}"
  rm -f .specweave/state/.processor.lock 2>/dev/null || true
  rm -f .specweave/state/.processor.pid 2>/dev/null || true
  rm -f .specweave/state/.hook-* 2>/dev/null || true
  rm -rf .specweave/state/.dedup-cache/*.lock 2>/dev/null || true
  log "  ✓ Lock files cleaned"
fi

echo
if [[ "$KILLED_ANY" == "true" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}Run without --dry-run to kill these processes${NC}"
  else
    log "${GREEN}✓ Stuck processes killed${NC}"
    log ""
    log "Next steps:"
    log "  1. Close any stuck Claude Code terminals"
    log "  2. Start a fresh Claude Code session"
  fi
else
  log "${GREEN}✓ No stuck processes found${NC}"
fi

log ""
log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
