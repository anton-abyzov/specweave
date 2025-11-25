#!/bin/bash
#
# Smart version bump script with automatic CHANGELOG entry creation
# Prevents the "missing CHANGELOG entry" pipeline failure
#
# Usage:
#   ./scripts/bump-version.sh patch           # Bump + create CHANGELOG (manual release)
#   ./scripts/bump-version.sh minor           # Bump + create CHANGELOG (manual release)
#   ./scripts/bump-version.sh major           # Bump + create CHANGELOG (manual release)
#   ./scripts/bump-version.sh patch --release # Full release: bump, commit, tag, push
#   ./scripts/bump-version.sh 0.27.0          # Set specific version
#
# Incident Reference: 2025-11-24 - v0.27.0, v0.26.16, v0.26.13 ALL failed due to missing CHANGELOG
# Related: release.yml, validate-changelog-version.sh, pre-push hook
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
BUMP_TYPE=""
AUTO_RELEASE=false

for arg in "$@"; do
  case $arg in
    --release|-r)
      AUTO_RELEASE=true
      ;;
    patch|minor|major|[0-9]*)
      BUMP_TYPE="$arg"
      ;;
  esac
done

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ -z "$BUMP_TYPE" ]; then
  echo ""
  echo -e "${BLUE}📦 SpecWeave Release Tool${NC}"
  echo ""
  echo "Current version: ${CURRENT_VERSION}"
  echo ""
  echo -e "${CYAN}Usage:${NC}"
  echo "  $0 patch             # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."$3+1}')"
  echo "  $0 minor             # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2+1".0"}')"
  echo "  $0 major             # ${CURRENT_VERSION} -> $(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')"
  echo "  $0 X.Y.Z             # Set specific version"
  echo ""
  echo -e "${CYAN}Options:${NC}"
  echo "  --release, -r        # Full release: bump, CHANGELOG, commit, tag, push"
  echo ""
  echo -e "${CYAN}Examples:${NC}"
  echo "  $0 patch             # Just bump version + create CHANGELOG entry"
  echo "  $0 patch --release   # Full automated release flow"
  echo ""
  exit 1
fi

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
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📦 SpecWeave Release: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if CHANGELOG entry already exists
CHANGELOG_EXISTS=false
if grep -q "## \[$NEW_VERSION\]" CHANGELOG.md; then
  echo -e "${GREEN}✅ CHANGELOG entry already exists for v${NEW_VERSION}${NC}"
  CHANGELOG_EXISTS=true
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
  TEMP_FILE=$(mktemp)
  FIRST_SEPARATOR=$(grep -n "^---$" CHANGELOG.md | head -1 | cut -d: -f1)

  if [ -n "$FIRST_SEPARATOR" ]; then
    head -n $FIRST_SEPARATOR CHANGELOG.md > "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    echo "$CHANGELOG_ENTRY" >> "$TEMP_FILE"
    tail -n +$((FIRST_SEPARATOR + 1)) CHANGELOG.md >> "$TEMP_FILE"
    mv "$TEMP_FILE" CHANGELOG.md
    echo -e "${GREEN}✅ CHANGELOG entry created${NC}"
  else
    echo -e "${RED}⚠️  Could not find separator in CHANGELOG.md${NC}"
    echo "   Please add CHANGELOG entry manually"
    exit 1
  fi
fi

# If auto-release mode, do everything
if [ "$AUTO_RELEASE" = true ]; then
  echo ""
  echo -e "${CYAN}🚀 Auto-release mode enabled${NC}"
  echo ""

  # Check if CHANGELOG has placeholder content
  CHANGELOG_CONTENT=$(awk "/## \[$NEW_VERSION\]/{flag=1; next} /^## \[/{flag=0} flag" CHANGELOG.md)
  if echo "$CHANGELOG_CONTENT" | grep -q "TODO: Describe your changes here"; then
    echo -e "${RED}❌ CHANGELOG entry still has placeholder content${NC}"
    echo ""
    echo "   Please edit CHANGELOG.md first:"
    echo "   - Replace 'TODO: Describe your changes here' with actual changes"
    echo ""
    echo "   Then run: $0 $BUMP_TYPE --release"
    echo ""
    # Revert version bump
    npm version $CURRENT_VERSION --no-git-tag-version > /dev/null 2>&1 || true
    exit 1
  fi

  # Check for uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}📋 Staging changes...${NC}"
    git add -A
  fi

  echo -e "${YELLOW}📝 Committing...${NC}"
  git commit -m "chore: bump version to ${NEW_VERSION}" || {
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
  }

  echo -e "${YELLOW}🏷️  Creating tag v${NEW_VERSION}...${NC}"
  git tag "v${NEW_VERSION}"

  echo -e "${YELLOW}📤 Pushing to origin...${NC}"
  git push origin develop
  git push origin "v${NEW_VERSION}"

  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ Release v${NEW_VERSION} complete!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "   📦 NPM will be published by GitHub Actions"
  echo "   🔗 Watch: https://github.com/anton-abyzov/specweave/actions"
  echo ""
else
  # Manual mode - just show next steps
  echo ""
  echo -e "${GREEN}📋 Next steps:${NC}"
  echo ""
  if [ "$CHANGELOG_EXISTS" = false ]; then
    echo -e "  ${YELLOW}1. Edit CHANGELOG.md${NC} - replace 'TODO' with actual changes"
  else
    echo "  1. Verify CHANGELOG.md content"
  fi
  echo "  2. Commit: git add -A && git commit -m \"chore: bump version to ${NEW_VERSION}\""
  echo "  3. Push:   git push origin develop"
  echo "  4. Tag:    git tag v${NEW_VERSION} && git push origin v${NEW_VERSION}"
  echo ""
  echo -e "${CYAN}💡 Or use auto-release mode:${NC}"
  echo "   $0 $BUMP_TYPE --release"
  echo ""
  echo -e "${CYAN}💡 Or use the slash command:${NC}"
  echo "   /specweave-release:npm"
  echo ""
fi
