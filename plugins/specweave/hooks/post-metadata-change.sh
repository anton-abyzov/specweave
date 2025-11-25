#!/bin/bash
#
# Post-Metadata-Change Hook: Dispatcher for Increment Lifecycle Events
#
# Triggers: After Write/Edit modifies metadata.json
# Purpose: Detect WHAT changed in metadata and call appropriate lifecycle hook
#
# Architecture:
# - metadata.json is the source of truth for increment state
# - Different state changes require different actions:
#   * status: "completed" → Call post-increment-completion.sh
#   * status: "paused"|"resumed"|"abandoned" → Call post-increment-status-change.sh
#   * other changes → Update status line only
#
# This fixes the critical bug where status line never updates on increment closure
# because post-increment-completion.sh was orphaned (never registered or called).
#
# Related Incident: 2025-11-20 - Increment 0047 completed but status line still shows active
# Root Cause: metadata.json writes don't trigger status line refresh
# Fix: This hook dispatches to post-increment-completion.sh which updates status line

# EMERGENCY FIX v0.24.3: Remove set -e - it causes Claude Code crashes!
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
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================================
# RECURSION PREVENTION (CRITICAL - v0.26.0 - FILE-BASED GUARD)
# ============================================================================
# NEW SOLUTION (v0.26.0): File-based recursion guard
# See: ADR-0073 (Hook Recursion Prevention Strategy)

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # Silent exit - we're already inside a hook chain
  exit 0
fi

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# CREATE RECURSION GUARD (v0.28.2 - CRITICAL FIX)
# ============================================================================
# PROBLEM FIXED: Guard was only created in post-increment-completion.sh, but
# post-increment-status-change.sh had NO guard protection.
#
# SOLUTION: Create guard here in the dispatcher so ALL dispatches are protected.
# The sub-hooks (post-increment-completion.sh, post-increment-status-change.sh)
# will see this guard and exit early if they're called recursively.
#
# This prevents infinite loops if any sync operation modifies metadata.json.

mkdir -p "$PROJECT_ROOT/.specweave/state" 2>/dev/null || true
touch "$RECURSION_GUARD_FILE"

# Ensure guard file is ALWAYS removed when script exits (even on error)
trap 'rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true' EXIT SIGINT SIGTERM

# ============================================================================
# READ STDIN (v0.26.1 - CRITICAL FIX)
# ============================================================================
# PostToolUse hooks receive JSON data from Claude Code via STDIN, NOT env vars!
# This was the critical bug: hook was looking for environment variables that don't exist.
#
# Example STDIN data:
# {"tool": "Edit", "tool_input": {"file_path": "/path/to/file.md", ...}}
# {"tool": "Write", "tool_input": {"file_path": "/path/to/file.md", ...}}

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] post-metadata-change: Hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# EARLY EXIT OPTIMIZATION (v0.25.0): Ultra-Fast Rejection of Non-Metadata Changes
# ============================================================================
# This hook should ONLY run for metadata.json changes.
# 99.9% of Edit/Write operations are NOT metadata.json.
# Do fastest possible check first to minimize overhead.

# Quick check: If STDIN doesn't contain "metadata.json", exit immediately
if ! grep -q "metadata\.json" "$STDIN_DATA" 2>/dev/null; then
  echo "[$(date)] post-metadata-change: Not metadata.json - exiting" >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$STDIN_DATA"
  exit 0  # Fast path: Not metadata.json
fi

echo "[$(date)] post-metadata-change: metadata.json detected in input" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# EXTRACT FILE PATH FROM STDIN JSON
# ============================================================================

# Parse file_path from JSON (handles both Edit and Write tool formats)
MODIFIED_FILE=$(grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' "$STDIN_DATA" | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")

# Clean up temp file
rm -f "$STDIN_DATA"

echo "[$(date)] post-metadata-change: Detected file: ${MODIFIED_FILE:-<none>}" >> "$DEBUG_LOG" 2>/dev/null || true

# Check if this is a metadata.json change in an increment folder
if [[ -z "$MODIFIED_FILE" ]] || [[ "$MODIFIED_FILE" != *"/metadata.json" ]] || [[ "$MODIFIED_FILE" != *"/.specweave/increments/"* ]]; then
  # Not a metadata.json change in increments folder - exit silently
  exit 0
fi

# Exclude archived increments (shouldn't affect status line)
if [[ "$MODIFIED_FILE" == *"/_archive/"* ]]; then
  echo "[$(date)] post-metadata-change: Archived increment - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

echo "[$(date)] post-metadata-change: metadata.json changed - analyzing..." >> "$DEBUG_LOG" 2>/dev/null || true

# Extract increment ID from path
# Path format: /path/to/project/.specweave/increments/0047-name/metadata.json
INCREMENT_ID=$(echo "$MODIFIED_FILE" | grep -o '\.specweave/increments/[^/]*' | sed 's/\.specweave\/increments\///')

if [[ -z "$INCREMENT_ID" ]]; then
  echo "[$(date)] post-metadata-change: Could not extract increment ID from path: $MODIFIED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

echo "[$(date)] post-metadata-change: Increment ID: $INCREMENT_ID" >> "$DEBUG_LOG" 2>/dev/null || true

# Read the metadata.json to detect what changed
METADATA_PATH="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID/metadata.json"

if [[ ! -f "$METADATA_PATH" ]]; then
  echo "[$(date)] post-metadata-change: metadata.json not found at $METADATA_PATH" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check if jq is available for parsing JSON
if ! command -v jq &> /dev/null; then
  echo "[$(date)] post-metadata-change: jq not found - updating status line as fallback" >> "$DEBUG_LOG" 2>/dev/null || true
  bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
  exit 0
fi

# Extract current status
CURRENT_STATUS=$(jq -r '.status // "unknown"' "$METADATA_PATH" 2>/dev/null)

echo "[$(date)] post-metadata-change: Current status: $CURRENT_STATUS" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# CRITICAL FIX (v0.28.12): Remove guard BEFORE calling sub-hooks
# ============================================================================
# PROBLEM: Sub-hooks (post-increment-completion.sh) check for recursion guard
# and exit immediately if it exists. But the guard was created HERE (line 77),
# so sub-hooks NEVER ran - causing status line to never update!
#
# SOLUTION: Temporarily remove the guard before calling sub-hooks.
# The guard's purpose is to prevent THIS hook from being called recursively
# (if sub-hooks modify metadata.json). Sub-hooks have their OWN guards.
#
# See: Root cause analysis 2025-11-25 - status line never updates after /done
rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true

# Dispatch to appropriate lifecycle hook based on status
case "$CURRENT_STATUS" in
  completed)
    # Increment completed - call post-increment-completion.sh
    # This hook handles:
    # - Closing GitHub issues
    # - Syncing living docs
    # - Updating status line
    echo "[$(date)] post-metadata-change: Increment completed - calling post-increment-completion.sh" >> "$DEBUG_LOG" 2>/dev/null || true

    if [[ -x "$HOOK_DIR/post-increment-completion.sh" ]]; then
      bash "$HOOK_DIR/post-increment-completion.sh" "$INCREMENT_ID" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
        echo "[$(date)] post-metadata-change: post-increment-completion.sh failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      }
    else
      echo "[$(date)] post-metadata-change: post-increment-completion.sh not found or not executable" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
    # ALWAYS update status line after completion (force bypass TTL cache)
    bash "$HOOK_DIR/lib/update-status-line.sh" --force 2>/dev/null || true
    ;;

  paused|resumed|abandoned)
    # Status change - call post-increment-status-change.sh
    # Note: This typically gets called manually by /specweave:pause commands
    # But we handle it here for completeness
    echo "[$(date)] post-metadata-change: Status changed to $CURRENT_STATUS - calling post-increment-status-change.sh" >> "$DEBUG_LOG" 2>/dev/null || true

    if [[ -x "$HOOK_DIR/post-increment-status-change.sh" ]]; then
      # Extract reason if available
      REASON=$(jq -r '.statusReason // "Not specified"' "$METADATA_PATH" 2>/dev/null)
      bash "$HOOK_DIR/post-increment-status-change.sh" "$INCREMENT_ID" "$CURRENT_STATUS" "$REASON" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
        echo "[$(date)] post-metadata-change: post-increment-status-change.sh failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      }
    else
      echo "[$(date)] post-metadata-change: post-increment-status-change.sh not found" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
    # ALWAYS update status line after status change (force bypass TTL cache)
    bash "$HOOK_DIR/lib/update-status-line.sh" --force 2>/dev/null || true
    ;;

  active|planning|in-progress)
    # Increment became active - MUST register in active-increment.json!
    # CRITICAL FIX (v0.26.15): post-task-completion.sh depends on this file
    # Without registration, ALL sync operations are skipped!
    echo "[$(date)] post-metadata-change: Status is $CURRENT_STATUS - registering as active + updating status line" >> "$DEBUG_LOG" 2>/dev/null || true
    bash "$HOOK_DIR/lib/update-active-increment.sh" 2>/dev/null || true
    bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
    ;;

  *)
    # Other metadata changes (e.g., task completion count, AC count)
    # Just update status line to reflect new progress
    echo "[$(date)] post-metadata-change: Status is $CURRENT_STATUS - updating status line only" >> "$DEBUG_LOG" 2>/dev/null || true
    bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
    ;;
esac

echo "[$(date)] post-metadata-change: Complete" >> "$DEBUG_LOG" 2>/dev/null || true

exit 0
