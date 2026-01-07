#!/bin/bash
#
# Cleanup script for 0000-adhoc increment violation
#
# PROBLEM: 0000-adhoc was created by early versions of fix-root-pollution.sh
# This violates SpecWeave increment structure (increments must start from 0001+)
#
# SOLUTION: Migrate any content to proper increments, then delete 0000-adhoc
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ADHOC_DIR=".specweave/increments/0000-adhoc"

echo -e "${BLUE}🔍 Checking for 0000-adhoc increment violation...${NC}"
echo ""

# Check if 0000-adhoc exists
if [ ! -d "$ADHOC_DIR" ]; then
  echo -e "${GREEN}✅ No 0000-adhoc directory found - system is clean${NC}"
  exit 0
fi

echo -e "${YELLOW}⚠️  Found 0000-adhoc increment violation!${NC}"
echo ""

# Check for content in reports directory
HAS_REPORTS=0
if [ -d "$ADHOC_DIR/reports" ]; then
  REPORT_COUNT=$(ls -1 "$ADHOC_DIR/reports" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$REPORT_COUNT" -gt 0 ]; then
    HAS_REPORTS=1
  fi
fi

# Check for any other files (excluding metadata.json which is invalid anyway)
HAS_OTHER=0
if [ -d "$ADHOC_DIR" ]; then
  OTHER_COUNT=$(ls -1 "$ADHOC_DIR" 2>/dev/null | grep -v "^metadata.json$" | grep -v "^reports$" | wc -l | tr -d ' ')
  if [ "$OTHER_COUNT" -gt 0 ]; then
    HAS_OTHER=1
  fi
fi

# Show what we found
if [ $HAS_REPORTS -eq 1 ]; then
  echo -e "${BLUE}📄 Found $REPORT_COUNT file(s) in reports directory:${NC}"
  ls -1 "$ADHOC_DIR/reports" | sed 's/^/  - /'
  echo ""
fi

if [ $HAS_OTHER -eq 1 ]; then
  echo -e "${BLUE}📄 Found other files in 0000-adhoc:${NC}"
  ls -1 "$ADHOC_DIR" | grep -v "^metadata.json$" | grep -v "^reports$" | sed 's/^/  - /'
  echo ""
fi

# If there's content, offer to migrate it
if [ $HAS_REPORTS -eq 1 ] || [ $HAS_OTHER -eq 1 ]; then
  echo -e "${YELLOW}📦 This content needs to be migrated before deletion${NC}"
  echo ""

  # Check for active increments
  ACTIVE_INCREMENT=$(ls -1 .specweave/increments/ 2>/dev/null | grep "^[0-9]" | grep -v "^0000-" | sort -n | tail -1 || echo "")

  if [ -n "$ACTIVE_INCREMENT" ]; then
    echo -e "${BLUE}📁 Found active increment: $ACTIVE_INCREMENT${NC}"
    echo ""
    read -p "Migrate content to $ACTIVE_INCREMENT/reports? [Y/n] " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
      TARGET_DIR=".specweave/increments/$ACTIVE_INCREMENT/reports"
      mkdir -p "$TARGET_DIR"

      if [ $HAS_REPORTS -eq 1 ]; then
        echo -e "${BLUE}📦 Migrating reports...${NC}"
        cp -r "$ADHOC_DIR/reports/"* "$TARGET_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✅ Migrated $REPORT_COUNT file(s) to $TARGET_DIR${NC}"
      fi

      if [ $HAS_OTHER -eq 1 ]; then
        echo -e "${BLUE}📦 Migrating other files...${NC}"
        for file in $(ls -1 "$ADHOC_DIR" | grep -v "^metadata.json$" | grep -v "^reports$"); do
          cp -r "$ADHOC_DIR/$file" "$TARGET_DIR/" 2>/dev/null || true
        done
        echo -e "${GREEN}✅ Migrated other files to $TARGET_DIR${NC}"
      fi

      echo ""
    else
      echo -e "${RED}❌ Migration cancelled - 0000-adhoc will NOT be deleted${NC}"
      echo ""
      echo -e "${YELLOW}💡 Manual migration options:${NC}"
      echo -e "  1. Move files to an increment: ${BLUE}mv $ADHOC_DIR/reports/* .specweave/increments/####/reports/${NC}"
      echo -e "  2. Or create a new increment: ${BLUE}specweave increment \"adhoc-migration\"${NC}"
      echo ""
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️  No active increments found${NC}"
    echo ""
    echo -e "${BLUE}Please choose an option:${NC}"
    echo -e "  ${GREEN}1.${NC} Create a new increment: ${BLUE}specweave increment \"adhoc-migration\"${NC}"
    echo -e "  ${GREEN}2.${NC} Then re-run this script: ${BLUE}bash scripts/cleanup-0000-adhoc.sh${NC}"
    echo ""
    exit 1
  fi
fi

# Confirm deletion
echo -e "${YELLOW}🗑️  Ready to delete 0000-adhoc directory${NC}"
read -p "Delete $ADHOC_DIR? [Y/n] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
  rm -rf "$ADHOC_DIR"
  echo -e "${GREEN}✅ Successfully deleted $ADHOC_DIR${NC}"
  echo ""
  echo -e "${GREEN}🎉 Cleanup complete - 0000-adhoc violation resolved!${NC}"
else
  echo -e "${RED}❌ Deletion cancelled${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}📊 Final verification:${NC}"
if [ -d "$ADHOC_DIR" ]; then
  echo -e "${RED}❌ ERROR: 0000-adhoc still exists!${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Confirmed: 0000-adhoc has been removed${NC}"
fi

echo ""
echo -e "${GREEN}✨ Your project now follows SpecWeave increment structure correctly!${NC}"
echo -e "${BLUE}ℹ️  All increments must use sequential numbering starting from 0001${NC}"
