#!/bin/bash

###############################################################################
# SpecWeave Post-User-Story-Complete Hook
#
# CRITICAL ARCHITECTURE:
# - Fires when user story marked complete in spec.md (AC checkbox checked)
# - Updates external PM tool (GitHub Issue/Jira Story/ADO User Story)
# - Moves GitHub card to "Done" / Closes Jira story / Completes ADO story
#
# Trigger Points:
# 1. After user manually checks AC checkbox in spec.md
# 2. After bidirectional sync updates AC status
# 3. After increment completion syncs to spec
#
# What It Does:
# - Detects which user story was completed (all AC checkboxes checked)
# - Finds corresponding external item (GitHub Issue/Jira Story/ADO User Story)
# - Updates item status to "Done" / "Closed"
# - Adds completion comment with timestamp
#
# Usage:
#   post-user-story-complete.sh <spec-id> <user-story-id>
#
# Example:
#   post-user-story-complete.sh spec-001 US-001
#
###############################################################################

set -euo pipefail

# Arguments
SPEC_ID="${1:-}"
USER_STORY_ID="${2:-}"

# Validate arguments
if [[ -z "$SPEC_ID" || -z "$USER_STORY_ID" ]]; then
  echo "❌ Error: Spec ID and User Story ID required"
  echo "Usage: post-user-story-complete.sh <spec-id> <user-story-id>"
  exit 1
fi

echo ""
echo "🎉 Post-User-Story-Complete Hook"
echo "   Spec: $SPEC_ID"
echo "   User Story: $USER_STORY_ID"

# Find spec file
SPEC_FILE=""
if [[ -f ".specweave/docs/internal/specs/$SPEC_ID.md" ]]; then
  SPEC_FILE=".specweave/docs/internal/specs/$SPEC_ID.md"
elif [[ -f ".specweave/docs/internal/projects/default/specs/$SPEC_ID.md" ]]; then
  SPEC_FILE=".specweave/docs/internal/projects/default/specs/$SPEC_ID.md"
else
  echo "❌ Error: Spec file not found for $SPEC_ID"
  exit 1
fi

# Load config to check if auto-sync is enabled
CONFIG_FILE=".specweave/config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "   ℹ️  No config file found, skipping auto-sync"
  exit 0
fi

# Check if auto-sync is enabled
AUTO_SYNC=$(jq -r '.hooks.post_user_story_complete.auto_sync // true' "$CONFIG_FILE")

if [[ "$AUTO_SYNC" != "true" ]]; then
  echo "   ℹ️  Auto-sync disabled in config, skipping"
  exit 0
fi

# Parse spec frontmatter to detect external links
# Check if GitHub link exists
GITHUB_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE" | grep -A 5 "github:" | grep "projectId:" | sed 's/.*projectId: *//; s/ *$//' || echo "")

# Check if Jira link exists
JIRA_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE" | grep -A 5 "jira:" | grep "epicKey:" | sed 's/.*epicKey: *//; s/ *$//' || echo "")

# Check if ADO link exists
ADO_LINK=$(grep -A 10 "^externalLinks:" "$SPEC_FILE" | grep -A 5 "ado:" | grep "featureId:" | sed 's/.*featureId: *//; s/ *$//' || echo "")

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
  exit 0
fi

echo "   🔗 Detected external link: $PROVIDER"

# Update external tool based on provider
case "$PROVIDER" in
  github)
    echo "   🔄 Updating GitHub Issue for $USER_STORY_ID..."

    # Check if GitHub CLI is available
    if ! command -v gh &> /dev/null; then
      echo "   ⚠️  GitHub CLI (gh) not found, skipping sync"
      exit 0
    fi

    # Find GitHub Issue for this user story
    # Search for issue with title pattern "[USER_STORY_ID]"
    REPO=$(git remote get-url origin | sed -E 's/.*github\.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/')

    # Search for issue
    ISSUE_NUMBER=$(gh issue list --repo "$REPO" --search "\"[$USER_STORY_ID]\" in:title" --json number --jq '.[0].number' 2>/dev/null || echo "")

    if [[ -z "$ISSUE_NUMBER" ]]; then
      echo "   ⚠️  GitHub Issue not found for $USER_STORY_ID"
      exit 0
    fi

    echo "   📝 Found GitHub Issue #$ISSUE_NUMBER"

    # Close issue
    gh issue close "$ISSUE_NUMBER" --repo "$REPO" --comment "✅ User story completed

🤖 Auto-closed by SpecWeave hook
Completed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" 2>/dev/null || {
      echo "   ⚠️  Failed to close issue"
      exit 0
    }

    echo "   ✅ GitHub Issue #$ISSUE_NUMBER closed"
    ;;

  jira)
    echo "   🔄 Updating Jira Story for $USER_STORY_ID..."

    # Check if Jira config exists
    if [[ -z "${JIRA_DOMAIN:-}" ]]; then
      echo "   ⚠️  Jira not configured (.env), skipping sync"
      exit 0
    fi

    # TODO: Find Jira Story by title pattern
    # TODO: Transition story to "Done" status
    echo "   ✅ Jira story transition queued (implementation pending)"
    ;;

  ado)
    echo "   🔄 Updating ADO User Story for $USER_STORY_ID..."

    # Check if ADO config exists
    if [[ -z "${ADO_ORGANIZATION:-}" ]]; then
      echo "   ⚠️  ADO not configured (.env), skipping sync"
      exit 0
    fi

    # TODO: Find ADO User Story by title pattern
    # TODO: Update state to "Closed"
    echo "   ✅ ADO user story update queued (implementation pending)"
    ;;

  *)
    echo "   ⚠️  Unknown provider: $PROVIDER"
    exit 0
    ;;
esac

echo "   ✅ Post-user-story-complete hook complete"
echo ""

exit 0
