#!/bin/bash
set -e

echo "🔄 Migrating Jest imports to Vitest in test files..."

# Find all test files with Jest imports
FILES=$(grep -rl "@jest/globals" tests/ 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ No Jest imports found - migration complete!"
  exit 0
fi

echo "Found $(echo "$FILES" | wc -l | tr -d ' ') files to migrate:"
echo "$FILES"
echo ""

# Backup
BACKUP_DIR=".migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Creating backup in $BACKUP_DIR..."

for file in $FILES; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp "$file" "$BACKUP_DIR/$file"
done

# Migrate imports
echo ""
echo "🔧 Migrating imports..."
COUNT=0

for file in $FILES; do
  echo "  - $file"

  # Replace @jest/globals with vitest
  sed -i.bak "s/@jest\/globals/vitest/g" "$file"

  # Remove .bak files created by sed
  rm -f "$file.bak"

  COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Migration complete!"
echo "   - Migrated $COUNT files"
echo "   - Backup saved in $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Run tests: npm run test:unit"
echo "2. Fix any remaining type errors"
echo "3. If everything works, delete backup: rm -rf $BACKUP_DIR"
