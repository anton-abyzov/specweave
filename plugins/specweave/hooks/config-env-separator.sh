#!/usr/bin/env bash
#
# Pre-Tool-Use Hook: Config-Env Separator
#
# Blocks Write/Edit to src/ files that read config values from process.env
# Configuration (domain, org, project) should come from ConfigManager (config.json)
# Only secrets (PAT, tokens, emails) should use process.env
#
# Ref: ADR-0194 - Enforce Config JSON Separation
#
# SAFETY: Uses set +e to prevent cascading failures
# Exit 0 = allow, Exit 2 = block (never use exit 1!)

set +e  # CRITICAL: Never use set -e in hooks (causes cascading failures)

# Kill switch check
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Read input from stdin (Claude Code passes JSON via stdin)
INPUT=$(cat 2>/dev/null || echo '{}')

# Extract tool name and input using jq
if command -v jq >/dev/null 2>&1; then
  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // ""' 2>/dev/null || echo "")
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // .content // .new_string // ""' 2>/dev/null || echo "")
else
  # Fallback without jq - allow (safer than blocking)
  echo '{"decision":"allow"}'
  exit 0
fi

# Only run for Write and Edit tools
if [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Skip if no file path
if [[ -z "$FILE_PATH" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Only check src/ files (not tests, plugins, etc.)
if [[ ! "$FILE_PATH" =~ /src/ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Skip test files
if [[ "$FILE_PATH" =~ \.test\.ts$ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Skip spec files
if [[ "$FILE_PATH" =~ \.spec\.ts$ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Config variables that should NOT be in process.env
CONFIG_VARS=(
  "JIRA_DOMAIN"
  "JIRA_BASE_URL"
  "AZURE_DEVOPS_ORG"
  "AZURE_DEVOPS_PROJECT"
  "GITHUB_OWNER"
  "GITHUB_REPO"
  "ADO_ORG_URL"
  "ADO_PROJECT"
)

# Check for violations
VIOLATIONS=""
for VAR in "${CONFIG_VARS[@]}"; do
  if echo "$CONTENT" | grep -q "process\.env\.$VAR"; then
    VIOLATIONS="$VIOLATIONS\n  - process.env.$VAR"
  fi
done

# If violations found, block the operation with proper JSON response
if [[ -n "$VIOLATIONS" ]]; then
  # Allow bypass for emergencies
  if [[ "$SPECWEAVE_SKIP_CONFIG_CHECK" == "1" ]]; then
    echo '{"decision":"allow","message":"WARNING: SPECWEAVE_SKIP_CONFIG_CHECK=1 - Bypassing config check!"}'
    exit 0
  fi

  # Output JSON block response (proper format for Claude Code)
  cat << 'BLOCK_EOF'
{
  "decision": "block",
  "reason": "🚫 BLOCKED: Configuration values MUST use ConfigManager, not process.env\n\nCORRECT PATTERN:\n  const config = await this.configManager.read();\n  const domain = config.issueTracker?.domain || '';\n\nFORBIDDEN PATTERN:\n  const domain = process.env.JIRA_DOMAIN;  // VIOLATION!\n\nRef: ADR-0194\n\n💡 Bypass: SPECWEAVE_SKIP_CONFIG_CHECK=1"
}
BLOCK_EOF
  exit 2  # Exit 2 = intentional block (NOT exit 1!)
fi

echo '{"decision":"allow"}'
exit 0
