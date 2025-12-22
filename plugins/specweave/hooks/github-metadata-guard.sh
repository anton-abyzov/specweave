#!/usr/bin/env bash
# github-metadata-guard.sh - Prevents redundant metadata headers in GitHub issue bodies
# WHY: GitHub has NATIVE fields (labels, milestones) - metadata belongs there, NOT in body
# See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md
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

# Only validate Write/Edit operations
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Only check GitHub issue body builder files
if [[ ! "$FILE_PATH" =~ plugins/specweave-github/lib/.*issue.*builder\.ts$ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check for metadata header patterns (case-insensitive)
if echo "$CONTENT" | grep -qiE '^\*\*Feature\*\*:|^\*\*Status\*\*:|^\*\*Priority\*\*:|^\*\*Project\*\*:'; then
  cat << 'BLOCK_EOF'
{
  "decision": "block",
  "reason": "🚫 BLOCKED: GitHub issue body MUST NOT contain metadata header!\n\nWHY: GitHub has NATIVE fields for metadata:\n  - Feature → Milestone\n  - Status → Label (status:*)\n  - Priority → Label (p1, p2, p3)\n  - Project → Label (project:*)\n\nBody should contain ONLY actual work content:\n  ✅ ## Progress\n  ✅ ## User Story\n  ✅ ## Acceptance Criteria\n  ✅ ## Tasks"
}
BLOCK_EOF
  exit 2  # Exit 2 = intentional block (NOT exit 1!)
fi

# Check for metadata at start of body string assignments
if echo "$CONTENT" | grep -qE 'body \+= `\*\*(Feature|Status|Priority|Project)\*\*:'; then
  cat << 'BLOCK_EOF'
{
  "decision": "block",
  "reason": "🚫 BLOCKED: Metadata header assignment detected in GitHub issue body builder!\n\nFORBIDDEN CODE:\n  body += `**Feature**: ${featureId}`;\n  body += `**Status**: ${status}`;\n\nUse labels instead:\n  labels.push(`status:${status}`);\n  labels.push(priority.toLowerCase());"
}
BLOCK_EOF
  exit 2  # Exit 2 = intentional block (NOT exit 1!)
fi

# Allow operation (no metadata header detected)
echo '{"decision":"allow"}'
exit 0
