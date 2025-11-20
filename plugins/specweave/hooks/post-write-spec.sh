#!/bin/bash
#
# Post-Write Hook: Update Status Line After spec.md or tasks.md Writes
#
# Triggers: After Write tool creates/replaces spec.md or tasks.md
# Action: Updates status line cache to reflect latest AC/task progress
#
# CRITICAL FIX (v0.24.1): Enhanced file detection to handle increment completion
# - Detects writes via TOOL_USE_CONTENT, TOOL_RESULT, and argument parsing
# - Always updates status line for ANY spec.md/tasks.md write in increments folder
# - Matches post-edit-spec.sh robustness improvements

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

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Extract written file from multiple sources (Claude Code provides this in various ways)
WRITTEN_FILE=""

# Method 1: TOOL_USE_CONTENT environment variable (primary)
if [[ -n "${TOOL_USE_CONTENT:-}" ]]; then
  WRITTEN_FILE="$TOOL_USE_CONTENT"
fi

# Method 2: TOOL_RESULT environment variable (fallback)
if [[ -z "$WRITTEN_FILE" ]] && [[ -n "${TOOL_RESULT:-}" ]]; then
  # Extract file_path from tool result JSON
  WRITTEN_FILE=$(echo "$TOOL_RESULT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
fi

# Method 3: Parse tool use arguments (last resort)
if [[ -z "$WRITTEN_FILE" ]] && [[ -n "${TOOL_USE_ARGS:-}" ]]; then
  # Extract file_path from tool arguments
  WRITTEN_FILE=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
fi

# Log detection attempt
echo "[$(date)] post-write-spec: Detected file: ${WRITTEN_FILE:-<none>}" >> "$DEBUG_LOG" 2>/dev/null || true

# Check if we detected a spec.md or tasks.md write in increments folder
SHOULD_UPDATE=false

if [[ -n "$WRITTEN_FILE" ]]; then
  # Check if the file is spec.md or tasks.md
  if [[ "$WRITTEN_FILE" == *"/spec.md" ]] || [[ "$WRITTEN_FILE" == *"/tasks.md" ]]; then
    # Check if it's in an increment folder
    if [[ "$WRITTEN_FILE" == *"/.specweave/increments/"* ]]; then
      SHOULD_UPDATE=true
      echo "[$(date)] post-write-spec: Increment file written - will update status line" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# If we couldn't detect the file via environment variables, always update status line
# This ensures we don't miss updates during increment closure
if [[ -z "$WRITTEN_FILE" ]]; then
  echo "[$(date)] post-write-spec: No file detected - updating status line as safety measure" >> "$DEBUG_LOG" 2>/dev/null || true
  SHOULD_UPDATE=true
fi

# Update status line if needed
if [[ "$SHOULD_UPDATE" == "true" ]]; then
  echo "[$(date)] post-write-spec: Running update-status-line.sh" >> "$DEBUG_LOG" 2>/dev/null || true

  # Run status line update (capture errors for debugging)
  if "$PROJECT_ROOT/plugins/specweave/hooks/lib/update-status-line.sh" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null; then
    echo "[$(date)] post-write-spec: Status line updated successfully" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    echo "[$(date)] post-write-spec: Warning - status line update failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

exit 0
