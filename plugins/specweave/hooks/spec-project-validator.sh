#!/bin/bash
#
# spec-project-validator.sh
#
# Pre-tool-use hook that validates spec.md has required project/board fields
# before allowing Write tool to create/update spec.md files.
#
# Activation:
# - tool_name: Write
# - file_path matches: .specweave/increments/*/spec.md
#
# Rules:
# - 1-level structure: spec.md MUST have `project:` in YAML frontmatter
# - 2-level structure: spec.md MUST have BOTH `project:` AND `board:` in frontmatter
#
# Returns exit code 1 (block) if validation fails, 0 (allow) otherwise.

set -e

# Read tool input from stdin
INPUT=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only validate Write tool calls
if [ "$TOOL_NAME" != "Write" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only validate spec.md files in increments folder
if [[ ! "$FILE_PATH" =~ \.specweave/increments/[0-9]{4}-[^/]+/spec\.md$ ]]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract file content
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')

# Check if content has YAML frontmatter
if [[ ! "$CONTENT" =~ ^---$'\n' ]]; then
  echo '{"decision": "block", "reason": "spec.md must have YAML frontmatter (starting with ---)"}'
  exit 0
fi

# Extract YAML frontmatter
FRONTMATTER=$(echo "$CONTENT" | sed -n '/^---$/,/^---$/p' | tail -n +2 | head -n -1)

# Check for unresolved project placeholder
if echo "$FRONTMATTER" | grep -q 'project:\s*{{PROJECT_ID}}'; then
  echo '{"decision": "block", "reason": "spec.md has unresolved placeholder {{PROJECT_ID}}. Run STEP 0B to select project before creating spec.md."}'
  exit 0
fi

# Check for unresolved board placeholder
if echo "$FRONTMATTER" | grep -q 'board:\s*{{BOARD_ID}}'; then
  echo '{"decision": "block", "reason": "spec.md has unresolved placeholder {{BOARD_ID}}. Run STEP 0B to select board before creating spec.md."}'
  exit 0
fi

# Check for project field
PROJECT=$(echo "$FRONTMATTER" | grep -E '^project:\s*' | sed 's/^project:\s*//' | tr -d '"'"'" | tr -d '[:space:]')

# Detect structure level by checking config
PROJECT_ROOT="${FILE_PATH%%/.specweave/*}"
CONFIG_PATH="$PROJECT_ROOT/.specweave/config.json"

IS_2_LEVEL=false

if [ -f "$CONFIG_PATH" ]; then
  # Check for ADO area path mapping (indicates 2-level)
  if jq -e '.sync.profiles | to_entries[] | select(.value.provider == "ado") | .value.config.areaPathMapping.mappings | length > 0' "$CONFIG_PATH" >/dev/null 2>&1; then
    IS_2_LEVEL=true
  fi

  # Check for ADO areaPaths (indicates 2-level)
  if jq -e '.sync.profiles | to_entries[] | select(.value.provider == "ado") | .value.config.areaPaths | length > 0' "$CONFIG_PATH" >/dev/null 2>&1; then
    IS_2_LEVEL=true
  fi
fi

# Validation based on structure level
if [ "$IS_2_LEVEL" = true ]; then
  # 2-level: BOTH project AND board required
  if [ -z "$PROJECT" ] || [ "$PROJECT" = "null" ]; then
    echo '{"decision": "block", "reason": "spec.md missing required '\''project:'\'' field in YAML frontmatter. This is a 2-level structure - add '\''project: <project_name>'\'' to frontmatter."}'
    exit 0
  fi

  BOARD=$(echo "$FRONTMATTER" | grep -E '^board:\s*' | sed 's/^board:\s*//' | tr -d '"'"'" | tr -d '[:space:]')

  if [ -z "$BOARD" ] || [ "$BOARD" = "null" ]; then
    echo '{"decision": "block", "reason": "spec.md missing required '\''board:'\'' field in YAML frontmatter. This is a 2-level structure - add '\''board: <board_name>'\'' to frontmatter."}'
    exit 0
  fi
else
  # 1-level: project is strongly recommended (warning, not block)
  if [ -z "$PROJECT" ] || [ "$PROJECT" = "null" ]; then
    # For 1-level, we warn but don't block (backward compatibility)
    echo '{"decision": "allow", "message": "⚠️  spec.md should have '\''project:'\'' field in YAML frontmatter for explicit sync target."}'
    exit 0
  fi
fi

# All validations passed
echo '{"decision": "allow"}'
exit 0
