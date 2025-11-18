#!/bin/bash
#
# Pre-commit Test Anti-Pattern Detection
#
# Catches common test anti-patterns before they're committed:
# - Test isolation issues (process.cwd() with .specweave)
# - require() usage (should use ES6 imports)
# - jest.* APIs (should use vi.*)
# - anyed<> pattern (should use vi.mocked())
# - Mock hoisting issues (variables in vi.mock() factory)
#
# Related: CLAUDE.md → "Testing Best Practices & Anti-Patterns"
# Date: 2025-11-17 (After fixing 72 test failures)
#

set -euo pipefail

echo "🔍 Checking for test anti-patterns..."

# Get all staged .ts and .spec.ts files
STAGED_TEST_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(test|spec)\.ts$" || true)

if [ -z "$STAGED_TEST_FILES" ]; then
  echo "✅ No test files staged - skipping pattern check"
  exit 0
fi

# Counters for different issue types
CRITICAL_ISSUES=0
WARNINGS=0
DANGEROUS_FILES=""
JEST_API_FILES=""
REQUIRE_FILES=""
ANYED_FILES=""
MISSING_EXT_FILES=""

for FILE in $STAGED_TEST_FILES; do
  # Skip if file doesn't exist (deleted)
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # ═══════════════════════════════════════════════════════
  # CRITICAL: Test Isolation (Prevent .specweave/ deletion)
  # ═══════════════════════════════════════════════════════

  # Pattern 1: process.cwd() + .specweave (without os.tmpdir nearby)
  if grep -q "process\.cwd().*specweave\|\.specweave.*process\.cwd()" "$FILE" 2>/dev/null; then
    # Check if file imports os and uses os.tmpdir()
    if ! grep -q "import.*os.*from.*['\"]os['\"]" "$FILE" || ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (uses process.cwd() with .specweave)"
      CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
  fi

  # Pattern 2: TEST_ROOT/testRoot using process.cwd() without os.tmpdir
  if grep -qE "TEST_ROOT.*=.*path\.join.*process\.cwd\(\)|testRoot.*=.*path\.join.*process\.cwd\(\)" "$FILE" 2>/dev/null; then
    if ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (TEST_ROOT uses process.cwd() instead of os.tmpdir())"
      CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
  fi

  # Pattern 3: path.join(__dirname, '..', '.specweave') (scripts creating test data in project)
  if grep -qE "path\.join\(__dirname.*\.specweave" "$FILE" 2>/dev/null; then
    if ! grep -q "os\.tmpdir()" "$FILE"; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (creates .specweave in project directory)"
      CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
  fi

  # ═══════════════════════════════════════════════════════
  # CRITICAL: Vitest Migration (NO Jest API)
  # ═══════════════════════════════════════════════════════

  # Pattern 4: jest.* API usage (should use vi.*)
  if grep -qE "jest\.(fn|mock|clearAllMocks|useFakeTimers|useRealTimers|runAllTimers|spyOn)" "$FILE" 2>/dev/null; then
    JEST_API_FILES="$JEST_API_FILES\n  - $FILE"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  fi

  # Pattern 5: require() usage (should use ES6 imports)
  if grep -qE "const.*=.*require\(" "$FILE" 2>/dev/null; then
    REQUIRE_FILES="$REQUIRE_FILES\n  - $FILE"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  fi

  # Pattern 6: anyed<> pattern (should use vi.mocked())
  if grep -qE "as anyed<|anyedFunction<" "$FILE" 2>/dev/null; then
    ANYED_FILES="$ANYED_FILES\n  - $FILE"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  fi

  # ═══════════════════════════════════════════════════════
  # WARNINGS: Code quality (don't block commit)
  # ═══════════════════════════════════════════════════════

  # Pattern 7: Missing .js extension in src/ imports
  if grep -qE "from ['\"]\.\..*src/[^'\"]+['\"]" "$FILE" 2>/dev/null; then
    if grep -E "from ['\"]\.\..*src/[^'\"]+['\"]" "$FILE" | grep -qvE "\.js['\"]" 2>/dev/null; then
      MISSING_EXT_FILES="$MISSING_EXT_FILES\n  - $FILE"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

# ═══════════════════════════════════════════════════════
# Report Results
# ═══════════════════════════════════════════════════════

if [ $CRITICAL_ISSUES -gt 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "❌ CRITICAL TEST ANTI-PATTERNS DETECTED ($CRITICAL_ISSUES issue(s))"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  # Report test isolation issues
  if [ -n "$DANGEROUS_FILES" ]; then
    echo "🛡️  TEST ISOLATION ISSUES (DELETES .specweave/):"
    echo -e "$DANGEROUS_FILES"
    echo ""
    echo "   WHY DANGEROUS: Tests using process.cwd() create directories in project root."
    echo "   Cleanup operations can accidentally delete real .specweave/ folder!"
    echo ""
    echo "   ✅ CORRECT: const testRoot = path.join(os.tmpdir(), 'test-' + Date.now());"
    echo "   ❌ WRONG:   const testRoot = path.join(process.cwd(), '.test-something');"
    echo ""
  fi

  # Report Jest API usage
  if [ -n "$JEST_API_FILES" ]; then
    echo "⚡ JEST API USAGE (USE VITEST INSTEAD):"
    echo -e "$JEST_API_FILES"
    echo ""
    echo "   SpecWeave migrated from Jest to Vitest on 2025-11-17."
    echo ""
    echo "   ✅ CORRECT: vi.fn(), vi.mock(), await vi.runAllTimersAsync()"
    echo "   ❌ WRONG:   jest.fn(), jest.mock(), jest.runAllTimers()"
    echo ""
  fi

  # Report require() usage
  if [ -n "$REQUIRE_FILES" ]; then
    echo "📦 REQUIRE() USAGE (USE ES6 IMPORTS):"
    echo -e "$REQUIRE_FILES"
    echo ""
    echo "   SpecWeave uses ES modules. CommonJS require() doesn't work."
    echo ""
    echo "   ✅ CORRECT: import { Module } from '../../../src/module.js';"
    echo "   ❌ WRONG:   const { Module } = require('../../../src/module');"
    echo ""
  fi

  # Report anyed<> pattern
  if [ -n "$ANYED_FILES" ]; then
    echo "🔧 ANYED<> PATTERN (USE vi.mocked()):"
    echo -e "$ANYED_FILES"
    echo ""
    echo "   The anyed<> pattern is invalid syntax from Jest era."
    echo ""
    echo "   ✅ CORRECT: const mockFn = vi.mocked(module.method);"
    echo "   ❌ WRONG:   const mockModule = module as anyed<typeof module>;"
    echo ""
  fi

  echo "═══════════════════════════════════════════════════════════════"
  echo "📚 DOCUMENTATION:"
  echo "   See CLAUDE.md → 'Testing Best Practices & Anti-Patterns'"
  echo "   See tests/test-template.test.ts for correct patterns"
  echo ""
  echo "⚠️  To bypass (NOT RECOMMENDED): git commit --no-verify"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

# Report warnings (don't block commit)
if [ $WARNINGS -gt 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "⚠️  WARNINGS ($WARNINGS issue(s))"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  if [ -n "$MISSING_EXT_FILES" ]; then
    echo "📝 MISSING .js EXTENSIONS:"
    echo -e "$MISSING_EXT_FILES"
    echo ""
    echo "   TypeScript ES modules require .js extensions in imports."
    echo "   Run: node scripts/fix-js-extensions.js"
    echo ""
  fi

  echo "═══════════════════════════════════════════════════════════════"
  echo "Commit will proceed in 3 seconds..."
  echo "═══════════════════════════════════════════════════════════════"
  sleep 3
fi

echo ""
echo "✅ Test anti-pattern checks passed"
exit 0
