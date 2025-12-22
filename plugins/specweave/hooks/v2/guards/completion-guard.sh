#!/bin/bash
# completion-guard.sh - Block direct editing of metadata.json to "completed" status
#
# v0.28.63+: Prevents the auto-completion bug by blocking direct status changes to completed.
# Status MUST go through ready_for_review first, and only /sw:done can mark completed.
#
# PreToolUse hook - can BLOCK the tool call by returning non-zero exit code
#
# IMPORTANT: This is a safety guard. Exit 0 allows, exit 2 blocks.
# All exit paths MUST output JSON for proper Claude Code handling.
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Read stdin for tool input
INPUT=$(cat 2>/dev/null || echo '{}')

# Check if this is editing metadata.json with status: completed
# Pattern: file_path contains metadata.json AND (new_string OR content) contains "status"..."completed"

# Extract file_path
# Claude Code passes tool input in .tool_input.file_path format
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
fi

# Only care about metadata.json files
if [[ "$FILE_PATH" != *metadata.json ]]; then
  echo '{"decision":"allow"}'
  exit 0  # Allow
fi

# Extract the content being written (new_string for Edit, content for Write)
# Claude Code passes tool input in .tool_input format
if command -v jq &> /dev/null; then
  NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // .new_string // .content // empty' 2>/dev/null)
else
  NEW_CONTENT=$(echo "$INPUT" | grep -o '"new_string"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
  if [[ -z "$NEW_CONTENT" ]]; then
    NEW_CONTENT=$(echo "$INPUT" | grep -o '"content"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
  fi
fi

# Check if trying to set status to "completed" directly
# This is a simple pattern match - if the edit/write contains status...completed
if echo "$NEW_CONTENT" | grep -q '"status"[[:space:]]*:[[:space:]]*"completed"'; then
  # Read current status from file to check if coming from ready_for_review
  if [[ -f "$FILE_PATH" ]]; then
    CURRENT_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$FILE_PATH" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

    if [[ "$CURRENT_STATUS" == "ready_for_review" ]]; then
      # This is a valid transition - allow
      echo '{"decision":"allow"}'
      exit 0
    fi
  fi

  # BLOCK - trying to set completed without going through ready_for_review
  cat << 'BLOCK_EOF'
{
  "decision": "block",
  "reason": "🚫 BLOCKED: Direct status change to \"completed\" is not allowed (v0.28.63+)\n\nYou cannot directly set status to \"completed\" in metadata.json.\n\nCORRECT WORKFLOW:\n1. All tasks completed → status auto-transitions to \"ready_for_review\"\n2. Run /sw:done <increment-id> with explicit user confirmation\n3. Only then does status become \"completed\"\n\nWHY THIS MATTERS:\n• Ensures all ACs are checked in spec.md before closure\n• Requires explicit user approval\n• Maintains audit trail (approvedAt timestamp)\n\n🔧 If implementing closure logic, use:\n  MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED)"
}
BLOCK_EOF
  exit 2  # Block the tool call
fi

# Allow other edits to metadata.json
echo '{"decision":"allow"}'
exit 0
