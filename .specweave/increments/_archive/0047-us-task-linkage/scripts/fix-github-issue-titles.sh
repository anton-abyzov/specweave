#!/usr/bin/env bash
#
# Fix GitHub Issue Titles - Convert [SP-US-XXX] to [FS-047][US-XXX]
#
# This script fixes incorrectly formatted GitHub issue titles for FS-047 User Stories.
# It searches for issues with [SP-US-XXX] pattern and updates them to [FS-047][US-XXX] format.
#
# Usage:
#   bash fix-github-issue-titles.sh [--dry-run]
#
# Examples:
#   bash fix-github-issue-titles.sh --dry-run    # Preview changes
#   bash fix-github-issue-titles.sh              # Execute fixes

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FEATURE_ID="FS-047"
DRY_RUN=false

# Parse arguments
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Fix GitHub Issue Titles: [SP-US-XXX] → [FS-047][US-XXX]${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Step 1: Find all issues with [SP-US-XXX] pattern
echo -e "${BLUE}Step 1: Searching for incorrectly formatted issues...${NC}"

# Search for issues with [SP-US- pattern (open and closed)
ISSUES=$(gh issue list --state all --limit 100 --json number,title,state --jq '.[] | select(.title | startswith("[SP-US-")) | "\(.number)|\(.title)|\(.state)"')

if [[ -z "$ISSUES" ]]; then
  echo -e "${GREEN}✅ No incorrectly formatted issues found!${NC}"
  echo -e "${GREEN}   All issues already use correct [FS-XXX][US-YYY] format.${NC}\n"
  exit 0
fi

# Count issues
ISSUE_COUNT=$(echo "$ISSUES" | wc -l | tr -d ' ')
echo -e "${YELLOW}⚠️  Found ${ISSUE_COUNT} issues with incorrect format:${NC}\n"

# Step 2: Preview changes
echo -e "${BLUE}Step 2: Preview of changes:${NC}\n"

printf "%-8s %-10s %-50s %-50s\n" "Issue #" "State" "Current Title" "New Title"
echo "─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────"

FIXED_COUNT=0

while IFS='|' read -r issue_number current_title state; do
  # Extract US-XXX from [SP-US-XXX] pattern
  if [[ "$current_title" =~ \[SP-US-([0-9]+)\](.*) ]]; then
    us_number="${BASH_REMATCH[1]}"
    rest_of_title="${BASH_REMATCH[2]}"

    # Build new title: [FS-047][US-XXX] ...
    new_title="[${FEATURE_ID}][US-${us_number}]${rest_of_title}"

    # Display change
    printf "%-8s %-10s %-50s %-50s\n" "#$issue_number" "($state)" "${current_title:0:47}..." "${new_title:0:47}..."

    FIXED_COUNT=$((FIXED_COUNT + 1))

    # Execute fix (if not dry run)
    if [[ "$DRY_RUN" == false ]]; then
      echo -e "${BLUE}   Updating issue #${issue_number}...${NC}"
      gh issue edit "$issue_number" --title "$new_title"
      echo -e "${GREEN}   ✅ Updated #${issue_number}${NC}"
    fi
  else
    echo -e "${RED}   ❌ Skipped #${issue_number}: Title doesn't match [SP-US-XXX] pattern${NC}"
  fi
done <<< "$ISSUES"

echo ""
echo "─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────"

# Step 3: Summary
echo -e "\n${BLUE}Step 3: Summary${NC}\n"

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}📊 DRY RUN SUMMARY:${NC}"
  echo -e "   • Issues found: ${ISSUE_COUNT}"
  echo -e "   • Would fix: ${FIXED_COUNT}"
  echo -e "\n${GREEN}To execute changes, run without --dry-run flag:${NC}"
  echo -e "   bash fix-github-issue-titles.sh\n"
else
  echo -e "${GREEN}✅ EXECUTION COMPLETE${NC}"
  echo -e "   • Issues found: ${ISSUE_COUNT}"
  echo -e "   • Successfully fixed: ${FIXED_COUNT}"
  echo -e "\n${GREEN}All GitHub issue titles have been corrected!${NC}\n"
fi

# Step 4: Verification
if [[ "$DRY_RUN" == false ]]; then
  echo -e "${BLUE}Step 4: Verification${NC}\n"
  echo -e "${BLUE}Checking for remaining incorrectly formatted issues...${NC}"

  REMAINING=$(gh issue list --state all --limit 100 --json number,title --jq '.[] | select(.title | startswith("[SP-US-")) | .number' | wc -l | tr -d ' ')

  if [[ "$REMAINING" == "0" ]]; then
    echo -e "${GREEN}✅ No incorrectly formatted issues remain!${NC}\n"
  else
    echo -e "${YELLOW}⚠️  Warning: ${REMAINING} issues still have incorrect format${NC}"
    echo -e "${YELLOW}   Run this script again or investigate manually.${NC}\n"
  fi
fi
