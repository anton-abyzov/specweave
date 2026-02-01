#!/bin/bash
# interview-enforcement-guard.sh - Enforces Deep Interview completion before spec creation
#
# PURPOSE:
# When Deep Interview Mode is enabled with "enforcement": "strict", this guard
# BLOCKS spec.md completion until all interview categories have been covered.
#
# WORKFLOW ENFORCED:
# 1. User starts /sw:increment
# 2. Interview state file created: .specweave/state/interview-{increment-id}.json
# 3. PM skill marks categories as covered during interview
# 4. Spec.md writing BLOCKED until all categories are marked complete
#
# DETECTION LOGIC:
# - CHECK: deepInterview.enabled && deepInterview.enforcement == "strict"
# - CHECK: Interview state file exists and has all categories covered
# - BLOCK: If categories are missing, show which ones
# - ALLOW: All categories covered OR enforcement != "strict"
#
# @since 1.0.198

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

# Extract increment ID from path
INCREMENT_ID=$(echo "$FILE_PATH" | grep -oE '[0-9]{4}-[^/]+' | head -1)

# Find project root (where .specweave/ is)
PROJECT_ROOT=$(echo "$FILE_PATH" | sed 's|/.specweave/.*|/|')
CONFIG_PATH="${PROJECT_ROOT}.specweave/config.json"

# Check if Deep Interview Mode is enabled with strict enforcement
if [[ ! -f "$CONFIG_PATH" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

DEEP_INTERVIEW_ENABLED=$(jq -r '.planning.deepInterview.enabled // false' "$CONFIG_PATH" 2>/dev/null)
ENFORCEMENT=$(jq -r '.planning.deepInterview.enforcement // "advisory"' "$CONFIG_PATH" 2>/dev/null)

# If not enabled or not strict, allow
if [[ "$DEEP_INTERVIEW_ENABLED" != "true" ]] || [[ "$ENFORCEMENT" != "strict" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Get required categories from config
REQUIRED_CATEGORIES=$(jq -r '.planning.deepInterview.categories // ["architecture","integrations","ui-ux","performance","security","edge-cases"] | .[]' "$CONFIG_PATH" 2>/dev/null)

# Check if this is a template being created (allow templates through)
TEMPLATE_MARKERS=(
  "[Story Title]"
  "[user type]"
  "[goal]"
  "[benefit]"
  "TEMPLATE FILE"
  "{{RESOLVED_PROJECT}}"
)

for marker in "${TEMPLATE_MARKERS[@]}"; do
  if [[ "$CONTENT" == *"$marker"* ]]; then
    # Template creation - allow
    echo '{"decision":"allow"}'
    exit 0
  fi
done

# Check interview state file
STATE_DIR="${PROJECT_ROOT}.specweave/state"
INTERVIEW_STATE="${STATE_DIR}/interview-${INCREMENT_ID}.json"

if [[ ! -f "$INTERVIEW_STATE" ]]; then
  # No interview state - BLOCK
  REASON="⛔ **STRICT INTERVIEW ENFORCEMENT: Interview Required**

You're attempting to write to spec.md but **Deep Interview has not been conducted**.

**Strict Interview Mode is enabled** for this project.

Before creating spec.md, you MUST:

1. **Start the interview**:
   \`\`\`
   Mark interview started for increment ${INCREMENT_ID}
   \`\`\`

2. **Cover all 6 categories** (ask thorough questions):
   - [ ] Architecture - system design, components, data flow
   - [ ] Integrations - external APIs, databases, auth providers
   - [ ] UI/UX - user flows, error handling, accessibility
   - [ ] Performance - load expectations, caching, response times
   - [ ] Security - auth, authorization, data protection
   - [ ] Edge Cases - failures, concurrency, rollback

3. **Mark each category as covered**:
   \`\`\`
   Mark architecture covered for ${INCREMENT_ID}: [summary of decisions]
   \`\`\`

4. **Then complete the spec** - this guard will allow it.

**Why This Matters:**
Thorough requirements gathering prevents rework. Strict mode ensures all bases are covered before implementation begins.

**To disable strict mode** (not recommended):
Set \`planning.deepInterview.enforcement: \"advisory\"\` in config.json"

  REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
  echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
  exit 0
fi

# Interview state exists - check if all categories are covered
COVERED_CATEGORIES=$(jq -r '.coveredCategories // {} | keys[]' "$INTERVIEW_STATE" 2>/dev/null || echo "")

# Find missing categories
MISSING=""
for cat in $REQUIRED_CATEGORIES; do
  if ! echo "$COVERED_CATEGORIES" | grep -qx "$cat"; then
    MISSING="$MISSING\n   - [ ] $cat"
  fi
done

if [[ -n "$MISSING" ]]; then
  # Some categories not covered - BLOCK
  REASON="⛔ **STRICT INTERVIEW ENFORCEMENT: Incomplete Interview**

Interview started but **not all categories have been covered**.

**Missing Categories:**
$MISSING

**Covered Categories:**
$(jq -r '.coveredCategories // {} | to_entries[] | \"   - [x] \\(.key): \\(.value.summary // \"covered\")\"' "$INTERVIEW_STATE" 2>/dev/null || echo "   (none)")

**To Continue:**
Ask questions about the missing categories, then mark each as covered:
\`\`\`
Mark [category] covered for ${INCREMENT_ID}: [summary of what was decided]
\`\`\`

**Why This Matters:**
Strict Interview Mode ensures comprehensive requirements gathering. Skipping categories leads to rework and missed requirements."

  REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
  echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
  exit 0
fi

# All categories covered - ALLOW
echo '{"decision":"allow"}'
exit 0
