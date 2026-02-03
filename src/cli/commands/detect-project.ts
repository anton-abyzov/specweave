/**
 * Detect Project CLI
 *
 * Two modes of operation:
 * 1. FILE-BASED (default): Analyzes project files to detect type (React, Express, K8s, etc.)
 *    and suggests plugins to install.
 *    Usage: specweave detect-project [path]
 *
 * 2. NAME-BASED (legacy): Detects which project config an increment name belongs to.
 *    Usage: specweave detect-project --name "increment name"
 *
 * @module cli/commands/detect-project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { detectProjectType, getRecommendedPlugins } from '../../core/lazy-loading/project-detector.js';
import { detectProjectFromIncrement } from '../../core/specs/spec-detector.js';
import { ConfigManager } from '../../core/config-manager.js';
import { logInfo, logError } from '../../core/lazy-loading/failure-logger.js';

export interface DetectProjectOptions {
  /** Increment name for legacy name-based detection */
  name?: string;
  /** Description for legacy name-based detection */
  description?: string;
  /** Also install detected plugins after detection */
  install?: boolean;
  /** Silent mode - no stdout output (for hooks) */
  silent?: boolean;
}

export interface DetectProjectResult {
  /** Detection mode used */
  mode: 'file-based' | 'name-based';
  /** Detected project types (react, express, etc.) */
  types: string[];
  /** Recommended plugins to install */
  plugins: string[];
  /** Detection latency in milliseconds */
  latencyMs?: number;
  /** Whether plugins were installed (when --install used) */
  installed?: boolean;
  /** Installation result message (when --install used) */
  installMessage?: string;
  /** Legacy: detected project name from config (name-based mode only) */
  project?: string;
  /** Legacy: project display name (name-based mode only) */
  projectName?: string;
  /** Legacy: confidence score (name-based mode only) */
  confidence?: number;
}

/**
 * Detect project type from files (file-based mode)
 */
async function detectFromFiles(
  projectPath: string,
  options: DetectProjectOptions
): Promise<DetectProjectResult> {
  const detection = detectProjectType(projectPath);

  const result: DetectProjectResult = {
    mode: 'file-based',
    types: detection.types,
    plugins: detection.plugins,
    latencyMs: detection.latencyMs,
  };

  // Plugin installation removed (v1.0.210) - Claude Code manages plugins directly
  if (options.install && detection.plugins.length > 0) {
    result.installed = false;
    result.installMessage = 'Plugin auto-install removed in v1.0.210. Use: claude plugin install <name>@specweave';

    logInfo('detect-project', 'Plugin install requested but disabled', {
      types: detection.types,
      plugins: detection.plugins,
    });
  }

  return result;
}

/**
 * Detect project from increment name (name-based mode - legacy)
 */
async function detectFromName(
  incrementName: string,
  description: string,
  options: DetectProjectOptions
): Promise<DetectProjectResult> {
  const configManager = new ConfigManager(process.cwd());
  const config = await configManager.loadAsync();

  const project = detectProjectFromIncrement(incrementName, description, config);
  const projectConfig = config.specs?.projects?.[project];

  // Calculate confidence
  const text = `${incrementName} ${description}`.toLowerCase();
  let confidence = 0;
  const keywords = projectConfig?.keywords || [];

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      confidence += 0.3;
    }
  }

  if (project === 'backend' && (text.includes('api') || text.includes('server'))) {
    confidence += 0.2;
  }
  if (project === 'frontend' && (text.includes('ui') || text.includes('web'))) {
    confidence += 0.2;
  }
  if (project === 'mobile' && (text.includes('ios') || text.includes('android'))) {
    confidence += 0.2;
  }

  confidence = Math.min(confidence, 1.0);

  return {
    mode: 'name-based',
    types: [project],
    plugins: [],
    project,
    projectName: projectConfig?.displayName || project,
    confidence,
  };
}

/**
 * Main detect-project command handler
 */
export async function detectProjectCommand(
  pathOrNothing: string | undefined,
  options: DetectProjectOptions = {}
): Promise<DetectProjectResult> {
  let result: DetectProjectResult;

  // Determine mode based on options
  if (options.name) {
    // Legacy name-based detection
    result = await detectFromName(options.name, options.description || '', options);
  } else {
    // File-based detection (default)
    const projectPath = pathOrNothing || process.cwd();
    result = await detectFromFiles(projectPath, options);
  }

  // Output result (unless silent mode)
  if (!options.silent) {
    console.log(JSON.stringify(result, null, 2));
  }

  // Log for analytics
  logInfo('detect-project', 'Detection complete', {
    mode: result.mode,
    types: result.types,
    plugins: result.plugins,
    installed: result.installed,
  });

  return result;
}

/**
 * Create the detect-project command for Commander
 */
export function createDetectProjectCommand(): Command {
  const cmd = new Command('detect-project');

  cmd
    .description('Detect project type from files and suggest plugins to install')
    .argument('[path]', 'Path to project root (defaults to current directory)')
    .option('--name <name>', 'Increment name for legacy name-based detection')
    .option('--description <text>', 'Description for legacy name-based detection')
    .option('--install', 'Also install detected plugins after detection')
    .option('--silent', 'Silent mode - no stdout output (for hooks)')
    .action(async (path: string | undefined, options: DetectProjectOptions) => {
      try {
        const result = await detectProjectCommand(path, options);

        // Exit code: 0 if types detected, 1 if none
        process.exit(result.types.length > 0 ? 0 : 1);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (!options.silent) {
          console.error(chalk.red(`Error: ${err.message}`));
        }

        logError('detect-project', 'Command failed', err);
        process.exit(1);
      }
    });

  return cmd;
}

// Export main for backward compatibility (direct script execution)
// Note: When used as a CLI command via specweave, the action handler is used instead
export { detectProjectCommand as main };
