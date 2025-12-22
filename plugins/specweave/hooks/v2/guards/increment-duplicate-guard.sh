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
# Exit 0 = allow (with JSON), Exit 2 = block (with JSON)
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Read stdin for tool input
INPUT=$(cat 2>/dev/null || echo '{}')

# Extract file_path from the tool call
# Claude Code passes tool input in .tool_input.file_path format
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
fi

# Only care about .specweave/increments/ paths
if [[ "$FILE_PATH" != *.specweave/increments/* ]]; then
  echo '{"decision":"allow"}'
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
  echo '{"decision":"allow"}'
  exit 0
fi

# Extract the increment number from folder name (handles both 0121-name and 0121E-name)
INCREMENT_NUM=$(echo "$INCREMENT_FOLDER" | grep -oE '^[0-9]{3,4}' | head -1)

if [[ -z "$INCREMENT_NUM" ]]; then
  echo '{"decision":"allow"}'
  exit 0  # Not a standard increment folder pattern - allow
fi

# Normalize to 4 digits (strip leading zeros to avoid octal interpretation)
INCREMENT_NUM=$(printf "%04d" "$((10#$INCREMENT_NUM))")

# Find the increments root directory
INCREMENTS_DIR=$(echo "$FILE_PATH" | grep -o '.*/\.specweave/increments' | head -1)

if [[ ! -d "$INCREMENTS_DIR" ]]; then
  # Increments directory doesn't exist yet - first increment, allow creation
  echo '{"decision":"allow"}'
  exit 0
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

# If duplicates found, BLOCK the operation and provide the correct number to use
if [[ ${#FOUND_DUPLICATES[@]} -gt 0 ]]; then
  # Format duplicates for JSON
  DUP_LIST=""
  for DUP in "${FOUND_DUPLICATES[@]}"; do
    DUP_LIST="${DUP_LIST}\\n  - ${DUP}"
  done

  # Calculate the next available number using gap-filling strategy
  EXISTING_NUMS=$(find "$INCREMENTS_DIR" "$INCREMENTS_DIR/_archive" "$INCREMENTS_DIR/_abandoned" "$INCREMENTS_DIR/_paused" -maxdepth 1 -type d -name "[0-9]*-*" 2>/dev/null | xargs -I {} basename {} | grep -oE '^[0-9]{3,4}' | sort -n | uniq)
  NEXT_NUM=1
  while echo "$EXISTING_NUMS" | grep -q "^$(printf "%04d" $NEXT_NUM)$\|^$(printf "%03d" $NEXT_NUM)$"; do
    NEXT_NUM=$((NEXT_NUM + 1))
  done
  NEXT_NUM_PADDED=$(printf "%04d" $NEXT_NUM)

  # Extract the name part from the attempted folder
  FOLDER_NAME_PART=$(echo "$INCREMENT_FOLDER" | sed 's/^[0-9]\{3,4\}E\?-//')
  SUGGESTED_FOLDER="${NEXT_NUM_PADDED}-${FOLDER_NAME_PART}"

  printf '{"decision":"block","reason":"🚫 DUPLICATE INCREMENT ID - Use this instead:\\n\\n✅ CORRECT: %s\\n❌ ATTEMPTED: %s\\n\\nNumber %s already exists:%s\\n\\n🔧 IMMEDIATE FIX: Replace your file path with:\\n   .specweave/increments/%s/...\\n\\nThe guard calculated the next available number for you."}\n' "$SUGGESTED_FOLDER" "$INCREMENT_FOLDER" "$INCREMENT_NUM" "$DUP_LIST" "$SUGGESTED_FOLDER"
  exit 2  # Block the tool call
fi

# No duplicates - allow
echo '{"decision":"allow"}'
exit 0
