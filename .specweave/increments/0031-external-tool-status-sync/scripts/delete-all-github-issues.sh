#!/bin/bash
#
# PERMANENTLY DELETE ALL GitHub Issues
#
# This script uses GitHub REST API to DELETE issues (not just close them)
# Requires: GitHub token with 'repo' scope
#

set -e

REPO_OWNER="anton-abyzov"
REPO_NAME="specweave"

echo "🗑️  PERMANENTLY DELETE All GitHub Issues"
echo "=========================================="
echo ""

# Get GitHub token from gh CLI
GITHUB_TOKEN=$(gh auth token)

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GitHub token not found. Run 'gh auth login' first."
  exit 1
fi

echo "🔍 Fetching all issue numbers..."
ISSUES=$(gh issue list --state all --limit 300 --json number --jq '.[].number')
ISSUE_COUNT=$(echo "$ISSUES" | wc -l | tr -d ' ')

echo "   Found $ISSUE_COUNT issues total"
echo ""

if [ "$ISSUE_COUNT" -eq "0" ]; then
  echo "✅ No issues to delete!"
  exit 0
fi

# Confirm deletion
echo "⚠️  WARNING: This will PERMANENTLY DELETE ALL $ISSUE_COUNT issues!"
echo "   This action CANNOT be undone!"
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted by user"
  exit 1
fi

echo ""
echo "🗑️  DELETING all issues..."
echo ""

DELETED_COUNT=0
FAILED_COUNT=0

# Delete each issue using GitHub REST API
for ISSUE_NUM in $ISSUES; do
  echo -n "   Deleting #$ISSUE_NUM... "

  # Use GitHub REST API DELETE endpoint
  # DELETE /repos/{owner}/{repo}/issues/{issue_number}
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$ISSUE_NUM")

  if [ "$HTTP_CODE" = "204" ]; then
    echo "✅ DELETED"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi

  # Rate limit protection
  sleep 0.5
done

echo ""
echo "✅ Deletion complete!"
echo "   Deleted: $DELETED_COUNT issues"
if [ "$FAILED_COUNT" -gt "0" ]; then
  echo "   Failed: $FAILED_COUNT issues"
fi
echo ""

# Verify
REMAINING=$(gh issue list --state all --limit 300 --json number | jq 'length')
echo "📊 Remaining issues: $REMAINING"
echo ""

if [ "$REMAINING" -eq "0" ]; then
  echo "🎉 All issues PERMANENTLY DELETED!"
else
  echo "⚠️  Warning: $REMAINING issues still remain"
fi
