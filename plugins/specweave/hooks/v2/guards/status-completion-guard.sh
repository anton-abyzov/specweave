#!/bin/bash
# status-completion-guard.sh - Prevents direct status changes to "completed"
#
# RULE: Increment status should NEVER be changed to "completed" directly!
#
# ALLOWED paths to completion:
# 1. /sw:done command (validates ACs, tests, docs)
# 2. /sw:auto mode when all tests pass (auto-verified closure)
#
# @since 1.0.196
# @see CLAUDE.md "Status Workflow" section

set -e

INPUT=$(cat)

# Extract tool parameters
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
OLD_STRING=$(echo "$INPUT" | jq -r '.tool_input.old_string // ""')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // ""')

# Only check Edit operations on metadata.json files
if [[ "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Only check metadata.json files in increments
if [[ ! "$FILE_PATH" =~ \.specweave/increments/.*/metadata\.json$ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if this is a status change to "completed"
# Pattern: "status": "active" -> "status": "completed"
# Or: "status": "paused" -> "status": "completed"
# Or: "status": "ready_for_review" -> "status": "completed"
if echo "$NEW_STRING" | grep -qE '"status":\s*"completed"'; then
  # Check if auto-mode is active with verified completion
  AUTO_STATE_FILE=".specweave/state/auto/session.json"
  if [[ -f "$AUTO_STATE_FILE" ]]; then
    AUTO_STATUS=$(jq -r '.status // "unknown"' "$AUTO_STATE_FILE" 2>/dev/null || echo "unknown")
    AUTO_VERIFIED=$(jq -r '.testsVerified // false' "$AUTO_STATE_FILE" 2>/dev/null || echo "false")

    # Allow if auto-mode is active AND tests are verified
    if [[ "$AUTO_STATUS" == "active" && "$AUTO_VERIFIED" == "true" ]]; then
      echo '{"decision":"allow"}'
      exit 0
    fi
  fi

  # Check if called from /sw:done command (look for marker file)
  DONE_MARKER=".specweave/state/.sw-done-in-progress"
  if [[ -f "$DONE_MARKER" ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi

  # Extract increment ID for the message
  INCREMENT_ID=$(echo "$FILE_PATH" | grep -oE '[0-9]{4}[E]?-[^/]+' || echo "unknown")

  # Block the direct status change
  cat << EOF
{
  "decision": "block",
  "reason": "Direct status change to 'completed' is blocked",
  "systemMessage": "⛔ **STATUS PROTECTION ACTIVE**\\n\\n❌ Cannot directly edit metadata.json to set status='completed'\\n\\n**Why?** Completion requires validation:\\n- All tasks marked complete\\n- Acceptance criteria satisfied\\n- Tests passing\\n- Documentation updated\\n\\n**Correct approach:**\\n\`\`\`\\n/sw:done ${INCREMENT_ID}\\n\`\`\`\\n\\nOr in auto-mode:\\n\`\`\`\\n/sw:auto ${INCREMENT_ID}\\n\`\`\`\\n(auto-closes when all tests pass)"
}
EOF
  exit 0
fi

echo '{"decision":"allow"}'
exit 0
