#!/bin/bash

# Delete ALL issues from the repository using gh CLI
set -e

REPO="anton-abyzov/specweave"

echo "🔍 Fetching all issues..."
ISSUES=$(gh issue list --repo "$REPO" --state all --limit 1000 --json number -q '.[].number')

if [ -z "$ISSUES" ]; then
    echo "No issues found in the repository."
    exit 0
fi

TOTAL=$(echo "$ISSUES" | wc -l | tr -d ' ')
echo "Found $TOTAL issues to delete"

echo "⚠️  WARNING: Attempting to delete ALL $TOTAL issues!"
echo ""
echo "Deleting issues..."

DELETED=0
FAILED=0

for ISSUE_NUM in $ISSUES; do
    echo -n "Deleting issue #$ISSUE_NUM... "

    # GitHub doesn't allow issue deletion via API, but let's try different approaches
    # First, try the DELETE endpoint (even though it typically doesn't work)
    if gh api -X DELETE "/repos/$REPO/issues/$ISSUE_NUM" 2>/dev/null; then
        echo "✓ Deleted"
        DELETED=$((DELETED + 1))
    else
        # If DELETE doesn't work, we can't actually delete the issue
        # The only option is to close it if it's open
        STATE=$(gh issue view $ISSUE_NUM --repo "$REPO" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")
        if [ "$STATE" = "OPEN" ]; then
            if gh issue close $ISSUE_NUM --repo "$REPO" 2>/dev/null; then
                echo "✓ Closed (deletion not supported)"
            else
                echo "✗ Failed"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "✗ Cannot delete (GitHub doesn't support issue deletion)"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "----------------------------------------"
echo "Summary:"
echo "  Deleted: $DELETED"
echo "  Failed/Not Supported: $FAILED"
echo "  Total processed: $TOTAL"
echo ""
echo "Note: GitHub API doesn't support issue deletion."
echo "Issues can only be closed, not permanently deleted."