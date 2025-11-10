#!/bin/bash

# SpecWeave Azure DevOps Sync Hook
# Runs after task completion to sync progress to Azure DevOps Work Items
#
# This hook is part of the specweave-ado plugin and handles:
# - Syncing task completion state to Azure DevOps work items
# - Updating ADO work item status based on increment progress
#
# Dependencies:
# - Node.js for running sync scripts
# - jq for JSON parsing
# - metadata.json must have .ado.item field
# - Azure DevOps PAT in .env

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

echo "[$(date)] [ADO] 🔗 Azure DevOps sync hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# Detect current increment
CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] [ADO] ℹ️  No active increment, skipping ADO sync" >> "$DEBUG_LOG" 2>/dev/null || true
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
  echo "[$(date)] [ADO] ℹ️  No metadata.json for $CURRENT_INCREMENT, skipping ADO sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for ADO work item link
if ! command -v jq &> /dev/null; then
  echo "[$(date)] [ADO] ⚠️  jq not found, skipping ADO sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

ADO_ITEM=$(jq -r '.ado.item // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$ADO_ITEM" ]; then
  echo "[$(date)] [ADO] ℹ️  No Azure DevOps work item linked to $CURRENT_INCREMENT, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "[$(date)] [ADO] ⚠️  Node.js not found, skipping ADO sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for ADO sync script
if [ ! -f "dist/commands/ado-sync.js" ]; then
  echo "[$(date)] [ADO] ⚠️  ado-sync.js not found, skipping ADO sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# ============================================================================
# AZURE DEVOPS SYNC LOGIC
# ============================================================================

echo "[$(date)] [ADO] 🔄 Syncing to Azure DevOps work item $ADO_ITEM" >> "$DEBUG_LOG" 2>/dev/null || true

# Run ADO sync command (non-blocking)
node dist/commands/ado-sync.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
  echo "[$(date)] [ADO] ⚠️  Failed to sync to Azure DevOps (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
}

echo "[$(date)] [ADO] ✅ Azure DevOps sync complete" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

cat <<EOF
{
  "continue": true
}
EOF
