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

# Debug logging directory
LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/deduplication-debug.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Check if deduplication module is available
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
  # Deduplication module exists - perform check
  echo "[$(date)] ✓ Deduplication module found, checking for duplicates..." >> "$DEBUG_LOG" 2>/dev/null || true

  # Use dedicated wrapper script for ES module compatibility
  DEDUP_RESULT=$(echo "$INPUT" | node scripts/check-deduplication.js 2>>"$DEBUG_LOG" || echo "OK")

  # Parse result
  STATUS=$(echo "$DEDUP_RESULT" | head -1)

  if [[ "$STATUS" == "DUPLICATE" ]]; then
    # Get stats
    STATS=$(echo "$DEDUP_RESULT" | tail -1)

    # Extract command and stats for readable message
    COMMAND=$(echo "$STATS" | grep -o '"lastCommand":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    TOTAL_BLOCKED=$(echo "$STATS" | grep -o '"totalDuplicatesBlocked":[0-9]*' | cut -d':' -f2 || echo "1")
    CACHE_SIZE=$(echo "$STATS" | grep -o '"currentCacheSize":[0-9]*' | cut -d':' -f2 || echo "1")

    echo "[$(date)] 🚫 BLOCKED duplicate command: $COMMAND" >> "$DEBUG_LOG" 2>/dev/null || true

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
  else
    echo "[$(date)] ✓ No duplicate detected, command approved" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  # Deduplication module NOT available - graceful degradation
  echo "[$(date)] ⚠️  Deduplication module not available (build required)" >> "$DEBUG_LOG" 2>/dev/null || true

  # Check which condition failed
  if ! command -v node >/dev/null 2>&1; then
    echo "[$(date)]   → Node.js not found in PATH" >> "$DEBUG_LOG" 2>/dev/null || true
  elif [[ ! -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
    echo "[$(date)]   → Module not compiled: dist/src/core/deduplication/command-deduplicator.js" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "[$(date)]   → Run 'npm run build' to enable deduplication" >> "$DEBUG_LOG" 2>/dev/null || true
  fi

  # GRACEFUL DEGRADATION: Approve command but warn user (only once per session)
  # Use session marker to avoid spamming user with warnings
  SESSION_MARKER="$LOGS_DIR/dedup-warning-shown"

  if [[ ! -f "$SESSION_MARKER" ]]; then
    # First time in this session - show warning
    touch "$SESSION_MARKER" 2>/dev/null || true

    cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️  Command deduplication disabled\n\nThe deduplication module is not compiled. Duplicate commands may execute.\n\n🔧 To enable:\n  npm run build\n\n📝 This warning shown once per session.\nSee: .specweave/logs/deduplication-debug.log"
}
EOF
  else
    # Already warned in this session - silently approve
    cat <<EOF
{
  "decision": "approve"
}
EOF
  fi

  exit 0
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
