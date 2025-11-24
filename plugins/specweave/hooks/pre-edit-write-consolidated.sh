#!/bin/bash
#
# Pre-Edit/Write Consolidated Hook: Capture File Path BEFORE Edit/Write Executes
#
# Purpose: Unified hook for both Edit and Write tools
# Strategy: Hierarchical early exit for maximum performance
#
# CONSOLIDATION (v0.25.0):
# - Replaces pre-edit-spec.sh and pre-write-spec.sh (identical code)
# - Reduces hook overhead by 50% (2 pre-hooks → 1)
# - Single point of maintenance
#
# HIERARCHICAL EARLY EXIT (v0.26.1):
# - Tier 0: TOOL_USE_ARGS check (< 1ms) - Exit if empty (Claude Code bug)
# - Tier 1: .specweave/ path check (< 5ms) - Exit if not SpecWeave file
# - Tier 2: Active increment check (< 10ms) - Exit if archived/completed
# - Tier 3: Full processing - AC sync, status line, living docs
#
# GRACEFUL DEGRADATION:
# - PreToolUse works if TOOL_USE_ARGS is available (fast filtering)
# - PostToolUse fallback uses mtime if PreToolUse disabled (slower but works)
# - Self-tuning: Disables PreToolUse if consistently useless
#
# Architecture:
#   PreToolUse:Edit/Write → pre-edit-write-consolidated.sh (this file)
#     ↓ writes to
#   .specweave/state/.pending-status-update
#     ↓ read by
#   PostToolUse:Edit/Write → post-edit-write-consolidated.sh
#
# Version: v0.26.1 (HIERARCHICAL EARLY EXIT)
# Date: 2025-11-24
#
# EMERGENCY FIXES (v0.24.3):
# - Kill switch: Set SPECWEAVE_DISABLE_HOOKS=1 to disable ALL hooks
# - Circuit breaker: Auto-disable after 3 consecutive failures
# - File locking: Prevent concurrent executions
# - Complete error isolation: Never let errors reach Claude Code

# EMERGENCY FIX: Remove set -e - it causes Claude Code crashes!
set +e

# ============================================================================
# TIER 0: ULTRA-FAST REJECTION (< 1ms) - v0.26.1 CRITICAL FIX
# ============================================================================
# Problem: Claude Code doesn't pass TOOL_USE_ARGS to PreToolUse hooks (bug)
# Result: PreToolUse hooks are "blind" - can't filter files, fire for everything
# Impact: Massive overhead (1 pre-hook per Edit/Write on ANY file)
#
# Solution: Exit immediately if TOOL_USE_ARGS is empty
# - No find_project_root, no file path extraction, no processing
# - Eliminates 33% of hook overhead (1 of 3 hooks per operation)
# - Falls back to PostToolUse mtime detection (slower but works)
#
# See: ADR-0128 (Hierarchical Hook Early Exit Strategy)

if [[ -z "${TOOL_USE_ARGS:-}" ]]; then
  # Telemetry: Track PreToolUse disabled events (lightweight counter)
  # This helps us understand if Claude Code ever fixes the TOOL_USE_ARGS bug
  TELEMETRY_DIR="${HOME}/.claude/.specweave-telemetry"
  mkdir -p "$TELEMETRY_DIR" 2>/dev/null || true
  echo "$(date -u +%s)" >> "$TELEMETRY_DIR/pretooluse-disabled.log" 2>/dev/null || true

  # Silent exit - PreToolUse is useless without TOOL_USE_ARGS
  # PostToolUse will handle via mtime fallback
  exit 0
fi

# Telemetry: Track PreToolUse enabled events (TOOL_USE_ARGS available)
TELEMETRY_DIR="${HOME}/.claude/.specweave-telemetry"
mkdir -p "$TELEMETRY_DIR" 2>/dev/null || true
echo "$(date -u +%s)" >> "$TELEMETRY_DIR/pretooluse-enabled.log" 2>/dev/null || true

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
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
PENDING_FILE="$STATE_DIR/.pending-status-update"
METRICS_FILE="$STATE_DIR/hook-metrics.jsonl"

# ============================================================================
# RECURSION PREVENTION (CRITICAL - v0.26.0 - FILE-BASED GUARD)
# ============================================================================
# NEW SOLUTION (v0.26.0): File-based recursion guard
# - Guard file exists = already inside hook chain
# - Works across ALL processes (not just current shell)
#
# See: ADR-0073 (Hook Recursion Prevention Strategy)

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # Silent exit - we're already inside a hook chain
  exit 0
fi

# EMERGENCY KILL SWITCH: Disable all hooks if env variable set
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

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
  echo "[$(date)] pre-edit-write: Detected file_path: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] pre-edit-write: No file_path detected (will fall back to Tier 1)" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0  # Let PostToolUse handle it with mtime fallback
fi

# ============================================================================
# EARLY EXIT: Only process .specweave/ files (v0.24.4 Performance Fix)
# ============================================================================
# 90% of Edit/Write operations are on non-SpecWeave files (src/, tests/, node_modules/)
# Exit immediately for non-.specweave/ files to reduce hook overhead by 90%

# Handle both absolute and relative paths: /.specweave/ or .specweave/
if [[ "$FILE_PATH" != *"/.specweave/"* ]] && [[ "$FILE_PATH" != ".specweave/"* ]]; then
  echo "[$(date)] pre-edit-write: Not a .specweave/ file, skipping (performance optimization)" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check if this is a spec.md or tasks.md file in increments folder
IS_SPEC_FILE=false
if [[ "$FILE_PATH" == *"/spec.md" ]] || [[ "$FILE_PATH" == *"/tasks.md" ]]; then
  # Handle both absolute (/.specweave/increments/) and relative (.specweave/increments/) paths
  if [[ "$FILE_PATH" == *"/.specweave/increments/"* ]] || [[ "$FILE_PATH" == ".specweave/increments/"* ]]; then
    # Exclude archived increments
    if [[ "$FILE_PATH" != *"/_archive/"* ]]; then
      IS_SPEC_FILE=true
    fi
  fi
fi

# If not a spec/tasks file, exit silently (no signal to PostToolUse)
if [[ "$IS_SPEC_FILE" != "true" ]]; then
  echo "[$(date)] pre-edit-write: Not a spec/tasks file - no signal" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# ============================================================================
# TIER 2: Write Signal for PostToolUse Hook
# ============================================================================

# Write file path to pending file for PostToolUse to consume
echo "$FILE_PATH" > "$PENDING_FILE" 2>/dev/null || true

echo "[$(date)] pre-edit-write: Signaled PostToolUse for: $FILE_PATH" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# TIER 2: Metrics Collection
# ============================================================================

# Record metrics (JSONL format - one JSON object per line)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
METRIC_ENTRY="{\"timestamp\":\"$TIMESTAMP\",\"hook\":\"pre-edit-write\",\"event\":\"file_detected\",\"file_path\":\"$FILE_PATH\",\"method\":\"TOOL_USE_ARGS\"}"

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
