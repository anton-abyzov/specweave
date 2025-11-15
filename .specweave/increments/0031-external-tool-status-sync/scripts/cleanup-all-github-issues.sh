#!/bin/bash
#
# Cleanup ALL GitHub issues - Fresh start for duplicate detection implementation
#
# This script closes ALL existing GitHub issues to clean up duplicates
# and prepare for the new duplicate detection system.
#

set -e

echo "🗑️  GitHub Issues Cleanup - Removing ALL existing issues"
echo "=========================================================="
echo ""

# Get all issue numbers (both open and closed)
echo "📋 Fetching all issue numbers..."
ISSUES=$(gh issue list --state all --limit 300 --json number --jq '.[].number')

ISSUE_COUNT=$(echo "$ISSUES" | wc -l | tr -d ' ')

echo "   Found $ISSUE_COUNT issues total"
echo ""

if [ "$ISSUE_COUNT" -eq "0" ]; then
  echo "✅ No issues to clean up!"
  exit 0
fi

# Confirm deletion
echo "⚠️  WARNING: This will close ALL $ISSUE_COUNT issues!"
echo "   Reason: Cleaning up duplicates before fresh sync with new detection"
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted by user"
  exit 1
fi

echo ""
echo "🗑️  Closing all issues..."
echo ""

CLOSED_COUNT=0
FAILED_COUNT=0

# Close each issue
for ISSUE_NUM in $ISSUES; do
  echo -n "   Closing #$ISSUE_NUM... "

  # Close the issue with a comment
  if gh issue close "$ISSUE_NUM" --comment "🧹 **Cleanup**: This issue was closed as part of a complete repository cleanup to eliminate duplicates created before the duplicate detection system was implemented.

All issues will be recreated fresh with the new Epic sync system that includes:
- ✅ Duplicate detection
- ✅ Self-healing metadata
- ✅ Post-sync validation

See: Increment 0031 - External Tool Status Synchronization

🤖 Auto-closed by SpecWeave Cleanup Script" 2>/dev/null; then
    echo "✅"
    CLOSED_COUNT=$((CLOSED_COUNT + 1))
  else
    echo "❌ FAILED"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi

  # Rate limit protection (avoid hitting GitHub API limits)
  sleep 0.5
done

echo ""
echo "✅ Cleanup complete!"
echo "   Closed: $CLOSED_COUNT issues"
if [ "$FAILED_COUNT" -gt "0" ]; then
  echo "   Failed: $FAILED_COUNT issues"
fi
echo ""
echo "🔄 Next step: Run Epic sync to recreate issues with new system"
echo "   /specweave-github:sync-epic FS-031"
