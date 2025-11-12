#!/usr/bin/env node

/**
 * Detect Project CLI
 *
 * Detects which project (backend, frontend, mobile, etc.) a feature belongs to
 * based on keywords in the increment name or description.
 */

import { detectProjectFromIncrement } from '../../core/spec-detector.js';
import { ConfigManager } from '../../core/config-manager.js';

async function main() {
  try {
    const args = process.argv.slice(2);

    // Parse arguments
    let incrementName = '';
    let description = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--name' && i + 1 < args.length) {
        incrementName = args[i + 1];
      } else if (args[i] === '--description' && i + 1 < args.length) {
        description = args[i + 1];
      } else if (!args[i].startsWith('--')) {
        // Positional argument = increment name
        incrementName = args[i];
      }
    }

    if (!incrementName) {
      console.error('Usage: detect-project <increment-name> [--description <text>]');
      console.error('');
      console.error('Examples:');
      console.error('  detect-project "Add user authentication API"');
      console.error('  detect-project "Dark mode toggle" --description "Add dark mode to mobile app"');
      process.exit(1);
    }

    // Load config
    const configManager = new ConfigManager(process.cwd());
    const config = await configManager.loadAsync();

    // Detect project
    const project = detectProjectFromIncrement(incrementName, description, config);

    // Get project config for additional details
    const projectConfig = config.specs?.projects?.[project];

    // Output JSON
    console.log(JSON.stringify({
      project,
      projectName: projectConfig?.displayName || project,
      description: projectConfig?.description || '',
      confidence: calculateConfidence(incrementName, description, project, config)
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error detecting project:', error);
    process.exit(1);
  }
}

/**
 * Calculate confidence score for project detection
 */
function calculateConfidence(
  incrementName: string,
  description: string,
  detectedProject: string,
  config: any
): number {
  const text = `${incrementName} ${description}`.toLowerCase();
  let score = 0;

  // Check if any keywords matched
  const projectConfig = config.specs?.projects?.[detectedProject];
  const keywords = projectConfig?.keywords || [];

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.3; // Each keyword match = +30%
    }
  }

  // Check for common patterns
  if (detectedProject === 'backend' && (text.includes('api') || text.includes('server'))) {
    score += 0.2;
  }

  if (detectedProject === 'frontend' && (text.includes('ui') || text.includes('web'))) {
    score += 0.2;
  }

  if (detectedProject === 'mobile' && (text.includes('ios') || text.includes('android'))) {
    score += 0.2;
  }

  // Cap at 1.0 (100%)
  return Math.min(score, 1.0);
}

main();
