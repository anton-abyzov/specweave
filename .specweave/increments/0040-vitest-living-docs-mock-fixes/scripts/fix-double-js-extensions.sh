#!/bin/bash
set -e

echo "🔧 Fixing .js.js double extension bug in test files..."

# Find all test files with .js.js
FILES=$(grep -rl "\.js\.js" tests/ --include="*.ts" 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ No .js.js double extensions found - already fixed!"
  exit 0
fi

COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $COUNT files with .js.js double extensions"
echo ""

# Backup
BACKUP_DIR=".fix-double-js-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Creating backup in $BACKUP_DIR..."

for file in $FILES; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp "$file" "$BACKUP_DIR/$file"
done

# Fix double extensions
echo ""
echo "🔧 Fixing .js.js → .js in all files..."

for file in $FILES; do
  # Replace all occurrences of .js.js with .js
  sed -i.bak "s/\.js\.js/\.js/g" "$file"

  # Remove .bak files
  rm -f "$file.bak"

  echo "  ✓ $file"
done

echo ""
echo "✅ Fix complete!"
echo "   - Fixed $COUNT files"
echo "   - Backup saved in $BACKUP_DIR"
echo ""
echo "Next: Run tests to verify: npm run test:unit"
