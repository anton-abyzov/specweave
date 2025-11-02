#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# SMART SESSION-END DETECTION (v2.0):
# =====================================
# Problem: Claude creates multiple todo lists in one conversation
# - List 1: [A, B, C] → completes → sound plays
# - List 2: [D, E] → completes 30s later → sound plays again
# - User hears sounds while Claude is still working!
#
# Solution: Inactivity-based detection
# - Track time gaps BETWEEN TodoWrite calls
# - If all tasks complete AND gap > INACTIVITY_THRESHOLD (15s)
#   → Session is winding down → Play sound
# - If rapid completions (gap < threshold)
#   → Claude still actively working → Skip sound
#
# Example:
# 10:00:00 - Task done (gap: 5s) → skip sound
# 10:00:05 - Task done (gap: 5s) → skip sound
# 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
# ...
# 10:01:00 - All done (gap: 50s) → PLAY SOUND! (session ending)
#
# DEBOUNCING: Prevents duplicate fires (Claude Code calls hooks twice)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# CONFIGURATION
# ============================================================================

# Debounce window to prevent duplicate hook fires
DEBOUNCE_SECONDS=2

# Inactivity threshold to detect session end
# If gap between TodoWrite calls > this value, assume session is ending
INACTIVITY_THRESHOLD=15  # seconds (configurable)

# File paths
LOGS_DIR=".specweave/logs"
LAST_FIRE_FILE="$LOGS_DIR/last-hook-fire"
LAST_TODOWRITE_FILE="$LOGS_DIR/last-todowrite-time"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
TASKS_LOG="$LOGS_DIR/tasks.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# DEBOUNCING
# ============================================================================

CURRENT_TIME=$(date +%s)

# Skip if hook fired within last N seconds (prevents duplicates)
if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    echo "[$(date)] ⏭️  Debounced (last fire: ${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
    cat <<EOF
{
  "continue": true
}
EOF
    exit 0
  fi
fi

echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# ============================================================================
# CAPTURE INPUT
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] 📋 TodoWrite hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# INACTIVITY DETECTION
# ============================================================================

INACTIVITY_GAP=0
PREVIOUS_TODOWRITE_TIME=0

if [ -f "$LAST_TODOWRITE_FILE" ]; then
  PREVIOUS_TODOWRITE_TIME=$(cat "$LAST_TODOWRITE_FILE" 2>/dev/null || echo "0")
  INACTIVITY_GAP=$((CURRENT_TIME - PREVIOUS_TODOWRITE_TIME))
  echo "[$(date)] ⏱️  Inactivity gap: ${INACTIVITY_GAP}s (threshold: ${INACTIVITY_THRESHOLD}s)" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] 🆕 First TodoWrite in session" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# Save current timestamp for next call
echo "$CURRENT_TIME" > "$LAST_TODOWRITE_FILE"

# ============================================================================
# PARSE TASK COMPLETION STATE
# ============================================================================

ALL_COMPLETED=false

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (more reliable)
  PENDING_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status != "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "1")
  TOTAL_COUNT=$(jq -r '.tool_input.todos // [] | length' "$STDIN_DATA" 2>/dev/null || echo "0")

  echo "[$(date)] 📊 Tasks: $((TOTAL_COUNT - PENDING_COUNT))/$TOTAL_COUNT completed" >> "$DEBUG_LOG" 2>/dev/null || true

  if [ "$PENDING_COUNT" = "0" ] && [ "$TOTAL_COUNT" != "0" ]; then
    ALL_COMPLETED=true
  fi
else
  # Fallback: Simple grep check (less reliable but works without jq)
  if grep -q '"status":"pending"\|"status":"in_progress"' "$STDIN_DATA" 2>/dev/null; then
    ALL_COMPLETED=false
  else
    ALL_COMPLETED=true
  fi
fi

rm -f "$STDIN_DATA"

# ============================================================================
# SESSION-END DETECTION LOGIC
# ============================================================================

SESSION_ENDING=false
DECISION_REASON=""

if [ "$ALL_COMPLETED" = "true" ]; then
  if [ "$INACTIVITY_GAP" -ge "$INACTIVITY_THRESHOLD" ]; then
    SESSION_ENDING=true
    DECISION_REASON="All tasks complete + ${INACTIVITY_GAP}s inactivity ≥ ${INACTIVITY_THRESHOLD}s threshold"
    echo "[$(date)] 🎉 SESSION ENDING DETECTED! ($DECISION_REASON)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    DECISION_REASON="All tasks complete, but rapid activity (${INACTIVITY_GAP}s < ${INACTIVITY_THRESHOLD}s) - Claude likely creating more work"
    echo "[$(date)] ⚡ $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  DECISION_REASON="Tasks remaining in current list"
  echo "[$(date)] 🔄 $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# PLAY SOUND (only if session is truly ending)
# ============================================================================

play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\chimes.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

if [ "$SESSION_ENDING" = "true" ]; then
  echo "[$(date)] 🔔 Playing completion sound" >> "$DEBUG_LOG" 2>/dev/null || true
  play_sound
fi

# ============================================================================
# LOGGING
# ============================================================================

echo "[$(date)] Status: All_completed=$ALL_COMPLETED, Session_ending=$SESSION_ENDING, Inactivity=${INACTIVITY_GAP}s" >> "$TASKS_LOG" 2>/dev/null || true
echo "[$(date)] Reason: $DECISION_REASON" >> "$TASKS_LOG" 2>/dev/null || true
echo "---" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

if [ "$SESSION_ENDING" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🎉 ALL WORK COMPLETED! Session ending detected (${INACTIVITY_GAP}s inactivity). Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
}
EOF
elif [ "$ALL_COMPLETED" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task batch completed (${INACTIVITY_GAP}s since last activity). Continuing work..."
}
EOF
else
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task completed. More tasks remaining - keep going!"
}
EOF
fi
