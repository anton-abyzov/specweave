#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SpecWeave Plugin Quick Fix                                               ║
# ║  One-command fix for broken/missing plugins                               ║
# ║  Usage: curl -sL https://raw.githubusercontent.com/anton-abyzov/specweave/develop/scripts/fix-plugins.sh | bash
# ╚══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  SpecWeave Plugin Quick Fix${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PLUGINS_DIR="$HOME/.claude/plugins"

# Check if Claude CLI exists
if ! command -v claude &> /dev/null; then
    echo -e "${RED}✗ Claude CLI not found${NC}"
    echo -e "${YELLOW}  Install with: npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Removing stale marketplace...${NC}"
claude plugin marketplace remove specweave 2>/dev/null || echo -e "${BLUE}  (already removed)${NC}"

echo -e "${YELLOW}Step 2: Clearing plugin cache...${NC}"
rm -rf "$PLUGINS_DIR/cache/specweave" 2>/dev/null || true
echo -e "${GREEN}  ✓ Cache cleared${NC}"

echo -e "${YELLOW}Step 3: Reinstalling from GitHub...${NC}"
if claude plugin marketplace add https://github.com/anton-abyzov/specweave 2>&1; then
    echo -e "${GREEN}  ✓ Marketplace installed${NC}"
else
    echo -e "${RED}  ✗ Failed to install marketplace${NC}"
    echo -e "${YELLOW}  Check your internet connection and try again${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Installing core plugins...${NC}"

CORE_PLUGINS=(
    "sw"
    "sw-github"
    "sw-jira"
    "sw-ado"
    "sw-infra"
    "sw-testing"
    "sw-frontend"
    "sw-backend"
    "sw-release"
)

SUCCESS=0
FAILED=0

for plugin in "${CORE_PLUGINS[@]}"; do
    if claude plugin install "$plugin" 2>&1 | grep -q "Successfully installed"; then
        echo -e "${GREEN}  ✓ $plugin${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}  ✗ $plugin${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo -e "${YELLOW}Step 5: Installing additional plugins...${NC}"

EXTRA_PLUGINS=(
    "sw-ml"
    "sw-kafka"
    "sw-kafka-streams"
    "sw-confluent"
    "sw-k8s"
    "sw-mobile"
    "sw-payments"
    "sw-diagrams"
    "sw-ui"
    "sw-docs"
    "sw-figma"
    "sw-n8n"
    "sw-cost"
)

for plugin in "${EXTRA_PLUGINS[@]}"; do
    if claude plugin install "$plugin" 2>&1 | grep -q "Successfully installed"; then
        echo -e "${GREEN}  ✓ $plugin${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}  ✗ $plugin${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Results${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Installed: ${GREEN}$SUCCESS${NC}"
echo -e "  Failed:    ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓ ALL PLUGINS INSTALLED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${YELLOW}⚠ Some plugins failed to install${NC}"
fi

echo ""
echo -e "${YELLOW}⚡ IMPORTANT: Restart Claude Code for changes to take effect!${NC}"
echo ""
echo -e "${BLUE}VSCode: Cmd+Shift+P → 'Claude: Restart Session'${NC}"
echo -e "${BLUE}Terminal: Close and reopen claude${NC}"
echo ""
