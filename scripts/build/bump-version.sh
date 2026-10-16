#!/bin/bash
#
# Local version bump. `npm version` bumps package.json and package-lock.json,
# and its `version` lifecycle writes the CHANGELOG entry
# (scripts/build/auto-changelog.js) and stamps the plugin and marketplace
# manifests.
#
# Usage:
#   ./scripts/build/bump-version.sh patch|minor|major   # bump only
#   ./scripts/build/bump-version.sh X.Y.Z               # set a specific version
#   ./scripts/build/bump-version.sh patch --release     # full release, see below
#
# A full release (bump PR, admin merge, tag, publish watch, verification) is
# scripts/release/release.sh; --release hands over to it before bumping.
#
# Incident Reference: 2025-11-24 - v0.27.0, v0.26.16, v0.26.13 ALL failed due to missing CHANGELOG
# Related: release.yml, scripts/release/release.sh
#

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ -z "$BUMP_TYPE" ]; then
  echo ""
  echo -e "${BLUE}SpecWeave version bump${NC}"
  echo ""
  echo "Current version: ${CURRENT_VERSION}"
  echo ""
  echo -e "${CYAN}Usage:${NC}"
  echo "  $0 patch             # ${CURRENT_VERSION} -> $(echo "$CURRENT_VERSION" | awk -F. '{print $1"."$2"."$3+1}')"
  echo "  $0 minor             # ${CURRENT_VERSION} -> $(echo "$CURRENT_VERSION" | awk -F. '{print $1"."$2+1".0"}')"
  echo "  $0 major             # ${CURRENT_VERSION} -> $(echo "$CURRENT_VERSION" | awk -F. '{print $1+1".0.0"}')"
  echo "  $0 X.Y.Z             # Set specific version"
  echo ""
  echo -e "${CYAN}Options:${NC}"
  echo "  --release, -r        # Full release through scripts/release/release.sh"
  echo ""
  exit 1
fi

if [ "$AUTO_RELEASE" = true ]; then
  exec bash "$(dirname "$0")/../release/release.sh" "$BUMP_TYPE"
fi

npm version "$BUMP_TYPE" --no-git-tag-version --ignore-scripts=false > /dev/null
NEW_VERSION=$(node -p "require('./package.json').version")

# 0794 / 0871 — propagate the bumped version to plugin.json + marketplace.json.
# Without this, plugin.json freezes (silently breaks Claude Code's update
# detection) and marketplace.json drifts from package.json. The stamp is the
# single source of truth (scripts/build/stamp-plugin-version.cjs) and also runs
# in the `build`/`version` npm lifecycle so EVERY publish path stamps. Validated
# by scripts/validation/validate-versions.cjs (also a prepublishOnly gate + unit test).
node "$(dirname "$0")/stamp-plugin-version.cjs"

echo ""
echo -e "${GREEN}Bumped ${CURRENT_VERSION} -> ${NEW_VERSION}${NC}"
echo ""
echo "  1. Edit the CHANGELOG.md entry for ${NEW_VERSION} (release.yml refuses '- Patch release')"
echo "  2. Commit as 'Release ${NEW_VERSION}', open a PR to develop, merge it, tag the merge commit"
echo ""
echo "  Or skip this bump: bash scripts/release/release.sh ${NEW_VERSION} --notes <file>"
echo "  bumps a fresh develop clone and runs PR, merge, tag, publish watch and verify."
echo ""
