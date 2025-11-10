#!/bin/bash

# SpecWeave UserPromptSubmit Hook
# Fires BEFORE user's command executes (prompt-based hook)
# Purpose: Discipline validation, context injection, command suggestions

set -euo pipefail

# Read input JSON from stdin
INPUT=$(cat)

# Extract prompt from JSON
PROMPT=$(echo "$INPUT" | node -e "
  const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
  console.log(input.prompt || '');
")

# ==============================================================================
# DISCIPLINE VALIDATION: Block /specweave:increment if incomplete increments exist
# ==============================================================================

if echo "$PROMPT" | grep -q "/specweave:increment"; then
  # Check for incomplete increments
  SPECWEAVE_DIR=".specweave"

  if [[ -d "$SPECWEAVE_DIR/increments" ]]; then
    INCOMPLETE_INCREMENTS=$(find "$SPECWEAVE_DIR/increments" -mindepth 1 -maxdepth 1 -type d | while read increment_dir; do
      metadata="$increment_dir/metadata.json"
      if [[ -f "$metadata" ]]; then
        status=$(node -e "
          try {
            const data = JSON.parse(require('fs').readFileSync('$metadata', 'utf-8'));
            console.log(data.status || 'unknown');
          } catch (e) {
            console.log('unknown');
          }
        ")

        if [[ "$status" == "active" || "$status" == "planning" ]]; then
          echo "$(basename "$increment_dir")"
        fi
      fi
    done)

    if [[ -n "$INCOMPLETE_INCREMENTS" ]]; then
      # Count incomplete increments
      COUNT=$(echo "$INCOMPLETE_INCREMENTS" | wc -l | xargs)

      # Block execution
      cat <<EOF
{
  "decision": "block",
  "reason": "❌ Cannot create new increment! You have $COUNT incomplete increment(s):\n\n$(echo "$INCOMPLETE_INCREMENTS" | sed 's/^/  - /')\n\n💡 Complete or close them first:\n  - /specweave:done <id>     # Mark as complete\n  - /specweave:pause <id>    # Pause for later\n  - /specweave:abandon <id>  # Abandon if obsolete\n\nℹ️ The discipline exists for a reason:\n  ✓ Prevents scope creep\n  ✓ Ensures completions are tracked\n  ✓ Maintains living docs accuracy\n  ✓ Keeps work focused"
}
EOF
      exit 0
    fi
  fi
fi

# ==============================================================================
# CONTEXT INJECTION: Add current increment status
# ==============================================================================

CONTEXT=""

# Find active increment
if [[ -d ".specweave/increments" ]]; then
  ACTIVE_INCREMENT=$(find .specweave/increments -mindepth 1 -maxdepth 1 -type d | while read increment_dir; do
    metadata="$increment_dir/metadata.json"
    if [[ -f "$metadata" ]]; then
      status=$(node -e "
        try {
          const data = JSON.parse(require('fs').readFileSync('$metadata', 'utf-8'));
          if (data.status === 'active') {
            console.log('$(basename "$increment_dir")');
          }
        } catch (e) {}
      ")

      if [[ -n "$status" ]]; then
        echo "$status"
        break
      fi
    fi
  done)

  if [[ -n "$ACTIVE_INCREMENT" ]]; then
    # Get task completion percentage
    TASKS_FILE=".specweave/increments/$ACTIVE_INCREMENT/tasks.md"
    if [[ -f "$TASKS_FILE" ]]; then
      TASK_STATS=$(grep -E "^\s*-\s*\[[ x]\]" "$TASKS_FILE" 2>/dev/null | wc -l | xargs || echo "0")
      COMPLETED_TASKS=$(grep -E "^\s*-\s*\[x\]" "$TASKS_FILE" 2>/dev/null | wc -l | xargs || echo "0")

      if [[ "$TASK_STATS" -gt 0 ]]; then
        PERCENTAGE=$(( COMPLETED_TASKS * 100 / TASK_STATS ))
        CONTEXT="📍 Active Increment: $ACTIVE_INCREMENT ($PERCENTAGE% complete, $COMPLETED_TASKS/$TASK_STATS tasks)"
      else
        CONTEXT="📍 Active Increment: $ACTIVE_INCREMENT"
      fi
    else
      CONTEXT="📍 Active Increment: $ACTIVE_INCREMENT"
    fi
  fi
fi

# ==============================================================================
# COMMAND SUGGESTIONS: Guide users to structured workflow
# ==============================================================================

if echo "$PROMPT" | grep -qiE "(add|create|implement|build|develop)" && ! echo "$PROMPT" | grep -q "/specweave:"; then
  if [[ -n "$CONTEXT" ]]; then
    CONTEXT="$CONTEXT

💡 TIP: Consider using SpecWeave commands for structured development:
  - /specweave:increment \"feature name\"  # Plan new increment
  - /specweave:do                         # Execute current tasks
  - /specweave:progress                   # Check progress"
  fi
fi

# ==============================================================================
# OUTPUT: Approve with context or no context
# ==============================================================================

if [[ -n "$CONTEXT" ]]; then
  cat <<EOF
{
  "decision": "approve",
  "systemMessage": "$CONTEXT"
}
EOF
else
  # Just approve, no extra context
  cat <<EOF
{
  "decision": "approve"
}
EOF
fi

exit 0
