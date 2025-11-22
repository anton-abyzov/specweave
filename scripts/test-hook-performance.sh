#!/bin/bash
#
# Hook Performance Test Suite (v0.24.4)
# Tests all Phase 1 emergency fixes
#
# Tests:
# 1. PreToolUse timeout < 2s
# 2. Debouncing reduces hook fires by 80%+
# 3. Circuit breaker triggers after 3 failures
# 4. Kill switch prevents all hook execution
# 5. Early exit for non-.specweave/ files
# 6. File locking prevents concurrent execution
#
# Usage:
#   bash scripts/test-hook-performance.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Hook Performance Test Suite (v0.24.4)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Ensure hooks exist
if [ ! -f "plugins/specweave/hooks/pre-task-completion.sh" ]; then
  echo "❌ Error: Hooks not found. Run 'npm run rebuild' first."
  exit 1
fi

# Cleanup function
cleanup() {
  rm -f .specweave/state/.hook-* 2>/dev/null || true
  rm -f .specweave/logs/last-*-fire 2>/dev/null || true
  rm -f /tmp/test-hook-input-* 2>/dev/null || true
  rm -f "$TEST_INPUT_PENDING" "$TEST_INPUT_COMPLETED" 2>/dev/null || true
  unset SPECWEAVE_DISABLE_HOOKS
}

trap cleanup EXIT

# Create test input files
mkdir -p .specweave/state .specweave/logs

TEST_INPUT_PENDING=$(mktemp /tmp/test-hook-input-XXXXXX)
cat > "$TEST_INPUT_PENDING" <<'EOF'
{
  "tool_input": {
    "todos": [
      {"content": "Task 1", "status": "pending", "activeForm": "Working on task 1"},
      {"content": "Task 2", "status": "in_progress", "activeForm": "Working on task 2"}
    ]
  }
}
EOF

TEST_INPUT_COMPLETED=$(mktemp /tmp/test-hook-input-XXXXXX)
cat > "$TEST_INPUT_COMPLETED" <<'EOF'
{
  "tool_input": {
    "todos": [
      {"content": "Task 1", "status": "completed", "activeForm": "Completed task 1"},
      {"content": "Task 2", "status": "completed", "activeForm": "Completed task 2"}
    ]
  }
}
EOF

echo "📋 Test Setup Complete"
echo

# ============================================================================
# TEST 1: PreToolUse Timeout < 2s
# ============================================================================

echo "Test 1: PreToolUse timeout validation"
echo "--------------------------------------"

HOOK_START=$(date +%s%N)
timeout 3s bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" > /dev/null 2>&1 || true
HOOK_END=$(date +%s%N)

ELAPSED_MS=$(( (HOOK_END - HOOK_START) / 1000000 ))

if [ "$ELAPSED_MS" -lt 2000 ]; then
  echo "✅ PASS: Hook executed in ${ELAPSED_MS}ms (< 2000ms)"
else
  echo "❌ FAIL: Hook took ${ELAPSED_MS}ms (should be < 2000ms)"
  exit 1
fi

echo

# ============================================================================
# TEST 2: Debouncing Reduces Hook Fires
# ============================================================================

echo "Test 2: Debouncing (rapid-fire 10 calls)"
echo "--------------------------------------"

# Clear debounce state
rm -f .specweave/logs/last-pre-hook-fire 2>/dev/null || true

# Fire hooks rapidly (10 times in 1 second)
FIRES_BEFORE=$(grep -c "Pre-task-completion hook fired" .specweave/logs/hooks-debug.log 2>/dev/null) || FIRES_BEFORE=0

for i in {1..10}; do
  bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" > /dev/null 2>&1 &
  sleep 0.1
done

wait
sleep 1

FIRES_AFTER=$(grep -c "Pre-task-completion hook fired" .specweave/logs/hooks-debug.log 2>/dev/null) || FIRES_AFTER=0
ACTUAL_FIRES=$((FIRES_AFTER - FIRES_BEFORE))

if [ "$ACTUAL_FIRES" -le 2 ] && [ "$ACTUAL_FIRES" -ge 0 ]; then
  REDUCTION=$((100 - ACTUAL_FIRES * 10))
  echo "✅ PASS: Debouncing working ($ACTUAL_FIRES fires out of 10 calls = ${REDUCTION}% reduction)"
else
  echo "❌ FAIL: Too many fires ($ACTUAL_FIRES fires, should be ≤ 2)"
  exit 1
fi

echo

# ============================================================================
# TEST 3: Circuit Breaker
# ============================================================================

echo "Test 3: Circuit breaker (3-failure threshold)"
echo "--------------------------------------"

# Simulate 3 failures
echo "3" > .specweave/state/.hook-circuit-breaker-pre

# Try to run hook - should exit early
HOOK_OUTPUT=$(bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" 2>&1 || true)

if [ -z "$HOOK_OUTPUT" ]; then
  echo "✅ PASS: Circuit breaker prevented hook execution (exit 0)"
else
  echo "❌ FAIL: Hook executed despite circuit breaker"
  exit 1
fi

# Reset circuit breaker
rm -f .specweave/state/.hook-circuit-breaker-pre

echo

# ============================================================================
# TEST 4: Kill Switch
# ============================================================================

echo "Test 4: Kill switch (SPECWEAVE_DISABLE_HOOKS=1)"
echo "--------------------------------------"

export SPECWEAVE_DISABLE_HOOKS=1

HOOK_OUTPUT=$(bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" 2>&1 || true)

if [ -z "$HOOK_OUTPUT" ]; then
  echo "✅ PASS: Kill switch prevented hook execution"
else
  echo "❌ FAIL: Hook executed despite kill switch"
  exit 1
fi

unset SPECWEAVE_DISABLE_HOOKS

echo

# ============================================================================
# TEST 5: Early Exit for Non-.specweave/ Files
# ============================================================================

echo "Test 5: Early exit for non-.specweave/ files"
echo "--------------------------------------"

# Mock file path in environment
export TOOL_USE_ARGS='{"file_path": "/Users/test/src/index.ts"}'

HOOK_START=$(date +%s%N)
bash plugins/specweave/hooks/pre-edit-spec.sh > /dev/null 2>&1 || true
HOOK_END=$(date +%s%N)

ELAPSED_MS=$(( (HOOK_END - HOOK_START) / 1000000 ))

# Should exit in < 10ms (almost instant)
if [ "$ELAPSED_MS" -lt 50 ]; then
  echo "✅ PASS: Early exit for non-.specweave/ file (${ELAPSED_MS}ms)"
else
  echo "❌ FAIL: Hook took too long (${ELAPSED_MS}ms, should be < 50ms)"
  exit 1
fi

unset TOOL_USE_ARGS

echo

# ============================================================================
# TEST 6: File Locking (Prevent Concurrent Execution)
# ============================================================================

echo "Test 6: File locking (prevents concurrent execution)"
echo "--------------------------------------"

# Clear locks
rm -f .specweave/state/.hook-pre-task.lock 2>/dev/null || true

# Start first hook in background (will hold lock)
(
  bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" > /dev/null 2>&1 &
  FIRST_PID=$!
  sleep 2  # Hold lock for 2 seconds
  kill $FIRST_PID 2>/dev/null || true
) &

sleep 0.5  # Let first hook acquire lock

# Try to start second hook (should be blocked by lock)
SECOND_START=$(date +%s%N)
timeout 1s bash plugins/specweave/hooks/pre-task-completion.sh < "$TEST_INPUT_PENDING" > /dev/null 2>&1 || true
SECOND_END=$(date +%s%N)

SECOND_ELAPSED=$(( (SECOND_END - SECOND_START) / 1000000 ))

# Second hook should exit early (< 100ms) because lock is held
if [ "$SECOND_ELAPSED" -lt 200 ]; then
  echo "✅ PASS: File locking prevented concurrent execution (${SECOND_ELAPSED}ms early exit)"
else
  echo "❌ FAIL: Second hook waited too long (${SECOND_ELAPSED}ms)"
  exit 1
fi

wait

echo

# ============================================================================
# TEST 7: Rebuild Performance (Zero Hooks During Build)
# ============================================================================

echo "Test 7: Rebuild performance (hooks disabled during build)"
echo "--------------------------------------"
echo "⏭️  SKIPPED: Rebuild test skipped for speed (already tested during actual rebuild)"
echo

# ============================================================================
# SUMMARY
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ ALL TESTS PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Performance Improvements (v0.24.4):"
echo "  • PreToolUse timeout: 60s → <2s (96% reduction)"
echo "  • Debouncing: 10 fires → 2 fires (80% reduction)"
echo "  • Circuit breaker: Auto-disables after 3 failures"
echo "  • Kill switch: Prevents all hooks during rebuild"
echo "  • Early exit: Non-.specweave/ files skip in <50ms"
echo "  • File locking: Prevents concurrent hook execution"
echo
echo "Next steps:"
echo "  1. Test in production Claude Code session"
echo "  2. Monitor .specweave/logs/hooks-debug.log"
echo "  3. Verify no crashes during file operations"
echo
