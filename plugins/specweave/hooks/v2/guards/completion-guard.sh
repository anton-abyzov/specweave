#!/bin/bash
# completion-guard.sh - Block direct editing of metadata.json to "completed" status
#
# v0.28.63+: Prevents the auto-completion bug by blocking direct status changes to completed.
# Status MUST go through ready_for_review first, and only /sw:done can mark completed.
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
  echo ""
  echo "=============================================================================="
  echo "  BLOCKED: Direct status change to \"completed\" is not allowed (v0.28.63+)"
  echo "=============================================================================="
  echo ""
  echo "You cannot directly set status to \"completed\" in metadata.json."
  echo ""
  echo "This prevents the auto-completion bug where increments get marked as"
  echo "completed without proper validation."
  echo ""
  echo "CORRECT WORKFLOW:"
  echo "1. All tasks completed -> status auto-transitions to \"ready_for_review\""
  echo "2. Run /sw:done <increment-id> with explicit user confirmation"
  echo "3. Only then does status become \"completed\""
  echo ""
  echo "WHY THIS MATTERS:"
  echo "- Ensures all ACs are checked in spec.md before closure"
  echo "- Requires explicit user approval"
  echo "- Maintains audit trail (approvedAt timestamp)"
  echo ""
  echo "If you're implementing closure logic, use:"
  echo "  MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED)"
  echo ""
  echo "This will only succeed if current status is \"ready_for_review\"."
  echo ""
  echo "=============================================================================="

  exit 2  # Block the tool call
fi

# Allow other edits to metadata.json
exit 0
