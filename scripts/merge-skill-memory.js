#!/usr/bin/env node

/**
 * Merge Skill Memory - CLI wrapper for skill-memory-merger.ts
 *
 * Usage:
 *   node scripts/merge-skill-memory.js <userMemoryPath> <defaultMemoryPath> <outputPath>
 *
 * Example:
 *   node scripts/merge-skill-memory.js \
 *     ~/.claude/plugins/specweave/skills/pm/MEMORY.md \
 *     /tmp/marketplace/skills/pm/MEMORY.md \
 *     ~/.claude/plugins/specweave/skills/pm/MEMORY.md
 *
 * This script:
 * 1. Reads user MEMORY.md (existing learnings to preserve)
 * 2. Reads default MEMORY.md (new learnings from marketplace)
 * 3. Merges them intelligently (deduplicates, preserves user learnings)
 * 4. Writes merged result to output path
 */

import { readMemoryFile, mergeMemoryFiles, writeMemoryFile, parseMemoryFile } from '../dist/core/reflection/skill-memory-merger.js';
import * as fs from 'fs';
import * as path from 'path';

// Colors for output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

/**
 * Print usage and exit
 */
function printUsage() {
  console.log('Usage: node scripts/merge-skill-memory.js <userMemoryPath> <defaultMemoryPath> <outputPath>');
  console.log('');
  console.log('Arguments:');
  console.log('  userMemoryPath     - Path to existing user MEMORY.md (to preserve)');
  console.log('  defaultMemoryPath  - Path to new default MEMORY.md (from marketplace)');
  console.log('  outputPath         - Path to write merged MEMORY.md');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/merge-skill-memory.js \\');
  console.log('    ~/.claude/plugins/specweave/skills/pm/MEMORY.md \\');
  console.log('    /tmp/marketplace/skills/pm/MEMORY.md \\');
  console.log('    ~/.claude/plugins/specweave/skills/pm/MEMORY.md');
  process.exit(1);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    printUsage();
  }

  const [userMemoryPath, defaultMemoryPath, outputPath] = args;

  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${BLUE}  Skill Memory Merge${NC}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log('');
  console.log(`${BLUE}User memory:    ${userMemoryPath}${NC}`);
  console.log(`${BLUE}Default memory: ${defaultMemoryPath}${NC}`);
  console.log(`${BLUE}Output:         ${outputPath}${NC}`);
  console.log('');

  try {
    // Read user memory
    console.log(`${YELLOW}📖 Reading user memory...${NC}`);
    const userMemory = readMemoryFile(userMemoryPath);
    if (userMemory) {
      console.log(`${GREEN}✓ Found ${userMemory.learnings.length} user learning(s)${NC}`);
    } else {
      console.log(`${YELLOW}⚠ No user memory found (will use defaults only)${NC}`);
    }

    // Read default memory
    console.log(`${YELLOW}📖 Reading default memory...${NC}`);
    const defaultMemory = readMemoryFile(defaultMemoryPath);
    if (defaultMemory) {
      console.log(`${GREEN}✓ Found ${defaultMemory.learnings.length} default learning(s)${NC}`);
    } else {
      console.log(`${YELLOW}⚠ No default memory found (will preserve user learnings only)${NC}`);
    }

    // Merge
    console.log(`${YELLOW}🔄 Merging memories...${NC}`);
    const result = mergeMemoryFiles(userMemory, defaultMemory);

    if (!result.success) {
      console.error(`${RED}✗ Merge failed${NC}`);
      if (result.warnings.length > 0) {
        console.error(`${YELLOW}Warnings:${NC}`);
        result.warnings.forEach(w => console.error(`  ${YELLOW}⚠${NC} ${w}`));
      }
      process.exit(1);
    }

    console.log(`${GREEN}✓ Merge successful${NC}`);
    console.log(`  ${GREEN}Preserved: ${result.preserved} learning(s)${NC}`);
    console.log(`  ${GREEN}Added:     ${result.added} learning(s)${NC}`);
    console.log(`  ${GREEN}Deduped:   ${result.deduped} duplicate(s)${NC}`);

    // Write output
    console.log(`${YELLOW}💾 Writing merged memory...${NC}`);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const mergedMemory = parseMemoryFile(result.content);
    writeMemoryFile(outputPath, mergedMemory);
    console.log(`${GREEN}✓ Wrote merged memory to ${outputPath}${NC}`);

    console.log('');
    console.log(`${GREEN}✅ Merge complete!${NC}`);
    console.log('');

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error(`${RED}✗ Error during merge:${NC}`);
    console.error(`${RED}  ${error.message}${NC}`);
    if (error.stack) {
      console.error(`${RED}${error.stack}${NC}`);
    }

    // Preserve user data on error
    if (fs.existsSync(userMemoryPath) && userMemoryPath !== outputPath) {
      console.log(`${YELLOW}⚠ Preserving user memory (copying to output)${NC}`);
      try {
        fs.copyFileSync(userMemoryPath, outputPath);
        console.log(`${GREEN}✓ User memory preserved${NC}`);
      } catch (copyError) {
        console.error(`${RED}✗ Failed to preserve user memory: ${copyError.message}${NC}`);
      }
    }

    process.exit(1);
  }
}

// Run main function
main();
