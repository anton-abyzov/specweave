#!/bin/bash

###############################################################################
# Run All Generated Integration Tests
#
# Executes all auto-generated tests in tests/integration/*/*.test.ts
# Tracks pass/fail statistics and generates summary report
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Running All Generated Integration Tests             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Initialize counters
total_skills=0
passed_skills=0
failed_skills=0
failed_tests=()

# Find all auto-generated test files (skill-name/skill-name.test.ts pattern)
# Excludes custom integration tests like jira-bidirectional-sync.test.ts
test_files=$(find tests/integration -type f -name "*.test.ts" | grep -E "/([^/]+)/\1\.test\.ts$" | sort)

if [ -z "$test_files" ]; then
  echo "❌ No test files found in tests/integration/"
  exit 1
fi

# Count total test files
total_skills=$(echo "$test_files" | wc -l | tr -d ' ')

echo "📦 Found $total_skills test files"
echo ""

# Run each test
for test_file in $test_files; do
  skill_name=$(basename "$(dirname "$test_file")")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Testing: $skill_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Run test and capture output
  if npx ts-node "$test_file" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}: $skill_name"
    ((passed_skills++))
  else
    echo -e "${RED}❌ FAILED${NC}: $skill_name"
    ((failed_skills++))
    failed_tests+=("$skill_name")
  fi

  echo ""
done

# Print summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Results Summary                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Skills Tested: $total_skills"
echo -e "${GREEN}✅ Passed: $passed_skills${NC}"
echo -e "${RED}❌ Failed: $failed_skills${NC}"
echo ""

if [ $failed_skills -gt 0 ]; then
  echo "Failed tests:"
  for test in "${failed_tests[@]}"; do
    echo "  - $test"
  done
  echo ""
  exit 1
else
  echo "🎉 All tests passed!"
  exit 0
fi
