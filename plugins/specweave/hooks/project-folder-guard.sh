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

set -euo pipefail

TOOL_NAME="$1"
shift
TOOL_ARGS="$*"

# Only check Write tool operations to specs/ folder
if [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

# Extract file_path from tool args (JSON format)
FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if writing to specs folder
if [[ ! "$FILE_PATH" =~ \.specweave/docs/internal/specs/([^/]+)/ ]]; then
  exit 0
fi

# Extract project name from path
PROJECT_NAME="${BASH_REMATCH[1]}"

# Skip validation for README.md in specs root
if [ "$PROJECT_NAME" = "README.md" ]; then
  exit 0
fi

# CRITICAL v0.35.1: Check for template placeholders like {{PROJECT_ID}}
if [[ "$PROJECT_NAME" =~ \{\{.*\}\} ]]; then
  echo "❌ BLOCKED: Unresolved placeholder detected: '$PROJECT_NAME'"
  echo ""
  echo "   Project name contains template placeholder syntax: {{ ... }}"
  echo "   This is NOT a valid project name."
  echo ""
  echo "   🔧 Edit spec.md and replace {{...}} with your actual project name"
  exit 1
fi

# CRITICAL v0.35.1: Check for comma-separated values (invalid format)
if [[ "$PROJECT_NAME" =~ , ]]; then
  echo "❌ BLOCKED: Comma-separated project names detected: '$PROJECT_NAME'"
  echo ""
  echo "   Each User Story must have exactly ONE project."
  echo "   Multiple comma-separated projects are NOT allowed."
  echo ""
  echo "   🔧 Split into separate User Stories, one per project"
  exit 1
fi

# CRITICAL v0.35.1: Check for parentheses (often seen in examples)
if [[ "$PROJECT_NAME" =~ \( || "$PROJECT_NAME" =~ \) ]]; then
  echo "❌ BLOCKED: Invalid characters in project name: '$PROJECT_NAME'"
  echo ""
  echo "   Project names cannot contain parentheses."
  echo "   This looks like an example/documentation string."
  echo ""
  echo "   🔧 Use a valid kebab-case project name (e.g., my-project)"
  exit 1
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
      exit 0
    fi

    # Project NOT in registry
    VALID_PROJECTS=$(echo "$REGISTRY_PROJECTS" | tr '\n' ', ' | sed 's/,$//')

    if [ "$IS_EXAMPLE" = "true" ]; then
      echo "❌ BLOCKED: Example project name detected: '$PROJECT_NAME'"
      echo ""
      echo "   '$PROJECT_NAME' is a common example/placeholder name used in documentation."
      echo "   It was likely extracted from example User Stories in spec.md."
      echo ""
      echo "   ⚠️  This is NOT a real project - it's a documentation example!"
      echo ""
      echo "   Registered projects: $VALID_PROJECTS"
      echo ""
      echo "   🔧 How to fix:"
      echo "   1. Edit the spec.md file and update **Project**: fields"
      echo "   2. Replace example names with a registered project"
      echo "   3. Re-run the sync command"
    else
      echo "❌ BLOCKED: Project '$PROJECT_NAME' not in registry"
      echo ""
      echo "   Project '$PROJECT_NAME' is NOT registered in .specweave/state/projects.json"
      echo ""
      echo "   Registered projects: $VALID_PROJECTS"
      echo ""
      echo "   🔧 To add this project:"
      echo "   specweave project add $PROJECT_NAME --name \"Project Display Name\""
    fi
    exit 1
  fi
fi

# FALLBACK: Check config.json if registry doesn't exist or is empty
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ ERROR: Neither projects.json nor config.json found"
  echo "   Cannot validate project folder creation without configuration"
  exit 1
fi

# Check if multi-project mode is enabled
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode - only allow configured project name
  ALLOWED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE")

  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
    # Special message for example projects
    if [ "$IS_EXAMPLE" = "true" ]; then
      echo "❌ BLOCKED: Example project name detected: '$PROJECT_NAME'"
      echo ""
      echo "   '$PROJECT_NAME' is a common example/placeholder name used in documentation."
      echo "   It was likely extracted from example User Stories in spec.md."
      echo ""
      echo "   ⚠️  This is NOT a real project - it's a documentation example!"
      echo ""
      echo "   🔧 How to fix:"
      echo "   1. Edit the spec.md file and update **Project**: fields"
      echo "   2. Replace example names with: $ALLOWED_PROJECT"
      echo "   3. Re-run the sync command"
      echo ""
      echo "   📋 Example fix in spec.md:"
      echo "   BEFORE: **Project**: $PROJECT_NAME  ← EXAMPLE (WRONG)"
      echo "   AFTER:  **Project**: $ALLOWED_PROJECT  ← Your actual project"
      echo ""
    else
      echo "❌ BLOCKED: Project folder creation for '$PROJECT_NAME'"
      echo ""
      echo "   This repository is in SINGLE-PROJECT mode."
      echo "   Only folder allowed: $ALLOWED_PROJECT"
      echo ""
      echo "   Current config (.specweave/config.json):"
      echo "   {"
      echo "     \"project\": { \"name\": \"$ALLOWED_PROJECT\" },"
      echo "     \"multiProject\": { \"enabled\": false }"
      echo "   }"
      echo ""
      echo "   ⚠️  If '$PROJECT_NAME' is an example/placeholder in spec.md, update it to:"
      echo "   **Project**: $ALLOWED_PROJECT"
      echo ""
      echo "   💡 To add new projects:"
      echo "   1. Run: specweave config set multiProject.enabled true"
      echo "   2. Run: specweave config set multiProject.projects.$PROJECT_NAME.id \"$PROJECT_NAME\""
      echo "   3. Re-run your command"
    fi
    exit 1
  fi

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
    echo "❌ BLOCKED: Example project name detected: '$PROJECT_NAME'"
    echo ""
    echo "   '$PROJECT_NAME' is a common example/placeholder name used in documentation."
    echo "   It was likely extracted from example User Stories in spec.md."
    echo ""
    echo "   ⚠️  This is NOT a real project - it's a documentation example!"
    echo ""
    if [ -n "$VALID_PROJECTS" ]; then
      echo "   Valid projects: $VALID_PROJECTS"
      echo ""
    fi
    echo "   🔧 How to fix:"
    echo "   1. Edit the spec.md file and update **Project**: fields"
    echo "   2. Replace example names with a configured project"
    echo "   3. Re-run the sync command"
    echo ""
  else
    echo "❌ BLOCKED: Project folder creation for '$PROJECT_NAME'"
    echo ""
    echo "   Project '$PROJECT_NAME' is NOT configured in .specweave/config.json"
    echo ""
    if [ -n "$VALID_PROJECTS" ]; then
      echo "   Valid projects: $VALID_PROJECTS"
      echo ""
    fi
    echo "   ⚠️  Common causes:"
    echo "   1. Example/placeholder project in spec.md User Stories"
    echo "   2. Typo in **Project**: field (e.g., 'MyApp (3 repos)' instead of real project)"
    echo "   3. Missing project configuration"
    echo ""
    echo "   🔧 How to fix:"
    if [ -n "$VALID_PROJECTS" ]; then
      echo "   • If this is an EXAMPLE in spec.md, update to a real project:"
      echo "     **Project**: ${VALID_PROJECTS%%,*}  # Use first valid project"
      echo ""
    fi
    echo "   • If this is a NEW project, add it to config:"
    echo "     specweave config set multiProject.projects.$PROJECT_NAME.id \"$PROJECT_NAME\""
    echo "     specweave config set multiProject.projects.$PROJECT_NAME.name \"Project Display Name\""
    echo ""
    echo "   • Check spec.md for placeholder User Stories like:"
    echo "     **Project**: frontend-app, backend-api  ← FORBIDDEN (comma-separated)"
    echo "     **Project**: MyApp (3 repos)  ← FORBIDDEN (parentheses not allowed)"
    echo ""
  fi
  exit 1
fi

# Project exists - allow creation
exit 0
