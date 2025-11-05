#!/bin/bash

# SpecWeave Smoke Test
# Tests critical paths in <2 minutes
# Run: npm run test:smoke

set -e  # Exit on any error

echo "🚀 SpecWeave Smoke Test Suite"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
test_command() {
  local test_name="$1"
  local command="$2"

  echo -n "Testing: $test_name... "

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Create temp directory for tests
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "📦 Test 1: Package Build"
echo "------------------------"
test_command "TypeScript compilation" "cd $OLDPWD && npm run build"
echo ""

echo "📂 Test 2: Init Command"
echo "------------------------"
test_command "specweave init creates .specweave/" "node $OLDPWD/bin/specweave.js init --adapter=claude --language=en --non-interactive && test -d .specweave"
test_command ".specweave/config.json exists" "test -f .specweave/config.json"
test_command ".specweave/increments/ exists" "test -d .specweave/increments"
test_command ".specweave/docs/ exists" "test -d .specweave/docs"
echo ""

echo "🔌 Test 3: Plugin Structure"
echo "----------------------------"
test_command "plugins/specweave/ exists" "test -d $OLDPWD/plugins/specweave"
test_command "plugins/specweave/skills/ exists" "test -d $OLDPWD/plugins/specweave/skills"
test_command "plugins/specweave/agents/ exists" "test -d $OLDPWD/plugins/specweave/agents"
test_command "plugins/specweave/commands/ exists" "test -d $OLDPWD/plugins/specweave/commands"
echo ""

echo "📋 Test 4: Core Plugin Components"
echo "----------------------------------"
test_command "increment-planner skill exists" "test -f $OLDPWD/plugins/specweave/skills/increment-planner/SKILL.md"
test_command "PM agent exists" "test -f $OLDPWD/plugins/specweave/agents/pm/AGENT.md"
test_command "increment command exists" "test -f $OLDPWD/plugins/specweave/commands/specweave-increment.md"
test_command "post-task-completion hook exists" "test -f $OLDPWD/plugins/specweave/hooks/post-task-completion.sh"
echo ""

echo "🔧 Test 5: Configuration"
echo "------------------------"
test_command "config.json is valid JSON" "cat .specweave/config.json | node -e 'JSON.parse(require(\"fs\").readFileSync(0))'"
test_command "config has project section" "cat .specweave/config.json | grep -q '\"project\"'"
test_command "config has hooks section" "cat .specweave/config.json | grep -q '\"hooks\"'"
echo ""

echo "📚 Test 6: Living Docs Structure"
echo "---------------------------------"
test_command ".specweave/docs/internal/ exists" "test -d .specweave/docs/internal"
test_command ".specweave/docs/internal/specs/ exists" "test -d .specweave/docs/internal/specs"
test_command ".specweave/docs/internal/architecture/ exists" "test -d .specweave/docs/internal/architecture"
echo ""

# Cleanup
cd "$OLDPWD"
rm -rf "$TEST_DIR"

echo ""
echo "=============================="
echo "📊 Test Results"
echo "=============================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
fi
