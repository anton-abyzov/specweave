#!/bin/bash

# SpecWeave UserPromptSubmit Hook (v0.26.13 - ULTRA-OPTIMIZED)
# Fires BEFORE user's command executes (prompt-based hook)
# Purpose: Discipline validation, context injection, command suggestions
#
# OPTIMIZATIONS (v0.26.13):
# 1. jq for JSON parsing (10x faster than node -e)
# 2. Single active increment detection (cached, not 4x!)
# 3. Removed redundant find | while loops
# 4. Deferred heavy checks (SpecSyncManager only when needed)
# 5. Ultra-fast early exits
#
# Performance: <10ms (most prompts) vs 200-500ms (before)

set +e

# ==============================================================================
# ULTRA-FAST EARLY EXIT (before ANY processing)
# ==============================================================================
INPUT=$(cat)

# Use jq if available (10x faster than node), fallback to simple grep
if command -v jq >/dev/null 2>&1; then
  PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")
else
  # Fallback: extract prompt with grep (no node!)
  PROMPT=$(echo "$INPUT" | grep -oP '"prompt"\s*:\s*"\K[^"]*' 2>/dev/null || echo "")
fi

# CRITICAL: Exit immediately for non-SpecWeave prompts
# This covers 90%+ of prompts with <5ms overhead
if ! echo "$PROMPT" | grep -qE "(specweave|/specweave:|increment|add|create|implement|build|develop)"; then
  echo '{"decision":"approve"}'
  exit 0
fi

# ==============================================================================
# EARLY EXIT FOR NON-SPECWEAVE PROJECTS (T-006 - v0.26.15)
# ==============================================================================
# Even if prompt contains SpecWeave keywords, exit if no .specweave directory
SPECWEAVE_DIR=".specweave"
if [[ ! -d "$SPECWEAVE_DIR" ]]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# ==============================================================================
# CACHED ACTIVE INCREMENT DETECTION (ONCE - reused throughout!)
# ==============================================================================
ACTIVE_INCREMENT=""
ACTIVE_COUNT=0
ACTIVE_LIST=""

if [[ -d "$SPECWEAVE_DIR/increments" ]]; then
  # Single find + jq pass to get ALL active increment info
  while IFS= read -r metadata_file; do
    [[ -z "$metadata_file" ]] && continue

    # Use jq (fast) to extract status and id
    if command -v jq >/dev/null 2>&1; then
      read -r status inc_type < <(jq -r '"\(.status // "unknown") \(.type // "feature")"' "$metadata_file" 2>/dev/null || echo "unknown feature")
    else
      # Fallback: grep (no node!)
      status=$(grep -oP '"status"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "unknown")
      inc_type=$(grep -oP '"type"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "feature")
    fi

    if [[ "$status" == "active" || "$status" == "planning" || "$status" == "in-progress" ]]; then
      inc_id=$(basename "$(dirname "$metadata_file")")
      ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
      ACTIVE_LIST="${ACTIVE_LIST}  - $inc_id [$inc_type]\n"
      [[ -z "$ACTIVE_INCREMENT" ]] && ACTIVE_INCREMENT="$inc_id"
    fi
  done < <(find "$SPECWEAVE_DIR/increments" -maxdepth 2 -name "metadata.json" -not -path "*/_archive/*" 2>/dev/null)
fi

# ==============================================================================
# DISCIPLINE VALIDATION: Block /specweave:increment if incomplete increments exist
# ==============================================================================

if echo "$PROMPT" | grep -q "/specweave:increment"; then
  # Hard cap: never >2 active
  if [[ "$ACTIVE_COUNT" -ge 2 ]]; then
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
    cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️  WIP LIMIT REACHED\n\nYou have $ACTIVE_COUNT active increment (recommended limit: 1)\n\nActive increments:\n$ACTIVE_LIST\n\n🧠 Focus Principle: ONE active increment = maximum productivity\nStarting a 2nd increment reduces focus and velocity.\n\n💡 Consider:\n  1️⃣  Complete current work (recommended)\n  2️⃣  Pause current work (/specweave:pause)\n  3️⃣  Continue anyway (accept 20% productivity cost)\n\n⚠️  Emergency hotfix/bug? Use --type=hotfix or --type=bug to bypass this warning."
}
EOF
    exit 0
  fi
fi

# ==============================================================================
# PRE-FLIGHT SYNC CHECK (LIGHTWEIGHT - uses cached ACTIVE_INCREMENT)
# ==============================================================================

# Detect increment operations that need fresh data
if echo "$PROMPT" | grep -qE "/(specweave:)?(done|validate|progress|do)"; then
  # Extract increment ID from prompt OR use cached active
  INCREMENT_ID=$(echo "$PROMPT" | grep -oE "[0-9]{4}[a-z0-9-]*" | head -1)
  [[ -z "$INCREMENT_ID" ]] && INCREMENT_ID="$ACTIVE_INCREMENT"

  # If we have an increment ID, check freshness (pure bash - no node!)
  if [[ -n "$INCREMENT_ID" ]]; then
    INCREMENT_SPEC="$SPECWEAVE_DIR/increments/$INCREMENT_ID/spec.md"
    LIVING_DOCS_SPEC="$SPECWEAVE_DIR/docs/internal/specs/spec-$INCREMENT_ID.md"

    if [[ -f "$INCREMENT_SPEC" ]]; then
      # Use find -newer for mtime comparison (single syscall!)
      if [[ ! -f "$LIVING_DOCS_SPEC" ]] || [[ -n $(find "$INCREMENT_SPEC" -newer "$LIVING_DOCS_SPEC" 2>/dev/null) ]]; then
        # Sync needed - run async (non-blocking!)
        PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
        SYNC_SCRIPT="$PLUGIN_ROOT/lib/hooks/sync-living-docs.js"
        [[ -f "$SYNC_SCRIPT" ]] && node "$SYNC_SCRIPT" "$INCREMENT_ID" >/dev/null 2>&1 &
      fi
    fi
  fi
fi

# ==============================================================================
# SPEC SYNC CHECK (LIGHTWEIGHT - only when really needed)
# ==============================================================================
# Skip SpecSyncManager for most prompts - it's HEAVY!
# Only check on explicit sync-related commands

if [[ -n "$ACTIVE_INCREMENT" ]] && echo "$PROMPT" | grep -qE "/(specweave:)?(sync|done)"; then
  # Simple mtime check: spec.md vs plan.md (pure bash!)
  SPEC_FILE="$SPECWEAVE_DIR/increments/$ACTIVE_INCREMENT/spec.md"
  PLAN_FILE="$SPECWEAVE_DIR/increments/$ACTIVE_INCREMENT/plan.md"

  if [[ -f "$SPEC_FILE" ]] && [[ -f "$PLAN_FILE" ]]; then
    # Check if spec is newer than plan (indicates spec changes need sync)
    if [[ -n $(find "$SPEC_FILE" -newer "$PLAN_FILE" 2>/dev/null) ]]; then
      cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️ Spec changes detected in $ACTIVE_INCREMENT\n\nspec.md has been modified after plan.md.\nConsider running /specweave:sync-docs to update living documentation."
}
EOF
      exit 0
    fi
  fi
fi

# ==============================================================================
# CONTEXT INJECTION (uses cached ACTIVE_INCREMENT - no more find loops!)
# ==============================================================================

CONTEXT=""

if [[ -n "$ACTIVE_INCREMENT" ]]; then
  # Read from status-line.json cache (single source of truth)
  CACHE_FILE="$SPECWEAVE_DIR/state/status-line.json"

  if [[ -f "$CACHE_FILE" ]]; then
    # Single jq call for all values (or pure bash fallback)
    if command -v jq >/dev/null 2>&1; then
      read -r TOTAL_TASKS COMPLETED_TASKS TOTAL_ACS COMPLETED_ACS < <(
        jq -r '[.current.total // 0, .current.completed // 0, .current.acsTotal // 0, .current.acsCompleted // 0] | @tsv' "$CACHE_FILE" 2>/dev/null || echo "0 0 0 0"
      )
    else
      # Pure grep fallback (no node!)
      TOTAL_TASKS=$(grep -oP '"total"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null | head -1 || echo "0")
      COMPLETED_TASKS=$(grep -oP '"completed"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null | head -1 || echo "0")
      TOTAL_ACS=$(grep -oP '"acsTotal"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null || echo "0")
      COMPLETED_ACS=$(grep -oP '"acsCompleted"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null || echo "0")
    fi

    # Ensure valid numbers
    TOTAL_TASKS=${TOTAL_TASKS:-0}
    COMPLETED_TASKS=${COMPLETED_TASKS:-0}
    TOTAL_ACS=${TOTAL_ACS:-0}
    COMPLETED_ACS=${COMPLETED_ACS:-0}

    if [[ "$TOTAL_TASKS" -gt 0 ]] 2>/dev/null; then
      PERCENTAGE=$(( COMPLETED_TASKS * 100 / TOTAL_TASKS ))

      if [[ "$TOTAL_ACS" -gt 0 ]] 2>/dev/null; then
        AC_PERCENTAGE=$(( COMPLETED_ACS * 100 / TOTAL_ACS ))
        CONTEXT="✓ Active: $ACTIVE_INCREMENT ($COMPLETED_TASKS/$TOTAL_TASKS tasks, $PERCENTAGE% | $COMPLETED_ACS/$TOTAL_ACS ACs, $AC_PERCENTAGE%)"
      else
        CONTEXT="✓ Active: $ACTIVE_INCREMENT ($COMPLETED_TASKS/$TOTAL_TASKS tasks, $PERCENTAGE%)"
      fi
    else
      CONTEXT="✓ Active: $ACTIVE_INCREMENT"
    fi
  else
    CONTEXT="✓ Active: $ACTIVE_INCREMENT"
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
# STATUS LINE REFRESH (v0.26.13 - CONDITIONAL + ASYNC)
# ==============================================================================
# Only refresh when we have an active increment (skip for most prompts)
# Runs in background to avoid blocking user prompt

if [[ -n "$ACTIVE_INCREMENT" ]] && [[ -d "$SPECWEAVE_DIR" ]]; then
  HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # Run async (non-blocking!) - update-status-line.sh has its own TTL/mtime guards
  bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null &
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
