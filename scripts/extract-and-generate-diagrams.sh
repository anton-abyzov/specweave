#!/usr/bin/env bash

#
# Extract inline Mermaid diagrams from markdown files and generate SVGs
#
# This script:
# - Scans all markdown files in docs/public/
# - Extracts ```mermaid code blocks
# - Generates SVG files for each diagram
# - Places SVGs in static/diagrams/ for Docusaurus
#
# Usage:
#   npm run generate:all-diagrams
#   # or
#   ./scripts/extract-and-generate-diagrams.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Get project root (script is in scripts/ folder)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_SOURCE="$PROJECT_ROOT/.specweave/docs/public"
DIAGRAMS_OUTPUT="$PROJECT_ROOT/docs-site/static/diagrams"
TEMP_DIR=$(mktemp -d)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎨 Extracting and Generating Diagrams from Markdown${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check dependencies
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! npx mmdc --version &> /dev/null; then
    echo -e "${RED}❌ Error: @mermaid-js/mermaid-cli not installed.${NC}"
    echo -e "${YELLOW}   Run: npm install --save-dev @mermaid-js/mermaid-cli${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$DIAGRAMS_OUTPUT"

echo -e "${BLUE}📁 Scanning markdown files in: ${DOCS_SOURCE}${NC}"
echo -e "${BLUE}📦 Output directory: ${DIAGRAMS_OUTPUT}${NC}"
echo ""

# Find all markdown files
MD_FILES=$(find "$DOCS_SOURCE" -name "*.md" -type f 2>/dev/null || echo "")

if [ -z "$MD_FILES" ]; then
    echo -e "${YELLOW}⚠️  No markdown files found in ${DOCS_SOURCE}${NC}"
    exit 0
fi

TOTAL_FILES=$(echo "$MD_FILES" | wc -l | tr -d ' ')
TOTAL_DIAGRAMS=0
SUCCESS=0
FAILED=0

echo -e "${BLUE}Found ${TOTAL_FILES} markdown file(s)${NC}"
echo ""

# Process each markdown file
while IFS= read -r md_file; do
    # Get relative path for display
    REL_PATH="${md_file#$DOCS_SOURCE/}"
    BASE_NAME=$(basename "$md_file" .md)
    DIR_NAME=$(dirname "$REL_PATH")

    # Extract mermaid blocks using awk
    DIAGRAM_COUNT=0
    IN_MERMAID=0
    CURRENT_DIAGRAM=""

    while IFS= read -r line; do
        if [[ "$line" =~ ^\`\`\`mermaid$ ]]; then
            IN_MERMAID=1
            CURRENT_DIAGRAM=""
            DIAGRAM_COUNT=$((DIAGRAM_COUNT + 1))
        elif [[ "$line" =~ ^\`\`\`$ ]] && [ $IN_MERMAID -eq 1 ]; then
            IN_MERMAID=0

            # Create unique filename
            if [ $DIAGRAM_COUNT -eq 1 ]; then
                DIAGRAM_NAME="${BASE_NAME}"
            else
                DIAGRAM_NAME="${BASE_NAME}-${DIAGRAM_COUNT}"
            fi

            # Save to temp .mmd file
            MMD_FILE="$TEMP_DIR/${DIAGRAM_NAME}.mmd"
            echo "$CURRENT_DIAGRAM" > "$MMD_FILE"

            # Output SVG paths
            SVG_LIGHT="${DIAGRAMS_OUTPUT}/${DIAGRAM_NAME}.svg"
            SVG_DARK="${DIAGRAMS_OUTPUT}/${DIAGRAM_NAME}-dark.svg"

            echo -e "${PURPLE}📄 ${REL_PATH} → diagram #${DIAGRAM_COUNT}${NC}"

            # Generate light theme SVG
            if npx mmdc -i "$MMD_FILE" \
                        -o "$SVG_LIGHT" \
                        -c "$PROJECT_ROOT/.mermaidrc.json" \
                        -b transparent \
                        --quiet 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} Generated: /diagrams/${DIAGRAM_NAME}.svg (light)"
            else
                echo -e "  ${RED}✗${NC} Failed to generate light theme SVG"
                FAILED=$((FAILED + 1))
                continue
            fi

            # Generate dark theme SVG
            DARK_CONFIG=$(mktemp)
            cat "$PROJECT_ROOT/.mermaidrc.json" | \
                sed 's/"darkMode": false/"darkMode": true/' | \
                sed 's/"background": "#fff"/"background": "#1e1e1e"/' | \
                sed 's/"mainBkg": "#fff"/"mainBkg": "#1e1e1e"/' | \
                sed 's/"secondBkg": "#f5f5f5"/"secondBkg": "#2d2d2d"/' | \
                sed 's/"primaryTextColor": "#000"/"primaryTextColor": "#fff"/' | \
                sed 's/"mainContrastColor": "#000"/"mainContrastColor": "#fff"/' \
                > "$DARK_CONFIG"

            if npx mmdc -i "$MMD_FILE" \
                        -o "$SVG_DARK" \
                        -c "$DARK_CONFIG" \
                        -b transparent \
                        --quiet 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} Generated: /diagrams/${DIAGRAM_NAME}-dark.svg (dark)"
                SUCCESS=$((SUCCESS + 1))
                TOTAL_DIAGRAMS=$((TOTAL_DIAGRAMS + 1))
            else
                echo -e "  ${YELLOW}⚠${NC}  Failed to generate dark theme (light theme still created)"
                SUCCESS=$((SUCCESS + 1))
                TOTAL_DIAGRAMS=$((TOTAL_DIAGRAMS + 1))
            fi

            rm -f "$DARK_CONFIG"
            echo ""

        elif [ $IN_MERMAID -eq 1 ]; then
            CURRENT_DIAGRAM+="$line"$'\n'
        fi
    done < "$md_file"

done <<< "$MD_FILES"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Also generate SVGs for standalone .mmd files
echo -e "${BLUE}🔍 Generating SVGs for standalone .mmd files...${NC}"
bash "$PROJECT_ROOT/scripts/generate-diagram-svgs.sh" > /dev/null 2>&1 || true
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Success! Generated ${TOTAL_DIAGRAMS} inline diagram(s) + standalone .mmd files${NC}"
else
    echo -e "${YELLOW}⚠️  Generated ${SUCCESS}/${TOTAL_DIAGRAMS} diagram(s) (${FAILED} failed)${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show generated files
if [ $TOTAL_DIAGRAMS -gt 0 ]; then
    echo -e "${BLUE}Generated diagram files:${NC}"
    ls -lh "$DIAGRAMS_OUTPUT"/*.svg 2>/dev/null | awk '{printf "  '${GREEN}'•'${NC}' /diagrams/%s (%s)\n", $9, $5}' | sed "s|$DIAGRAMS_OUTPUT/||g" || echo -e "  ${YELLOW}No files found${NC}"
    echo ""
fi

echo -e "${BLUE}💡 Tips:${NC}"
echo -e "  • SVGs are in: docs-site/static/diagrams/"
echo -e "  • Reference in MDX: <img src='/diagrams/introduction.svg' alt='Diagram' />"
echo -e "  • Or use ThemedImage for dark mode support"
echo -e "  • Run 'npm run docs:build:public' to build the site"
echo ""

exit 0
