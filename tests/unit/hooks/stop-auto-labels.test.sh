#!/bin/bash
# Test stop-auto.sh label visibility via systemMessage
# Tests the v2.9 enhancement that makes labels visible to users

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../../.."
STOP_HOOK="$PROJECT_ROOT/plugins/specweave/hooks/stop-auto.sh"

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper: Run test
run_test() {
    local test_name="$1"
    local input_json="$2"
    local expected_pattern="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "${YELLOW}Test $TESTS_RUN: $test_name${NC}"

    # Run stop hook
    local output=$(echo "$input_json" | bash "$STOP_HOOK" 2>/dev/null || true)

    # Check if output contains expected pattern
    if echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Expected pattern: $expected_pattern"
        echo "Got output:"
        echo "$output"
        return 1
    fi
}

# Helper: Test systemMessage contains label
test_system_message_has_label() {
    local test_name="$1"
    local input_json="$2"
    local label_pattern="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "${YELLOW}Test $TESTS_RUN: $test_name${NC}"

    # Run stop hook
    local output=$(echo "$input_json" | bash "$STOP_HOOK" 2>/dev/null || true)

    # Extract systemMessage field
    local system_msg=$(echo "$output" | jq -r '.systemMessage // ""')

    # Check if systemMessage contains the label
    if echo "$system_msg" | grep -q "$label_pattern"; then
        echo -e "${GREEN}✓ PASS - Label found in systemMessage${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL - Label NOT in systemMessage${NC}"
        echo "Expected label pattern: $label_pattern"
        echo "systemMessage content:"
        echo "$system_msg"
        return 1
    fi
}

echo "========================================="
echo "Stop Auto Hook - Label Visibility Tests"
echo "========================================="
echo ""

# Setup: Create minimal session file
mkdir -p "$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$PROJECT_ROOT/.specweave/state/auto-session.json"
cat > "$SESSION_FILE" <<'EOF'
{
  "sessionId": "test-session-123",
  "status": "running",
  "startTime": "2026-01-06T00:00:00Z",
  "iteration": 5,
  "maxIterations": 100,
  "currentIncrement": "0001-test-feature",
  "incrementQueue": ["0001-test-feature"],
  "completedIncrements": [],
  "failedIncrements": [],
  "lastActivity": "2026-01-06T00:00:00Z"
}
EOF

# Create mock transcript
TRANSCRIPT_FILE="$PROJECT_ROOT/.specweave/state/test-transcript.md"
echo "Mock transcript for testing" > "$TRANSCRIPT_FILE"

echo "Test 1: Approve (session stop) includes label in systemMessage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
INPUT_JSON=$(cat <<EOF
{
  "transcript_path": "$TRANSCRIPT_FILE",
  "stop_hook_active": false
}
EOF
)

# Mark session as completed to trigger approve
jq '.status = "completed"' "$SESSION_FILE" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"

test_system_message_has_label \
    "Approve includes 🛑 AUTO SESSION STOPPING label" \
    "$INPUT_JSON" \
    "AUTO SESSION STOPPING"

echo ""

# Test 2: Block (continuation) includes label
echo "Test 2: Block includes label in systemMessage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Restore running session
cat > "$SESSION_FILE" <<'EOF'
{
  "sessionId": "test-session-123",
  "status": "running",
  "startTime": "2026-01-06T00:00:00Z",
  "iteration": 5,
  "maxIterations": 100,
  "currentIncrement": "0001-test-feature",
  "incrementQueue": ["0001-test-feature"],
  "completedIncrements": [],
  "failedIncrements": [],
  "lastActivity": "2026-01-06T00:00:00Z"
}
EOF

# Create incomplete tasks to trigger block
TASKS_FILE="$PROJECT_ROOT/.specweave/increments/0001-test-feature/tasks.md"
mkdir -p "$(dirname "$TASKS_FILE")"
cat > "$TASKS_FILE" <<'EOF'
# Tasks

### T-001: Test task
**Status**: [ ] pending
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
EOF

test_system_message_has_label \
    "Block includes 🔄 AUTO SESSION CONTINUING label" \
    "$INPUT_JSON" \
    "AUTO SESSION CONTINUING"

echo ""

# Test 3: Check decision field is correct
echo "Test 3: JSON decision field correctness"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

run_test \
    "Block returns decision: block" \
    "$INPUT_JSON" \
    '"decision": "block"'

echo ""

# Test 4: Check systemMessage is properly escaped
echo "Test 4: systemMessage JSON escaping"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OUTPUT=$(echo "$INPUT_JSON" | bash "$STOP_HOOK" 2>/dev/null || true)
if echo "$OUTPUT" | jq -e '.systemMessage' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS - systemMessage is valid JSON${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL - systemMessage is not valid JSON${NC}"
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""

# Cleanup
rm -f "$SESSION_FILE" "$TRANSCRIPT_FILE" "$TASKS_FILE"
rmdir "$(dirname "$TASKS_FILE")" 2>/dev/null || true

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$((TESTS_RUN - TESTS_PASSED))${NC}"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
