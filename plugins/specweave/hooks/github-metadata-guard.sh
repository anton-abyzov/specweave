#!/usr/bin/env bash
# github-metadata-guard.sh - Prevents redundant metadata headers in GitHub issue bodies
# WHY: GitHub has NATIVE fields (labels, milestones) - metadata belongs there, NOT in body
# See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md

# Activation: PreToolUse event for Write/Edit tools
# Blocks: Any attempt to add metadata header (Feature, Status, Priority, Project) to GitHub issue body builders

# Exit codes:
# 0 = Allow operation (no metadata header detected)
# 1 = Block operation (metadata header detected)

# Only validate Write/Edit operations in GitHub plugin files
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Only check GitHub issue body builder files
if [[ ! "$file_path" =~ plugins/specweave-github/lib/.*issue.*builder\.ts$ ]]; then
  exit 0
fi

# Get content to check (new_string for Edit, content for Write)
content_to_check=""
if [[ "$TOOL_NAME" == "Edit" ]]; then
  content_to_check="$new_string"
elif [[ "$TOOL_NAME" == "Write" ]]; then
  content_to_check="$content"
fi

# Check for metadata header patterns (case-insensitive)
if echo "$content_to_check" | grep -qiE '^\*\*Feature\*\*:|^\*\*Status\*\*:|^\*\*Priority\*\*:|^\*\*Project\*\*:'; then
  echo "❌ BLOCKED: GitHub issue body MUST NOT contain metadata header!" >&2
  echo "" >&2
  echo "WHY: GitHub has NATIVE fields for metadata:" >&2
  echo "  - Feature → Milestone" >&2
  echo "  - Status → Label (status:*)" >&2
  echo "  - Priority → Label (p1, p2, p3)" >&2
  echo "  - Project → Label (project:*)" >&2
  echo "" >&2
  echo "Body should contain ONLY actual work content:" >&2
  echo "  ✅ ## Progress" >&2
  echo "  ✅ ## User Story" >&2
  echo "  ✅ ## Acceptance Criteria" >&2
  echo "  ✅ ## Tasks" >&2
  echo "" >&2
  echo "See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md" >&2
  exit 1
fi

# Check for metadata at start of body string assignments
if echo "$content_to_check" | grep -qE 'body \+= `\*\*(Feature|Status|Priority|Project)\*\*:'; then
  echo "❌ BLOCKED: Metadata header assignment detected in GitHub issue body builder!" >&2
  echo "" >&2
  echo "Detected pattern: body += \`**Feature**:\` or similar" >&2
  echo "" >&2
  echo "FORBIDDEN CODE:" >&2
  echo "  body += \`**Feature**: \${featureId}\`;" >&2
  echo "  body += \`**Status**: \${status}\`;" >&2
  echo "  body += \`**Priority**: \${priority}\`;" >&2
  echo "  body += \`**Project**: \${project}\`;" >&2
  echo "" >&2
  echo "Use labels instead:" >&2
  echo "  labels.push(\`status:\${status}\`);" >&2
  echo "  labels.push(priority.toLowerCase());" >&2
  echo "  labels.push(\`project:\${project}\`);" >&2
  echo "" >&2
  echo "See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md" >&2
  exit 1
fi

# Allow operation (no metadata header detected)
exit 0
