#!/bin/bash
# Pre-commit hook: Duplicate Increment Detection
#
# Blocks commits that contain duplicate increments (same number in multiple locations).
# Part of the 6-layer duplicate prevention strategy.
#
# Usage: Called automatically by git pre-commit hook
# Exit codes:
#   0 = No duplicates, allow commit
#   1 = Duplicates detected, block commit

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "🔍 Checking for duplicate increments..."

# Check if dist/ directory exists (need compiled code)
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}⚠️  Warning: dist/ not found, skipping duplicate check${NC}"
  echo "   Run 'npm run build' to enable duplicate detection"
  exit 0
fi

# Run duplicate detection using TypeScript (using IIFE for top-level await)
DUPLICATE_CHECK=$(npx tsx -e "
import { detectAllDuplicates } from './dist/src/core/increment/duplicate-detector.js';

(async function check() {
  try {
    const report = await detectAllDuplicates('.');

    if (report.duplicateCount > 0) {
      console.error('');
      console.error('❌ DUPLICATE INCREMENTS DETECTED');
      console.error('');

      for (const dup of report.duplicates) {
        console.error('  Increment Number: ' + dup.incrementNumber);
        console.error('  Locations:');
        for (const loc of dup.locations) {
          const isWinner = loc.path === dup.recommendedWinner.path;
          const marker = isWinner ? '→' : '✗';
          const shortPath = loc.path.replace(process.cwd() + '/', '');
          console.error('    ' + marker + ' ' + shortPath);
          console.error('       Status: ' + loc.status + ', Files: ' + loc.fileCount + ', Updated: ' + loc.lastActivity.split('T')[0]);
        }
        console.error('');
        console.error('  Recommended Winner: ' + dup.recommendedWinner.name);
        console.error('  Reason: ' + dup.resolutionReason);
        console.error('');
      }

      console.error('❌ Cannot commit with duplicate increments!');
      console.error('');
      console.error('Resolution Options:');
      console.error('  1. Run: /specweave:fix-duplicates');
      console.error('     (Guided resolution with automatic cleanup)');
      console.error('');
      console.error('  2. Manual deletion:');
      console.error('     rm -rf .specweave/increments/_archive/0039-*  # Remove archived');
      console.error('     OR');
      console.error('     rm -rf .specweave/increments/0039-*          # Remove active');
      console.error('');
      console.error('See: .specweave/docs/internal/architecture/duplicate-prevention-strategy.md');
      console.error('');

      process.exit(1);
    } else {
      console.log('✅ No duplicate increments detected');
      process.exit(0);
    }
  } catch (error) {
    console.error('⚠️  Error running duplicate check:', error.message);
    console.error('   Skipping duplicate check (fail open)');
    // Don't block commit on script errors (fail open)
    process.exit(0);
  }
})();
" 2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$DUPLICATE_CHECK"
  exit 1
fi

echo "$DUPLICATE_CHECK"
exit 0
