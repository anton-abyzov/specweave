#!/usr/bin/env bash

#
# Generate SVG files from all Mermaid (.mmd) diagrams
#
# This script:
# - Finds all .mmd files in the project
# - Generates SVG versions (light and dark themes)
# - Places SVGs next to source .mmd files
# - Uses .mermaidrc.json for consistent styling
#
# Usage:
#   npm run generate:diagrams
#   # or
#   ./scripts/generate-diagram-svgs.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root (script is in scripts/ folder)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🎨 Generating SVG diagrams from Mermaid files...${NC}"
echo ""

# Check if mermaid-cli is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! npx mmdc --version &> /dev/null; then
    echo -e "${RED}❌ Error: @mermaid-js/mermaid-cli not installed.${NC}"
    echo -e "${YELLOW}   Run: npm install --save-dev @mermaid-js/mermaid-cli${NC}"
    exit 1
fi

# Find all .mmd files
MMD_FILES=$(find "$PROJECT_ROOT" -name "*.mmd" -type f | grep -v node_modules | grep -v .git)

if [ -z "$MMD_FILES" ]; then
    echo -e "${YELLOW}⚠️  No .mmd files found in project${NC}"
    exit 0
fi

# Count files
TOTAL_FILES=$(echo "$MMD_FILES" | wc -l | tr -d ' ')
CURRENT=0
SUCCESS=0
FAILED=0

echo -e "${BLUE}Found ${TOTAL_FILES} Mermaid diagram(s)${NC}"
echo ""

# Process each .mmd file
while IFS= read -r mmd_file; do
    CURRENT=$((CURRENT + 1))

    # Get relative path for display
    REL_PATH="${mmd_file#$PROJECT_ROOT/}"

    # Get directory and filename
    DIR=$(dirname "$mmd_file")
    FILENAME=$(basename "$mmd_file" .mmd)

    # Output SVG paths
    SVG_LIGHT="${DIR}/${FILENAME}.svg"
    SVG_DARK="${DIR}/${FILENAME}-dark.svg"

    echo -e "${BLUE}[${CURRENT}/${TOTAL_FILES}]${NC} Processing: ${REL_PATH}"

    # Generate light theme SVG
    if npx mmdc -i "$mmd_file" \
                -o "$SVG_LIGHT" \
                -c "$PROJECT_ROOT/.mermaidrc.json" \
                -b transparent \
                --quiet 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Generated: ${FILENAME}.svg (light theme)"
    else
        echo -e "  ${RED}✗${NC} Failed to generate light theme SVG"
        FAILED=$((FAILED + 1))
        continue
    fi

    # Generate dark theme SVG
    # Create temporary dark theme config
    DARK_CONFIG=$(mktemp)
    cat "$PROJECT_ROOT/.mermaidrc.json" | \
        sed 's/"darkMode": false/"darkMode": true/' | \
        sed 's/"background": "#fff"/"background": "#1e1e1e"/' | \
        sed 's/"mainBkg": "#fff"/"mainBkg": "#1e1e1e"/' | \
        sed 's/"secondBkg": "#f5f5f5"/"secondBkg": "#2d2d2d"/' | \
        sed 's/"primaryTextColor": "#000"/"primaryTextColor": "#fff"/' | \
        sed 's/"mainContrastColor": "#000"/"mainContrastColor": "#fff"/' \
        > "$DARK_CONFIG"

    if npx mmdc -i "$mmd_file" \
                -o "$SVG_DARK" \
                -c "$DARK_CONFIG" \
                -b transparent \
                --quiet 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Generated: ${FILENAME}-dark.svg (dark theme)"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC}  Failed to generate dark theme SVG (light theme still created)"
        SUCCESS=$((SUCCESS + 1))
    fi

    # Cleanup temp config
    rm -f "$DARK_CONFIG"

    echo ""
done <<< "$MMD_FILES"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Success! Generated SVGs for ${SUCCESS}/${TOTAL_FILES} diagram(s)${NC}"
else
    echo -e "${YELLOW}⚠️  Generated SVGs for ${SUCCESS}/${TOTAL_FILES} diagram(s) (${FAILED} failed)${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show generated files
echo -e "${BLUE}Generated files:${NC}"
find "$PROJECT_ROOT" -name "*.svg" -type f | grep -v node_modules | grep -v .git | while read -r svg_file; do
    REL_PATH="${svg_file#$PROJECT_ROOT/}"
    SIZE=$(du -h "$svg_file" | cut -f1)
    echo -e "  ${GREEN}•${NC} ${REL_PATH} (${SIZE})"
done

echo ""
echo -e "${BLUE}💡 Tip: Commit both .mmd and .svg files to git${NC}"
echo -e "${BLUE}   Use <img src=\"path/to/diagram.svg\"> in Markdown${NC}"
echo ""

exit 0
