#!/bin/bash
#
# per-us-project-validator.sh
#
# Pre-tool-use hook that validates EACH User Story in spec.md has
# **Project**: (and **Board**: for 2-level) fields.
#
# This is the CRITICAL ENFORCEMENT for increment 0137.
#
# Activation:
# - tool_name: Write (also Edit if full content provided)
# - file_path matches: .specweave/increments/*/spec.md
#
# Rules:
# - Each US section MUST have **Project**: <value> on next few lines
# - For 2-level structures, each US MUST also have **Board**: <value>
# - Project values MUST match configured projects (not generic keywords)
# - Supports ALL US formats:
#   - ### US-001: (simple)
#   - #### US-001: (4 hashes)
#   - ### US-FE-001: (with project prefix)
#   - #### US-FE-001: (multi-project)
#   - #### US-BE-001: (backend)
#   - #### US-SHARED-001: (shared)
# - Fallback allowed for existing specs via SPECWEAVE_LEGACY_SPEC=1
#
# Returns exit code 1 (block) if validation fails, 0 (allow) otherwise.
#
# Bypass:
# - SPECWEAVE_FORCE_PROJECT=1 - Skip all project validation
# - SPECWEAVE_LEGACY_SPEC=1 - Allow specs without per-US project (legacy mode)
#
# v0.34.0 - Fixed to handle all US ID formats (US-001, US-FE-001, etc.)

set -e

# Source common utilities if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="${SCRIPT_DIR}/../.."

# Logging (silent by default)
log_debug() {
  if [ "$SPECWEAVE_DEBUG" = "1" ]; then
    echo "[per-us-project] $*" >&2
  fi
}

# Check for force bypass
if [ "$SPECWEAVE_FORCE_PROJECT" = "1" ]; then
  echo '{"decision": "allow", "message": "⚠️  Per-US project validation bypassed (SPECWEAVE_FORCE_PROJECT=1)"}'
  exit 0
fi

# Check for legacy mode bypass
if [ "$SPECWEAVE_LEGACY_SPEC" = "1" ]; then
  echo '{"decision": "allow", "message": "⚠️  Per-US project validation skipped (SPECWEAVE_LEGACY_SPEC=1 - legacy mode)"}'
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only validate Write tool calls (Edit doesn't provide full content)
if [ "$TOOL_NAME" != "Write" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only validate spec.md files in increments folder
if [[ ! "$FILE_PATH" =~ \.specweave/increments/[0-9]{3,4}E?-[^/]+/spec\.md$ ]]; then
  echo '{"decision": "allow"}'
  exit 0
fi

log_debug "Validating per-US project fields for: $FILE_PATH"

# Extract file content
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')

# Count User Stories - support ALL formats:
# - ### US-001: (simple, 3 hashes)
# - #### US-001: (4 hashes)
# - ### US-FE-001: (with project prefix like FE, BE, SHARED)
# - #### US-FE-001: (multi-project with 4 hashes)
# Pattern: 3-4 hashes, space, US-, optional prefix (letters+dash), digits, colon
US_PATTERN='^#{3,4} US-([A-Z]+-)?[0-9]+:'
TOTAL_US=$(echo "$CONTENT" | grep -cE "$US_PATTERN" || echo 0)

log_debug "Total User Stories found: $TOTAL_US"

# If no user stories, allow (might be tasks-only spec or overview)
if [ "$TOTAL_US" -eq 0 ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract User Story sections and check for **Project**: field
# Strategy: For each US heading, look at next 10 lines for **Project**:

MISSING_PROJECT=()
MISSING_BOARD=()
MULTI_PROJECT=()   # USs with multiple projects (comma-separated)
MULTI_BOARD=()     # USs with multiple boards (comma-separated)
US_WITH_PROJECT=0

# Use grep to find all US headings (both ### and ####, with or without prefix)
while IFS= read -r us_line; do
  # Extract US ID - handles US-001, US-FE-001, US-BE-001, US-SHARED-001, etc.
  US_ID=$(echo "$us_line" | grep -oE 'US-([A-Z]+-)?[0-9]+' | head -1)

  if [ -z "$US_ID" ]; then
    continue
  fi

  # Get line number of this US heading (works with both ### and ####)
  # Escape the US_ID for grep (the dash needs no escape, but be safe)
  LINE_NUM=$(echo "$CONTENT" | grep -nE "^#{3,4} ${US_ID}:" | head -1 | cut -d: -f1)

  if [ -z "$LINE_NUM" ]; then
    log_debug "Could not find line number for $US_ID"
    continue
  fi

  # Extract lines after heading UNTIL next US heading, separator (---), or max 15 lines
  # This prevents reading **Project** from a DIFFERENT user story
  SECTION=""
  line_count=0
  while IFS= read -r line; do
    # Stop at next US heading (### US- or #### US-)
    if [[ "$line" =~ ^#{3,4}\ US- ]] && [ "$line_count" -gt 0 ]; then
      break
    fi
    # Stop at separator
    if [[ "$line" =~ ^---$ ]] && [ "$line_count" -gt 0 ]; then
      break
    fi
    # Max 15 lines
    if [ "$line_count" -ge 15 ]; then
      break
    fi
    SECTION+="$line"$'\n'
    line_count=$((line_count + 1))
  done < <(echo "$CONTENT" | tail -n +$((LINE_NUM + 1)))

  # Check for **Project**: field within this US section only
  PROJECT_LINE=$(echo "$SECTION" | grep -E '^\*\*Project\*\*:\s*\S' | head -1)

  if [ -n "$PROJECT_LINE" ]; then
    US_WITH_PROJECT=$((US_WITH_PROJECT + 1))

    # Extract project value
    PROJECT_VALUE=$(echo "$PROJECT_LINE" | sed 's/^\*\*Project\*\*:\s*//' | tr -d '[:space:]')

    # Check for comma (multiple projects - FORBIDDEN)
    if echo "$PROJECT_VALUE" | grep -q ','; then
      MULTI_PROJECT+=("$US_ID (has: $PROJECT_VALUE)")
      log_debug "$US_ID has MULTIPLE projects (FORBIDDEN): $PROJECT_VALUE"
    else
      log_debug "$US_ID has **Project**: field ✓ ($PROJECT_VALUE)"
    fi
  else
    MISSING_PROJECT+=("$US_ID")
    log_debug "$US_ID MISSING **Project**: field ✗"
  fi

done < <(echo "$CONTENT" | grep -E "^#{3,4} US-([A-Z]+-)?[0-9]+:")

log_debug "User Stories with **Project**: $US_WITH_PROJECT / $TOTAL_US"

# Get project root for structure detection
PROJECT_ROOT="${FILE_PATH%%/.specweave/*}"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Get structure level from config
STRUCTURE_LEVEL=1
if command -v specweave >/dev/null 2>&1; then
  CONTEXT_OUTPUT=$(specweave context projects 2>/dev/null || echo '{"level": 1}')
  STRUCTURE_LEVEL=$(echo "$CONTEXT_OUTPUT" | jq -r '.level // 1')
  AVAILABLE_PROJECTS=$(echo "$CONTEXT_OUTPUT" | jq -r '.projects[].id // empty' | tr '\n' ', ' | sed 's/,$//')
else
  # Fallback: check for 2-level indicators in config
  if [ -f "$PROJECT_ROOT/.specweave/config.json" ]; then
    HAS_AREA_PATH=$(jq -r '.sync.profiles | to_entries | map(select(.value.config.areaPathMapping or .value.config.areaPaths)) | length' "$PROJECT_ROOT/.specweave/config.json" 2>/dev/null || echo 0)
    HAS_BOARD_MAPPING=$(jq -r '.sync.profiles | to_entries | map(select(.value.config.boardMapping.boards | length > 0)) | length' "$PROJECT_ROOT/.specweave/config.json" 2>/dev/null || echo 0)

    if [ "$HAS_AREA_PATH" -gt 0 ] || [ "$HAS_BOARD_MAPPING" -gt 0 ]; then
      STRUCTURE_LEVEL=2
    fi
  fi
fi

log_debug "Structure level: $STRUCTURE_LEVEL"

# For 2-level structures, also check for **Board**: field
if [ "$STRUCTURE_LEVEL" = "2" ]; then
  while IFS= read -r us_line; do
    # Extract US ID - handles all formats (US-001, US-FE-001, etc.)
    US_ID=$(echo "$us_line" | grep -oE 'US-([A-Z]+-)?[0-9]+' | head -1)

    if [ -z "$US_ID" ]; then
      continue
    fi

    # Get line number (works with both ### and ####)
    LINE_NUM=$(echo "$CONTENT" | grep -nE "^#{3,4} ${US_ID}:" | head -1 | cut -d: -f1)

    if [ -z "$LINE_NUM" ]; then
      log_debug "Could not find line number for $US_ID (board check)"
      continue
    fi

    # Extract lines after heading UNTIL next US heading, separator, or max 15 lines
    SECTION=""
    line_count=0
    while IFS= read -r line; do
      # Stop at next US heading
      if [[ "$line" =~ ^#{3,4}\ US- ]] && [ "$line_count" -gt 0 ]; then
        break
      fi
      # Stop at separator
      if [[ "$line" =~ ^---$ ]] && [ "$line_count" -gt 0 ]; then
        break
      fi
      # Max 15 lines
      if [ "$line_count" -ge 15 ]; then
        break
      fi
      SECTION+="$line"$'\n'
      line_count=$((line_count + 1))
    done < <(echo "$CONTENT" | tail -n +$((LINE_NUM + 1)))

    # Check for **Board**: field within this US section only
    BOARD_LINE=$(echo "$SECTION" | grep -E '^\*\*Board\*\*:\s*\S' | head -1)

    if [ -n "$BOARD_LINE" ]; then
      # Extract board value
      BOARD_VALUE=$(echo "$BOARD_LINE" | sed 's/^\*\*Board\*\*:\s*//' | tr -d '[:space:]')

      # Check for comma (multiple boards - FORBIDDEN)
      if echo "$BOARD_VALUE" | grep -q ','; then
        MULTI_BOARD+=("$US_ID (has: $BOARD_VALUE)")
        log_debug "$US_ID has MULTIPLE boards (FORBIDDEN): $BOARD_VALUE"
      else
        log_debug "$US_ID has **Board**: field ✓ ($BOARD_VALUE)"
      fi
    else
      MISSING_BOARD+=("$US_ID")
      log_debug "$US_ID MISSING **Board**: field ✗"
    fi

  done < <(echo "$CONTENT" | grep -E "^#{3,4} US-([A-Z]+-)?[0-9]+:")
fi

# Build error message if validation fails
ERRORS=""

if [ ${#MISSING_PROJECT[@]} -gt 0 ]; then
  MISSING_LIST=$(printf ", %s" "${MISSING_PROJECT[@]}")
  MISSING_LIST=${MISSING_LIST:2}  # Remove leading ", "

  ERRORS="$ERRORS\n❌ User Stories MISSING **Project**: field:\n   ${MISSING_LIST}\n"
  ERRORS="$ERRORS\n   Each User Story MUST have **Project**: <project_id> after the heading.\n"
  ERRORS="$ERRORS\n   Example:\n"
  ERRORS="$ERRORS   ### US-001: Login Form\n"
  ERRORS="$ERRORS   **Project**: frontend-app\n"

  if [ -n "$AVAILABLE_PROJECTS" ]; then
    ERRORS="$ERRORS\n   Available projects: ${AVAILABLE_PROJECTS}\n"
  fi
fi

if [ ${#MISSING_BOARD[@]} -gt 0 ]; then
  MISSING_LIST=$(printf ", %s" "${MISSING_BOARD[@]}")
  MISSING_LIST=${MISSING_LIST:2}

  ERRORS="$ERRORS\n❌ User Stories MISSING **Board**: field (2-level structure):\n   ${MISSING_LIST}\n"
  ERRORS="$ERRORS\n   For 2-level structures, each US MUST have **Board**: <board_id>\n"
  ERRORS="$ERRORS\n   Example:\n"
  ERRORS="$ERRORS   ### US-001: Login Form\n"
  ERRORS="$ERRORS   **Project**: acme-corp\n"
  ERRORS="$ERRORS   **Board**: mobile-team\n"
fi

# Check for multiple projects (1:1 violation)
if [ ${#MULTI_PROJECT[@]} -gt 0 ]; then
  MULTI_LIST=$(printf ", %s" "${MULTI_PROJECT[@]}")
  MULTI_LIST=${MULTI_LIST:2}

  ERRORS="$ERRORS\n❌ User Stories with MULTIPLE projects (FORBIDDEN - 1:1 mapping required):\n   ${MULTI_LIST}\n"
  ERRORS="$ERRORS\n   Each User Story MUST map to EXACTLY ONE project.\n"
  ERRORS="$ERRORS   Split cross-project features into separate USs:\n"
  ERRORS="$ERRORS\n   WRONG:\n"
  ERRORS="$ERRORS   ### US-001: OAuth Implementation\n"
  ERRORS="$ERRORS   **Project**: frontend-app, backend-api  ← FORBIDDEN\n"
  ERRORS="$ERRORS\n   CORRECT:\n"
  ERRORS="$ERRORS   ### US-001: OAuth Login Form\n"
  ERRORS="$ERRORS   **Project**: frontend-app\n"
  ERRORS="$ERRORS\n   ### US-002: OAuth API Endpoints\n"
  ERRORS="$ERRORS   **Project**: backend-api\n"
fi

# Check for multiple boards (1:1 violation)
if [ ${#MULTI_BOARD[@]} -gt 0 ]; then
  MULTI_LIST=$(printf ", %s" "${MULTI_BOARD[@]}")
  MULTI_LIST=${MULTI_LIST:2}

  ERRORS="$ERRORS\n❌ User Stories with MULTIPLE boards (FORBIDDEN - 1:1 mapping required):\n   ${MULTI_LIST}\n"
  ERRORS="$ERRORS\n   Each User Story MUST map to EXACTLY ONE board.\n"
  ERRORS="$ERRORS   Split cross-board features into separate USs.\n"
fi

# If errors found, block the write
if [ -n "$ERRORS" ]; then
  # Add bypass instructions
  ERRORS="$ERRORS\n💡 To bypass this validation:\n"
  ERRORS="$ERRORS   - SPECWEAVE_FORCE_PROJECT=1 (skip all validation)\n"
  ERRORS="$ERRORS   - SPECWEAVE_LEGACY_SPEC=1 (allow specs without per-US project)\n"

  # Escape for JSON
  REASON=$(echo -e "$ERRORS" | jq -Rs .)

  echo "{\"decision\": \"block\", \"reason\": $REASON}"
  exit 0
fi

# All validations passed
log_debug "All $TOTAL_US User Stories have required fields ✓"
echo '{"decision": "allow"}'
exit 0
