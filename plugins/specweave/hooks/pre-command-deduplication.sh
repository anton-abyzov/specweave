#!/bin/bash

# SpecWeave Pre-Command Deduplication Hook
# Fires BEFORE any command executes (UserPromptSubmit hook)
# Purpose: Prevent duplicate command invocations within configurable time window

set -euo pipefail

# ==============================================================================
# PROJECT ROOT DETECTION
# ==============================================================================

# Find project root by searching upward for .specweave/ directory
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

# Read input JSON from stdin
INPUT=$(cat)

# ==============================================================================
# DEDUPLICATION CHECK: Block duplicate commands within 1 second
# ==============================================================================

# Check if deduplication module is available
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
  # Use dedicated wrapper script for ES module compatibility
  DEDUP_RESULT=$(echo "$INPUT" | node scripts/check-deduplication.js 2>/dev/null || echo "OK")

  # Parse result
  STATUS=$(echo "$DEDUP_RESULT" | head -1)

  if [[ "$STATUS" == "DUPLICATE" ]]; then
    # Get stats
    STATS=$(echo "$DEDUP_RESULT" | tail -1)

    # Extract command and stats for readable message
    COMMAND=$(echo "$STATS" | grep -o '"lastCommand":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    TOTAL_BLOCKED=$(echo "$STATS" | grep -o '"totalDuplicatesBlocked":[0-9]*' | cut -d':' -f2 || echo "1")
    CACHE_SIZE=$(echo "$STATS" | grep -o '"currentCacheSize":[0-9]*' | cut -d':' -f2 || echo "1")

    # Build error message WITHOUT embedding JSON (avoid escaping issues)
    MESSAGE=$(cat <<'EOF'
{
  "decision": "block",
  "reason": "🚫 DUPLICATE COMMAND DETECTED\n\nCommand: `COMMAND_PLACEHOLDER`\nTime window: 1 second\n\nThis command was just executed! To prevent unintended duplicates, this invocation has been blocked.\n\n💡 If you meant to run this command again:\n  1. Wait 1 second\n  2. Run the command again\n\nDeduplication Stats:\n- Total duplicates blocked: BLOCKED_PLACEHOLDER\n- Commands in cache: CACHE_PLACEHOLDER"
}
EOF
)
    # Replace placeholders (avoids JSON escaping issues)
    # Use | as sed delimiter to avoid conflicts with / in command names
    echo "$MESSAGE" | sed "s|COMMAND_PLACEHOLDER|$COMMAND|g" | sed "s|BLOCKED_PLACEHOLDER|$TOTAL_BLOCKED|g" | sed "s|CACHE_PLACEHOLDER|$CACHE_SIZE|g"
    exit 0
  fi
fi

# ==============================================================================
# PASS THROUGH: No duplicate detected, proceed with command
# ==============================================================================

cat <<EOF
{
  "decision": "approve"
}
EOF

exit 0
