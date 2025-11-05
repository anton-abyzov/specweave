#!/usr/bin/env node
/**
 * Add glossary links to SpecWeave documentation
 *
 * Usage: node scripts/add-glossary-links.js <file-path>
 *
 * This script:
 * 1. Reads a markdown file
 * 2. Finds technical terms (first occurrence in each section)
 * 3. Adds glossary links
 * 4. Preserves formatting (code blocks, existing links, etc.)
 */

const fs = require('fs');
const path = require('path');

// Glossary term mappings
const GLOSSARY_TERMS = {
  // Case-sensitive exact matches
  'Brownfield': '/docs/glossary/terms/brownfield',
  'Greenfield': '/docs/glossary/terms/greenfield',
  'API': '/docs/glossary/terms/api',
  'REST': '/docs/glossary/terms/rest',
  'GraphQL': '/docs/glossary/terms/graphql',
  'Node.js': '/docs/glossary/terms/nodejs',
  'React': '/docs/glossary/terms/react',
  'Next.js': '/docs/glossary/terms/nextjs',
  'Angular': '/docs/glossary/terms/angular',
  'TypeScript': '/docs/glossary/terms/typescript',
  'Microservices': '/docs/glossary/terms/microservices',
  'E2E': '/docs/glossary/terms/e2e',
  'TDD': '/docs/glossary/terms/tdd',
  'BDD': '/docs/glossary/terms/bdd',
  'ADR': '/docs/glossary/terms/adr',
  'RFC': '/docs/glossary/terms/rfc',
  'IaC': '/docs/glossary/terms/iac',
  'Terraform': '/docs/glossary/terms/terraform',
  'Kubernetes': '/docs/glossary/terms/kubernetes',
  'K8s': '/docs/glossary/terms/kubernetes',
  'Docker': '/docs/glossary/terms/docker',
  'CI/CD': '/docs/glossary/terms/ci-cd',
  'Git': '/docs/glossary/terms/git',
  'JWT': '/docs/glossary/terms/jwt',
  'HIPAA': '/docs/glossary/terms/hipaa',
  'SOC 2': '/docs/glossary/terms/soc2',
  'FDA': '/docs/glossary/terms/fda',

  // Lowercase variants (for mid-sentence usage)
  'brownfield': '/docs/glossary/terms/brownfield',
  'greenfield': '/docs/glossary/terms/greenfield',
  'microservices': '/docs/glossary/terms/microservices',
};

/**
 * Check if a line is inside a code block
 */
function isInCodeBlock(lines, lineIndex) {
  let inCodeBlock = false;
  for (let i = 0; i <= lineIndex; i++) {
    if (lines[i].trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }
  }
  return inCodeBlock;
}

/**
 * Check if text already has a link
 */
function alreadyLinked(line, term) {
  // Check if term is already in a markdown link: [term](...)
  const linkPattern = new RegExp(`\\[${escapeRegex(term)}\\]\\([^)]+\\)`);
  return linkPattern.test(line);
}

/**
 * Escape regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Add glossary link to first occurrence of term in section
 */
function addGlossaryLinks(content) {
  const lines = content.split('\n');
  const processedSections = new Set(); // Track which terms in which sections
  let currentSection = 'intro';

  const result = lines.map((line, index) => {
    // Track sections (## headers reset term tracking)
    if (line.startsWith('##')) {
      currentSection = line.toLowerCase().replace(/[^a-z0-9]/g, '-');
      processedSections.clear(); // Reset for new section
    }

    // Skip code blocks
    if (isInCodeBlock(lines, index)) {
      return line;
    }

    // Skip lines that are links themselves
    if (line.trim().startsWith('[') || line.includes('](/')) {
      return line;
    }

    // Try to add links for each term
    let modifiedLine = line;
    for (const [term, link] of Object.entries(GLOSSARY_TERMS)) {
      const sectionKey = `${currentSection}-${term}`;

      // Skip if already processed in this section
      if (processedSections.has(sectionKey)) {
        continue;
      }

      // Skip if already linked
      if (alreadyLinked(modifiedLine, term)) {
        continue;
      }

      // Check if term exists in line (whole word match)
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');
      if (regex.test(modifiedLine)) {
        // Add link to FIRST occurrence only
        modifiedLine = modifiedLine.replace(
          regex,
          `[${term}](${link})`
        );
        processedSections.add(sectionKey);
      }
    }

    return modifiedLine;
  });

  return result.join('\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node add-glossary-links.js <file-path>');
    console.error('Example: node add-glossary-links.js .specweave/docs/public/faq.md');
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Processing: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const updated = addGlossaryLinks(content);

  // Write back
  fs.writeFileSync(filePath, updated, 'utf-8');

  console.log(`✓ Added glossary links to: ${filePath}`);
}

main();
