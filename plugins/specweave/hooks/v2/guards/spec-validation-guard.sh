#!/bin/bash
# spec-validation-guard.sh - Consolidated spec.md and living docs validation
#
# COMBINES (v0.35.4+):
# - per-us-project-validator.sh (deleted) - Per-US **Project**: validation
# - spec-project-validator.sh (deleted) - Placeholder detection
# - project-folder-guard.sh (deleted) - Living docs folder validation
#
# Activation:
# - tool_name: Write
# - file_path matches: .specweave/increments/*/spec.md OR .specweave/docs/internal/specs/*/
#
# Exit 0 = allow (with JSON), Exit 2 = block (with JSON)
#
# Bypasses:
# - SPECWEAVE_DISABLE_HOOKS=1 - Disable all hooks
# - SPECWEAVE_FORCE_PROJECT=1 - Skip project validation
# - SPECWEAVE_FORCE_METADATA=1 - Skip all spec validation

set +e  # CRITICAL: Never use set -e in hooks

# Source shared library if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../lib"
if [[ -f "$LIB_DIR/common-setup.sh" ]]; then
  source "$LIB_DIR/common-setup.sh"
  init_pretool_guard || exit 0
else
  # Fallback inline implementation
  [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0
  HOOK_INPUT=$(cat 2>/dev/null || echo '{}')
  if ! command -v jq >/dev/null 2>&1; then
    echo '{"decision":"allow"}'
    exit 0
  fi
  HOOK_TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
  HOOK_FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // .file_path // ""' 2>/dev/null || echo "")
  HOOK_CONTENT=$(echo "$HOOK_INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""' 2>/dev/null || echo "")
fi

# Check bypass flags
[[ "$SPECWEAVE_FORCE_PROJECT" == "1" ]] && echo '{"decision":"allow","message":"Project validation bypassed"}' && exit 0
[[ "$SPECWEAVE_FORCE_METADATA" == "1" ]] && echo '{"decision":"allow","message":"Spec validation bypassed"}' && exit 0

# Only validate Write tool
[[ "$HOOK_TOOL_NAME" != "Write" ]] && echo '{"decision":"allow"}' && exit 0

# No file path = allow
[[ -z "$HOOK_FILE_PATH" ]] && echo '{"decision":"allow"}' && exit 0

# ============================================================================
# VALIDATION 1: spec.md placeholder detection
# ============================================================================
if [[ "$HOOK_FILE_PATH" =~ \.specweave/increments/[0-9]{3,4}E?-[^/]+/spec\.md$ ]]; then

  # Check for unresolved {{...}} placeholders
  if echo "$HOOK_CONTENT" | grep -qE '\{\{[A-Z_]+\}\}'; then
    PLACEHOLDERS=$(echo "$HOOK_CONTENT" | grep -oE '\{\{[A-Z_]+\}\}' | sort -u | tr '\n' ', ' | sed 's/,$//')
    printf '{"decision":"block","reason":"🚫 UNRESOLVED PLACEHOLDERS\\n\\nFound: %s\\n\\n🔧 FIX: Replace placeholders with actual values.\\nRun: specweave context projects\\nThen use values from the JSON output."}\n' "$PLACEHOLDERS"
    exit 2
  fi

  # Check for **Project**: field in User Stories (soft validation - warn, don't block)
  # Pattern: ### US-XXX or #### US-XXX followed by **Project**:
  US_COUNT=$(echo "$HOOK_CONTENT" | grep -cE '^#{3,4} US-' 2>/dev/null || echo "0")
  PROJECT_COUNT=$(echo "$HOOK_CONTENT" | grep -cE '^\*\*Project\*\*:' 2>/dev/null || echo "0")

  # Trim to just the number
  US_COUNT="${US_COUNT//[^0-9]/}"
  PROJECT_COUNT="${PROJECT_COUNT//[^0-9]/}"
  [[ -z "$US_COUNT" ]] && US_COUNT=0
  [[ -z "$PROJECT_COUNT" ]] && PROJECT_COUNT=0

  # Only warn if there are User Stories but no Project fields
  # Don't block - just allow with warning
  if [[ "$US_COUNT" -gt 0 ]] && [[ "$PROJECT_COUNT" -eq 0 ]]; then
    echo '{"decision":"allow","message":"⚠️ WARNING: No **Project**: fields found. Add **Project**: after each US heading for proper sync."}'
    exit 0
  fi

  # Check for comma-separated projects (forbidden - 1:1 mapping required)
  if echo "$HOOK_CONTENT" | grep -qE '^\*\*Project\*\*:.*,'; then
    printf '{"decision":"block","reason":"🚫 MULTIPLE PROJECTS IN ONE US\\n\\nEach User Story MUST map to exactly ONE project.\\n\\n🔧 FIX: Split cross-project features into separate User Stories:\\n\\nWRONG:\\n### US-001: OAuth Implementation\\n**Project**: frontend, backend\\n\\nCORRECT:\\n### US-001: OAuth Login Form\\n**Project**: frontend\\n\\n### US-002: OAuth API\\n**Project**: backend"}\n'
    exit 2
  fi

  echo '{"decision":"allow"}'
  exit 0
fi

# ============================================================================
# VALIDATION 2: Living docs folder validation
# ============================================================================
if [[ "$HOOK_FILE_PATH" =~ \.specweave/docs/internal/specs/([^/]+)/ ]]; then
  PROJECT_NAME="${BASH_REMATCH[1]}"

  # Skip README.md and _features/_archive special folders
  [[ "$PROJECT_NAME" == "README.md" ]] && echo '{"decision":"allow"}' && exit 0
  [[ "$PROJECT_NAME" == "_features" ]] && echo '{"decision":"allow"}' && exit 0
  [[ "$PROJECT_NAME" == "_archive" ]] && echo '{"decision":"allow"}' && exit 0

  # Check for template placeholders
  if [[ "$PROJECT_NAME" =~ \{\{.*\}\} ]]; then
    printf '{"decision":"block","reason":"🚫 UNRESOLVED PLACEHOLDER: %s\\n\\n🔧 FIX: Replace {{...}} with actual project name"}\n' "$PROJECT_NAME"
    exit 2
  fi

  # Check for comma-separated (invalid)
  if [[ "$PROJECT_NAME" =~ , ]]; then
    printf '{"decision":"block","reason":"🚫 COMMA-SEPARATED PROJECTS: %s\\n\\nEach User Story = ONE project folder.\\n\\n🔧 FIX: Split into separate specs"}\n' "$PROJECT_NAME"
    exit 2
  fi

  # Check for common example/placeholder names
  EXAMPLE_NAMES="frontend-app|backend-api|mobile-app|shared-lib|acme-corp|my-app|myapp|example-project|test-project"
  if [[ "$PROJECT_NAME" =~ ^($EXAMPLE_NAMES)$ ]]; then
    # Try to get valid projects from config
    PROJECT_ROOT="${HOOK_FILE_PATH%%/.specweave/*}"
    CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"

    if [[ -f "$CONFIG_FILE" ]]; then
      # Check if this example name is actually configured
      IS_CONFIGURED=$(jq -r --arg name "$PROJECT_NAME" '.multiProject.projects[$name] // .project.name == $name' "$CONFIG_FILE" 2>/dev/null || echo "false")

      if [[ "$IS_CONFIGURED" != "true" ]]; then
        VALID_PROJECTS=$(jq -r '.multiProject.projects | keys | join(", ") // .project.name // "specweave"' "$CONFIG_FILE" 2>/dev/null || echo "specweave")
        printf '{"decision":"block","reason":"🚫 EXAMPLE PROJECT NAME: %s\\n\\nThis looks like a placeholder/example name from documentation.\\n\\nConfigured projects: %s\\n\\n🔧 FIX: Edit spec.md and use a real project name"}\n' "$PROJECT_NAME" "$VALID_PROJECTS"
        exit 2
      fi
    fi
  fi

  echo '{"decision":"allow"}'
  exit 0
fi

# Not a spec.md or living docs file - allow
echo '{"decision":"allow"}'
exit 0
