#!/bin/bash
# Pre-commit hook: Check for dangerous test patterns
# Prevents tests from using process.cwd() with .specweave paths

set -euo pipefail

echo "🔍 Checking for dangerous test patterns..."

# Get all staged .ts and .spec.ts files
STAGED_TEST_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(test|spec)\.ts$" || true)

if [ -z "$STAGED_TEST_FILES" ]; then
  echo "✅ No test files staged - skipping pattern check"
  exit 0
fi

DANGEROUS_FILES=""

for FILE in $STAGED_TEST_FILES; do
  # Skip if file doesn't exist (deleted)
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Pattern 1: process.cwd() + .specweave (without os.tmpdir nearby)
  if grep -q "process\.cwd().*specweave\|\.specweave.*process\.cwd()" "$FILE" 2>/dev/null; then
    # Check if file imports os and uses os.tmpdir()
    if ! grep -q "import.*os.*from.*['\"]os['\"]" "$FILE" || ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (uses process.cwd() with .specweave)"
    fi
  fi

  # Pattern 2: TEST_ROOT/testRoot using process.cwd() without os.tmpdir
  if grep -qE "TEST_ROOT.*=.*path\.join.*process\.cwd\(\)|testRoot.*=.*path\.join.*process\.cwd\(\)" "$FILE" 2>/dev/null; then
    if ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (TEST_ROOT uses process.cwd() instead of os.tmpdir())"
    fi
  fi

  # Pattern 3: path.join(__dirname, '..', '.specweave') (scripts creating test data in project)
  if grep -qE "path\.join\(__dirname.*\.specweave" "$FILE" 2>/dev/null; then
    if ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (creates .specweave in project directory)"
    fi
  fi
done

if [ -n "$DANGEROUS_FILES" ]; then
  echo ""
  echo "❌ DANGEROUS TEST PATTERNS DETECTED:"
  echo -e "$DANGEROUS_FILES"
  echo ""
  echo "🛡️  WHY THIS IS DANGEROUS:"
  echo "   Tests using process.cwd() create directories in project root."
  echo "   Cleanup operations (fs.rm, fs.rmSync) can accidentally delete"
  echo "   the real .specweave/ folder containing all your work!"
  echo ""
  echo "✅ CORRECT PATTERN:"
  echo "   import * as os from 'os';"
  echo "   const TEST_ROOT = path.join(os.tmpdir(), 'test-name-' + Date.now());"
  echo ""
  echo "❌ DO NOT USE:"
  echo "   const TEST_ROOT = path.join(process.cwd(), '.test-something');"
  echo "   const testPath = path.join(__dirname, '..', '.specweave', 'increments');"
  echo ""
  echo "📚 See CLAUDE.md section: 'Test Isolation' for details"
  echo ""
  exit 1
fi

echo "✅ No dangerous test patterns found"
exit 0
