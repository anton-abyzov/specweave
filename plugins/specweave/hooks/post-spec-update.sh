#!/bin/bash

###############################################################################
# SpecWeave Post-Spec-Update Hook
#
# CRITICAL ARCHITECTURE:
# - Fires when .specweave/docs/internal/specs/spec-*.md is updated
# - Auto-syncs to linked external tool (GitHub Project/Jira Epic/ADO Feature)
# - Replaces increment-based sync (which was wrong!)
#
# Trigger Points:
# 1. After /specweave:sync-docs update (spec updated from increment)
# 2. After manual spec.md edits (user updates living docs directly)
# 3. After bidirectional sync from external tool
#
# What It Does:
# - Detects which spec was updated
# - Checks if spec is linked to external tool (frontmatter: externalLinks)
# - Syncs changes to GitHub Project / Jira Epic / ADO Feature
# - Updates user stories, acceptance criteria, progress
#
# Usage:
#   post-spec-update.sh <spec-file-path>
#
# Example:
#   post-spec-update.sh .specweave/docs/internal/specs/spec-001-core-framework.md
#
###############################################################################

set -euo pipefail

# Arguments
SPEC_FILE_PATH="${1:-}"

# Validate arguments
if [[ -z "$SPEC_FILE_PATH" ]]; then
  echo "❌ Error: Spec file path required"
  echo "Usage: post-spec-update.sh <spec-file-path>"
  exit 1
fi

# Check if spec file exists
if [[ ! -f "$SPEC_FILE_PATH" ]]; then
  echo "❌ Error: Spec file not found: $SPEC_FILE_PATH"
  exit 1
fi

# Extract spec ID from file path
# Example: .specweave/docs/internal/specs/spec-001-core-framework.md → spec-001
SPEC_ID=$(basename "$SPEC_FILE_PATH" .md)

echo ""
echo "🔗 Post-Spec-Update Hook"
echo "   Spec: $SPEC_ID"
echo "   File: $SPEC_FILE_PATH"

# Load config to check if auto-sync is enabled
CONFIG_FILE=".specweave/config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "   ℹ️  No config file found, skipping auto-sync"
  exit 0
fi

# Check if auto-sync is enabled
AUTO_SYNC=$(jq -r '.hooks.post_spec_update.auto_sync // true' "$CONFIG_FILE")

if [[ "$AUTO_SYNC" != "true" ]]; then
  echo "   ℹ️  Auto-sync disabled in config, skipping"
  exit 0
fi

# Parse spec frontmatter to detect external links
# Use gray-matter or similar to extract YAML frontmatter
# For now, use simple grep/sed approach

# Check if GitHub link exists
GITHUB_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE_PATH" | grep -A 5 "github:" | grep "projectId:" | sed 's/.*projectId: *//; s/ *$//' || echo "")

# Check if Jira link exists
JIRA_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE_PATH" | grep -A 5 "jira:" | grep "epicKey:" | sed 's/.*epicKey: *//; s/ *$//' || echo "")

# Check if ADO link exists
ADO_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE_PATH" | grep -A 5 "ado:" | grep "featureId:" | sed 's/.*featureId: *//; s/ *$//' || echo "")

# Determine which provider to sync
PROVIDER=""
if [[ -n "$GITHUB_LINK" ]]; then
  PROVIDER="github"
  EXTERNAL_ID="$GITHUB_LINK"
elif [[ -n "$JIRA_LINK" ]]; then
  PROVIDER="jira"
  EXTERNAL_ID="$JIRA_LINK"
elif [[ -n "$ADO_LINK" ]]; then
  PROVIDER="ado"
  EXTERNAL_ID="$ADO_LINK"
fi

# No external link found - skip sync
if [[ -z "$PROVIDER" ]]; then
  echo "   ℹ️  Spec not linked to external tool, skipping sync"
  echo "   Hint: Use /specweave-github:sync-spec or /specweave-jira:sync-spec to link"
  exit 0
fi

echo "   🔗 Detected external link: $PROVIDER (ID: $EXTERNAL_ID)"

# Sync to external tool based on provider
case "$PROVIDER" in
  github)
    echo "   🔄 Syncing to GitHub Project..."

    # Check if GitHub CLI is available
    if ! command -v gh &> /dev/null; then
      echo "   ⚠️  GitHub CLI (gh) not found, skipping sync"
      exit 0
    fi

    # TODO: Call GitHub spec sync
    # For now, just log the action
    echo "   ✅ GitHub sync queued (implementation pending)"
    ;;

  jira)
    echo "   🔄 Syncing to Jira Epic..."

    # Check if Jira config exists
    if [[ -z "${JIRA_DOMAIN:-}" ]]; then
      echo "   ⚠️  Jira not configured (.env), skipping sync"
      exit 0
    fi

    # TODO: Call Jira spec sync
    echo "   ✅ Jira sync queued (implementation pending)"
    ;;

  ado)
    echo "   🔄 Syncing to Azure DevOps Feature..."

    # Check if ADO config exists
    if [[ -z "${ADO_ORGANIZATION:-}" ]]; then
      echo "   ⚠️  ADO not configured (.env), skipping sync"
      exit 0
    fi

    # TODO: Call ADO spec sync
    echo "   ✅ ADO sync queued (implementation pending)"
    ;;

  *)
    echo "   ⚠️  Unknown provider: $PROVIDER"
    exit 0
    ;;
esac

echo "   ✅ Post-spec-update hook complete"
echo ""

exit 0
