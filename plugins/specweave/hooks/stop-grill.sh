#!/bin/bash
# stop-grill.sh - Grill Reminder Hook (v1.0.228)
#
# Reminds users to run /sw:grill before closing increments.
# Triggers when session ends with active increments that haven't been grilled.
#
# This hook ALWAYS approves (never blocks sessions) but may show
# a reminder if there are active increments without grill markers.
#
# @since 1.0.228

set +e  # Never fail - this is a non-critical hook

# Read input from stdin (required by Claude Code hooks)
INPUT=$(cat)

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
SPECWEAVE_DIR="$PROJECT_ROOT/.specweave"
INCREMENTS_DIR="$SPECWEAVE_DIR/increments"
STATE_DIR="$SPECWEAVE_DIR/state"
CONFIG_FILE="$SPECWEAVE_DIR/config.json"

# Silent approve - default response
silent_approve() {
    echo '{"decision":"approve"}'
    exit 0
}

# Loud approve with message
loud_approve() {
    local msg="$1"
    jq -n \
        --arg decision "approve" \
        --arg msg "$msg" \
        '{decision: $decision, systemMessage: $msg}'
    exit 0
}

# Not a SpecWeave project - silent approve
[ ! -d "$SPECWEAVE_DIR" ] && silent_approve
[ ! -d "$INCREMENTS_DIR" ] && silent_approve

# Check if grill is required (default: true)
GRILL_REQUIRED="true"
if [ -f "$CONFIG_FILE" ]; then
    GRILL_REQUIRED=$(jq -r '.grill.required // true' "$CONFIG_FILE" 2>/dev/null || echo "true")
fi

# If grill is not required, silent approve
[ "$GRILL_REQUIRED" != "true" ] && silent_approve

# Find active increments
ACTIVE_INCREMENTS=$(find "$INCREMENTS_DIR" -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"status"[[:space:]]*:[[:space:]]*"active\|"status"[[:space:]]*:[[:space:]]*"in-progress' {} \; 2>/dev/null \
    | sed 's|.*/\([^/]*\)/metadata.json|\1|' | sort)

# No active increments - silent approve
[ -z "$ACTIVE_INCREMENTS" ] && silent_approve

# Check which increments are missing grill markers
UNGRILLED=""
for inc_id in $ACTIVE_INCREMENTS; do
    MARKER_FILE="$STATE_DIR/.sw-grill-passed-$inc_id"
    if [ ! -f "$MARKER_FILE" ]; then
        [ -n "$UNGRILLED" ] && UNGRILLED="$UNGRILLED, "
        UNGRILLED="$UNGRILLED$inc_id"
    fi
done

# All increments grilled - silent approve
[ -z "$UNGRILLED" ] && silent_approve

# Count ungrilled
UNGRILLED_COUNT=$(echo "$UNGRILLED" | tr ',' '\n' | grep -v '^$' | wc -l | tr -d ' ')

# Show reminder
FIRST_INC=$(echo "$UNGRILLED" | cut -d',' -f1 | tr -d ' ')

REMINDER_MSG="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 GRILL REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$UNGRILLED_COUNT increment(s) need code review before closing:
  $UNGRILLED

Run grill before closing:
  /sw:grill $FIRST_INC

The grill reviews your code for:
  • Security vulnerabilities
  • Performance issues
  • Edge cases and error handling
  • Code quality and maintainability

After grill passes, you can close with:
  /sw:done $FIRST_INC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

loud_approve "$REMINDER_MSG"
