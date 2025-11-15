#!/bin/bash
#
# Quick Fix: Sync Increment 0031 User Stories
#
# This script fixes the immediate issue with increment 0031 by:
# 1. Removing invalid 'backend' project from frontmatter
# 2. Re-running sync for increment 0031
# 3. Verifying 7 user stories are created
#

set -e

PROJECT_ROOT="/Users/antonabyzov/Projects/github/specweave"
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/0031-external-tool-status-sync/spec.md"

echo "==================================================="
echo "Quick Fix: Increment 0031 Sync Issue"
echo "==================================================="
echo ""

# Step 1: Backup original spec.md
echo "1. Creating backup..."
cp "$SPEC_FILE" "$SPEC_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo "   ✅ Backup created"
echo ""

# Step 2: Fix frontmatter (remove invalid 'backend' project)
echo "2. Fixing frontmatter..."
if grep -q "projects: \['backend'\]" "$SPEC_FILE"; then
  # Replace with 'default' project
  sed -i '' "s/projects: \['backend'\]/projects: ['default']/" "$SPEC_FILE"
  echo "   ✅ Changed projects: ['backend'] → projects: ['default']"
else
  echo "   ⚠️  'projects: ['backend']' not found (may already be fixed)"
fi
echo ""

# Step 3: Re-run sync for increment 0031
echo "3. Re-running living docs sync..."
cd "$PROJECT_ROOT"

# Run sync using Node.js
node -e "
import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const dist = new SpecDistributor(process.cwd());
  console.log('   📦 Starting sync for 0031-external-tool-status-sync...');
  await dist.distribute('0031-external-tool-status-sync');
  console.log('   ✅ Sync complete');
}).catch(err => {
  console.error('   ❌ Sync failed:', err.message);
  process.exit(1);
});
"

echo ""

# Step 4: Verify user stories were created
echo "4. Verifying sync results..."
EXPECTED_US=7
SYNCED_US=$(find "$PROJECT_ROOT/.specweave/docs/internal/specs/default/FS-031" -name "us-*.md" 2>/dev/null | wc -l | tr -d ' ')

if [ "$SYNCED_US" -eq "$EXPECTED_US" ]; then
  echo "   ✅ SUCCESS: All $EXPECTED_US user stories synced correctly"
  echo ""
  echo "   Files created:"
  find "$PROJECT_ROOT/.specweave/docs/internal/specs/default/FS-031" -name "us-*.md" | sort
  echo ""
  echo "==================================================="
  echo "✅ FIX COMPLETE"
  echo "==================================================="
  exit 0
else
  echo "   ❌ FAIL: Expected $EXPECTED_US user stories, found $SYNCED_US"
  echo ""
  echo "   Please check:"
  echo "   - .specweave/increments/0031-external-tool-status-sync/spec.md"
  echo "   - .specweave/docs/internal/specs/default/FS-031/"
  echo ""
  echo "==================================================="
  echo "❌ FIX FAILED"
  echo "==================================================="
  exit 1
fi
