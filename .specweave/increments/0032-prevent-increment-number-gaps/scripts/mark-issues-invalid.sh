#!/bin/bash

# Mark incorrectly synced issues as invalid since we can't delete them
set -e

REPO="anton-abyzov/specweave"

echo "📝 Marking incorrectly synced issues as invalid..."
ISSUES=$(gh issue list --repo "$REPO" --state closed --limit 30 --json number -q '.[].number')

if [ -z "$ISSUES" ]; then
    echo "No closed issues found."
    exit 0
fi

TOTAL=$(echo "$ISSUES" | wc -l | tr -d ' ')
echo "Found $TOTAL closed issues to mark as invalid"

UPDATED=0

for ISSUE_NUM in $ISSUES; do
    echo "Updating issue #$ISSUE_NUM..."

    # Update the issue to mark it as invalid/duplicate sync
    if gh issue edit $ISSUE_NUM --repo "$REPO" \
        --title "[INVALID SYNC] Issue #$ISSUE_NUM" \
        --body "This issue was created by an incorrect sync operation and should be ignored.

Original sync error: Individual user story issues were incorrectly created instead of a single epic/feature issue.

Date: 2025-11-14
Status: INVALID - Please ignore this issue

Note: GitHub does not support issue deletion, so this issue has been marked as invalid instead." \
        --add-label "invalid" 2>/dev/null; then
        UPDATED=$((UPDATED + 1))
        echo "✓ Updated issue #$ISSUE_NUM"
    else
        echo "⚠️  Failed to update issue #$ISSUE_NUM"
    fi
done

echo ""
echo "✅ Updated $UPDATED/$TOTAL issues"
echo ""
echo "Note: Since GitHub doesn't support deletion, issues have been marked as INVALID."
echo "They will remain in the repository but are clearly marked as sync errors."