#!/usr/bin/env node

/**
 * Extract embedded Mermaid diagrams from markdown files,
 * generate SVG files, and replace with image references.
 *
 * Usage: node scripts/convert-mermaid-to-svg.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Configuration
const DOCS_ROOT = path.join(__dirname, '../.specweave/docs/internal');
const DIAGRAMS_DIR = path.join(DOCS_ROOT, 'architecture/diagrams');
const MERMAID_CONFIG = path.join(__dirname, '../.mermaidrc.json');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

// Extract mermaid blocks from markdown content
function extractMermaidBlocks(content, filePath) {
  const blocks = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      index,
      content: match[1].trim(),
      fullMatch: match[0],
      position: match.index,
    });
    index++;
  }

  return blocks;
}

// Generate a unique filename for a diagram
function generateDiagramFilename(filePath, blockIndex) {
  const relPath = path.relative(DOCS_ROOT, filePath);
  const sanitized = relPath
    .replace(/\//g, '-')
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();

  return `${sanitized}-${blockIndex}`;
}

// Generate SVG from .mmd file using safe execFile
function generateSVG(mmdPath, svgPath) {
  try {
    // Use execFileSync with array of arguments (no shell injection risk)
    execFileSync('npx', [
      'mmdc',
      '-i', mmdPath,
      '-o', svgPath,
      '-c', MERMAID_CONFIG,
      '-b', 'transparent',
      '--quiet'
    ], { stdio: 'pipe' });
    return true;
  } catch (error) {
    log(colors.red, `  ✗ Failed to generate SVG: ${error.message}`);
    return false;
  }
}

// Process a single markdown file
function processMarkdownFile(filePath) {
  log(colors.blue, `\n📄 Processing: ${path.relative(DOCS_ROOT, filePath)}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = extractMermaidBlocks(content, filePath);

  if (blocks.length === 0) {
    log(colors.yellow, '  ⚠  No mermaid blocks found');
    return { processed: 0, replaced: 0 };
  }

  log(colors.blue, `  Found ${blocks.length} mermaid diagram(s)`);

  let modifiedContent = content;
  let replacedCount = 0;

  // Process blocks in reverse order to maintain positions
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const filename = generateDiagramFilename(filePath, block.index);
    const mmdPath = path.join(DIAGRAMS_DIR, `${filename}.mmd`);
    const svgPath = path.join(DIAGRAMS_DIR, `${filename}.svg`);

    // Write .mmd file
    fs.writeFileSync(mmdPath, block.content + '\n', 'utf8');
    log(colors.green, `  ✓ Created: ${filename}.mmd`);

    // Generate SVG
    if (generateSVG(mmdPath, svgPath)) {
      log(colors.green, `  ✓ Generated: ${filename}.svg`);

      // Calculate relative path from markdown file to SVG
      const markdownDir = path.dirname(filePath);
      const relativeSvgPath = path.relative(markdownDir, svgPath).replace(/\\/g, '/');

      // Replace mermaid block with image reference
      const replacement = `![${filename}](${relativeSvgPath})`;

      modifiedContent =
        modifiedContent.slice(0, block.position) +
        replacement +
        modifiedContent.slice(block.position + block.fullMatch.length);

      replacedCount++;
      log(colors.green, `  ✓ Replaced with: ![${filename}](${relativeSvgPath})`);
    }
  }

  // Write modified content back
  if (replacedCount > 0) {
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    log(colors.green, `  ✅ Updated: ${replacedCount}/${blocks.length} diagrams replaced`);
  }

  return { processed: blocks.length, replaced: replacedCount };
}

// Find all markdown files with mermaid blocks
function findMarkdownFilesWithMermaid() {
  const files = [];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('```mermaid')) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(DOCS_ROOT);
  return files;
}

// Main execution
function main() {
  log(colors.blue, '🎨 Mermaid Diagram Converter');
  log(colors.blue, '━'.repeat(60));

  // Ensure diagrams directory exists
  if (!fs.existsSync(DIAGRAMS_DIR)) {
    fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
  }

  // Check for mermaid-cli
  try {
    execFileSync('npx', ['mmdc', '--version'], { stdio: 'pipe' });
  } catch (error) {
    log(colors.red, '\n❌ Error: @mermaid-js/mermaid-cli not installed');
    log(colors.yellow, '   Run: npm install --save-dev @mermaid-js/mermaid-cli');
    process.exit(1);
  }

  // Find all markdown files with mermaid blocks
  const files = findMarkdownFilesWithMermaid();
  log(colors.blue, `\nFound ${files.length} file(s) with mermaid diagrams\n`);

  if (files.length === 0) {
    log(colors.yellow, 'No mermaid diagrams to convert');
    return;
  }

  // Process each file
  let totalProcessed = 0;
  let totalReplaced = 0;

  for (const file of files) {
    const result = processMarkdownFile(file);
    totalProcessed += result.processed;
    totalReplaced += result.replaced;
  }

  // Summary
  log(colors.blue, '\n' + '━'.repeat(60));
  log(colors.green, `✅ Conversion complete!`);
  log(colors.green, `   Processed: ${totalProcessed} diagram(s)`);
  log(colors.green, `   Replaced: ${totalReplaced} diagram(s)`);
  log(colors.blue, '━'.repeat(60));

  log(colors.yellow, '\n💡 Tips:');
  log(colors.yellow, '   • Commit both .mmd and .svg files');
  log(colors.yellow, '   • Diagrams are now static images (better performance)');
  log(colors.yellow, '   • Edit .mmd files and re-run this script to update');
  log(colors.yellow, '   • Restart docs server to see changes\n');
}

// Run
try {
  main();
} catch (error) {
  log(colors.red, `\n❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
