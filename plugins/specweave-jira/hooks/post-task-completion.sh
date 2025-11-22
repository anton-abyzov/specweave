#!/bin/bash

# SpecWeave JIRA Sync Hook
# Runs after task completion to sync progress to JIRA Issues
#
# This hook is part of the specweave-jira plugin and handles:
# - Syncing task completion state to JIRA issues
# - Updating JIRA issue status based on increment progress
#
# Dependencies:
# - Node.js for running sync scripts
# - jq for JSON parsing
# - metadata.json must have .jira.issue field
# - JIRA API credentials in .env

set +e  # EMERGENCY FIX: Prevents Claude Code crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

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

echo "[$(date)] [JIRA] 🔗 JIRA sync hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# Detect current increment
CURRENT_INCREMENT=$(ls -td .specweave/increments/*/ 2>/dev/null | xargs -n1 basename | grep -v "_backlog" | grep -v "_archive" | grep -v "_working" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] [JIRA] ℹ️  No active increment, skipping JIRA sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for metadata.json
METADATA_FILE=".specweave/increments/$CURRENT_INCREMENT/metadata.json"

if [ ! -f "$METADATA_FILE" ]; then
  echo "[$(date)] [JIRA] ℹ️  No metadata.json for $CURRENT_INCREMENT, skipping JIRA sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for JIRA issue link
if ! command -v jq &> /dev/null; then
  echo "[$(date)] [JIRA] ⚠️  jq not found, skipping JIRA sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

JIRA_ISSUE=$(jq -r '.jira.issue // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$JIRA_ISSUE" ]; then
  echo "[$(date)] [JIRA] ℹ️  No JIRA issue linked to $CURRENT_INCREMENT, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "[$(date)] [JIRA] ⚠️  Node.js not found, skipping JIRA sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for JIRA sync script
if [ ! -f "dist/commands/jira-sync.js" ]; then
  echo "[$(date)] [JIRA] ⚠️  jira-sync.js not found, skipping JIRA sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# ============================================================================
# JIRA SYNC LOGIC
# ============================================================================

echo "[$(date)] [JIRA] 🔄 Syncing to JIRA issue $JIRA_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

# Run JIRA sync command (non-blocking)
node dist/commands/jira-sync.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
  echo "[$(date)] [JIRA] ⚠️  Failed to sync to JIRA (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
}

echo "[$(date)] [JIRA] ✅ JIRA sync complete" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# SPEC COMMIT SYNC (NEW!)
# ============================================================================

echo "[$(date)] [JIRA] 🔗 Checking for spec commit sync..." >> "$DEBUG_LOG" 2>/dev/null || true

# Call TypeScript CLI to sync commits
if command -v node &> /dev/null && [ -f "$PROJECT_ROOT/dist/cli/commands/sync-spec-commits.js" ]; then
  echo "[$(date)] [JIRA] 🚀 Running spec commit sync..." >> "$DEBUG_LOG" 2>/dev/null || true

  node "$PROJECT_ROOT/dist/cli/commands/sync-spec-commits.js" \
    --increment "$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT" \
    --provider jira \
    2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] [JIRA] ⚠️  Spec commit sync failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }

  echo "[$(date)] [JIRA] ✅ Spec commit sync complete" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] [JIRA] ℹ️  Spec commit sync not available (node or script not found)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

cat <<EOF
{
  "continue": true
}
EOF

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
