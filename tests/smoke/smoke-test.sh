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

# Save project root before changing directories
PROJECT_ROOT=$(pwd)

# Create temp directory for tests
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "📦 Test 1: Package Build"
echo "------------------------"
test_command "TypeScript compilation" "cd $PROJECT_ROOT && npm run build"
echo ""

echo "📂 Test 2: CLI Binary"
echo "------------------------"
# Set CI env var to trigger non-interactive mode
export CI=true
test_command "specweave init creates .specweave/" "node $OLDPWD/bin/specweave.js init . --adapter=claude --language=en && test -d .specweave"
test_command ".specweave/config.json exists" "test -f .specweave/config.json"
test_command ".specweave/increments/ exists" "test -d .specweave/increments"
test_command ".specweave/docs/ exists" "test -d .specweave/docs"
echo ""

echo "🔌 Test 3: Plugin Structure"
echo "----------------------------"
test_command "plugins/specweave/ exists" "test -d $PROJECT_ROOT/plugins/specweave"
test_command "plugins/specweave/skills/ exists" "test -d $PROJECT_ROOT/plugins/specweave/skills"
test_command "plugins/specweave/agents/ exists" "test -d $PROJECT_ROOT/plugins/specweave/agents"
test_command "plugins/specweave/commands/ exists" "test -d $PROJECT_ROOT/plugins/specweave/commands"
echo ""

echo "📋 Test 4: Core Plugin Components"
echo "----------------------------------"
test_command "increment-planner skill exists" "test -f $PROJECT_ROOT/plugins/specweave/skills/increment-planner/SKILL.md"
test_command "PM agent exists" "test -f $PROJECT_ROOT/plugins/specweave/agents/pm/AGENT.md"
test_command "increment command exists" "test -f $PROJECT_ROOT/plugins/specweave/commands/specweave-increment.md"
test_command "post-task-completion hook exists" "test -f $PROJECT_ROOT/plugins/specweave/hooks/post-task-completion.sh"
echo ""

echo "🔧 Test 5: Templates"
echo "------------------------"
test_command "CLAUDE.md.template exists" "test -f $PROJECT_ROOT/src/templates/CLAUDE.md.template"
test_command "README.md.template exists" "test -f $PROJECT_ROOT/src/templates/README.md.template"
test_command ".gitignore.template exists" "test -f $PROJECT_ROOT/src/templates/.gitignore.template"
test_command "tasks.md.template exists" "test -f $PROJECT_ROOT/src/templates/tasks.md.template"
echo ""

echo "📚 Test 6: Package Structure"
echo "---------------------------------"
test_command "package.json exists" "test -f $PROJECT_ROOT/package.json"
test_command "dist/ directory exists" "test -d $PROJECT_ROOT/dist"
test_command "dist/cli directory exists" "test -d $PROJECT_ROOT/dist/cli"
echo ""

# Cleanup
cd "$PROJECT_ROOT"
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
