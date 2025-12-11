#!/bin/bash
#
# spec-project-validator.sh
#
# Pre-tool-use hook that validates spec.md project/board configuration
# before allowing Write tool to create/update spec.md files.
#
# Activation:
# - tool_name: Write
# - file_path matches: .specweave/increments/*/spec.md
#
# Rules (ADR-0140 v0.35.0+):
# - Frontmatter `project:` and `board:` fields are OPTIONAL (deprecated)
# - Per-US `**Project**:` and `**Board**:` fields are the PRIMARY source
# - Validates no unresolved {{...}} placeholders exist
# - Single-project mode: frontmatter project must match config if present
# - Multi-project mode: validates projects exist in config if referenced
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

# Check if single-project or multi-project mode (NEW - v0.34.0+)
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE" 2>/dev/null || echo "false")

# Get project context via CLI command
CONTEXT_OUTPUT=$(specweave context projects 2>/dev/null || echo '{"level": 1, "projects": []}')

# Parse structure level
STRUCTURE_LEVEL=$(echo "$CONTEXT_OUTPUT" | jq -r '.level // 1')

# Parse available projects
AVAILABLE_PROJECTS=$(echo "$CONTEXT_OUTPUT" | jq -r '.projects[].id // empty' | tr '\n' ', ' | sed 's/,$//')

# NEW (v0.34.0+): Single-project mode validation
if [ "$MULTI_PROJECT_ENABLED" = "false" ]; then
  # Single-project mode: project field is OPTIONAL
  # If provided, validate it matches config.project.name
  CONFIGURED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE" 2>/dev/null)

  if [ -n "$PROJECT" ] && [ "$PROJECT" != "null" ] && [ "$PROJECT" != "$CONFIGURED_PROJECT" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"spec.md has project: '${PROJECT}' but config has project.name: '${CONFIGURED_PROJECT}'.\\n\\nIn single-project mode, the project: field MUST match config.project.name OR be omitted.\\n\\nFix:\\n1. Remove project: field (recommended for single-project mode)\\n2. OR change to: project: ${CONFIGURED_PROJECT}\\n3. OR enable multi-project mode: /specweave:enable-multiproject\"}"
    exit 0
  fi

  # ALWAYS block board: field in single-project mode
  if [ -n "$BOARD" ] && [ "$BOARD" != "null" ]; then
    echo "{\"decision\": \"block\", \"reason\": \"spec.md has board: field but this is a SINGLE-PROJECT repository.\\n\\nThe board: field is ONLY for multi-project mode.\\n\\nFix:\\n1. Remove the board: field\\n2. OR enable multi-project mode: /specweave:enable-multiproject\"}"
    exit 0
  fi

  # All validations passed for single-project mode
  echo '{"decision": "allow"}'
  exit 0
fi

# Multi-project mode validation continues below
# ADR-0140 (v0.35.0+): Frontmatter project/board fields are OPTIONAL
# Per-US fields are the PRIMARY source of truth

# Validation based on structure level
if [ "$STRUCTURE_LEVEL" = "2" ]; then
  # 2-level: Frontmatter project/board are OPTIONAL (per-US fields are primary)

  # If project is provided in frontmatter, validate it exists
  if [ -n "$PROJECT" ] && [ "$PROJECT" != "null" ]; then
    PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id == $proj)' 2>/dev/null)
    if [ -z "$PROJECT_EXISTS" ]; then
      # Try case-insensitive match
      PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id | ascii_downcase == ($proj | ascii_downcase))' 2>/dev/null)
    fi

    if [ -z "$PROJECT_EXISTS" ] && [ -n "$AVAILABLE_PROJECTS" ]; then
      echo "{\"decision\": \"block\", \"reason\": \"Frontmatter project '${PROJECT}' not found in configuration.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS}\\n\\nFix:\\n1. Remove project: field (recommended - use per-US **Project**: instead)\\n2. OR update to a valid project\\n3. OR set SPECWEAVE_FORCE_PROJECT=1 to bypass\"}"
      exit 0
    fi
  fi

  # If board is provided in frontmatter, validate it exists under project
  if [ -n "$BOARD" ] && [ "$BOARD" != "null" ]; then
    # Need project to validate board
    if [ -z "$PROJECT" ] || [ "$PROJECT" = "null" ]; then
      echo "{\"decision\": \"block\", \"reason\": \"Frontmatter has board: '${BOARD}' but no project: field.\\n\\nIf using board: you must also specify project:.\\n\\nRecommended: Remove both and use per-US **Project**: and **Board**: fields instead.\"}"
      exit 0
    fi

    BOARDS_OUTPUT=$(specweave context boards --project="$PROJECT" 2>/dev/null || echo '{"boards": []}')
    BOARD_EXISTS=$(echo "$BOARDS_OUTPUT" | jq --arg board "$BOARD" '.boards[] | select(.id == $board)' 2>/dev/null)

    if [ -z "$BOARD_EXISTS" ]; then
      # Try case-insensitive match
      BOARD_EXISTS=$(echo "$BOARDS_OUTPUT" | jq --arg board "$BOARD" '.boards[] | select(.id | ascii_downcase == ($board | ascii_downcase))' 2>/dev/null)
    fi

    AVAILABLE_BOARDS=$(echo "$BOARDS_OUTPUT" | jq -r '.boards[].id // empty' | tr '\n' ', ' | sed 's/,$//')

    if [ -z "$BOARD_EXISTS" ] && [ -n "$AVAILABLE_BOARDS" ]; then
      echo "{\"decision\": \"block\", \"reason\": \"Frontmatter board '${BOARD}' not found under project '${PROJECT}'.\\n\\nAvailable boards: ${AVAILABLE_BOARDS}\\n\\nFix:\\n1. Remove board: field (recommended - use per-US **Board**: instead)\\n2. OR update to a valid board\\n3. OR set SPECWEAVE_FORCE_PROJECT=1 to bypass\"}"
      exit 0
    fi
  fi

else
  # 1-level multi-project: Frontmatter project is OPTIONAL (per-US fields are primary)

  # If project is provided in frontmatter, validate it exists
  if [ -n "$PROJECT" ] && [ "$PROJECT" != "null" ] && [ -n "$AVAILABLE_PROJECTS" ]; then
    PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id == $proj)' 2>/dev/null)
    if [ -z "$PROJECT_EXISTS" ]; then
      # Try case-insensitive match
      PROJECT_EXISTS=$(echo "$CONTEXT_OUTPUT" | jq --arg proj "$PROJECT" '.projects[] | select(.id | ascii_downcase == ($proj | ascii_downcase))' 2>/dev/null)
    fi

    if [ -z "$PROJECT_EXISTS" ]; then
      echo "{\"decision\": \"block\", \"reason\": \"Frontmatter project '${PROJECT}' not found in configuration.\\n\\nAvailable projects: ${AVAILABLE_PROJECTS}\\n\\nFix:\\n1. Remove project: field (recommended - use per-US **Project**: instead)\\n2. OR update to a valid project\\n3. OR set SPECWEAVE_FORCE_PROJECT=1 to bypass\"}"
      exit 0
    fi
  fi
fi

# All validations passed
echo '{"decision": "allow"}'
exit 0
