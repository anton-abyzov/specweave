#!/usr/bin/env node

/**
 * Deduplication Check Wrapper
 *
 * Wraps CommandDeduplicator for bash hook integration.
 * Uses ES modules properly for package.json "type": "module"
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Change to project root for proper module resolution
process.chdir(projectRoot);

async function main() {
  try {
    // Read input JSON from stdin
    const inputRaw = readFileSync(0, 'utf-8');
    const input = JSON.parse(inputRaw);
    const prompt = input.prompt || '';

    // Extract command from prompt
    const commandMatch = prompt.match(/^\/[a-z0-9:-]+/);
    if (!commandMatch) {
      // Not a slash command, approve
      console.log('OK');
      return;
    }

    const command = commandMatch[0];
    const args = prompt.replace(command, '').trim().split(/\s+/).filter(Boolean);

    // Dynamic import of CommandDeduplicator
    const { CommandDeduplicator } = await import('../dist/src/core/deduplication/command-deduplicator.js');

    // Respect SPECWEAVE_ROOT env var for testing (falls back to project root)
    const effectiveRoot = process.env.SPECWEAVE_ROOT || projectRoot;
    const dedup = new CommandDeduplicator({ debug: false }, effectiveRoot);

    // Check for duplicate
    const isDuplicate = await dedup.checkDuplicate(command, args);

    if (isDuplicate) {
      const stats = dedup.getStats();
      // Add lastCommand to stats for error message
      const statsWithCommand = { ...stats, lastCommand: command };
      console.log('DUPLICATE');
      console.log(JSON.stringify(statsWithCommand));
    } else {
      // Record invocation
      await dedup.recordInvocation(command, args);
      console.log('OK');
    }
  } catch (e) {
    // Fail-open on error
    console.error('Error in deduplication:', e.message);
    console.log('OK');
  }
}

main();
