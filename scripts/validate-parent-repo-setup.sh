#!/bin/bash
# Validate parent repo setup consistency across config, git, and .env
#
# Usage: bash scripts/validate-parent-repo-setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating Parent Repo Setup..."
echo ""

# Check if we're in a SpecWeave project
if [ ! -f ".specweave/config.json" ]; then
  echo "${RED}❌ Not a SpecWeave project (missing .specweave/config.json)${NC}"
  exit 1
fi

# Extract values from different sources
CONFIG_PARENT=$(cat .specweave/config.json | grep -o '"parentRepoName"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "")
GIT_REMOTE=$(git remote get-url origin 2>/dev/null | sed 's/.*\///' | sed 's/\.git$//' || echo "")
ENV_PARENT=$(grep "^PARENT_REPO_NAME=" .env 2>/dev/null | cut -d= -f2 | cut -d: -f2 || echo "")

# Display values
echo "📋 Current Setup:"
echo ""
echo "   Config (parentRepoName):  ${CONFIG_PARENT:-<not set>}"
echo "   Git Remote (origin):      ${GIT_REMOTE:-<not set>}"
echo "   .env (PARENT_REPO_NAME):  ${ENV_PARENT:-<not set>}"
echo ""

# Validation flags
ERRORS=0
WARNINGS=0

# Check 1: Config has parent repo name (if multi-project enabled)
MULTI_PROJECT_ENABLED=$(cat .specweave/config.json | grep -o '"enabled"[[:space:]]*:[[:space:]]*true' | head -1 || echo "")

if [ -n "$MULTI_PROJECT_ENABLED" ] && [ -z "$CONFIG_PARENT" ]; then
  echo "${RED}❌ ERROR: Multi-project enabled but parentRepoName not set in config.json${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check 2: Git remote matches config (if both exist)
if [ -n "$CONFIG_PARENT" ] && [ -n "$GIT_REMOTE" ]; then
  if [ "$CONFIG_PARENT" != "$GIT_REMOTE" ]; then
    echo "${RED}❌ MISMATCH DETECTED!${NC}"
    echo ""
    echo "   Config expects: ${CONFIG_PARENT}"
    echo "   Git remote has: ${GIT_REMOTE}"
    echo ""
    echo "   ${YELLOW}Fix with:${NC}"
    echo "   git remote set-url origin https://github.com/OWNER/${CONFIG_PARENT}.git"
    echo ""
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check 3: .env matches config (if both exist)
if [ -n "$CONFIG_PARENT" ] && [ -n "$ENV_PARENT" ]; then
  if [ "$CONFIG_PARENT" != "$ENV_PARENT" ]; then
    echo "${YELLOW}⚠️  WARNING: .env mismatch${NC}"
    echo ""
    echo "   Config: ${CONFIG_PARENT}"
    echo "   .env:   ${ENV_PARENT}"
    echo ""
    echo "   ${YELLOW}Update .env to match config.json:${NC}"
    echo "   PARENT_REPO_NAME=shared:${CONFIG_PARENT}"
    echo ""
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check 4: -shared suffix consistency
if [ -n "$CONFIG_PARENT" ]; then
  # Check if config has -shared suffix
  if echo "$CONFIG_PARENT" | grep -q -- "-shared$"; then
    # Config has -shared, check git and env also have it
    if [ -n "$GIT_REMOTE" ] && ! echo "$GIT_REMOTE" | grep -q -- "-shared$"; then
      echo "${RED}❌ ERROR: Config has -shared suffix, but git remote doesn't${NC}"
      echo ""
      echo "   Config: ${CONFIG_PARENT} (has -shared)"
      echo "   Git:    ${GIT_REMOTE} (missing -shared)"
      echo ""
      ERRORS=$((ERRORS + 1))
    fi

    if [ -n "$ENV_PARENT" ] && ! echo "$ENV_PARENT" | grep -q -- "-shared$"; then
      echo "${YELLOW}⚠️  WARNING: Config has -shared suffix, but .env doesn't${NC}"
      echo ""
      echo "   Config: ${CONFIG_PARENT} (has -shared)"
      echo "   .env:   ${ENV_PARENT} (missing -shared)"
      echo ""
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Your parent repo setup is consistent across:"
  echo "  ✓ .specweave/config.json"
  echo "  ✓ git remote (origin)"
  if [ -n "$ENV_PARENT" ]; then
    echo "  ✓ .env"
  fi
  exit 0
else
  if [ $ERRORS -gt 0 ]; then
    echo "${RED}❌ Validation failed with ${ERRORS} error(s)${NC}"
  fi
  if [ $WARNINGS -gt 0 ]; then
    echo "${YELLOW}⚠️  Found ${WARNINGS} warning(s)${NC}"
  fi
  echo ""
  echo "Please fix the issues above before syncing to GitHub."
  exit 1
fi
