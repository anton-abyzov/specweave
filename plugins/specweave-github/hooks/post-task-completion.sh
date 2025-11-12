#!/bin/bash

# SpecWeave GitHub Sync Hook
# Runs after task completion to sync progress to GitHub Projects
#
# CORRECT ARCHITECTURE (v0.17.0+):
# - Syncs .specweave/docs/internal/specs/spec-*.md ↔ GitHub Projects
# - NOT increments ↔ GitHub Issues (that was wrong!)
#
# This hook is part of the specweave-github plugin and handles:
# - Finding which spec the current work belongs to
# - Updating spec user stories based on task completion
# - Syncing spec state to GitHub Projects
# - Updating GitHub Project cards/issues
#
# Dependencies:
# - Node.js and TypeScript CLI (dist/cli/commands/*)
# - GitHub CLI (gh) must be installed and authenticated
# - Spec metadata must have .externalLinks.github field

set -e

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

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

# ============================================================================
# CONFIGURATION
# ============================================================================

LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# PRECONDITIONS CHECK
# ============================================================================

echo "[$(date)] [GitHub] 🔗 GitHub sync hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "[$(date)] [GitHub] ⚠️  Node.js not found, skipping GitHub sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check if github-spec-sync CLI exists
SYNC_CLI="$PROJECT_ROOT/dist/cli/commands/sync-specs-to-github.js"
if [ ! -f "$SYNC_CLI" ]; then
  echo "[$(date)] [GitHub] ⚠️  github-spec-sync CLI not found at $SYNC_CLI, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  echo "[$(date)] [GitHub] ⚠️  GitHub CLI (gh) not found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# ============================================================================
# DETECT CURRENT SPEC
# ============================================================================

# Strategy: Find current increment, then find which spec it belongs to

# 1. Detect current increment (temporary context)
CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] [GitHub] ℹ️  No active increment, checking for spec changes..." >> "$DEBUG_LOG" 2>/dev/null || true
  # Fall through to sync all changed specs
fi

SPEC_ID=""

if [ -n "$CURRENT_INCREMENT" ]; then
  # 2. Try to find spec reference in increment
  SPEC_FILE=".specweave/increments/$CURRENT_INCREMENT/spec.md"

  if [ -f "$SPEC_FILE" ]; then
    # Look for "Implements: SPEC-XXX" or "See: SPEC-XXX" patterns
    SPEC_REF=$(grep -E "^(Implements|See|References).*SPEC-[0-9]+" "$SPEC_FILE" 2>/dev/null | head -1 || echo "")

    if [ -n "$SPEC_REF" ]; then
      # Extract spec ID (e.g., "SPEC-001" → "spec-001")
      SPEC_ID=$(echo "$SPEC_REF" | grep -oE "SPEC-[0-9]+" | tr 'A-Z' 'a-z' | head -1)
      echo "[$(date)] [GitHub] 📋 Detected spec: $SPEC_ID (from increment $CURRENT_INCREMENT)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# SYNC SPEC TO GITHUB
# ============================================================================

if [ -n "$SPEC_ID" ]; then
  # Sync specific spec
  echo "[$(date)] [GitHub] 🔄 Syncing spec $SPEC_ID to GitHub Project..." >> "$DEBUG_LOG" 2>/dev/null || true

  node "$SYNC_CLI" --spec-id "$SPEC_ID" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
    echo "[$(date)] [GitHub] ⚠️  Spec sync failed for $SPEC_ID (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
  }

  echo "[$(date)] [GitHub] ✅ Spec sync complete for $SPEC_ID" >> "$DEBUG_LOG" 2>/dev/null || true
else
  # Sync all changed specs (fallback)
  echo "[$(date)] [GitHub] 🔄 Syncing all changed specs to GitHub..." >> "$DEBUG_LOG" 2>/dev/null || true

  node "$SYNC_CLI" --all 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
    echo "[$(date)] [GitHub] ⚠️  Batch spec sync failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
  }

  echo "[$(date)] [GitHub] ✅ Batch spec sync complete" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

cat <<EOF
{
  "continue": true
}
EOF
