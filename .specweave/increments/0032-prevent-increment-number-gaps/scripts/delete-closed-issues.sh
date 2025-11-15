#!/bin/bash

# Script to delete closed GitHub issues
# WARNING: This action is irreversible!

set -e

REPO="anton-abyzov/specweave"
CLOSED_ISSUES=$(gh issue list --repo "$REPO" --state closed --limit 200 --json number -q '.[].number')

if [ -z "$CLOSED_ISSUES" ]; then
    echo "No closed issues found."
    exit 0
fi

# Count total issues
TOTAL=$(echo "$CLOSED_ISSUES" | wc -l | tr -d ' ')
echo "Found $TOTAL closed issues to delete"

# Confirm before deletion
echo "⚠️  WARNING: This will permanently delete all $TOTAL closed issues!"
echo "Issues to be deleted: $CLOSED_ISSUES"
read -p "Are you absolutely sure? Type 'DELETE' to confirm: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "Deletion cancelled."
    exit 1
fi

# Delete each issue
DELETED=0
for ISSUE_NUM in $CLOSED_ISSUES; do
    echo "Deleting issue #$ISSUE_NUM..."
    if gh api -X DELETE "/repos/$REPO/issues/$ISSUE_NUM" 2>/dev/null; then
        DELETED=$((DELETED + 1))
        echo "✓ Deleted issue #$ISSUE_NUM ($DELETED/$TOTAL)"
    else
        echo "⚠️  Failed to delete issue #$ISSUE_NUM (might not have permissions or already deleted)"
    fi
done

echo ""
echo "✅ Deletion complete: $DELETED/$TOTAL issues deleted"