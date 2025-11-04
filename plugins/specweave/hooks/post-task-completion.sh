#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# SMART SESSION-END DETECTION (v2.0):
# =====================================
# Problem: Claude creates multiple todo lists in one conversation
# - List 1: [A, B, C] → completes → sound plays
# - List 2: [D, E] → completes 30s later → sound plays again
# - User hears sounds while Claude is still working!
#
# Solution: Inactivity-based detection
# - Track time gaps BETWEEN TodoWrite calls
# - If all tasks complete AND gap > INACTIVITY_THRESHOLD (15s)
#   → Session is winding down → Play sound
# - If rapid completions (gap < threshold)
#   → Claude still actively working → Skip sound
#
# Example:
# 10:00:00 - Task done (gap: 5s) → skip sound
# 10:00:05 - Task done (gap: 5s) → skip sound
# 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
# ...
# 10:01:00 - All done (gap: 50s) → PLAY SOUND! (session ending)
#
# DEBOUNCING: Prevents duplicate fires (Claude Code calls hooks twice)

set -e

# Find project root by searching upward for .specweave/ directory
# Works regardless of where hook is installed (source or .claude/hooks/)
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

# Debounce window to prevent duplicate hook fires
DEBOUNCE_SECONDS=2

# Inactivity threshold to detect session end
# If gap between TodoWrite calls > this value, assume session is ending
INACTIVITY_THRESHOLD=15  # seconds (configurable)

# File paths
LOGS_DIR=".specweave/logs"
LAST_FIRE_FILE="$LOGS_DIR/last-hook-fire"
LAST_TODOWRITE_FILE="$LOGS_DIR/last-todowrite-time"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
TASKS_LOG="$LOGS_DIR/tasks.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# DEBOUNCING
# ============================================================================

CURRENT_TIME=$(date +%s)

# Skip if hook fired within last N seconds (prevents duplicates)
if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    echo "[$(date)] ⏭️  Debounced (last fire: ${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
    cat <<EOF
{
  "continue": true
}
EOF
    exit 0
  fi
fi

echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# ============================================================================
# CAPTURE INPUT
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] 📋 TodoWrite hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# INACTIVITY DETECTION
# ============================================================================

INACTIVITY_GAP=0
PREVIOUS_TODOWRITE_TIME=0

if [ -f "$LAST_TODOWRITE_FILE" ]; then
  PREVIOUS_TODOWRITE_TIME=$(cat "$LAST_TODOWRITE_FILE" 2>/dev/null || echo "0")
  INACTIVITY_GAP=$((CURRENT_TIME - PREVIOUS_TODOWRITE_TIME))
  echo "[$(date)] ⏱️  Inactivity gap: ${INACTIVITY_GAP}s (threshold: ${INACTIVITY_THRESHOLD}s)" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] 🆕 First TodoWrite in session" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# Save current timestamp for next call
echo "$CURRENT_TIME" > "$LAST_TODOWRITE_FILE"

# ============================================================================
# PARSE TASK COMPLETION STATE
# ============================================================================

ALL_COMPLETED=false

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (more reliable)
  PENDING_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status != "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "1")
  TOTAL_COUNT=$(jq -r '.tool_input.todos // [] | length' "$STDIN_DATA" 2>/dev/null || echo "0")

  echo "[$(date)] 📊 Tasks: $((TOTAL_COUNT - PENDING_COUNT))/$TOTAL_COUNT completed" >> "$DEBUG_LOG" 2>/dev/null || true

  if [ "$PENDING_COUNT" = "0" ] && [ "$TOTAL_COUNT" != "0" ]; then
    ALL_COMPLETED=true
  fi
else
  # Fallback: Simple grep check (less reliable but works without jq)
  if grep -q '"status":"pending"\|"status":"in_progress"' "$STDIN_DATA" 2>/dev/null; then
    ALL_COMPLETED=false
  else
    ALL_COMPLETED=true
  fi
fi

rm -f "$STDIN_DATA"

# ============================================================================
# SESSION-END DETECTION LOGIC
# ============================================================================

SESSION_ENDING=false
DECISION_REASON=""

if [ "$ALL_COMPLETED" = "true" ]; then
  if [ "$INACTIVITY_GAP" -ge "$INACTIVITY_THRESHOLD" ]; then
    SESSION_ENDING=true
    DECISION_REASON="All tasks complete + ${INACTIVITY_GAP}s inactivity ≥ ${INACTIVITY_THRESHOLD}s threshold"
    echo "[$(date)] 🎉 SESSION ENDING DETECTED! ($DECISION_REASON)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    DECISION_REASON="All tasks complete, but rapid activity (${INACTIVITY_GAP}s < ${INACTIVITY_THRESHOLD}s) - Claude likely creating more work"
    echo "[$(date)] ⚡ $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  DECISION_REASON="Tasks remaining in current list"
  echo "[$(date)] 🔄 $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# UPDATE TASKS.MD (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  # Detect current increment (latest non-backlog increment)
  CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

  if [ -n "$CURRENT_INCREMENT" ] && [ -f ".specweave/increments/$CURRENT_INCREMENT/tasks.md" ]; then
    echo "[$(date)] 📝 Updating tasks.md for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run task updater (non-blocking, best-effort)
    node dist/hooks/lib/update-tasks-md.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to update tasks.md (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  else
    echo "[$(date)] ℹ️  No current increment or tasks.md found, skipping tasks.md update" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  echo "[$(date)] ⚠️  Node.js not found, skipping tasks.md update" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# SYNC LIVING DOCS (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 📚 Checking living docs sync for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run living docs sync (non-blocking, best-effort)
    node dist/hooks/lib/sync-living-docs.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to sync living docs (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  fi
fi

# ============================================================================
# TRANSLATE LIVING DOCS (NEW in v0.6.0 - i18n)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 🌐 Checking if living docs translation is needed for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run living docs translation (non-blocking, best-effort)
    node dist/hooks/lib/translate-living-docs.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to translate living docs (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  fi
fi

# ============================================================================
# SYNC TO EXTERNAL TRACKERS (NEW in v0.7.0 - GitHub/Jira/ADO)
# ============================================================================

if [ -n "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] 🔗 Checking external tracker sync for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

  # Check for metadata.json with GitHub/Jira issue link
  METADATA_FILE=".specweave/increments/$CURRENT_INCREMENT/metadata.json"

  if [ -f "$METADATA_FILE" ]; then
    # Detect tracker type from metadata
    GITHUB_ISSUE=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)
    JIRA_ISSUE=$(jq -r '.jira.issue // empty' "$METADATA_FILE" 2>/dev/null)
    ADO_ITEM=$(jq -r '.ado.item // empty' "$METADATA_FILE" 2>/dev/null)

    # GitHub sync (if issue exists and gh CLI available)
    if [ -n "$GITHUB_ISSUE" ] && command -v gh &> /dev/null; then
      echo "[$(date)] 🔄 Syncing to GitHub issue #$GITHUB_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

      # Run GitHub sync command (non-blocking)
      if command -v node &> /dev/null && [ -f "dist/commands/github-sync.js" ]; then
        # Use --tasks flag to update issue description (not just comments)
        node dist/commands/github-sync.js "$CURRENT_INCREMENT" --tasks 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to sync to GitHub (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      else
        # Fallback: Use gh CLI directly
        gh issue comment "$GITHUB_ISSUE" --body "Progress update: Task completed in increment $CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to comment on GitHub issue (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      fi
    fi

    # Jira sync (if issue exists)
    if [ -n "$JIRA_ISSUE" ]; then
      echo "[$(date)] 🔄 Syncing to Jira issue $JIRA_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

      # Run Jira sync command (non-blocking)
      if command -v node &> /dev/null && [ -f "dist/commands/jira-sync.js" ]; then
        node dist/commands/jira-sync.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to sync to Jira (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      fi
    fi

    # Azure DevOps sync (if work item exists)
    if [ -n "$ADO_ITEM" ]; then
      echo "[$(date)] 🔄 Syncing to Azure DevOps item $ADO_ITEM" >> "$DEBUG_LOG" 2>/dev/null || true

      # Run ADO sync command (non-blocking)
      if command -v node &> /dev/null && [ -f "dist/commands/ado-sync.js" ]; then
        node dist/commands/ado-sync.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to sync to Azure DevOps (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      fi
    fi

    # Log if no external tracker configured
    if [ -z "$GITHUB_ISSUE" ] && [ -z "$JIRA_ISSUE" ] && [ -z "$ADO_ITEM" ]; then
      echo "[$(date)] ℹ️  No external tracker configured for $CURRENT_INCREMENT (skipping sync)" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  else
    echo "[$(date)] ℹ️  No metadata.json found for $CURRENT_INCREMENT (skipping tracker sync)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

# ============================================================================
# PLAY SOUND (only if session is truly ending)
# ============================================================================

play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\chimes.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

if [ "$SESSION_ENDING" = "true" ]; then
  echo "[$(date)] 🔔 Playing completion sound" >> "$DEBUG_LOG" 2>/dev/null || true
  play_sound
fi

# ============================================================================
# LOGGING
# ============================================================================

echo "[$(date)] Status: All_completed=$ALL_COMPLETED, Session_ending=$SESSION_ENDING, Inactivity=${INACTIVITY_GAP}s" >> "$TASKS_LOG" 2>/dev/null || true
echo "[$(date)] Reason: $DECISION_REASON" >> "$TASKS_LOG" 2>/dev/null || true
echo "---" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

if [ "$SESSION_ENDING" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🎉 ALL WORK COMPLETED! Session ending detected (${INACTIVITY_GAP}s inactivity). Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
}
EOF
elif [ "$ALL_COMPLETED" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task batch completed (${INACTIVITY_GAP}s since last activity). Continuing work..."
}
EOF
else
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task completed. More tasks remaining - keep going!"
}
EOF
fi
