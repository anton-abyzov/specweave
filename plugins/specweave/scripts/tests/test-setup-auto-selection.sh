#!/bin/bash
# Tests for scored increment selection in setup-auto.sh (AC-US1-01, AC-US1-03, AC-US1-04)
# Uses score-increment.sh directly to verify selection logic.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCORE_SCRIPT="$SCRIPT_DIR/../../hooks/lib/score-increment.sh"
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

assert_gt() {
    if [ "$1" -gt "$2" ]; then
        echo "  ✓ $3 ($1 > $2)"; PASS=$((PASS+1))
    else
        echo "  ✗ $3 (expected $1 > $2)"; FAIL=$((FAIL+1))
    fi
}

make_increment() {
    local dir="$TMPDIR_ROOT/$1"
    mkdir -p "$dir"
    echo "{\"title\":\"$2\",\"status\":\"active\",\"lastActivity\":\"$5\"}" > "$dir/metadata.json"
    printf "# %s\n\n%s\n" "$2" "$3" > "$dir/spec.md"
    printf "### T-001: %s\n**Status**: [ ] pending\n" "$4" > "$dir/tasks.md"
    echo "$dir"
}

echo "scored increment selection tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# TC-007: Prompt-based selection picks best match
d1=$(make_increment "0100-user-auth" "Authentication Login Feature" "Implement user authentication and login" "Add login endpoint" "2026-02-18T10:00:00Z")
d2=$(make_increment "0101-deploy-pipeline" "CI/CD Deploy Pipeline" "Setup deployment pipeline with Docker" "Configure CI workflow" "2026-02-19T10:00:00Z")

s1=$(bash "$SCORE_SCRIPT" "$d1" "authentication login" 2>/dev/null)
s2=$(bash "$SCORE_SCRIPT" "$d2" "authentication login" 2>/dev/null)
assert_gt "$s1" "$s2" "TC-007: auth scores higher than deploy for 'authentication login'"

# TC-007b: Reverse -- deploy query should score deploy higher
s3=$(bash "$SCORE_SCRIPT" "$d1" "deploy pipeline docker" 2>/dev/null)
s4=$(bash "$SCORE_SCRIPT" "$d2" "deploy pipeline docker" 2>/dev/null)
assert_gt "$s4" "$s3" "TC-007b: deploy scores higher than auth for 'deploy pipeline docker'"

# TC-008: Single increment -- score still works (fast path skips scoring in setup-auto.sh)
d3=$(make_increment "0102-single" "Single Active Feature" "Only one active increment exists" "Implement feature" "2026-02-19T12:00:00Z")
result=$(bash "$SCORE_SCRIPT" "$d3" "single feature" 2>/dev/null)
echo "$result" | grep -qE '^[0-9]+$' && \
    echo "  ✓ TC-008: single increment scoring returns integer ($result)" && PASS=$((PASS+1)) || \
    { echo "  ✗ TC-008: non-integer output: '$result'"; FAIL=$((FAIL+1)); }

# TC-009: Empty query → 0 for all (triggers mtime fallback in setup-auto.sh)
s5=$(bash "$SCORE_SCRIPT" "$d1" "" 2>/dev/null)
s6=$(bash "$SCORE_SCRIPT" "$d2" "" 2>/dev/null)
assert_eq "$s5" "0" "TC-009: empty query → 0 for increment A"
assert_eq "$s6" "0" "TC-009b: empty query → 0 for increment B"

# TC-X: Scoring is deterministic (same inputs → same output)
s7=$(bash "$SCORE_SCRIPT" "$d1" "authentication login" 2>/dev/null)
assert_eq "$s7" "$s1" "TC-X: scoring is deterministic"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
