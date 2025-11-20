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

set -e

# Find project root
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

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Extract modified file from environment variables (Claude Code provides this)
MODIFIED_FILE=""

# Method 1: TOOL_USE_CONTENT environment variable (primary for Write)
if [[ -n "${TOOL_USE_CONTENT:-}" ]]; then
  MODIFIED_FILE="$TOOL_USE_CONTENT"
fi

# Method 2: TOOL_RESULT environment variable (fallback)
if [[ -z "$MODIFIED_FILE" ]] && [[ -n "${TOOL_RESULT:-}" ]]; then
  MODIFIED_FILE=$(echo "$TOOL_RESULT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
fi

# Method 3: Parse tool use arguments (last resort for Edit)
if [[ -z "$MODIFIED_FILE" ]] && [[ -n "${TOOL_USE_ARGS:-}" ]]; then
  MODIFIED_FILE=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
fi

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
      # Fallback: Update status line directly
      bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
    fi
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
      # Fallback: Update status line directly
      bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
    fi
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
