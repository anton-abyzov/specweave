#!/bin/bash
#
# Update Epic GitHub Issue with Fresh Data
#
# Called by post-task-completion hook to keep Epic issues in sync.
# Re-generates issue body using EpicContentBuilder and updates GitHub.
#
# Usage:
#   ./scripts/update-epic-github-issue.sh <increment-id>
#
# Example:
#   ./scripts/update-epic-github-issue.sh 0031-external-tool-status-sync
#
# Exit codes:
#   0 - Success
#   1 - Error (Epic not found, GitHub CLI missing, etc.)
#   2 - Skipped (Epic folder doesn't exist yet, no GitHub issue linked)

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="$(pwd)"
LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/epic-sync-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

log_debug() {
  echo "[$(date)] [Epic Sync] $1" >> "$DEBUG_LOG" 2>/dev/null || true
}

log_info() {
  echo "   $1"
  log_debug "$1"
}

# ============================================================================
# PRECONDITIONS CHECK
# ============================================================================

if [ $# -lt 1 ]; then
  echo "❌ Usage: $0 <increment-id>"
  echo "   Example: $0 0031-external-tool-status-sync"
  exit 1
fi

INCREMENT_ID="$1"

log_debug "Updating Epic GitHub issue for increment: $INCREMENT_ID"

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  log_info "⚠️  GitHub CLI (gh) not found, skipping Epic issue update"
  exit 2
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  log_info "⚠️  Node.js not found, skipping Epic issue update"
  exit 2
fi

# ============================================================================
# FIND EPIC FOLDER
# ============================================================================

# Extract Epic ID from increment metadata or config
METADATA_FILE=".specweave/increments/$INCREMENT_ID/metadata.json"

if [ ! -f "$METADATA_FILE" ]; then
  log_info "⚠️  Metadata not found for $INCREMENT_ID, skipping Epic sync"
  exit 2
fi

# Try to find Epic ID from spec.md frontmatter or metadata
SPEC_FILE=".specweave/increments/$INCREMENT_ID/spec.md"
EPIC_ID=""

# Method 1: Check spec.md frontmatter for epic field
if [ -f "$SPEC_FILE" ]; then
  EPIC_ID=$(grep -m 1 '^epic:' "$SPEC_FILE" 2>/dev/null | sed 's/^epic:[[:space:]]*//' | tr -d '\r\n' || true)
fi

# Method 2: Check metadata.json for epic field
if [ -z "$EPIC_ID" ] && [ -f "$METADATA_FILE" ]; then
  EPIC_ID=$(grep -o '"epic"[[:space:]]*:[[:space:]]*"[^"]*"' "$METADATA_FILE" 2>/dev/null | sed 's/.*"\([^"]*\)".*/\1/' || true)
fi

# Method 3: Find Epic folder by matching increment ID
if [ -z "$EPIC_ID" ]; then
  # Detect active project from config (v0.23.0+, Increment 0047)
  PROJECT_ID="default"
  if [ -f ".specweave/config.json" ]; then
    if command -v jq >/dev/null 2>&1; then
      ACTIVE_PROJECT=$(jq -r '.multiProject.activeProject // .project.name // "default"' ".specweave/config.json" 2>/dev/null)
      if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
        PROJECT_ID="$ACTIVE_PROJECT"
      fi
    fi
  fi
  log_debug "Using project: $PROJECT_ID (from config)"

  # Search for Epic folder that contains this increment (use active project)
  SPECS_DIR=".specweave/docs/internal/specs/$PROJECT_ID"
  if [ ! -d "$SPECS_DIR" ]; then
    log_debug "⚠️  Specs directory not found: $SPECS_DIR (falling back to default)"
    SPECS_DIR=".specweave/docs/internal/specs/default"
  fi

  EPIC_FOLDER_TEMP=$(find "$SPECS_DIR" -type d -name "FS-*" | while read folder; do
    if [ -f "$folder/FEATURE.md" ]; then
      # Check if FEATURE.md mentions this increment ID
      if grep -q "$INCREMENT_ID" "$folder/FEATURE.md" 2>/dev/null; then
        basename "$folder" | cut -d'-' -f1-4  # Extract FS-YY-MM-DD
        break
      fi
    fi
  done | head -1)

  if [ -n "$EPIC_FOLDER_TEMP" ]; then
    EPIC_ID="$EPIC_FOLDER_TEMP"
  fi
fi

# Method 4: Fallback to date-based Epic ID from increment number
if [ -z "$EPIC_ID" ]; then
  # Extract creation date from metadata and convert to FS-YY-MM-DD
  if [ -f "$METADATA_FILE" ]; then
    CREATED=$(grep -o '"created"[[:space:]]*:[[:space:]]*"[^"]*"' "$METADATA_FILE" | sed 's/.*"\([^"]*\)".*/\1/' || true)
    if [ -n "$CREATED" ]; then
      # Parse date: 2025-11-12T12:46:00Z -> FS-25-11-12
      YEAR=$(echo "$CREATED" | cut -d'-' -f1 | cut -c3-4)
      MONTH=$(echo "$CREATED" | cut -d'-' -f2)
      DAY=$(echo "$CREATED" | cut -d'-' -f3 | cut -d'T' -f1)
      EPIC_ID="FS-${YEAR}-${MONTH}-${DAY}"
    fi
  fi
fi

if [ -z "$EPIC_ID" ]; then
  log_info "⚠️  Could not determine Epic ID for $INCREMENT_ID, skipping"
  exit 2
fi

log_debug "Detected Epic ID: $EPIC_ID"

# Find Epic folder (use active project from config, v0.23.0+, Increment 0047)
PROJECT_ID="default"
if [ -f ".specweave/config.json" ]; then
  if command -v jq >/dev/null 2>&1; then
    ACTIVE_PROJECT=$(jq -r '.multiProject.activeProject // .project.name // "default"' ".specweave/config.json" 2>/dev/null)
    if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
      PROJECT_ID="$ACTIVE_PROJECT"
    fi
  fi
fi
log_debug "Using project: $PROJECT_ID (from config)"

# NEW (v0.23.0+): Look in _features folder for FEATURE.md (feature registry)
# The structure is:
#   .specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md (registry)
#   .specweave/docs/internal/specs/{project}/FS-XXX/README.md + US files (implementation)
FEATURES_DIR=".specweave/docs/internal/specs/_features"
EPIC_FOLDER_FEATURES=$(find "$FEATURES_DIR" -type d -name "${EPIC_ID}*" | head -1)

if [ -n "$EPIC_FOLDER_FEATURES" ] && [ -f "$EPIC_FOLDER_FEATURES/FEATURE.md" ]; then
  # Found in features registry
  EPIC_FOLDER="$EPIC_FOLDER_FEATURES"
  log_debug "Found Epic folder in features registry: $EPIC_FOLDER"
else
  # Fallback: Look in project-specific specs folder (legacy structure)
  SPECS_DIR=".specweave/docs/internal/specs/$PROJECT_ID"
  if [ ! -d "$SPECS_DIR" ]; then
    log_debug "⚠️  Specs directory not found: $SPECS_DIR (falling back to default)"
    SPECS_DIR=".specweave/docs/internal/specs/default"
  fi

  EPIC_FOLDER=$(find "$SPECS_DIR" -type d -name "${EPIC_ID}*" | head -1)

  if [ -z "$EPIC_FOLDER" ] || [ ! -f "$EPIC_FOLDER/FEATURE.md" ]; then
    log_info "⚠️  Epic folder not found for $EPIC_ID, skipping"
    log_info "   Run /specweave:sync-docs to create Epic folder first"
    exit 2
  fi
fi

log_debug "Found Epic folder: $EPIC_FOLDER"

# ============================================================================
# CHECK IF GITHUB ISSUE EXISTS
# ============================================================================

# Extract GitHub issue number from FEATURE.md frontmatter
GITHUB_ISSUE=$(grep -A 5 'external_tools:' "$EPIC_FOLDER/FEATURE.md" 2>/dev/null | grep -A 2 'github:' | grep 'id:' | grep -o '[0-9]*' | head -1 || true)

if [ -z "$GITHUB_ISSUE" ]; then
  log_info "⚠️  No GitHub issue linked in FEATURE.md, skipping"
  exit 2
fi

log_debug "Found GitHub issue: #$GITHUB_ISSUE"

# ============================================================================
# GENERATE FRESH ISSUE BODY
# ============================================================================

log_info "🔄 Generating fresh issue body for Epic $EPIC_ID..."

TEMP_BODY=$(mktemp)

if ! npx tsx scripts/generate-epic-issue-body.ts "$EPIC_ID" "$INCREMENT_ID" > "$TEMP_BODY" 2>&1; then
  EXIT_CODE=$?
  log_info "❌ Failed to generate issue body (exit code: $EXIT_CODE)"
  cat "$TEMP_BODY" | head -10 >> "$DEBUG_LOG" 2>/dev/null || true
  rm -f "$TEMP_BODY"
  exit 1
fi

# ============================================================================
# UPDATE GITHUB ISSUE
# ============================================================================

log_info "📤 Updating GitHub issue #$GITHUB_ISSUE..."

if gh issue edit "$GITHUB_ISSUE" --body-file "$TEMP_BODY" 2>&1 | tee -a "$DEBUG_LOG"; then
  log_info "✅ Epic GitHub issue #$GITHUB_ISSUE updated successfully"
  rm -f "$TEMP_BODY"
  exit 0
else
  log_info "❌ Failed to update GitHub issue #$GITHUB_ISSUE"
  rm -f "$TEMP_BODY"
  exit 1
fi
