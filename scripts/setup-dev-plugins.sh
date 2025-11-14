#!/bin/bash
# SpecWeave Plugin Setup for Development
# Automatically detects environment (local vs VM) and configures appropriately

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Script directory (where specweave repo is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Claude plugins directory
CLAUDE_PLUGINS_DIR="$HOME/.claude/plugins"
MARKETPLACE_DIR="$CLAUDE_PLUGINS_DIR/marketplaces/specweave"

echo ""
echo -e "${CYAN}🔧 SpecWeave Development Plugin Setup${NC}"
echo -e "${GRAY}================================================${NC}"
echo ""

# Function: Detect if we're in a VM/cloud environment
detect_environment() {
    # Check for common VM/cloud indicators
    if [[ -n "${CLOUDENV}" ]] || \
       [[ -n "${CODESPACE_NAME}" ]] || \
       [[ -n "${GITPOD_WORKSPACE_ID}" ]] || \
       [[ -f "/.dockerenv" ]] || \
       [[ -d "/workspace" ]] || \
       grep -q "hypervisor\|VMware\|VirtualBox\|QEMU" /proc/cpuinfo 2>/dev/null || \
       [[ "$(uname -r)" =~ "cloud" ]] || \
       [[ "$(hostname)" =~ "claude-code" ]]; then
        echo "vm"
    else
        echo "local"
    fi
}

# Function: Check if Claude CLI is available
check_claude_cli() {
    if command -v claude &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function: Check and register marketplace with Claude CLI
register_marketplace() {
    echo -e "${BLUE}🔗 Checking marketplace registration...${NC}"

    if ! check_claude_cli; then
        echo -e "${YELLOW}   ⚠️  Claude CLI not found - skipping marketplace registration${NC}"
        echo -e "${GRAY}      Marketplace registration required for plugin installation${NC}"
        return 1
    fi

    # Check if marketplace is already registered
    if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
        echo -e "${GREEN}   ✅ Marketplace already registered${NC}"

        # Show registration details
        MARKETPLACE_SOURCE=$(claude plugin marketplace list 2>/dev/null | grep -A 1 "specweave" | tail -1)
        echo -e "${GRAY}      $MARKETPLACE_SOURCE${NC}"

        return 0
    else
        echo -e "${YELLOW}   ⚠️  Marketplace not registered with Claude Code${NC}"
        echo -e "${CYAN}   Registering marketplace: $REPO_ROOT${NC}"

        # Register marketplace (use project root, NOT .claude-plugin)
        if claude plugin marketplace add "$REPO_ROOT" 2>/dev/null; then
            echo -e "${GREEN}   ✅ Marketplace registered successfully${NC}"

            # Verify registration
            if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
                echo -e "${GREEN}   ✅ Registration verified${NC}"
                return 0
            else
                echo -e "${RED}   ❌ Registration verification failed${NC}"
                return 1
            fi
        else
            echo -e "${RED}   ❌ Failed to register marketplace${NC}"
            echo ""
            echo -e "${CYAN}Try manually:${NC}"
            echo -e "${GRAY}   claude plugin marketplace add $REPO_ROOT${NC}"
            return 1
        fi
    fi
}

# Function: Setup symlink (local only)
setup_symlink() {
    echo -e "${BLUE}📍 Setting up local development symlink...${NC}"

    # Remove existing symlink or directory if present
    if [[ -L "$MARKETPLACE_DIR" ]]; then
        echo -e "${YELLOW}   Removing existing symlink${NC}"
        rm -f "$MARKETPLACE_DIR"
    elif [[ -d "$MARKETPLACE_DIR" ]]; then
        echo -e "${YELLOW}   Removing existing directory (will backup)${NC}"
        mv "$MARKETPLACE_DIR" "$MARKETPLACE_DIR.backup-$(date +%s)"
    fi

    # Create parent directory if needed
    mkdir -p "$CLAUDE_PLUGINS_DIR/marketplaces"

    # Create symlink
    ln -sf "$REPO_ROOT" "$MARKETPLACE_DIR"

    # Verify symlink works
    if [[ -f "$MARKETPLACE_DIR/plugins/specweave/hooks/post-task-completion.sh" ]]; then
        echo -e "${GREEN}   ✅ Symlink created successfully${NC}"
        echo -e "${GRAY}      $MARKETPLACE_DIR → $REPO_ROOT${NC}"

        # CRITICAL: Register marketplace with Claude Code
        echo ""
        register_marketplace

        return 0
    else
        echo -e "${RED}   ❌ Symlink verification failed${NC}"
        return 1
    fi
}

# Function: Setup GitHub marketplace (VM)
setup_github_marketplace() {
    echo -e "${BLUE}🌐 Setting up GitHub marketplace (VM mode)...${NC}"

    if ! check_claude_cli; then
        echo -e "${RED}   ❌ Claude CLI not found${NC}"
        echo -e "${YELLOW}   Install: https://docs.claude.com/cli${NC}"
        return 1
    fi

    # Check if marketplace is already registered
    echo -e "${CYAN}   Checking for existing marketplace...${NC}"
    MARKETPLACE_REGISTERED=false

    if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
        MARKETPLACE_REGISTERED=true
        MARKETPLACE_SOURCE=$(claude plugin marketplace list 2>/dev/null | grep -A 1 "specweave" | grep "Source" || echo "")

        # Check if it's GitHub source
        if [[ "$MARKETPLACE_SOURCE" =~ "GitHub" ]]; then
            echo -e "${GREEN}   ✅ GitHub marketplace already registered${NC}"
            echo -e "${GRAY}      $MARKETPLACE_SOURCE${NC}"
            return 0
        else
            # Local marketplace found, remove it for VM setup
            echo -e "${YELLOW}   Found local marketplace, switching to GitHub...${NC}"
            claude plugin marketplace remove specweave 2>/dev/null || true
        fi
    fi

    # Add GitHub marketplace
    echo -e "${CYAN}   Adding GitHub marketplace: anton-abyzov/specweave${NC}"
    if claude plugin marketplace add anton-abyzov/specweave; then
        echo -e "${GREEN}   ✅ GitHub marketplace added${NC}"

        # List available plugins
        echo -e "${CYAN}   Fetching available plugins...${NC}"
        echo -e "${GRAY}   (This may take a moment - cloning from GitHub)${NC}"
        sleep 2

        # Verify marketplace directory was created
        if [[ -d "$MARKETPLACE_DIR" ]]; then
            echo -e "${GREEN}   ✅ Marketplace cloned to: $MARKETPLACE_DIR${NC}"

            # Count plugins
            PLUGIN_COUNT=$(find "$MARKETPLACE_DIR/plugins" -maxdepth 1 -type d | grep -c "specweave" || echo "0")
            echo -e "${GREEN}   ✅ Found $PLUGIN_COUNT plugins${NC}"

            return 0
        else
            echo -e "${YELLOW}   ⚠️  Marketplace registered but directory not found${NC}"
            echo -e "${GRAY}      Claude may clone it on first use${NC}"
            return 0
        fi
    else
        echo -e "${RED}   ❌ Failed to add GitHub marketplace${NC}"
        return 1
    fi
}

# Function: Install core plugins
install_core_plugins() {
    echo ""
    echo -e "${BLUE}📦 Installing core SpecWeave plugins...${NC}"

    if ! check_claude_cli; then
        echo -e "${YELLOW}   ⚠️  Claude CLI not found - skipping plugin installation${NC}"
        echo -e "${GRAY}      You can install manually: /plugin install specweave${NC}"
        return 1
    fi

    # Core plugins to install
    CORE_PLUGINS=(
        "specweave"
        "specweave-github"
        "specweave-jira"
        "specweave-ado"
    )

    SUCCESS_COUNT=0
    FAIL_COUNT=0

    for plugin in "${CORE_PLUGINS[@]}"; do
        echo -e "${CYAN}   Installing $plugin...${NC}"
        if claude plugin install "$plugin" 2>/dev/null; then
            echo -e "${GREEN}   ✅ $plugin installed${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${YELLOW}   ⚠️  $plugin failed (may already be installed)${NC}"
            ((FAIL_COUNT++))
        fi
    done

    echo ""
    echo -e "${GREEN}   Installed: $SUCCESS_COUNT/${#CORE_PLUGINS[@]} plugins${NC}"
    if [[ $FAIL_COUNT -gt 0 ]]; then
        echo -e "${GRAY}   Failed plugins may already be installed${NC}"
    fi
}

# Function: Verify setup
verify_setup() {
    echo ""
    echo -e "${BLUE}🔍 Verifying setup...${NC}"

    # Check marketplace directory
    if [[ -d "$MARKETPLACE_DIR" ]] || [[ -L "$MARKETPLACE_DIR" ]]; then
        echo -e "${GREEN}   ✅ Marketplace directory exists${NC}"

        # Check if symlink or regular directory
        if [[ -L "$MARKETPLACE_DIR" ]]; then
            echo -e "${GRAY}      Type: Symlink (local dev)${NC}"
            echo -e "${GRAY}      Target: $(readlink "$MARKETPLACE_DIR")${NC}"
        else
            echo -e "${GRAY}      Type: Directory (GitHub clone)${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Marketplace directory not found${NC}"
        return 1
    fi

    # Check core hook
    if [[ -f "$MARKETPLACE_DIR/plugins/specweave/hooks/post-task-completion.sh" ]]; then
        echo -e "${GREEN}   ✅ Core hooks accessible${NC}"
    else
        echo -e "${RED}   ❌ Core hooks NOT found${NC}"
        return 1
    fi

    # Check GitHub plugin hook
    if [[ -f "$MARKETPLACE_DIR/plugins/specweave-github/hooks/post-task-completion.sh" ]]; then
        echo -e "${GREEN}   ✅ Plugin hooks accessible${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Some plugin hooks missing${NC}"
    fi

    echo ""
    echo -e "${GREEN}✅ Setup verification passed!${NC}"
    return 0
}

# Main execution
main() {
    ENV_TYPE=$(detect_environment)

    echo -e "${CYAN}Environment detected: ${NC}${YELLOW}$ENV_TYPE${NC}"
    echo ""

    if [[ "$ENV_TYPE" == "vm" ]]; then
        echo -e "${BLUE}🌩️  VM/Cloud environment detected${NC}"
        echo -e "${GRAY}   Using GitHub marketplace for reliability${NC}"
        echo ""

        if setup_github_marketplace; then
            install_core_plugins
            verify_setup

            echo ""
            echo -e "${GREEN}🎉 Setup complete!${NC}"
            echo ""
            echo -e "${CYAN}Next steps:${NC}"
            echo -e "${GRAY}   1. Open Claude Code IDE${NC}"
            echo -e "${GRAY}   2. Try: /specweave:increment \"test\"${NC}"
            echo -e "${GRAY}   3. Hooks will work automatically!${NC}"
        else
            echo -e "${RED}❌ GitHub marketplace setup failed${NC}"
            echo ""
            echo -e "${CYAN}Manual setup:${NC}"
            echo -e "${GRAY}   claude plugin marketplace add anton-abyzov/specweave${NC}"
            echo -e "${GRAY}   claude plugin install specweave${NC}"
            exit 1
        fi
    else
        echo -e "${BLUE}💻 Local development environment detected${NC}"
        echo -e "${GRAY}   Using symlink for instant updates${NC}"
        echo ""

        if setup_symlink; then
            echo ""
            echo -e "${GREEN}🎉 Setup complete!${NC}"
            echo ""
            echo -e "${CYAN}Benefits of symlink setup:${NC}"
            echo -e "${GREEN}   ✅ Changes to hooks take effect immediately${NC}"
            echo -e "${GREEN}   ✅ No need to push to GitHub for testing${NC}"
            echo -e "${GREEN}   ✅ Full development workflow enabled${NC}"
            echo ""
            echo -e "${CYAN}Next steps:${NC}"
            echo -e "${GRAY}   1. Edit hooks in: $REPO_ROOT/plugins/*/hooks/${NC}"
            echo -e "${GRAY}   2. Test immediately (no restart needed)${NC}"
            echo -e "${GRAY}   3. Use /specweave:* commands in Claude Code${NC}"

            # Optionally install plugins
            echo ""
            read -p "Install core plugins now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_core_plugins
            else
                echo -e "${GRAY}   You can install manually: /plugin install specweave${NC}"
            fi

            verify_setup
        else
            echo -e "${RED}❌ Symlink setup failed${NC}"
            exit 1
        fi
    fi

    echo ""
}

# Run main function
main "$@"
