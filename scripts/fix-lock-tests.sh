#!/usr/bin/env bash
# Fix lock-related tests to force enable locks during testing

set -e

echo "Fixing lock-related test files..."

# List of test files to fix
TEST_FILES=(
  "tests/unit/lock-manager.test.ts"
  "tests/unit/lock-staleness.test.ts"
  "tests/unit/session-registry-atomicity.test.ts"
  "tests/unit/staleness-detection.test.ts"
)

for file in "${TEST_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "⚠️  File not found: $file"
    continue
  fi

  echo "📝 Fixing: $file"

  # Check if already has the import
  if grep -q "forceEnableLocksForTest" "$file"; then
    echo "  ✓ Already fixed"
    continue
  fi

  # Add import at the top (after other imports)
  sed -i '' '/^import.*from.*vitest/a\
import { forceEnableLocksForTest, restoreEnvironment } from '\''../helpers/force-enable-locks.js'\'';
' "$file"

  # Add originalEnv variable declaration
  sed -i '' '/let testDir: string;/a\
  let originalEnv: ReturnType<typeof forceEnableLocksForTest>;
' "$file"

  # Add forceEnableLocksForTest() call in beforeEach
  sed -i '' '/beforeEach.*{/a\
    originalEnv = forceEnableLocksForTest();
' "$file"

  # Add restoreEnvironment() call in afterEach
  sed -i '' '/afterEach.*{/a\
    restoreEnvironment(originalEnv);
' "$file"

  echo "  ✅ Fixed"
done

echo ""
echo "✅ All test files fixed!"
echo ""
echo "Next step: Run tests"
echo "  npm run test:unit"
