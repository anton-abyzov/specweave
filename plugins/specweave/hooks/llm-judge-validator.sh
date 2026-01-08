#!/bin/bash
# llm-judge-validator.sh - LLM Judge Quality Assessment
#
# Uses Claude to assess work quality before allowing auto session completion
# Returns exit code 0 if quality approved, 1 if rejected
#
# Usage: llm-judge-validator.sh <INCREMENT_ID> <TRANSCRIPT_PATH>

set -e

INCREMENT_ID="$1"
TRANSCRIPT_PATH="$2"

if [ -z "$INCREMENT_ID" ] || [ -z "$TRANSCRIPT_PATH" ]; then
    echo "Usage: llm-judge-validator.sh <INCREMENT_ID> <TRANSCRIPT_PATH>" >&2
    exit 1
fi

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
INCREMENT_DIR="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID"

if [ ! -d "$INCREMENT_DIR" ]; then
    echo "❌ Increment directory not found: $INCREMENT_DIR" >&2
    exit 1
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GATHER CONTEXT FOR JUDGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SPEC_FILE="$INCREMENT_DIR/spec.md"
TASKS_FILE="$INCREMENT_DIR/tasks.md"

if [ ! -f "$SPEC_FILE" ]; then
    echo "❌ spec.md not found" >&2
    exit 1
fi

if [ ! -f "$TASKS_FILE" ]; then
    echo "❌ tasks.md not found" >&2
    exit 1
fi

# Extract acceptance criteria from spec.md
ACS=$(grep -E "^- \[.\] \*\*AC-" "$SPEC_FILE" 2>/dev/null || echo "")
TOTAL_ACS=$(echo "$ACS" | wc -l | tr -d ' ')
COMPLETED_ACS=$(echo "$ACS" | grep -c "^- \[x\]" || echo "0")

# Extract tasks status
TASKS=$(grep -E "^### T-[0-9]+" "$TASKS_FILE" 2>/dev/null || echo "")
TOTAL_TASKS=$(echo "$TASKS" | wc -l | tr -d ' ')

TASK_STATUS=$(grep -E "\*\*Status\*\*:" "$TASKS_FILE" 2>/dev/null || echo "")
COMPLETED_TASKS=$(echo "$TASK_STATUS" | grep -c "\[x\] completed" || echo "0")

# Get recent changes from git
RECENT_CHANGES=$(git diff HEAD~5..HEAD --stat 2>/dev/null | head -20 || echo "No git history available")

# Get test results from transcript
TEST_RESULTS=$(tail -500 "$TRANSCRIPT_PATH" 2>/dev/null | grep -E "(PASS|FAIL|passed|failed|✓|✗)" | tail -20 || echo "No test results in transcript")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD JUDGE PROMPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JUDGE_PROMPT=$(cat <<EOF
You are a strict quality judge assessing whether work on increment $INCREMENT_ID is COMPLETE and PRODUCTION-READY.

# Context

## Acceptance Criteria Status
- Total ACs: $TOTAL_ACS
- Completed ACs: $COMPLETED_ACS

## Tasks Status
- Total Tasks: $TOTAL_TASKS
- Completed Tasks: $COMPLETED_TASKS

## Recent Changes
\`\`\`
$RECENT_CHANGES
\`\`\`

## Test Results
\`\`\`
$TEST_RESULTS
\`\`\`

## Specification
$(head -100 "$SPEC_FILE")

## Task Details
$(head -100 "$TASKS_FILE")

# Your Role

You are the FINAL quality gate. Your job is to determine if this work is:
1. **COMPLETE**: All acceptance criteria satisfied
2. **TESTED**: Appropriate test coverage (unit + integration/E2E where needed)
3. **PRODUCTION-READY**: No obvious bugs, security issues, or incomplete implementations

# Evaluation Criteria

✅ **APPROVE** if:
- All ACs marked [x] AND actually implemented
- Tests exist AND pass for critical paths
- Code quality is production-ready
- No half-finished implementations
- Security best practices followed

❌ **REJECT** if:
- ACs marked [x] but not actually implemented (self-deception)
- Missing tests for critical functionality
- Obvious bugs or security vulnerabilities
- Incomplete error handling
- Poor code quality (will cause maintenance issues)

# Output Format

Respond with JSON ONLY:

\`\`\`json
{
  "decision": "approve" | "reject",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation (2-3 sentences)",
  "concerns": ["concern 1", "concern 2"],
  "recommendations": ["recommendation 1"]
}
\`\`\`

**Be strict.** False approvals lead to production bugs. When in doubt, REJECT with clear guidance.
EOF
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CALL CLAUDE API FOR JUDGMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🤖 Requesting LLM Judge assessment..." >&2

# Check if API key exists
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set - skipping LLM judge (assuming approval)" >&2
    exit 0
fi

# Create temporary file for request
TMP_REQUEST=$(mktemp)
cat > "$TMP_REQUEST" <<EOF
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": $(echo "$JUDGE_PROMPT" | jq -Rs .)
    }
  ]
}
EOF

# Call Claude API
RESPONSE=$(curl -s -X POST https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d @"$TMP_REQUEST")

rm -f "$TMP_REQUEST"

# Extract text content
JUDGE_OUTPUT=$(echo "$RESPONSE" | jq -r '.content[0].text // ""')

if [ -z "$JUDGE_OUTPUT" ]; then
    echo "❌ Failed to get judge response" >&2
    echo "API Response: $RESPONSE" >&2
    exit 1
fi

# Parse JSON from output (extract JSON block)
JUDGE_JSON=$(echo "$JUDGE_OUTPUT" | grep -A 100 '```json' | grep -B 100 '```' | grep -v '```' | jq -c '.')

if [ -z "$JUDGE_JSON" ] || [ "$JUDGE_JSON" = "null" ]; then
    echo "⚠️  Could not parse judge JSON - raw output:" >&2
    echo "$JUDGE_OUTPUT" >&2
    exit 1
fi

# Extract decision
DECISION=$(echo "$JUDGE_JSON" | jq -r '.decision')
CONFIDENCE=$(echo "$JUDGE_JSON" | jq -r '.confidence')
REASONING=$(echo "$JUDGE_JSON" | jq -r '.reasoning')
CONCERNS=$(echo "$JUDGE_JSON" | jq -r '.concerns | join(", ")')

echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "🤖 LLM JUDGE ASSESSMENT" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2
echo "Decision: $DECISION (confidence: $CONFIDENCE)" >&2
echo "Reasoning: $REASONING" >&2

if [ "$DECISION" = "reject" ]; then
    echo "" >&2
    echo "❌ CONCERNS:" >&2
    echo "$CONCERNS" >&2
    echo "" >&2
    echo "The LLM judge has REJECTED this work as not production-ready." >&2
    echo "Address the concerns above and try again." >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 1
fi

echo "" >&2
echo "✅ LLM judge APPROVED - work is production-ready" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

exit 0
