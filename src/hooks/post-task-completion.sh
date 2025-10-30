#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# Actions:
# 1. Play completion sound (synchronously, not background)
# 2. Output JSON systemMessage reminding to update docs
# 3. Log completion
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

# DEBUG: Log hook invocation
echo "[$(date)] Hook invoked! PWD=$PWD Args=$*" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
echo "[$(date)] Hook stdin:" >> .specweave/logs/hooks-debug.log 2>/dev/null || true
cat >> .specweave/logs/hooks-debug.log 2>/dev/null || true

# 1. Play notification sound SYNCHRONOUSLY (cross-platform)
play_sound() {
  case "$(uname -s)" in
    Darwin)
      # Play synchronously (remove &)
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

# Play sound FIRST (synchronously)
play_sound

# 2. Log completion
echo "[$(date)] Task completed" >> .specweave/logs/tasks.log 2>/dev/null || true

# 3. Output JSON to instruct Claude (systemMessage is shown to user)
cat <<EOF
{
  "continue": true,
  "systemMessage": "🔔 Task completed! Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
}
EOF
