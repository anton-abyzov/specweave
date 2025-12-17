#!/bin/bash
# increment-duplicate-guard.sh - Block creation of duplicate increment IDs
#
# v0.33.0+: Prevents duplicate increment numbers (0121 and 0121 both existing)
# Also prevents 0001 and 0001E collisions (they share the same base number)
#
# PreToolUse hook for Write tool - BLOCKS the tool call if duplicate detected
#
# CRITICAL: This guards against the BUG where two increments get the same ID:
# - 0121-ado-jira-feature-parity-p2-p3
# - 0121-intelligent-living-docs-content
#
# Exit 0 = allow, Exit 2 = block
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Read stdin for tool input
INPUT=$(cat)

# Extract file_path from the tool call
# Claude Code passes tool input in .tool_input.file_path format
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
fi

# Only care about .specweave/increments/ paths
if [[ "$FILE_PATH" != *.specweave/increments/* ]]; then
  exit 0  # Not an increment file - allow
fi

# Extract the increment folder name from the path
# Pattern: .specweave/increments/XXXX-name/file.md or .specweave/increments/XXXX-name/subfolder/file
# We need to extract "XXXX-name" part

# Remove the .specweave/increments/ prefix
AFTER_INCREMENTS=${FILE_PATH#*.specweave/increments/}

# Get the first path component (the increment folder)
INCREMENT_FOLDER=$(echo "$AFTER_INCREMENTS" | cut -d'/' -f1)

# Skip special folders
if [[ "$INCREMENT_FOLDER" == "_archive" ]] || [[ "$INCREMENT_FOLDER" == "_abandoned" ]] || [[ "$INCREMENT_FOLDER" == "_paused" ]] || [[ "$INCREMENT_FOLDER" == "README.md" ]]; then
  exit 0
fi

# Extract the increment number from folder name (handles both 0121-name and 0121E-name)
INCREMENT_NUM=$(echo "$INCREMENT_FOLDER" | grep -oE '^[0-9]{3,4}' | head -1)

if [[ -z "$INCREMENT_NUM" ]]; then
  exit 0  # Not a standard increment folder pattern - allow
fi

# Normalize to 4 digits (strip leading zeros to avoid octal interpretation)
INCREMENT_NUM=$(printf "%04d" "$((10#$INCREMENT_NUM))")

# Find the increments root directory
INCREMENTS_DIR=$(echo "$FILE_PATH" | grep -o '.*/\.specweave/increments' | head -1)

if [[ ! -d "$INCREMENTS_DIR" ]]; then
  exit 0  # Increments directory doesn't exist yet - allow (first increment)
fi

# Scan ALL directories for existing increment with the same number
DIRS_TO_CHECK=(
  "$INCREMENTS_DIR"
  "$INCREMENTS_DIR/_archive"
  "$INCREMENTS_DIR/_abandoned"
  "$INCREMENTS_DIR/_paused"
)

FOUND_DUPLICATES=()

for DIR in "${DIRS_TO_CHECK[@]}"; do
  if [[ ! -d "$DIR" ]]; then
    continue
  fi

  # Find all folders matching this increment number (including E suffix variants)
  while IFS= read -r -d '' EXISTING_FOLDER; do
    EXISTING_NAME=$(basename "$EXISTING_FOLDER")

    # Extract number from existing folder
    EXISTING_NUM=$(echo "$EXISTING_NAME" | grep -oE '^[0-9]{3,4}' | head -1)

    if [[ -z "$EXISTING_NUM" ]]; then
      continue
    fi

    EXISTING_NUM=$(printf "%04d" "$((10#$EXISTING_NUM))")

    # Check if same base number (0121 matches 0121, 0121E, etc.)
    if [[ "$EXISTING_NUM" == "$INCREMENT_NUM" ]]; then
      # Skip if it's the exact same folder we're creating
      if [[ "$EXISTING_NAME" == "$INCREMENT_FOLDER" ]]; then
        continue
      fi

      # Found a duplicate!
      FOUND_DUPLICATES+=("$EXISTING_NAME (in $(basename "$DIR"))")
    fi
  done < <(find "$DIR" -maxdepth 1 -type d -name "${INCREMENT_NUM}*" -print0 2>/dev/null)
done

# If duplicates found, BLOCK the operation
if [[ ${#FOUND_DUPLICATES[@]} -gt 0 ]]; then
  echo ""
  echo "=============================================================================="
  echo "  BLOCKED: Duplicate increment ID detected (v0.33.0+)"
  echo "=============================================================================="
  echo ""
  echo "You are trying to create increment: $INCREMENT_FOLDER"
  echo "But increment number $INCREMENT_NUM already exists:"
  echo ""
  for DUP in "${FOUND_DUPLICATES[@]}"; do
    echo "  - $DUP"
  done
  echo ""
  echo "IMPORTANT: Increment IDs MUST be unique across all directories:"
  echo "  - Active increments"
  echo "  - Archived increments (_archive/)"
  echo "  - Abandoned increments (_abandoned/)"
  echo "  - Paused increments (_paused/)"
  echo ""
  echo "NOTE: 0001 and 0001E share the SAME base number and cannot coexist!"
  echo ""
  echo "TO FIX:"
  echo "1. Use a different increment number"
  echo "2. Get the next available number:"
  echo "   node -e \"import('./dist/core/increment/increment-utils.js').then(m => console.log(m.IncrementNumberManager.getNextIncrementNumber()))\""
  echo ""
  echo "=============================================================================="

  exit 2  # Block the tool call
fi

# No duplicates - allow
exit 0
