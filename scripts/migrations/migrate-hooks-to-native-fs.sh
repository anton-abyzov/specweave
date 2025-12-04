#!/bin/bash
# Automated migration script for remaining hook files
# Converts fs-extra imports to native Node.js fs or fs-native utility

set -e

PLUGIN_HOOKS_DIR="/Users/antonabyzov/Projects/github/specweave/plugins/specweave/lib/hooks"

echo "🔄 Migrating remaining hook files to native fs..."
echo ""

# File 5: reflection-storage.ts (uses mkdirpSync, writeFileSync, existsSync, readdirSync, statSync, readFileSync, removeSync)
echo "📝 Migrating reflection-storage.ts..."
FILE="$PLUGIN_HOOKS_DIR/reflection-storage.ts"

# Replace import
sed -i '.bak' "s/import fs from 'fs-extra';/import { mkdirpSync, writeFileSync, existsSync, readdirSync, statSync, readFileSync, removeSync } from '..\/utils\/fs-native.js';/" "$FILE"

# Replace usages (no fs. prefix needed)
sed -i '' 's/fs\.mkdirpSync/mkdirpSync/g' "$FILE"
sed -i '' 's/fs\.writeFileSync/writeFileSync/g' "$FILE"
sed -i '' 's/fs\.existsSync/existsSync/g' "$FILE"
sed -i '' 's/fs\.readdirSync/readdirSync/g' "$FILE"
sed -i '' 's/fs\.statSync/statSync/g' "$FILE"
sed -i '' 's/fs\.readFileSync/readFileSync/g' "$FILE"
sed -i '' 's/fs\.removeSync/removeSync/g' "$FILE"

echo "✅ reflection-storage.ts migrated"
echo ""

# File 6: translate-file.ts (uses pathExists, readFile, writeFile - all async)
echo "📝 Migrating translate-file.ts..."
FILE="$PLUGIN_HOOKS_DIR/translate-file.ts"

# Replace import (async methods from fs.promises + existsSync)
cat > /tmp/translate-file-import.txt << 'EOF'
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
EOF

# Use perl for multi-line replacement
perl -i -pe 'BEGIN{undef $/;} s/import fs from .fs-extra.;/`cat \/tmp\/translate-file-import.txt`/smge' "$FILE"

# Replace pathExists (async) with existsSync (sync - acceptable for this use case)
sed -i '' 's/await fs\.pathExists/existsSync/g' "$FILE"

echo "✅ translate-file.ts migrated"
echo ""

# File 7: translate-living-docs.ts (uses existsSync, readJson, readFile)
echo "📝 Migrating translate-living-docs.ts..."
FILE="$PLUGIN_HOOKS_DIR/translate-living-docs.ts"

# Replace import
cat > /tmp/translate-living-docs-import.txt << 'EOF'
import { existsSync, readJsonSync } from '../utils/fs-native.js';
import { promises as fs } from 'fs';
EOF

perl -i -pe 'BEGIN{undef $/;} s/import fs from .fs-extra.;/`cat \/tmp\/translate-living-docs-import.txt`/smge' "$FILE"

# Replace usages
sed -i '' 's/fs\.existsSync/existsSync/g' "$FILE"
# readJson (async) → read file and parse JSON manually
sed -i '' 's/await fs\.readJson(configPath)/JSON.parse(await fs.readFile(configPath, "utf-8"))/g' "$FILE"

echo "✅ translate-living-docs.ts migrated"
echo ""

echo "🎉 All hook files migrated successfully!"
echo ""
echo "📋 Migration Summary:"
echo "   - reflection-config-loader.ts ✓"
echo "   - git-diff-analyzer.ts ✓"
echo "   - invoke-translator-skill.ts ✓"
echo "   - prepare-reflection-context.ts ✓"
echo "   - reflection-storage.ts ✓"
echo "   - translate-file.ts ✓"
echo "   - translate-living-docs.ts ✓"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review changes in each file"
echo "   2. Run: npm run rebuild"
echo "   3. Test hooks in marketplace"
