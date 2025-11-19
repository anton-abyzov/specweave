#!/bin/bash
#
# Automated Jest to Vitest conversion script
# Converts Jest syntax to Vitest syntax in test files
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Jest to Vitest Conversion Script ===${NC}\n"

# Files to convert
FILES=(
  "tests/unit/living-docs/content-distributor.test.ts"
  "tests/unit/living-docs/cross-linker.test.ts"
  "tests/unit/living-docs/hierarchy-mapper-project-detection.test.ts"
  "tests/unit/living-docs/project-detector.test.ts"
  "tests/unit/living-docs/three-layer-sync.test.ts"
  "tests/unit/living-docs/three-layer-sync.skip.test.ts"
)

# Backup directory
BACKUP_DIR=".specweave/increments/0037-project-specific-tasks/backups"
mkdir -p "$BACKUP_DIR"

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}⚠ Skipping $file (not found)${NC}"
    continue
  fi

  echo -e "${GREEN}Converting:${NC} $file"

  # Create backup
  backup_file="$BACKUP_DIR/$(basename "$file").backup"
  cp "$file" "$backup_file"
  echo -e "  ${YELLOW}→${NC} Backed up to $backup_file"

  # Perform conversions (in-place with -i flag)

  # 1. Add Vitest imports at the top (before describe blocks)
  # Check if file already has vitest import
  if ! grep -q "from 'vitest'" "$file"; then
    # Find first line with 'describe(' and add vitest import before it
    sed -i '' "/^describe(/i\\
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';\\
" "$file"
  fi

  # 2. Replace jest.mock() with vi.mock()
  sed -i '' 's/jest\.mock(/vi.mock(/g' "$file"

  # 3. Replace jest.fn() with vi.fn()
  sed -i '' 's/jest\.fn()/vi.fn()/g' "$file"

  # 4. Replace jest.clearAllMocks() with vi.clearAllMocks()
  sed -i '' 's/jest\.clearAllMocks()/vi.clearAllMocks()/g' "$file"

  # 5. Replace jest.Mock type annotations with 'any' (simplified approach)
  sed -i '' 's/jest\.Mock/any/g' "$file"
  sed -i '' 's/jest\.Mocked/any/g' "$file"
  sed -i '' 's/jest\.MockedFunction/any/g' "$file"

  # 6. Replace jest.spyOn with vi.spyOn
  sed -i '' 's/jest\.spyOn(/vi.spyOn(/g' "$file"

  # 7. Replace jest.resetAllMocks with vi.resetAllMocks
  sed -i '' 's/jest\.resetAllMocks()/vi.resetAllMocks()/g' "$file"

  # 8. Replace jest.restoreAllMocks with vi.restoreAllMocks
  sed -i '' 's/jest\.restoreAllMocks()/vi.restoreAllMocks()/g' "$file"

  # 9. Replace jest.setTimeout with test timeout in describe/it blocks
  sed -i '' 's/jest\.setTimeout([^)]*)/\/\/ Note: Timeout configured in vitest.config.ts/g' "$file"

  # 10. Add .js extensions to local imports
  sed -i '' "s|from '\(\.\.*/[^']*\)';|from '\1.js';|g" "$file"

  echo -e "  ${GREEN}✓${NC} Converted successfully"
  echo ""
done

echo -e "${GREEN}=== Conversion Complete ===${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review the converted files manually"
echo "2. Run: npm install (to install vitest dependencies)"
echo "3. Run: npx vitest run tests/unit/living-docs/"
echo "4. Fix any remaining issues"
