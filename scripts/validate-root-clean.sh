#!/bin/bash
# Validate that project root only contains approved files
# SpecWeave Framework - Root Cleanliness Validator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating project root cleanliness..."

# Allowed files in root (ONLY THESE)
ALLOWED_FILES=(
  "CHANGELOG.md"
  "CLAUDE.md"
  "README.md"
  "SPECWEAVE.md"
)

# Get all .md files in root
md_files=($(ls -1 *.md 2>/dev/null || true))

violations=()

# Check each MD file
for file in "${md_files[@]}"; do
  allowed=false
  for allowed_file in "${ALLOWED_FILES[@]}"; do
    if [ "$file" = "$allowed_file" ]; then
      allowed=true
      break
    fi
  done

  if [ "$allowed" = false ]; then
    violations+=("$file")
  fi
done

# Report results
if [ ${#violations[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ Root is clean!${NC}"
  echo "Only approved files present:"
  for file in "${ALLOWED_FILES[@]}"; do
    if [ -f "$file" ]; then
      echo "  ✓ $file"
    fi
  done
  exit 0
else
  echo -e "${RED}❌ Root cleanliness violation!${NC}"
  echo ""
  echo "Found unauthorized markdown files in root:"
  for violation in "${violations[@]}"; do
    echo -e "  ${RED}✗${NC} $violation"
  done
  echo ""
  echo -e "${YELLOW}ℹ️  SpecWeave Root Policy:${NC}"
  echo "Only these files are allowed in project root:"
  for file in "${ALLOWED_FILES[@]}"; do
    echo "  • $file"
  done
  echo ""
  echo "Move other files to:"
  echo "  • Increment-specific: .specweave/increments/{id}/reports/"
  echo "  • General guides: .specweave/docs/internal/delivery/guides/"
  echo "  • Architecture docs: .specweave/docs/internal/architecture/"
  echo ""
  echo "Run: npm run clean:root (to get suggestions)"
  exit 1
fi
