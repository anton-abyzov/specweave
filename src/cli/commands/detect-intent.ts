/**
 * Detect Intent CLI Command
 *
 * Detects SpecWeave intent from a user prompt and optionally installs matching plugins.
 * Used by hooks for automatic plugin loading on user-prompt-submit.
 *
 * Usage:
 *   specweave detect-intent "prompt text"                    # Returns JSON with detected plugins
 *   specweave detect-intent "prompt text" --install          # Also installs detected plugins
 *   specweave detect-intent "prompt text" --install --silent # Silent mode for hooks
 *
 * @module cli/commands/detect-intent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { detectSpecWeaveIntent, determinePlugins } from '../../core/lazy-loading/keyword-detector.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';
import { logInfo, logError, logWarn } from '../../core/lazy-loading/failure-logger.js';

/** Default confidence threshold for auto-install (T-017) */
const DEFAULT_INSTALL_THRESHOLD = 0.6;

export interface DetectIntentOptions {
  /** Also install detected plugins after detection */
  install?: boolean;
  /** Silent mode - no stdout output (for hooks) */
  silent?: boolean;
  /** Output format - json or text */
  json?: boolean;
  /** Confidence threshold for auto-install (0-1, default 0.6) */
  threshold?: number;
}

export interface DetectIntentResult {
  /** Whether any plugins were detected */
  detected: boolean;
  /** List of detected plugin names to install */
  plugins: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Detection latency in milliseconds */
  latencyMs?: number;
  /** Whether plugins were installed (when --install used) */
  installed?: boolean;
  /** Installation result message (when --install used) */
  installMessage?: string;
}

/**
 * Detect intent from a user prompt
 *
 * @param prompt - User's input prompt to analyze
 * @param options - Command options
 * @returns Detection result with plugins to install
 */
export async function detectIntentCommand(
  prompt: string,
  options: DetectIntentOptions = {}
): Promise<DetectIntentResult> {
  const startTime = performance.now();

  // Run detection
  const detection = detectSpecWeaveIntent(prompt);

  // Map matched keywords to plugins
  const plugins = detection.suggestedPlugins;

  const result: DetectIntentResult = {
    detected: detection.detected,
    plugins,
    confidence: detection.confidence,
    matchedKeywords: detection.matchedKeywords,
    latencyMs: detection.latencyMs,
  };

  // Handle installation if requested (T-017: confidence threshold check)
  const installThreshold = options.threshold ?? DEFAULT_INSTALL_THRESHOLD;

  if (options.install && plugins.length > 0) {
    // T-017: Only auto-install if confidence meets threshold
    if (detection.confidence < installThreshold) {
      result.installed = false;
      result.installMessage = `Confidence ${detection.confidence.toFixed(2)} below threshold ${installThreshold} - plugins suggested but not installed`;

      logWarn('detect-intent', 'Low confidence - skipping install', {
        confidence: detection.confidence,
        threshold: installThreshold,
        plugins,
        matchedKeywords: detection.matchedKeywords,
      });
    } else {
      try {
        const cacheManager = new PluginCacheManager();

        // Filter to only plugins not already loaded
        const unloadedPlugins = plugins.filter((p) => !cacheManager.isPluginLoaded(p));

        if (unloadedPlugins.length > 0) {
          const installResult = await cacheManager.installPlugins({
            plugins: unloadedPlugins,
            force: false, // Don't force reinstall
          });

          result.installed = installResult.success;
          result.installMessage = installResult.success
            ? `Installed ${installResult.pluginsAffected} plugin(s) in ${Math.round(installResult.durationMs)}ms`
            : installResult.error;

          logInfo('detect-intent', 'Plugins installed', {
            plugins: unloadedPlugins,
            success: installResult.success,
            durationMs: installResult.durationMs,
            confidence: detection.confidence,
          });
        } else {
          result.installed = true;
          result.installMessage = 'All plugins already loaded';
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.installed = false;
        result.installMessage = err.message;

        logError('detect-intent', 'Installation failed', err, {
          plugins,
          prompt: prompt.substring(0, 100),
        });
      }
    }
  }

  // Output result (unless silent mode)
  if (!options.silent) {
    console.log(JSON.stringify(result, null, 2));
  }

  // Log for analytics
  logInfo('detect-intent', 'Detection complete', {
    detected: result.detected,
    plugins: result.plugins,
    confidence: result.confidence,
    latencyMs: result.latencyMs,
    installed: result.installed,
  });

  return result;
}

/**
 * Create the detect-intent command for Commander
 */
export function createDetectIntentCommand(): Command {
  const cmd = new Command('detect-intent');

  cmd
    .description('Detect SpecWeave intent from a prompt and optionally install plugins')
    .argument('<prompt>', 'User prompt text to analyze')
    .option('--install', 'Also install detected plugins after detection')
    .option('--silent', 'Silent mode - no stdout output (for hooks)')
    .option('--json', 'Output as JSON (default when not silent)')
    .option('--threshold <number>', 'Confidence threshold for auto-install (0-1, default 0.6)', parseFloat)
    .action(async (prompt: string, options: DetectIntentOptions) => {
      try {
        const result = await detectIntentCommand(prompt, options);

        // Exit code: 0 if plugins detected, 1 if none
        process.exit(result.detected ? 0 : 1);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (!options.silent) {
          console.error(chalk.red(`Error: ${err.message}`));
        }

        logError('detect-intent', 'Command failed', err);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Export for direct CLI invocation
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments manually for standalone execution
  let prompt = '';
  let install = false;
  let silent = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--install') {
      install = true;
    } else if (args[i] === '--silent') {
      silent = true;
    } else if (!args[i].startsWith('--')) {
      prompt = args[i];
    }
  }

  if (!prompt) {
    if (!silent) {
      console.error('Usage: specweave detect-intent <prompt> [--install] [--silent]');
      console.error('');
      console.error('Examples:');
      console.error('  specweave detect-intent "release npm version"');
      console.error('  specweave detect-intent "deploy to kubernetes" --install');
      console.error('  specweave detect-intent "create react component" --install --silent');
    }
    process.exit(1);
  }

  const result = await detectIntentCommand(prompt, { install, silent });
  process.exit(result.detected ? 0 : 1);
}
