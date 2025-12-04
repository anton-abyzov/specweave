#!/usr/bin/env bash

# Validates .specweave/increments/ folder structure
# Ensures ONLY numbered folders, _archive, and README.md exist at root
# Ensures ONLY spec.md, plan.md, tasks.md, metadata.json exist at increment roots

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
VIOLATIONS=0
WARNINGS=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Increment Folder Structure Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .specweave/increments exists
if [[ ! -d ".specweave/increments" ]]; then
  echo -e "${RED}✗ ERROR: .specweave/increments directory not found${NC}"
  exit 1
fi

cd .specweave/increments

echo -e "${BLUE}🔍 Checking root level structure...${NC}"

# Check for violations at root level
# Should ONLY see: numbered folders, _archive, README.md
ROOT_VIOLATIONS=$(ls -1 | grep -v "^[0-9]" | grep -v "^_archive" | grep -v "^README.md" || true)

if [[ -n "$ROOT_VIOLATIONS" ]]; then
  echo -e "${RED}✗ VIOLATIONS FOUND at .specweave/increments/ root:${NC}"
  echo ""
  while IFS= read -r violation; do
    echo -e "${RED}  ❌ $violation${NC}"
    ((VIOLATIONS++))
  done <<< "$ROOT_VIOLATIONS"
  echo ""
  echo -e "${YELLOW}Fix: Move these to appropriate increment folders or delete them${NC}"
  echo ""
else
  echo -e "${GREEN}✓ Root level structure is clean${NC}"
fi

# Check for violations inside increment folders
echo ""
echo -e "${BLUE}🔍 Checking increment folder contents...${NC}"

CHECKED_INCREMENTS=0
for increment_dir in [0-9][0-9][0-9][0-9]-*; do
  if [[ ! -d "$increment_dir" ]]; then
    continue
  fi

  ((CHECKED_INCREMENTS++))

  # Find files at root of increment (not in subfolders)
  INVALID_FILES=$(find "$increment_dir" -maxdepth 1 -type f | \
    grep -v -E "(spec\.md|plan\.md|tasks\.md|metadata\.json)$" || true)

  if [[ -n "$INVALID_FILES" ]]; then
    echo -e "${RED}✗ VIOLATIONS in $increment_dir:${NC}"
    while IFS= read -r file; do
      filename=$(basename "$file")
      echo -e "${RED}  ❌ $filename (should be in reports/, logs/, or scripts/)${NC}"
      ((VIOLATIONS++))
    done <<< "$INVALID_FILES"
  fi
done

if [[ $VIOLATIONS -eq 0 ]] && [[ $CHECKED_INCREMENTS -gt 0 ]]; then
  echo -e "${GREEN}✓ All $CHECKED_INCREMENTS increment folders have correct structure${NC}"
fi

# Check for missing required files (warning only)
echo ""
echo -e "${BLUE}🔍 Checking for required files in increments...${NC}"

for increment_dir in [0-9][0-9][0-9][0-9]-*; do
  if [[ ! -d "$increment_dir" ]]; then
    continue
  fi

  # Check for required files
  for required_file in "spec.md" "plan.md" "tasks.md" "metadata.json"; do
    if [[ ! -f "$increment_dir/$required_file" ]]; then
      echo -e "${YELLOW}⚠ WARNING: Missing $required_file in $increment_dir${NC}"
      ((WARNINGS++))
    fi
  done
done

if [[ $WARNINGS -eq 0 ]]; then
  echo -e "${GREEN}✓ All increments have required files${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Increments checked: $CHECKED_INCREMENTS"
echo "  Violations: $VIOLATIONS"
echo "  Warnings: $WARNINGS"
echo ""

if [[ $VIOLATIONS -eq 0 ]]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✓ VALIDATION PASSED!"
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✗ VALIDATION FAILED!"
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "See: .specweave/docs/internal/governance/increment-folder-structure.md"
  echo ""
  exit 1
fi
