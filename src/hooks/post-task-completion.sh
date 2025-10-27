#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete
#
# Actions:
# 1. Play completion sound
# 2. Trigger docs-updater skill (if exists)
# 3. Update CLAUDE.md if needed
# 4. Log completion

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔔 Task Completed${NC}"

# 1. Play notification sound (cross-platform)
play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
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

play_sound &

# 2. Trigger docs-updater (if skill exists)
if [ -d "src/skills/docs-updater" ] || [ -d ".claude/skills/docs-updater" ]; then
  echo -e "${YELLOW}📝 docs-updater skill will update documentation${NC}"
fi

# 3. Check if CLAUDE.md needs update
if git diff --name-only | grep -qE "(\.specweave/|src/skills/)"; then
  echo -e "${YELLOW}📄 CLAUDE.md may need update (structural changes detected)${NC}"
fi

# 4. Log completion
mkdir -p .specweave/logs
echo "[$(date)] Task completed" >> .specweave/logs/tasks.log

echo -e "${GREEN}✅ Post-task-completion hook complete${NC}"
