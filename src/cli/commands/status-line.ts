/**
 * Status Line CLI Command
 *
 * Renders the current increment status line.
 * Can be used standalone or integrated with status line displays.
 *
 * Usage:
 *   specweave status-line              # Render status line
 *   specweave status-line --json       # Output JSON
 *   specweave status-line --clear      # Clear cache
 */

import { Command } from 'commander';
import { StatusLineManager } from '../../core/status-line/status-line-manager.js';
import * as path from 'path';
import * as fs from 'fs';

export function registerStatusLineCommand(program: Command): void {
  program
    .command('status-line')
    .description('Display current increment status line')
    .option('--json', 'Output JSON format')
    .option('--clear', 'Clear status line cache')
    .option('--config <path>', 'Path to config file')
    .action(async (options) => {
      try {
        const rootDir = process.cwd();

        // Load config if specified
        let config = {};
        if (options.config) {
          const configPath = path.resolve(options.config);
          if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const fullConfig = JSON.parse(configContent);
            config = fullConfig.statusLine || {};
          }
        } else {
          // Try default config location
          const defaultConfigPath = path.join(rootDir, '.specweave/config.json');
          if (fs.existsSync(defaultConfigPath)) {
            const configContent = fs.readFileSync(defaultConfigPath, 'utf8');
            const fullConfig = JSON.parse(configContent);
            config = fullConfig.statusLine || {};
          }
        }

        const manager = new StatusLineManager(rootDir, config);

        // Clear cache if requested
        if (options.clear) {
          manager.clearCache();
          console.log('✅ Status line cache cleared');
          return;
        }

        // Output JSON format
        if (options.json) {
          const cache = manager.getCacheData();
          if (!cache) {
            console.log(JSON.stringify({ error: 'No active increment' }, null, 2));
            process.exit(1);
          }
          console.log(JSON.stringify(cache, null, 2));
          return;
        }

        // Render status line
        const statusLine = manager.render();
        if (!statusLine) {
          console.log('No active increment');
          process.exit(1);
        }

        console.log(statusLine);
      } catch (error) {
        console.error('❌ Error rendering status line:', error);
        process.exit(1);
      }
    });
}
