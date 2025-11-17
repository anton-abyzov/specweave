#!/bin/bash
# Pre-commit hook: Prevent accidental .specweave/ mass deletion
#
# This hook prevents commits that delete more than 50 files in .specweave/
# which typically indicates test cleanup accidentally deleted the real folder.
#
# Install: bash scripts/install-git-hooks.sh
# Bypass: git commit --no-verify (use with caution!)

set -e

# Count deleted .specweave/ files
DELETED_COUNT=$(git status --short | grep "^ D .specweave/" | wc -l | tr -d ' ')

# Threshold: More than 50 deletions is suspicious
THRESHOLD=50

if [ "$DELETED_COUNT" -gt "$THRESHOLD" ]; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  ERROR: Mass .specweave/ Deletion Detected!"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  Attempting to delete $DELETED_COUNT files in .specweave/"
  echo "  Threshold: $THRESHOLD files"
  echo ""
  echo "  This likely indicates:"
  echo "    1. Test cleanup deleted real .specweave/ folder"
  echo "    2. Accidental 'rm -rf .specweave/'"
  echo "    3. Test using process.cwd() + '.specweave' without isolation"
  echo ""
  echo "  📋 Action Required:"
  echo "    1. Restore files: git restore .specweave/"
  echo "    2. Fix test to use temp directory (see tests/README.md)"
  echo "    3. Verify with: git status"
  echo ""
  echo "  ⚠️  To bypass this check (if intentional):"
  echo "     git commit --no-verify"
  echo ""
  echo "  📚 Documentation:"
  echo "     .specweave/increments/0039-test-cleanup-fix/CRITICAL-TEST-CLEANUP-ANALYSIS.md"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

# All checks passed
exit 0
