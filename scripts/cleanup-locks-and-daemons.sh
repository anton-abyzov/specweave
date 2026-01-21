#!/usr/bin/env bash
# Cleanup script for v1.0.103 lock simplification
#
# Removes:
# - Running watchdog/processor daemons
# - Stale lock files and directories
# - Optional: ~/.specweave pollution (user confirmation required)
#
# Safe to run multiple times (idempotent)

set -e

echo ""
echo "🧹 SpecWeave Lock & Daemon Cleanup Script"
echo "=========================================="
echo ""
echo "This script will clean up legacy lock infrastructure from v1.0.102 and earlier."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Kill running daemons
echo -e "${BLUE}Step 1: Checking for running daemons...${NC}"
echo ""

WATCHDOG_PIDS=$(pgrep -f "session-watchdog.*--daemon" 2>/dev/null || echo "")
PROCESSOR_PIDS=$(pgrep -f "processor.*--daemon" 2>/dev/null || echo "")

if [[ -n "$WATCHDOG_PIDS" ]]; then
  echo -e "${YELLOW}Found session-watchdog daemons: $WATCHDOG_PIDS${NC}"
  pkill -f "session-watchdog.*--daemon" && echo -e "${GREEN}✓ Killed watchdog daemons${NC}" || echo -e "${RED}✗ Failed to kill watchdogs${NC}"
else
  echo -e "${GREEN}✓ No session-watchdog daemons running${NC}"
fi

if [[ -n "$PROCESSOR_PIDS" ]]; then
  echo -e "${YELLOW}Found processor daemons: $PROCESSOR_PIDS${NC}"
  pkill -f "processor.*--daemon" && echo -e "${GREEN}✓ Killed processor daemons${NC}" || echo -e "${RED}✗ Failed to kill processors${NC}"
else
  echo -e "${GREEN}✓ No processor daemons running${NC}"
fi

echo ""

# 2. Remove lock files in current project
echo -e "${BLUE}Step 2: Removing lock files in current project...${NC}"
echo ""

if [[ -d ".specweave/state" ]]; then
  # Remove all lock files and directories
  find .specweave/state -name "*.lock" -type f -delete 2>/dev/null || true
  find .specweave/state -name "*.lock.d" -type d -exec rm -rf {} + 2>/dev/null || true
  find .specweave/state -name "*.lock" -type d -exec rm -rf {} + 2>/dev/null || true

  # Remove specific lock directories
  rm -rf .specweave/state/.processor.lock.d 2>/dev/null || true
  rm -rf .specweave/state/.processor.lock 2>/dev/null || true
  rm -rf .specweave/state/.session-registry.json.lock 2>/dev/null || true
  rm -rf .specweave/state/.locks 2>/dev/null || true

  # Remove watchdog/processor PID files
  rm -f .specweave/state/.watchdog.pid 2>/dev/null || true
  rm -f .specweave/state/.processor.pid 2>/dev/null || true

  echo -e "${GREEN}✓ Removed lock files from .specweave/state/${NC}"
else
  echo -e "${YELLOW}⚠ No .specweave/state directory found (not a SpecWeave project?)${NC}"
fi

echo ""

# 3. Check for home directory pollution
echo -e "${BLUE}Step 3: Checking for home directory pollution...${NC}"
echo ""

if [[ -d "$HOME/.specweave" ]]; then
  echo -e "${YELLOW}⚠ Found ~/.specweave directory${NC}"
  echo ""
  echo "This directory may have been created by running SpecWeave CLI commands"
  echo "outside of a SpecWeave project (a bug fixed in v1.0.103)."
  echo ""
  echo "Contents:"
  ls -lah "$HOME/.specweave" 2>/dev/null | head -10
  echo ""

  read -p "$(echo -e ${YELLOW}Delete ~/.specweave? [y/N]:${NC} )" -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$HOME/.specweave"
    echo -e "${GREEN}✓ Deleted ~/.specweave${NC}"
  else
    echo -e "${BLUE}→ Keeping ~/.specweave (you can delete manually later)${NC}"
  fi
else
  echo -e "${GREEN}✓ No ~/.specweave pollution found${NC}"
fi

echo ""

# 4. Summary
echo ""
echo -e "${GREEN}=========================================="
echo "✅ Cleanup Complete!"
echo -e "==========================================${NC}"
echo ""
echo "What was cleaned:"
echo "  • Stopped all watchdog/processor daemons"
echo "  • Removed lock files from .specweave/state/"
echo "  • Checked for home directory pollution"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code (to ensure clean session)"
echo "  2. Verify no daemons running: ps aux | grep -E 'watchdog|processor' | grep -v grep"
echo "  3. Start using SpecWeave normally (no config changes needed!)"
echo ""
echo "Note: Daemons are now OPT-IN only. To re-enable:"
echo "  export SPECWEAVE_ENABLE_WATCHDOG=1    # Re-enable watchdog"
echo "  export SPECWEAVE_ENABLE_PROCESSOR=1   # Re-enable processor"
echo ""
