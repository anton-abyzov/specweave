#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# Actions:
# 1. Check if ALL tasks are completed (parse stdin JSON)
# 2. Play completion sound ONLY if all tasks done
# 3. Output JSON systemMessage reminding to update docs
# 4. Log completion
#
# DEBOUNCING: Prevents rapid duplicate fires (Claude Code calls hooks twice)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Debounce: Skip if hook fired within last 2 seconds
LAST_FIRE_FILE=".specweave/logs/last-hook-fire"
CURRENT_TIME=$(date +%s)
DEBOUNCE_SECONDS=2

mkdir -p .specweave/logs 2>/dev/null || true

if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    # Too soon - skip this invocation (prevents duplicates)
    echo "[$(date)] Hook skipped (debounced - last fire was ${TIME_DIFF}s ago)" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
    # Output minimal JSON (no systemMessage)
    cat <<EOF
{
  "continue": true
}
EOF
    exit 0
  fi
fi

# Save current timestamp
echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# Read stdin to temporary file
STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

# DEBUG: Log hook invocation
echo "[$(date)] Hook invoked! PWD=$PWD Args=$*" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
echo "[$(date)] Hook stdin:" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
cat "$STDIN_DATA" >> .specweave/logs/hooks-debug.log 2>/dev/null || true

# Parse JSON to check if ALL tasks are completed
# Extract todos array and check for any non-completed tasks
ALL_COMPLETED=false

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (more reliable)
  PENDING_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status != "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "1")

  if [ "$PENDING_COUNT" = "0" ]; then
    ALL_COMPLETED=true
  fi
else
  # Fallback: Simple grep check (less reliable but works without jq)
  if grep -q '"status":"pending"\|"status":"in_progress"' "$STDIN_DATA" 2>/dev/null; then
    ALL_COMPLETED=false
  else
    # No pending/in_progress found - likely all completed
    ALL_COMPLETED=true
  fi
fi

# Clean up temp file
rm -f "$STDIN_DATA"

# 1. Play notification sound ONLY if ALL tasks are completed
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

# Play sound ONLY if all tasks completed
if [ "$ALL_COMPLETED" = "true" ]; then
  echo "[$(date)] 🎉 ALL TASKS COMPLETED - Playing sound!" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
  play_sound
else
  echo "[$(date)] Task completed, but more tasks remain (no sound)" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
fi

# 2. Log completion
echo "[$(date)] Task completed (All done: $ALL_COMPLETED)" >> .specweave/logs/tasks.log 2>/dev/null || true

# 3. Output JSON to instruct Claude (systemMessage is shown to user)
if [ "$ALL_COMPLETED" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🎉 ALL TASKS COMPLETED! Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
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
