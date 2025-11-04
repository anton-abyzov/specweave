#!/bin/bash

# SpecWeave Human-Input-Required Hook
# Runs when Claude needs clarification or approval
#
# Actions:
# 1. Play notification sound (Ping.aiff)
# 2. Log the question/requirement
# 3. Record in current increment's work log (if applicable)

set -e

# Find project root by searching upward for .specweave/ directory
# Works regardless of where hook is installed (source or .claude/hooks/)
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT"

# Get question/requirement (passed as argument or default)
QUESTION="${1:-User input required}"

echo "❓ Human input required"

# 1. Play notification sound (cross-platform)
play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Ping.aiff 2>/dev/null &
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/dialog-question.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Side_Left.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\notify.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

play_sound &

# 2. Log to main hooks log
LOGS_DIR=".specweave/logs"
mkdir -p "$LOGS_DIR"
echo "[$(date)] Human input required: $QUESTION" >> "$LOGS_DIR/hooks.log"

# 3. Log to current work context (if exists)
CURRENT_WORK=$(find .specweave/work -maxdepth 1 -type d -name "current-*" | head -1 || true)

if [ -n "$CURRENT_WORK" ] && [ -d "$CURRENT_WORK" ]; then
    echo "" >> "$CURRENT_WORK/notes.md"
    echo "## Input Required ($(date +%Y-%m-%d\ %H:%M))" >> "$CURRENT_WORK/notes.md"
    echo "" >> "$CURRENT_WORK/notes.md"
    echo "$QUESTION" >> "$CURRENT_WORK/notes.md"
    echo "" >> "$CURRENT_WORK/notes.md"
    echo "📝 Logged to $CURRENT_WORK/notes.md"
fi

echo "✅ Hook complete"
