#!/bin/bash

# SpecWeave Pre-Command Deduplication Hook (v0.26.14 - OPTIMIZED)
# Fires BEFORE any command executes (UserPromptSubmit hook)
# Purpose: Prevent duplicate command invocations within configurable time window
#
# OPTIMIZATIONS (v0.26.14):
# 1. Early exit for non-SpecWeave projects (<1ms)
# 2. Skip node spawn if deduplicator not available
# 3. Pure bash stdin reading

set +e

# ==============================================================================
# ULTRA-FAST EARLY EXIT
# ==============================================================================

# Quick check: If no .specweave in cwd or nearby, just approve
if [[ ! -d ".specweave" ]] && [[ ! -d "../.specweave" ]] && [[ ! -d "../../.specweave" ]]; then
  cat /dev/stdin > /dev/null  # Drain stdin
  echo '{"decision":"approve"}'
  exit 0
fi

# Read input JSON from stdin
INPUT=$(cat)

# ==============================================================================
# DEDUPLICATION CHECK: Pure bash with file-based cache
# ==============================================================================

# Use file-based deduplication (no node!) with 1-second TTL
CACHE_DIR=".specweave/state/.dedup-cache"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

# Extract command from input (use jq if available, fallback to grep)
if command -v jq >/dev/null 2>&1; then
  COMMAND=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null | head -c 100 | tr -d '\n' | tr '/' '_' | tr ' ' '_')
else
  COMMAND=$(echo "$INPUT" | grep -oP '"prompt"\s*:\s*"\K[^"]{0,100}' 2>/dev/null | tr '/' '_' | tr ' ' '_')
fi

# Only check for SpecWeave commands
if [[ "$COMMAND" == *specweave* ]]; then
  CACHE_FILE="$CACHE_DIR/${COMMAND:0:50}.lock"

  # Check if cached and recent (within 1 second)
  if [[ -f "$CACHE_FILE" ]]; then
    CACHE_AGE=$(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0)))
    if [[ "$CACHE_AGE" -lt 1 ]]; then
      cat <<EOF
{
  "decision": "block",
  "reason": "Duplicate command detected (within 1 second). Wait a moment and try again."
}
EOF
      exit 0
    fi
  fi

  # Update cache timestamp
  touch "$CACHE_FILE" 2>/dev/null || true

  # Cleanup old cache files (>10 seconds old)
  find "$CACHE_DIR" -type f -mmin +1 -delete 2>/dev/null &
fi

# ==============================================================================
# PASS THROUGH: No duplicate detected
# ==============================================================================

echo '{"decision":"approve"}'
exit 0
