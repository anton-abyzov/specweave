#!/bin/bash
# ⚠️ DEPRECATED: SpecWeave Development Mode Switcher
#
# 🔴 THIS SCRIPT IS DEPRECATED AS OF 2025-11-22
#
# This script created symlinks for local development, which is NO LONGER SUPPORTED.
#
# USE GITHUB MARKETPLACE WORKFLOW INSTEAD:
# 1. Push changes to GitHub (develop branch)
# 2. Wait 5-10 seconds for Claude Code auto-update
# 3. Test with updated marketplace code
#
# See CLAUDE.md Section 1 "Local Development Setup" for current guidelines.
#
# This script is preserved for historical reference only.
# ---

set -e

echo "⚠️  WARNING: This script is DEPRECATED!"
echo "   Use GitHub marketplace workflow instead (see CLAUDE.md)"
echo ""
read -p "Continue anyway? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Exiting. See CLAUDE.md for GitHub-first workflow."
  exit 1
fi
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/specweave"

echo "🔧 Switching to DEVELOPMENT mode..."
echo ""

# Check if already in dev mode
if [ -L "$MARKETPLACE_DIR" ]; then
  TARGET="$(readlink "$MARKETPLACE_DIR")"
  if [ "$TARGET" = "$PROJECT_ROOT" ]; then
    echo "✅ Already in development mode"
    echo "   Symlink: $MARKETPLACE_DIR → $PROJECT_ROOT"
    exit 0
  fi
fi

# Remove existing directory or symlink
if [ -e "$MARKETPLACE_DIR" ]; then
  echo "🗑️  Removing existing: $MARKETPLACE_DIR"
  rm -rf "$MARKETPLACE_DIR"
fi

# Create symlink
echo "🔗 Creating symlink..."
mkdir -p "$(dirname "$MARKETPLACE_DIR")"
ln -s "$PROJECT_ROOT" "$MARKETPLACE_DIR"

# Verify
if [ -L "$MARKETPLACE_DIR" ]; then
  echo "✅ Development mode activated!"
  echo ""
  echo "📂 Symlink created:"
  ls -ld "$MARKETPLACE_DIR"
  echo ""
  echo "🎯 Changes to local repo will now be used by Claude Code hooks"
  echo "   Remember to run 'npm run rebuild' after TypeScript changes"
  echo ""
  echo "💡 To switch back: ./scripts/npm-mode.sh"
else
  echo "❌ Failed to create symlink"
  exit 1
fi
