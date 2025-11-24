#!/bin/bash
#
# Pre-Write Hook: Capture File Path BEFORE Write Executes (Tier 2)
#
# Purpose: Detect which file will be written BEFORE the Write tool runs
# Strategy: PreToolUse has better access to tool arguments than PostToolUse
#
# TIER 2 COORDINATION:
# 1. Extract file_path from TOOL_USE_ARGS (more reliable in PreToolUse)
# 2. If it's spec.md/tasks.md in increments folder, signal PostToolUse hook
# 3. Write file path to .pending-status-update for PostToolUse to consume
#
# This eliminates the need for mtime-based fallback detection (Tier 1)
# and reduces false positives to near zero.
#
# Architecture:
#   PreToolUse:Write → pre-write-spec.sh (this file)
#     ↓ writes to
#   .specweave/state/.pending-status-update
#     ↓ read by
#   PostToolUse:Write → post-write-spec.sh
#
# Version: v0.24.3 (EMERGENCY FIXES)
# Date: 2025-11-22

# EMERGENCY FIX: Remove set -e - it causes Claude Code crashes!
set +e

# EMERGENCY KILL SWITCH: Disable all hooks if env variable set
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

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
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
PENDING_FILE="$STATE_DIR/.pending-status-update"
METRICS_FILE="$STATE_DIR/hook-metrics.jsonl"

# Ensure directories exist
mkdir -p "$STATE_DIR" "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# TIER 2: Extract File Path from Tool Arguments
# ============================================================================
# PreToolUse should have access to tool arguments BEFORE execution
# Try multiple methods to extract file_path

FILE_PATH=""

# Method 1: TOOL_USE_ARGS environment variable (primary for PreToolUse)
if [[ -n "${TOOL_USE_ARGS:-}" ]]; then
  # Try to parse JSON with jq if available
  if command -v jq &> /dev/null; then
    FILE_PATH=$(echo "$TOOL_USE_ARGS" | jq -r '.file_path // empty' 2>/dev/null || echo "")
  fi

  # Fallback: Regex extraction if jq not available or failed
  if [[ -z "$FILE_PATH" ]]; then
    FILE_PATH=$(echo "$TOOL_USE_ARGS" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
  fi
fi

# Method 2: TOOL_USE_CONTENT (fallback)
if [[ -z "$FILE_PATH" ]] && [[ -n "${TOOL_USE_CONTENT:-}" ]]; then
  FILE_PATH="$TOOL_USE_CONTENT"
fi

# Method 3: Parse from stdin (last resort - experimental)
if [[ -z "$FILE_PATH" ]] && [[ ! -t 0 ]]; then
  # Read stdin and try to extract file_path
  STDIN_DATA=$(cat 2>/dev/null || echo "")
  if [[ -n "$STDIN_DATA" ]] && command -v jq &> /dev/null; then
    FILE_PATH=$(echo "$STDIN_DATA" | jq -r '.file_path // empty' 2>/dev/null || echo "")
  fi
fi

# ============================================================================
# TIER 2: Signal Detection and Validation
# ============================================================================

# Log what we detected (for debugging PreToolUse effectiveness)
if [[ -n "$FILE_PATH" ]]; then
  echo "[$(date)] pre-write-spec: Detected file_path: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] pre-write-spec: No file_path detected (will fall back to Tier 1)" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0  # Let PostToolUse handle it with mtime fallback
fi

# Check if this is a spec.md or tasks.md file in increments folder
IS_SPEC_FILE=false
if [[ "$FILE_PATH" == *"/spec.md" ]] || [[ "$FILE_PATH" == *"/tasks.md" ]]; then
  if [[ "$FILE_PATH" == *"/.specweave/increments/"* ]]; then
    # Exclude archived increments
    if [[ "$FILE_PATH" != *"/_archive/"* ]]; then
      IS_SPEC_FILE=true
    fi
  fi
fi

# If not a spec/tasks file, exit silently (no signal to PostToolUse)
if [[ "$IS_SPEC_FILE" != "true" ]]; then
  echo "[$(date)] pre-write-spec: Not a spec/tasks file - no signal" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# ============================================================================
# TIER 2: Write Signal for PostToolUse Hook
# ============================================================================

# Write file path to pending file for PostToolUse to consume
echo "$FILE_PATH" > "$PENDING_FILE" 2>/dev/null || true

echo "[$(date)] pre-write-spec: Signaled PostToolUse for: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# TIER 2: Metrics Collection
# ============================================================================

# Record metrics (JSONL format - one JSON object per line)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
METRIC_ENTRY="{\"timestamp\":\"$TIMESTAMP\",\"hook\":\"pre-write-spec\",\"event\":\"file_detected\",\"file_path\":\"$FILE_PATH\",\"method\":\"TOOL_USE_ARGS\"}"

# Append to metrics file (JSONL)
echo "$METRIC_ENTRY" >> "$METRICS_FILE" 2>/dev/null || true

# Log rotation for metrics (keep last 1000 entries)
if [[ -f "$METRICS_FILE" ]]; then
  LINE_COUNT=$(wc -l < "$METRICS_FILE" 2>/dev/null || echo 0)
  if (( LINE_COUNT > 1000 )); then
    tail -1000 "$METRICS_FILE" > "$METRICS_FILE.tmp" 2>/dev/null || true
    mv "$METRICS_FILE.tmp" "$METRICS_FILE" 2>/dev/null || true
  fi
fi

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
