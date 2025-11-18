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
  # Check increment discipline using check-discipline CLI command
  # This enforces WIP limits (max 1 active, hard cap 2)
  SPECWEAVE_DIR=".specweave"

  if [[ -d "$SPECWEAVE_DIR/increments" ]]; then
    # Run discipline check (exit code: 0=pass, 1=violations, 2=error)
    if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/increment/metadata-manager.js" ]]; then
      # Check active increments using MetadataManager
      ACTIVE_COUNT=$(node -e "
        try {
          const { MetadataManager } = require('./dist/src/core/increment/metadata-manager.js');
          const active = MetadataManager.getActive();
          console.log(active.length);
        } catch (e) {
          console.error('Error checking active increments:', e.message);
          process.exit(2);
        }
      " 2>/dev/null || echo "0")

      # Hard cap: never >2 active
      if [[ "$ACTIVE_COUNT" -ge 2 ]]; then
        # Get list of active increments for error message
        ACTIVE_LIST=$(node -e "
          try {
            const { MetadataManager } = require('./dist/src/core/increment/metadata-manager.js');
            const active = MetadataManager.getActive();
            active.forEach(inc => console.log('  - ' + inc.id + ' [' + inc.type + ']'));
          } catch (e) {}
        " 2>/dev/null || echo "")

        cat <<EOF
{
  "decision": "block",
  "reason": "❌ HARD CAP REACHED\n\nYou have $ACTIVE_COUNT active increments (absolute maximum: 2)\n\nActive increments:\n$ACTIVE_LIST\n\n💡 You MUST complete or pause existing work first:\n\n1️⃣  Complete an increment:\n   /specweave:done <id>\n\n2️⃣  Pause an increment:\n   /specweave:pause <id> --reason=\"...\"\n\n3️⃣  Check status:\n   /specweave:status\n\n📝 Multiple hotfixes? Combine them into ONE increment!\n   Example: 0009-security-fixes (SQL + XSS + CSRF)\n\n⛔ This limit is enforced for your productivity.\nResearch: 3+ concurrent tasks = 40% slower + more bugs"
}
EOF
        exit 0
      fi

      # Soft warning: 1 active (recommended limit)
      if [[ "$ACTIVE_COUNT" -ge 1 ]]; then
        # Get list of active increments for warning
        ACTIVE_LIST=$(node -e "
          try {
            const { MetadataManager } = require('./dist/src/core/increment/metadata-manager.js');
            const active = MetadataManager.getActive();
            active.forEach(inc => console.log('  - ' + inc.id + ' [' + inc.type + ']'));
          } catch (e) {}
        " 2>/dev/null || echo "")

        # Just warn, don't block (user can choose to continue)
        cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️  WIP LIMIT REACHED\n\nYou have $ACTIVE_COUNT active increment (recommended limit: 1)\n\nActive increments:\n$ACTIVE_LIST\n\n🧠 Focus Principle: ONE active increment = maximum productivity\nStarting a 2nd increment reduces focus and velocity.\n\n💡 Consider:\n  1️⃣  Complete current work (recommended)\n  2️⃣  Pause current work (/specweave:pause)\n  3️⃣  Continue anyway (accept 20% productivity cost)\n\n⚠️  Emergency hotfix/bug? Use --type=hotfix or --type=bug to bypass this warning."
}
EOF
        exit 0
      fi
    else
      # Fallback: check for active/planning status manually
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
        COUNT=$(echo "$INCOMPLETE_INCREMENTS" | wc -l | xargs)

        # Get incomplete task count for migration guidance
        MIGRATION_SCRIPT="$(dirname "${BASH_SOURCE[0]}")/lib/migrate-increment-work.sh"
        INCOMPLETE_TASKS=""

        for increment in $INCOMPLETE_INCREMENTS; do
          if [[ -x "$MIGRATION_SCRIPT" ]]; then
            TASK_COUNT=$("$MIGRATION_SCRIPT" count-incomplete "$increment" 2>/dev/null || echo "?")
            INCOMPLETE_TASKS="${INCOMPLETE_TASKS}\n  - $increment ($TASK_COUNT incomplete tasks)"
          else
            INCOMPLETE_TASKS="${INCOMPLETE_TASKS}\n  - $increment"
          fi
        done

        cat <<EOF
{
  "decision": "block",
  "reason": "❌ Cannot create new increment! You have $COUNT incomplete increment(s):$INCOMPLETE_TASKS\n\n💡 **SMART MIGRATION OPTIONS:**\n\n1️⃣  **Transfer Work** (Recommended)\n   Move incomplete tasks to new increment:\n   \`\`\`bash\n   # After creating new increment, run:\n   bash plugins/specweave/hooks/lib/migrate-increment-work.sh transfer <old-id> <new-id>\n   \`\`\`\n   ✅ Clean closure + work continues\n\n2️⃣  **Adjust WIP Limit** (Emergency Only)\n   Temporarily allow 3 active increments:\n   \`\`\`bash\n   bash plugins/specweave/hooks/lib/migrate-increment-work.sh adjust-wip 3\n   \`\`\`\n   ⚠️  20% productivity cost, revert ASAP\n\n3️⃣  **Force-Close** (Quick Fix)\n   Mark increment as complete (work lost):\n   \`\`\`bash\n   bash plugins/specweave/hooks/lib/migrate-increment-work.sh force-close <increment-id>\n   \`\`\`\n   ⚠️  Incomplete work NOT transferred!\n\n📝 **Traditional Options:**\n  - /specweave:done <id>     # Complete properly\n  - /specweave:pause <id>    # Pause for later\n  - /specweave:abandon <id>  # Abandon if obsolete\n\nℹ️ The discipline exists for a reason:\n  ✓ Prevents scope creep\n  ✓ Ensures completions are tracked\n  ✓ Maintains living docs accuracy\n  ✓ Keeps work focused"
}
EOF
        exit 0
      fi
    fi
  fi
fi

# ==============================================================================
# PRE-FLIGHT SYNC CHECK: Ensure living docs are fresh before operations
# ==============================================================================

# Detect increment operations that need fresh data
if echo "$PROMPT" | grep -qE "/(specweave:)?(done|validate|progress|do)"; then
  # Extract increment ID from prompt (if provided)
  INCREMENT_ID=$(echo "$PROMPT" | grep -oE "[0-9]{4}[a-z0-9-]*" | head -1)

  # If no ID in prompt, try to find active increment
  if [[ -z "$INCREMENT_ID" ]] && [[ -d ".specweave/increments" ]]; then
    INCREMENT_ID=$(find .specweave/increments -mindepth 1 -maxdepth 1 -type d | while read increment_dir; do
      metadata="$increment_dir/metadata.json"
      if [[ -f "$metadata" ]]; then
        status=$(node -e "
          try {
            const data = JSON.parse(require('fs').readFileSync('$metadata', 'utf-8'));
            if (data.status === 'active') {
              console.log('$(basename "$increment_dir")');
            }
          } catch (e) {}
        " 2>/dev/null)

        if [[ -n "$status" ]]; then
          echo "$status"
          break
        fi
      fi
    done)
  fi

  # If we have an increment ID, check freshness
  if [[ -n "$INCREMENT_ID" ]]; then
    INCREMENT_SPEC=".specweave/increments/$INCREMENT_ID/spec.md"
    LIVING_DOCS_SPEC=".specweave/docs/internal/specs/spec-$INCREMENT_ID.md"

    # Check if increment spec exists
    if [[ -f "$INCREMENT_SPEC" ]]; then
      # Get modification times
      if [[ "$(uname)" == "Darwin" ]]; then
        # macOS
        INCREMENT_MTIME=$(stat -f %m "$INCREMENT_SPEC" 2>/dev/null || echo 0)
        LIVING_DOCS_MTIME=$(stat -f %m "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
      else
        # Linux
        INCREMENT_MTIME=$(stat -c %Y "$INCREMENT_SPEC" 2>/dev/null || echo 0)
        LIVING_DOCS_MTIME=$(stat -c %Y "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
      fi

      # Check if increment is newer than living docs (or living docs doesn't exist)
      if [[ "$INCREMENT_MTIME" -gt "$LIVING_DOCS_MTIME" ]]; then
        # Sync needed - run sync-living-docs
        PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
        SYNC_SCRIPT="$PLUGIN_ROOT/lib/hooks/sync-living-docs.js"

        if [[ -f "$SYNC_SCRIPT" ]]; then
          # Run sync (capture output but don't block on errors)
          if node "$SYNC_SCRIPT" "$INCREMENT_ID" >/dev/null 2>&1; then
            # Success - sync completed
            :
          else
            # Sync failed - log but continue
            echo "[WARNING] Pre-flight sync failed for $INCREMENT_ID" >&2
          fi
        fi
      fi
    fi
  fi
fi

# ==============================================================================
# SPEC SYNC CHECK: Detect spec.md changes and warn about sync needed
# ==============================================================================

# Check if spec.md was modified after plan.md (requires sync)
if [[ -d ".specweave/increments" ]]; then
  # Find active increment
  ACTIVE_INCREMENT_FOR_SYNC=$(find .specweave/increments -mindepth 1 -maxdepth 1 -type d | while read increment_dir; do
    metadata="$increment_dir/metadata.json"
    if [[ -f "$metadata" ]]; then
      status=$(node -e "
        try {
          const data = JSON.parse(require('fs').readFileSync('$metadata', 'utf-8'));
          if (data.status === 'active') {
            console.log('$(basename "$increment_dir")');
          }
        } catch (e) {}
      " 2>/dev/null)

      if [[ -n "$status" ]]; then
        echo "$status"
        break
      fi
    fi
  done)

  if [[ -n "$ACTIVE_INCREMENT_FOR_SYNC" ]]; then
    # Check if SpecSyncManager detects changes
    if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/increment/spec-sync-manager.js" ]]; then
      SYNC_CHECK=$(node -e "
        try {
          const { SpecSyncManager } = require('./dist/src/core/increment/spec-sync-manager.js');
          const manager = new SpecSyncManager(process.cwd());
          const detection = manager.detectSpecChange('$ACTIVE_INCREMENT_FOR_SYNC');

          if (detection.specChanged) {
            const message = manager.formatSyncMessage(detection);
            console.log(JSON.stringify({ needsSync: true, message }));
          } else {
            console.log(JSON.stringify({ needsSync: false }));
          }
        } catch (e) {
          console.log(JSON.stringify({ needsSync: false, error: e.message }));
        }
      " 2>/dev/null || echo '{"needsSync":false}')

      NEEDS_SYNC=$(echo "$SYNC_CHECK" | node -e "
        try {
          const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          console.log(data.needsSync || false);
        } catch (e) {
          console.log(false);
        }
      ")

      if [[ "$NEEDS_SYNC" == "true" ]]; then
        SYNC_MESSAGE=$(echo "$SYNC_CHECK" | node -e "
          try {
            const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
            console.log(data.message || '');
          } catch (e) {
            console.log('');
          }
        ")

        # Show sync warning (don't block, just warn)
        cat <<EOF
{
  "decision": "approve",
  "systemMessage": "$SYNC_MESSAGE"
}
EOF
        exit 0
      fi
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
    # Simple status: parse tasks.md for completion
    TASKS_FILE=".specweave/increments/$ACTIVE_INCREMENT/tasks.md"
    if [[ -f "$TASKS_FILE" ]]; then
      # Count tasks (headers with T-NNN format - both ### and ####)
      TOTAL_TASKS=$(grep -cE '^#{3,4}\s*T-[0-9]' "$TASKS_FILE" 2>/dev/null | tr -d '\n' || echo "0")
      # Count completed (various formats)
      COMPLETED_TASKS=$(grep -cE '(✅ COMPLETE|\[COMPLETED\]|\[x\] Completed)' "$TASKS_FILE" 2>/dev/null | tr -d '\n' || echo "0")

      # Ensure valid numbers
      TOTAL_TASKS=${TOTAL_TASKS:-0}
      COMPLETED_TASKS=${COMPLETED_TASKS:-0}

      if [[ "$TOTAL_TASKS" -gt 0 ]] 2>/dev/null; then
        PERCENTAGE=$(( COMPLETED_TASKS * 100 / TOTAL_TASKS ))
        CONTEXT="✓ Active: $ACTIVE_INCREMENT ($COMPLETED_TASKS/$TOTAL_TASKS tasks, $PERCENTAGE%)"
      else
        CONTEXT="✓ Active: $ACTIVE_INCREMENT"
      fi
    else
      CONTEXT="✓ Active: $ACTIVE_INCREMENT"
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
# STATUS LINE REFRESH: Ensure cache is fresh before showing context
# ==============================================================================
# Performance: ~50-100ms (acceptable for UX)
# Frequency: Every user prompt (high coverage)
# Benefit: Catches ALL edge cases (manual edits, resume, direct changes)
#
# Why here? This hook runs on EVERY user prompt, ensuring status line
# is ALWAYS up-to-date before showing context to the user.
#
# Prevents desync scenarios:
# - Manual spec.md edits (status: planning → active)
# - /specweave:resume (status: paused → active)
# - Direct metadata changes (without hook triggers)
# - File system operations bypassing hooks
#
# Background execution: Runs async, doesn't block user prompt

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

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
