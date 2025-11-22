#!/bin/bash

# SpecWeave Post-Increment-Status-Change Hook
# Runs automatically after increment status changes (pause/resume/abandon)
#
# Trigger: /specweave:pause, /specweave:resume, /specweave:abandon commands
# Purpose: Notify GitHub when increment status changes
#
# What it does:
# 1. Detects status change (paused, resumed, abandoned)
# 2. Posts comment to GitHub issue
# 3. Updates metadata
#
# Usage:
#   ./post-increment-status-change.sh <incrementId> <newStatus> <reason>
#
# Example:
#   ./post-increment-status-change.sh 0015-hierarchical-sync paused "Waiting for API keys"

set +e  # EMERGENCY FIX: Prevents Claude Code crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

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
NEW_STATUS="$2"
REASON="$3"

if [ -z "$INCREMENT_ID" ] || [ -z "$NEW_STATUS" ]; then
  echo "Usage: $0 <incrementId> <newStatus> [reason]" >&2
  echo "Example: $0 0015-hierarchical-sync paused 'Waiting for API'" >&2
  exit 1
fi

echo "[$(date)] 📊 Status changed: $NEW_STATUS" >> "$DEBUG_LOG" 2>/dev/null || true

# Validate status
case "$NEW_STATUS" in
  paused|resumed|abandoned)
    ;;
  *)
    echo "[$(date)] ⚠️  Unknown status: $NEW_STATUS (skipping sync)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
    ;;
esac

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

# Load metadata
METADATA_FILE=".specweave/increments/$INCREMENT_ID/metadata.json"

if [ ! -f "$METADATA_FILE" ]; then
  echo "[$(date)] ℹ️  No metadata.json found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Extract GitHub issue number
GITHUB_ISSUE=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$GITHUB_ISSUE" ]; then
  echo "[$(date)] ℹ️  No GitHub issue linked, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Detect repository
GITHUB_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
REPO_MATCH=$(echo "$GITHUB_REMOTE" | grep -o 'github\.com[:/][^/]*/[^/]*' | sed 's/github\.com[:/]//')

if [ -z "$REPO_MATCH" ]; then
  echo "[$(date)] ⚠️  Could not detect GitHub repository" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

echo "[$(date)] 🔄 Posting status change to GitHub issue #$GITHUB_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

# Build comment based on status
EMOJI=""
TITLE=""
case "$NEW_STATUS" in
  paused)
    EMOJI="⏸️"
    TITLE="Increment Paused"
    ;;
  resumed)
    EMOJI="▶️"
    TITLE="Increment Resumed"
    ;;
  abandoned)
    EMOJI="🗑️"
    TITLE="Increment Abandoned"
    ;;
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

COMMENT="$EMOJI **$TITLE**

**Reason**: ${REASON:-Not specified}

**Timestamp**: $TIMESTAMP

---
🤖 Auto-updated by SpecWeave"

# Post comment
echo "$COMMENT" | gh issue comment "$GITHUB_ISSUE" --body-file - 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
  echo "[$(date)] ⚠️  Failed to post comment (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
}

echo "[$(date)] ✅ Status change synced to GitHub" >> "$DEBUG_LOG" 2>/dev/null || true

# Update status line cache (status changed - may affect which increment is "current")
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

# Return success (non-blocking)
exit 0
