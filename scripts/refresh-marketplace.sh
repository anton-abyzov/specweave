#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ⛔  WARNING: DEVELOPER-ONLY SCRIPT - DO NOT USE IN PRODUCTION!  ⛔      ║
# ╠══════════════════════════════════════════════════════════════════════════╣
# ║                                                                          ║
# ║  This script performs DESTRUCTIVE operations:                            ║
# ║    • REMOVES all installed SpecWeave plugins                             ║
# ║    • REMOVES marketplace registration                                    ║
# ║    • CLEARS plugin caches                                                ║
# ║                                                                          ║
# ║  This is intended ONLY for SpecWeave framework developers who are:       ║
# ║    • Actively developing new plugins                                     ║
# ║    • Testing marketplace changes                                         ║
# ║    • Publishing new plugin versions                                      ║
# ║                                                                          ║
# ║  USERS: DO NOT RUN THIS! Use these instead:                              ║
# ║    • /plugin install specweave (in Claude Code session)                  ║
# ║    • specweave init . (safe, non-destructive reinit)                     ║
# ║                                                                          ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# SpecWeave Marketplace Refresh Script
# Usage: bash scripts/refresh-marketplace.sh [--github|--local]
#
# This script automates the complete marketplace refresh process:
# 1. Removes existing marketplace
# 2. Clears all plugin caches
# 3. Re-adds marketplace (GitHub or local)
# 4. Installs all plugins
#
# Options:
#   --github  : Pull latest from GitHub (default, recommended)
#   --local   : Use local development version (ONLY for active dev)
#   --help    : Show this help message
#
# ⚠️  CRITICAL: Always use GitHub mode unless actively developing!
#     Local mode creates filesystem coupling that can cause stale hooks.

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
MODE="github"  # ✅ DEFAULT TO GITHUB (stable, production-ready)
if [ "$1" = "--local" ]; then
  MODE="local"  # ⚠️  Only for active development
elif [ "$1" = "--github" ]; then
  MODE="github"
elif [ "$1" = "--help" ]; then
  echo "Usage: bash scripts/refresh-marketplace.sh [--github|--local]"
  echo ""
  echo "Options:"
  echo "  --github  Pull latest from GitHub (default, recommended)"
  echo "  --local   Use local development version (ONLY for active dev)"
  echo "  --help    Show this help message"
  echo ""
  echo "⚠️  CRITICAL: Always use GitHub mode unless actively developing!"
  echo "    Local mode creates filesystem coupling that can cause stale hooks."
  exit 0
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SpecWeave Marketplace Refresh (${MODE} mode)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}ℹ️  Claude CLI automatically refreshes cache on 'marketplace add'${NC}"
echo -e "${BLUE}   No need to manually remove/clear - just add and it pulls latest!${NC}"
echo ""

# Step 1: Ensure marketplace is registered and updated
echo -e "${YELLOW}📥 Step 1: Checking marketplace status...${NC}"

# Check if marketplace already exists
if claude plugin marketplace list 2>/dev/null | grep -q "$MARKETPLACE_NAME"; then
  echo -e "${BLUE}✓ Marketplace '$MARKETPLACE_NAME' already registered${NC}"
  echo -e "${BLUE}📥 Updating marketplace from source...${NC}"

  # Use UPDATE command (clean, no errors!)
  if claude plugin marketplace update "$MARKETPLACE_NAME" 2>&1 | tee /tmp/marketplace-update.log; then
    echo -e "${GREEN}✓ Marketplace updated successfully${NC}"
  else
    echo -e "${RED}✗ Failed to update marketplace${NC}"
    echo -e "${YELLOW}Check /tmp/marketplace-update.log for details${NC}"
    exit 1
  fi
else
  echo -e "${BLUE}Marketplace not found - adding it now...${NC}"

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
    echo -e "${BLUE}Adding from GitHub: $GITHUB_REPO${NC}"

    # Add GitHub marketplace
    if claude plugin marketplace add "$GITHUB_REPO" 2>&1 | tee /tmp/marketplace-add.log; then
      echo -e "${GREEN}✓ GitHub marketplace added${NC}"
    else
      echo -e "${RED}✗ Failed to add GitHub marketplace${NC}"
      echo -e "${YELLOW}Check /tmp/marketplace-add.log for details${NC}"
      exit 1
    fi
  fi
fi

echo ""

# Step 2: Get list of plugins from marketplace
echo -e "${YELLOW}📋 Step 2: Reading plugin list...${NC}"

# Get marketplace install location from known_marketplaces.json
KNOWN_MARKETPLACES="$HOME/.claude/plugins/known_marketplaces.json"
if [ ! -f "$KNOWN_MARKETPLACES" ]; then
  echo -e "${RED}✗ Error: known_marketplaces.json not found${NC}"
  exit 1
fi

MARKETPLACE_INSTALL_PATH=$(jq -r ".\"$MARKETPLACE_NAME\".installLocation" "$KNOWN_MARKETPLACES")
if [ "$MARKETPLACE_INSTALL_PATH" = "null" ] || [ -z "$MARKETPLACE_INSTALL_PATH" ]; then
  echo -e "${RED}✗ Error: Marketplace install location not found${NC}"
  exit 1
fi

MARKETPLACE_PATH="$MARKETPLACE_INSTALL_PATH/.claude-plugin/marketplace.json"

if [ ! -f "$MARKETPLACE_PATH" ]; then
  echo -e "${RED}✗ Error: Marketplace JSON not found at $MARKETPLACE_PATH${NC}"
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

# Step 3: Install all plugins
echo -e "${YELLOW}⚙️  Step 3: Installing all plugins...${NC}"
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

# Step 4: Update instruction files (CLAUDE.md, AGENTS.md)
echo -e "${YELLOW}📄 Step 4: Updating instruction files...${NC}"

# Check if we're in a SpecWeave project
if [ -f ".specweave/config.json" ]; then
  if command -v npx &> /dev/null; then
    if npx specweave update-instructions 2>&1 | tee /tmp/update-instructions.log; then
      echo -e "${GREEN}✓ Instruction files updated${NC}"
    else
      echo -e "${YELLOW}⚠ Could not update instruction files (run manually: npx specweave update-instructions)${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ npx not found - run manually: npx specweave update-instructions${NC}"
  fi
else
  echo -e "${BLUE}ℹ Not in a SpecWeave project - skipping instruction file update${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Restart Claude Code for changes to take effect"
echo -e "  2. Run ${YELLOW}/plugin${NC} to verify all plugins loaded"
echo -e "  3. Check ${YELLOW}~/.claude/plugins/installed_plugins.json${NC}"
echo ""

exit 0
