#!/bin/bash
# implementation-requires-increment-guard.sh - Blocks source code writes without active increment
#
# PURPOSE:
# Enforces that implementation work (writing source code files) requires an
# active SpecWeave increment. This prevents developers from bypassing the
# spec-driven workflow.
#
# WHEN THIS GUARD BLOCKS:
# - Writing to source code files (*.ts, *.js, *.tsx, *.jsx, *.py, *.cs, etc.)
# - NO active increment exists
# - The file is NOT in .specweave/ directory
#
# WHEN THIS GUARD ALLOWS:
# - File is in .specweave/ directory (increment files themselves)
# - File is a config/doc file (.md, .json, .yaml, etc.)
# - An active increment exists (any status except completed/abandoned)
# - incrementAssist.mandatory is set to false in config
# - SPECWEAVE_BYPASS_INCREMENT_GUARD env var is set
#
# This is the ENFORCEMENT layer that the detect-intent LLM suggestion was missing.
# detect-intent SUGGESTS, this guard ENFORCES.
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

# Check if incrementAssist.mandatory is explicitly false
CONFIG_PATH=".specweave/config.json"
if [[ -f "$CONFIG_PATH" ]]; then
  MANDATORY=$(jq -r '.incrementAssist.mandatory // true' "$CONFIG_PATH" 2>/dev/null)
  if [[ "$MANDATORY" == "false" ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
fi

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

# NO ACTIVE INCREMENT - BLOCK with guidance
REASON="⛔ **IMPLEMENTATION REQUIRES INCREMENT**

You're attempting to write source code without an active SpecWeave increment.

**Why This is Blocked:**
- SpecWeave enforces spec-driven development
- Implementation work must be tracked in an increment
- This ensures specs, plans, and tasks exist before coding

**To Proceed:**

1. **Create an increment first:**
\`\`\`
/sw:increment \"feature-name\"
\`\`\`

2. **Or resume an existing one:**
\`\`\`
/sw:status          # Find increments
/sw:resume <id>     # Resume one
\`\`\`

3. **For quick fixes (bypass):**
\`\`\`
# In config.json, set:
{ \"incrementAssist\": { \"mandatory\": false } }
\`\`\`

**File blocked:** \`${FILE_PATH}\`

---
*This guard ensures all implementation is tracked via increments.*"

# Escape the reason for JSON
REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)

echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
exit 0
