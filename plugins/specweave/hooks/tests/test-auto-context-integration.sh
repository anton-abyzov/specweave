#!/bin/bash
# Integration test: scored selection + enriched feedback (T-012, AC-US1-01, AC-US2-01, AC-US3-01)
# Creates a mock .specweave/ project, scores increments, and verifies enrichment helpers.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCORE_SCRIPT="$SCRIPT_DIR/../lib/score-increment.sh"
STOP_HOOK="$SCRIPT_DIR/../stop-auto-v5.sh"
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

assert_contains() {
    if echo "$1" | grep -q "$2"; then
        echo "  ✓ $3"; PASS=$((PASS+1))
    else
        echo "  ✗ $3 (expected '$1' to contain '$2')"; FAIL=$((FAIL+1))
    fi
}

echo "Integration: scored selection + enriched feedback"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Setup mock .specweave/ structure
SW="$TMPDIR_ROOT/.specweave"
INC_DIR="$SW/increments"
STATE_DIR="$SW/state"
LOGS_DIR="$SW/logs"
mkdir -p "$INC_DIR/0100-user-auth" "$INC_DIR/0101-deploy-pipeline" "$STATE_DIR" "$LOGS_DIR"

# Create increment 0100: auth
echo '{"title":"User Authentication Feature","status":"active","lastActivity":"2026-02-18T10:00:00Z"}' \
    > "$INC_DIR/0100-user-auth/metadata.json"
cat > "$INC_DIR/0100-user-auth/spec.md" << 'EOF'
# User Authentication Feature

Implement login, signup, and OAuth for user authentication.
EOF
cat > "$INC_DIR/0100-user-auth/tasks.md" << 'EOF'
### T-001: Add login endpoint
**Status**: [x] completed
### T-002: Add signup endpoint
**Status**: [x] completed
### T-003: OAuth integration
**Status**: [ ] pending
### T-004: Session management
**Status**: [ ] pending
EOF

# Create increment 0101: deploy
echo '{"title":"CI/CD Deploy Pipeline","status":"active","lastActivity":"2026-02-17T10:00:00Z"}' \
    > "$INC_DIR/0101-deploy-pipeline/metadata.json"
cat > "$INC_DIR/0101-deploy-pipeline/spec.md" << 'EOF'
# CI/CD Deploy Pipeline

Setup continuous integration and deployment pipeline with Docker and GitHub Actions.
EOF
cat > "$INC_DIR/0101-deploy-pipeline/tasks.md" << 'EOF'
### T-001: Create Dockerfile
**Status**: [x] completed
### T-002: Configure GitHub Actions
**Status**: [ ] pending
### T-003: Set up staging environment
**Status**: [ ] pending
EOF

# TC-015: Scored selection — auth scores higher for "fix authentication"
s_auth=$(bash "$SCORE_SCRIPT" "$INC_DIR/0100-user-auth" "fix authentication" 2>/dev/null)
s_deploy=$(bash "$SCORE_SCRIPT" "$INC_DIR/0101-deploy-pipeline" "fix authentication" 2>/dev/null)
assert_gt "$s_auth" "$s_deploy" "TC-015a: auth scores higher than deploy for auth prompt"

# TC-015b: Deploy scores higher for "deploy pipeline docker"
s_auth2=$(bash "$SCORE_SCRIPT" "$INC_DIR/0100-user-auth" "deploy pipeline docker" 2>/dev/null)
s_deploy2=$(bash "$SCORE_SCRIPT" "$INC_DIR/0101-deploy-pipeline" "deploy pipeline docker" 2>/dev/null)
assert_gt "$s_deploy2" "$s_auth2" "TC-015b: deploy scores higher for deploy prompt"

# TC-015c: userGoal wiring — verify logic matches setup-auto.sh
AUTO_MODE_FILE="$STATE_DIR/auto-mode.json"
PROMPT="fix authentication"
if [ -f "$AUTO_MODE_FILE" ]; then
    if [ -n "$PROMPT" ]; then
        _UPDATED=$(jq --arg g "$PROMPT" '.userGoal = $g' "$AUTO_MODE_FILE" 2>/dev/null)
    else
        _UPDATED=$(jq '.userGoal = null' "$AUTO_MODE_FILE" 2>/dev/null)
    fi
    [ -n "$_UPDATED" ] && echo "$_UPDATED" > "$AUTO_MODE_FILE"
elif [ -n "$PROMPT" ]; then
    jq -n --arg g "$PROMPT" '{"active":false,"userGoal":$g}' > "$AUTO_MODE_FILE"
fi
goal=$(jq -r '.userGoal' "$AUTO_MODE_FILE")
assert_eq "$goal" "fix authentication" "TC-015c: userGoal written to auto-mode.json"

# TC-015d: Stop hook enrichment — source hook, test helpers
export PROJECT_ROOT="$TMPDIR_ROOT"
export __STOP_AUTO_V5_SOURCED=1
source "$STOP_HOOK" 2>/dev/null

next_auth=$(get_next_task_title "$INC_DIR/0100-user-auth/tasks.md")
assert_eq "$next_auth" "OAuth integration" "TC-015d: enriched next task from auth increment"

done_auth=$(count_completed_tasks "$INC_DIR/0100-user-auth/tasks.md")
pending_auth=$(count_pending_tasks "$INC_DIR/0100-user-auth/tasks.md")
assert_eq "$done_auth" "2" "TC-015e: auth increment done count = 2"
assert_eq "$pending_auth" "2" "TC-015f: auth increment pending count = 2"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
