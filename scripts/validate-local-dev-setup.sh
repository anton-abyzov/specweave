#!/bin/bash

# SpecWeave Local Development Setup Validator
# Ensures marketplace symlink is properly configured for contributors

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== SpecWeave Local Development Setup Validator ==="
echo ""

# Check if running in SpecWeave repository
if [[ ! -f "package.json" ]] || ! grep -q "\"name\": \"specweave\"" package.json 2>/dev/null; then
  echo -e "${YELLOW}⚠️  This script is for SpecWeave contributors only${NC}"
  echo "   Run this from the SpecWeave repository root"
  exit 1
fi

REPO_ROOT="$(pwd)"
MARKETPLACE_PATH="$HOME/.claude/plugins/marketplaces/specweave"

echo "Repository: $REPO_ROOT"
echo "Marketplace: $MARKETPLACE_PATH"
echo ""

# Check 1: Marketplace exists
if [[ ! -e "$MARKETPLACE_PATH" ]]; then
  echo -e "${RED}❌ FAIL: Marketplace directory does not exist${NC}"
  echo ""
  echo "Fix: Create symlink to your local repository:"
  echo "  rm -rf $MARKETPLACE_PATH"
  echo "  ln -s $REPO_ROOT $MARKETPLACE_PATH"
  exit 1
fi

# Check 2: Is it a symlink?
if [[ ! -L "$MARKETPLACE_PATH" ]]; then
  echo -e "${RED}❌ FAIL: Marketplace is a regular directory, not a symlink${NC}"
  echo ""
  echo "This means changes to your code won't be reflected immediately."
  echo ""
  echo "Fix: Replace with symlink:"
  echo "  rm -rf $MARKETPLACE_PATH"
  echo "  ln -s $REPO_ROOT $MARKETPLACE_PATH"
  exit 1
fi

# Check 3: Symlink points to this repository
SYMLINK_TARGET="$(readlink "$MARKETPLACE_PATH")"
if [[ "$SYMLINK_TARGET" != "$REPO_ROOT" ]]; then
  echo -e "${YELLOW}⚠️  WARNING: Symlink points to wrong location${NC}"
  echo "   Expected: $REPO_ROOT"
  echo "   Actual:   $SYMLINK_TARGET"
  echo ""
  echo "Fix: Update symlink:"
  echo "  rm $MARKETPLACE_PATH"
  echo "  ln -s $REPO_ROOT $MARKETPLACE_PATH"
  exit 1
fi

# Check 4: Critical files accessible
MISSING_FILES=0

check_file() {
  local file="$1"
  local desc="$2"
  if [[ ! -f "$MARKETPLACE_PATH/$file" ]]; then
    echo -e "${RED}❌ Missing: $desc${NC}"
    echo "   Path: $MARKETPLACE_PATH/$file"
    ((MISSING_FILES++))
  fi
}

check_file "plugins/specweave/hooks/hooks.json" "Core plugin hooks.json"
check_file "plugins/specweave/hooks/user-prompt-submit.sh" "user-prompt-submit hook"
check_file "plugins/specweave/hooks/pre-command-deduplication.sh" "deduplication hook"
check_file "plugins/specweave/.claude-plugin/plugin.json" "Core plugin manifest"

if [[ $MISSING_FILES -gt 0 ]]; then
  echo ""
  echo -e "${RED}❌ FAIL: $MISSING_FILES critical files missing${NC}"
  echo ""
  echo "This suggests the repository structure is incorrect or incomplete."
  exit 1
fi

# Check 5: All plugins have manifests
PLUGIN_ERRORS=0

for plugin_dir in "$REPO_ROOT"/plugins/*/; do
  plugin_name="$(basename "$plugin_dir")"
  manifest="$plugin_dir/.claude-plugin/plugin.json"
  
  if [[ ! -f "$manifest" ]]; then
    echo -e "${RED}❌ Plugin $plugin_name missing plugin.json${NC}"
    ((PLUGIN_ERRORS++))
  fi
done

if [[ $PLUGIN_ERRORS -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}⚠️  WARNING: $PLUGIN_ERRORS plugins missing manifests${NC}"
  echo "   Plugins without manifests won't be loadable by Claude Code"
fi

# All checks passed
echo ""
echo -e "${GREEN}✅ SUCCESS: Local development setup is correctly configured${NC}"
echo ""
echo "Summary:"
echo "  ✓ Marketplace symlink exists"
echo "  ✓ Points to this repository"
echo "  ✓ All critical hooks accessible"
echo "  ✓ Plugin manifests present"
echo ""
echo "You're ready to develop SpecWeave!"
exit 0
