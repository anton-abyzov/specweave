#!/bin/bash
# Tests for enriched stop hook feedback (AC-US3-01, AC-US3-02, AC-US3-03, AC-US4-01, AC-US4-03)
# Sources stop-auto-v5.sh to load helper functions only.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

assert_ge() {
    if [ "$1" -ge "$2" ]; then
        echo "  ✓ $3 ($1 >= $2)"; PASS=$((PASS+1))
    else
        echo "  ✗ $3 (expected >= $2, got $1)"; FAIL=$((FAIL+1))
    fi
}

# Set up minimal .specweave structure so sourcing succeeds
export PROJECT_ROOT="$TMPDIR_ROOT"
mkdir -p "$TMPDIR_ROOT/.specweave/logs" "$TMPDIR_ROOT/.specweave/state" "$TMPDIR_ROOT/.specweave/increments"

# Source only (loads helper functions, skips main execution)
export __STOP_AUTO_V5_SOURCED=1
source "$STOP_HOOK" 2>/dev/null

echo "stop-auto-v5.sh enrichment function tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a tasks.md with known counts
TASKS_FILE="$TMPDIR_ROOT/tasks.md"
cat > "$TASKS_FILE" << 'EOF'
### T-001: Setup database
**User Story**: US-001 | **Status**: [x] completed

### T-002: Implement login
**User Story**: US-001 | **Status**: [x] completed

### T-003: Add unit tests
**User Story**: US-001 | **Status**: [x] completed

### T-004: Write integration tests
**User Story**: US-001 | **Status**: [x] completed

### T-005: Deploy to staging
**User Story**: US-001 | **Status**: [x] completed

### T-006: Configure auth middleware
**User Story**: US-001 | **Status**: [ ] pending

### T-007: Add error handling
**User Story**: US-001 | **Status**: [ ] pending

### T-008: Final review and cleanup
**User Story**: US-001 | **Status**: [ ] pending
EOF

# TC-010: Block message includes next task title (AC-US3-01)
result=$(get_next_task_title "$TASKS_FILE")
assert_eq "$result" "Configure auth middleware" "TC-010: get_next_task_title returns first pending task"

# TC-011: count_completed_tasks counts [x] entries
done_count=$(count_completed_tasks "$TASKS_FILE")
assert_eq "$done_count" "5" "TC-011: count_completed_tasks = 5"

# TC-012: count_pending_tasks counts [ ] entries (AC-US3-03)
pending_count=$(count_pending_tasks "$TASKS_FILE")
assert_eq "$pending_count" "3" "TC-012: count_pending_tasks = 3"

# TC-012b: Progress fraction calculation
total=$((done_count + pending_count))
assert_eq "$total" "8" "TC-012b: total = done + pending = 8"

# TC-013: Empty tasks file → zeros
EMPTY_FILE="$TMPDIR_ROOT/empty.md"
touch "$EMPTY_FILE"
done_empty=$(count_completed_tasks "$EMPTY_FILE")
pending_empty=$(count_pending_tasks "$EMPTY_FILE")
assert_eq "$done_empty" "0" "TC-013: empty file → 0 completed"
assert_eq "$pending_empty" "0" "TC-013b: empty file → 0 pending"

# TC-013c: get_next_task_title on empty file → empty string
next_empty=$(get_next_task_title "$EMPTY_FILE")
assert_eq "$next_empty" "" "TC-013c: empty file → no next title"

# TC-014: Missing file → zeros
done_missing=$(count_completed_tasks "/nonexistent/tasks.md")
assert_eq "$done_missing" "0" "TC-014: missing file → 0 completed"

# TC-015: get_next_task_title with all completed → empty
ALL_DONE_FILE="$TMPDIR_ROOT/all-done.md"
cat > "$ALL_DONE_FILE" << 'EOF'
### T-001: Done task one
**Status**: [x] completed

### T-002: Done task two
**Status**: [x] completed
EOF
next_done=$(get_next_task_title "$ALL_DONE_FILE")
assert_eq "$next_done" "" "TC-015: all done → no next title"

# TC-016: get_next_task_title with task without title pattern
MIXED_FILE="$TMPDIR_ROOT/mixed.md"
cat > "$MIXED_FILE" << 'EOF'
### T-001: First Task Title
**Status**: [x] completed
### T-002: Second Task Title
**Status**: [ ] pending
### T-003: Third Task Title
**Status**: [ ] pending
EOF
next_mixed=$(get_next_task_title "$MIXED_FILE")
assert_eq "$next_mixed" "Second Task Title" "TC-016: returns first pending task title"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
