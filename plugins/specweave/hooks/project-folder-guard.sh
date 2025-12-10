#!/usr/bin/env bash
# Project Folder Guard (Pre-tool-use Hook)
# Prevents creation of project folders unless project exists in config.json
#
# Triggers: Write tool creating files in .specweave/docs/internal/specs/{project}/
# Blocks: Project folders not in config.json multiProject.projects
# Version: 0.34.0+

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

# Get configured projects from config.json
CONFIG_FILE=".specweave/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ ERROR: .specweave/config.json not found"
  echo "   Cannot validate project folder creation without configuration"
  exit 1
fi

# Check if multi-project mode is enabled
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode - only allow configured project name
  ALLOWED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE")

  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
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
  VALID_PROJECTS=$(jq -r '.multiProject.projects | keys[]' "$CONFIG_FILE" | tr '\n' ', ' | sed 's/,$//')

  echo "❌ BLOCKED: Project folder creation for '$PROJECT_NAME'"
  echo ""
  echo "   Project '$PROJECT_NAME' is NOT configured in .specweave/config.json"
  echo ""
  echo "   Valid projects: $VALID_PROJECTS"
  echo ""
  echo "   ⚠️  Common causes:"
  echo "   1. Example/placeholder project in spec.md User Stories"
  echo "   2. Typo in **Project**: field (e.g., 'MyApp (3 repos)' instead of real project)"
  echo "   3. Missing project configuration"
  echo ""
  echo "   🔧 How to fix:"
  echo "   • If this is an EXAMPLE in spec.md, update to a real project:"
  echo "     **Project**: ${VALID_PROJECTS%%,*}  # Use first valid project"
  echo ""
  echo "   • If this is a NEW project, add it to config:"
  echo "     specweave config set multiProject.projects.$PROJECT_NAME.id \"$PROJECT_NAME\""
  echo "     specweave config set multiProject.projects.$PROJECT_NAME.name \"Project Display Name\""
  echo ""
  echo "   • Check spec.md for placeholder User Stories like:"
  echo "     **Project**: frontend-app, backend-api  ← FORBIDDEN (comma-separated)"
  echo "     **Project**: MyApp (3 repos)  ← FORBIDDEN (parentheses not allowed)"
  echo ""
  exit 1
fi

# Project exists - allow creation
exit 0
