#!/bin/bash
# Post-Increment-Done Hook - GitHub Plugin
#
# Purpose: Automatically syncs living docs spec to GitHub Project when increment closes
#
# Triggered by: /specweave:done command completion
# Event: PostSlashCommand (commandName: "specweave:done")
#
# Flow:
# 1. Increment closes → PM validates
# 2. Hook fires automatically
# 3. Syncs living docs spec to GitHub Project
# 4. Closes GitHub Issue (if exists)
#
# Configuration (.specweave/config.json):
#   "hooks": {
#     "post_increment_done": {
#       "sync_to_github_project": true,
#       "close_github_issue": true,
#       "update_living_docs_first": true
#     }
#   }

set -e

# ============================================================================
# Configuration & Logging
# ============================================================================

INCREMENT_ID="$1"
HOOK_NAME="post-increment-done"
LOG_DIR=".specweave/logs"
LOG_FILE="${LOG_DIR}/hooks-debug.log"
CONFIG_FILE=".specweave/config.json"

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Logging function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${timestamp}] [${HOOK_NAME}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log "INFO" "=========================================="
log "INFO" "Post-Increment-Done Hook Started"
log "INFO" "Increment: ${INCREMENT_ID}"
log "INFO" "=========================================="

# ============================================================================
# Validation & Configuration
# ============================================================================

# Check if increment ID provided
if [ -z "$INCREMENT_ID" ]; then
  log "ERROR" "No increment ID provided to hook"
  exit 0
fi

# Normalize increment ID to 4-digit format
# First strip leading zeros to avoid octal interpretation (0019 → 19)
INCREMENT_ID_NUM=$(echo "$INCREMENT_ID" | sed 's/^0*//')
# Then normalize to 4-digit format (19 → 0019)
INCREMENT_ID=$(printf "%04d" "$INCREMENT_ID_NUM" 2>/dev/null || echo "$INCREMENT_ID")

# Find increment directory (format: 0019-name or 0019)
INCREMENT_DIR=$(find .specweave/increments/ -maxdepth 1 -type d -name "${INCREMENT_ID}*" | head -1)

if [ -z "$INCREMENT_DIR" ] || [ ! -d "$INCREMENT_DIR" ]; then
  log "WARN" "Increment directory not found for ID: ${INCREMENT_ID}"
  exit 0
fi

log "INFO" "Found increment directory: ${INCREMENT_DIR}"

# Read configuration
if [ ! -f "$CONFIG_FILE" ]; then
  log "WARN" "Config file not found: ${CONFIG_FILE}"
  exit 0
fi

# Check if GitHub Project sync is enabled
SYNC_ENABLED=$(node -pe "
  try {
    const config = require('./${CONFIG_FILE}');
    config.hooks?.post_increment_done?.sync_to_github_project || false;
  } catch (e) {
    false;
  }
" 2>/dev/null || echo "false")

log "INFO" "GitHub Project sync enabled: ${SYNC_ENABLED}"

if [ "$SYNC_ENABLED" != "true" ]; then
  log "INFO" "GitHub Project sync disabled, skipping"
  exit 0
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
  log "WARN" "GitHub CLI (gh) not found, skipping sync"
  exit 0
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
  log "WARN" "GitHub CLI not authenticated, skipping sync"
  exit 0
fi

# ============================================================================
# Find Living Docs Spec
# ============================================================================

log "INFO" "Finding living docs spec for increment ${INCREMENT_ID}..."

# Pattern 1: spec-NNNN-name.md (e.g., spec-0018-strict-increment-discipline.md)
SPEC_FILE=$(find .specweave/docs/internal/specs/ -name "spec-${INCREMENT_ID}*.md" 2>/dev/null | head -1)

# Pattern 2: spec-NNN-name.md (e.g., spec-018-strict-increment-discipline.md)
if [ -z "$SPEC_FILE" ]; then
  INCREMENT_ID_3DIGIT=$(printf "%03d" "$INCREMENT_ID" 2>/dev/null || echo "$INCREMENT_ID")
  SPEC_FILE=$(find .specweave/docs/internal/specs/ -name "spec-${INCREMENT_ID_3DIGIT}*.md" 2>/dev/null | head -1)
fi

# Pattern 3: Check increment spec.md for living docs reference
if [ -z "$SPEC_FILE" ] && [ -f "${INCREMENT_DIR}/spec.md" ]; then
  log "INFO" "Checking increment spec.md for living docs reference..."
  SPEC_REFERENCE=$(grep -E "Living Docs:.*spec-[0-9]+" "${INCREMENT_DIR}/spec.md" | grep -oE "spec-[0-9]+-[a-z-]+" | head -1)
  if [ -n "$SPEC_REFERENCE" ]; then
    SPEC_FILE=$(find .specweave/docs/internal/specs/ -name "${SPEC_REFERENCE}.md" 2>/dev/null | head -1)
  fi
fi

if [ -z "$SPEC_FILE" ]; then
  log "WARN" "No living docs spec found for increment ${INCREMENT_ID}"
  log "INFO" "This is OK for bug/hotfix increments that don't create new specs"
  exit 0
fi

log "INFO" "Found living docs spec: ${SPEC_FILE}"

# ============================================================================
# Sync to GitHub Project
# ============================================================================

log "INFO" "🔄 Syncing living docs spec to GitHub Project..."

# Extract spec ID from filename (e.g., spec-018-name.md → 018)
SPEC_ID=$(basename "$SPEC_FILE" | grep -oE "spec-[0-9]+" | grep -oE "[0-9]+")

log "INFO" "Spec ID: ${SPEC_ID}"

# Call the sync-spec command
# NOTE: This assumes /specweave-github:sync-spec command exists
# If not implemented yet, this will gracefully fail
if npx specweave sync-spec "$SPEC_FILE" >> "${LOG_FILE}" 2>&1; then
  log "INFO" "✅ GitHub Project synced successfully"
else
  log "WARN" "Failed to sync to GitHub Project (command may not exist yet)"
  log "INFO" "Manual sync: /specweave-github:sync-spec ${SPEC_FILE}"
fi

# ============================================================================
# Close GitHub Issue (Optional)
# ============================================================================

CLOSE_ISSUE=$(node -pe "
  try {
    const config = require('./${CONFIG_FILE}');
    config.hooks?.post_increment_done?.close_github_issue || false;
  } catch (e) {
    false;
  }
" 2>/dev/null || echo "false")

log "INFO" "Close GitHub issue enabled: ${CLOSE_ISSUE}"

if [ "$CLOSE_ISSUE" = "true" ]; then
  # Check if increment has GitHub issue metadata
  METADATA_FILE="${INCREMENT_DIR}/.metadata.json"

  if [ -f "$METADATA_FILE" ]; then
    ISSUE_NUMBER=$(node -pe "
      try {
        const metadata = require('./${METADATA_FILE}');
        metadata.github?.issue || '';
      } catch (e) {
        '';
      }
    " 2>/dev/null || echo "")

    if [ -n "$ISSUE_NUMBER" ]; then
      log "INFO" "Closing GitHub issue #${ISSUE_NUMBER}..."

      # Close issue via gh CLI
      if gh issue close "$ISSUE_NUMBER" --comment "✅ Increment ${INCREMENT_ID} completed and closed" >> "${LOG_FILE}" 2>&1; then
        log "INFO" "✅ GitHub issue #${ISSUE_NUMBER} closed"
      else
        log "WARN" "Failed to close GitHub issue #${ISSUE_NUMBER}"
      fi
    else
      log "INFO" "No GitHub issue found in metadata"
    fi
  else
    log "INFO" "No metadata file found: ${METADATA_FILE}"
  fi
fi

# ============================================================================
# Completion
# ============================================================================

log "INFO" "=========================================="
log "INFO" "Post-Increment-Done Hook Completed"
log "INFO" "Increment: ${INCREMENT_ID}"
log "INFO" "Spec: ${SPEC_FILE}"
log "INFO" "=========================================="

exit 0
