#!/bin/bash

# SpecWeave Docs-Changed Hook
# Runs after file changes are detected
# Detects if documentation was changed during implementation
# Triggers review workflow if needed

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get changed files (git)
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  # Not a git repository, skip
  exit 0
fi

CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  # No changes
  exit 0
fi

# Check if any documentation files changed
DOC_CHANGES=$(echo "$CHANGED_FILES" | grep -E '\.specweave/(docs|increments/.*/.*\.md)' || true)

if [ -n "$DOC_CHANGES" ]; then
  echo -e "${RED}⚠️  Documentation changed during implementation${NC}"
  echo ""
  echo "📋 Files changed:"
  echo "$DOC_CHANGES" | sed 's/^/   /'
  echo ""
  echo -e "${YELLOW}🔔 Recommended actions:${NC}"
  echo "  1. Review documentation changes"
  echo "  2. Update tasks.md if architecture changed"
  echo "  3. Type /review-docs to see full impact"
  echo ""

  # Play notification sound
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Ping.aiff 2>/dev/null &
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/dialog-warning.oga 2>/dev/null || true
      ;;
  esac

  # Log to hooks log
  mkdir -p .specweave/logs
  echo "[$(date)] Documentation changed: $DOC_CHANGES" >> .specweave/logs/hooks.log
fi
