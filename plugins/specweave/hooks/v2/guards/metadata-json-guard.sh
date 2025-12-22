#!/bin/bash
#
# metadata-json-guard.sh
#
# Pre-tool-use hook that ensures metadata.json exists BEFORE spec.md can be created.
# This prevents increments from being created without proper metadata.
#
# ROOT CAUSE: When Claude creates increments via user prompt (not /sw:increment),
# metadata.json may be forgotten, causing:
# - Status tracking broken
# - WIP limits don't work
# - External sync fails (GitHub/Jira/ADO)
# - All increment commands fail
#
# SOLUTION: Block spec.md creation if metadata.json doesn't exist in same increment folder.
# Claude MUST create metadata.json FIRST, then spec.md.
#
# Activation:
# - tool_name: Write
# - file_path matches: .specweave/increments/*/spec.md
#
# Returns exit code 2 (block) if metadata.json missing, 0 (allow) otherwise.
#
# Bypass: Set SPECWEAVE_FORCE_METADATA=1 to skip validation
#
# v0.34.0 - Initial implementation based on user project bug analysis

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

# metadata.json doesn't exist - BLOCK spec.md creation
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat << BLOCK_EOF
{
  "decision": "block",
  "reason": "🚫 BLOCKED: Cannot create spec.md without metadata.json\n\n⚠️ CRITICAL RULE: metadata.json MUST be created FIRST!\n\nWithout metadata.json:\n  - ❌ Status tracking broken\n  - ❌ WIP limits don't work\n  - ❌ External sync fails (GitHub/Jira/ADO)\n  - ❌ All increment commands fail\n\n📋 CORRECT WORKFLOW:\n1. Create metadata.json FIRST:\n   Write({\n     file_path: \"${METADATA_PATH}\",\n     content: {\n       \"id\": \"${INCREMENT_ID}\",\n       \"status\": \"planned\",\n       \"type\": \"feature\",\n       \"priority\": \"P1\",\n       \"created\": \"${NOW}\",\n       \"lastActivity\": \"${NOW}\",\n       \"testMode\": \"TDD\",\n       \"coverageTarget\": 95,\n       \"feature_id\": null,\n       \"epic_id\": null,\n       \"externalLinks\": {}\n     }\n   })\n\n2. THEN create spec.md\n\n📖 See: CLAUDE.md section '3. metadata.json is MANDATORY'\n\n💡 Bypass: Set SPECWEAVE_FORCE_METADATA=1 to skip this validation"
}
BLOCK_EOF

exit 2
