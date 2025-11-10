#!/bin/bash

# SpecWeave Post-Increment-Change Hook
# Runs automatically after increment files (spec.md, plan.md, tasks.md) are modified
#
# Trigger: File watcher or git hook (pre-commit/post-commit)
# Purpose: Sync increment file changes to GitHub issues
#
# What it does:
# 1. Detects which file changed (spec.md, plan.md, tasks.md)
# 2. Invokes GitHub sync for increment changes
# 3. Updates GitHub issue with scope/plan/task changes
#
# Usage:
#   ./post-increment-change.sh <incrementId> <changedFile>
#
# Example:
#   ./post-increment-change.sh 0015-hierarchical-sync spec.md

set -e

# Find project root
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  pwd
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Configuration
LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Arguments
INCREMENT_ID="$1"
CHANGED_FILE="$2"

if [ -z "$INCREMENT_ID" ] || [ -z "$CHANGED_FILE" ]; then
  echo "Usage: $0 <incrementId> <changedFile>" >&2
  echo "Example: $0 0015-hierarchical-sync spec.md" >&2
  exit 1
fi

echo "[$(date)] 📝 Increment file changed: $CHANGED_FILE" >> "$DEBUG_LOG" 2>/dev/null || true

# Validate changed file
case "$CHANGED_FILE" in
  spec.md|plan.md|tasks.md)
    ;;
  *)
    echo "[$(date)] ⚠️  Unknown file type: $CHANGED_FILE (skipping sync)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
    ;;
esac

# Check if Node.js available
if ! command -v node &> /dev/null; then
  echo "[$(date)] ⚠️  Node.js not found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check if GitHub CLI available
if ! command -v gh &> /dev/null; then
  echo "[$(date)] ℹ️  GitHub CLI not found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "[$(date)] ℹ️  GitHub CLI not authenticated, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Sync to GitHub
echo "[$(date)] 🔄 Syncing $CHANGED_FILE changes to GitHub..." >> "$DEBUG_LOG" 2>/dev/null || true

node dist/plugins/specweave-github/lib/github-sync-increment-changes.js "$INCREMENT_ID" "$CHANGED_FILE" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
  echo "[$(date)] ⚠️  Failed to sync increment changes (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
}

echo "[$(date)] ✅ Post-increment-change hook complete" >> "$DEBUG_LOG" 2>/dev/null || true

# Return success (non-blocking)
exit 0
