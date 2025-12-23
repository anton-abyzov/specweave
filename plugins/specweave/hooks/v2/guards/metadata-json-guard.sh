#!/bin/bash
#
# metadata-json-guard.sh
#
# Pre-tool-use hook that WARNS (not blocks) if metadata.json is missing before spec.md creation.
# This helps ensure proper increment creation workflow.
#
# ROOT CAUSE: When Claude creates increments via user prompt (not /sw:increment),
# metadata.json may be forgotten, causing:
# - Status tracking broken
# - WIP limits don't work
# - External sync fails (GitHub/Jira/ADO)
# - All increment commands fail
#
# v1.0.37+: CRITICAL CHANGE - Now WARNS instead of BLOCKING!
# User feedback: "you MUST NEVER block such operations... do at least warning"
# Business logic and validation should be in scripts/agents, not hard blocks.
#
# SOLUTION: WARN if spec.md is created without metadata.json, but ALLOW the operation.
# The warning prompts Claude to create metadata.json immediately after.
#
# Activation:
# - tool_name: Write
# - file_path matches: .specweave/increments/*/spec.md
#
# Returns exit 0 (allow) with warning message if metadata.json missing
#
# Bypass: Set SPECWEAVE_FORCE_METADATA=1 to skip validation
#
# v0.34.0 - Initial implementation based on user project bug analysis
# v1.0.37 - Changed from BLOCK to WARN (allow with warning message)

set +e  # CRITICAL: Never use set -e in hooks (causes cascading failures)

# Check for force bypass
if [ "$SPECWEAVE_FORCE_METADATA" = "1" ]; then
  echo '{"decision": "allow", "message": "metadata.json guard bypassed (SPECWEAVE_FORCE_METADATA=1)"}'
  exit 0
fi

# Disable hooks bypass
if [ "$SPECWEAVE_DISABLE_HOOKS" = "1" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Read tool input from stdin (safe handling)
INPUT=$(cat 2>/dev/null || echo '{}')

# Check jq availability - allow if not present
if ! command -v jq >/dev/null 2>&1; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract tool name - with jq fallback
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .tool_input.tool_name // ""' 2>/dev/null || echo "")

# Only validate Write tool calls
if [ "$TOOL_NAME" != "Write" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract file path - handle both formats
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // ""' 2>/dev/null || echo "")

# Only validate spec.md files in increments folder
# Match: 3-4 digits, optional E suffix, kebab-case name, spec.md
if [[ ! "$FILE_PATH" =~ \.specweave/increments/([0-9]{3,4}E?-[^/]+)/spec\.md$ ]]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Extract increment folder path
INCREMENT_DIR=$(dirname "$FILE_PATH")
INCREMENT_ID="${BASH_REMATCH[1]}"

# Check if metadata.json exists in the same increment folder
METADATA_PATH="${INCREMENT_DIR}/metadata.json"

if [ -f "$METADATA_PATH" ]; then
  # metadata.json exists, allow spec.md creation
  echo '{"decision": "allow"}'
  exit 0
fi

# metadata.json doesn't exist - WARN but ALLOW spec.md creation (v1.0.37)
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat << WARN_EOF
{
  "decision": "allow",
  "message": "⚠️ WARNING: metadata.json MISSING - Creating spec.md without it!\n\n🚨 IMMEDIATE ACTION REQUIRED:\nCreate metadata.json NOW for this increment to work properly.\n\nWithout metadata.json:\n  - ❌ Status tracking broken\n  - ❌ WIP limits don't work\n  - ❌ External sync fails (GitHub/Jira/ADO)\n  - ❌ All increment commands fail\n\n📋 CREATE metadata.json:\n   Write({\n     file_path: \"${METADATA_PATH}\",\n     content: {\n       \"id\": \"${INCREMENT_ID}\",\n       \"status\": \"planned\",\n       \"type\": \"feature\",\n       \"priority\": \"P1\",\n       \"created\": \"${NOW}\",\n       \"lastActivity\": \"${NOW}\",\n       \"testMode\": \"TDD\",\n       \"coverageTarget\": 95,\n       \"feature_id\": null,\n       \"epic_id\": null,\n       \"externalLinks\": {}\n     }\n   })\n\nOperation ALLOWED - proceeding with spec.md write."
}
WARN_EOF

exit 0
