#!/bin/bash
# interview-enforcement-guard.test.sh - Tests for interview enforcement guard
#
# Run: bash tests/unit/hooks/interview-enforcement-guard.test.sh

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
HOOK_SCRIPT="$PROJECT_ROOT/plugins/specweave/hooks/v2/guards/interview-enforcement-guard.sh"

# Create temp test directory
TEST_TMP=$(mktemp -d)
cleanup() {
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

# Test helper functions
pass() {
  echo -e "${GREEN}PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

# Helper: Create a config file with specific settings
create_config() {
  local enabled="${1:-true}"
  local enforcement="${2:-strict}"
  mkdir -p "$TEST_TMP/.specweave"
  cat > "$TEST_TMP/.specweave/config.json" << EOF
{
  "planning": {
    "deepInterview": {
      "enabled": $enabled,
      "enforcement": "$enforcement",
      "categories": ["architecture","integrations","ui-ux","performance","security","edge-cases"]
    }
  }
}
EOF
}

# Helper: Create interview state file
create_interview_state() {
  local increment_id="$1"
  shift
  local categories=("$@")

  mkdir -p "$TEST_TMP/.specweave/state"
  local covered="{}"
  for cat in "${categories[@]}"; do
    covered=$(echo "$covered" | jq --arg c "$cat" '.[$c] = {"coveredAt": "2026-01-01T00:00:00Z", "summary": "covered"}')
  done

  cat > "$TEST_TMP/.specweave/state/interview-${increment_id}.json" << EOF
{
  "incrementId": "$increment_id",
  "startedAt": "2026-01-01T00:00:00Z",
  "coveredCategories": $covered
}
EOF
}

# Helper: Run the guard with a mock input
run_guard() {
  local tool_name="${1:-Write}"
  local file_path="$2"
  local content="${3:-# Test content}"

  local input
  input=$(jq -n \
    --arg tool "$tool_name" \
    --arg path "$file_path" \
    --arg content "$content" \
    '{tool_name: $tool, tool_input: {file_path: $path, content: $content}}')

  echo "$input" | bash "$HOOK_SCRIPT" 2>/dev/null
}

# ============================================================================
# TEST CASES
# ============================================================================

echo ""
echo "Interview Enforcement Guard Tests"
echo "=================================="
echo ""

# Test 1: Hook exists
test_hook_exists() {
  if [[ -f "$HOOK_SCRIPT" ]]; then
    pass "Hook script exists at $HOOK_SCRIPT"
  else
    fail "Hook script not found at $HOOK_SCRIPT"
  fi
}
test_hook_exists

# Test 2: Allow non-Write operations
test_allow_non_write() {
  create_config true strict
  local output
  output=$(run_guard "Edit" "$TEST_TMP/.specweave/increments/0001-test/spec.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows non-Write operations (Edit)"
  else
    fail "Should allow non-Write operations, got: $output"
  fi
}
test_allow_non_write

# Test 3: Allow writes to non-spec.md files
test_allow_non_spec_file() {
  create_config true strict
  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0001-test/plan.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows writes to non-spec.md files"
  else
    fail "Should allow writes to non-spec.md files, got: $output"
  fi
}
test_allow_non_spec_file

# Test 4: Allow when deep interview is disabled
test_allow_when_disabled() {
  create_config false strict
  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0001-test/spec.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows spec.md writes when deep interview is disabled"
  else
    fail "Should allow when deep interview is disabled, got: $output"
  fi
}
test_allow_when_disabled

# Test 5: Allow when enforcement is advisory (not strict)
test_allow_advisory_mode() {
  create_config true advisory
  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0001-test/spec.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows spec.md writes when enforcement is advisory"
  else
    fail "Should allow when enforcement is advisory, got: $output"
  fi
}
test_allow_advisory_mode

# Test 6: Block when no interview state file exists
test_block_no_state_file() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0001-test"
  # No interview state file created

  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0001-test/spec.md")

  if echo "$output" | grep -q '"decision":"block"'; then
    pass "Blocks spec.md when no interview state file exists"
  else
    fail "Should block when no interview state file, got: $output"
  fi
}
test_block_no_state_file

# Test 7: Block when only some categories are covered
test_block_partial_coverage() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0002-test"
  create_interview_state "0002-test" "architecture" "integrations"

  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0002-test/spec.md")

  if echo "$output" | grep -q '"decision":"block"'; then
    pass "Blocks spec.md when only some categories are covered"
  else
    fail "Should block when categories incomplete, got: $output"
  fi
}
test_block_partial_coverage

# Test 8: Allow when all categories are covered
test_allow_full_coverage() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0003-test"
  create_interview_state "0003-test" "architecture" "integrations" "ui-ux" "performance" "security" "edge-cases"

  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0003-test/spec.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows spec.md when all categories are covered"
  else
    fail "Should allow when all categories covered, got: $output"
  fi
}
test_allow_full_coverage

# Test 9: Allow template creation (contains template markers)
test_allow_template() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0004-test"
  # No interview state, but content has template markers

  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0004-test/spec.md" "# Template\n[Story Title]\n[user type]")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows template spec.md creation (has template markers)"
  else
    fail "Should allow template creation, got: $output"
  fi
}
test_allow_template

# Test 10: Block message mentions missing categories
test_block_shows_missing() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0005-test"
  create_interview_state "0005-test" "architecture"

  local output
  output=$(run_guard "Write" "$TEST_TMP/.specweave/increments/0005-test/spec.md")

  if echo "$output" | grep -q "integrations" && echo "$output" | grep -q '"decision":"block"'; then
    pass "Block message lists missing categories"
  else
    fail "Block message should list missing categories, got: $output"
  fi
}
test_block_shows_missing

# Test 11: Allow files outside increment folders
test_allow_non_increment_path() {
  create_config true strict
  local output
  output=$(run_guard "Write" "/some/other/path/spec.md")

  if echo "$output" | grep -q '"decision":"allow"'; then
    pass "Allows spec.md writes outside increment folders"
  else
    fail "Should allow writes outside increment folders, got: $output"
  fi
}
test_allow_non_increment_path

# Test 12: Always exits 0 (guard should never crash the tool)
test_always_exit_zero() {
  create_config true strict
  mkdir -p "$TEST_TMP/.specweave/increments/0006-test"
  # No interview state — should block but still exit 0

  run_guard "Write" "$TEST_TMP/.specweave/increments/0006-test/spec.md" > /dev/null 2>&1
  local exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    pass "Always exits 0 (even when blocking)"
  else
    fail "Should always exit 0, got exit code: $exit_code"
  fi
}
test_always_exit_zero

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=================================="
echo "Test Results"
echo "=================================="
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
