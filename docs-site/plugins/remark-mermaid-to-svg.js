/**
 * Remark plugin to replace Mermaid code blocks with SVG images
 *
 * This plugin:
 * - Finds ```mermaid code blocks in markdown
 * - Replaces them with <img> tags pointing to generated SVGs
 * - Supports dark mode with ThemedImage component
 * - Fallback to client-side Mermaid rendering if SVG not found
 */

const { visit } = require('unist-util-visit');
const fs = require('fs');
const path = require('path');

// Track diagram counters per file
const diagramCounters = new Map();

function remarkMermaidToSvg() {
  return (tree, file) => {
    const changes = [];
    const filePath = file.history[0];
    const fileName = path.basename(filePath, path.extname(filePath));

    // Reset counter for this file
    if (!diagramCounters.has(filePath)) {
      diagramCounters.set(filePath, 0);
    }

    visit(tree, 'code', (node, index, parent) => {
      // Only process mermaid code blocks
      if (node.lang !== 'mermaid') {
        return;
      }

      // Increment diagram counter for this file
      const counter = diagramCounters.get(filePath) + 1;
      diagramCounters.set(filePath, counter);

      // Generate diagram name (same logic as extraction script)
      const diagramName = counter === 1 ? fileName : `${fileName}-${counter}`;

      // SVG paths (relative to static/ directory)
      const svgLight = `/diagrams/${diagramName}.svg`;
      const svgDark = `/diagrams/${diagramName}-dark.svg`;

      // Check if SVG files exist
      const staticDir = path.join(__dirname, '../static');
      const svgLightPath = path.join(staticDir, 'diagrams', `${diagramName}.svg`);
      const svgDarkPath = path.join(staticDir, 'diagrams', `${diagramName}-dark.svg`);

      const lightExists = fs.existsSync(svgLightPath);
      const darkExists = fs.existsSync(svgDarkPath);

      if (!lightExists) {
        // SVG not found - keep original mermaid block for client-side rendering
        console.warn(`⚠️  SVG not found for ${diagramName}, using client-side rendering`);
        return;
      }

      // Replace mermaid block with MDX image component
      let replacement;

      if (darkExists) {
        // Use ThemedImage for dark mode support
        replacement = {
          type: 'jsx',
          value: `
<ThemedImage
  alt="${diagramName.replace(/-/g, ' ')} diagram"
  sources={{
    light: '${svgLight}',
    dark: '${svgDark}',
  }}
  style={{ width: '100%', maxWidth: '900px', margin: '20px auto', display: 'block' }}
/>`.trim()
        };
      } else {
        // Use simple img tag (light theme only)
        replacement = {
          type: 'jsx',
          value: `<img src="${svgLight}" alt="${diagramName.replace(/-/g, ' ')} diagram" style="width: 100%; max-width: 900px; margin: 20px auto; display: block;" />`
        };
      }

      // Store the replacement
      changes.push({ index, parent, replacement });
    });

    // Apply all replacements (in reverse order to preserve indices)
    changes.reverse().forEach(({ index, parent, replacement }) => {
      parent.children.splice(index, 1, replacement);
    });

    // Add ThemedImage import at the top of the file if we used it
    const hasThemedImage = changes.some(c => c.replacement.value.includes('ThemedImage'));
    if (hasThemedImage && tree.children.length > 0) {
      // Check if import already exists
      const hasImport = tree.children.some(node =>
        node.type === 'import' && node.value && node.value.includes('ThemedImage')
      );

      if (!hasImport) {
        tree.children.unshift({
          type: 'import',
          value: "import ThemedImage from '@theme/ThemedImage';"
        });
      }
    }
  };
}

module.exports = remarkMermaidToSvg;
