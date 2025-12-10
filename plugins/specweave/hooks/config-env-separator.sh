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

set -e

# Only run for Write and Edit tools
if [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Parse tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // .new_string // empty')

# Skip if no file path
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only check src/ files (not tests, plugins, etc.)
if [[ ! "$FILE_PATH" =~ /src/ ]]; then
  exit 0
fi

# Skip test files
if [[ "$FILE_PATH" =~ \.test\.ts$ ]]; then
  exit 0
fi

# Skip spec files
if [[ "$FILE_PATH" =~ \.spec\.ts$ ]]; then
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

# If violations found, block the operation
if [[ -n "$VIOLATIONS" ]]; then
  echo ""
  echo "-------------------------------------------------------------------"
  echo "BLOCKED: Configuration values MUST use ConfigManager, not process.env"
  echo "-------------------------------------------------------------------"
  echo ""
  echo "File: $FILE_PATH"
  echo ""
  echo "Violations detected:"
  echo -e "$VIOLATIONS"
  echo ""
  echo "CORRECT PATTERN:"
  echo "  const config = await this.configManager.read();"
  echo "  const domain = config.issueTracker?.domain || '';"
  echo "  const org = config.issueTracker?.organization_ado || '';"
  echo ""
  echo "FORBIDDEN PATTERN:"
  echo "  const domain = process.env.JIRA_DOMAIN;  // VIOLATION!"
  echo "  const org = process.env.AZURE_DEVOPS_ORG;  // VIOLATION!"
  echo ""
  echo "Ref: ADR-0194, CLAUDE.md Configuration section"
  echo ""
  echo "To bypass (EMERGENCY ONLY): SPECWEAVE_SKIP_CONFIG_CHECK=1"
  echo "-------------------------------------------------------------------"
  echo ""

  # Allow bypass for emergencies
  if [[ "$SPECWEAVE_SKIP_CONFIG_CHECK" == "1" ]]; then
    echo "WARNING: SPECWEAVE_SKIP_CONFIG_CHECK=1 - Bypassing config check!"
    exit 0
  fi

  exit 1
fi

exit 0
