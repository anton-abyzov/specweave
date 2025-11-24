#!/bin/bash
#
# Smart version bump script with automatic CHANGELOG entry creation
# Prevents the "missing CHANGELOG entry" pipeline failure
#
# Usage:
#   ./scripts/bump-version.sh patch   # 0.26.10 -> 0.26.11
#   ./scripts/bump-version.sh minor   # 0.26.10 -> 0.27.0
#   ./scripts/bump-version.sh major   # 0.26.10 -> 1.0.0
#   ./scripts/bump-version.sh 0.27.0  # Set specific version
#
# Related: release.yml, validate-changelog-version.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ -z "$1" ]; then
  echo ""
  echo -e "${BLUE}📦 SpecWeave Version Bump Tool${NC}"
  echo ""
  echo "Current version: ${CURRENT_VERSION}"
  echo ""
  echo "Usage:"
  echo "  $0 patch   # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."$3+1}')"
  echo "  $0 minor   # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2+1".0"}')"
  echo "  $0 major   # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')"
  echo "  $0 X.Y.Z   # Set specific version"
  echo ""
  exit 1
fi

BUMP_TYPE=$1

# Determine new version
case $BUMP_TYPE in
  patch|minor|major)
    npm version $BUMP_TYPE --no-git-tag-version > /dev/null
    NEW_VERSION=$(node -p "require('./package.json').version")
    ;;
  *)
    # Specific version provided
    NEW_VERSION=$BUMP_TYPE
    npm version $NEW_VERSION --no-git-tag-version > /dev/null
    ;;
esac

echo ""
echo -e "${BLUE}📦 Version Bump: ${CURRENT_VERSION} -> ${NEW_VERSION}${NC}"
echo ""

# Check if CHANGELOG entry already exists
if grep -q "## \[$NEW_VERSION\]" CHANGELOG.md; then
  echo -e "${GREEN}✅ CHANGELOG entry already exists for v${NEW_VERSION}${NC}"
else
  echo -e "${YELLOW}📝 Creating CHANGELOG entry for v${NEW_VERSION}...${NC}"

  # Create the changelog entry
  TODAY=$(date +%Y-%m-%d)
  CHANGELOG_ENTRY="## [$NEW_VERSION] - $TODAY

### Changes
- TODO: Describe your changes here

---

"

  # Insert after the first "---" line
  # Using a temp file for cross-platform compatibility
  TEMP_FILE=$(mktemp)

  # Find line number of first "---" after header
  FIRST_SEPARATOR=$(grep -n "^---$" CHANGELOG.md | head -1 | cut -d: -f1)

  if [ -n "$FIRST_SEPARATOR" ]; then
    # Split and insert
    head -n $FIRST_SEPARATOR CHANGELOG.md > "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "$CHANGELOG_ENTRY" >> "$TEMP_FILE"
    tail -n +$((FIRST_SEPARATOR + 1)) CHANGELOG.md >> "$TEMP_FILE"
    mv "$TEMP_FILE" CHANGELOG.md
    echo -e "${GREEN}✅ CHANGELOG entry created${NC}"
  else
    echo -e "${RED}⚠️  Could not find separator in CHANGELOG.md${NC}"
    echo "   Please add CHANGELOG entry manually"
  fi
fi

echo ""
echo -e "${GREEN}📋 Next steps:${NC}"
echo ""
echo "  1. Edit CHANGELOG.md with your actual changes"
echo "  2. Commit: git add -A && git commit -m \"chore: bump version to ${NEW_VERSION}\""
echo "  3. Push:   git push origin develop"
echo "  4. Tag:    git tag v${NEW_VERSION} && git push origin v${NEW_VERSION}"
echo ""
echo -e "${YELLOW}💡 Tip: Use /specweave-release:npm for automated releases${NC}"
echo ""
