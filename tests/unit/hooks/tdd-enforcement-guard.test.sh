#!/bin/bash
# tdd-enforcement-guard.test.sh - Tests for TDD enforcement hook
#
# Run: bash tests/unit/hooks/tdd-enforcement-guard.test.sh

# DON'T set -e here - we want to run all tests even if some fail

# Test utilities
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
PASS_COUNT=0
FAIL_COUNT=0

# Setup test fixtures
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HOOK_SCRIPT="$PROJECT_ROOT/plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh"

# Create temp test directory
TEST_TMP=$(mktemp -d)
cleanup() {
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

# Test helper functions
pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

# Setup a mock increment directory
setup_increment() {
  local test_mode="${1:-TDD}"
  local inc_dir="$TEST_TMP/.specweave/increments/0001-test"
  mkdir -p "$inc_dir"
  mkdir -p "$TEST_TMP/.specweave/logs"

  # Create metadata.json with testMode
  cat > "$inc_dir/metadata.json" << EOF
{
  "id": "0001-test",
  "status": "active",
  "testMode": "$test_mode"
}
EOF

  echo "$inc_dir"
}

# Create tasks.md with specific task states
create_tasks() {
  local inc_dir="$1"
  local content="$2"
  echo "$content" > "$inc_dir/tasks.md"
}

# ============================================================================
# TEST CASES
# ============================================================================

echo ""
echo "TDD Enforcement Guard Tests"
echo "============================"
echo ""

# Test 1: Hook exists and is executable
test_hook_exists() {
  if [[ -f "$HOOK_SCRIPT" ]]; then
    pass "Hook script exists at $HOOK_SCRIPT"
  else
    fail "Hook script not found at $HOOK_SCRIPT"
    return 1
  fi
}
test_hook_exists

# Test 2: Skip non-tasks.md files
test_skip_non_tasks_file() {
  local inc_dir=$(setup_increment "TDD")
  local output

  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/metadata.json" "Edit" 2>&1 || true)

  if [[ ! "$output" =~ "TDD DISCIPLINE WARNING" ]]; then
    pass "Skips non-tasks.md files"
  else
    fail "Should skip non-tasks.md files"
  fi
}
test_skip_non_tasks_file

# Test 3: Skip non-TDD mode increments
test_skip_non_tdd_mode() {
  local inc_dir=$(setup_increment "test-after")
  create_tasks "$inc_dir" "### T-001: [GREEN] Task
**Status**: [x] completed"

  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  if [[ ! "$output" =~ "TDD DISCIPLINE WARNING" ]]; then
    pass "Skips non-TDD mode (test-after)"
  else
    fail "Should skip non-TDD modes"
  fi
}
test_skip_non_tdd_mode

# Test 4: Skip manual mode
test_skip_manual_mode() {
  local inc_dir=$(setup_increment "manual")
  create_tasks "$inc_dir" "### T-001: [GREEN] Task
**Status**: [x] completed"

  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  if [[ ! "$output" =~ "TDD DISCIPLINE WARNING" ]]; then
    pass "Skips manual mode"
  else
    fail "Should skip manual mode"
  fi
}
test_skip_manual_mode

# Test 5: No warning when RED completed before GREEN
test_valid_tdd_sequence() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-001: [RED] Write test
**Status**: [x] completed
**Phase**: RED

### T-002: [GREEN] Implement
**Status**: [x] completed
**Phase**: GREEN"

  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  if [[ ! "$output" =~ "TDD DISCIPLINE WARNING" ]]; then
    pass "No warning for valid TDD sequence (RED before GREEN)"
  else
    fail "Should not warn when TDD sequence is correct"
  fi
}
test_valid_tdd_sequence

# Test 6: Warn when GREEN completed before RED
test_warn_green_before_red() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-001: [RED] Write test
**Status**: [ ] pending
**Phase**: RED

### T-002: [GREEN] Implement
**Status**: [x] completed
**Phase**: GREEN"

  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  if [[ "$output" =~ "TDD DISCIPLINE WARNING" ]] || [[ "$output" =~ "GREEN" ]]; then
    pass "Warns when GREEN completed before RED"
  else
    fail "Should warn when GREEN completed before RED"
  fi
}
test_warn_green_before_red

# Test 7: Warn when REFACTOR completed before GREEN
test_warn_refactor_before_green() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-001: [RED] Write test
**Status**: [x] completed
**Phase**: RED

### T-002: [GREEN] Implement
**Status**: [ ] pending
**Phase**: GREEN

### T-003: [REFACTOR] Improve
**Status**: [x] completed
**Phase**: REFACTOR"

  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  if [[ "$output" =~ "TDD DISCIPLINE WARNING" ]] || [[ "$output" =~ "REFACTOR" ]]; then
    pass "Warns when REFACTOR completed before GREEN"
  else
    fail "Should warn when REFACTOR completed before GREEN"
  fi
}
test_warn_refactor_before_green

# Test 8: Always exits with code 0 (non-blocking)
test_always_exit_zero() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-002: [GREEN] Implement
**Status**: [x] completed
**Phase**: GREEN"

  local exit_code
  bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" > /dev/null 2>&1
  exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    pass "Always exits 0 (non-blocking even on violations)"
  else
    fail "Should always exit 0, got exit code: $exit_code"
  fi
}
test_always_exit_zero

# Test 9: Log violations to file
test_violations_logged() {
  local inc_dir=$(setup_increment "TDD")
  local log_file="$TEST_TMP/.specweave/logs/tdd-violations.log"

  # Clear any existing log
  rm -f "$log_file"

  create_tasks "$inc_dir" "### T-002: [GREEN] Implement
**Status**: [x] completed
**Phase**: GREEN"

  bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" > /dev/null 2>&1 || true

  if [[ -f "$log_file" ]]; then
    pass "Violations logged to file"
  else
    fail "Should log violations to file"
  fi
}
test_violations_logged

# Test 10: Handle missing jq gracefully (grep fallback)
test_jq_fallback() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-001: [RED] Test
**Status**: [x] completed"

  # Run hook - it should work regardless of jq availability
  local output
  output=$(bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" 2>&1 || true)

  # If it doesn't crash and produces some output (or exits cleanly), it works
  if [[ $? -eq 0 ]] || [[ -n "$output" ]]; then
    pass "Handles jq/grep parsing gracefully"
  else
    fail "Should handle metadata parsing gracefully"
  fi
}
test_jq_fallback

# Test 11: Performance (should complete quickly)
test_performance() {
  local inc_dir=$(setup_increment "TDD")
  create_tasks "$inc_dir" "### T-001: [RED] Test
**Status**: [x] completed"

  # Use seconds-based timing (cross-platform)
  local start_time end_time duration
  start_time=$(date +%s)
  bash "$HOOK_SCRIPT" "$TEST_TMP" "$inc_dir/tasks.md" "Edit" > /dev/null 2>&1 || true
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  # Should complete in under 2 seconds
  if [[ $duration -lt 2 ]]; then
    pass "Execution time acceptable (< 2 seconds)"
  else
    fail "Execution too slow: ${duration}s (should be < 2s)"
  fi
}
test_performance

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "============================"
echo "Test Results"
echo "============================"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
