#!/bin/bash

# SpecWeave Pre-Implementation Hook
# Runs before starting implementation of a task
# Checks regression risk for brownfield projects

set +e  # EMERGENCY FIX: Prevents Claude Code crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root by searching upward for .specweave/ directory
# Works regardless of where hook is installed (source or .claude/hooks/)
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT"

# Colors
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}🔍 Pre-Implementation Check${NC}"

# Check if this is a brownfield project (has existing code)
if [ -d "src" ] || [ -d "app" ] || [ -d "lib" ]; then
  echo -e "${YELLOW}⚠️  Brownfield project detected${NC}"
  echo ""
  echo "Recommendations:"
  echo "  1. Create baseline tests before changes"
  echo "  2. Check for existing tests that may break"
  echo "  3. Review impact on existing features"
  echo ""

  # Check if baseline tests exist
  if [ -d ".specweave/tests/baseline" ]; then
    echo -e "${GREEN}✅ Baseline tests exist${NC}"
  else
    echo -e "${YELLOW}⚠️  No baseline tests found${NC}"
    echo "   Consider creating baseline tests first"
    echo "   This captures current state before changes"
  fi
else
  echo -e "${GREEN}✅ Greenfield project - no regression risk${NC}"
fi

# Log to hooks log
LOGS_DIR=".specweave/logs"
mkdir -p "$LOGS_DIR"
echo "[$(date)] Pre-implementation check complete" >> "$LOGS_DIR/hooks.log"

echo ""
echo -e "${GREEN}✅ Pre-implementation check complete${NC}"

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
