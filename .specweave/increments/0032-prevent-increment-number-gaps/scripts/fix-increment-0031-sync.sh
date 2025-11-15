#!/bin/bash

# Fix for Increment 0031 Sync Issue
# This script temporarily fixes the project mismatch to allow proper sync

echo "🔧 Fixing Increment 0031 External Tool Status Sync"
echo "================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SPEC_FILE=".specweave/increments/0031-external-tool-status-sync/spec.md"
BACKUP_FILE=".specweave/increments/0031-external-tool-status-sync/spec.md.backup"

# Step 1: Backup original spec
echo "📦 Creating backup..."
cp "$SPEC_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
echo ""

# Step 2: Fix the project mismatch
echo "🔧 Fixing project configuration..."
# Change projects: ['backend'] to projects: ['default']
sed -i.tmp "s/projects: \['backend'\]/projects: \['default'\]/g" "$SPEC_FILE"
sed -i.tmp "s/projects: \[\"backend\"\]/projects: \[\"default\"\]/g" "$SPEC_FILE"
rm -f "$SPEC_FILE.tmp"
echo -e "${GREEN}✓${NC} Project configuration fixed"
echo ""

# Step 3: Re-sync increment 0031
echo "🔄 Re-syncing increment 0031..."
node -e "
    import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
        try {
            const distributor = new SpecDistributor(process.cwd());
            const result = await distributor.distribute('0031-external-tool-status-sync');
            console.log('✅ Successfully synced 0031 with', result.totalStories, 'user stories');
        } catch (error) {
            console.error('❌ Failed to sync:', error.message);
            process.exit(1);
        }
    }).catch(err => {
        console.error('❌ Module error:', err.message);
        process.exit(1);
    });
"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Success!${NC}"
    echo ""

    # Step 4: Verify the fix
    echo "🔍 Verifying fix..."
    story_count=$(find ".specweave/docs/internal/specs/default/FS-031" -name "us-*.md" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$story_count" -eq 7 ]; then
        echo -e "${GREEN}✅ All 7 user stories successfully synced!${NC}"
        echo ""
        echo "Files created:"
        ls -la .specweave/docs/internal/specs/default/FS-031/us-*.md 2>/dev/null | tail -7
    else
        echo -e "${YELLOW}⚠️  Warning: Expected 7 user stories, found $story_count${NC}"
    fi

    echo ""
    echo "📝 Note: The original spec.md has been backed up to:"
    echo "   $BACKUP_FILE"
    echo ""
    echo "To restore original (if needed):"
    echo "   mv $BACKUP_FILE $SPEC_FILE"
else
    echo ""
    echo "❌ Sync failed. Restoring original..."
    mv "$BACKUP_FILE" "$SPEC_FILE"
    echo "Original spec.md restored"
    exit 1
fi