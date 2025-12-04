#!/usr/bin/env bash
#
# Pre-commit hook: Validate plugin structure
# Prevents commits with empty agent/skill directories or missing required files
#
# Install: ln -sf ../../scripts/pre-commit-validate-plugins.sh .git/hooks/pre-commit-validate-plugins
# Or add to .git/hooks/pre-commit

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Only run if plugin files are being committed
if ! git diff --cached --name-only | grep -q "^plugins/"; then
  exit 0
fi

echo "🔍 Validating plugin structure..."

# Run directory structure validation
if ! bash "$REPO_ROOT/scripts/validation/validate-plugin-directories.sh"; then
  echo ""
  echo "❌ Commit blocked: Plugin directory validation failed"
  echo ""
  echo "Common fixes:"
  echo "  • Remove empty directories: rmdir plugins/*/agents/empty-dir"
  echo "  • Add missing files: touch plugins/*/skills/name/SKILL.md"
  echo "  • See: scripts/validation/validate-plugin-directories.sh for details"
  echo ""
  exit 1
fi

echo "✅ Plugin directory validation passed"

# Only run marketplace validation if marketplace.json is being committed
if git diff --cached --name-only | grep -q ".claude-plugin/marketplace.json"; then
  echo ""
  echo "🔍 Validating marketplace.json completeness..."

  # Run enhanced marketplace validation (scoring system)
  if ! bash "$REPO_ROOT/scripts/validation/validate-marketplace-plugins.sh"; then
    echo ""
    echo "❌ Commit blocked: Marketplace validation failed"
    echo ""
    echo "Incomplete plugins detected! These plugins MUST NOT be in marketplace.json."
    echo ""
    echo "Fix options:"
    echo "  1. Remove incomplete plugins from .claude-plugin/marketplace.json"
    echo "  2. Add required functionality (commands/lib/agents) to reach ≥40 points"
    echo "  3. See: scripts/validation/validate-marketplace-plugins.sh for scoring criteria"
    echo ""
    exit 1
  fi

  echo "✅ Marketplace validation passed"
fi

exit 0
