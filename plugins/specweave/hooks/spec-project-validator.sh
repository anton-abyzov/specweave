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
# - Project MUST exist in configuration (validated via specweave context projects)
# - Board MUST exist under project for 2-level (validated via specweave context boards)
#
# Returns exit code 1 (block) if validation fails, 0 (allow) otherwise.
#
# Bypass: Set SPECWEAVE_FORCE_PROJECT=1 to skip validation

set -e

# Check for force bypass
if [ "$SPECWEAVE_FORCE_PROJECT" = "1" ]; then
  echo '{"decision": "allow", "message": "⚠️  Project validation bypassed (SPECWEAVE_FORCE_PROJECT=1)"}'
  exit 0
fi

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
# Match: 3-4 digits, optional E suffix, kebab-case name, spec.md
if [[ ! "$FILE_PATH" =~ \.specweave/increments/[0-9]{3,4}E?-[^/]+/spec\.md$ ]]; then
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

# Check for unresolved project placeholder (legacy {{PROJECT_ID}})
if echo "$FRONTMATTER" | grep -q 'project:\s*{{PROJECT_ID}}'; then
  echo '{"decision": "block", "reason": "spec.md has unresolved placeholder {{PROJECT_ID}}. Run '\''specweave context projects'\'' to get available projects, then select one."}'
  exit 0
fi

# Check for unresolved board placeholder (legacy {{BOARD_ID}})
if echo "$FRONTMATTER" | grep -q 'board:\s*{{BOARD_ID}}'; then
  echo '{"decision": "block", "reason": "spec.md has unresolved placeholder {{BOARD_ID}}. Run '\''specweave context boards --project=<id>'\'' to get available boards, then select one."}'
  exit 0
fi

# Check for ANY unresolved {{...}} placeholder in frontmatter (v0.34.0+)
# This catches {{RESOLVED_PROJECT}}, {{RESOLVED_BOARD}}, and any other placeholders
if echo "$FRONTMATTER" | grep -qE '\{\{[A-Z_]+\}\}'; then
  FOUND_PLACEHOLDERS=$(echo "$FRONTMATTER" | grep -oE '\{\{[A-Z_]+\}\}' | tr '\n' ', ' | sed 's/,$//')
  echo "{\"decision\": \"block\", \"reason\": \"spec.md has unresolved placeholders: ${FOUND_PLACEHOLDERS}\\n\\nYOU MUST RESOLVE these BEFORE creating spec.md:\\n1. Run: specweave context projects\\n2. Parse the JSON output to get valid project/board IDs\\n3. Replace placeholders with actual values from step 2\\n\\n❌ FORBIDDEN: Using placeholder templates directly\\n✅ REQUIRED: Resolve ALL placeholders to actual values\"}"
  exit 0
fi

# Check for ANY unresolved {{...}} placeholder in full content (catches per-US **Project**: {{...}})
if echo "$CONTENT" | grep -qE '\*\*Project\*\*:\s*\{\{[A-Z_]+\}\}'; then
  FOUND_PLACEHOLDERS=$(echo "$CONTENT" | grep -oE '\*\*Project\*\*:\s*\{\{[A-Z_]+\}\}' | head -1)
  echo "{\"decision\": \"block\", \"reason\": \"spec.md has unresolved **Project**: placeholder\\n\\nFound: ${FOUND_PLACEHOLDERS}\\n\\nEach user story MUST have a resolved **Project**: field.\\n\\n1. Run: specweave context projects\\n2. Get valid project IDs from the JSON output\\n3. Replace the placeholder with an actual project ID\"}"
  exit 0
fi

# Check for unresolved **Board**: placeholders in full content (2-level structures)
if echo "$CONTENT" | grep -qE '\*\*Board\*\*:\s*\{\{[A-Z_]+\}\}'; then
  FOUND_PLACEHOLDERS=$(echo "$CONTENT" | grep -oE '\*\*Board\*\*:\s*\{\{[A-Z_]+\}\}' | head -1)
  echo "{\"decision\": \"block\", \"reason\": \"spec.md has unresolved **Board**: placeholder\\n\\nFound: ${FOUND_PLACEHOLDERS}\\n\\nEach user story MUST have a resolved **Board**: field (for 2-level structures).\\n\\n1. Run: specweave context projects\\n2. Get valid board IDs from boardsByProject in the JSON output\\n3. Replace the placeholder with an actual board ID\"}"
  exit 0
fi

# Extract project and board from frontmatter
PROJECT=$(echo "$FRONTMATTER" | grep -E '^project:\s*' | sed 's/^project:\s*//' | tr -d '"'"'" | tr -d '[:space:]')
BOARD=$(echo "$FRONTMATTER" | grep -E '^board:\s*' | sed 's/^board:\s*//' | tr -d '"'"'" | tr -d '[:space:]')

# Get project root from file path
PROJECT_ROOT="${FILE_PATH%%/.specweave/*}"

# Change to project root for specweave command
cd "$PROJECT_ROOT" 2>/dev/null || true

# Get project context via CLI command
CONTEXT_OUTPUT=$(specweave context projects 2>/dev/null || echo '{"level": 1, "projects": []}')

# Parse structure level
STRUCTURE_LEVEL=$(echo "$CONTEXT_OUTPUT" | jq -r '.level // 1')

# Parse available projects
AVAILABLE_PROJECTS=$(echo "$CONTEXT_OUTPUT" | jq -r '.projects[].id // empty' | tr '\n' ', ' | sed 's/,$//')

# Validation based on structure level
if [ "$STRUCTURE_LEVEL" = "2" ]; then
  # 2-level: BOTH project AND board required

  # Check project field exists
  if [ -z "$PROJECT" ] || [ "$PROJECT" = "null" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"spec.md missing required 'project:' field in YAML frontmatter.\\n\\n2-level structure detected.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS:-none detected}\\n\\nAdd 'project: <project_name>' to frontmatter.\\n\\nRun 'specweave context projects' to see all options.\"}"
    exit 0
  fi

  # Check board field exists
  if [ -z "$BOARD" ] || [ "$BOARD" = "null" ]; then
    # Get available boards for the project
    AVAILABLE_BOARDS=$(specweave context boards --project="$PROJECT" 2>/dev/null | jq -r '.boards[].id // empty' | tr '\n' ', ' | sed 's/,$//')

    echo "{\"decision\": \"block\", \"reason\": \"spec.md missing required 'board:' field in YAML frontmatter.\\n\\n2-level structure detected (project: ${PROJECT}).\\n\\nAvailable boards: ${AVAILABLE_BOARDS:-none detected}\\n\\nAdd 'board: <board_name>' to frontmatter.\\n\\nRun 'specweave context boards --project=${PROJECT}' to see all options.\"}"
    exit 0
  fi

  # Validate project exists in configuration
  PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id == $proj)' 2>/dev/null)
  if [ -z "$PROJECT_EXISTS" ]; then
    # Try case-insensitive match
    PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id | ascii_downcase == ($proj | ascii_downcase))' 2>/dev/null)
  fi

  if [ -z "$PROJECT_EXISTS" ] && [ -n "$AVAILABLE_PROJECTS" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"Project '${PROJECT}' not found in configuration.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS}\\n\\nEither:\\n1. Update project: field to a valid project\\n2. Set SPECWEAVE_FORCE_PROJECT=1 to bypass validation\"}"
    exit 0
  fi

  # Validate board exists under project
  BOARDS_OUTPUT=$(specweave context boards --project="$PROJECT" 2>/dev/null || echo '{"boards": []}')
  BOARD_EXISTS=$(echo "$BOARDS_OUTPUT" | jq --arg board "$BOARD" '.boards[] | select(.id == $board)' 2>/dev/null)

  if [ -z "$BOARD_EXISTS" ]; then
    # Try case-insensitive match
    BOARD_EXISTS=$(echo "$BOARDS_OUTPUT" | jq --arg board "$BOARD" '.boards[] | select(.id | ascii_downcase == ($board | ascii_downcase))' 2>/dev/null)
  fi

  AVAILABLE_BOARDS=$(echo "$BOARDS_OUTPUT" | jq -r '.boards[].id // empty' | tr '\n' ', ' | sed 's/,$//')

  if [ -z "$BOARD_EXISTS" ] && [ -n "$AVAILABLE_BOARDS" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"Board '${BOARD}' not found under project '${PROJECT}'.\\n\\nAvailable boards: ${AVAILABLE_BOARDS}\\n\\nEither:\\n1. Update board: field to a valid board\\n2. Set SPECWEAVE_FORCE_PROJECT=1 to bypass validation\"}"
    exit 0
  fi

else
  # 1-level: project is REQUIRED (not just recommended)

  if [ -z "$PROJECT" ] || [ "$PROJECT" = "null" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"spec.md missing required 'project:' field in YAML frontmatter.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS:-none detected}\\n\\nAdd 'project: <project_name>' to frontmatter.\\n\\nRun 'specweave context projects' to see all options.\"}"
    exit 0
  fi

  # Validate project exists in configuration (if we have projects configured)
  if [ -n "$AVAILABLE_PROJECTS" ]; then
    PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id == $proj)' 2>/dev/null)
    if [ -z "$PROJECT_EXISTS" ]; then
      # Try case-insensitive match
      PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id | ascii_downcase == ($proj | ascii_downcase))' 2>/dev/null)
    fi

    if [ -z "$PROJECT_EXISTS" ]; then
      echo "{\"decision\": \"block\", \"reason\": \"Project '${PROJECT}' not found in configuration.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS}\\n\\nEither:\\n1. Update project: field to a valid project\\n2. Set SPECWEAVE_FORCE_PROJECT=1 to bypass validation\"}"
      exit 0
    fi
  fi
fi

# All validations passed
echo '{"decision": "allow"}'
exit 0
