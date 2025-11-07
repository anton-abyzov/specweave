#!/bin/bash

# SpecWeave Pre-Tool-Use Hook
# Runs BEFORE Claude calls any tool (PreToolUse event)
#
# PURPOSE: Detect when Claude asks questions via AskUserQuestion
# - Plays sound IMMEDIATELY when question is about to be asked
# - Complements post-task-completion hook (which only fires after TodoWrite)
# - Ensures user is always notified when Claude needs input
#
# SCOPE:
# - This hook fires for ALL tool calls (Read, Edit, Write, AskUserQuestion, etc.)
# - We filter for AskUserQuestion specifically to play sound
# - Non-blocking and fast (<10ms overhead)

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

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
  # Fallback
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# CAPTURE INPUT (Tool Call Details)
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

# Log the tool call for debugging
echo "[$(date)] 🔧 PreToolUse hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Tool call JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# DETECT AskUserQuestion TOOL
# ============================================================================

TOOL_NAME=""

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (most reliable)
  TOOL_NAME=$(jq -r '.tool_name // empty' "$STDIN_DATA" 2>/dev/null)
else
  # Fallback: grep-based detection
  if grep -q '"tool_name"' "$STDIN_DATA" 2>/dev/null; then
    TOOL_NAME=$(grep -o '"tool_name":"[^"]*"' "$STDIN_DATA" | cut -d'"' -f4)
  fi
fi

echo "[$(date)] Tool name: $TOOL_NAME" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# PLAY SOUND IF AskUserQuestion
# ============================================================================

play_sound() {
  case "$(uname -s)" in
    Darwin)
      # macOS: Use afplay with a distinctive sound for questions
      afplay /System/Library/Sounds/Tink.aiff 2>/dev/null || true
      ;;
    Linux)
      # Linux: Use paplay or aplay
      paplay /usr/share/sounds/freedesktop/stereo/dialog-question.oga 2>/dev/null || \
      paplay /usr/share/sounds/freedesktop/stereo/message-new-instant.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      # Windows: Use PowerShell
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\Windows Notify.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

if [ "$TOOL_NAME" = "AskUserQuestion" ]; then
  echo "[$(date)] 🔔 QUESTION DETECTED! Playing notification sound" >> "$DEBUG_LOG" 2>/dev/null || true
  play_sound

  # Log this event
  echo "[$(date)] Claude is asking for user input via AskUserQuestion" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# CLEANUP
# ============================================================================

rm -f "$STDIN_DATA"

# ============================================================================
# OUTPUT TO CLAUDE (Always continue)
# ============================================================================

if [ "$TOOL_NAME" = "AskUserQuestion" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🔔 Sound played - user notified of question request"
}
EOF
else
  cat <<EOF
{
  "continue": true
}
EOF
fi
