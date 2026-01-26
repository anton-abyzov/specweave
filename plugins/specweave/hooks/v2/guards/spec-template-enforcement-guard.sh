#!/bin/bash
# spec-template-enforcement-guard.sh - Enforces template-first workflow for spec.md
#
# PURPOSE:
# Ensures that spec.md files are created via the template API first, then
# completed by PM skill - NOT written directly with full content.
#
# This prevents Claude from bypassing the skill system by writing full
# user stories directly to spec.md without using PM expertise.
#
# WORKFLOW ENFORCED:
# 1. increment-planner creates TEMPLATE via createIncrementTemplates() API
# 2. Templates have markers like [Story Title], [user type], etc.
# 3. User invokes PM skill to complete the template
# 4. Direct full-content writes are BLOCKED
#
# DETECTION LOGIC:
# - ALLOW: File has template markers ([Story Title], [user type], etc.)
# - ALLOW: File is being updated by PM skill (has proper AC-IDs without brackets)
# - BLOCK: File has full user stories but no template markers AND was created in single write
#
# @since 1.0.167

set -e

# Read hook input
INPUT=$(cat)

# Extract file path and tool from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .toolInput.file_path // ""')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .toolInput.content // ""')

# Only check Write operations to spec.md in increment folders
if [[ "$TOOL_NAME" != "Write" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if this is a spec.md in an increment folder
if [[ ! "$FILE_PATH" =~ \.specweave/increments/[0-9]{4}-[^/]+/spec\.md$ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Extract increment ID from path for messaging
INCREMENT_ID=$(echo "$FILE_PATH" | grep -oE '[0-9]{4}-[^/]+' | head -1)

# Template markers that indicate proper template creation
TEMPLATE_MARKERS=(
  "[Story Title]"
  "[user type]"
  "[goal]"
  "[benefit]"
  "[Specific, testable criterion]"
  "{{RESOLVED_PROJECT}}"
  "TEMPLATE FILE - MUST BE COMPLETED VIA PM"
)

# Check if content has template markers (this is ALLOWED - template creation)
has_template_markers=false
for marker in "${TEMPLATE_MARKERS[@]}"; do
  if [[ "$CONTENT" == *"$marker"* ]]; then
    has_template_markers=true
    break
  fi
done

if [[ "$has_template_markers" == "true" ]]; then
  # This is a template being created - ALLOW
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if this is a PM skill completing a template
# PM skill creates proper user stories with filled AC-IDs (not bracketed)
# Pattern: "### US-001:" followed by actual content (not [Story Title])

# Count user stories with actual titles (not placeholders)
user_story_count=$(echo "$CONTENT" | grep -cE "^### US-[0-9]+: [A-Za-z]" || echo "0")

# Count acceptance criteria with actual content (not placeholders)
ac_count=$(echo "$CONTENT" | grep -cE "\*\*AC-US[0-9]+-[0-9]+\*\*: [A-Za-z]" || echo "0")

# If we have real user stories with real ACs, check if file already exists as template
if [[ "$user_story_count" -gt 0 ]] && [[ "$ac_count" -gt 1 ]]; then
  # Check if spec.md already exists (meaning this is an update, not creation)
  if [[ -f "$FILE_PATH" ]]; then
    # File exists - check if it was a template
    existing_content=$(cat "$FILE_PATH" 2>/dev/null || echo "")

    existing_has_template=false
    for marker in "${TEMPLATE_MARKERS[@]}"; do
      if [[ "$existing_content" == *"$marker"* ]]; then
        existing_has_template=true
        break
      fi
    done

    if [[ "$existing_has_template" == "true" ]]; then
      # Existing file IS a template, now being completed - ALLOW
      echo '{"decision":"allow"}'
      exit 0
    fi
  fi

  # NEW FILE with full content - this bypasses the template workflow!
  # BLOCK and provide guidance

  REASON="⛔ **SKILL ENFORCEMENT: Template-First Workflow Required**

You're attempting to write full user story content directly to spec.md.
This bypasses the PM skill expertise and template workflow.

**Required Workflow:**
1. Use \`createIncrementTemplates()\` API to create template files
2. Template has markers like [Story Title], [user type] that PM skill fills
3. Tell Claude: \"Complete the spec for increment ${INCREMENT_ID}\"
4. PM skill auto-activates and creates proper user stories

**Why This Matters:**
- PM skill conducts market research and competitive analysis
- PM skill ensures proper user story format and acceptance criteria
- PM skill validates requirements completeness
- Direct writes skip all this expertise

**To Fix:**
Run the template API first, then invoke PM skill to complete it.

Or if PM skill is completing a template, ensure the template file exists first."

  # Escape the reason for JSON
  REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)

  echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
  exit 0
fi

# Default: allow (edge cases, small updates, etc.)
echo '{"decision":"allow"}'
exit 0
