#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SpecWeave Plugin Diagnostics                                             ║
# ║  Run this script to diagnose plugin loading issues                        ║
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
echo -e "${CYAN}  SpecWeave Plugin Diagnostics${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
MARKETPLACES_DIR="$PLUGINS_DIR/marketplaces"
SPECWEAVE_DIR="$MARKETPLACES_DIR/specweave"

# ═══════════════════════════════════════════════════════════════════════════
# Check 1: iCloud Drive Sync Detection
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/8] Checking for iCloud Drive sync issues...${NC}"

ICLOUD_ISSUE=false

# Check if home folder is in iCloud
if [ -d "$HOME/Library/Mobile Documents" ]; then
    # Check if .claude is in iCloud Drive
    if xattr "$CLAUDE_DIR" 2>/dev/null | grep -q "com.apple.icloud"; then
        echo -e "${RED}  ⚠️  WARNING: ~/.claude is synced to iCloud Drive!${NC}"
        echo -e "${RED}     This can cause files to be offloaded/deleted.${NC}"
        ICLOUD_ISSUE=true
    fi

    # Check for .icloud files (offloaded)
    OFFLOADED=$(find "$PLUGINS_DIR" -name "*.icloud" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$OFFLOADED" -gt 0 ]; then
        echo -e "${RED}  ⚠️  FOUND $OFFLOADED offloaded .icloud files!${NC}"
        echo -e "${RED}     Files have been moved to iCloud and need to be downloaded.${NC}"
        ICLOUD_ISSUE=true
        find "$PLUGINS_DIR" -name "*.icloud" 2>/dev/null | head -5
    fi
fi

if [ "$ICLOUD_ISSUE" = false ]; then
    echo -e "${GREEN}  ✓ No iCloud sync issues detected${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 2: Directory structure
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/8] Checking directory structure...${NC}"

if [ ! -d "$CLAUDE_DIR" ]; then
    echo -e "${RED}  ✗ ~/.claude directory does not exist${NC}"
    echo -e "${YELLOW}    Fix: Run 'claude' to initialize${NC}"
elif [ ! -d "$PLUGINS_DIR" ]; then
    echo -e "${RED}  ✗ ~/.claude/plugins directory does not exist${NC}"
    echo -e "${YELLOW}    Fix: Run 'claude plugin marketplace add anton-abyzov/specweave'${NC}"
elif [ ! -d "$MARKETPLACES_DIR" ]; then
    echo -e "${RED}  ✗ ~/.claude/plugins/marketplaces directory does not exist${NC}"
    echo -e "${YELLOW}    Fix: Run 'claude plugin marketplace add anton-abyzov/specweave'${NC}"
elif [ ! -d "$SPECWEAVE_DIR" ]; then
    echo -e "${RED}  ✗ SpecWeave marketplace not installed${NC}"
    echo -e "${YELLOW}    Fix: Run 'claude plugin marketplace add anton-abyzov/specweave'${NC}"
else
    echo -e "${GREEN}  ✓ All directories exist${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 3: Marketplace registration
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/8] Checking marketplace registration...${NC}"

KNOWN_MARKETPLACES="$PLUGINS_DIR/known_marketplaces.json"
if [ -f "$KNOWN_MARKETPLACES" ]; then
    if jq -e '.specweave' "$KNOWN_MARKETPLACES" > /dev/null 2>&1; then
        INSTALL_LOC=$(jq -r '.specweave.installLocation' "$KNOWN_MARKETPLACES")
        echo -e "${GREEN}  ✓ SpecWeave marketplace registered${NC}"
        echo -e "${BLUE}    Location: $INSTALL_LOC${NC}"

        # Check if the location exists
        if [ ! -d "$INSTALL_LOC" ]; then
            echo -e "${RED}  ⚠️  Registered location does not exist!${NC}"
        fi
    else
        echo -e "${RED}  ✗ SpecWeave marketplace not registered${NC}"
    fi
else
    echo -e "${RED}  ✗ known_marketplaces.json not found${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 4: Plugins directory contents
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/8] Checking plugins directory contents...${NC}"

PLUGINS_SUBDIR="$SPECWEAVE_DIR/plugins"
if [ -d "$PLUGINS_SUBDIR" ]; then
    PLUGIN_COUNT=$(ls -d "$PLUGINS_SUBDIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PLUGIN_COUNT" -eq 0 ]; then
        echo -e "${RED}  ✗ plugins/ folder exists but is EMPTY${NC}"
        echo -e "${RED}    This is the root cause of the loading failure!${NC}"
    else
        echo -e "${GREEN}  ✓ Found $PLUGIN_COUNT plugin directories${NC}"
        ls -d "$PLUGINS_SUBDIR"/*/ 2>/dev/null | head -5 | while read dir; do
            echo -e "${BLUE}    - $(basename "$dir")${NC}"
        done
        [ "$PLUGIN_COUNT" -gt 5 ] && echo -e "${BLUE}    ... and $((PLUGIN_COUNT - 5)) more${NC}"
    fi
else
    echo -e "${RED}  ✗ plugins/ subdirectory does not exist${NC}"
    echo -e "${RED}    Expected: $PLUGINS_SUBDIR${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 5: Git clone integrity
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[5/8] Checking git clone integrity...${NC}"

if [ -d "$SPECWEAVE_DIR/.git" ]; then
    cd "$SPECWEAVE_DIR"

    # Check for sparse checkout
    if git config core.sparseCheckout 2>/dev/null | grep -q "true"; then
        echo -e "${YELLOW}  ⚠️  Sparse checkout is enabled${NC}"
        echo -e "${BLUE}    Sparse patterns:${NC}"
        cat .git/info/sparse-checkout 2>/dev/null | head -5
    fi

    # Check git status
    GIT_STATUS=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$GIT_STATUS" -gt 0 ]; then
        echo -e "${YELLOW}  ⚠️  Working tree has $GIT_STATUS uncommitted changes${NC}"
    fi

    # Check if plugins/ is tracked
    if git ls-files --error-unmatch plugins/ > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ plugins/ directory is tracked in git${NC}"
    else
        echo -e "${RED}  ✗ plugins/ directory is NOT tracked in git${NC}"
    fi

    # Check current branch
    BRANCH=$(git branch --show-current 2>/dev/null)
    echo -e "${BLUE}    Current branch: $BRANCH${NC}"

    cd - > /dev/null
else
    echo -e "${YELLOW}  ⚠️  Not a git repository (might be extracted archive)${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 6: Disk space
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[6/8] Checking disk space...${NC}"

DISK_FREE=$(df -h ~ | tail -1 | awk '{print $4}')
DISK_USED=$(df -h ~ | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$DISK_USED" -gt 95 ]; then
    echo -e "${RED}  ⚠️  Disk is ${DISK_USED}% full (only ${DISK_FREE} free)${NC}"
    echo -e "${RED}     Low disk space can cause clone failures!${NC}"
elif [ "$DISK_USED" -gt 85 ]; then
    echo -e "${YELLOW}  ⚠️  Disk is ${DISK_USED}% full (${DISK_FREE} free)${NC}"
else
    echo -e "${GREEN}  ✓ Disk has ${DISK_FREE} free (${DISK_USED}% used)${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 7: Permissions
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[7/8] Checking permissions...${NC}"

if [ -r "$PLUGINS_DIR" ] && [ -w "$PLUGINS_DIR" ] && [ -x "$PLUGINS_DIR" ]; then
    echo -e "${GREEN}  ✓ ~/.claude/plugins is readable/writable${NC}"
else
    echo -e "${RED}  ✗ Permission issue with ~/.claude/plugins${NC}"
    ls -la "$CLAUDE_DIR" | grep plugins
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 8: Installed plugins
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[8/8] Checking installed plugins...${NC}"

INSTALLED_PLUGINS="$PLUGINS_DIR/installed_plugins.json"
if [ -f "$INSTALLED_PLUGINS" ]; then
    INSTALLED_COUNT=$(jq '.plugins | keys | length' "$INSTALLED_PLUGINS" 2>/dev/null || echo "0")
    echo -e "${GREEN}  ✓ Found $INSTALLED_COUNT installed plugins${NC}"

    # Check if any have specweave marketplace
    SPECWEAVE_PLUGINS=$(jq '.plugins | keys | map(select(endswith("@specweave"))) | length' "$INSTALLED_PLUGINS" 2>/dev/null || echo "0")
    echo -e "${BLUE}    SpecWeave plugins: $SPECWEAVE_PLUGINS${NC}"
else
    echo -e "${YELLOW}  ⚠️  No installed_plugins.json found${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Summary and Recommendations
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Recommendations${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ICLOUD_ISSUE" = true ]; then
    echo -e "${YELLOW}🔧 FIX iCloud SYNC ISSUE:${NC}"
    echo -e "   1. Open System Settings → Apple ID → iCloud → iCloud Drive → Options"
    echo -e "   2. Uncheck 'Desktop & Documents Folders'"
    echo -e "   3. OR move ~/.claude outside of synced folders:"
    echo -e "      mv ~/.claude ~/Library/Application\\ Support/claude"
    echo ""
fi

echo -e "${YELLOW}🔧 TO REINSTALL PLUGINS:${NC}"
echo -e "   1. Remove stale marketplace:"
echo -e "      ${BLUE}claude plugin marketplace remove specweave${NC}"
echo -e ""
echo -e "   2. Clear cache:"
echo -e "      ${BLUE}rm -rf ~/.claude/plugins/cache/specweave${NC}"
echo -e ""
echo -e "   3. Reinstall from GitHub:"
echo -e "      ${BLUE}claude plugin marketplace add anton-abyzov/specweave${NC}"
echo -e ""
echo -e "   4. Install all plugins:"
echo -e "      ${BLUE}claude plugin install sw sw-github sw-jira sw-ado sw-infra${NC}"
echo -e "      ${BLUE}claude plugin install sw-ml sw-release sw-kafka sw-testing${NC}"
echo -e ""
echo -e "   5. Restart Claude Code"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Done!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
