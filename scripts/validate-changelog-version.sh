#!/bin/bash
#
# Validates that CHANGELOG.md has an entry for the current package.json version
# This prevents the Release & Publish workflow from failing due to missing CHANGELOG entries
#
# Related: release.yml lines 91-121, CLAUDE.md
#

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)

if [ -z "$VERSION" ]; then
  echo "⚠️  Could not read version from package.json"
  exit 0  # Don't fail if we can't read version
fi

# Check if CHANGELOG.md exists
if [ ! -f "CHANGELOG.md" ]; then
  echo "⚠️  CHANGELOG.md not found"
  exit 0
fi

# Check if CHANGELOG has entry for this version
if ! grep -q "## \[$VERSION\]" CHANGELOG.md; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  ERROR: Missing CHANGELOG Entry for v$VERSION"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  The Release & Publish workflow WILL FAIL without a CHANGELOG entry."
  echo ""
  echo "  📋 Add this to CHANGELOG.md (after the first '---'):"
  echo ""
  echo "  ## [$VERSION] - $(date +%Y-%m-%d)"
  echo ""
  echo "  ### Changes"
  echo "  - Your changes here"
  echo ""
  echo "  ---"
  echo ""
  echo "  ⚠️  To bypass: git commit --no-verify"
  echo "      (But Release & Publish will still fail!)"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

echo "   ✅ CHANGELOG entry exists for v$VERSION"
exit 0
