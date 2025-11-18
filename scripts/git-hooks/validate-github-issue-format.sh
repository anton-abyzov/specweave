#!/bin/bash
# Pre-commit hook: Validate GitHub issue format in codebase
# Prevents commits with deprecated [Increment XXXX] format

set -e

echo "🔍 Validating GitHub issue format..."

# Files to check (GitHub sync code)
GITHUB_FILES=(
  "plugins/specweave-github/lib/task-sync.ts"
  "plugins/specweave-github/lib/github-client-v2.ts"
  "plugins/specweave-github/agents/github-manager/AGENT.md"
  "plugins/specweave-github/commands/specweave-github-create-issue.md"
)

# Pattern to detect (deprecated format)
DEPRECATED_PATTERN='\[Increment [0-9]{4}\]'

# Check for deprecated format (excluding allowed comment warnings)
VIOLATIONS=()
for file in "${GITHUB_FILES[@]}"; do
  if [ -f "$file" ]; then
    # Exclude lines with:
    # - DEPRECATED/TODO comments (documentation of the issue)
    # - Examples showing what NOT to do (marked with ❌, ⚠️, WRONG, etc.)
    # - Documentation strings explaining the old format
    # Only flag actual usage in code (executable TypeScript/JavaScript)
    if grep -E "$DEPRECATED_PATTERN" "$file" | grep -v -E '(DEPRECATED|TODO|WRONG|❌|⚠️|Example|Issue #|Title:)' > /dev/null; then
      VIOLATIONS+=("$file")
    fi
  fi
done

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo ""
  echo "❌ VALIDATION FAILED: Deprecated [Increment XXXX] format detected!"
  echo ""
  echo "Files with violations:"
  for file in "${VIOLATIONS[@]}"; do
    echo "  - $file"
    grep -n -E "$DEPRECATED_PATTERN" "$file" | grep -v -E '(DEPRECATED|TODO|WRONG|❌|⚠️)'
  done
  echo ""
  echo "CORRECT DATA FLOW:"
  echo "  Increment → Living Docs → GitHub"
  echo ""
  echo "CORRECT FORMAT:"
  echo "  ✅ US-XXX: Title (User Story)"
  echo "  ✅ FS-YY-MM-DD: Title (Feature Spec)"
  echo "  ❌ [Increment XXXX] Title (DEPRECATED)"
  echo ""
  echo "FIX:"
  echo "  1. Use /specweave:sync-docs to generate living docs"
  echo "  2. Use /specweave-github:sync to sync living docs to GitHub"
  echo "  3. Remove any code generating [Increment XXXX] format"
  echo ""
  echo "To skip this check (NOT recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ GitHub issue format validation passed"
exit 0
