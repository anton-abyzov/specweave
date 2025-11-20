#!/bin/bash

# SpecWeave Marketplace Plugin Validation Script
# Ensures all plugins listed in marketplace.json are COMPLETE (not skeleton-only)
# Created: 2025-11-20
# Purpose: Prevent "Plugin not found in marketplace" errors from incomplete plugins

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKETPLACE_JSON="$PROJECT_ROOT/.claude-plugin/marketplace.json"
PLUGINS_DIR="$PROJECT_ROOT/plugins"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SpecWeave Marketplace Plugin Validation${NC}"
echo "==========================================="
echo ""

if [ ! -f "$MARKETPLACE_JSON" ]; then
    echo -e "${RED}✗ marketplace.json not found at: $MARKETPLACE_JSON${NC}"
    exit 1
fi

if [ ! -d "$PLUGINS_DIR" ]; then
    echo -e "${RED}✗ plugins/ directory not found at: $PLUGINS_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📄 Reading marketplace.json...${NC}"

# Extract plugin names from marketplace.json
LISTED_PLUGINS=$(grep -o '"name": "specweave[^"]*"' "$MARKETPLACE_JSON" | sed 's/"name": "//;s/"//g' | grep -v '^specweave$' | sort -u)
TOTAL_LISTED=$(echo "$LISTED_PLUGINS" | wc -l | tr -d ' ')

echo -e "${GREEN}✓ Found $TOTAL_LISTED plugins listed in marketplace.json${NC}"
echo ""

INCOMPLETE_PLUGINS=()
COMPLETE_PLUGINS=()

echo -e "${BLUE}🔎 Validating plugin completeness...${NC}"
echo ""

for plugin in $LISTED_PLUGINS; do
    PLUGIN_DIR="$PLUGINS_DIR/$plugin"

    if [ ! -d "$PLUGIN_DIR" ]; then
        echo -e "${YELLOW}⚠  $plugin: Directory not found${NC}"
        INCOMPLETE_PLUGINS+=("$plugin")
        continue
    fi

    # Check if plugin has agents/, commands/, or lib/ (signs of completeness)
    HAS_AGENTS=false
    HAS_COMMANDS=false
    HAS_LIB=false

    [ -d "$PLUGIN_DIR/agents" ] && HAS_AGENTS=true
    [ -d "$PLUGIN_DIR/commands" ] && HAS_COMMANDS=true
    [ -d "$PLUGIN_DIR/lib" ] && HAS_LIB=true

    if [ "$HAS_AGENTS" = true ] || [ "$HAS_COMMANDS" = true ] || [ "$HAS_LIB" = true ]; then
        echo -e "${GREEN}✓ $plugin: COMPLETE${NC} ($([ "$HAS_AGENTS" = true ] && echo -n "agents ")$([ "$HAS_COMMANDS" = true ] && echo -n "commands ")$([ "$HAS_LIB" = true ] && echo -n "lib"))"
        COMPLETE_PLUGINS+=("$plugin")
    else
        echo -e "${RED}✗ $plugin: INCOMPLETE (only has skills/)${NC}"
        INCOMPLETE_PLUGINS+=("$plugin")
    fi
done

echo ""
echo "==========================================="
echo -e "${BLUE}📊 Validation Results:${NC}"
echo ""
echo "  Complete plugins:   ${#COMPLETE_PLUGINS[@]}"
echo "  Incomplete plugins: ${#INCOMPLETE_PLUGINS[@]}"
echo ""

if [ ${#INCOMPLETE_PLUGINS[@]} -gt 0 ]; then
    echo -e "${RED}⚠️  VALIDATION FAILED!${NC}"
    echo ""
    echo -e "${YELLOW}Incomplete plugins found in marketplace.json:${NC}"
    for plugin in "${INCOMPLETE_PLUGINS[@]}"; do
        echo "  - $plugin"
    done
    echo ""
    echo -e "${YELLOW}These plugins MUST be removed from marketplace.json to prevent loading errors!${NC}"
    echo ""
    echo "To fix:"
    echo "  1. Remove these plugins from .claude-plugin/marketplace.json"
    echo "  2. Update bin/fix-marketplace-errors.sh to exclude them"
    echo "  3. Re-run this validation script"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ VALIDATION PASSED!${NC}"
    echo ""
    echo "All plugins in marketplace.json are complete and ready for distribution."
    echo ""
    exit 0
fi
