#!/bin/bash
# Tests for userGoal wiring in setup-auto.sh (AC-US2-01, AC-US2-02, AC-US2-04)
# Tests the logic directly without running the full setup-auto.sh.

set -e

TMPDIR_ROOT=$(mktemp -d)
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

PASS=0; FAIL=0

assert_eq() {
    if [ "$1" = "$2" ]; then
        echo "  ✓ $3"; PASS=$((PASS+1))
    else
        echo "  ✗ $3 (expected '$2', got '$1')"; FAIL=$((FAIL+1))
    fi
}

# Helper: run userGoal wiring logic (extracted from setup-auto.sh)
write_user_goal() {
    local prompt="$1" file="$2"
    if [ -f "$file" ]; then
        if [ -n "$prompt" ]; then
            local updated; updated=$(jq --arg g "$prompt" '.userGoal = $g' "$file" 2>/dev/null)
        else
            local updated; updated=$(jq '.userGoal = null' "$file" 2>/dev/null)
        fi
        [ -n "$updated" ] && echo "$updated" > "$file"
    elif [ -n "$prompt" ]; then
        jq -n --arg g "$prompt" '{"active":false,"userGoal":$g}' > "$file"
    fi
}

echo "setup-auto.sh userGoal wiring tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# TC-005: Prompt sets userGoal on existing file
AM="$TMPDIR_ROOT/auto-mode.json"
echo '{"active":false}' > "$AM"
write_user_goal "fix auth bug" "$AM"
result=$(jq -r '.userGoal' "$AM")
assert_eq "$result" "fix auth bug" "TC-005: prompt sets userGoal"

# TC-006: No prompt sets userGoal to null on existing file
echo '{"active":false,"userGoal":"old goal"}' > "$AM"
write_user_goal "" "$AM"
result=$(jq -r '.userGoal' "$AM")
assert_eq "$result" "null" "TC-006: no prompt → userGoal null"

# TC-X: Prompt creates new file when absent
rm -f "$AM"
write_user_goal "add payment feature" "$AM"
result=$(jq -r '.userGoal' "$AM")
assert_eq "$result" "add payment feature" "TC-X1: creates file with userGoal"

# TC-X: No prompt does NOT create file when absent (userGoal null only on existing files)
rm -f "$AM"
write_user_goal "" "$AM"
if [ -f "$AM" ]; then
    result=$(jq -r '.userGoal' "$AM")
    assert_eq "$result" "null" "TC-X2: no-prompt no-file → file absent or null"
else
    echo "  ✓ TC-X2: no-prompt no-file → no file created"; PASS=$((PASS+1))
fi

# TC-X: Prompt preserves other fields in existing auto-mode.json
echo '{"active":true,"incrementIds":["0100-auth"],"tddMode":false}' > "$AM"
write_user_goal "fix login" "$AM"
active=$(jq -r '.active' "$AM")
goal=$(jq -r '.userGoal' "$AM")
assert_eq "$active" "true" "TC-X3: existing fields preserved after goal write"
assert_eq "$goal" "fix login" "TC-X3: userGoal set correctly"

# TC-X: Special characters in prompt are handled safely
echo '{"active":false}' > "$AM"
write_user_goal 'fix "tricky" bug & deploy' "$AM"
result=$(jq -r '.userGoal' "$AM")
assert_eq "$result" 'fix "tricky" bug & deploy' "TC-X4: special chars in prompt"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
