#!/bin/bash
# GitHub Issue Duplicate Cleanup Script
# Closes duplicate FS-* and INC-* issues on GitHub
# Compatible with bash 3.2+ (macOS default)

set -e

REPO="anton-abyzov/specweave"

echo "🔍 Analyzing GitHub issue duplicates..."
echo ""

# Get all FS-* issues
echo "📊 Fetching GitHub issues..."
FS_ISSUES=$(gh issue list --repo "$REPO" --limit 1000 --state all --json number,title,state --jq '.[] | select(.title | test("\\[FS-")) | "\(.number)|\(.state)|\(.title)"' | sort -t'|' -k3)

# Get all INC-* issues
INC_ISSUES=$(gh issue list --repo "$REPO" --limit 1000 --state all --json number,title,state --jq '.[] | select(.title | test("\\[INC-")) | "\(.number)|\(.state)|\(.title)"' | sort -t'|' -k3)

# Get living docs features
LIVING_DOCS=$(ls -1 .specweave/docs/internal/specs/default/ | grep "^FS-")

# Count issues
FS_COUNT=$(echo "$FS_ISSUES" | grep -c . || echo "0")
INC_COUNT=$(echo "$INC_ISSUES" | grep -c . || echo "0")
LIVING_COUNT=$(echo "$LIVING_DOCS" | grep -c . || echo "0")

echo "✅ Found $FS_COUNT FS-* issues on GitHub"
echo "✅ Found $INC_COUNT INC-* issues on GitHub"
echo "✅ Found $LIVING_COUNT FS-* features in living docs"
echo ""

# Function to extract feature ID (e.g., "[FS-25-11-12] Title" -> "FS-25-11-12")
extract_feature_id() {
  echo "$1" | sed -E 's/.*\[([^\]]+)\].*/\1/' | cut -d'-' -f1-4
}

# Normalize feature ID from folder name
normalize_folder() {
  echo "$1" | cut -d'-' -f1-4
}

# Generate cleanup commands
CLEANUP_FILE=".specweave/increments/0031-external-tool-status-sync/reports/CLEANUP-COMMANDS.sh"
REPORT_FILE=".specweave/increments/0031-external-tool-status-sync/reports/DUPLICATE-ANALYSIS.md"

echo "📝 Generating cleanup commands and report..."

# Initialize cleanup script
cat > "$CLEANUP_FILE" << 'EOF'
#!/bin/bash
# Auto-generated cleanup commands for duplicate GitHub issues
# Generated: $(date)
#
# IMPORTANT: Review these commands before running!
# This script will close duplicate issues on GitHub.

set -e

REPO="anton-abyzov/specweave"

echo "🚀 Starting GitHub issue cleanup..."
echo ""
echo "⚠️  This will close duplicate issues!"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi
echo ""

EOF

# Initialize report
cat > "$REPORT_FILE" << EOF
# GitHub Issue Duplicate Analysis Report

**Date**: $(date)

## Summary

- **Living Docs Features**: $LIVING_COUNT
- **GitHub FS-* Issues**: $FS_COUNT
- **GitHub INC-* Issues**: $INC_COUNT
- **Mismatch**: $((FS_COUNT - LIVING_COUNT)) extra issues on GitHub

EOF

# Process FS-* duplicates
echo "🔍 Detecting FS-* duplicates..."
echo ""
echo "## FS-* Duplicate Groups" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

PREV_FEATURE=""
PREV_ISSUE=""
PREV_STATE=""
PREV_TITLE=""
DUPLICATE_COUNT=0
CLOSE_COUNT=0

while IFS='|' read -r number state title; do
  if [ -z "$number" ]; then continue; fi

  feature_id=$(extract_feature_id "$title")

  if [ "$feature_id" = "$PREV_FEATURE" ]; then
    # Duplicate found!
    if [ -z "$DUPLICATE_COUNT" ] || [ "$DUPLICATE_COUNT" -eq 0 ]; then
      echo "  📦 $feature_id" | tee -a "$REPORT_FILE"
      echo "    ✅ KEEP #$PREV_ISSUE ($PREV_STATE)" | tee -a "$REPORT_FILE"
    fi

    echo "    ❌ CLOSE #$number ($state) - Duplicate" | tee -a "$REPORT_FILE"

    # Add to cleanup script
    cat >> "$CLEANUP_FILE" << EOCMD

# Close duplicate: $title
echo "Closing #$number..."
gh issue close $number --repo "\$REPO" --comment "Closing duplicate issue. Keeping #$PREV_ISSUE as canonical issue for $feature_id."

EOCMD

    CLOSE_COUNT=$((CLOSE_COUNT + 1))
    DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
  else
    if [ -n "$PREV_FEATURE" ] && [ "$DUPLICATE_COUNT" -gt 0 ]; then
      echo ""
    fi
    DUPLICATE_COUNT=0
  fi

  PREV_FEATURE="$feature_id"
  PREV_ISSUE="$number"
  PREV_STATE="$state"
  PREV_TITLE="$title"
done <<< "$FS_ISSUES"

echo "" | tee -a "$REPORT_FILE"

# Process INC-* duplicates
echo "🔍 Detecting INC-* duplicates..."
echo ""
echo "## INC-* Duplicate Groups" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

PREV_FEATURE=""
PREV_ISSUE=""
INC_DUPLICATE_COUNT=0

while IFS='|' read -r number state title; do
  if [ -z "$number" ]; then continue; fi

  inc_id=$(extract_feature_id "$title")

  if [ "$inc_id" = "$PREV_FEATURE" ]; then
    # Duplicate found!
    if [ "$INC_DUPLICATE_COUNT" -eq 0 ]; then
      echo "  📦 $inc_id" | tee -a "$REPORT_FILE"
      echo "    ✅ KEEP #$PREV_ISSUE" | tee -a "$REPORT_FILE"
    fi

    echo "    ❌ CLOSE #$number ($state) - Duplicate" | tee -a "$REPORT_FILE"

    # Add to cleanup script
    cat >> "$CLEANUP_FILE" << EOCMD

# Close duplicate increment: $title
echo "Closing #$number..."
gh issue close $number --repo "\$REPO" --comment "Closing duplicate increment issue. Keeping #$PREV_ISSUE as canonical issue."

EOCMD

    CLOSE_COUNT=$((CLOSE_COUNT + 1))
    INC_DUPLICATE_COUNT=$((INC_DUPLICATE_COUNT + 1))
  else
    if [ -n "$PREV_FEATURE" ] && [ "$INC_DUPLICATE_COUNT" -gt 0 ]; then
      echo ""
    fi
    INC_DUPLICATE_COUNT=0
  fi

  PREV_FEATURE="$inc_id"
  PREV_ISSUE="$number"
done <<< "$INC_ISSUES"

echo "" | tee -a "$REPORT_FILE"

# Finalize cleanup script
cat >> "$CLEANUP_FILE" << 'EOF'

echo ""
echo "✅ Cleanup complete!"
echo "📊 Total issues closed: $CLOSE_COUNT"
echo ""
EOF

chmod +x "$CLEANUP_FILE"

# Add summary to report
cat >> "$REPORT_FILE" << EOF

## Cleanup Summary

- **Total duplicate issues to close**: $CLOSE_COUNT
- **Cleanup script**: \`$CLEANUP_FILE\`

## Next Steps

1. Review this report carefully
2. Review the cleanup script: \`cat $CLEANUP_FILE\`
3. Execute cleanup: \`bash $CLEANUP_FILE\`

⚠️ **WARNING**: This will close $CLOSE_COUNT issues on GitHub. Review before running!

EOF

echo "✅ Analysis complete!"
echo ""
echo "📊 Summary:"
echo "  - Living docs features: $LIVING_COUNT"
echo "  - GitHub FS-* issues: $FS_COUNT"
echo "  - Duplicate issues found: $CLOSE_COUNT"
echo ""
echo "📄 Reports generated:"
echo "  - Analysis: $REPORT_FILE"
echo "  - Cleanup script: $CLEANUP_FILE"
echo ""
echo "⚠️  Review reports before running cleanup!"
echo ""
echo "To execute cleanup:"
echo "  bash $CLEANUP_FILE"
echo ""
