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
else
  TARGET_DIR=".specweave/increments/0000-adhoc/reports"
  echo -e "${BLUE}📁 Using adhoc increment (no active increment found)${NC}"
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

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
