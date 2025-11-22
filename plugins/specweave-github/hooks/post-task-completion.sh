#!/bin/bash

# SpecWeave GitHub Sync Hook
# Runs after task completion to sync progress to GitHub Projects
#
# ARCHITECTURE (v0.19.0+): IMMUTABLE DESCRIPTIONS + PROGRESS COMMENTS
# - User Story files (.specweave/docs/internal/specs/) ↔ GitHub Issues
# - Issue descriptions created once (IMMUTABLE snapshot)
# - All updates via progress comments (audit trail)
#
# This hook is part of the specweave-github plugin and handles:
# - Finding which spec user stories the current work belongs to
# - Syncing progress via GitHub comments (NOT editing issue body)
# - Creating audit trail of all changes over time
# - Notifying stakeholders via GitHub notifications
#
# Dependencies:
# - Node.js and TypeScript CLI (dist/cli/commands/sync-spec-content.js)
# - GitHub CLI (gh) must be installed and authenticated
# - ProgressCommentBuilder (lib/progress-comment-builder.ts)

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

# Check if github-spec-content-sync CLI exists
SYNC_CLI="$PROJECT_ROOT/dist/src/cli/commands/sync-spec-content.js"
if [ ! -f "$SYNC_CLI" ]; then
  echo "[$(date)] [GitHub] ⚠️  sync-spec-content CLI not found at $SYNC_CLI, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
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
# DETECT ALL SPECS (Multi-Spec Support)
# ============================================================================

# Strategy: Use multi-spec detector to find ALL specs referenced in current increment

# 1. Detect current increment (temporary context)
CURRENT_INCREMENT=$(ls -td .specweave/increments/*/ 2>/dev/null | xargs -n1 basename | grep -v "_backlog" | grep -v "_archive" | grep -v "_working" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] [GitHub] ℹ️  No active increment, checking for spec changes..." >> "$DEBUG_LOG" 2>/dev/null || true
  # Fall through to sync all changed specs
fi

# 2. Use TypeScript CLI to detect all specs
DETECT_CLI="$PROJECT_ROOT/dist/src/cli/commands/detect-specs.js"

if [ -f "$DETECT_CLI" ]; then
  echo "[$(date)] [GitHub] 🔍 Detecting all specs in increment $CURRENT_INCREMENT..." >> "$DEBUG_LOG" 2>/dev/null || true

  # Call detect-specs CLI and capture JSON output
  DETECTION_RESULT=$(node "$DETECT_CLI" 2>> "$DEBUG_LOG" || echo "{}")

  # Extract spec count
  SPEC_COUNT=$(echo "$DETECTION_RESULT" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf-8')); console.log(data.specs?.length || 0)")

  echo "[$(date)] [GitHub] 📋 Detected $SPEC_COUNT spec(s)" >> "$DEBUG_LOG" 2>/dev/null || true

  # Store detection result for later use
  echo "$DETECTION_RESULT" > /tmp/specweave-detected-specs.json
else
  echo "[$(date)] [GitHub] ⚠️  detect-specs CLI not found at $DETECT_CLI, falling back to git diff" >> "$DEBUG_LOG" 2>/dev/null || true
  SPEC_COUNT=0
fi

# ============================================================================
# SYNC ALL DETECTED SPECS TO GITHUB (Multi-Spec Support)
# ============================================================================

if [ -f /tmp/specweave-detected-specs.json ] && [ "$SPEC_COUNT" -gt 0 ]; then
  # Multi-spec sync: Loop through all detected specs
  echo "[$(date)] [GitHub] 🔄 Syncing $SPEC_COUNT spec(s) to GitHub..." >> "$DEBUG_LOG" 2>/dev/null || true

  # Extract spec paths using Node.js
  SPEC_PATHS=$(node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('/tmp/specweave-detected-specs.json', 'utf-8'));
    const syncable = data.specs.filter(s => s.syncEnabled && s.project !== '_parent');
    syncable.forEach(s => console.log(s.path));
  " 2>> "$DEBUG_LOG")

  # Count syncable specs
  SYNCABLE_COUNT=$(echo "$SPEC_PATHS" | grep -v '^$' | wc -l | tr -d ' ')

  if [ "$SYNCABLE_COUNT" -gt 0 ]; then
    echo "[$(date)] [GitHub] 📋 Syncing $SYNCABLE_COUNT syncable spec(s) (excluding _parent)" >> "$DEBUG_LOG" 2>/dev/null || true

    # Sync each spec
    echo "$SPEC_PATHS" | while read -r SPEC_FILE; do
      if [ -n "$SPEC_FILE" ] && [ -f "$SPEC_FILE" ]; then
        # Extract project and spec ID from path
        SPEC_NAME=$(basename "$SPEC_FILE" .md)
        PROJECT=$(basename "$(dirname "$SPEC_FILE")")

        echo "[$(date)] [GitHub] 🔄 Syncing $PROJECT/$SPEC_NAME..." >> "$DEBUG_LOG" 2>/dev/null || true

        (cd "$PROJECT_ROOT" && node "$SYNC_CLI" --spec "$SPEC_FILE" --provider github) 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] [GitHub] ⚠️  Spec sync failed for $PROJECT/$SPEC_NAME (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }

        echo "[$(date)] [GitHub] ✅ Synced $PROJECT/$SPEC_NAME" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    done

    echo "[$(date)] [GitHub] ✅ Multi-spec sync complete ($SYNCABLE_COUNT synced)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    echo "[$(date)] [GitHub] ℹ️  No syncable specs (all specs are _parent or syncEnabled=false)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi

  # Cleanup temp file
  rm -f /tmp/specweave-detected-specs.json 2>/dev/null || true
else
  # Fallback: Sync all modified specs (check git diff)
  echo "[$(date)] [GitHub] 🔄 Checking for modified specs..." >> "$DEBUG_LOG" 2>/dev/null || true

  MODIFIED_SPECS=$(git diff --name-only HEAD .specweave/docs/internal/specs/**/*.md 2>/dev/null || echo "")

  if [ -n "$MODIFIED_SPECS" ]; then
    echo "[$(date)] [GitHub] 📝 Found modified specs:" >> "$DEBUG_LOG" 2>/dev/null || true
    echo "$MODIFIED_SPECS" >> "$DEBUG_LOG" 2>/dev/null || true

    # Sync each modified spec
    echo "$MODIFIED_SPECS" | while read -r SPEC_FILE; do
      if [ -n "$SPEC_FILE" ] && [ -f "$SPEC_FILE" ]; then
        echo "[$(date)] [GitHub] 🔄 Syncing $SPEC_FILE..." >> "$DEBUG_LOG" 2>/dev/null || true
        (cd "$PROJECT_ROOT" && node "$SYNC_CLI" --spec "$SPEC_FILE" --provider github) 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || true
      fi
    done

    echo "[$(date)] [GitHub] ✅ Batch spec sync complete" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    echo "[$(date)] [GitHub] ℹ️  No modified specs found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
fi

# ============================================================================
# EPIC GITHUB ISSUE SYNC (DEPRECATED v0.24.0+)
# ============================================================================
#
# ⚠️  DEPRECATED: SpecWeave now syncs ONLY at User Story level.
#
# Feature/Epic-level issues are no longer updated.
# Use /specweave-github:sync instead to sync User Story issues.
#
# To re-enable (NOT recommended):
#   export SPECWEAVE_ENABLE_EPIC_SYNC=true
#
# @see .specweave/increments/0047-us-task-linkage/reports/GITHUB-TITLE-FORMAT-FIX-PLAN.md
# ============================================================================

if [ "$SPECWEAVE_ENABLE_EPIC_SYNC" = "true" ]; then
  echo "[$(date)] [GitHub] 🔄 Checking for Epic GitHub issue update (DEPRECATED)..." >> "$DEBUG_LOG" 2>/dev/null || true

  # Find active increment ID
  ACTIVE_INCREMENT=$(ls -t .specweave/increments/ | grep -v '^\.' | while read inc; do
    if [ -f ".specweave/increments/$inc/metadata.json" ]; then
      STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' ".specweave/increments/$inc/metadata.json" 2>/dev/null | sed 's/.*"\([^"]*\)".*/\1/' || true)
      if [ "$STATUS" = "active" ]; then
        echo "$inc"
        break
      fi
    fi
  done | head -1)

  if [ -n "$ACTIVE_INCREMENT" ]; then
    echo "[$(date)] [GitHub] 🎯 Active increment: $ACTIVE_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run Epic sync script (silently, errors logged to debug log)
    if [ -f "$PROJECT_ROOT/scripts/update-epic-github-issue.sh" ]; then
      echo "[$(date)] [GitHub] 🚀 Updating Epic GitHub issue (DEPRECATED)..." >> "$DEBUG_LOG" 2>/dev/null || true
      "$PROJECT_ROOT/scripts/update-epic-github-issue.sh" "$ACTIVE_INCREMENT" >> "$DEBUG_LOG" 2>&1 || true
      echo "[$(date)] [GitHub] ⚠️  Epic sync is deprecated. Use /specweave-github:sync instead." >> "$DEBUG_LOG" 2>/dev/null || true
    else
      echo "[$(date)] [GitHub] ⚠️  Epic sync script not found, skipping" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  else
    echo "[$(date)] [GitHub] ℹ️  No active increment found, skipping Epic sync" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  echo "[$(date)] [GitHub] ℹ️  Epic sync disabled (sync at User Story level only)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

cat <<EOF
{
  "continue": true
}
EOF
