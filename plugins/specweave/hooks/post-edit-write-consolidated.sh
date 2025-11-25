#!/bin/bash
#
# Post-Edit/Write Consolidated Hook: Update Status Line After spec.md or tasks.md Changes
#
# Purpose: Unified hook for both Edit and Write tools
# Triggers: After Edit/Write modifies spec.md (AC updates) or tasks.md (task completion)
# Action: Updates status line cache to reflect latest AC/task progress
#
# CONSOLIDATION (v0.25.0):
# - Replaces post-edit-spec.sh and post-write-spec.sh (identical code)
# - Reduces hook overhead by 50% (2 post-hooks → 1)
# - Single point of maintenance
# - Combined with pre-edit-write-consolidated.sh, reduces 4 hooks → 2 hooks
#
# This ensures status line stays in sync when ACs are marked complete via Edit tool
# (not just TodoWrite, which only tracks internal todo lists)
#
# EMERGENCY FIXES (v0.24.3):
# - Kill switch: Set SPECWEAVE_DISABLE_HOOKS=1 to disable ALL hooks
# - Circuit breaker: Auto-disable after 3 consecutive failures
# - File locking: Prevent concurrent executions (max 1 at a time)
# - Aggressive debouncing: Increased from 1s to 5s
# - Complete error isolation: Never let errors reach Claude Code
#
# TIER 1 IMPROVEMENTS (v0.24.2):
# - Debouncing: Skip if updated less than 5 seconds ago (90% overhead reduction)
# - File mtime detection: Check recently modified spec.md/tasks.md as fallback
# - Non-blocking: Run update-status-line.sh in background
# - Smart detection: Only update if spec/tasks files actually changed
#
# Previous fix (v0.24.1): Enhanced file detection for increment completion
# - Detects changes via TOOL_USE_CONTENT, TOOL_RESULT, and argument parsing
# - Always updates status line for ANY spec.md/tasks.md change in increments folder

# CRITICAL: Remove set -e to prevent hook errors from crashing Claude Code
set +e

# Find project root (must be BEFORE recursion guard to get PROJECT_ROOT)
find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)

# ULTRA-FAST EARLY EXIT FOR NON-SPECWEAVE PROJECTS (T-006 - v0.26.15)
if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  exit 0
fi

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

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
# See: .specweave/increments/0051-*/reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md
# See: ADR-0073 (Hook Recursion Prevention Strategy)

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # Silent exit - we're already inside a hook chain
  # This is NORMAL and prevents recursion (not an error!)
  exit 0
fi

# Don't create guard file here - we only CHECK it
# Guard file is ONLY created by post-task-completion.sh (the entry point)
# All other hooks just check for its existence

# EMERGENCY KILL SWITCH: Disable all hooks if env variable set
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Ensure state and logs directories exist
mkdir -p "$PROJECT_ROOT/.specweave/state" "$LOGS_DIR" 2>/dev/null || true

# EMERGENCY CIRCUIT BREAKER: Track consecutive failures
CIRCUIT_BREAKER_FILE="$PROJECT_ROOT/.specweave/state/.hook-circuit-breaker"
CIRCUIT_BREAKER_THRESHOLD=3

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    echo "[$(date)] CIRCUIT BREAKER OPEN: Hooks disabled after $FAILURE_COUNT failures. Run: rm $CIRCUIT_BREAKER_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi
fi

# EMERGENCY FILE LOCK: Prevent concurrent executions
LOCK_FILE="$PROJECT_ROOT/.specweave/state/.hook-post-edit-write.lock"
LOCK_TIMEOUT=5  # seconds

# Try to acquire lock with timeout
LOCK_ACQUIRED=false
for i in {1..5}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check if lock is stale (older than LOCK_TIMEOUT seconds)
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
  echo "[$(date)] post-edit-write: Could not acquire lock, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Log rotation: Keep debug log under 100KB
if [[ -f "$DEBUG_LOG" ]] && [[ $(wc -c < "$DEBUG_LOG" 2>/dev/null || echo 0) -gt 102400 ]]; then
  tail -100 "$DEBUG_LOG" > "$DEBUG_LOG.tmp" 2>/dev/null || true
  mv "$DEBUG_LOG.tmp" "$DEBUG_LOG" 2>/dev/null || true
  echo "[$(date)] Log rotated" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# BURST WRITE DETECTION (v0.26.2 - Prevent Write Storms)
# ============================================================================
# Problem: Architect agent creating multiple ADRs in one response (6+ writes/minute)
# Solution: Detect burst writes and throttle if necessary
# Incident: 2025-11-24 (Increment 0052 - architect created 6 ADRs at once)
BURST_TIMESTAMPS_FILE="$PROJECT_ROOT/.specweave/state/.write-timestamps"
BURST_WINDOW=10      # seconds
BURST_THRESHOLD=5    # max writes in window
BURST_THROTTLE=2     # seconds to wait if burst detected

# Record this write timestamp
mkdir -p "$(dirname "$BURST_TIMESTAMPS_FILE")" 2>/dev/null || true
echo "$(date +%s)" >> "$BURST_TIMESTAMPS_FILE" 2>/dev/null || true

# Count writes in the last BURST_WINDOW seconds
if [[ -f "$BURST_TIMESTAMPS_FILE" ]]; then
  NOW=$(date +%s)
  CUTOFF=$((NOW - BURST_WINDOW))

  # Clean up old timestamps (older than BURST_WINDOW)
  grep -v "^$" "$BURST_TIMESTAMPS_FILE" 2>/dev/null | \
    awk -v cutoff="$CUTOFF" '$1 > cutoff' > "$BURST_TIMESTAMPS_FILE.tmp" 2>/dev/null || true
  mv "$BURST_TIMESTAMPS_FILE.tmp" "$BURST_TIMESTAMPS_FILE" 2>/dev/null || true

  # Count recent writes
  RECENT_WRITES=$(wc -l < "$BURST_TIMESTAMPS_FILE" 2>/dev/null || echo 0)

  if (( RECENT_WRITES > BURST_THRESHOLD )); then
    echo "[$(date)] ⚠️  BURST DETECTED: $RECENT_WRITES writes in ${BURST_WINDOW}s (threshold: $BURST_THRESHOLD)" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "[$(date)] Throttling for ${BURST_THROTTLE}s to prevent overload..." >> "$DEBUG_LOG" 2>/dev/null || true
    sleep "$BURST_THROTTLE"
  fi
fi

# ============================================================================
# TIER 1 FIX: Debouncing (Prevent Redundant Updates)
# ============================================================================
# Skip update if we updated less than 5 seconds ago (INCREASED FROM 1s)
# This handles rapid consecutive changes (e.g., 10 tasks marked complete quickly)
LAST_UPDATE_FILE="$PROJECT_ROOT/.specweave/state/.last-status-update"
DEBOUNCE_SECONDS=5

if [[ -f "$LAST_UPDATE_FILE" ]]; then
  LAST_UPDATE=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  TIME_SINCE_UPDATE=$((NOW - LAST_UPDATE))

  if (( TIME_SINCE_UPDATE < DEBOUNCE_SECONDS )); then
    echo "[$(date)] post-edit-write: Debounced (${TIME_SINCE_UPDATE}s since last update)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0  # Skip this update
  fi
fi

# ============================================================================
# TIER 2: Check for PreToolUse Signal (Primary Detection Method)
# ============================================================================
PENDING_FILE="$PROJECT_ROOT/.specweave/state/.pending-status-update"
METRICS_FILE="$PROJECT_ROOT/.specweave/state/hook-metrics.jsonl"
DETECTED_FILE=""
DETECTION_METHOD="none"

# First, check if PreToolUse hook left a signal
if [[ -f "$PENDING_FILE" ]]; then
  DETECTED_FILE=$(cat "$PENDING_FILE" 2>/dev/null || echo "")
  # Delete pending file immediately (consume signal)
  rm "$PENDING_FILE" 2>/dev/null || true

  if [[ -n "$DETECTED_FILE" ]]; then
    DETECTION_METHOD="pretooluse"
    echo "[$(date)] post-edit-write: File from PreToolUse signal: $DETECTED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true

    # Record Tier 2 success metric
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "{\"timestamp\":\"$TIMESTAMP\",\"hook\":\"post-edit-write\",\"event\":\"tier2_success\",\"method\":\"pretooluse\"}" >> "$METRICS_FILE" 2>/dev/null || true
  fi
fi

# ============================================================================
# TIER 1 FALLBACK: Environment Variable Detection
# ============================================================================
# If PreToolUse didn't provide signal, fall back to Tier 1 methods
if [[ -z "$DETECTED_FILE" ]]; then
  # Method 1: TOOL_USE_CONTENT environment variable
  if [[ -n "${TOOL_USE_CONTENT:-}" ]]; then
    DETECTED_FILE="$TOOL_USE_CONTENT"
    DETECTION_METHOD="env_content"
  fi

  # Method 2: TOOL_RESULT environment variable
  if [[ -z "$DETECTED_FILE" ]] && [[ -n "${TOOL_RESULT:-}" ]]; then
    DETECTED_FILE=$(echo "$TOOL_RESULT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    DETECTION_METHOD="env_result"
  fi

  # Method 3: TOOL_USE_ARGS
  if [[ -z "$DETECTED_FILE" ]] && [[ -n "${TOOL_USE_ARGS:-}" ]]; then
    DETECTED_FILE=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    DETECTION_METHOD="env_args"
  fi

  # Log env var detection (for metrics)
  if [[ -n "$DETECTED_FILE" ]]; then
    echo "[$(date)] post-edit-write: File from env vars ($DETECTION_METHOD): $DETECTED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

# Check if we detected a spec.md or tasks.md change in increments folder
SHOULD_UPDATE=false

if [[ -n "$DETECTED_FILE" ]]; then
  # Check if the file is spec.md or tasks.md
  if [[ "$DETECTED_FILE" == *"/spec.md" ]] || [[ "$DETECTED_FILE" == *"/tasks.md" ]]; then
    # Check if it's in an increment folder
    if [[ "$DETECTED_FILE" == *"/.specweave/increments/"* ]]; then
      SHOULD_UPDATE=true
      echo "[$(date)] post-edit-write: Increment file changed - will update status line" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# TIER 1 FIX: File Modification Time Detection (Fallback)
# ============================================================================
# If we couldn't detect the file via environment variables, check which files
# were modified recently (within last 2 seconds) instead of blindly updating
if [[ -z "$DETECTED_FILE" ]]; then
  echo "[$(date)] post-edit-write: Env vars empty - checking file mtimes" >> "$DEBUG_LOG" 2>/dev/null || true

  NOW=$(date +%s)
  INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"

  # Check for recently modified spec.md or tasks.md files
  if [[ -d "$INCREMENTS_DIR" ]]; then
    for file in "$INCREMENTS_DIR"/*/spec.md "$INCREMENTS_DIR"/*/tasks.md; do
      if [[ -f "$file" ]]; then
        # Get file modification time (platform-specific)
        if [[ "$(uname)" == "Darwin" ]]; then
          MTIME=$(stat -f "%m" "$file" 2>/dev/null || echo 0)
        else
          MTIME=$(stat -c "%Y" "$file" 2>/dev/null || echo 0)
        fi

        # If file was modified in last 2 seconds, consider it the changed file
        TIME_DIFF=$((NOW - MTIME))
        if (( TIME_DIFF <= 2 )); then
          DETECTED_FILE="$file"
          echo "[$(date)] post-edit-write: Detected recent modification: $file (${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
          SHOULD_UPDATE=true
          break
        fi
      fi
    done
  fi

  # If still no file detected, skip update (not a spec/tasks change)
  if [[ -z "$DETECTED_FILE" ]]; then
    echo "[$(date)] post-edit-write: No spec/tasks modifications detected - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi
fi

# ============================================================================
# LIVING DOCS SYNC FOR NEW INCREMENTS (v0.27.1 - Critical Fix)
# ============================================================================
# When a NEW spec.md is created, trigger living docs sync to create FS-XXX folder.
# This was previously in post-increment-planning.sh (hooks.json) but hooks.json
# is NOT used - plugin.json is the active config and it only calls this script.
#
# Detection: spec.md in increment folder + no FS-XXX folder in living docs yet
# See: Incident 2025-11-24 (FS-061 not created automatically)

if [[ "$SHOULD_UPDATE" == "true" ]] && [[ "$DETECTED_FILE" == *"/spec.md" ]]; then
  # Extract increment ID from path (e.g., 0061-fix-multi-repo-init-ux)
  INCREMENT_ID=$(echo "$DETECTED_FILE" | grep -o '[0-9][0-9][0-9][0-9]-[^/]*' | head -1)

  if [[ -n "$INCREMENT_ID" ]]; then
    # Extract feature_id from spec.md frontmatter
    FEATURE_ID=$(awk '
      BEGIN { in_frontmatter=0 }
      /^---$/ {
        if (in_frontmatter == 0) { in_frontmatter=1; next }
        else { exit }
      }
      in_frontmatter == 1 && /^feature_id:/ {
        gsub(/^feature_id:[ \t]*/, "");
        gsub(/["'"'"']/, "");
        print;
        exit
      }
    ' "$DETECTED_FILE" 2>/dev/null | tr -d '\r\n')

    # Check if living docs folder exists for this feature
    LIVING_DOCS_PATH="$PROJECT_ROOT/.specweave/docs/internal/specs"
    FEATURE_FOLDER_EXISTS=false

    if [[ -n "$FEATURE_ID" ]]; then
      # Check in all project subfolders (multi-project support)
      for project_dir in "$LIVING_DOCS_PATH"/*; do
        if [[ -d "$project_dir/$FEATURE_ID" ]]; then
          FEATURE_FOLDER_EXISTS=true
          break
        fi
      done
    fi

    if [[ "$FEATURE_FOLDER_EXISTS" == "false" ]]; then
      echo "[$(date)] post-edit-write: NEW increment detected ($INCREMENT_ID) - triggering living docs sync" >> "$DEBUG_LOG" 2>/dev/null || true

      # Find sync script (same logic as post-increment-planning.sh)
      SYNC_SCRIPT=""
      if [[ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" ]]; then
        SYNC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js"
      elif [[ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]]; then
        SYNC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
      elif [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]] && [[ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]]; then
        SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
      fi

      if [[ -n "$SYNC_SCRIPT" ]]; then
        # Run living docs sync in background (non-blocking)
        (
          set +e
          cd "$PROJECT_ROOT" || exit 0

          if [[ -n "$FEATURE_ID" ]]; then
            FEATURE_ID="$FEATURE_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID" >> "$DEBUG_LOG" 2>&1
          else
            node "$SYNC_SCRIPT" "$INCREMENT_ID" >> "$DEBUG_LOG" 2>&1
          fi

          if [[ $? -eq 0 ]]; then
            echo "[$(date)] post-edit-write: Living docs sync completed for $INCREMENT_ID" >> "$DEBUG_LOG" 2>/dev/null || true
          else
            echo "[$(date)] post-edit-write: Living docs sync FAILED for $INCREMENT_ID (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
          fi
        ) &
        disown 2>/dev/null || true

        echo "[$(date)] post-edit-write: Living docs sync triggered in background" >> "$DEBUG_LOG" 2>/dev/null || true
      else
        echo "[$(date)] post-edit-write: sync-living-docs.js not found - skipping living docs sync" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    else
      echo "[$(date)] post-edit-write: Living docs folder already exists for $FEATURE_ID - skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# TIER 1 FIX: Non-Blocking Background Update with COMPLETE ERROR ISOLATION
# ============================================================================
# Update status line if needed
if [[ "$SHOULD_UPDATE" == "true" ]]; then
  echo "[$(date)] post-edit-write: Running update-status-line.sh (background)" >> "$DEBUG_LOG" 2>/dev/null || true

  # Record update time BEFORE spawning background process
  # This ensures debouncing works even if update hasn't completed yet
  echo "$(date +%s)" > "$LAST_UPDATE_FILE"

  # Run status line update in background with COMPLETE error isolation
  # This prevents Edit/Write tool from waiting for status line computation
  (
    set +e  # Disable error propagation

    if "$PROJECT_ROOT/plugins/specweave/hooks/lib/update-status-line.sh" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null; then
      echo "[$(date)] post-edit-write: Status line updated successfully" >> "$DEBUG_LOG" 2>/dev/null || true
      # Reset circuit breaker on success
      echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    else
      echo "[$(date)] post-edit-write: Warning - status line update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      # Increment circuit breaker
      CURRENT_FAILURES=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
      echo "$((CURRENT_FAILURES + 1))" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
    fi
  ) &

  # Disown the background process so it's not killed when hook exits
  disown 2>/dev/null || true
fi

# Always exit 0 to prevent hook errors from crashing Claude Code
exit 0
