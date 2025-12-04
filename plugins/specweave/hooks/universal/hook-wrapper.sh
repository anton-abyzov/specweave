#!/bin/bash
# hook-wrapper.sh - Resilient hook launcher that prevents crashes
#
# Problem: Node.js crashes with "Cannot find module" BEFORE any error handling
# when dispatcher.mjs is temporarily unavailable (e.g., during marketplace refresh)
#
# Solution: Pre-check file existence, retry with delay, output valid JSON on failure
#
# Usage: bash hook-wrapper.sh <hook-type>
# Where hook-type is: session-start, post-tool-use, completion-guard

set -e

HOOK_TYPE="${1:-unknown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCHER="$SCRIPT_DIR/dispatcher.mjs"

# Maximum retry attempts for transient failures
MAX_RETRIES=3
RETRY_DELAY_MS=50

# Function to output valid JSON and exit gracefully
safe_exit() {
  local msg="${1:-}"
  if [[ -n "$msg" ]]; then
    echo "{\"continue\":true,\"systemMessage\":\"Hook skipped: $msg\"}"
  else
    echo '{"continue":true}'
  fi
  exit 0
}

# Check if dispatcher exists with retry for transient failures
check_dispatcher() {
  local attempt=1
  while [[ $attempt -le $MAX_RETRIES ]]; do
    if [[ -f "$DISPATCHER" ]]; then
      return 0
    fi

    # Wait before retry (convert ms to seconds for sleep)
    if [[ $attempt -lt $MAX_RETRIES ]]; then
      sleep 0.$(printf '%03d' $RETRY_DELAY_MS)
    fi

    ((attempt++))
  done

  return 1
}

# Main execution
if ! check_dispatcher; then
  safe_exit "dispatcher.mjs not found (marketplace may be refreshing)"
fi

# Execute dispatcher with timeout protection
if command -v timeout &>/dev/null; then
  # GNU timeout available (Linux)
  timeout 5s node "$DISPATCHER" "$HOOK_TYPE" 2>/dev/null || safe_exit "dispatcher timeout or error"
elif command -v gtimeout &>/dev/null; then
  # GNU timeout via coreutils (macOS with brew)
  gtimeout 5s node "$DISPATCHER" "$HOOK_TYPE" 2>/dev/null || safe_exit "dispatcher timeout or error"
else
  # No timeout available, run directly
  node "$DISPATCHER" "$HOOK_TYPE" 2>/dev/null || safe_exit "dispatcher error"
fi
