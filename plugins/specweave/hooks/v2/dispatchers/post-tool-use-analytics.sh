#!/bin/bash
# post-tool-use-analytics.sh - Track Skill and Task tool usage for analytics
#
# PostToolUse hook for Skill|Task tools (separate from Edit|Write dispatcher)
# Extracts skill/agent info from stdin JSON and calls track-analytics.sh
#
# CRITICAL: Must exit 0, never block, run <5s

set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Project root detection
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Read stdin (tool result JSON)
INPUT=""
if command -v gtimeout >/dev/null 2>&1; then
  INPUT=$(gtimeout 1 cat 2>/dev/null || echo '{}')
elif command -v timeout >/dev/null 2>&1; then
  INPUT=$(timeout 1 cat 2>/dev/null || echo '{}')
else
  INPUT=$(cat 2>/dev/null || echo '{}')
fi

[[ -z "$INPUT" ]] && exit 0

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TRACK_SCRIPT="$PLUGIN_ROOT/scripts/track-analytics.sh"

[[ ! -f "$TRACK_SCRIPT" ]] && exit 0

# Detect active increment for context
ACTIVE_INCREMENT=""
CACHE_FILE="$PROJECT_ROOT/.specweave/state/status-line.json"
if [[ -f "$CACHE_FILE" ]] && command -v jq >/dev/null 2>&1; then
  ACTIVE_INCREMENT=$(jq -r '.incrementId // ""' "$CACHE_FILE" 2>/dev/null || echo "")
fi

# Extract tool_name
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

# Fallback: detect tool type from input fields
if [[ -z "$TOOL_NAME" ]]; then
  if echo "$INPUT" | grep -q '"skill"[[:space:]]*:'; then
    TOOL_NAME="Skill"
  elif echo "$INPUT" | grep -q '"subagent_type"[[:space:]]*:'; then
    TOOL_NAME="Task"
  fi
fi

case "$TOOL_NAME" in
  Skill)
    SKILL_NAME=$(echo "$INPUT" | grep -o '"skill"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
    [[ -z "$SKILL_NAME" ]] && exit 0

    # Extract plugin from skill name prefix
    PLUGIN="specweave"
    if [[ "$SKILL_NAME" == *:* ]]; then
      PREFIX="${SKILL_NAME%%:*}"
      if [[ "$PREFIX" != "sw" ]]; then
        PLUGIN="$PREFIX"
      fi
    fi

    bash "$TRACK_SCRIPT" skill "$SKILL_NAME" --plugin "$PLUGIN" --success --increment "$ACTIVE_INCREMENT" 2>/dev/null &
    ;;

  Task)
    AGENT_TYPE=$(echo "$INPUT" | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
    [[ -z "$AGENT_TYPE" ]] && AGENT_TYPE="general"

    bash "$TRACK_SCRIPT" agent "$AGENT_TYPE" --plugin specweave --success --increment "$ACTIVE_INCREMENT" 2>/dev/null &
    ;;
esac

exit 0
