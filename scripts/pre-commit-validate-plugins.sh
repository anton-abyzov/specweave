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

# Run validation script
if ! bash "$REPO_ROOT/scripts/validate-plugin-directories.sh"; then
  echo ""
  echo "❌ Commit blocked: Plugin validation failed"
  echo ""
  echo "Common fixes:"
  echo "  • Remove empty directories: rmdir plugins/*/agents/empty-dir"
  echo "  • Add missing files: touch plugins/*/skills/name/SKILL.md"
  echo "  • See: scripts/validate-plugin-directories.sh for details"
  echo ""
  exit 1
fi

echo "✅ Plugin structure validation passed"
exit 0
