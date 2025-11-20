#!/bin/bash

# SpecWeave Pre-Task-Completion Hook
# CRITICAL QUALITY GATE: Validates AC tests before allowing task completion
#
# Runs automatically BEFORE any task is marked complete via TodoWrite
#
# WORKFLOW:
# =========
# 1. TodoWrite called with status="completed"
# 2. This hook fires (pre-completion validation)
# 3. Extract task ID from TodoWrite input
# 4. Find task in tasks.md
# 5. Run AC test validator
# 6. If tests PASS → Allow completion (continue: true)
# 7. If tests FAIL → Block completion (continue: false, show error)
#
# ENFORCEMENT:
# ============
# This is the ONLY way to mark tasks complete in SpecWeave.
# Manual edits to tasks.md are detected and flagged by pre-commit hooks.

set -e

# Find project root
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  pwd
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# CONFIGURATION
# ============================================================================

LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

echo "[$(date)] 🔒 Pre-task-completion hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# CAPTURE INPUT
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# CHECK FOR TASK COMPLETION
# ============================================================================

# Only validate if a task is being marked complete
COMPLETING_TASK=false

if command -v jq >/dev/null 2>&1; then
  # Check if any task is transitioning to "completed" status
  COMPLETED_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status == "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "0")

  if [ "$COMPLETED_COUNT" != "0" ]; then
    COMPLETING_TASK=true
    echo "[$(date)] ✓ Detected task completion (${COMPLETED_COUNT} tasks)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

# If no tasks being completed, allow without validation
if [ "$COMPLETING_TASK" = "false" ]; then
  echo "[$(date)] ⏭️  No tasks being completed, skipping validation" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$STDIN_DATA"
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# ============================================================================
# DETECT CURRENT INCREMENT
# ============================================================================

CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | grep -v "_archive" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] ⚠️  No active increment found, skipping validation" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$STDIN_DATA"
  cat <<EOF
{
  "continue": true,
  "systemMessage": "⚠️  Warning: No active increment found. Task completion validation skipped."
}
EOF
  exit 0
fi

TASKS_MD=".specweave/increments/$CURRENT_INCREMENT/tasks.md"

if [ ! -f "$TASKS_MD" ]; then
  echo "[$(date)] ⚠️  tasks.md not found for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$STDIN_DATA"
  cat <<EOF
{
  "continue": true,
  "systemMessage": "⚠️  Warning: tasks.md not found. Task completion validation skipped."
}
EOF
  exit 0
fi

# ============================================================================
# RUN AC TEST VALIDATION
# ============================================================================

echo "[$(date)] 🧪 Running AC test validation for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

# Determine which validation script to use
VALIDATOR_SCRIPT=""
if [ -f "$PROJECT_ROOT/dist/src/core/ac-test-validator-cli.js" ]; then
  VALIDATOR_SCRIPT="$PROJECT_ROOT/dist/src/core/ac-test-validator-cli.js"
elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/src/core/ac-test-validator-cli.js" ]; then
  VALIDATOR_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/src/core/ac-test-validator-cli.js"
elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/dist/src/core/ac-test-validator-cli.js" ]; then
  VALIDATOR_SCRIPT="${CLAUDE_PLUGIN_ROOT}/dist/src/core/ac-test-validator-cli.js"
fi

if [ -z "$VALIDATOR_SCRIPT" ] || ! command -v node &> /dev/null; then
  echo "[$(date)] ⚠️  AC test validator not found or Node.js missing" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$STDIN_DATA"
  cat <<EOF
{
  "continue": true,
  "systemMessage": "⚠️  Warning: AC test validator not available. Task completion validation skipped. Install Node.js and rebuild SpecWeave to enable validation."
}
EOF
  exit 0
fi

# Run validator (captures exit code)
VALIDATION_OUTPUT=$(mktemp)
VALIDATION_EXIT_CODE=0

(cd "$PROJECT_ROOT" && node "$VALIDATOR_SCRIPT" "$CURRENT_INCREMENT") > "$VALIDATION_OUTPUT" 2>&1 || VALIDATION_EXIT_CODE=$?

echo "[$(date)] Validator exit code: $VALIDATION_EXIT_CODE" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$VALIDATION_OUTPUT" >> "$DEBUG_LOG" 2>/dev/null || true

rm -f "$STDIN_DATA"

# ============================================================================
# DECISION LOGIC
# ============================================================================

if [ "$VALIDATION_EXIT_CODE" = "0" ]; then
  # Validation passed - allow completion
  echo "[$(date)] ✅ AC test validation passed" >> "$DEBUG_LOG" 2>/dev/null || true

  VALIDATION_SUMMARY=$(cat "$VALIDATION_OUTPUT" | tail -5 | tr '\n' ' ')

  rm -f "$VALIDATION_OUTPUT"

  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ AC Test Validation Passed: All acceptance criteria have passing tests. Task completion allowed. ${VALIDATION_SUMMARY}"
}
EOF
else
  # Validation failed - block completion
  echo "[$(date)] ❌ AC test validation failed" >> "$DEBUG_LOG" 2>/dev/null || true

  VALIDATION_ERROR=$(cat "$VALIDATION_OUTPUT" | grep -A 10 "VALIDATION FAILED" | tr '\n' ' ' | cut -c 1-300)

  rm -f "$VALIDATION_OUTPUT"

  cat <<EOF
{
  "continue": false,
  "systemMessage": "❌ AC TEST VALIDATION FAILED: Cannot mark task as complete until all acceptance criteria have passing tests. ${VALIDATION_ERROR}

Fix the failing tests and try again. Run tests manually: npm test"
}
EOF
fi
