#!/bin/bash
# SpecWeave NPM Mode Switcher
# MIGRATION HELPER: Removes legacy symlinks from deprecated dev-mode.sh workflow
#
# ⚠️ NOTE: This script helps users migrate from the DEPRECATED symlink workflow.
# New contributors should NOT use dev-mode.sh - use GitHub marketplace exclusively.
#
# PURPOSE: Removes symlinks and switches to global npm installation for testing
#
# MODERN WORKFLOW (Recommended):
# - Use GitHub marketplace (claude plugin marketplace add github:USER/specweave)
# - Push to GitHub → Wait 5-10s → Claude Code auto-updates
# - No symlinks needed!
#
# See CLAUDE.md Section 1 "Local Development Setup" for current guidelines.

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
