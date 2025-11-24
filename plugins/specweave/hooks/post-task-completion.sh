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

# ============================================================================
# PROJECT ROOT DETECTION (MUST BE FIRST - v0.26.1 FIX)
# ============================================================================
# CRITICAL FIX: PROJECT_ROOT must be defined BEFORE recursion guard creation
# BUG (v0.26.0): Used $PROJECT_ROOT on line 71 but defined it on line 112
# RESULT: Guard file created at wrong path (/.specweave/...) → recursion not prevented
# See: Incident 2025-11-24 (3x PreToolUse hook fires, Claude Code crash)

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
# RECURSION PREVENTION (CRITICAL - v0.26.0 - FILE-BASED GUARD)
# ============================================================================
# PROBLEM: Hooks that write files trigger other hooks, causing infinite loops.
# OLD SOLUTION (v0.25.1): Environment variable SPECWEAVE_IN_HOOK=1
# WHY IT FAILED: Background processes (&) create NEW shells that don't inherit env vars!
#
# NEW SOLUTION (v0.26.0): File-based recursion guard
# - Guard file exists = already inside hook chain
# - Works across ALL processes (not just current shell)
# - Atomic operation (mkdir -p ensures thread safety)
# - Cleanup guaranteed by trap EXIT
#
# Example infinite loop (BEFORE fix):
#   TodoWrite → post-task-completion.sh (sets SPECWEAVE_IN_HOOK=1)
#     → spawns background process (&)
#       → consolidated-sync.js (SPECWEAVE_IN_HOOK=0! lost!)
#         → fs.writeFile(tasks.md)
#           → post-edit-write-consolidated.sh (guard fails!)
#             → INFINITE RECURSION → 27 duplicate GitHub comments!
#
# With file-based guard (AFTER fix):
#   TodoWrite → post-task-completion.sh (creates .hook-recursion-guard file)
#     → spawns background process (&)
#       → consolidated-sync.js (inherits guard file!)
#         → fs.writeFile(tasks.md)
#           → post-edit-write-consolidated.sh (checks file, exits)
#             → NO RECURSION ✅
#
# See: .specweave/increments/0051-*/reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md
# See: ADR-0073 (Hook Recursion Prevention Strategy)

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # Silent exit - we're already inside a hook chain
  echo "[$(date)] ⏭️  Recursion guard detected - skipping (already in hook)" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Create guard file (atomic operation)
mkdir -p "$PROJECT_ROOT/.specweave/state" 2>/dev/null || true
touch "$RECURSION_GUARD_FILE"

# Ensure guard file is ALWAYS removed when script exits (even on error)
trap 'rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true' EXIT SIGINT SIGTERM

echo "[$(date)] 🔒 Recursion guard created" >> "$DEBUG_LOG" 2>/dev/null || true

# EMERGENCY KILL SWITCH (after recursion guard)
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

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

# FILE LOCK: Skip - lock moved INSIDE background subshell (v0.24.4 fix)
# Why: Lock must protect the ACTUAL work, not just the script startup
# Old behavior: Lock released when main script exits (before background work completes)
# New behavior: Lock held until background work completes (inside subshell)
# This prevents race conditions where rapid TodoWrite calls spawn multiple concurrent processes

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

  # ============================================================================
  # FILE LOCK (v0.24.4): Protect ACTUAL background work, not just script startup
  # ============================================================================
  # CRITICAL FIX: Lock was previously in main script, released before work completed
  # NOW: Lock is INSIDE background subshell, held until ALL work completes
  # This prevents race conditions from rapid TodoWrite calls

  LOCK_FILE=".specweave/state/.hook-post-task.lock"
  LOCK_TIMEOUT=30  # seconds (longer timeout for background work)

  LOCK_ACQUIRED=false
  for i in {1..30}; do
    if mkdir "$LOCK_FILE" 2>/dev/null; then
      LOCK_ACQUIRED=true
      # Ensure lock is removed when background job exits
      trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
      break
    fi

    # Check for stale lock
    if [[ -d "$LOCK_FILE" ]]; then
      LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
      if (( LOCK_AGE > LOCK_TIMEOUT )); then
        echo "[$(date)] 🔓 Removing stale lock (age: ${LOCK_AGE}s)" >> "$DEBUG_LOG" 2>/dev/null || true
        rmdir "$LOCK_FILE" 2>/dev/null || true
        continue
      fi
    fi

    sleep 1  # Wait longer between attempts (background work can take time)
  done

  if [[ "$LOCK_ACQUIRED" == "false" ]]; then
    echo "[$(date)] ⏭️  Another sync in progress, skipping (lock held)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi

  echo "[$(date)] 🔒 Lock acquired, starting background work" >> "$DEBUG_LOG" 2>/dev/null || true

  # ============================================================================
  # CRITICAL FIX: Read active increments from state file (NOT time-based detection)
  # ============================================================================
  # WHY: The old logic used 'ls -td' which:
  #   1. Could pick up completed increments if recently modified
  #   2. Caused infinite loops on increments with bad AC data
  #   3. Wasted resources syncing 50+ completed increments
  #
  # NEW: Only sync increments that are ACTIVELY being worked on
  # Source of truth: .specweave/state/active-increment.json
  # ============================================================================

  ACTIVE_STATE_FILE=".specweave/state/active-increment.json"
  ACTIVE_INCREMENTS=()

  if [[ ! -f "$ACTIVE_STATE_FILE" ]]; then
    echo "[$(date)] ⚠️  No active state file found, skipping all background work" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true  # Reset on success
    exit 0
  fi

  if command -v jq >/dev/null 2>&1; then
    # Use jq to parse the active increments array
    # NOTE: mapfile requires bash 4+, macOS has bash 3.2, use while read instead
    while IFS= read -r increment; do
      ACTIVE_INCREMENTS+=("$increment")
    done < <(jq -r '.ids[]' "$ACTIVE_STATE_FILE" 2>/dev/null)
  else
    # Fallback: simple grep parsing (less reliable, but works without jq)
    # Match only increment IDs: 4 digits, dash, then letters/numbers/dashes
    echo "[$(date)] ⚠️  jq not found, using fallback parsing" >> "$DEBUG_LOG" 2>/dev/null || true
    ACTIVE_INCREMENTS=($(grep -o '"[0-9]\{4\}-[a-zA-Z0-9][a-zA-Z0-9_-]*"' "$ACTIVE_STATE_FILE" 2>/dev/null | tr -d '"'))
  fi

  # If no active increments, skip all work
  if [[ ${#ACTIVE_INCREMENTS[@]} -eq 0 ]]; then
    echo "[$(date)] ✓ No active increments, skipping all background work (this is normal)" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true  # Reset on success
    exit 0
  fi

  echo "[$(date)] 📋 Found ${#ACTIVE_INCREMENTS[@]} active increment(s): ${ACTIVE_INCREMENTS[*]}" >> "$DEBUG_LOG" 2>/dev/null || true

  # Only proceed if Node.js is available
  if ! command -v node &> /dev/null; then
    echo "[$(date)] Node.js not found, skipping background work" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    exit 0
  fi

  # Track if ANY operation succeeded (for circuit breaker)
  ANY_SUCCESS=false

  # ============================================================================
  # PROCESS EACH ACTIVE INCREMENT
  # ============================================================================
  for CURRENT_INCREMENT in "${ACTIVE_INCREMENTS[@]}"; do
    echo "[$(date)] 🔄 Processing increment: $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Safety check: Verify increment exists and is not archived
    if [[ ! -d ".specweave/increments/$CURRENT_INCREMENT" ]]; then
      echo "[$(date)] ⚠️  Increment $CURRENT_INCREMENT not found, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
      continue
    fi

    if [[ -d ".specweave/increments/_archive/$CURRENT_INCREMENT" ]]; then
      echo "[$(date)] ⚠️  Increment $CURRENT_INCREMENT is archived, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
      continue
    fi

    # Additional safety: Check metadata status (skip completed/abandoned)
    METADATA_FILE=".specweave/increments/$CURRENT_INCREMENT/metadata.json"
    if [[ -f "$METADATA_FILE" ]] && command -v jq >/dev/null 2>&1; then
      INCREMENT_STATUS=$(jq -r '.status // "active"' "$METADATA_FILE" 2>/dev/null || echo "active")
      if [[ "$INCREMENT_STATUS" == "completed" ]] || [[ "$INCREMENT_STATUS" == "abandoned" ]]; then
        echo "[$(date)] ⏭️  Skipping $CURRENT_INCREMENT (status: $INCREMENT_STATUS)" >> "$DEBUG_LOG" 2>/dev/null || true
        continue
      fi
    fi

  # ============================================================================
  # CONSOLIDATED SYNC (v0.24.4 - PERFORMANCE OPTIMIZATION)
  # ============================================================================
  # EMERGENCY FIX (v0.26.0-hotfix): DISABLED TO PREVENT CLAUDE CODE CRASHES
  #
  # ROOT CAUSE: consolidated-sync.js makes 5+ Edit/Write operations, each triggering
  # 3 hooks (PreToolUse, PostToolUse×2), resulting in 15+ hook invocations per task.
  # This causes process exhaustion and Claude Code crashes.
  #
  # NEW STRATEGY: Run consolidated sync ONLY at:
  # 1. Session end (all tasks done + 120s inactivity)
  # 2. Manual sync (/specweave:sync-docs command)
  # 3. Increment closure (/specweave:done validation)
  #
  # See: .specweave/increments/0051-*/reports/CLAUDE-CODE-CRASH-ROOT-CAUSE-2025-11-23.md
  # See: ADR-0072 (Post-Task Hook Simplification)
  # ============================================================================

  # RE-ENABLED: Automatic sync on each TodoWrite (ACCEPTING CRASH RISK)
  # WARNING: This can cause Claude Code crashes if too many TodoWrite events fire rapidly
  # User explicitly requested re-enabling despite crash risk

  echo "[$(date)] 🚀 Running consolidated sync" >> "$DEBUG_LOG" 2>/dev/null || true

  # Find consolidated sync script
  CONSOLIDATED_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/consolidated-sync.js"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/consolidated-sync.js"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/consolidated-sync.js"
  elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/consolidated-sync.js" ]; then
    CONSOLIDATED_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/consolidated-sync.js"
  fi

  if [ -n "$CONSOLIDATED_SCRIPT" ]; then
    # Load GITHUB_TOKEN from .env for gh CLI authentication
    if [ -f "$PROJECT_ROOT/.env" ]; then
      # Extract GITHUB_TOKEN from .env (handles various formats)
      GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
      if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
        export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
        echo "[$(date)] ✅ GitHub token loaded from .env" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    fi

    # FIX (v0.26.0): Skip GitHub sync in post-task-completion hook
    # GitHub sync should ONLY run on increment COMPLETION, not task completion
    # This prevents 27 duplicate comments (see root cause analysis)
    export SKIP_GITHUB_SYNC=true

    # v0.26.1: SKIP_US_SYNC removed - no longer needed!
    # Automatic US sync restored with multi-layer protection:
    # 1. SKIP_EXTERNAL_SYNC guard at LivingDocsSync layer (prevents recursion)
    # 2. Smart throttle (60s window prevents spam)
    # 3. fs.writeFile() confirmed to NOT trigger hooks (test validated)
    # See: FS-WRITEFILE-HOOK-TEST-RESULTS-2025-11-24.md, ADR-0129

    # Run consolidated sync (single Node.js process handles ALL operations)
    if (cd "$PROJECT_ROOT" && node "$CONSOLIDATED_SCRIPT" "$CURRENT_INCREMENT") >> "$DEBUG_LOG" 2>&1; then
      echo "[$(date)] ✅ Consolidated sync completed" >> "$DEBUG_LOG" 2>/dev/null || true
      ANY_SUCCESS=true
    else
      echo "[$(date)] ⚠️  Consolidated sync failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  else
    echo "[$(date)] ⚠️  consolidated-sync.js not found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  fi

  done  # End of ACTIVE_INCREMENTS loop

  # ============================================================================
  # 6. STATUS LINE UPDATE (GLOBAL - outside loop)
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
