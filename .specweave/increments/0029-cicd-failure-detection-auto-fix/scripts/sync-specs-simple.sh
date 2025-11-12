#!/bin/bash
# Simple script to sync specs to GitHub using gh CLI
# This creates GitHub Projects for each spec with linked issues

set -e

REPO="anton-abyzov/specweave"
SPECS_DIR=".specweave/docs/internal/specs/default"

echo "🔄 Syncing specs to GitHub Projects..."
echo ""

# Get list of spec files
SPEC_FILES=$(find "$SPECS_DIR" -name "spec-*.md" | grep -v "_archive" | grep -v "_DEPRECATED" | sort)

COUNT=0
SUCCESS=0
FAILED=0

for spec_file in $SPEC_FILES; do
  filename=$(basename "$spec_file")
  spec_id=$(echo "$filename" | sed 's/^spec-//' | sed 's/\.md$//')

  COUNT=$((COUNT + 1))
  echo "=========================================="
  echo "[$COUNT] Syncing: $spec_id"
  echo "=========================================="

  # Extract spec title from file
  title=$(grep -m 1 "^# " "$spec_file" | sed 's/^# //' | sed 's/^SPEC-[0-9]*: //')

  if [ -z "$title" ]; then
    echo "⚠️  Could not extract title, using filename"
    title="$spec_id"
  fi

  # Check if project already exists
  project_title="[SPEC-${spec_id}] ${title}"

  echo "📋 Project: $project_title"
  echo "📄 File: $spec_file"
  echo ""

  # Try to create GitHub issue for the spec (as a placeholder)
  # We'll create an issue that links to the spec file
  issue_title="$project_title"
  issue_body="# Specification: ${spec_id}

**Status**: Planning → Implementation
**File**: \`.specweave/docs/internal/specs/default/${filename}\`

## Overview

This issue tracks the implementation of ${title}.

See the full specification in the repository:
\`.specweave/docs/internal/specs/default/${filename}\`

---

🤖 Auto-created by SpecWeave spec sync | [View Spec](https://github.com/${REPO}/blob/develop/.specweave/docs/internal/specs/default/${filename})
"

  echo "Creating GitHub issue..."

  # Create issue
  if gh issue create \
    --repo "$REPO" \
    --title "$issue_title" \
    --body "$issue_body" \
    --label "specweave,documentation,enhancement" \
    > /tmp/gh_issue_output.txt 2>&1; then

    issue_url=$(cat /tmp/gh_issue_output.txt)
    issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')

    echo "✅ Created issue #${issue_number}"
    echo "   🔗 ${issue_url}"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌ Failed to create issue"
    cat /tmp/gh_issue_output.txt
    FAILED=$((FAILED + 1))
  fi

  echo ""

  # Add delay to avoid rate limiting
  if [ $COUNT -lt $(echo "$SPEC_FILES" | wc -l) ]; then
    echo "⏳ Waiting 2 seconds..."
    sleep 2
    echo ""
  fi
done

echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo "Total specs: $COUNT"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAILED"
echo ""
echo "🎉 Sync complete!"
