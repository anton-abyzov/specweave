#!/bin/bash

# migrate-living-docs-to-english.sh
# One-time migration script for existing projects with non-English living docs
#
# PURPOSE:
# - Translate all living docs in .specweave/docs/internal/ to English
# - Provides one-time migration for existing projects
# - Non-blocking (continues even if some files fail)
#
# USAGE:
#   bash scripts/migrate-living-docs-to-english.sh
#
# REQUIREMENTS:
#   - Project must have .specweave/ directory
#   - npm run build must have been run (to compile translate-file.js)
#
# COST:
#   - ~$0.01 per file (using Haiku model)
#   - Typical project: 10-20 files = $0.10-0.20 total

set -e

echo ""
echo "🌐 Living Docs Translation Migration"
echo "====================================="
echo ""
echo "This script will translate all living docs to English."
echo "Files in .specweave/docs/internal/ will be translated."
echo ""
echo "⚠️  WARNING: This will modify your documentation files!"
echo "   Make sure you have committed your changes first."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Find project root by searching upward for .specweave/ directory
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo ""
    return 1
  fi
}

PROJECT_ROOT="$(find_project_root "$(pwd)")"

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT/.specweave" ]; then
  echo "❌ No .specweave/ directory found in current directory or parent directories"
  echo "   Are you in a SpecWeave project?"
  exit 1
fi

cd "$PROJECT_ROOT"

INTERNAL_DOCS="$PROJECT_ROOT/.specweave/docs/internal"

if [ ! -d "$INTERNAL_DOCS" ]; then
  echo "❌ No .specweave/docs/internal/ directory found"
  exit 1
fi

# Check if translation script exists
if [ ! -f "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" ]; then
  echo "❌ Translation script not found"
  echo "   Please run 'npm run build' first to compile the translation utilities"
  exit 1
fi

echo ""
echo "📂 Scanning for non-English files in $INTERNAL_DOCS..."
echo ""

total_files=0
skipped_files=0
translated_files=0
failed_files=0

# Detect language function (simple heuristic)
detect_language() {
  local file="$1"

  # Count non-ASCII characters (Cyrillic, Chinese, etc.)
  local non_ascii=$(LC_ALL=C grep -o '[^ -~]' "$file" 2>/dev/null | wc -l | tr -d ' ')
  local total_chars=$(wc -c < "$file" | tr -d ' ')

  if [ "$total_chars" -gt 0 ]; then
    local ratio=$((non_ascii * 100 / total_chars))

    # If >10% non-ASCII, assume non-English
    if [ "$ratio" -gt 10 ]; then
      echo "non-en"
      return 0
    fi
  fi

  echo "en"
  return 0
}

# Find all markdown files in internal docs
find "$INTERNAL_DOCS" -type f -name "*.md" | while read -r file; do
  ((total_files++))

  # Skip legacy folder (temporary brownfield imports)
  if [[ "$file" == *"/legacy/"* ]]; then
    echo "⏭️  Skipping legacy: $(basename "$file")"
    ((skipped_files++))
    continue
  fi

  # Detect language
  lang=$(detect_language "$file")

  if [ "$lang" = "non-en" ]; then
    echo "🌐 Translating: $file"

    # Call translation script
    if node "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" "$file" --target-lang en --verbose 2>&1 | grep -q "✅"; then
      ((translated_files++))
      echo "   ✅ Done"
    else
      ((failed_files++))
      echo "   ⚠️  Failed (continuing...)"
    fi
  else
    echo "✅ Already English: $(basename "$file")"
    ((skipped_files++))
  fi
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "   Total files scanned: $total_files"
echo "   Files already in English: $skipped_files"
echo "   Files translated: $translated_files"
echo "   Files failed: $failed_files"
echo ""

if [ "$failed_files" -gt 0 ]; then
  echo "⚠️  Some files failed to translate. Check the output above for details."
  echo "   You can re-run this script to retry failed files."
  echo ""
fi

echo "💡 Next steps:"
echo "   1. Review translated files: git diff .specweave/docs/internal/"
echo "   2. Commit changes: git add . && git commit -m 'docs: translate living docs to English'"
echo "   3. Create new increments - they will auto-translate from now on!"
echo ""

exit 0
