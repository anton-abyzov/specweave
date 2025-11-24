#!/usr/bin/env bash
# Rename files with "bidirectional" in their names
# Part of increment 0047 - Three-Permission Architecture

set -e

echo "🔄 Renaming files with 'bidirectional' in names..."
echo ""

# Test file renames
echo "📋 Renaming test files..."

# 1. jira-bidirectional-sync.test.ts → jira-full-sync.test.ts
if [ -f "tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts" ]; then
  git mv "tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts" \
         "tests/integration/external-tools/jira/jira-full-sync.test.ts"
  echo "   ✅ Renamed: jira-bidirectional-sync.test.ts → jira-full-sync.test.ts"
fi

# 2. bidirectional-sync.test.ts → full-sync.test.ts (in core/living-docs-sync)
if [ -f "tests/integration/core/living-docs-sync/bidirectional-sync.test.ts" ]; then
  git mv "tests/integration/core/living-docs-sync/bidirectional-sync.test.ts" \
         "tests/integration/core/living-docs-sync/full-sync.test.ts"
  echo "   ✅ Renamed: living-docs-sync/bidirectional-sync.test.ts → full-sync.test.ts"
fi

# 3. living-docs-sync-bidirectional.test.ts → living-docs-full-sync.test.ts
if [ -f "tests/e2e/living-docs-sync-bidirectional.test.ts" ]; then
  git mv "tests/e2e/living-docs-sync-bidirectional.test.ts" \
         "tests/e2e/living-docs-full-sync.test.ts"
  echo "   ✅ Renamed: living-docs-sync-bidirectional.test.ts → living-docs-full-sync.test.ts"
fi

# 4. bidirectional-sync.test.ts → full-sync.test.ts (in e2e)
if [ -f "tests/e2e/bidirectional-sync.test.ts" ]; then
  git mv "tests/e2e/bidirectional-sync.test.ts" \
         "tests/e2e/full-sync.test.ts"
  echo "   ✅ Renamed: e2e/bidirectional-sync.test.ts → full-sync.test.ts"
fi

# 5. github-bidirectional.test.ts → github-full-sync.test.ts
if [ -f "tests/e2e/sync/github-bidirectional.test.ts" ]; then
  git mv "tests/e2e/sync/github-bidirectional.test.ts" \
         "tests/e2e/sync/github-full-sync.test.ts"
  echo "   ✅ Renamed: github-bidirectional.test.ts → github-full-sync.test.ts"
fi

echo ""
echo "📋 Renaming script files..."

# Script rename
if [ -f "scripts/run-jira-bidirectional-sync.sh" ]; then
  git mv "scripts/run-jira-bidirectional-sync.sh" \
         "scripts/run-jira-full-sync.sh"
  echo "   ✅ Renamed: run-jira-bidirectional-sync.sh → run-jira-full-sync.sh"
fi

echo ""
echo "✅ File renames complete!"
echo ""
echo "📝 Note: Legacy implementation files kept with deprecation notices:"
echo "   - plugins/specweave-github/lib/github-sync-bidirectional.ts (DEPRECATED)"
echo "   - src/core/sync/bidirectional-engine.ts (DEPRECATED)"
echo ""
