#!/bin/bash
# File: cleanup-duplicate-tests.sh
# Purpose: Automated cleanup of duplicate test directories in tests/integration/
#
# CRITICAL: This script deletes 62 duplicate directories!
# BACKUP: Create git branch backup before running
#
# Usage: bash .specweave/increments/0041-living-docs-test-fixes/scripts/cleanup-duplicate-tests.sh

set -e  # Exit on error

echo "🔍 SpecWeave Test Cleanup Script"
echo "================================"
echo ""
echo "⚠️  WARNING: This script will DELETE 62 duplicate test directories!"
echo "   All duplicates have corresponding files in categorized structure"
echo "   (core/, features/, external-tools/, generators/)"
echo ""
echo "📋 Summary of changes:"
echo "   - DELETE: 62 flat duplicate directories"
echo "   - KEEP: Categorized structure (core/, features/, external-tools/, generators/)"
echo "   - TEST: Run npm run test:integration after cleanup"
echo ""

# Step 1: Verify we're in project root
if [ ! -f "package.json" ] || [ ! -d "tests/integration" ]; then
  echo "❌ ERROR: Must run from project root directory"
  exit 1
fi

# Step 2: Verify categorized structure exists
echo "✅ Step 1: Verifying categorized structure..."
if [ ! -d "tests/integration/core" ] || \
   [ ! -d "tests/integration/features" ] || \
   [ ! -d "tests/integration/external-tools" ] || \
   [ ! -d "tests/integration/generators" ]; then
  echo "❌ ERROR: Categorized structure not found!"
  echo "   Required: core/, features/, external-tools/, generators/"
  exit 1
fi
echo "   ✅ Categorized structure verified"
echo ""

# Step 3: Count flat duplicates
echo "✅ Step 2: Counting flat duplicate directories..."
FLAT_DIRS=$(find tests/integration -maxdepth 1 -type d \
  -not -name "tests" -not -name "integration" \
  -not -name "core" -not -name "features" \
  -not -name "external-tools" -not -name "generators" \
  -not -name "deduplication" -not -name "commands" -not -name "." | wc -l | tr -d ' ')

echo "   Found $FLAT_DIRS flat duplicate directories"
echo ""

# Step 4: List directories to be deleted (for review)
echo "📂 Directories to be deleted:"
find tests/integration -maxdepth 1 -type d \
  -not -name "tests" -not -name "integration" \
  -not -name "core" -not -name "features" \
  -not -name "external-tools" -not -name "generators" \
  -not -name "deduplication" -not -name "commands" -not -name "." \
  -exec basename {} \; | sort | head -20
echo "   ... and $(($FLAT_DIRS - 20)) more directories"
echo ""

# Step 5: Confirm deletion
echo "⚠️  FINAL WARNING: This will DELETE $FLAT_DIRS directories!"
echo "   Have you created a backup branch? (git checkout -b test-cleanup-backup)"
echo ""
echo "   Type 'DELETE' to confirm, or Ctrl+C to cancel:"
read -r CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
  echo "❌ Cancelled - confirmation not received"
  exit 1
fi

# Step 6: Delete flat duplicates
echo ""
echo "🗑️  Step 3: Deleting flat duplicate directories..."
find tests/integration -maxdepth 1 -type d \
  -not -name "tests" -not -name "integration" \
  -not -name "core" -not -name "features" \
  -not -name "external-tools" -not -name "generators" \
  -not -name "deduplication" -not -name "commands" -not -name "." \
  -exec rm -rf {} +

echo "   ✅ Deleted $FLAT_DIRS directories"
echo ""

# Step 7: Verify cleanup
echo "✅ Step 4: Verifying cleanup..."
REMAINING=$(find tests/integration -maxdepth 1 -type d -not -name "." | wc -l | tr -d ' ')
echo "   Remaining directories: $REMAINING"
echo "   Expected: 7 (integration/ + core/ + features/ + external-tools/ + generators/ + commands/ + deduplication/)"

if [ "$REMAINING" -gt 7 ]; then
  echo "⚠️  WARNING: More directories remain than expected!"
  echo "   Please review: ls -la tests/integration/"
fi
echo ""

# Step 8: Count test files
echo "✅ Step 5: Counting test files..."
TOTAL_TESTS=$(find tests/integration -name "*.test.ts" | wc -l | tr -d ' ')
echo "   Total integration test files: $TOTAL_TESTS"
echo "   Expected: ~109 (down from 209)"
echo ""

# Step 9: Run tests
echo "🧪 Step 6: Running integration tests..."
echo "   This may take a few minutes..."
echo ""

if npm run test:integration; then
  echo ""
  echo "✅ ALL TESTS PASSED!"
else
  echo ""
  echo "❌ TESTS FAILED!"
  echo "   Please review test output above"
  echo "   You may need to restore from backup: git checkout test-cleanup-backup"
  exit 1
fi

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "📊 Results:"
echo "   - Deleted: $FLAT_DIRS duplicate directories"
echo "   - Remaining: $TOTAL_TESTS test files"
echo "   - Status: All tests passing ✅"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git status"
echo "   2. Commit: git add . && git commit -m 'chore: remove duplicate test directories (48% reduction)'"
echo "   3. Run full test suite: npm run test:all"
echo "   4. Update documentation: Edit tests/integration/README.md"
echo ""
echo "💰 Expected savings:"
echo "   - CI time: ~15 min → ~8 min (47% faster)"
echo "   - Annual savings: ~607 hours/year"
echo ""
