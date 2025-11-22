#!/bin/bash
set -e  # Exit on error

# Fix Plugin Installation Errors - Automated Cleanup Script
#
# This script fixes the critical plugin installation error caused by:
# - Stale local plugin installations (v0.22.14 vs current v0.23.16)
# - Mixed installation paths (marketplace vs project directory)
# - Using local refs instead of GitHub refs
#
# Related: .specweave/increments/0050-external-tool-import-phase-1b-7/reports/PLUGIN-INSTALLATION-ERROR-ROOT-CAUSE-ANALYSIS.md

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 SpecWeave Plugin Installation Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: Must run from project root (specweave directory)"
    exit 1
fi

# Verify current version
CURRENT_VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f4)
echo "📦 Current project version: $CURRENT_VERSION"
echo ""

# Step 1: Backup current state
echo "📋 Step 1: Backing up current Claude Code plugin state..."
BACKUP_DIR="$HOME/.claude/plugins/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "$HOME/.claude/plugins/marketplaces/specweave" ]; then
    cp -r "$HOME/.claude/plugins/marketplaces/specweave" "$BACKUP_DIR/"
    echo "   ✅ Backed up marketplace directory to $BACKUP_DIR"
fi

if [ -f "$HOME/.claude/plugins/known_marketplaces.json" ]; then
    cp "$HOME/.claude/plugins/known_marketplaces.json" "$BACKUP_DIR/"
    echo "   ✅ Backed up known_marketplaces.json"
fi

if [ -f "$HOME/.claude/plugins/installed_plugins.json" ]; then
    cp "$HOME/.claude/plugins/installed_plugins.json" "$BACKUP_DIR/"
    echo "   ✅ Backed up installed_plugins.json"
fi

echo ""

# Step 2: Remove stale marketplace installation
echo "🗑️  Step 2: Removing stale marketplace installation..."

if [ -d "$HOME/.claude/plugins/marketplaces/specweave" ]; then
    rm -rf "$HOME/.claude/plugins/marketplaces/specweave"
    echo "   ✅ Removed stale marketplace directory"
else
    echo "   ℹ️  Marketplace directory not found (already clean)"
fi

echo ""

# Step 3: Clean up configuration files
echo "🧹 Step 3: Cleaning up plugin configuration..."

# Remove specweave from known_marketplaces.json
if [ -f "$HOME/.claude/plugins/known_marketplaces.json" ]; then
    # Create backup
    cp "$HOME/.claude/plugins/known_marketplaces.json" "$HOME/.claude/plugins/known_marketplaces.json.bak"

    # Remove specweave entry (using jq if available, otherwise manual)
    if command -v jq &> /dev/null; then
        jq 'del(.specweave)' "$HOME/.claude/plugins/known_marketplaces.json" > "$HOME/.claude/plugins/known_marketplaces.json.tmp"
        mv "$HOME/.claude/plugins/known_marketplaces.json.tmp" "$HOME/.claude/plugins/known_marketplaces.json"
        echo "   ✅ Removed specweave from known_marketplaces.json"
    else
        echo "   ⚠️  jq not installed - manual cleanup required for known_marketplaces.json"
    fi
fi

# Remove specweave plugins from installed_plugins.json
if [ -f "$HOME/.claude/plugins/installed_plugins.json" ]; then
    # Create backup
    cp "$HOME/.claude/plugins/installed_plugins.json" "$HOME/.claude/plugins/installed_plugins.json.bak"

    # Remove all specweave* entries (using jq if available)
    if command -v jq &> /dev/null; then
        jq '.plugins |= with_entries(select(.key | test("^specweave") | not))' "$HOME/.claude/plugins/installed_plugins.json" > "$HOME/.claude/plugins/installed_plugins.json.tmp"
        mv "$HOME/.claude/plugins/installed_plugins.json.tmp" "$HOME/.claude/plugins/installed_plugins.json"
        echo "   ✅ Removed all specweave plugins from installed_plugins.json"
    else
        echo "   ⚠️  jq not installed - manual cleanup required for installed_plugins.json"
    fi
fi

echo ""

# Step 4: Verify cleanup
echo "✅ Step 4: Verifying cleanup..."

if [ ! -d "$HOME/.claude/plugins/marketplaces/specweave" ]; then
    echo "   ✅ Marketplace directory removed"
else
    echo "   ❌ Marketplace directory still exists!"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cleanup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps (MANUAL - In Claude Code):"
echo ""
echo "1. Open Claude Code"
echo "2. Run the command: /plugins (or press Ctrl+Shift+P and type 'plugins')"
echo "3. Select '3. Add marketplace'"
echo "4. Enter: github:anton-abyzov/specweave"
echo "5. Wait 5-10 seconds for marketplace to load"
echo "6. Select '1. Browse and install plugins'"
echo "7. Install the plugins you need"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After reinstalling, verify the version:"
echo "  cat ~/.claude/plugins/installed_plugins.json | grep -A 5 'specweave@specweave'"
echo ""
echo "Expected version: $CURRENT_VERSION"
echo "Expected commit: $(git log -1 --format='%H' | head -c 10)..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Backup Location: $BACKUP_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
