#!/bin/bash

# Pre-Commit Hook: Enforce ADR-0061 (No Increment-to-Increment References)
#
# CRITICAL: User story files MUST NOT reference increments!
#
# Prevents:
# - frontmatter field: increments: [0050-...]
# - This creates circular dependencies and breaks GitHub sync hooks
#
# See: ADR-0061, CLAUDE.md Section 10a

set -e

VIOLATIONS=0

echo "🔍 Checking for forbidden increment references in user stories..."

# Get all staged user story files
staged_us_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.specweave/docs/internal/specs/.*/us-.*\.md$" || true)

if [ -z "$staged_us_files" ]; then
  echo "✅ No user story files staged, skipping check"
  exit 0
fi

# Check each staged user story file
for us_file in $staged_us_files; do
  if [ ! -f "$us_file" ]; then
    continue
  fi

  # Extract frontmatter (between first --- and second ---)
  frontmatter=$(awk '/^---$/{flag=!flag; next} flag' "$us_file" || true)

  # Check for 'increments:' field in frontmatter
  if echo "$frontmatter" | grep -q "^increments:"; then
    echo "❌ VIOLATION: $us_file"
    echo "   Frontmatter contains 'increments:' field"
    echo "   ADR-0061: User stories MUST NOT reference increments!"
    echo ""
    echo "   ❌ WRONG:"
    echo "   ---"
    echo "   increments: [0050-external-tool-import]"
    echo "   ---"
    echo ""
    echo "   ✅ CORRECT:"
    echo "   ---"
    echo "   id: US-001"
    echo "   feature: FS-048"
    echo "   ---"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ COMMIT BLOCKED: $VIOLATIONS violation(s) found"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Fix: Remove 'increments:' field from user story frontmatter"
  echo "See: .specweave/docs/internal/architecture/adr/0061-no-increment-to-increment-references.md"
  echo ""
  exit 1
fi

echo "✅ No increment reference violations found"
exit 0
