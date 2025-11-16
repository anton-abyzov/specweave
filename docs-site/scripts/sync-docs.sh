#!/bin/bash
# Sync documentation from .specweave/docs/public/ to docs-site/docs/
# This ensures the Docusaurus build has all latest content

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_SITE_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DOCS_SITE_ROOT")"

SOURCE_DIR="$PROJECT_ROOT/.specweave/docs/public"
TARGET_DIR="$DOCS_SITE_ROOT/docs"

echo "📚 Syncing documentation..."
echo "  Source: $SOURCE_DIR"
echo "  Target: $TARGET_DIR"
echo ""

# Ensure source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Ensure target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory not found: $TARGET_DIR"
    exit 1
fi

# Function to sync a directory
sync_directory() {
    local subdir=$1
    local source="$SOURCE_DIR/$subdir"
    local target="$TARGET_DIR/$subdir"

    if [ -d "$source" ]; then
        echo "  Syncing $subdir/..."

        # Create target directory if it doesn't exist
        mkdir -p "$target"

        # Use rsync to sync files (preserve timestamps, delete removed files)
        # Exclude .bak files and other temporary files
        rsync -av --delete \
            --exclude='*.bak' \
            --exclude='*.bak2' \
            --exclude='*.bak3' \
            --exclude='*~' \
            --exclude='.DS_Store' \
            --exclude='README.md' \
            "$source/" "$target/"

        echo "    ✓ Synced $subdir"
    else
        echo "    ⚠️  Skipped $subdir (not found in source)"
    fi
}

# Sync each documentation directory
sync_directory "guides"
sync_directory "glossary"
sync_directory "commands"
sync_directory "workflows"
sync_directory "overview"
sync_directory "learn"
sync_directory "integrations"
sync_directory "api"
sync_directory "reference"
sync_directory "scripts"

# Sync root-level files (faq.md, metrics.md, etc.)
echo "  Syncing root files..."
rsync -av \
    --exclude='README.md' \
    --exclude='*.bak*' \
    "$SOURCE_DIR"/*.md "$TARGET_DIR/" 2>/dev/null || true
echo "    ✓ Synced root files"

echo ""
echo "✅ Documentation sync complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run build' in docs-site/ to test the build"
echo "  2. Commit changes and push to trigger GitHub Pages deployment"
