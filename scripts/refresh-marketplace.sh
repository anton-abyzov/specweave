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
LAZY_MODE=true # ✅ DEFAULT TO LAZY (router only, ~500 tokens)

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      MODE="local"  # ⚠️  Only for active development
      shift
      ;;
    --github)
      MODE="github"
      shift
      ;;
    --all)
      LAZY_MODE=false  # Install all plugins (~60K tokens)
      shift
      ;;
    --lazy)
      LAZY_MODE=true  # Explicit lazy mode (default anyway)
      shift
      ;;
    --help)
      echo "Usage: bash scripts/refresh-marketplace.sh [options]"
      echo ""
      echo "Options:"
      echo "  --github  Pull latest from GitHub (default, recommended)"
      echo "  --local   Use local development version (ONLY for active dev)"
      echo "  --lazy    Install core + router only (~3K tokens) - DEFAULT"
      echo "  --all     Install ALL plugins (~60K tokens) - legacy mode"
      echo "  --help    Show this help message"
      echo ""
      echo "⚠️  CRITICAL: Always use GitHub mode unless actively developing!"
      echo "    Local mode creates filesystem coupling that can cause stale hooks."
      echo ""
      echo "💡 Token savings with lazy mode:"
      echo "   --lazy (default): ~3,000 tokens (core + router)"
      echo "   --all:            ~60,000 tokens (all 24 plugins)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

INSTALL_MODE="lazy"
if [ "$LAZY_MODE" = false ]; then
  INSTALL_MODE="all"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SpecWeave Marketplace Refresh${NC}"
echo -e "${BLUE}  Source: ${MODE} | Mode: ${INSTALL_MODE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$LAZY_MODE" = true ]; then
  echo -e "${GREEN}🚀 Lazy mode (default):${NC}"
  echo -e "${BLUE}   • Install core + router plugins (~3K tokens)${NC}"
  echo -e "${BLUE}   • Core: /sw:increment, /sw:do, /sw:done commands${NC}"
  echo -e "${BLUE}   • Router: Agent spawning for dev tasks${NC}"
  echo -e "${BLUE}   • Use --all flag to install all 24 plugins${NC}"
else
  echo -e "${YELLOW}⚠️  All plugins mode (legacy):${NC}"
  echo -e "${YELLOW}   • Installing all 24 plugins (~60K tokens)${NC}"
  echo -e "${YELLOW}   • Consider using lazy mode (default) for better performance${NC}"
fi
echo ""
echo -e "${BLUE}ℹ️  Claude CLI automatically refreshes cache on 'marketplace add'${NC}"
echo -e "${BLUE}   No need to manually remove/clear - just add and it pulls latest!${NC}"
echo ""

# Step 0: Uninstall existing SpecWeave plugins (for clean lazy mode)
if [ "$LAZY_MODE" = true ]; then
  echo -e "${YELLOW}🧹 Step 0: Cleaning up existing SpecWeave plugins...${NC}"

  # Get list of installed SpecWeave plugins
  INSTALLED_SW_PLUGINS=$(claude plugin list 2>/dev/null | grep "@specweave" | awk '{print $2}' | cut -d'@' -f1)

  if [ -n "$INSTALLED_SW_PLUGINS" ]; then
    INSTALLED_COUNT=$(echo "$INSTALLED_SW_PLUGINS" | wc -l | tr -d ' ')
    echo -e "${BLUE}  Found $INSTALLED_COUNT SpecWeave plugins to uninstall${NC}"

    while IFS= read -r plugin; do
      if [ -n "$plugin" ]; then
        echo -e "${BLUE}  Uninstalling $plugin...${NC}"
        claude plugin uninstall "$plugin" 2>/dev/null || true
      fi
    done <<< "$INSTALLED_SW_PLUGINS"

    echo -e "${GREEN}✓ Existing plugins uninstalled${NC}"
  else
    echo -e "${BLUE}  No existing SpecWeave plugins to remove${NC}"
  fi
  echo ""
fi

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

# Step 3: Install plugins (LAZY or ALL mode)
if [ "$LAZY_MODE" = true ]; then
  # LAZY MODE: Install core plugin only (sw-router is OBSOLETE as of v1.0.160)
  echo -e "${YELLOW}⚙️  Step 3: Installing core plugin (lazy mode)...${NC}"
  echo ""

  CORE_PLUGIN="sw"          # Core SpecWeave commands (/sw:increment, /sw:do, /sw:done)
  # NOTE: sw-router is OBSOLETE - detect-intent now handles plugin detection via LLM
  SUCCESS_COUNT=0
  FAIL_COUNT=0
  FAILED_PLUGINS=()

  # Install CORE plugin (provides /sw:increment, /sw:do, /sw:done etc.)
  echo -e "${BLUE}  Installing $CORE_PLUGIN (core commands)...${NC}"
  if claude plugin install "$CORE_PLUGIN" 2>&1 | grep -q "Successfully installed\|already installed"; then
    echo -e "${GREEN}  ✓ $CORE_PLUGIN installed${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}  ✗ $CORE_PLUGIN failed${NC}"
    ((FAIL_COUNT++))
    FAILED_PLUGINS+=("$CORE_PLUGIN")
  fi
  echo ""

  # Lazy mode summary
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Lazy Loading Summary${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  Total plugins available: ${PLUGIN_COUNT}"
  echo -e "  ${GREEN}Installed now: ${SUCCESS_COUNT} (core only)${NC}"
  echo -e "  ${BLUE}Available for on-demand: $((PLUGIN_COUNT - SUCCESS_COUNT))${NC}"
  echo ""
  echo -e "${GREEN}  💡 Token savings:${NC}"
  echo -e "${BLUE}     Before: ~60,000 tokens (all 24 plugins)${NC}"
  echo -e "${BLUE}     After:  ~3,000 tokens (core only)${NC}"
  echo -e "${GREEN}     Saved:  ~57,000 tokens (95% reduction!)${NC}"
  echo ""
  echo -e "${BLUE}  📚 What's installed:${NC}"
  echo -e "${BLUE}     • sw (core): /sw:increment, /sw:do, /sw:done${NC}"
  echo ""
  echo -e "${BLUE}  📚 How lazy loading works:${NC}"
  echo -e "${BLUE}     • detect-intent analyzes prompts via LLM${NC}"
  echo -e "${BLUE}     • Installs needed plugins automatically${NC}"
  echo -e "${BLUE}     • \"React dashboard\" → sw-frontend installed${NC}"
  echo -e "${BLUE}     • \"GitHub sync\" → sw-github installed${NC}"

else
  # ALL MODE: Install all plugins (legacy behavior)
  echo -e "${YELLOW}⚙️  Step 3: Installing all plugins...${NC}"
  echo ""

  SUCCESS_COUNT=0
  FAIL_COUNT=0
  FAILED_PLUGINS=()

  while IFS= read -r plugin; do
    echo -e "${BLUE}  Installing $plugin...${NC}"

    if claude plugin install "$plugin" 2>&1 | grep -q "Successfully installed\|already installed"; then
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

# Step 5: Generate skill triggers index
echo -e "${YELLOW}🔍 Step 5: Generating skill triggers index...${NC}"

# Check if we're in the SpecWeave development directory or a project with plugins
if [ -d "plugins" ] && [ -d "src/core/plugins" ]; then
  # SpecWeave development mode - use TypeScript directly
  if command -v npx &> /dev/null; then
    # Try to run the index generator
    if npx tsx -e "
import { SkillTriggerIndexManager } from './src/core/plugins/skill-trigger-index.js';

async function main() {
  const manager = new SkillTriggerIndexManager('$PWD');
  const { index, path } = await manager.generateAndSave();
  console.log('Skills indexed: ' + index.skillCount);
  console.log('Keywords indexed: ' + index.keywordCount);
  console.log('Saved to: ' + path);
}

main().catch(console.error);
" 2>&1 | tee /tmp/skill-index.log; then
      echo -e "${GREEN}✓ Skill triggers index generated${NC}"
    else
      echo -e "${YELLOW}⚠ Could not generate skill triggers index${NC}"
      echo -e "${YELLOW}  This is optional - skills will still work via description matching${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ npx not found - skill triggers index not generated${NC}"
  fi
elif [ -f ".specweave/config.json" ]; then
  # User project - use installed specweave CLI
  if command -v npx &> /dev/null; then
    if npx specweave generate-skill-index 2>&1 | tee /tmp/skill-index.log; then
      echo -e "${GREEN}✓ Skill triggers index generated${NC}"
    else
      echo -e "${YELLOW}⚠ Could not generate skill triggers index (optional)${NC}"
    fi
  fi
else
  echo -e "${BLUE}ℹ Not in a SpecWeave project - skipping skill index generation${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Restart Claude Code for changes to take effect"
if [ "$LAZY_MODE" = true ]; then
  echo -e "  2. Run ${YELLOW}/plugin${NC} to verify sw core plugin loaded"
  echo -e "  3. Test: ${YELLOW}/sw:increment \"test feature\"${NC} (from core)"
  echo -e "  4. Test: \"Build React dashboard\" → detect-intent installs sw-frontend"
  echo -e "  5. Manual install: ${YELLOW}claude plugin install sw@specweave${NC}"
  echo -e "${BLUE}     Available: sw, sw-frontend, sw-github, sw-jira, sw-ml, sw-infra${NC}"
else
  echo -e "  2. Run ${YELLOW}/plugin${NC} to verify all plugins loaded"
  echo -e "  3. Check ${YELLOW}~/.claude/plugins/installed_plugins.json${NC}"
fi
echo ""

exit 0
