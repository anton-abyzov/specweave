#!/bin/bash

# SpecWeave Marketplace Refresh Script
# Usage: bash scripts/refresh-marketplace.sh [--local|--github]
#
# This script automates the complete marketplace refresh process:
# 1. Removes existing marketplace
# 2. Clears all plugin caches
# 3. Re-adds marketplace (local or GitHub)
# 4. Installs all plugins
#
# Options:
#   --local   : Use local development version (default)
#   --github  : Pull latest from GitHub
#   --help    : Show this help message

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MARKETPLACE_NAME="specweave"
GITHUB_REPO="anton-abyzov/specweave"
LOCAL_PATH="/Users/antonabyzov/Projects/github/specweave"

# Parse arguments
MODE="local"
if [ "$1" = "--github" ]; then
  MODE="github"
elif [ "$1" = "--help" ]; then
  echo "Usage: bash scripts/refresh-marketplace.sh [--local|--github]"
  echo ""
  echo "Options:"
  echo "  --local   Use local development version (default)"
  echo "  --github  Pull latest from GitHub"
  echo "  --help    Show this help message"
  exit 0
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SpecWeave Marketplace Refresh (${MODE} mode)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Remove existing marketplace
echo -e "${YELLOW}📦 Step 1: Removing existing marketplace...${NC}"
if claude plugin marketplace remove "$MARKETPLACE_NAME" 2>/dev/null; then
  echo -e "${GREEN}✓ Marketplace removed${NC}"
else
  echo -e "${YELLOW}⚠ Marketplace not found (might already be removed)${NC}"
fi
echo ""

# Step 2: Clear plugin caches
echo -e "${YELLOW}🧹 Step 2: Clearing plugin caches...${NC}"

# Clear marketplace cache
if [ -d "$HOME/.claude/plugins/marketplaces/$MARKETPLACE_NAME" ]; then
  rm -rf "$HOME/.claude/plugins/marketplaces/$MARKETPLACE_NAME"
  echo -e "${GREEN}✓ Marketplace cache cleared${NC}"
fi

# Backup and clear installed plugins
if [ -f "$HOME/.claude/plugins/installed_plugins.json" ]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  mv "$HOME/.claude/plugins/installed_plugins.json" \
     "$HOME/.claude/plugins/installed_plugins.json.backup-$TIMESTAMP"
  echo -e "${GREEN}✓ Installed plugins cache backed up${NC}"
fi

echo ""

# Step 3: Add marketplace
echo -e "${YELLOW}📥 Step 3: Adding marketplace...${NC}"

if [ "$MODE" = "local" ]; then
  echo -e "${BLUE}Using local development version: $LOCAL_PATH${NC}"

  # Ensure we're in the right directory
  if [ ! -f "$LOCAL_PATH/.claude-plugin/marketplace.json" ]; then
    echo -e "${RED}✗ Error: marketplace.json not found at $LOCAL_PATH${NC}"
    exit 1
  fi

  # Add local marketplace
  if claude plugin marketplace add "$LOCAL_PATH" 2>&1 | tee /tmp/marketplace-add.log; then
    echo -e "${GREEN}✓ Local marketplace added${NC}"
  else
    echo -e "${RED}✗ Failed to add local marketplace${NC}"
    echo -e "${YELLOW}Check /tmp/marketplace-add.log for details${NC}"
    exit 1
  fi
else
  echo -e "${BLUE}Pulling latest from GitHub: $GITHUB_REPO${NC}"

  # Add GitHub marketplace
  if claude plugin marketplace add "$GITHUB_REPO" 2>&1 | tee /tmp/marketplace-add.log; then
    echo -e "${GREEN}✓ GitHub marketplace added${NC}"
  else
    echo -e "${RED}✗ Failed to add GitHub marketplace${NC}"
    echo -e "${YELLOW}Check /tmp/marketplace-add.log for details${NC}"
    exit 1
  fi
fi

echo ""

# Step 4: Get list of plugins from marketplace
echo -e "${YELLOW}📋 Step 4: Reading plugin list...${NC}"

MARKETPLACE_PATH="$HOME/.claude/plugins/marketplaces/$MARKETPLACE_NAME/.claude-plugin/marketplace.json"

if [ ! -f "$MARKETPLACE_PATH" ]; then
  echo -e "${RED}✗ Error: Marketplace JSON not found${NC}"
  exit 1
fi

# Extract plugin names using jq
if ! command -v jq &> /dev/null; then
  echo -e "${RED}✗ Error: jq is required but not installed${NC}"
  echo -e "${YELLOW}Install with: brew install jq${NC}"
  exit 1
fi

PLUGINS=$(jq -r '.plugins[].name' "$MARKETPLACE_PATH")
PLUGIN_COUNT=$(echo "$PLUGINS" | wc -l | tr -d ' ')

echo -e "${GREEN}✓ Found $PLUGIN_COUNT plugins${NC}"
echo ""

# Step 5: Install all plugins
echo -e "${YELLOW}⚙️  Step 5: Installing all plugins...${NC}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_PLUGINS=()

while IFS= read -r plugin; do
  echo -e "${BLUE}  Installing $plugin...${NC}"

  if claude plugin install "$plugin" 2>&1 | grep -q "Successfully installed"; then
    echo -e "${GREEN}  ✓ $plugin installed${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}  ✗ $plugin failed${NC}"
    ((FAIL_COUNT++))
    FAILED_PLUGINS+=("$plugin")
  fi
  echo ""
done <<< "$PLUGINS"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Installation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total plugins: ${PLUGIN_COUNT}"
echo -e "  ${GREEN}Successful: ${SUCCESS_COUNT}${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "  ${RED}Failed: ${FAIL_COUNT}${NC}"
  echo ""
  echo -e "${YELLOW}Failed plugins:${NC}"
  for plugin in "${FAILED_PLUGINS[@]}"; do
    echo -e "  ${RED}- $plugin${NC}"
  done
  echo ""
  echo -e "${YELLOW}⚠ Some plugins failed to install${NC}"
  echo -e "${YELLOW}Check Claude Code logs for details${NC}"
else
  echo -e "  ${RED}Failed: 0${NC}"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ ALL PLUGINS INSTALLED SUCCESSFULLY!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Restart Claude Code for changes to take effect"
echo -e "  2. Run ${YELLOW}/plugin${NC} to verify all plugins loaded"
echo -e "  3. Check ${YELLOW}~/.claude/plugins/installed_plugins.json${NC}"
echo ""

exit 0
