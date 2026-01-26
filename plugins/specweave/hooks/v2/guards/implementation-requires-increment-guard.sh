#!/bin/bash
# implementation-requires-increment-guard.sh - Optional guard for strict increment enforcement
#
# PURPOSE:
# When ENABLED, enforces that implementation work requires an active increment.
# This is OPT-IN - disabled by default to allow quick fixes.
#
# TO ENABLE (strict mode):
# In .specweave/config.json:
#   { "incrementAssist": { "mandatory": true } }
#
# WHEN THIS GUARD BLOCKS (only if mandatory: true):
# - Writing to source code files (*.ts, *.js, *.tsx, *.jsx, *.py, *.cs, etc.)
# - NO active increment exists
# - The file is NOT in .specweave/ directory
#
# WHEN THIS GUARD ALWAYS ALLOWS:
# - incrementAssist.mandatory is NOT set to true (default behavior)
# - File is in .specweave/ directory
# - File is a config/doc file (.md, .json, .yaml, etc.)
# - An active increment exists
# - SPECWEAVE_BYPASS_INCREMENT_GUARD env var is set
#
# @since 1.0.167

set -e

# Read hook input
INPUT=$(cat)

# Extract tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .toolInput.file_path // ""')

# Only check Write and Edit operations
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Skip if bypass env var is set
if [[ "${SPECWEAVE_BYPASS_INCREMENT_GUARD:-0}" == "1" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Skip if not a SpecWeave project
if [[ ! -d ".specweave" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if incrementAssist.mandatory is explicitly TRUE (opt-in enforcement)
# Default is FALSE - allow quick fixes without increment
CONFIG_PATH=".specweave/config.json"
MANDATORY="false"
if [[ -f "$CONFIG_PATH" ]]; then
  MANDATORY=$(jq -r '.incrementAssist.mandatory // false' "$CONFIG_PATH" 2>/dev/null)
fi

# If not mandatory mode, allow everything
if [[ "$MANDATORY" != "true" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# ============================================================================
# STRICT MODE ENABLED - Check for active increment
# ============================================================================

# Always allow writes to .specweave/ directory (increment management)
if [[ "$FILE_PATH" == *".specweave/"* ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Define source code extensions that require increment
SOURCE_EXTENSIONS="ts|tsx|js|jsx|py|cs|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|vue|svelte"

# Check if file is a source code file
EXTENSION="${FILE_PATH##*.}"
if ! echo "$EXTENSION" | grep -qE "^($SOURCE_EXTENSIONS)$"; then
  # Not a source code file - allow (configs, docs, etc.)
  echo '{"decision":"allow"}'
  exit 0
fi

# Check for active increment
ACTIVE_INCREMENT=""
for meta in .specweave/increments/*/metadata.json; do
  [[ -f "$meta" ]] || continue
  status=$(jq -r '.status // "unknown"' "$meta" 2>/dev/null)
  # Active statuses: planned, active, in-progress, planning, backlog
  if [[ "$status" != "completed" && "$status" != "abandoned" && "$status" != "unknown" ]]; then
    ACTIVE_INCREMENT=$(basename "$(dirname "$meta")")
    break
  fi
done

# If active increment exists, allow
if [[ -n "$ACTIVE_INCREMENT" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# NO ACTIVE INCREMENT in STRICT MODE - BLOCK with guidance
REASON="⛔ **STRICT MODE: Increment Required**

You have \`incrementAssist.mandatory: true\` enabled.

**To proceed, either:**

1. **Create an increment:**
   \`/sw:increment \"feature-name\"\`

2. **Disable strict mode** in .specweave/config.json:
   \`{ \"incrementAssist\": { \"mandatory\": false } }\`

**File:** \`${FILE_PATH}\`"

# Escape the reason for JSON
REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)

echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
exit 0
