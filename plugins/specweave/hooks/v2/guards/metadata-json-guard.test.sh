#!/bin/bash
# Comprehensive test suite for metadata-json-guard.sh
# Tests that spec.md creation is blocked when metadata.json is missing
#
# Usage: bash metadata-json-guard.test.sh
#
# v0.34.0 - Initial test suite

set -e

GUARD="$(dirname "$0")/metadata-json-guard.sh"
TEST_DIR=$(mktemp -d)
PASS=0
FAIL=0
TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Create test increment structure
setup_test_increment() {
  local with_metadata="$1"
  local increment_name="${2:-0001-test-feature}"

  mkdir -p "$TEST_DIR/.specweave/increments/$increment_name"

  if [ "$with_metadata" = "true" ]; then
    cat > "$TEST_DIR/.specweave/increments/$increment_name/metadata.json" << 'EOF'
{
  "id": "0001-test-feature",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-12-10T00:00:00Z",
  "lastActivity": "2025-12-10T00:00:00Z",
  "testMode": "TDD",
  "coverageTarget": 95,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
EOF
  fi
}

# Test helper: should block
test_should_block() {
  local name="$1"
  local file_path="$2"
  local content="$3"
  TOTAL=$((TOTAL + 1))

  # Build JSON input for the guard
  local json_input
  json_input=$(jq -n \
    --arg tool_name "Write" \
    --arg file_path "$file_path" \
    --arg content "$content" \
    '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: $content}}')

  result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "2" ]]; then
    echo -e "${GREEN}✓ BLOCKED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ NOT BLOCKED${NC}: $name"
    echo "  File: $file_path"
    echo "  Exit code: $exit_code (expected 2)"
    echo "  Output: $(echo "$result" | head -5)"
    FAIL=$((FAIL + 1))
  fi
}

# Test helper: should allow
test_should_allow() {
  local name="$1"
  local file_path="$2"
  local content="$3"
  TOTAL=$((TOTAL + 1))

  # Build JSON input for the guard
  local json_input
  json_input=$(jq -n \
    --arg tool_name "Write" \
    --arg file_path "$file_path" \
    --arg content "$content" \
    '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: $content}}')

  result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "0" ]]; then
    echo -e "${GREEN}✓ ALLOWED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ WRONGLY BLOCKED${NC}: $name"
    echo "  File: $file_path"
    echo "  Exit code: $exit_code (expected 0)"
    FAIL=$((FAIL + 1))
  fi
}

# Test non-Write tools (should always allow)
test_non_write_tool() {
  local name="$1"
  local tool_name="$2"
  TOTAL=$((TOTAL + 1))

  local json_input
  json_input=$(jq -n \
    --arg tool_name "$tool_name" \
    --arg file_path "$TEST_DIR/.specweave/increments/0001-test/spec.md" \
    '{tool_name: $tool_name, tool_input: {file_path: $file_path}}')

  result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "0" ]]; then
    echo -e "${GREEN}✓ ALLOWED (non-Write)${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ WRONGLY BLOCKED${NC}: $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  METADATA JSON GUARD - COMPREHENSIVE TESTS"
echo "========================================"
echo ""
echo "Test directory: $TEST_DIR"
echo ""

echo -e "${YELLOW}=== CORE FUNCTIONALITY: BLOCK WHEN METADATA MISSING ===${NC}"

# Setup without metadata
setup_test_increment "false" "0001-no-metadata"
test_should_block "spec.md without metadata.json (3-digit)" \
  "$TEST_DIR/.specweave/increments/0001-no-metadata/spec.md" \
  "---\nincrement: 0001-no-metadata\n---"

setup_test_increment "false" "0012-no-metadata"
test_should_block "spec.md without metadata.json (4-digit)" \
  "$TEST_DIR/.specweave/increments/0012-no-metadata/spec.md" \
  "---\nincrement: 0012-no-metadata\n---"

setup_test_increment "false" "123-short"
test_should_block "spec.md without metadata.json (3-digit short)" \
  "$TEST_DIR/.specweave/increments/123-short/spec.md" \
  "---\nincrement: 123-short\n---"

setup_test_increment "false" "0001E-external"
test_should_block "spec.md without metadata.json (external E suffix)" \
  "$TEST_DIR/.specweave/increments/0001E-external/spec.md" \
  "---\nincrement: 0001E-external\n---"

echo ""
echo -e "${YELLOW}=== CORE FUNCTIONALITY: ALLOW WHEN METADATA EXISTS ===${NC}"

# Setup with metadata
setup_test_increment "true" "0002-has-metadata"
test_should_allow "spec.md WITH metadata.json present" \
  "$TEST_DIR/.specweave/increments/0002-has-metadata/spec.md" \
  "---\nincrement: 0002-has-metadata\n---"

setup_test_increment "true" "0123E-external-with-meta"
test_should_allow "spec.md WITH metadata.json (external E suffix)" \
  "$TEST_DIR/.specweave/increments/0123E-external-with-meta/spec.md" \
  "---\nincrement: 0123E-external-with-meta\n---"

echo ""
echo -e "${YELLOW}=== NON-SPEC FILES: SHOULD NOT VALIDATE ===${NC}"

# Create increment without metadata for these tests
setup_test_increment "false" "0003-other-files"
test_should_allow "plan.md (not spec.md)" \
  "$TEST_DIR/.specweave/increments/0003-other-files/plan.md" \
  "# Plan"

test_should_allow "tasks.md (not spec.md)" \
  "$TEST_DIR/.specweave/increments/0003-other-files/tasks.md" \
  "# Tasks"

test_should_allow "metadata.json itself" \
  "$TEST_DIR/.specweave/increments/0003-other-files/metadata.json" \
  '{"id": "test"}'

test_should_allow "report in subfolder" \
  "$TEST_DIR/.specweave/increments/0003-other-files/reports/COMPLETION.md" \
  "# Report"

echo ""
echo -e "${YELLOW}=== FILES OUTSIDE INCREMENTS: SHOULD NOT VALIDATE ===${NC}"

test_should_allow "spec.md outside increments (docs)" \
  "$TEST_DIR/.specweave/docs/internal/spec.md" \
  "# Documentation"

test_should_allow "spec.md in root" \
  "$TEST_DIR/spec.md" \
  "# Root spec"

test_should_allow "Random file" \
  "$TEST_DIR/random.txt" \
  "Random content"

echo ""
echo -e "${YELLOW}=== NON-WRITE TOOLS: SHOULD ALWAYS ALLOW ===${NC}"

test_non_write_tool "Read tool" "Read"
test_non_write_tool "Edit tool" "Edit"
test_non_write_tool "Glob tool" "Glob"
test_non_write_tool "Grep tool" "Grep"
test_non_write_tool "Bash tool" "Bash"

echo ""
echo -e "${YELLOW}=== BYPASS MODES ===${NC}"

# Test SPECWEAVE_FORCE_METADATA bypass
setup_test_increment "false" "0004-bypass"
TOTAL=$((TOTAL + 1))
json_input=$(jq -n \
  --arg tool_name "Write" \
  --arg file_path "$TEST_DIR/.specweave/increments/0004-bypass/spec.md" \
  --arg content "---\nincrement: 0004-bypass\n---" \
  '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: $content}}')

result=$(SPECWEAVE_FORCE_METADATA=1 bash -c "echo '$json_input' | bash '$GUARD'" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q "bypassed"; then
  echo -e "${GREEN}✓ ALLOWED (bypass)${NC}: SPECWEAVE_FORCE_METADATA=1 works"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ BYPASS FAILED${NC}: SPECWEAVE_FORCE_METADATA=1"
  echo "  Exit code: $exit_code"
  FAIL=$((FAIL + 1))
fi

# Test SPECWEAVE_DISABLE_HOOKS bypass
TOTAL=$((TOTAL + 1))
result=$(SPECWEAVE_DISABLE_HOOKS=1 bash -c "echo '$json_input' | bash '$GUARD'" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]]; then
  echo -e "${GREEN}✓ ALLOWED (bypass)${NC}: SPECWEAVE_DISABLE_HOOKS=1 works"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ BYPASS FAILED${NC}: SPECWEAVE_DISABLE_HOOKS=1"
  FAIL=$((FAIL + 1))
fi

echo ""
echo -e "${YELLOW}=== EDGE CASES ===${NC}"

# Test with empty file path
TOTAL=$((TOTAL + 1))
json_input='{"tool_name": "Write", "tool_input": {"file_path": "", "content": "test"}}'
result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]]; then
  echo -e "${GREEN}✓ ALLOWED${NC}: Empty file path"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ FAILED${NC}: Empty file path should be allowed"
  FAIL=$((FAIL + 1))
fi

# Test with malformed JSON (should fail gracefully)
TOTAL=$((TOTAL + 1))
result=$(echo "not json" | bash "$GUARD" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]]; then
  echo -e "${GREEN}✓ ALLOWED${NC}: Malformed JSON handled gracefully"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ FAILED${NC}: Malformed JSON should be allowed (fail-safe)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo -e "Total: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Failed: $FAIL${NC}"
  exit 1
else
  echo -e "Failed: 0"
  echo ""
  echo -e "${GREEN}ALL TESTS PASSED!${NC}"
fi
