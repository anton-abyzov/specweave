#!/bin/bash
# completion-guard.sh - Block direct editing of metadata.json to "completed" status
#
# v0.28.63+: Prevents the auto-completion bug by blocking direct status changes to completed.
# Status MUST go through ready_for_review first, and only /specweave:done can mark completed.
#
# PreToolUse hook - can BLOCK the tool call by returning non-zero exit code
#
# IMPORTANT: This is a safety guard. Exit 0 allows, exit 2 blocks.
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Read stdin for tool input
INPUT=$(cat)

# Check if this is editing metadata.json with status: completed
# Pattern: file_path contains metadata.json AND (new_string OR content) contains "status"..."completed"

# Extract file_path
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

# Only care about metadata.json files
if [[ "$FILE_PATH" != *metadata.json ]]; then
  exit 0  # Allow
fi

# Extract the content being written (new_string for Edit, content for Write)
NEW_CONTENT=$(echo "$INPUT" | grep -o '"new_string"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
if [[ -z "$NEW_CONTENT" ]]; then
  NEW_CONTENT=$(echo "$INPUT" | grep -o '"content"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
fi

# Check if trying to set status to "completed" directly
# This is a simple pattern match - if the edit/write contains status...completed
if echo "$NEW_CONTENT" | grep -q '"status"[[:space:]]*:[[:space:]]*"completed"'; then
  # Read current status from file to check if coming from ready_for_review
  if [[ -f "$FILE_PATH" ]]; then
    CURRENT_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$FILE_PATH" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

    if [[ "$CURRENT_STATUS" == "ready_for_review" ]]; then
      # This is a valid transition - allow
      exit 0
    fi
  fi

  # BLOCK - trying to set completed without going through ready_for_review
  cat << 'EOF'

==============================================================================
  BLOCKED: Direct status change to "completed" is not allowed (v0.28.63+)
==============================================================================

You cannot directly set status to "completed" in metadata.json.

This prevents the auto-completion bug where increments get marked as
completed without proper validation.

CORRECT WORKFLOW:
1. All tasks completed -> status auto-transitions to "ready_for_review"
2. Run /specweave:done <increment-id> with explicit user confirmation
3. Only then does status become "completed"

WHY THIS MATTERS:
- Ensures all ACs are checked in spec.md before closure
- Requires explicit user approval
- Maintains audit trail (approvedAt timestamp)

If you're implementing closure logic, use:
  MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED)

This will only succeed if current status is "ready_for_review".

==============================================================================
EOF

  exit 2  # Block the tool call
fi

# Allow other edits to metadata.json
exit 0
