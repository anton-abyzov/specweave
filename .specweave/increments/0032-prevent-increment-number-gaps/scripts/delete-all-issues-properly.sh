#!/bin/bash

# Delete ALL issues using gh issue delete command
set -e

REPO="anton-abyzov/specweave"

echo "🔍 Fetching all issues (open and closed)..."
ALL_ISSUES=$(gh issue list --repo "$REPO" --state all --limit 1000 --json number -q '.[].number' | sort -n)

if [ -z "$ALL_ISSUES" ]; then
    echo "No issues found in the repository."
    exit 0
fi

TOTAL=$(echo "$ALL_ISSUES" | wc -l | tr -d ' ')
echo "Found $TOTAL issues to delete"
echo ""

echo "⚠️  WARNING: This will PERMANENTLY DELETE all $TOTAL issues!"
echo "Issue numbers to delete: $(echo $ALL_ISSUES | tr '\n' ' ')"
echo ""

DELETED=0
FAILED=0

for ISSUE_NUM in $ALL_ISSUES; do
    echo -n "Deleting issue #$ISSUE_NUM... "

    if gh issue delete "$ISSUE_NUM" --repo "$REPO" --yes 2>/dev/null; then
        echo "✓ Deleted"
        DELETED=$((DELETED + 1))
    else
        echo "✗ Failed"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "----------------------------------------"
echo "✅ Deletion complete!"
echo "  Successfully deleted: $DELETED issues"
echo "  Failed: $FAILED issues"
echo "  Total processed: $TOTAL issues"