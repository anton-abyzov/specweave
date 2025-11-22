#!/bin/bash
#
# PreToolUse Environment Variable Validation Test
#
# Purpose: Validate that PreToolUse hooks receive tool arguments via env vars
# This tests the core assumption of Tier 2 implementation
#
# Usage:
#   1. Register this hook in plugin.json under PreToolUse:Edit
#   2. Make 10 test edits to any file
#   3. Review /tmp/pretooluse-test.log
#   4. Check if TOOL_USE_ARGS is populated
#
# Success Criteria:
#   - TOOL_USE_ARGS contains file_path
#   - At least 80% of invocations have non-empty TOOL_USE_ARGS
#
# If this test fails, Tier 2 PreToolUse coordination cannot work
# and we must rely on Tier 1 (mtime fallback) or proceed to Tier 3
#
# Version: v0.24.2 (Tier 2 Validation)
# Date: 2025-11-22

set +e  # Don't fail on errors (this is a diagnostic tool)

TEST_LOG="/tmp/pretooluse-test.log"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Initialize log on first run
if [[ ! -f "$TEST_LOG" ]]; then
  echo "==================================" > "$TEST_LOG"
  echo "PreToolUse Environment Variable Test" >> "$TEST_LOG"
  echo "Started: $TIMESTAMP" >> "$TEST_LOG"
  echo "==================================" >> "$TEST_LOG"
  echo "" >> "$TEST_LOG"
fi

# Record this invocation
echo "[$TIMESTAMP] PreToolUse:Edit invocation #$(wc -l < "$TEST_LOG")" >> "$TEST_LOG"

# Check ALL tool-related environment variables
echo "  TOOL_USE_ARGS:    ${TOOL_USE_ARGS:-<EMPTY>}" >> "$TEST_LOG"
echo "  TOOL_USE_CONTENT: ${TOOL_USE_CONTENT:-<EMPTY>}" >> "$TEST_LOG"
echo "  TOOL_RESULT:      ${TOOL_RESULT:-<EMPTY>}" >> "$TEST_LOG"
echo "  PWD:              $PWD" >> "$TEST_LOG"

# Try to extract file_path if TOOL_USE_ARGS exists
if [[ -n "${TOOL_USE_ARGS:-}" ]]; then
  if command -v jq &> /dev/null; then
    FILE_PATH=$(echo "$TOOL_USE_ARGS" | jq -r '.file_path // "<NOT_FOUND>"' 2>/dev/null)
    echo "  Extracted file_path: $FILE_PATH" >> "$TEST_LOG"
  else
    FILE_PATH=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "<PARSE_FAILED>")
    echo "  Extracted file_path (no jq): $FILE_PATH" >> "$TEST_LOG"
  fi
fi

# Dump all TOOL* env vars
echo "  All TOOL* environment variables:" >> "$TEST_LOG"
env | grep -E "^TOOL" | while read line; do
  echo "    $line" >> "$TEST_LOG"
done

echo "" >> "$TEST_LOG"

# Log rotation: Keep last 100 invocations
if [[ $(wc -l < "$TEST_LOG") -gt 500 ]]; then
  tail -400 "$TEST_LOG" > "$TEST_LOG.tmp"
  mv "$TEST_LOG.tmp" "$TEST_LOG"
fi

exit 0  # Always succeed (diagnostic tool)
