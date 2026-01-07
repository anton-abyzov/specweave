#!/bin/bash
#
# Pre-commit check: Prevent root folder pollution with analysis/report files
# Related: CLAUDE.md Rule #5 - "Root clean: NEVER create .md/reports/scripts in project root"
#

# Allowed root markdown files (standard project docs)
ALLOWED_FILES=(
  "README.md"
  "CLAUDE.md"
  "AGENTS.md"
  "CHANGELOG.md"
  "LICENSE.md"
  "CODE_OF_CONDUCT.md"
  "SECURITY.md"
  "IMPLEMENTATION-SUMMARY.md"
  "IMPLEMENTATION-COMPLETE.md"
)

# Get staged markdown files in root (not in subdirectories)
STAGED_ROOT_MD=$(git diff --cached --name-only --diff-filter=A | grep '^[^/]*\.md$' || true)

if [ -z "$STAGED_ROOT_MD" ]; then
  exit 0
fi

VIOLATIONS=""

for file in $STAGED_ROOT_MD; do
  # Check if file is in allowed list
  is_allowed=0
  for allowed in "${ALLOWED_FILES[@]}"; do
    if [ "$file" = "$allowed" ]; then
      is_allowed=1
      break
    fi
  done

  if [ $is_allowed -eq 0 ]; then
    VIOLATIONS="$VIOLATIONS\n  - $file"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  ERROR: Root Folder Pollution Detected!"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  The following markdown files violate CLAUDE.md Rule #5:"
  echo -e "$VIOLATIONS"
  echo ""
  echo "  📋 CLAUDE.md Rule #5:"
  echo "     'Root clean: NEVER create .md/reports/scripts in project root'"
  echo ""
  echo "  ✅ Correct locations:"
  echo "     - Analysis files     → .specweave/increments/####/reports/"
  echo "     - Session reports    → .specweave/increments/####/reports/"
  echo "     - Implementation docs → .specweave/increments/####/reports/"
  echo "     - Ad-hoc work files  → .specweave/increments/0000-adhoc/reports/"
  echo ""
  echo "  🔧 To fix:"
  echo "     1. Create/use increment: mkdir -p .specweave/increments/####-name/reports/"
  echo "     2. Move files: mv FILE.md .specweave/increments/####-name/reports/"
  echo "     3. Unstage: git reset HEAD FILE.md"
  echo "     4. Stage correct location: git add .specweave/increments/####-name/"
  echo ""
  echo "  ⚠️  To bypass (NOT RECOMMENDED): git commit --no-verify"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

exit 0
