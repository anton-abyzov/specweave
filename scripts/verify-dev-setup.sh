#!/usr/bin/env bash
# Verify SpecWeave local development setup is correct
#
# This script checks that Claude Code can execute plugin hooks correctly.
# Run after cloning the repo or if you see "No such file or directory" hook errors.
#
# Usage:
#   bash scripts/verify-dev-setup.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

echo "🔍 Verifying SpecWeave local development setup..."
echo ""

FAILED=0

# Get repository root (scripts/ is one level deep from repo root)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Repository root: $REPO_ROOT"
echo ""

# Check 1: Symlink exists
echo "1️⃣  Checking marketplace symlink exists..."
if [ ! -L ~/.claude/plugins/marketplaces/specweave ]; then
  echo "   ❌ FAILED: Marketplace symlink missing!"
  echo ""
  echo "   Fix: Run the following command from repository root:"
  echo "   $ mkdir -p ~/.claude/plugins/marketplaces"
  echo "   $ ln -s \"\$PWD\" ~/.claude/plugins/marketplaces/specweave"
  echo ""
  FAILED=1
else
  echo "   ✅ PASSED: Symlink exists"
fi

# Check 2: Symlink points to current repo
if [ -L ~/.claude/plugins/marketplaces/specweave ]; then
  echo "2️⃣  Checking symlink points to current repository..."
  SYMLINK_TARGET=$(readlink ~/.claude/plugins/marketplaces/specweave)
  if [ "$SYMLINK_TARGET" != "$REPO_ROOT" ]; then
    echo "   ❌ FAILED: Symlink points to wrong location!"
    echo ""
    echo "   Current:  $SYMLINK_TARGET"
    echo "   Expected: $REPO_ROOT"
    echo ""
    echo "   Fix: Remove and recreate symlink:"
    echo "   $ rm ~/.claude/plugins/marketplaces/specweave"
    echo "   $ ln -s \"$REPO_ROOT\" ~/.claude/plugins/marketplaces/specweave"
    echo ""
    FAILED=1
  else
    echo "   ✅ PASSED: Symlink points to correct location"
  fi
fi

# Check 3: Marketplace registered (optional - claude CLI may not be in PATH)
echo "3️⃣  Checking marketplace is registered with Claude Code..."
if ! command -v claude &> /dev/null; then
  echo "   ⏭️  SKIPPED: claude CLI not in PATH (run manually in Claude Code)"
  echo "   Note: Marketplace registration is managed by Claude Code, not shell"
elif ! claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
  echo "   ⚠️  WARNING: Marketplace not registered (may not affect hook execution)"
  echo ""
  echo "   Optional: Register the marketplace (if hooks still fail):"
  echo "   $ claude plugin marketplace add ~/.claude/plugins/marketplaces/specweave"
  echo ""
else
  echo "   ✅ PASSED: Marketplace registered"
fi

# Check 4: Core plugin hooks accessible
echo "4️⃣  Checking core plugin hooks are accessible..."
HOOK_PATH=~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh
if [ ! -f "$HOOK_PATH" ]; then
  echo "   ❌ FAILED: Hooks not accessible via symlink!"
  echo ""
  echo "   Expected: $HOOK_PATH"
  echo "   This indicates the symlink is broken or points to wrong location."
  echo ""
  echo "   Fix: Recreate symlink (see Check 1 & 2 above)"
  echo ""
  FAILED=1
else
  echo "   ✅ PASSED: Hooks accessible via symlink"
fi

# Check 5: Hooks are executable
if [ -f "$HOOK_PATH" ]; then
  echo "5️⃣  Checking hooks have execute permissions..."
  if [ ! -x "$HOOK_PATH" ]; then
    echo "   ❌ FAILED: Hooks exist but not executable!"
    echo ""
    echo "   Fix: Make hooks executable:"
    echo "   $ chmod +x \"$REPO_ROOT\"/plugins/*/hooks/*.sh"
    echo ""
    FAILED=1
  else
    echo "   ✅ PASSED: Hooks are executable"
  fi
fi

# Check 6: Release plugin hooks accessible (if exists)
echo "6️⃣  Checking release plugin hooks..."
RELEASE_HOOK_PATH=~/.claude/plugins/marketplaces/specweave/plugins/specweave-release/hooks/post-task-completion.sh
if [ -f "$REPO_ROOT/plugins/specweave-release/hooks/post-task-completion.sh" ]; then
  if [ ! -f "$RELEASE_HOOK_PATH" ]; then
    echo "   ❌ FAILED: Release plugin hooks not accessible!"
    echo ""
    echo "   Expected: $RELEASE_HOOK_PATH"
    echo "   Fix: Recreate symlink (see Check 1 & 2 above)"
    echo ""
    FAILED=1
  elif [ ! -x "$RELEASE_HOOK_PATH" ]; then
    echo "   ❌ FAILED: Release plugin hooks not executable!"
    echo ""
    echo "   Fix: chmod +x \"$REPO_ROOT\"/plugins/specweave-release/hooks/*.sh"
    echo ""
    FAILED=1
  else
    echo "   ✅ PASSED: Release plugin hooks accessible and executable"
  fi
else
  echo "   ⏭️  SKIPPED: Release plugin not present in repository"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED! Local development setup is correct."
  echo ""
  echo "You can now use TodoWrite and other tools without hook errors."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "❌ SETUP VERIFICATION FAILED!"
  echo ""
  echo "One or more checks failed. Please fix the issues above before continuing."
  echo ""
  echo "📚 For detailed setup instructions, see:"
  echo "   CLAUDE.md → 'Local Development Setup (Contributors Only)'"
  echo ""
  echo "🐛 If you need help, see:"
  echo "   .specweave/increments/0043-spec-md-desync-fix/reports/PLUGIN-HOOK-ERROR-FIX-2025-11-18.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
