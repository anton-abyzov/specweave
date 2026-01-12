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
    # Build completion message with box art for visibility
    COMPLETION_MSG="
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTO SESSION COMPLETED SUCCESSFULLY                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  WHY DID SESSION STOP?                                                       ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║    ✓ All increments processed                                                ║
║    ✓ No active increments remaining                                          ║
║    ✓ All tasks marked complete                                               ║
║                                                                              ║
║  COMPLETION REASON: All work finished                                        ║
║                                                                              ║
║  WHAT'S NEXT?                                                                ║
║    • Review completed work in .specweave/increments/                         ║
║    • Run /sw:progress to see final status                                    ║
║    • Start new work with /sw:increment                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"
    # Update session file with end reason
    if [ -f "$PROJECT_ROOT/.specweave/state/auto-session.json" ]; then
        jq --arg endTime "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           --arg endReason "all_increments_complete" \
           '.status = "completed" | .endTime = $endTime | .endReason = $endReason' \
           "$PROJECT_ROOT/.specweave/state/auto-session.json" > "$PROJECT_ROOT/.specweave/state/auto-session.json.tmp" && \
           mv "$PROJECT_ROOT/.specweave/state/auto-session.json.tmp" "$PROJECT_ROOT/.specweave/state/auto-session.json"
    fi

    # Escape for JSON
    COMPLETION_MSG_ESCAPED=$(echo "$COMPLETION_MSG" | jq -Rs '.')

    echo "{\"decision\": \"approve\", \"systemMessage\": $COMPLETION_MSG_ESCAPED}"
    exit 0
fi

# ============================================================================
# Work Remains - Block Exit
# ============================================================================

# Get list of active increments for feedback
ACTIVE_INCREMENTS=$(find "$INCREMENTS_DIR" -type f -name "metadata.json" \
    -exec grep -l '"status":\s*"active"\|"status":\s*"in-progress"' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | head -5)

# Read session info for context
SESSION_FILE="$PROJECT_ROOT/.specweave/state/auto-session.json"
ITERATION=0
MAX_ITER=1000
if [ -f "$SESSION_FILE" ]; then
    ITERATION=$(jq -r '.iteration // 0' "$SESSION_FILE" 2>/dev/null || echo "0")
    MAX_ITER=$(jq -r '.maxIterations // 1000' "$SESSION_FILE" 2>/dev/null || echo "1000")

    # Increment iteration count
    NEW_ITER=$((ITERATION + 1))
    jq --arg iter "$NEW_ITER" '.iteration = ($iter | tonumber)' "$SESSION_FILE" > "${SESSION_FILE}.tmp" && \
        mv "${SESSION_FILE}.tmp" "$SESSION_FILE" 2>/dev/null || true
fi

# Read completion conditions from session if available
COMPLETION_CONDITIONS=""
if [ -f "$SESSION_FILE" ]; then
    # Parse completion conditions
    HAS_BUILD=$(jq -r '.completionConditions[]? | select(.type=="build") | .type' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_TESTS=$(jq -r '.completionConditions[]? | select(.type=="tests") | .type' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_E2E=$(jq -r '.completionConditions[]? | select(.type=="e2e") | .type' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_LINT=$(jq -r '.completionConditions[]? | select(.type=="lint") | .type' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_TYPES=$(jq -r '.completionConditions[]? | select(.type=="types") | .type' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_COVERAGE=$(jq -r '.completionConditions[]? | select(.type=="coverage") | .threshold' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_E2E_COV=$(jq -r '.completionConditions[]? | select(.type=="e2e-coverage") | .threshold' "$SESSION_FILE" 2>/dev/null | head -1)
    HAS_CMD=$(jq -r '.completionConditions[]? | select(.type=="command") | .cmd' "$SESSION_FILE" 2>/dev/null | head -1)
    TDD_MODE=$(jq -r '.tddMode // false' "$SESSION_FILE" 2>/dev/null)

    # Build conditions list
    if [ "$HAS_BUILD" = "build" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Build must pass\n"
    fi
    if [ "$HAS_TESTS" = "tests" ] || [ "$TDD_MODE" = "true" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Tests must pass\n"
    fi
    if [ "$HAS_E2E" = "e2e" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ E2E tests must pass\n"
    fi
    if [ "$HAS_LINT" = "lint" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Linting must pass\n"
    fi
    if [ "$HAS_TYPES" = "types" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Type-check must pass\n"
    fi
    if [ -n "$HAS_COVERAGE" ] && [ "$HAS_COVERAGE" != "null" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Coverage ≥ ${HAS_COVERAGE}%\n"
    fi
    if [ -n "$HAS_E2E_COV" ] && [ "$HAS_E2E_COV" != "null" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ E2E Coverage ≥ ${HAS_E2E_COV}%\n"
    fi
    if [ -n "$HAS_CMD" ] && [ "$HAS_CMD" != "null" ]; then
        COMPLETION_CONDITIONS="${COMPLETION_CONDITIONS}    ⬜ Command: ${HAS_CMD}\n"
    fi
fi

# Build system message with clear box art
SYSTEM_MSG="
╔══════════════════════════════════════════════════════════════════════════════╗
║                       🔄 AUTO MODE - CONTINUING                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  📊 Iteration: $NEW_ITER / $MAX_ITER                                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ⏳ Active increments remaining: $ACTIVE_COUNT                                 ║
║                                                                              ║
║  REMAINING WORK:                                                             ║
"

# Add first 3 active increments to message
COUNT=0
while IFS= read -r inc; do
    COUNT=$((COUNT + 1))
    SYSTEM_MSG="${SYSTEM_MSG}║    $COUNT. $inc
"
    if [ "$COUNT" -ge 3 ]; then
        break
    fi
done <<< "$ACTIVE_INCREMENTS"

if [ "$ACTIVE_COUNT" -gt 3 ]; then
    SYSTEM_MSG="${SYSTEM_MSG}║    ... and $((ACTIVE_COUNT - 3)) more
"
fi

SYSTEM_MSG="${SYSTEM_MSG}║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🛑 STOP CONDITIONS (session will stop when ALL are met):                    ║
║  ───────────────────────────────────────────────────────────────────────────  ║
║    ⬜ All tasks in increment marked [x] complete                             ║
║    ⬜ No active increments remaining                                         ║
"

# Add configured completion conditions
if [ -n "$COMPLETION_CONDITIONS" ]; then
    SYSTEM_MSG="${SYSTEM_MSG}$(printf '%b' "$COMPLETION_CONDITIONS")"
fi

SYSTEM_MSG="${SYSTEM_MSG}║  ───────────────────────────────────────────────────────────────────────────  ║
║    OR: Max iterations ($MAX_ITER) reached                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  NEXT ACTIONS:                                                               ║
║    1. Work on tasks with /sw:do                                              ║
║    2. Mark tasks complete → hooks auto-sync                                  ║
║    3. Run /sw:done when increment is finished                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

# Block exit with system message
jq -n \
    --arg decision "block" \
    --arg reason "Continue working - $ACTIVE_COUNT active increment(s) remaining" \
    --arg systemMessage "$SYSTEM_MSG" \
    '{decision: $decision, reason: $reason, systemMessage: $systemMessage}'

exit 0
