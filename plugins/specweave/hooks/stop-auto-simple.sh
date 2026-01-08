#!/bin/bash
# stop-auto-simple.sh - Simplified Autonomous Execution Stop Hook
#
# Philosophy: Trust the framework!
# - Increments ARE the state (no session management needed)
# - Hooks handle all sync (GitHub/JIRA/ADO)
# - /sw:done validates quality (tests, build, coverage)
# - Stop hook just decides: work remains? Yes=block, No=approve
#
# Returns:
# - {"decision": "block"} → Continue working
# - {"decision": "approve"} → All complete, exit

set -e

# ============================================================================
# Input Parsing
# ============================================================================

INPUT=$(cat)
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"

# ============================================================================
# Check if SpecWeave Project
# ============================================================================

if [ ! -d "$INCREMENTS_DIR" ]; then
    # Not a SpecWeave project, approve exit
    echo '{"decision": "approve"}'
    exit 0
fi

# ============================================================================
# Find Active Increments
# ============================================================================

# Count active increments (status: "active" or "in-progress")
ACTIVE_COUNT=$(find "$INCREMENTS_DIR" -type f -name "metadata.json" \
    -exec grep -l '"status":\s*"active"\|"status":\s*"in-progress"' {} \; 2>/dev/null | wc -l | tr -d ' ')

# If no active increments, we're done!
if [ "$ACTIVE_COUNT" -eq 0 ]; then
    echo '{"decision": "approve", "systemMessage": "✅ All increments complete! Autonomous execution finished."}'
    exit 0
fi

# ============================================================================
# Work Remains - Block Exit
# ============================================================================

# Get list of active increments for feedback
ACTIVE_INCREMENTS=$(find "$INCREMENTS_DIR" -type f -name "metadata.json" \
    -exec grep -l '"status":\s*"active"\|"status":\s*"in-progress"' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | head -5)

# Build system message
SYSTEM_MSG="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 AUTO MODE CONTINUING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Increments: $ACTIVE_COUNT

"

# Add first 3 active increments to message
COUNT=0
while IFS= read -r inc; do
    COUNT=$((COUNT + 1))
    SYSTEM_MSG="${SYSTEM_MSG}  $COUNT. $inc
"
    if [ "$COUNT" -ge 3 ]; then
        break
    fi
done <<< "$ACTIVE_INCREMENTS"

if [ "$ACTIVE_COUNT" -gt 3 ]; then
    SYSTEM_MSG="${SYSTEM_MSG}  ... and $((ACTIVE_COUNT - 3)) more

"
fi

SYSTEM_MSG="${SYSTEM_MSG}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WHAT TO DO:
   1. Execute /sw:do to work on tasks
   2. When tasks complete, run /sw:done for validation
   3. If /sw:done fails, keep fixing
   4. If /sw:done passes, increment completes automatically
   5. Move to next active increment

🎯 COMPLETION CRITERIA:
   • All tasks in increment complete
   • Tests pass (validated by /sw:done)
   • Build succeeds (validated by /sw:done)
   • E2E tests pass (if applicable)
   • /sw:done approves closure

💡 FRAMEWORK HANDLES:
   • Task updates → Hooks sync to GitHub/JIRA/ADO
   • Spec updates → Hooks update ACs
   • Status transitions → Hooks auto-transition
   • Living docs → Hooks sync on completion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue working on the active increments.
"

# Block exit with system message
jq -n \
    --arg decision "block" \
    --arg reason "Continue working - $ACTIVE_COUNT active increment(s) remaining" \
    --arg systemMessage "$SYSTEM_MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $systemMessage}'

exit 0
