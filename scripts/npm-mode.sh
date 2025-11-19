#!/bin/bash
# SpecWeave NPM Mode Switcher
# Switches to global npm installation for end-user testing

set -e

MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/specweave"
GLOBAL_NPM_ROOT="$(npm root -g 2>/dev/null || echo "")"

echo "📦 Switching to NPM mode (end-user testing)..."
echo ""

# Check if global npm installation exists
if [ -z "$GLOBAL_NPM_ROOT" ]; then
  echo "⚠️  npm not found or not configured"
  exit 1
fi

GLOBAL_SPECWEAVE="$GLOBAL_NPM_ROOT/specweave"

if [ ! -d "$GLOBAL_SPECWEAVE" ]; then
  echo "❌ Global specweave not installed"
  echo ""
  echo "Install with:"
  echo "  npm install -g specweave"
  exit 1
fi

# Remove dev symlink
if [ -L "$MARKETPLACE_DIR" ]; then
  echo "🗑️  Removing development symlink..."
  rm -f "$MARKETPLACE_DIR"
  echo "✅ Symlink removed"
fi

# Remove any directory at that location
if [ -d "$MARKETPLACE_DIR" ] && [ ! -L "$MARKETPLACE_DIR" ]; then
  echo "🗑️  Removing marketplace directory..."
  rm -rf "$MARKETPLACE_DIR"
fi

echo ""
echo "✅ NPM mode activated!"
echo ""
echo "📦 Claude Code will now use global npm installation:"
echo "   $GLOBAL_SPECWEAVE"
echo ""
echo "🎯 This matches end-user experience"
echo ""
echo "💡 To switch back to dev: ./scripts/dev-mode.sh"
