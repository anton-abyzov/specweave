#!/bin/bash
# tdd-enforcement-guard.sh - Warn on TDD discipline violations (v1.0.105)
#
# Called from: post-tool-use.sh when tasks.md is edited
# Action: WARNING only (not blocking) - educates users
#
# TDD Violations detected:
# 1. GREEN task completed before RED task
# 2. REFACTOR task completed before GREEN task
#
# IMPORTANT: This is a WARNING-ONLY hook. It never blocks operations.
# The goal is to educate users about TDD discipline, not punish them.
#
# COMPATIBILITY: Works on macOS (bash 3.2) and Linux (bash 4+)

set +e  # CRITICAL: Never exit on error - this is a warning-only hook

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="${1:-$(pwd)}"
FILE_PATH="${2:-}"
TOOL_NAME="${3:-Edit}"

# Debug logging
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/tdd-enforcement.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log_debug() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$DEBUG_LOG" 2>/dev/null || true
}

log_debug "tdd-enforcement-guard invoked: FILE_PATH=$FILE_PATH TOOL_NAME=$TOOL_NAME"

# ============================================================================
# VALIDATION
# ============================================================================

# Only process tasks.md files
case "$FILE_PATH" in
  *tasks.md) ;;
  *)
    log_debug "Not a tasks.md file, skipping"
    exit 0
    ;;
esac

# Extract increment directory
INC_DIR=$(dirname "$FILE_PATH")
META_FILE="$INC_DIR/metadata.json"
TASKS_FILE="$FILE_PATH"

# Check if files exist
if [ ! -f "$META_FILE" ]; then
  log_debug "No metadata.json found at $META_FILE, skipping"
  exit 0
fi

if [ ! -f "$TASKS_FILE" ]; then
  log_debug "No tasks.md found at $TASKS_FILE, skipping"
  exit 0
fi

# ============================================================================
# READ TEST MODE FROM METADATA
# ============================================================================

TEST_MODE=""

if command -v jq >/dev/null 2>&1; then
  TEST_MODE=$(jq -r '.testMode // "test-after"' "$META_FILE" 2>/dev/null || echo "test-after")
else
  # Fallback: portable grep parsing (no -P flag for macOS compatibility)
  TEST_MODE=$(grep '"testMode"' "$META_FILE" 2>/dev/null | sed 's/.*"testMode"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "test-after")
fi

# Default to test-after if empty
TEST_MODE="${TEST_MODE:-test-after}"

log_debug "testMode detected: $TEST_MODE"

# Skip if not TDD mode
if [ "$TEST_MODE" != "TDD" ]; then
  log_debug "testMode is not TDD ($TEST_MODE), skipping enforcement"
  exit 0
fi

# ============================================================================
# PARSE TASKS FOR TDD VIOLATIONS (macOS-compatible, no associative arrays)
# ============================================================================

VIOLATION_LOG="$LOGS_DIR/tdd-violations.log"

# Use temp files for cross-platform compatibility (no associative arrays)
COMPLETED_TASKS_FILE=$(mktemp)
cleanup() {
  rm -f "$COMPLETED_TASKS_FILE" 2>/dev/null || true
}
trap cleanup EXIT

# Parse task sections and find completed TDD tasks
# Format: TASK_ID:PHASE
current_task=""
current_phase=""

while IFS= read -r line; do
  # Task header: ### T-001: [RED] ... or ### T-001: [GREEN] ... or ### T-001: [REFACTOR] ...
  case "$line" in
    "### T-"*": ["*"]"*)
      # Extract task ID (T-XXX)
      current_task=$(echo "$line" | sed -n 's/^### \(T-[0-9]*\):.*/\1/p')
      # Extract phase
      case "$line" in
        *"[RED]"*) current_phase="RED" ;;
        *"[GREEN]"*) current_phase="GREEN" ;;
        *"[REFACTOR]"*) current_phase="REFACTOR" ;;
        *) current_phase="" ;;
      esac
      log_debug "Found task $current_task with phase $current_phase"
      ;;
  esac

  # Status line: **Status**: [x] completed
  case "$line" in
    "**Status**: [x]"*)
      if [ -n "$current_task" ] && [ -n "$current_phase" ]; then
        echo "$current_task:$current_phase" >> "$COMPLETED_TASKS_FILE"
        log_debug "Task $current_task ($current_phase) is completed"
      fi
      current_task=""
      current_phase=""
      ;;
  esac
done < "$TASKS_FILE"

# ============================================================================
# CHECK FOR VIOLATIONS
# ============================================================================

VIOLATIONS=""
VIOLATION_COUNT=0

# Helper to check if a task is completed with a specific phase
is_completed_with_phase() {
  local task_id="$1"
  local expected_phase="$2"
  grep -q "^${task_id}:${expected_phase}$" "$COMPLETED_TASKS_FILE" 2>/dev/null
}

# Check each completed task
while IFS=: read -r task_id phase; do
  [ -z "$task_id" ] && continue

  if [ "$phase" = "GREEN" ]; then
    # GREEN task completed - check if corresponding RED is done
    # Extract number, subtract 1, format back
    task_num=$(echo "$task_id" | sed 's/T-0*//')
    red_task_num=$((task_num - 1))
    red_task_id=$(printf "T-%03d" "$red_task_num")

    if ! is_completed_with_phase "$red_task_id" "RED"; then
      VIOLATIONS="$VIOLATIONS
   • $task_id (GREEN) completed but $red_task_id (RED) not found or not completed"
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      log_debug "VIOLATION: $task_id GREEN completed before $red_task_id RED"
    fi
  fi

  if [ "$phase" = "REFACTOR" ]; then
    # REFACTOR task completed - check if corresponding GREEN is done
    task_num=$(echo "$task_id" | sed 's/T-0*//')
    green_task_num=$((task_num - 1))
    green_task_id=$(printf "T-%03d" "$green_task_num")

    if ! is_completed_with_phase "$green_task_id" "GREEN"; then
      VIOLATIONS="$VIOLATIONS
   • $task_id (REFACTOR) completed but $green_task_id (GREEN) not found or not completed"
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      log_debug "VIOLATION: $task_id REFACTOR completed before $green_task_id GREEN"
    fi
  fi
done < "$COMPLETED_TASKS_FILE"

# ============================================================================
# OUTPUT WARNINGS
# ============================================================================

if [ "$VIOLATION_COUNT" -gt 0 ]; then
  echo ""
  echo "⚠️  TDD DISCIPLINE WARNING"
  echo "   ────────────────────────"
  echo "   Your increment is configured for TDD mode (testMode: TDD)"
  echo ""
  echo "   Potential violations detected:$VIOLATIONS"
  echo ""
  echo "   💡 TDD Best Practice: RED → GREEN → REFACTOR"
  echo "      1. 🔴 Write failing test FIRST"
  echo "      2. 🟢 Make test pass with minimal code"
  echo "      3. 🔵 Refactor while keeping tests green"
  echo ""

  # Log violations
  {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] TDD violations in $(basename "$INC_DIR"):"
    echo "$VIOLATIONS" | while IFS= read -r v; do
      [ -n "$v" ] && echo "  -$v"
    done
    echo ""
  } >> "$VIOLATION_LOG" 2>/dev/null || true
fi

# Always exit 0 - this is a warning-only hook
exit 0
