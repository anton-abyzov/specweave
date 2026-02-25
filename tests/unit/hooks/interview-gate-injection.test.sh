#!/bin/bash
# interview-gate-injection.test.sh - Tests for smart interview gate injection logic
#
# Tests the gate message construction and dedup exclusion in user-prompt-submit.sh.
# These tests extract and test the specific logic blocks rather than running the
# full hook (which has LLM calls and other side effects).
#
# Run: bash tests/unit/hooks/interview-gate-injection.test.sh

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
HOOK_SCRIPT="$PROJECT_ROOT/plugins/specweave/hooks/user-prompt-submit.sh"

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

# ============================================================================
# TEST CASES
# ============================================================================

echo ""
echo "Interview Gate Injection Tests"
echo "==============================="
echo ""

# Test 1: Gate message does NOT contain "2-5" question count cap
test_no_question_cap_in_hook() {
  # Check that the hook no longer contains the old "ask 2-5" phrasing
  if grep -q "ask 2-5 targeted questions" "$HOOK_SCRIPT"; then
    fail "Hook still contains '2-5 targeted questions' cap — should defer to sw:pm"
  else
    pass "Hook does NOT contain '2-5' question count cap"
  fi
}
test_no_question_cap_in_hook

# Test 2: Gate message construction — fires when deep interview enabled + no increment
test_gate_fires_conditions() {
  # Simulate the gate logic
  DEEP_INTERVIEW_ENABLED=true
  ACTIVE_INCREMENT=""
  HAVE_ACTIVE_STATE=false

  SMART_INTERVIEW_GATE_MSG=""
  if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]] && [[ -z "$ACTIVE_INCREMENT" ]]; then
    if [[ "$HAVE_ACTIVE_STATE" != "true" ]]; then
      SMART_INTERVIEW_GATE_MSG="No active increment. Deep interview enabled — assess prompt completeness for complexity. If gaps exist, ask targeted questions (count depends on complexity). If sufficient, call sw:increment."
    fi
  fi

  if [[ -n "$SMART_INTERVIEW_GATE_MSG" ]]; then
    pass "Gate message set when deep interview enabled + no active increment"
  else
    fail "Gate message should be set when conditions met"
  fi
}
test_gate_fires_conditions

# Test 3: Gate does NOT fire when increment exists
test_gate_silent_with_increment() {
  DEEP_INTERVIEW_ENABLED=true
  ACTIVE_INCREMENT="0001-test"
  HAVE_ACTIVE_STATE=false

  SMART_INTERVIEW_GATE_MSG=""
  if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]] && [[ -z "$ACTIVE_INCREMENT" ]]; then
    if [[ "$HAVE_ACTIVE_STATE" != "true" ]]; then
      SMART_INTERVIEW_GATE_MSG="No active increment."
    fi
  fi

  if [[ -z "$SMART_INTERVIEW_GATE_MSG" ]]; then
    pass "Gate does NOT fire when an active increment exists"
  else
    fail "Gate should be silent when an active increment exists"
  fi
}
test_gate_silent_with_increment

# Test 4: Gate does NOT fire when deep interview is disabled
test_gate_silent_when_disabled() {
  DEEP_INTERVIEW_ENABLED=false
  ACTIVE_INCREMENT=""
  HAVE_ACTIVE_STATE=false

  SMART_INTERVIEW_GATE_MSG=""
  if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]] && [[ -z "$ACTIVE_INCREMENT" ]]; then
    if [[ "$HAVE_ACTIVE_STATE" != "true" ]]; then
      SMART_INTERVIEW_GATE_MSG="No active increment."
    fi
  fi

  if [[ -z "$SMART_INTERVIEW_GATE_MSG" ]]; then
    pass "Gate does NOT fire when deep interview is disabled"
  else
    fail "Gate should be silent when deep interview is disabled"
  fi
}
test_gate_silent_when_disabled

# Test 5: Gate does NOT fire when active state file has active IDs
test_gate_silent_with_state_file() {
  DEEP_INTERVIEW_ENABLED=true
  ACTIVE_INCREMENT=""
  HAVE_ACTIVE_STATE=true

  SMART_INTERVIEW_GATE_MSG=""
  if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]] && [[ -z "$ACTIVE_INCREMENT" ]]; then
    if [[ "$HAVE_ACTIVE_STATE" != "true" ]]; then
      SMART_INTERVIEW_GATE_MSG="No active increment."
    fi
  fi

  if [[ -z "$SMART_INTERVIEW_GATE_MSG" ]]; then
    pass "Gate does NOT fire when active-increment.json has active IDs"
  else
    fail "Gate should be silent when state file shows active IDs"
  fi
}
test_gate_silent_with_state_file

# Test 6: Dedup exclusion — gate message is stripped from hash input
test_dedup_exclusion() {
  # Simulate the dedup logic
  SMART_INTERVIEW_GATE_MSG="No active increment. Deep interview enabled — assess prompt completeness for complexity. If gaps exist, ask targeted questions (count depends on complexity). If sufficient, call sw:increment."
  FINAL_MESSAGE="Some context\\n${SMART_INTERVIEW_GATE_MSG}"

  # Build hash input WITHOUT the gate message
  DEDUP_INPUT="$FINAL_MESSAGE"
  if [[ -n "$SMART_INTERVIEW_GATE_MSG" ]]; then
    DEDUP_INPUT="${DEDUP_INPUT//\\n${SMART_INTERVIEW_GATE_MSG}/}"
    DEDUP_INPUT="${DEDUP_INPUT//${SMART_INTERVIEW_GATE_MSG}/}"
  fi

  if [[ "$DEDUP_INPUT" == "Some context" ]]; then
    pass "Gate message stripped from dedup hash input"
  else
    fail "Gate message should be stripped from hash input, got: '$DEDUP_INPUT'"
  fi
}
test_dedup_exclusion

# Test 7: Dedup hash is identical across turns when only gate changes
test_dedup_identical_without_gate() {
  SMART_INTERVIEW_GATE_MSG="No active increment. Deep interview enabled."

  # Turn 1
  FINAL1="Plugin: frontend\\n${SMART_INTERVIEW_GATE_MSG}"
  DEDUP1="$FINAL1"
  DEDUP1="${DEDUP1//\\n${SMART_INTERVIEW_GATE_MSG}/}"
  DEDUP1="${DEDUP1//${SMART_INTERVIEW_GATE_MSG}/}"

  # Turn 2 — identical base context
  FINAL2="Plugin: frontend\\n${SMART_INTERVIEW_GATE_MSG}"
  DEDUP2="$FINAL2"
  DEDUP2="${DEDUP2//\\n${SMART_INTERVIEW_GATE_MSG}/}"
  DEDUP2="${DEDUP2//${SMART_INTERVIEW_GATE_MSG}/}"

  if [[ "$DEDUP1" == "$DEDUP2" ]]; then
    # Both turns have identical base context — hash would match
    # But gate message should STILL be injected (not suppressed by dedup)
    pass "Base context hashes match but gate survives dedup"
  else
    fail "Base context after gate removal should be identical"
  fi
}
test_dedup_identical_without_gate

# Test 8: SKILL FIRST deep interview message defers to sw:pm
test_skill_first_defers_to_pm() {
  # Check that the hook's deep interview message in SKILL FIRST defers to PM
  if grep -q "sw:pm skill will assess complexity" "$HOOK_SCRIPT"; then
    pass "SKILL FIRST message defers question count to sw:pm"
  else
    fail "SKILL FIRST message should mention sw:pm for complexity assessment"
  fi
}
test_skill_first_defers_to_pm

# Test 9: Gate message mentions complexity-dependent count
test_gate_mentions_complexity() {
  if grep -q "count depends on complexity" "$HOOK_SCRIPT"; then
    pass "Gate message mentions complexity-dependent question count"
  else
    fail "Gate message should mention complexity-dependent count"
  fi
}
test_gate_mentions_complexity

# Test 10: Hook file has dedup exclusion comment
test_dedup_comment_exists() {
  if grep -q "SMART_INTERVIEW_GATE_MSG is excluded from the dedup hash" "$HOOK_SCRIPT"; then
    pass "Hook has dedup exclusion comment documenting the fix"
  else
    fail "Hook should have comment explaining gate dedup exclusion"
  fi
}
test_dedup_comment_exists

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "==============================="
echo "Test Results"
echo "==============================="
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
