#!/bin/bash
# SpecWeave Plugin Health Check
# Quick verification that plugin setup is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Paths
MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/specweave"

echo ""
echo -e "${CYAN}🔍 SpecWeave Plugin Health Check${NC}"
echo -e "${GRAY}================================================${NC}"
echo ""

ISSUES_FOUND=0

# Check 1: Marketplace registration
echo -e "${BLUE}1. Checking marketplace registration...${NC}"
if command -v claude &> /dev/null; then
    if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
        MARKETPLACE_SOURCE=$(claude plugin marketplace list 2>/dev/null | grep -A 1 "specweave" | tail -1)
        echo -e "${GREEN}   ✅ Marketplace registered${NC}"
        echo -e "${GRAY}      $MARKETPLACE_SOURCE${NC}"
    else
        echo -e "${RED}   ❌ Marketplace NOT registered${NC}"
        echo -e "${YELLOW}      Fix: claude plugin marketplace add $REPO_ROOT${NC}"
        ((ISSUES_FOUND++))
    fi
else
    echo -e "${YELLOW}   ⚠️  Claude CLI not found${NC}"
    echo -e "${GRAY}      Install: https://docs.claude.com/cli${NC}"
fi

# Check 2: Symlink/Directory exists
echo ""
echo -e "${BLUE}2. Checking marketplace directory...${NC}"
if [[ -L "$MARKETPLACE_DIR" ]]; then
    SYMLINK_TARGET=$(readlink "$MARKETPLACE_DIR")
    echo -e "${GREEN}   ✅ Symlink exists${NC}"
    echo -e "${GRAY}      Target: $SYMLINK_TARGET${NC}"

    # Verify target is correct
    if [[ "$SYMLINK_TARGET" == "$REPO_ROOT" ]]; then
        echo -e "${GREEN}   ✅ Points to correct location${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Symlink target mismatch${NC}"
        echo -e "${GRAY}      Expected: $REPO_ROOT${NC}"
        echo -e "${GRAY}      Actual: $SYMLINK_TARGET${NC}"
        ((ISSUES_FOUND++))
    fi
elif [[ -d "$MARKETPLACE_DIR" ]]; then
    echo -e "${GREEN}   ✅ Directory exists (GitHub clone)${NC}"
else
    echo -e "${RED}   ❌ Directory/symlink NOT found${NC}"
    echo -e "${YELLOW}      Fix: ./scripts/setup-dev-plugins.sh${NC}"
    ((ISSUES_FOUND++))
fi

# Check 3: Core hooks accessible
echo ""
echo -e "${BLUE}3. Checking core hooks...${NC}"
if [[ -f "$MARKETPLACE_DIR/plugins/specweave/hooks/post-task-completion.sh" ]]; then
    echo -e "${GREEN}   ✅ Core hooks accessible${NC}"

    # Check if executable
    if [[ -x "$MARKETPLACE_DIR/plugins/specweave/hooks/post-task-completion.sh" ]]; then
        echo -e "${GREEN}   ✅ Hooks are executable${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Hooks not executable${NC}"
        echo -e "${GRAY}      Fix: chmod +x plugins/specweave/hooks/*.sh${NC}"
    fi
else
    echo -e "${RED}   ❌ Core hooks NOT found${NC}"
    echo -e "${YELLOW}      Fix: ./scripts/setup-dev-plugins.sh${NC}"
    ((ISSUES_FOUND++))
fi

# Check 4: Plugin hooks accessible
echo ""
echo -e "${BLUE}4. Checking plugin hooks...${NC}"
PLUGIN_HOOKS_FOUND=0
for plugin in github jira ado; do
    if [[ -f "$MARKETPLACE_DIR/plugins/specweave-$plugin/hooks/post-task-completion.sh" ]]; then
        ((PLUGIN_HOOKS_FOUND++))
    fi
done

if [[ $PLUGIN_HOOKS_FOUND -gt 0 ]]; then
    echo -e "${GREEN}   ✅ Found $PLUGIN_HOOKS_FOUND plugin hooks${NC}"
else
    echo -e "${YELLOW}   ⚠️  No plugin hooks found${NC}"
    echo -e "${GRAY}      This is OK if plugins not installed yet${NC}"
fi

# Check 5: Core plugin installed
echo ""
echo -e "${BLUE}5. Checking core plugin installation...${NC}"
if command -v claude &> /dev/null; then
    # Note: 'claude plugin list' command doesn't exist in current CLI
    # We check by attempting to invoke a command
    if [[ -d "$HOME/.claude/plugins/installed" ]] || [[ -d "$HOME/.claude/plugins" ]]; then
        echo -e "${GRAY}   Plugin check not automated (use /plugin list in Claude Code)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Plugin directory structure not found${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Claude CLI not available for plugin check${NC}"
fi

# Check 6: marketplace.json valid
echo ""
echo -e "${BLUE}6. Checking marketplace.json...${NC}"
if [[ -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; then
    if command -v jq &> /dev/null; then
        if jq empty "$REPO_ROOT/.claude-plugin/marketplace.json" 2>/dev/null; then
            PLUGIN_COUNT=$(jq '.plugins | length' "$REPO_ROOT/.claude-plugin/marketplace.json")
            echo -e "${GREEN}   ✅ marketplace.json valid${NC}"
            echo -e "${GRAY}      Plugins defined: $PLUGIN_COUNT${NC}"
        else
            echo -e "${RED}   ❌ marketplace.json invalid JSON${NC}"
            ((ISSUES_FOUND++))
        fi
    else
        echo -e "${GRAY}   ⚠️  jq not installed (can't validate JSON)${NC}"
        echo -e "${GRAY}      Install: brew install jq${NC}"
    fi
else
    echo -e "${RED}   ❌ marketplace.json NOT found${NC}"
    ((ISSUES_FOUND++))
fi

# Summary
echo ""
echo -e "${GRAY}================================================${NC}"

if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo -e "${CYAN}Your plugin setup is healthy. You're good to go!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND issue(s)${NC}"
    echo ""
    echo -e "${CYAN}Recommended fix:${NC}"
    echo -e "${GRAY}   ./scripts/setup-dev-plugins.sh${NC}"
    echo ""
    echo -e "${CYAN}Manual fix:${NC}"
    echo -e "${GRAY}   claude plugin marketplace add $REPO_ROOT${NC}"
    echo -e "${GRAY}   claude plugin install specweave${NC}"
    exit 1
fi
