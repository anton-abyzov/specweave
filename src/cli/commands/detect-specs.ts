#!/usr/bin/env node

/**
 * Detect Specs CLI
 *
 * Detects all specs referenced in the current or specified increment.
 * Used by hooks to find which specs need to be synced to GitHub.
 */

import path from 'path';
import fs from 'fs-extra';
import { detectSpecsInIncrement } from '../../core/spec-detector.js';
import { ConfigManager } from '../../core/config-manager.js';

async function main() {
  try {
    const args = process.argv.slice(2);
    let incrementPath: string | undefined;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--increment' && i + 1 < args.length) {
        incrementPath = args[i + 1];
      }
    }

    // If no increment specified, detect current increment
    if (!incrementPath) {
      const incrementsDir = path.join(process.cwd(), '.specweave/increments');

      if (!fs.existsSync(incrementsDir)) {
        console.error('No .specweave/increments directory found');
        process.exit(1);
      }

      // Find most recent increment (excluding _backlog)
      const increments = fs
        .readdirSync(incrementsDir)
        .filter(f => {
          const stat = fs.statSync(path.join(incrementsDir, f));
          return stat.isDirectory() && f !== '_backlog';
        })
        .map(f => ({
          name: f,
          mtime: fs.statSync(path.join(incrementsDir, f)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (increments.length === 0) {
        console.error('No active increments found');
        process.exit(1);
      }

      incrementPath = path.join(incrementsDir, increments[0].name);
    } else {
      // Resolve relative path
      if (!path.isAbsolute(incrementPath)) {
        incrementPath = path.join(process.cwd(), '.specweave/increments', incrementPath);
      }
    }

    // Validate increment exists
    if (!fs.existsSync(incrementPath)) {
      console.error(`Increment not found: ${incrementPath}`);
      process.exit(1);
    }

    // Load config
    const configManager = new ConfigManager(process.cwd());
    const config = await configManager.loadAsync();

    // Detect specs
    const result = await detectSpecsInIncrement(incrementPath, config);

    // Output JSON
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error detecting specs:', error);
    process.exit(1);
  }
}

main();
