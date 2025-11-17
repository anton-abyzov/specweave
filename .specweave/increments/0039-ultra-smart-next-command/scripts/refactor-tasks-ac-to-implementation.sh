#!/bin/bash
#
# Refactor tasks.md: Replace "Acceptance Criteria" with "Implementation"
#
# This script fixes the architectural violation where tasks.md contains
# "**Acceptance Criteria**:" sections instead of "**Implementation**:" sections.
#
# As defined in ADR-0047:
# - Acceptance Criteria belong ONLY in spec.md
# - tasks.md should have "**Implementation**:" sections
#
# Part of increment 0039: Ultra-Smart Next Command

set -e

echo "🔧 Refactoring tasks.md files: AC → Implementation"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find all tasks.md files with "Acceptance Criteria"
INCREMENTS_DIR=".specweave/increments"
FILES_FOUND=0
FILES_REFACTORED=0

for tasks_file in "$INCREMENTS_DIR"/*/tasks.md; do
  if [ -f "$tasks_file" ]; then
    if grep -q '\*\*Acceptance Criteria\*\*' "$tasks_file"; then
      FILES_FOUND=$((FILES_FOUND + 1))
      INCREMENT=$(basename $(dirname "$tasks_file"))

      echo -e "${YELLOW}Found violation:${NC} $INCREMENT"

      # Create backup
      cp "$tasks_file" "$tasks_file.backup"

      # Count occurrences
      COUNT=$(grep -c '\*\*Acceptance Criteria\*\*' "$tasks_file" || true)
      echo "  - Found $COUNT occurrence(s)"

      # Refactor: Replace "**Acceptance Criteria**:" with "**Implementation**:"
      sed -i.tmp 's/\*\*Acceptance Criteria\*\*:/\*\*Implementation\*\*:/g' "$tasks_file"
      rm -f "$tasks_file.tmp"

      # Verify replacement
      REMAINING=$(grep -c '\*\*Acceptance Criteria\*\*' "$tasks_file" || true)
      if [ "$REMAINING" -eq 0 ]; then
        echo -e "  - ${GREEN}✅ Refactored successfully${NC}"
        FILES_REFACTORED=$((FILES_REFACTORED + 1))

        # Clean up backup if successful
        rm -f "$tasks_file.backup"
      else
        echo -e "  - ${RED}❌ Refactoring failed (${REMAINING} remaining)${NC}"
        # Restore from backup
        mv "$tasks_file.backup" "$tasks_file"
      fi

      echo ""
    fi
  fi
done

echo "=================================================="
echo "Summary:"
echo "  - Increments scanned: $(find "$INCREMENTS_DIR" -name "tasks.md" | wc -l)"
echo "  - Violations found: $FILES_FOUND"
echo -e "  - Successfully refactored: ${GREEN}$FILES_REFACTORED${NC}"
echo ""

if [ $FILES_REFACTORED -gt 0 ]; then
  echo -e "${GREEN}✅ Refactoring complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes: git diff .specweave/increments/*/tasks.md"
  echo "  2. Validate structure: /specweave:validate (once implemented)"
  echo "  3. Commit changes: git add -u && git commit -m 'refactor: fix AC sections in tasks.md (ADR-0047)'"
else
  echo "No files needed refactoring."
fi
