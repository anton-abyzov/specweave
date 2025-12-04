#!/bin/bash

# Pre-commit hook: Validate GitHub Issue Title Format (v0.24.0+)
#
# Blocks commits that contain deprecated or wrong GitHub issue title formats.
#
# PROHIBITED Formats:
# - [SP-US-XXX] - Deprecated SP- prefix (removed v0.24.0)
# - [SP-FS-XXX] - Deprecated SP- prefix (removed v0.24.0)
# - [FS-XXX] without [US-YYY] - Feature-only (must use Milestone, not Issue)
#
# ONLY CORRECT Format:
# - [FS-XXX][US-YYY] User Story Title
#
# See: CLAUDE.md Section 10

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating GitHub issue title formats..."

# Get list of staged files (TypeScript, JavaScript, Shell scripts)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|sh)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "   No TypeScript/JavaScript/Shell files to check"
  exit 0
fi

# Flags to track violations
FOUND_SP_PREFIX=false
FOUND_FEATURE_ONLY=false
VIOLATIONS_FILE=$(mktemp)

# Check for deprecated SP- prefix in issue titles
echo "   Checking for deprecated [SP-XXX] formats..."
for FILE in $STAGED_FILES; do
  # Skip test files, spec files, and documentation
  if echo "$FILE" | grep -qE '\.test\.|\.spec\.|/tests/|/docs/|\.md$'; then
    continue
  fi

  # Check for hardcoded SP- prefix in strings (not in comments)
  # Pattern: "[SP-US-" or "[SP-FS-" in quotes (actual string literals)
  if git diff --cached "$FILE" | grep -E '^\+.*["\`]\[SP-(US|FS)-' | grep -v '//' | grep -v '#' > /dev/null 2>&1; then
    echo "$FILE" >> "$VIOLATIONS_FILE"
    FOUND_SP_PREFIX=true
  fi
done

# Check for Feature-only format (missing US-ID)
echo "   Checking for Feature-only [FS-XXX] format..."
for FILE in $STAGED_FILES; do
  # Skip test files, spec files, and documentation
  if echo "$FILE" | grep -qE '\.test\.|\.spec\.|/tests/|/docs/|\.md$'; then
    continue
  fi

  # Check for [FS-XXX] followed by space and NOT followed by [US-
  # This indicates Feature-only format: [FS-048] Title
  # Pattern: "[FS-XXX] " NOT followed by "[US-"
  if git diff --cached "$FILE" | grep -E '^\+.*["\`]\[FS-[0-9]{3}\]\s+[^[]' | grep -v '//' | grep -v '#' > /dev/null 2>&1; then
    if ! grep -q "^$FILE$" "$VIOLATIONS_FILE" 2>/dev/null; then
      echo "$FILE" >> "$VIOLATIONS_FILE"
    fi
    FOUND_FEATURE_ONLY=true
  fi
done

# Report violations
if [ "$FOUND_SP_PREFIX" = true ] || [ "$FOUND_FEATURE_ONLY" = true ]; then
  echo ""
  echo -e "${RED}❌ ERROR: Prohibited GitHub issue title format detected!${NC}"
  echo ""

  if [ "$FOUND_SP_PREFIX" = true ]; then
    echo -e "${RED}Found deprecated [SP-XXX] prefix in:${NC}"
    cat "$VIOLATIONS_FILE" | sort -u | while read FILE; do
      echo "   - $FILE"
      # Show the problematic lines
      git diff --cached "$FILE" | grep -E '^\+.*["\`]\[SP-(US|FS)-' | grep -v '//' | grep -v '#' | head -3 | sed 's/^/      /'
    done
    echo ""
    echo -e "${YELLOW}   The [SP-XXX] prefix was deprecated in v0.24.0.${NC}"
    echo ""
  fi

  if [ "$FOUND_FEATURE_ONLY" = true ]; then
    echo -e "${RED}Found Feature-only [FS-XXX] format (missing [US-YYY]) in:${NC}"
    cat "$VIOLATIONS_FILE" | sort -u | while read FILE; do
      echo "   - $FILE"
      # Show the problematic lines
      git diff --cached "$FILE" | grep -E '^\+.*["\`]\[FS-[0-9]{3}\]\s+[^[]' | grep -v '//' | grep -v '#' | head -3 | sed 's/^/      /'
    done
    echo ""
    echo -e "${YELLOW}   Features use GitHub Milestones, NOT Issues.${NC}"
    echo -e "${YELLOW}   User Stories use Issues with [FS-XXX][US-YYY] format.${NC}"
    echo ""
  fi

  echo -e "${GREEN}✅ ONLY CORRECT format:${NC}"
  echo "   [FS-XXX][US-YYY] User Story Title"
  echo ""
  echo "Examples:"
  echo "   ✅ [FS-048][US-001] Smart Pagination During Init"
  echo "   ✅ [FS-048][US-002] CLI-First Defaults"
  echo "   ❌ [SP-US-001] Smart Pagination During Init"
  echo "   ❌ [FS-048] Smart Pagination During Init"
  echo ""
  echo "See CLAUDE.md Section 10 for complete policy."
  echo ""

  rm -f "$VIOLATIONS_FILE"
  exit 1
fi

rm -f "$VIOLATIONS_FILE"
echo -e "${GREEN}✅ No prohibited GitHub issue title formats found.${NC}"
exit 0
