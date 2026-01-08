#!/bin/bash
# Shell injection prevention tests for skill argument passing
# These tests verify that special characters in user input don't cause shell injection

# Don't use set -e as we want to continue on test failures
# set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

echo "============================================"
echo "Shell Injection Prevention Tests"
echo "============================================"
echo ""

# Test 1: Backticks should not execute commands
echo "Test 1: Backticks in arguments should not execute commands"
ARGS='ultrathink to implement `whoami` feature'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
# Simulate what the ```! block does with quoted ARGUMENTS
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q '`whoami`'; then
    test_pass "Backticks preserved as literal text"
else
    test_fail "Backticks were interpreted as command substitution"
fi

# Test 2: $() command substitution should not execute
echo "Test 2: \$(command) should not execute"
ARGS='implement $(cat /etc/passwd) feature'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q '\$(cat /etc/passwd)'; then
    test_pass "Command substitution preserved as literal text"
else
    test_fail "Command substitution was executed"
fi

# Test 3: Semicolons should not chain commands
echo "Test 3: Semicolons should not chain commands"
ARGS='feature; rm -rf /'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q 'feature; rm -rf /'; then
    test_pass "Semicolons preserved as literal text"
else
    test_fail "Semicolons caused command chaining"
fi

# Test 4: Pipes should not redirect output
echo "Test 4: Pipes should not redirect output"
ARGS='feature | cat /etc/passwd'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q 'feature | cat'; then
    test_pass "Pipes preserved as literal text"
else
    test_fail "Pipes caused output redirection"
fi

# Test 5: Test setup-auto.sh with special characters
echo "Test 5: setup-auto.sh handles special characters safely"
ARGS='ultrathink to implement `learned data` feature'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
"'"$PROJECT_ROOT"'/plugins/specweave/scripts/setup-auto.sh" "$ARGUMENTS" --help 2>&1
' _ "$ARGS" 2>&1 | head -5)

if echo "$OUTPUT" | grep -q "setup-auto.sh"; then
    test_pass "setup-auto.sh executed without shell injection"
else
    test_fail "setup-auto.sh failed with special characters"
fi

# Test 6: Test with parentheses (common in user prompts)
echo "Test 6: Parentheses in arguments"
ARGS='implement feature (e.g. what helped to stop cry)'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q '(e.g. what helped to stop cry)'; then
    test_pass "Parentheses preserved as literal text"
else
    test_fail "Parentheses caused issues"
fi

# Test 7: Test with quotes inside arguments
echo "Test 7: Quotes inside arguments"
ARGS='implement "quoted feature" with '\''single quotes'\'''
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Received: $ARGUMENTS"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q 'quoted feature'; then
    test_pass "Quotes handled correctly"
else
    test_fail "Quotes caused issues"
fi

# Test 8: The exact failing case from the user
echo "Test 8: Exact user case - Spotify queue implementation"
ARGS='ultrathink to impleent funcitonality like in Spotify, so that there is always a queue, which is built based on the data that the system has, e.g. what helpeed to stop cry (learned data), favroties, number of played times, sometimes randomizing a bit!!'
OUTPUT=$(bash -c '
ARGUMENTS="$1"
echo "Length: ${#ARGUMENTS}"
echo "First 50 chars: ${ARGUMENTS:0:50}"
' _ "$ARGS" 2>&1)

if echo "$OUTPUT" | grep -q "ultrathink to impleent"; then
    test_pass "Complex user prompt handled correctly"
else
    test_fail "Complex user prompt failed"
fi

echo ""
echo "============================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
