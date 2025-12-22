#!/usr/bin/env bash
# Project Folder Guard (Pre-tool-use Hook)
# Prevents creation of project folders unless project exists in config.json
#
# Triggers: Write tool creating files in .specweave/docs/internal/specs/{project}/
# Blocks: Project folders not in config.json multiProject.projects
# Version: 0.35.1+ (Enhanced with example project detection)
#
# CRITICAL v0.35.1: Added detection of common example project names
# These are NEVER allowed unless explicitly configured:
# - frontend-app, backend-api, mobile-app, shared-lib (common examples)
# - acme-corp, my-app, myapp (placeholder names)
# - Comma-separated values like "frontend-app, backend-api"
# - Placeholder patterns like {{PROJECT_ID}}
#
# SAFETY: Uses set +e to prevent cascading failures
# Exit 0 = allow, Exit 2 = block (never use exit 1!)

set +e  # CRITICAL: Never use set -e or pipefail in hooks (causes cascading failures)

# Kill switch check
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Read stdin for tool input (Claude Code passes JSON via stdin)
INPUT=$(cat 2>/dev/null || echo '{}')

# Extract tool name - Claude Code passes it at top level
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || echo "")

# Only check Write tool operations to specs/ folder
if [ "$TOOL_NAME" != "Write" ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Extract file_path from tool_input (correct structure for Claude Code hooks)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if writing to specs folder
if [[ ! "$FILE_PATH" =~ \.specweave/docs/internal/specs/([^/]+)/ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Extract project name from path
PROJECT_NAME="${BASH_REMATCH[1]}"

# Skip validation for README.md in specs root
if [ "$PROJECT_NAME" = "README.md" ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# CRITICAL v0.35.1: Check for template placeholders like {{PROJECT_ID}}
if [[ "$PROJECT_NAME" =~ \{\{.*\}\} ]]; then
  printf '{"decision":"block","reason":"🚫 BLOCKED: Unresolved placeholder detected: %s\\n\\nProject name contains template placeholder syntax: {{ ... }}\\nThis is NOT a valid project name.\\n\\n🔧 Edit spec.md and replace {{...}} with your actual project name"}\n' "$PROJECT_NAME"
  exit 2
fi

# CRITICAL v0.35.1: Check for comma-separated values (invalid format)
if [[ "$PROJECT_NAME" =~ , ]]; then
  printf '{"decision":"block","reason":"🚫 BLOCKED: Comma-separated project names detected: %s\\n\\nEach User Story must have exactly ONE project.\\nMultiple comma-separated projects are NOT allowed.\\n\\n🔧 Split into separate User Stories, one per project"}\n' "$PROJECT_NAME"
  exit 2
fi

# CRITICAL v0.35.1: Check for parentheses (often seen in examples)
if [[ "$PROJECT_NAME" =~ \( || "$PROJECT_NAME" =~ \) ]]; then
  printf '{"decision":"block","reason":"🚫 BLOCKED: Invalid characters in project name: %s\\n\\nProject names cannot contain parentheses.\\nThis looks like an example/documentation string.\\n\\n🔧 Use a valid kebab-case project name (e.g., my-project)"}\n' "$PROJECT_NAME"
  exit 2
fi

# CRITICAL v0.35.1: Check ProjectRegistry FIRST (.specweave/state/projects.json)
# This is the single source of truth for projects (v0.35.0+)
REGISTRY_FILE=".specweave/state/projects.json"
CONFIG_FILE=".specweave/config.json"

# CRITICAL v0.35.1: List of known example project names
# These are blocked UNLESS explicitly registered
EXAMPLE_PROJECTS="frontend-app backend-api mobile-app shared-lib acme-corp my-app myapp example-project sample-project test-project demo placeholder per default"

# Check if project is in example list (case-insensitive)
PROJECT_NAME_LOWER=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')
IS_EXAMPLE="false"
for EXAMPLE in $EXAMPLE_PROJECTS; do
  if [ "$PROJECT_NAME_LOWER" = "$EXAMPLE" ]; then
    IS_EXAMPLE="true"
    break
  fi
done

# PRIMARY: Check ProjectRegistry (projects.json)
if [ -f "$REGISTRY_FILE" ]; then
  # Get all project IDs from registry
  REGISTRY_PROJECTS=$(jq -r '.projects | keys[]' "$REGISTRY_FILE" 2>/dev/null || echo "")

  if [ -n "$REGISTRY_PROJECTS" ]; then
    # Check if project exists in registry (case-insensitive)
    PROJECT_IN_REGISTRY="false"
    for REG_PROJECT in $REGISTRY_PROJECTS; do
      REG_PROJECT_LOWER=$(echo "$REG_PROJECT" | tr '[:upper:]' '[:lower:]')
      if [ "$PROJECT_NAME_LOWER" = "$REG_PROJECT_LOWER" ]; then
        PROJECT_IN_REGISTRY="true"
        break
      fi
    done

    if [ "$PROJECT_IN_REGISTRY" = "true" ]; then
      # Project exists in registry - ALLOW
      echo '{"decision":"allow"}'
      exit 0
    fi

    # Project NOT in registry
    VALID_PROJECTS=$(echo "$REGISTRY_PROJECTS" | tr '\n' ', ' | sed 's/,$//')

    if [ "$IS_EXAMPLE" = "true" ]; then
      printf '{"decision":"block","reason":"🚫 BLOCKED: Example project name detected: %s\\n\\n%s is a common example/placeholder name used in documentation.\\nIt was likely extracted from example User Stories in spec.md.\\n\\n⚠️ This is NOT a real project - it is a documentation example!\\n\\nRegistered projects: %s\\n\\n🔧 How to fix:\\n1. Edit the spec.md file and update **Project**: fields\\n2. Replace example names with a registered project\\n3. Re-run the sync command"}\n' "$PROJECT_NAME" "$PROJECT_NAME" "$VALID_PROJECTS"
    else
      printf '{"decision":"block","reason":"🚫 BLOCKED: Project %s not in registry\\n\\nProject %s is NOT registered in .specweave/state/projects.json\\n\\nRegistered projects: %s\\n\\n🔧 To add this project:\\nspecweave project add %s --name Project Display Name"}\n' "$PROJECT_NAME" "$PROJECT_NAME" "$VALID_PROJECTS" "$PROJECT_NAME"
    fi
    exit 2
  fi
fi

# FALLBACK: Check config.json if registry doesn't exist or is empty
if [ ! -f "$CONFIG_FILE" ]; then
  # Allow if no config found (safer than blocking)
  echo '{"decision":"allow","message":"WARNING: Neither projects.json nor config.json found - allowing operation"}'
  exit 0
fi

# Check if multi-project mode is enabled
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode - only allow configured project name
  ALLOWED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE")

  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
    # Special message for example projects
    if [ "$IS_EXAMPLE" = "true" ]; then
      printf '{"decision":"block","reason":"🚫 BLOCKED: Example project name detected: %s\\n\\n%s is a common example/placeholder name used in documentation.\\nIt was likely extracted from example User Stories in spec.md.\\n\\n⚠️ This is NOT a real project - it is a documentation example!\\n\\n🔧 How to fix:\\n1. Edit the spec.md file and update **Project**: fields\\n2. Replace example names with: %s\\n3. Re-run the sync command"}\n' "$PROJECT_NAME" "$PROJECT_NAME" "$ALLOWED_PROJECT"
    else
      printf '{"decision":"block","reason":"🚫 BLOCKED: Project folder creation for %s\\n\\nThis repository is in SINGLE-PROJECT mode.\\nOnly folder allowed: %s\\n\\n💡 To add new projects:\\n1. Run: specweave config set multiProject.enabled true\\n2. Run: specweave config set multiProject.projects.%s.id %s\\n3. Re-run your command"}\n' "$PROJECT_NAME" "$ALLOWED_PROJECT" "$PROJECT_NAME" "$PROJECT_NAME"
    fi
    exit 2
  fi

  echo '{"decision":"allow"}'
  exit 0
fi

# Multi-project mode - check if project exists in config
if jq -e ".multiProject.projects.\"$PROJECT_NAME\"" "$CONFIG_FILE" &>/dev/null; then
  PROJECT_EXISTS="true"
else
  PROJECT_EXISTS="false"
fi

if [ "$PROJECT_EXISTS" = "false" ]; then
  # Get list of valid projects
  VALID_PROJECTS=$(jq -r '.multiProject.projects | keys[]' "$CONFIG_FILE" 2>/dev/null | tr '\n' ', ' | sed 's/,$//' || echo "")

  # Special message for example projects
  if [ "$IS_EXAMPLE" = "true" ]; then
    printf '{"decision":"block","reason":"🚫 BLOCKED: Example project name detected: %s\\n\\n%s is a common example/placeholder name used in documentation.\\nIt was likely extracted from example User Stories in spec.md.\\n\\n⚠️ This is NOT a real project - it is a documentation example!\\n\\nValid projects: %s\\n\\n🔧 How to fix:\\n1. Edit the spec.md file and update **Project**: fields\\n2. Replace example names with a configured project\\n3. Re-run the sync command"}\n' "$PROJECT_NAME" "$PROJECT_NAME" "$VALID_PROJECTS"
  else
    printf '{"decision":"block","reason":"🚫 BLOCKED: Project folder creation for %s\\n\\nProject %s is NOT configured in .specweave/config.json\\n\\nValid projects: %s\\n\\n🔧 How to fix:\\n• If this is a NEW project, add it to config:\\n  specweave config set multiProject.projects.%s.id %s"}\n' "$PROJECT_NAME" "$PROJECT_NAME" "$VALID_PROJECTS" "$PROJECT_NAME" "$PROJECT_NAME"
  fi
  exit 2
fi

# Project exists - allow creation
echo '{"decision":"allow"}'
exit 0
