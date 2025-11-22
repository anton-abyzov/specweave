#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# SMART SESSION-END DETECTION (v2.0):
# =====================================
# Problem: Claude creates multiple todo lists in one conversation
# - List 1: [A, B, C] → completes → sound plays
# - List 2: [D, E] → completes 30s later → sound plays again
# - User hears sounds while Claude is still working!
#
# Solution: Inactivity-based detection
# - Track time gaps BETWEEN TodoWrite calls
# - If all tasks complete AND gap > INACTIVITY_THRESHOLD (15s)
#   → Session is winding down → Play sound
# - If rapid completions (gap < threshold)
#   → Claude still actively working → Skip sound
#
# Example:
# 10:00:00 - Task done (gap: 5s) → skip sound
# 10:00:05 - Task done (gap: 5s) → skip sound
# 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
# ...
# 10:01:00 - All done (gap: 50s) → PLAY SOUND! (session ending)
#
# DEBOUNCING: Prevents duplicate fires (Claude Code calls hooks twice)

# EMERGENCY FIXES (v0.24.3): CRITICAL SAFETY FIRST
# - Remove set -e completely to prevent any errors from propagating
# - Kill switch: SPECWEAVE_DISABLE_HOOKS=1 disables all hooks
# - Circuit breaker: Auto-disable after 3 consecutive failures
# - File locking: Only 1 instance can run at a time
# - Aggressive debouncing: 5 seconds (was 5s, keeping it)
# - Complete error isolation: ALL background work wrapped

set +e  # NEVER use set -e in hooks - it causes crashes

# EMERGENCY KILL SWITCH FIRST (before anything else)
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root by searching upward for .specweave/ directory
# Works regardless of where hook is installed (source or .claude/hooks/)
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# EMERGENCY SAFETY CHECKS
# ============================================================================

# CIRCUIT BREAKER: Auto-disable after consecutive failures
CIRCUIT_BREAKER_FILE=".specweave/state/.hook-circuit-breaker"
CIRCUIT_BREAKER_THRESHOLD=3

mkdir -p ".specweave/state" 2>/dev/null || true

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    # Circuit breaker is OPEN - hooks are disabled
    exit 0
  fi
fi

# FILE LOCK: Only allow 1 post-task-completion hook at a time
LOCK_FILE=".specweave/state/.hook-post-task.lock"
LOCK_TIMEOUT=10  # seconds (longer than others because this does more work)

LOCK_ACQUIRED=false
for i in {1..10}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check for stale lock
  if [[ -d "$LOCK_FILE" ]]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
    if (( LOCK_AGE > LOCK_TIMEOUT )); then
      rmdir "$LOCK_FILE" 2>/dev/null || true
      continue
    fi
  fi

  sleep 0.2
done

if [[ "$LOCK_ACQUIRED" == "false" ]]; then
  # Another instance is running, skip
  exit 0
fi

# ============================================================================
# CONFIGURATION
# ============================================================================

# Debounce window to prevent duplicate hook fires
# AGGRESSIVE: 5 seconds to prevent rapid-fire executions
DEBOUNCE_SECONDS=5

# Inactivity threshold to detect session end
# If gap between TodoWrite calls > this value, assume session is ending
INACTIVITY_THRESHOLD=120  # seconds (2 minutes - increased from 15s to reduce false positives)

# File paths
LOGS_DIR=".specweave/logs"
LAST_FIRE_FILE="$LOGS_DIR/last-hook-fire"
LAST_TODOWRITE_FILE="$LOGS_DIR/last-todowrite-time"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
TASKS_LOG="$LOGS_DIR/tasks.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Log rotation: Keep tasks.log under 100KB (keep last 200 lines)
if [[ -f "$TASKS_LOG" ]] && [[ $(wc -c < "$TASKS_LOG" 2>/dev/null || echo 0) -gt 102400 ]]; then
  tail -200 "$TASKS_LOG" > "$TASKS_LOG.tmp" 2>/dev/null || true
  mv "$TASKS_LOG.tmp" "$TASKS_LOG" 2>/dev/null || true
  echo "[$(date)] Log rotated (was >100KB)" >> "$TASKS_LOG" 2>/dev/null || true
fi

# ============================================================================
# DEBOUNCING
# ============================================================================

CURRENT_TIME=$(date +%s)

# Skip if hook fired within last N seconds (prevents duplicates)
if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    echo "[$(date)] ⏭️  Debounced (last fire: ${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
    cat <<EOF
{
  "continue": true
}
EOF
    exit 0
  fi
fi

echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# ============================================================================
# CAPTURE INPUT
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] 📋 TodoWrite hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# INACTIVITY DETECTION
# ============================================================================

INACTIVITY_GAP=0
PREVIOUS_TODOWRITE_TIME=0

if [ -f "$LAST_TODOWRITE_FILE" ]; then
  PREVIOUS_TODOWRITE_TIME=$(cat "$LAST_TODOWRITE_FILE" 2>/dev/null || echo "0")
  INACTIVITY_GAP=$((CURRENT_TIME - PREVIOUS_TODOWRITE_TIME))
  echo "[$(date)] ⏱️  Inactivity gap: ${INACTIVITY_GAP}s (threshold: ${INACTIVITY_THRESHOLD}s)" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] 🆕 First TodoWrite in session" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# Save current timestamp for next call
echo "$CURRENT_TIME" > "$LAST_TODOWRITE_FILE"

# ============================================================================
# PARSE TASK COMPLETION STATE
# ============================================================================

ALL_COMPLETED=false

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (more reliable)
  PENDING_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status != "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "1")
  TOTAL_COUNT=$(jq -r '.tool_input.todos // [] | length' "$STDIN_DATA" 2>/dev/null || echo "0")

  echo "[$(date)] 📊 Tasks: $((TOTAL_COUNT - PENDING_COUNT))/$TOTAL_COUNT completed" >> "$DEBUG_LOG" 2>/dev/null || true

  if [ "$PENDING_COUNT" = "0" ] && [ "$TOTAL_COUNT" != "0" ]; then
    ALL_COMPLETED=true
  fi
else
  # Fallback: Simple grep check (less reliable but works without jq)
  if grep -q '"status":"pending"\|"status":"in_progress"' "$STDIN_DATA" 2>/dev/null; then
    ALL_COMPLETED=false
  else
    ALL_COMPLETED=true
  fi
fi

rm -f "$STDIN_DATA"

# ============================================================================
# SESSION-END DETECTION LOGIC
# ============================================================================

SESSION_ENDING=false
DECISION_REASON=""

if [ "$ALL_COMPLETED" = "true" ]; then
  if [ "$INACTIVITY_GAP" -ge "$INACTIVITY_THRESHOLD" ]; then
    SESSION_ENDING=true
    DECISION_REASON="All tasks complete + ${INACTIVITY_GAP}s inactivity ≥ ${INACTIVITY_THRESHOLD}s threshold"
    echo "[$(date)] 🎉 SESSION ENDING DETECTED! ($DECISION_REASON)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    DECISION_REASON="All tasks complete, but rapid activity (${INACTIVITY_GAP}s < ${INACTIVITY_THRESHOLD}s) - Claude likely creating more work"
    echo "[$(date)] ⚡ $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  DECISION_REASON="Tasks remaining in current list"
  echo "[$(date)] 🔄 $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# CONSOLIDATED BACKGROUND WORK (ALL I/O OPERATIONS IN SINGLE PROCESS)
# ============================================================================
# EMERGENCY FIX: Instead of spawning 6+ separate Node.js processes, consolidate
# ALL background work into a single background job with complete error isolation
# This prevents process exhaustion that causes Claude Code crashes

(
  set +e  # Disable error propagation in background job

  # Detect current increment ONCE
  CURRENT_INCREMENT=$(ls -td .specweave/increments/*/ 2>/dev/null | xargs -n1 basename | grep -v "_backlog" | grep -v "_archive" | grep -v "_working" | head -1)

  if [[ -z "$CURRENT_INCREMENT" ]]; then
    echo "[$(date)] No active increment, skipping all background work" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true  # Reset on success
    exit 0
  fi

  echo "[$(date)] Starting consolidated background work for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

  # Only proceed if Node.js is available
  if ! command -v node &> /dev/null; then
    echo "[$(date)] Node.js not found, skipping background work" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    exit 0
  fi

  # Track if ANY operation succeeded (for circuit breaker)
  ANY_SUCCESS=false

  # ============================================================================
  # 1. UPDATE TASKS.MD
  # ============================================================================
  if [ -f ".specweave/increments/$CURRENT_INCREMENT/tasks.md" ]; then
    echo "[$(date)] 📝 Updating tasks.md" >> "$DEBUG_LOG" 2>/dev/null || true

    UPDATE_TASKS_SCRIPT=""
    if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/update-tasks-md.js" ]; then
      UPDATE_TASKS_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/update-tasks-md.js"
    elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-tasks-md.js" ]; then
      UPDATE_TASKS_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-tasks-md.js"
    elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-tasks-md.js" ]; then
      UPDATE_TASKS_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-tasks-md.js"
    elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-tasks-md.js" ]; then
      UPDATE_TASKS_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-tasks-md.js"
    fi

    if [ -n "$UPDATE_TASKS_SCRIPT" ]; then
      if node "$UPDATE_TASKS_SCRIPT" "$CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>&1; then
        echo "[$(date)] ✅ tasks.md updated" >> "$DEBUG_LOG" 2>/dev/null || true
        ANY_SUCCESS=true
      else
        echo "[$(date)] ⚠️  tasks.md update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    fi
  fi

  # ============================================================================
  # 2. SYNC LIVING DOCS
  # ============================================================================
  # Skip if increment is archived
  if [ ! -d ".specweave/increments/_archive/$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 📚 Syncing living docs" >> "$DEBUG_LOG" 2>/dev/null || true

    # Extract feature ID and project ID
    FEATURE_ID=""
    SPEC_MD_PATH=".specweave/increments/$CURRENT_INCREMENT/spec.md"

    if [ -f "$SPEC_MD_PATH" ]; then
      FEATURE_ID=$(awk 'BEGIN{in_fm=0}/^---$/{if(in_fm==0){in_fm=1;next}else{exit}}in_fm==1&&/^epic:/{gsub(/^epic:[ \t]*/,"");gsub(/["'\'']/,"");print;exit}' "$SPEC_MD_PATH" | tr -d '\r\n')
    fi

    PROJECT_ID="default"
    if [ -f ".specweave/config.json" ] && command -v jq >/dev/null 2>&1; then
      ACTIVE_PROJECT=$(jq -r '.activeProject // "default"' ".specweave/config.json" 2>/dev/null || echo "default")
      if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
        PROJECT_ID="$ACTIVE_PROJECT"
      fi
    fi

    # Find sync script
    SYNC_SCRIPT=""
    if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      SYNC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js"
    elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      SYNC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
    elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      SYNC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
    elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]; then
      SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
    fi

    if [ -n "$SYNC_SCRIPT" ]; then
      if [ -n "$FEATURE_ID" ]; then
        if (cd "$PROJECT_ROOT" && FEATURE_ID="$FEATURE_ID" PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$CURRENT_INCREMENT") >> "$DEBUG_LOG" 2>&1; then
          echo "[$(date)] ✅ Living docs synced" >> "$DEBUG_LOG" 2>/dev/null || true
          ANY_SUCCESS=true
        else
          echo "[$(date)] ⚠️  Living docs sync failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        fi
      else
        if (cd "$PROJECT_ROOT" && PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$CURRENT_INCREMENT") >> "$DEBUG_LOG" 2>&1; then
          echo "[$(date)] ✅ Living docs synced" >> "$DEBUG_LOG" 2>/dev/null || true
          ANY_SUCCESS=true
        else
          echo "[$(date)] ⚠️  Living docs sync failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        fi
      fi
    fi
  fi

  # ============================================================================
  # 3. UPDATE AC STATUS
  # ============================================================================
  echo "[$(date)] ✓ Updating AC status" >> "$DEBUG_LOG" 2>/dev/null || true

  UPDATE_AC_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
    UPDATE_AC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/update-ac-status.js"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
    UPDATE_AC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-ac-status.js"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
    UPDATE_AC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-ac-status.js"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-ac-status.js" ]; then
    UPDATE_AC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-ac-status.js"
  fi

  if [ -n "$UPDATE_AC_SCRIPT" ]; then
    if (cd "$PROJECT_ROOT" && node "$UPDATE_AC_SCRIPT" "$CURRENT_INCREMENT") >> "$DEBUG_LOG" 2>&1; then
      echo "[$(date)] ✅ AC status updated" >> "$DEBUG_LOG" 2>/dev/null || true
      ANY_SUCCESS=true
    else
      echo "[$(date)] ⚠️  AC status update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi

  # ============================================================================
  # 4. TRANSLATE LIVING DOCS (if needed)
  # ============================================================================
  echo "[$(date)] 🌐 Checking translation needs" >> "$DEBUG_LOG" 2>/dev/null || true

  TRANSLATE_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
    TRANSLATE_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/translate-living-docs.js"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
    TRANSLATE_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/translate-living-docs.js"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
    TRANSLATE_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/translate-living-docs.js"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-living-docs.js" ]; then
    TRANSLATE_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-living-docs.js"
  fi

  if [ -n "$TRANSLATE_SCRIPT" ]; then
    if (cd "$PROJECT_ROOT" && node "$TRANSLATE_SCRIPT" "$CURRENT_INCREMENT") >> "$DEBUG_LOG" 2>&1; then
      echo "[$(date)] ✅ Translation checked" >> "$DEBUG_LOG" 2>/dev/null || true
      ANY_SUCCESS=true
    fi
  fi

  # ============================================================================
  # 5. SELF-REFLECTION (only if all tasks complete)
  # ============================================================================
  if [ "$ALL_COMPLETED" = "true" ]; then
    echo "[$(date)] 🤔 Preparing reflection" >> "$DEBUG_LOG" 2>/dev/null || true

    LATEST_TASK=$(grep "^## T-[0-9]" ".specweave/increments/$CURRENT_INCREMENT/tasks.md" 2>/dev/null | tail -1 | awk '{print $2}' | sed 's/://')

    if [ -n "$LATEST_TASK" ]; then
      REFLECTION_SCRIPT=""
      if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        REFLECTION_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/prepare-reflection-context.js"
      elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        REFLECTION_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js"
      elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        REFLECTION_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js"
      elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/prepare-reflection-context.js" ]; then
        REFLECTION_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/prepare-reflection-context.js"
      fi

      if [ -n "$REFLECTION_SCRIPT" ]; then
        if (cd "$PROJECT_ROOT" && node "$REFLECTION_SCRIPT" "$CURRENT_INCREMENT" "$LATEST_TASK") >> "$DEBUG_LOG" 2>&1; then
          echo "[$(date)] ✅ Reflection prepared" >> "$DEBUG_LOG" 2>/dev/null || true
          ANY_SUCCESS=true
        fi
      fi
    fi
  fi

  # ============================================================================
  # 6. STATUS LINE UPDATE
  # ============================================================================
  echo "[$(date)] 📊 Updating status line" >> "$DEBUG_LOG" 2>/dev/null || true

  HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if bash "$HOOK_DIR/lib/update-status-line.sh" >> "$DEBUG_LOG" 2>&1; then
    echo "[$(date)] ✅ Status line updated" >> "$DEBUG_LOG" 2>/dev/null || true
    ANY_SUCCESS=true
  else
    echo "[$(date)] ⚠️  Status line update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi

  # ============================================================================
  # CIRCUIT BREAKER UPDATE
  # ============================================================================
  if [ "$ANY_SUCCESS" = "true" ]; then
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
  else
    CURRENT_FAILURES=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
    echo "$((CURRENT_FAILURES + 1))" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
  fi

  echo "[$(date)] Consolidated background work completed (success=$ANY_SUCCESS)" >> "$DEBUG_LOG" 2>/dev/null || true

) &

# Disown background process immediately
disown 2>/dev/null || true

# ============================================================================
# PLAY SOUND (only if session is truly ending)
# ============================================================================

play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\chimes.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

if [ "$SESSION_ENDING" = "true" ]; then
  echo "[$(date)] 🔔 Playing completion sound" >> "$DEBUG_LOG" 2>/dev/null || true
  play_sound
fi

# ============================================================================
# LOGGING
# ============================================================================

echo "[$(date)] Status: All_completed=$ALL_COMPLETED, Session_ending=$SESSION_ENDING, Inactivity=${INACTIVITY_GAP}s" >> "$TASKS_LOG" 2>/dev/null || true
echo "[$(date)] Reason: $DECISION_REASON" >> "$TASKS_LOG" 2>/dev/null || true
echo "---" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

if [ "$SESSION_ENDING" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🎉 ALL WORK COMPLETED! Session ending detected (${INACTIVITY_GAP}s inactivity). Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
}
EOF
elif [ "$ALL_COMPLETED" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task batch completed (${INACTIVITY_GAP}s since last activity). Continuing work..."
}
EOF
else
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task completed. More tasks remaining - keep going!"
}
EOF
fi

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
