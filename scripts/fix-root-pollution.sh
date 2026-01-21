#!/bin/bash
#
# Auto-fix script for root folder pollution
# Moves violating files to appropriate increment folders
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Allowed root markdown files (standard project docs)
ALLOWED_FILES=(
  "README.md"
  "CLAUDE.md"
  "AGENTS.md"
  "CHANGELOG.md"
  "LICENSE.md"
  "CODE_OF_CONDUCT.md"
  "SECURITY.md"
  "IMPLEMENTATION-SUMMARY.md"
  "IMPLEMENTATION-COMPLETE.md"
)

echo -e "${BLUE}🔍 Scanning for root pollution...${NC}"

# Get staged files in root
STAGED_ROOT_FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E '^[^/]*\.(md|log)$' || true)

if [ -z "$STAGED_ROOT_FILES" ]; then
  echo -e "${GREEN}✅ No root pollution detected${NC}"
  exit 0
fi

VIOLATIONS=()

for file in $STAGED_ROOT_FILES; do
  # Check if file is in allowed list
  is_allowed=0
  for allowed in "${ALLOWED_FILES[@]}"; do
    if [ "$file" = "$allowed" ]; then
      is_allowed=1
      break
    fi
  done

  if [ $is_allowed -eq 0 ]; then
    VIOLATIONS+=("$file")
  fi
done

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ No root pollution detected${NC}"
  exit 0
fi

echo -e "${YELLOW}⚠️  Found ${#VIOLATIONS[@]} polluting file(s):${NC}"
for file in "${VIOLATIONS[@]}"; do
  echo -e "  - $file"
done
echo ""

# Determine target directory
# First, check if there's an active increment
ACTIVE_INCREMENT=$(ls -1 .specweave/increments/ 2>/dev/null | grep "^[0-9]" | sort -n | tail -1 || echo "")

if [ -n "$ACTIVE_INCREMENT" ]; then
  TARGET_DIR=".specweave/increments/$ACTIVE_INCREMENT/reports"
  echo -e "${BLUE}📁 Detected active increment: $ACTIVE_INCREMENT${NC}"

  # Create reports directory if it doesn't exist
  mkdir -p "$TARGET_DIR"
else
  # 🚨 CRITICAL FIX (v1.0.104): If no active increment exists, EXIT with clear instructions
  # NEVER create adhoc increments automatically - user must create them explicitly
  echo -e "${RED}❌ ERROR: No active increment found!${NC}"
  echo -e "${YELLOW}⚠️  Root pollution files cannot be automatically moved without an active increment.${NC}"
  echo ""
  echo -e "${BLUE}Please create an increment first, then re-run this script:${NC}"
  echo -e "  ${GREEN}1.${NC} Create a new increment:  ${BLUE}specweave increment \"your-feature-name\"${NC}"
  echo -e "  ${GREEN}2.${NC} Or use an existing one: ${BLUE}specweave list${NC}"
  echo -e "  ${GREEN}3.${NC} Then run this script:    ${BLUE}bash scripts/fix-root-pollution.sh${NC}"
  echo ""
  echo -e "${YELLOW}💡 TIP: You can also manually move files to any increment's reports folder:${NC}"
  echo -e "   ${BLUE}mv FILE.md .specweave/increments/0001-project-setup/reports/${NC}"
  echo ""
  exit 1
fi

echo -e "${YELLOW}🎯 Target directory: $TARGET_DIR${NC}"
echo ""

# Ask for confirmation
read -p "Move these files to $TARGET_DIR? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
  echo -e "${RED}❌ Aborted${NC}"
  exit 1
fi

# Move files and update git staging
MOVED_COUNT=0
for file in "${VIOLATIONS[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${BLUE}Moving: $file → $TARGET_DIR/$file${NC}"

    # Unstage the file from root
    git reset HEAD "$file" >/dev/null 2>&1 || true

    # Move the file
    mv "$file" "$TARGET_DIR/"

    # Stage it in the new location
    git add "$TARGET_DIR/$file"

    MOVED_COUNT=$((MOVED_COUNT + 1))
  fi
done

echo ""
echo -e "${GREEN}✅ Successfully moved $MOVED_COUNT file(s)${NC}"
echo -e "${BLUE}📝 Files are now staged in: $TARGET_DIR${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review the changes: ${BLUE}git status${NC}"
echo -e "  2. Commit: ${BLUE}git commit${NC}"
echo ""
