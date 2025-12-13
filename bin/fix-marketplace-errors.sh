#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ⚠️  CAUTION: This script CLEARS ALL installed plugins!  ⚠️              ║
# ╠══════════════════════════════════════════════════════════════════════════╣
# ║                                                                          ║
# ║  This is a NUCLEAR OPTION for fixing corrupted plugin registries.        ║
# ║  It will:                                                                ║
# ║    • REMOVE the SpecWeave marketplace registration                       ║
# ║    • CLEAR the entire plugin registry (ALL plugins, not just SpecWeave!) ║
# ║    • RE-INSTALL SpecWeave plugins from scratch                           ║
# ║                                                                          ║
# ║  USE THIS ONLY IF:                                                       ║
# ║    • `specweave init .` keeps failing with marketplace errors            ║
# ║    • `/plugin list` shows corrupted/broken entries                       ║
# ║    • You understand you'll lose ALL installed plugins                    ║
# ║                                                                          ║
# ║  SAFER ALTERNATIVES:                                                     ║
# ║    • `/plugin install specweave` (install single plugin)                 ║
# ║    • `specweave init .` (safe, non-destructive reinit)                   ║
# ║    • Restart Claude Code (fixes most loading issues)                     ║
# ║                                                                          ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# SpecWeave Marketplace Error Fix Script
# Fixes the common "Plugin not found in marketplace" errors
# Created: 2025-11-11
# Updated: 2025-12-11 (v0.34.6) - Added confirmation prompt

set -e

# Function to print colored output
print_success() { echo -e "\033[0;32m✓ $1\033[0m"; }
print_error() { echo -e "\033[0;31m✗ $1\033[0m"; }
print_info() { echo -e "\033[0;34mℹ $1\033[0m"; }
print_warning() { echo -e "\033[0;33m⚠ $1\033[0m"; }

echo ""
echo "🔧 SpecWeave Marketplace Error Fix Script"
echo "========================================="
echo ""
print_warning "WARNING: This script will CLEAR ALL installed plugins!"
echo ""
echo "This includes:"
echo "  • ALL SpecWeave plugins"
echo "  • ANY other plugins you've installed (Cursor, custom, etc.)"
echo ""
echo "Backups will be created, but you'll need to reinstall non-SpecWeave plugins."
echo ""

# Interactive confirmation
read -p "Type 'I understand' to continue (or anything else to abort): " confirm
if [ "$confirm" != "I understand" ]; then
    echo ""
    print_info "Aborted. No changes were made."
    echo ""
    echo "Safer alternatives:"
    echo "  • /plugin install specweave (in Claude Code session)"
    echo "  • specweave init . (safe, non-destructive)"
    echo "  • Restart Claude Code"
    echo ""
    exit 0
fi

echo ""
print_info "Proceeding with plugin registry reset..."
echo ""


# Check if Claude CLI is available
if ! command -v claude &> /dev/null; then
    print_error "Claude CLI not found. Please install Claude Code first."
    exit 1
fi

print_info "Step 1: Removing existing marketplace registration..."
claude plugin marketplace remove specweave 2>/dev/null || true
print_success "Marketplace registration removed"

print_info "Step 2: Cleaning up marketplace directory..."
if [ -d "$HOME/.claude/plugins/marketplaces/specweave" ]; then
    rm -rf "$HOME/.claude/plugins/marketplaces/specweave"
    print_success "Marketplace directory cleaned"
else
    print_info "No marketplace directory to clean"
fi

print_info "Step 3: Backing up plugin registry files..."
if [ -f "$HOME/.claude/plugins/installed_plugins.json" ]; then
    cp "$HOME/.claude/plugins/installed_plugins.json" "$HOME/.claude/plugins/installed_plugins.json.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backed up installed_plugins.json"
fi

if [ -f "$HOME/.claude/plugins/known_marketplaces.json" ]; then
    cp "$HOME/.claude/plugins/known_marketplaces.json" "$HOME/.claude/plugins/known_marketplaces.json.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backed up known_marketplaces.json"
fi

print_info "Step 4: Clearing plugin registry..."
echo '{"version": 1, "plugins": {}}' > "$HOME/.claude/plugins/installed_plugins.json"
echo '{}' > "$HOME/.claude/plugins/known_marketplaces.json"
print_success "Plugin registry cleared"

print_info "Step 5: Re-registering SpecWeave marketplace from GitHub..."
# CRITICAL: Use full HTTPS URL, NOT owner/repo format!
# Claude CLI converts owner/repo to SSH URL which fails without SSH keys.
claude plugin marketplace add https://github.com/anton-abyzov/specweave
if [ $? -eq 0 ]; then
    print_success "Marketplace registered successfully"
else
    print_error "Failed to register marketplace. Please check your internet connection and try again."
    exit 1
fi

print_info "Step 6: Installing SpecWeave plugins..."
# IMPORTANT: Only list COMPLETE plugins (those with agents/, commands/, or lib/)
# NEVER add plugins that only have skills/ directory - they will fail to load!
plugins=(
    "specweave"
    "specweave-github"
    "specweave-jira"
    "specweave-ado"
    "specweave-kubernetes"
    "specweave-infrastructure"
    "specweave-backend"
    "specweave-payments"
    "specweave-ml"
    "specweave-diagrams"
    "specweave-docs"
    "specweave-release"
    "specweave-mobile"
    "specweave-kafka"
    "specweave-kafka-streams"
    "specweave-confluent"
    "specweave-n8n"
)

installed=0
failed=0

for plugin in "${plugins[@]}"; do
    echo -n "  Installing $plugin... "
    if claude plugin install "$plugin" >/dev/null 2>&1; then
        print_success "OK"
        ((installed++))
    else
        print_error "Failed"
        ((failed++))
    fi
done

echo ""
echo "========================================="
print_success "Fix completed!"
echo ""
echo "Summary:"
echo "  • Plugins installed: $installed/${#plugins[@]}"
if [ $failed -gt 0 ]; then
    print_warning "  • Plugins failed: $failed"
fi

print_info "Step 7: Verifying installation..."

# Check if core plugin exists
if [ -f "$HOME/.claude/plugins/marketplaces/specweave/plugins/specweave/.claude-plugin/plugin.json" ]; then
    print_success "Core plugin manifest found"
else
    print_error "Core plugin manifest not found"
fi

# Count installed plugins
installed_count=$(cat "$HOME/.claude/plugins/installed_plugins.json" | grep -c '"specweave' || true)
if [ $installed_count -gt 0 ]; then
    print_success "Found $installed_count SpecWeave plugins in registry"
else
    print_error "No SpecWeave plugins found in registry"
fi

echo ""
echo "========================================="
print_info "Next steps:"
echo "  1. Restart Claude Code (Cmd+R or Ctrl+R)"
echo "  2. Try using a SpecWeave command (e.g., /sw:status)"
echo "  3. If issues persist, run this script again"
echo ""
print_info "For more help, visit: https://github.com/anton-abyzov/specweave/issues"