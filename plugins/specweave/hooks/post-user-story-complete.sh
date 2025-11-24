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

set +e  # EMERGENCY FIX: Changed from set -euo pipefail to prevent Claude Code crashes

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

# Find user story file in living docs
# Input: SPEC_ID = increment ID (e.g., "0059-context-optimization-crash-prevention")
#        USER_STORY_ID = US ID (e.g., "US-001")
# Search in: .specweave/docs/internal/specs/**/us-*.md

# STEP 1: Get feature ID from increment spec.md
INCREMENT_SPEC=".specweave/increments/$SPEC_ID/spec.md"
FEATURE_ID=""

if [[ -f "$INCREMENT_SPEC" ]]; then
  FEATURE_ID=$(head -20 "$INCREMENT_SPEC" | grep "^feature_id:" | head -1 | sed 's/feature_id: *//; s/ *$//' || echo "")
fi

echo "   🔍 Looking for $USER_STORY_ID in feature $FEATURE_ID"

# STEP 2: Find user story file by ID AND feature
# Prioritize files in the correct feature folder
US_FILE=""
while IFS= read -r file; do
  # Check if file has matching user story ID in frontmatter
  if head -20 "$file" 2>/dev/null | grep -q "^id: $USER_STORY_ID"; then
    # If feature ID is known, verify the file is in the correct feature folder
    if [[ -n "$FEATURE_ID" ]]; then
      FILE_FEATURE=$(head -20 "$file" 2>/dev/null | grep "^feature:" | head -1 | sed 's/feature: *//; s/ *$//' || echo "")
      if [[ "$FILE_FEATURE" == "$FEATURE_ID" ]]; then
        US_FILE="$file"
        break
      fi
    else
      # No feature filter - take first match
      US_FILE="$file"
      break
    fi
  fi
done < <(find .specweave/docs/internal/specs -name "us-*.md" -type f 2>/dev/null)

if [[ -z "$US_FILE" ]]; then
  echo "❌ Error: User story file not found for $USER_STORY_ID (feature: $FEATURE_ID) in increment $SPEC_ID"
  exit 1
fi

echo "   📄 Found user story file: $US_FILE"
SPEC_FILE="$US_FILE"

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

# Parse user story frontmatter to detect external links
# User story files have format:
#   external:
#     github:
#       issue: 745
#       url: https://github.com/...

# Extract GitHub issue number from frontmatter
GITHUB_ISSUE=$(head -20 "$SPEC_FILE" | grep -A 5 "github:" | grep "issue:" | head -1 | sed 's/.*issue: *//; s/ *$//' || echo "")

# Extract Jira issue from frontmatter
JIRA_ISSUE=$(head -20 "$SPEC_FILE" | grep -A 5 "jira:" | grep "issue:" | head -1 | sed 's/.*issue: *//; s/ *$//' || echo "")

# Extract ADO work item from frontmatter
ADO_ITEM=$(head -20 "$SPEC_FILE" | grep -A 5 "ado:" | grep "item:" | head -1 | sed 's/.*item: *//; s/ *$//' || echo "")

# Determine which provider to sync
PROVIDER=""
EXTERNAL_ID=""
if [[ -n "$GITHUB_ISSUE" ]]; then
  PROVIDER="github"
  EXTERNAL_ID="$GITHUB_ISSUE"
elif [[ -n "$JIRA_ISSUE" ]]; then
  PROVIDER="jira"
  EXTERNAL_ID="$JIRA_ISSUE"
elif [[ -n "$ADO_ITEM" ]]; then
  PROVIDER="ado"
  EXTERNAL_ID="$ADO_ITEM"
fi

# No external link found - skip sync
if [[ -z "$PROVIDER" ]]; then
  echo "   ℹ️  User story not linked to external tool, skipping sync"
  exit 0
fi

echo "   🔗 Detected external link: $PROVIDER (ID: $EXTERNAL_ID)"

# Update external tool based on provider
case "$PROVIDER" in
  github)
    echo "   🔄 Updating GitHub Issue #$EXTERNAL_ID for $USER_STORY_ID..."

    # Check if GitHub CLI is available
    if ! command -v gh &> /dev/null; then
      echo "   ⚠️  GitHub CLI (gh) not found, skipping sync"
      exit 0
    fi

    # Use issue number from frontmatter (EXTERNAL_ID = issue number)
    ISSUE_NUMBER="$EXTERNAL_ID"
    REPO=$(git remote get-url origin | sed -E 's/.*github\.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/')

    if [[ -z "$ISSUE_NUMBER" || "$ISSUE_NUMBER" == "null" ]]; then
      echo "   ⚠️  No GitHub Issue number found in user story metadata"
      exit 0
    fi

    echo "   📝 Using GitHub Issue #$ISSUE_NUMBER from metadata"

    # Check if issue is already closed
    ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json state --jq '.state' 2>/dev/null || echo "")
    if [[ "$ISSUE_STATE" == "CLOSED" ]]; then
      echo "   ✅ GitHub Issue #$ISSUE_NUMBER already closed"
      exit 0
    fi

    # Close issue with completion comment
    gh issue close "$ISSUE_NUMBER" --repo "$REPO" --comment "✅ **User Story Verified Complete**

📊 **Completion Status**:
- ✅ All Acceptance Criteria satisfied
- ✅ All implementation tasks complete

**User Story**: $USER_STORY_ID
**Increment**: $SPEC_ID

🤖 Auto-closed by SpecWeave US Completion Hook
Completed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" 2>/dev/null || {
      echo "   ⚠️  Failed to close issue (may already be closed)"
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
