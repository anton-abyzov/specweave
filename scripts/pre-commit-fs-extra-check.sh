#!/bin/bash

# Pre-commit hook to prevent fs-extra imports in new/modified files
# Part of fs-extra → native fs migration (2025-11-20)
#
# Why this matters:
# - fs-extra is being phased out in favor of native Node.js fs
# - Prevents hook failures when fs-extra is not installed
# - Enforces use of native fs or utils/fs-native.js
#
# Exceptions:
# - Legacy files with fs-extra (pre-migration) allowed temporarily
# - Files explicitly marked with "legacy fs-extra" comment bypass check

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking for fs-extra imports in staged files..."

# Get staged TypeScript and JavaScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files staged"
  exit 0
fi

# Legacy files allowed to keep fs-extra temporarily
LEGACY_ALLOWED=(
  # Add any legacy files here if needed during migration
  # "src/legacy/old-code.ts"
)

VIOLATIONS=()
LEGACY_FOUND=()

for file in $STAGED_FILES; do
  # Skip files in node_modules or dist/
  if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"dist/"* ]]; then
    continue
  fi

  # Skip if file doesn't exist (deleted)
  if [ ! -f "$file" ]; then
    continue
  fi

  # Check if file is in legacy allowed list
  IS_LEGACY=false
  for legacy in "${LEGACY_ALLOWED[@]}"; do
    if [ "$file" == "$legacy" ]; then
      IS_LEGACY=true
      break
    fi
  done

  # Check for "legacy fs-extra" comment marker
  if grep -q "legacy fs-extra" "$file" 2>/dev/null; then
    IS_LEGACY=true
  fi

  # Check for fs-extra imports
  if grep -E "from ['\"]fs-extra['\"]|require\(['\"]fs-extra['\"]\)" "$file" > /dev/null 2>&1; then
    if [ "$IS_LEGACY" = true ]; then
      LEGACY_FOUND+=("$file")
    else
      VIOLATIONS+=("$file")
    fi
  fi
done

# Report results
if [ ${#LEGACY_FOUND[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Legacy fs-extra imports found (allowed):${NC}"
  for file in "${LEGACY_FOUND[@]}"; do
    echo "   📝 $file (marked as legacy)"
  done
  echo ""
fi

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo -e "${RED}❌ COMMIT BLOCKED: fs-extra imports detected!${NC}"
  echo ""
  echo "The following files use fs-extra:"
  for file in "${VIOLATIONS[@]}"; do
    echo -e "   ${RED}✗${NC} $file"
    # Show the import line
    grep -n -E "from ['\"]fs-extra['\"]|require\(['\"]fs-extra['\"]\)" "$file" | head -1
  done
  echo ""
  echo -e "${YELLOW}🔧 How to fix:${NC}"
  echo ""
  echo "Replace fs-extra with native Node.js fs:"
  echo ""
  echo "  ❌ WRONG:"
  echo "     import fs from 'fs-extra';"
  echo "     fs.existsSync(path);"
  echo "     await fs.readFile(path, 'utf-8');"
  echo "     await fs.ensureDir(dir);"
  echo ""
  echo "  ✅ CORRECT:"
  echo "     import { existsSync, readFileSync, promises as fs } from 'fs';"
  echo "     import { mkdirpSync } from '../utils/fs-native.js';"
  echo ""
  echo "     existsSync(path);                          // Sync"
  echo "     readFileSync(path, 'utf-8');              // Sync"
  echo "     await fs.readFile(path, 'utf-8');         // Async"
  echo "     await fs.mkdir(dir, { recursive: true }); // Async"
  echo "     mkdirpSync(dir);                          // Sync (from fs-native)"
  echo ""
  echo "For legacy files that MUST keep fs-extra:"
  echo "  Add comment: // legacy fs-extra"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ No fs-extra imports in staged files${NC}"
exit 0
