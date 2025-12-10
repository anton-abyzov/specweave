#!/bin/bash

# SpecWeave Post-Increment-Status-Change Hook (v0.28.33)
# Runs automatically after increment status changes (pause/resume/abandon)
#
# Trigger: /specweave:pause, /specweave:resume, /specweave:abandon commands
# Purpose: Sync GitHub issue state with increment status
#
# What it does:
# 1. Detects status change (paused, resumed, abandoned)
# 2. Posts comment to GitHub issue
# 3. NEW (v0.28.33): Reopens issues when resumed, closes when abandoned
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
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
  paused|abandoned|active|planning|backlog|ready_for_review|completed)
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

# Extract GitHub issue number (main increment issue)
GITHUB_ISSUE=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)

# Detect repository
GITHUB_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
REPO_MATCH=$(echo "$GITHUB_REMOTE" | grep -o 'github\.com[:/][^/]*/[^/]*' | sed 's/github\.com[:/]//')

if [ -z "$REPO_MATCH" ]; then
  echo "[$(date)] ⚠️  Could not detect GitHub repository" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# ============================================================================
# STATUS-BASED ACTIONS (NEW in v0.28.33)
# ============================================================================

case "$NEW_STATUS" in
  active|planning|backlog|ready_for_review)
    # ========================================================================
    # REOPEN GitHub Issues (NEW)
    # ========================================================================
    # When increment becomes active (including resumed from pause), reopen all closed GitHub issues
    echo "[$(date)] ▶️  Status is $NEW_STATUS - checking if issues need reopening" >> "$DEBUG_LOG" 2>/dev/null || true

    if command -v node &> /dev/null; then
      # Find reopen script
      REOPEN_SCRIPT=""
      if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/reopen-github-issues.js" ]; then
        REOPEN_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/reopen-github-issues.js"
      elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/reopen-github-issues.js" ]; then
        REOPEN_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/reopen-github-issues.js"
      elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/reopen-github-issues.js" ]; then
        REOPEN_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/reopen-github-issues.js"
      elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/reopen-github-issues.js" ]; then
        REOPEN_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/reopen-github-issues.js"
      fi

      if [ -n "$REOPEN_SCRIPT" ]; then
        # Load GITHUB_TOKEN from .env
        if [ -f "$PROJECT_ROOT/.env" ]; then
          GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
          if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
            export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
          fi
        fi

        echo "▶️  Reopening GitHub issues for resumed increment..."
        (cd "$PROJECT_ROOT" && node "$REOPEN_SCRIPT" "$INCREMENT_ID" "${REASON:-Increment resumed}") 2>&1 | tee -a "$DEBUG_LOG" || {
          echo "[$(date)] ⚠️  Failed to reopen issues (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      else
        echo "[$(date)] ⚠️  reopen-github-issues.js not found" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    fi
    ;;

  abandoned)
    # ========================================================================
    # CLOSE GitHub Issues on Abandon (NEW)
    # ========================================================================
    echo "[$(date)] 🗑️  Status is abandoned - closing GitHub issues" >> "$DEBUG_LOG" 2>/dev/null || true

    if command -v node &> /dev/null; then
      # Find close script
      CLOSE_SCRIPT=""
      if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/close-github-issues-abandoned.js" ]; then
        CLOSE_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/close-github-issues-abandoned.js"
      elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/close-github-issues-abandoned.js" ]; then
        CLOSE_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/close-github-issues-abandoned.js"
      elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/close-github-issues-abandoned.js" ]; then
        CLOSE_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/close-github-issues-abandoned.js"
      elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/close-github-issues-abandoned.js" ]; then
        CLOSE_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/close-github-issues-abandoned.js"
      fi

      if [ -n "$CLOSE_SCRIPT" ]; then
        # Load GITHUB_TOKEN from .env
        if [ -f "$PROJECT_ROOT/.env" ]; then
          GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
          if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
            export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
          fi
        fi

        echo "🗑️  Closing GitHub issues for abandoned increment..."
        (cd "$PROJECT_ROOT" && node "$CLOSE_SCRIPT" "$INCREMENT_ID" "${REASON:-Increment abandoned}") 2>&1 | tee -a "$DEBUG_LOG" || {
          echo "[$(date)] ⚠️  Failed to close issues (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      else
        echo "[$(date)] ⚠️  close-github-issues-abandoned.js not found" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    fi
    ;;

  paused)
    # Paused: Just post comment (no close/reopen)
    echo "[$(date)] ⏸️  Status is paused - posting comment only" >> "$DEBUG_LOG" 2>/dev/null || true
    ;;
esac

# ============================================================================
# POST COMMENT TO MAIN ISSUE (always, for all status changes)
# ============================================================================

if [ -n "$GITHUB_ISSUE" ]; then
  echo "[$(date)] 🔄 Posting status change to GitHub issue #$GITHUB_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

  # Build comment based on status
  EMOJI=""
  TITLE=""
  case "$NEW_STATUS" in
    paused)
      EMOJI="⏸️"
      TITLE="Increment Paused"
      ;;
    resumed|active|in-progress)
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
else
  echo "[$(date)] ℹ️  No main GitHub issue linked" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# Update status line cache (status changed - may affect which increment is "current")
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

# Return success (non-blocking)
exit 0
