#!/bin/bash

# SpecWeave - Cleanup Duplicate GitHub Issues
#
# CRITICAL INCIDENT: 2025-11-20
# Duplicate GitHub issues were created for the same User Story IDs due to:
# 1. Race conditions in sync logic
# 2. GitHub search eventual consistency
# 3. --limit 1 bug in searchIssueByTitle
#
# This script:
# 1. Finds all duplicate User Story issues
# 2. Keeps the OLDEST issue for each User Story ID
# 3. Closes all duplicate issues with proper comments
# 4. Links duplicates back to the original
#
# @see .specweave/increments/0047-us-task-linkage/reports/DUPLICATE-GITHUB-ISSUES-ROOT-CAUSE.md

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Default repo (can be overridden via --repo flag)
REPO=""

# Dry run mode (default: false)
DRY_RUN=false

# Patterns to search (can be overridden via --patterns flag)
PATTERNS=(
  "[SP-US-006]"
  "[SP-US-007]"
  "[SP-US-008]"
  "[SP-US-009]"
  "[SP-FS-023-specweave]"
)

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

print_usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Cleanup duplicate GitHub issues for SpecWeave User Stories.

OPTIONS:
  --repo REPO        GitHub repository (format: owner/repo)
                     If not specified, uses current repo from git remote
  --patterns "P1,P2" Comma-separated list of title patterns to search
                     Default: [SP-US-006],[SP-US-007],[SP-US-008],[SP-US-009],[SP-FS-023-specweave]
  --dry-run          Show what would be done without actually closing issues
  --help             Show this help message

EXAMPLES:
  # Cleanup using default patterns:
  $0

  # Cleanup specific patterns:
  $0 --patterns "[FS-047][US-001],[FS-047][US-002]"

  # Dry run to see what would happen:
  $0 --dry-run

  # Cleanup in specific repo:
  $0 --repo anton-abyzov/specweave

EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --patterns)
      IFS=',' read -ra PATTERNS <<< "$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      print_usage
      ;;
    *)
      echo "❌ Unknown option: $1"
      print_usage
      ;;
  esac
done

# ============================================================================
# VALIDATION
# ============================================================================

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "   Install: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLI is not authenticated"
  echo "   Run: gh auth login"
  exit 1
fi

# Detect repo if not specified
if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)
  if [ -z "$REPO" ]; then
    echo "❌ Could not detect GitHub repository"
    echo "   Either run this script from a git repository or use --repo flag"
    exit 1
  fi
  echo "📦 Using repository: $REPO"
fi

# ============================================================================
# DRY RUN BANNER
# ============================================================================

if [ "$DRY_RUN" = true ]; then
  cat <<EOF

╔════════════════════════════════════════════════════════════════╗
║                       🔍 DRY RUN MODE                          ║
║                                                                ║
║  No issues will be closed. This is a preview of what would    ║
║  happen when running in production mode.                       ║
╚════════════════════════════════════════════════════════════════╝

EOF
fi

# ============================================================================
# MAIN LOGIC
# ============================================================================

echo "🧹 SpecWeave Duplicate Issue Cleanup"
echo "   Repository: $REPO"
echo "   Patterns: ${#PATTERNS[@]}"
echo ""

total_duplicates=0
total_closed=0

for pattern in "${PATTERNS[@]}"; do
  echo "🔍 Searching for duplicates: $pattern"

  # List all issues matching pattern (both open and closed)
  issues=$(gh issue list \
    --repo "$REPO" \
    --search "$pattern in:title" \
    --state all \
    --json number,title,createdAt,state \
    --limit 100)

  # Count total issues
  count=$(echo "$issues" | jq 'length')

  if [ "$count" -eq 0 ]; then
    echo "   ✅ No issues found for $pattern"
    echo ""
    continue
  fi

  if [ "$count" -eq 1 ]; then
    issue_num=$(echo "$issues" | jq -r '.[0].number')
    echo "   ✅ Single issue found: #$issue_num (no duplicates)"
    echo ""
    continue
  fi

  # Duplicates found!
  echo "   ⚠️  Found $count issues for $pattern ($(($count - 1)) duplicate(s))"
  ((total_duplicates += $count - 1))

  # Sort by creation date, keep oldest (first)
  oldest=$(echo "$issues" | jq -r 'sort_by(.createdAt) | .[0]')
  oldest_num=$(echo "$oldest" | jq -r '.number')
  oldest_date=$(echo "$oldest" | jq -r '.createdAt')
  oldest_state=$(echo "$oldest" | jq -r '.state')

  echo "   ✅ Keeping issue #$oldest_num (oldest, created: $oldest_date, state: $oldest_state)"

  # Get duplicates (all except first)
  duplicates=$(echo "$issues" | jq -r 'sort_by(.createdAt) | .[1:] | .[] | .number')

  # Close duplicates
  for dup in $duplicates; do
    dup_info=$(echo "$issues" | jq -r ".[] | select(.number == $dup)")
    dup_date=$(echo "$dup_info" | jq -r '.createdAt')
    dup_state=$(echo "$dup_info" | jq -r '.state')

    if [ "$dup_state" = "CLOSED" ]; then
      echo "   ⏭️  Issue #$dup already closed (created: $dup_date)"
      continue
    fi

    if [ "$DRY_RUN" = true ]; then
      echo "   🔍 [DRY RUN] Would close duplicate #$dup (created: $dup_date)"
    else
      echo "   🗑️  Closing duplicate #$dup (created: $dup_date)..."

      # Create comment explaining closure
      comment=$(cat <<'EOF_COMMENT'
Duplicate of #OLDEST_NUM

This issue was automatically closed by SpecWeave's duplicate cleanup script.

**Why was this closed?**
Multiple issues were created for the same User Story due to a race condition in the sync logic. This has been fixed in increment 0047.

**Which issue should I use?**
Use issue #OLDEST_NUM (the oldest issue for this User Story).

**Root Cause:**
- GitHub search eventual consistency (2-5 second lag)
- `--limit 1` bug in searchIssueByTitle
- Missing DuplicateDetector integration

**Fix:** See [`DUPLICATE-GITHUB-ISSUES-ROOT-CAUSE.md`](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0047-us-task-linkage/reports/DUPLICATE-GITHUB-ISSUES-ROOT-CAUSE.md)

🤖 Auto-closed by SpecWeave Duplicate Cleanup Script
EOF_COMMENT
)

      # Replace placeholder with actual issue number
      comment="${comment//OLDEST_NUM/$oldest_num}"

      # Post comment
      gh issue comment "$dup" \
        --repo "$REPO" \
        --body "$comment" \
        2>&1 | grep -v "^$" || true

      # Close the issue
      gh issue close "$dup" \
        --repo "$REPO" \
        2>&1 | grep -v "^$" || true

      echo "      ✅ Closed #$dup"
      ((total_closed++))
    fi
  done

  echo ""
done

# ============================================================================
# SUMMARY
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY RUN SUMMARY"
  echo ""
  echo "   Total duplicates found: $total_duplicates"
  echo "   Would be closed: $total_duplicates"
  echo ""
  echo "   Re-run without --dry-run to actually close duplicates."
else
  echo "✅ CLEANUP COMPLETE!"
  echo ""
  echo "   Total duplicates found: $total_duplicates"
  echo "   Successfully closed: $total_closed"
  echo ""
  if [ $total_closed -lt $total_duplicates ]; then
    echo "   ⚠️  Some duplicates were already closed or failed to close"
  fi
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
