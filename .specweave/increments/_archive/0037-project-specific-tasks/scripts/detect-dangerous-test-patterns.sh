#!/bin/bash
#
# Detect Dangerous Test Patterns - Comprehensive Scanner
#
# This script detects ALL patterns that could lead to .specweave/ deletion
# in test files. It's designed to be run as a pre-commit hook or CI check.
#
# DANGEROUS PATTERNS:
# 1. process.cwd() + .specweave path (creates dirs in project root)
# 2. __dirname + .specweave path (creates dirs in project root)
# 3. Hardcoded paths like '.test-*/.specweave' in project root
# 4. Missing os.tmpdir() usage for test directories
#
# EXIT CODES:
# 0 = All tests safe
# 1 = Dangerous patterns found

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Scanning all test files for dangerous .specweave/ deletion patterns..."
echo ""

DANGEROUS_FOUND=0

# Pattern 1: process.cwd() used with .specweave
echo "📋 Pattern 1: Checking for process.cwd() + .specweave..."
if grep -r "process\.cwd()" tests/ --include="*.ts" | grep -v "node_modules" | grep "\.specweave" > /dev/null 2>&1; then
  echo -e "${RED}❌ DANGER: Found process.cwd() used with .specweave paths${NC}"
  echo ""
  grep -rn "process\.cwd()" tests/ --include="*.ts" | grep "\.specweave" | head -20
  echo ""
  DANGEROUS_FOUND=1
else
  echo -e "${GREEN}✅ Safe: No dangerous process.cwd() + .specweave patterns${NC}"
fi
echo ""

# Pattern 2: __dirname used with .specweave
echo "📋 Pattern 2: Checking for __dirname + .specweave..."
if grep -r "__dirname" tests/ --include="*.ts" | grep -v "node_modules" | grep "\.specweave" > /dev/null 2>&1; then
  echo -e "${RED}❌ DANGER: Found __dirname used with .specweave paths${NC}"
  echo ""
  grep -rn "__dirname" tests/ --include="*.ts" | grep "\.specweave" | head -20
  echo ""
  DANGEROUS_FOUND=1
else
  echo -e "${GREEN}✅ Safe: No dangerous __dirname + .specweave patterns${NC}"
fi
echo ""

# Pattern 3: Hardcoded test directories in project root
echo "📋 Pattern 3: Checking for hardcoded test directories (.test-*, test-*, etc.)..."
if grep -r "\.test-\|'test-\|\"test-" tests/ --include="*.ts" | grep -v "node_modules" | grep -v "test-utils" | grep -v "test.ts" | grep -v "\.test\." | grep -v "/test-" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  WARNING: Found potential hardcoded test directory paths${NC}"
  echo "(Manual review required - some may be false positives)"
  echo ""
  grep -rn "\.test-\|'test-\|\"test-" tests/ --include="*.ts" | grep -v "node_modules" | grep -v "test-utils" | grep -v "test.ts" | grep -v "\.test\." | grep -v "/test-" | head -20
  echo ""
  # Don't fail for this pattern - requires manual review
fi
echo ""

# Pattern 4: Tests creating .specweave but NOT using os.tmpdir()
echo "📋 Pattern 4: Checking for .specweave creation without os.tmpdir()..."
FILES_CREATING_SPECWEAVE=$(grep -rl "mkdir.*\.specweave" tests/ --include="*.ts" | grep -v "node_modules")

if [ -n "$FILES_CREATING_SPECWEAVE" ]; then
  echo "Found files creating .specweave directories:"
  for file in $FILES_CREATING_SPECWEAVE; do
    # Check if file imports os.tmpdir or uses tmpdir()
    if ! grep -q "os\.tmpdir\|tmpdir()" "$file"; then
      # Also check if it uses test helpers (which are safe)
      if ! grep -q "createTestDir\|createIsolatedTestDir" "$file"; then
        echo -e "${RED}❌ DANGER: $file creates .specweave WITHOUT os.tmpdir()${NC}"
        DANGEROUS_FOUND=1
      fi
    fi
  done
fi

if [ $DANGEROUS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ Safe: All .specweave creation uses os.tmpdir()${NC}"
fi
echo ""

# Pattern 5: Tests with fs.rm recursive but no tmpdir
echo "📋 Pattern 5: Checking for recursive deletions without tmpdir isolation..."
FILES_WITH_RM=$(grep -rl "fs\.rm.*recursive.*true" tests/ --include="*.ts" | grep -v "node_modules")

if [ -n "$FILES_WITH_RM" ]; then
  for file in $FILES_WITH_RM; do
    # Check if file uses tmpdir or test helpers
    if ! grep -q "os\.tmpdir\|tmpdir()\|createTestDir\|createIsolatedTestDir" "$file"; then
      echo -e "${RED}❌ DANGER: $file uses recursive deletion WITHOUT tmpdir isolation${NC}"
      echo "  File: $file"
      DANGEROUS_FOUND=1
    fi
  done
fi

if [ $DANGEROUS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ Safe: All recursive deletions use tmpdir isolation${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $DANGEROUS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS SAFE!${NC}"
  echo ""
  echo "No dangerous patterns detected. All tests use proper isolation."
  exit 0
else
  echo -e "${RED}❌ DANGEROUS PATTERNS FOUND!${NC}"
  echo ""
  echo "Tests may delete project .specweave/ folder!"
  echo ""
  echo "REQUIRED FIXES:"
  echo "1. Replace process.cwd() with os.tmpdir()"
  echo "2. Use test helpers from tests/test-utils/isolated-test-dir.ts"
  echo "3. Add timestamp suffix to all test directories"
  echo ""
  echo "SAFE PATTERN:"
  echo "  const testRoot = path.join(os.tmpdir(), 'test-name-' + Date.now());"
  echo ""
  exit 1
fi
