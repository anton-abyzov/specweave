#!/usr/bin/env bash
# Replace "bidirectional sync" with "full sync (all permissions enabled)" across the codebase
# Part of increment 0047 - Three-Permission Architecture

set -e

# Get the project root (4 levels up from this script)
# Script location: .specweave/increments/0047-us-task-linkage/scripts/replace-bidirectional-sync.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 Replacing 'bidirectional sync' terminology..."
echo "   Project root: $PROJECT_ROOT"
echo ""

# Track changes
CHANGED_FILES=0

# Function to replace in file
replace_in_file() {
  local file="$1"
  local pattern="$2"
  local replacement="$3"

  if grep -q "$pattern" "$file" 2>/dev/null; then
    # Create backup
    cp "$file" "$file.bak"

    # Perform replacement
    sed -i '' "s/$pattern/$replacement/g" "$file"

    # Check if file actually changed
    if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
      echo "   ✅ Updated: $file"
      ((CHANGED_FILES++))
    fi

    # Remove backup
    rm "$file.bak"
  fi
}

echo "📋 Phase 1: Test Files"
echo "   Replacing 'bidirectional sync' with 'full sync (all permissions enabled)'"
echo ""

# Test files - Replace sync terminology
find tests/ -name "*.test.ts" -type f | while read -r file; do
  # Skip if file contains "bidirectional linking" (Task ↔ US)
  if grep -q "bidirectional linking" "$file" 2>/dev/null; then
    echo "   ⚠️  Skipped (contains 'bidirectional linking'): $file"
    continue
  fi

  replace_in_file "$file" "bidirectional sync" "full sync (all permissions enabled)"
  replace_in_file "$file" "Bidirectional sync" "Full sync (all permissions enabled)"
  replace_in_file "$file" "bidirectional synchronization" "full synchronization with all permissions enabled"
  replace_in_file "$file" "Bidirectional synchronization" "Full synchronization with all permissions enabled"
done

echo ""
echo "📋 Phase 2: Source Code Comments"
echo "   Replacing 'bidirectional sync' with 'three-permission sync'"
echo ""

# Source files - Replace comments
find src/ plugins/ -name "*.ts" -type f | while read -r file; do
  # Skip if file contains "bidirectional linking"
  if grep -q "bidirectional linking" "$file" 2>/dev/null; then
    echo "   ⚠️  Skipped (contains 'bidirectional linking'): $file"
    continue
  fi

  # Skip files that are already updated (contain "three-permission" or "canUpsertInternalItems")
  if grep -q "three-permission\|canUpsertInternalItems" "$file" 2>/dev/null; then
    continue
  fi

  replace_in_file "$file" "bidirectional sync" "three-permission sync"
  replace_in_file "$file" "Bidirectional sync" "Three-permission sync"
  replace_in_file "$file" "bidirectional synchronization" "three-permission synchronization"
done

echo ""
echo "📋 Phase 3: Documentation Files"
echo "   Adding migration notes to CHANGELOG.md"
echo ""

# CHANGELOG.md - Add migration note at top of Unreleased section
if [ -f "CHANGELOG.md" ]; then
  # Check if migration note already exists
  if ! grep -q "Three-Permission Architecture" CHANGELOG.md 2>/dev/null; then
    echo "   📝 Adding migration note to CHANGELOG.md"

    # Find the Unreleased section and add note
    sed -i '' '/## \[Unreleased\]/a\
\
### Breaking Change: Bidirectional Sync → Three-Permission Architecture (v0.24.0)\
\
**Migration Required**: The old `syncDirection: "bidirectional"` configuration has been replaced with three independent permission flags:\
\
```json\
{\
  "sync": {\
    "settings": {\
      "canUpsertInternalItems": true,  // CREATE + UPDATE internal items\
      "canUpdateExternalItems": true,  // UPDATE external items (full content)\
      "canUpdateStatus": true          // UPDATE status (both types)\
    }\
  }\
}\
```\
\
**Automatic Migration**: Existing configs with `syncDirection: "bidirectional"` will be automatically migrated to all three permissions set to `true`.\
\
**See Also**: `.specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md`\
' CHANGELOG.md

    ((CHANGED_FILES++))
  else
    echo "   ℹ️  Migration note already exists in CHANGELOG.md"
  fi
fi

echo ""
echo "📋 Phase 4: Critical Code Files"
echo "   Updating type definitions and adapters"
echo ""

# Update plugins/specweave-github/lib/types.ts
if [ -f "plugins/specweave-github/lib/types.ts" ]; then
  if grep -q "bidirectional" "plugins/specweave-github/lib/types.ts" 2>/dev/null; then
    replace_in_file "plugins/specweave-github/lib/types.ts" "bidirectional" "three-permission"
  fi
fi

# Update src/core/living-docs/task-project-specific-generator.ts
if [ -f "src/core/living-docs/task-project-specific-generator.ts" ]; then
  if grep -q "bidirectional sync" "src/core/living-docs/task-project-specific-generator.ts" 2>/dev/null; then
    replace_in_file "src/core/living-docs/task-project-specific-generator.ts" "bidirectional sync" "three-permission sync"
  fi
fi

# Update src/adapters/claude/README.md
if [ -f "src/adapters/claude/README.md" ]; then
  if grep -q "bidirectional sync" "src/adapters/claude/README.md" 2>/dev/null; then
    replace_in_file "src/adapters/claude/README.md" "bidirectional sync" "full sync with all permissions enabled"
  fi
fi

echo ""
echo "✅ Replacement complete!"
echo ""
echo "📊 Summary:"
echo "   Files changed: $CHANGED_FILES"
echo ""
echo "🔍 Next Steps:"
echo "   1. Review changes: git diff"
echo "   2. Run tests: npm test"
echo "   3. Verify remaining references: git grep -i 'bidirectional sync'"
echo "   4. Files requiring manual review:"
echo "      - src/templates/CLAUDE.md.template (bidirectional LINKING)"
echo "      - CLAUDE.md (bidirectional LINKING)"
echo "      - Historical documentation in .specweave/increments/"
echo ""
