/**
 * Detect Intent CLI Command
 *
 * Detects SpecWeave intent from a user prompt using LLM (Claude Haiku)
 * and optionally installs matching plugins.
 *
 * v1.0.140+: Switched from keyword-based to LLM-only detection.
 * The LLM analyzes the prompt and decides which plugins are needed.
 *
 * Configuration:
 *   Set lazyLoading.llmDetection: false in config.json to disable detection entirely.
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
import * as fs from 'fs';
import * as path from 'path';
import { detectPluginsViaLLM } from '../../core/lazy-loading/llm-plugin-detector.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';
import { logInfo, logError } from '../../core/lazy-loading/failure-logger.js';

export interface DetectIntentOptions {
  /** Also install detected plugins after detection */
  install?: boolean;
  /** Silent mode - no stdout output (for hooks) */
  silent?: boolean;
  /** Output format - json or text */
  json?: boolean;
}

export interface DetectIntentResult {
  /** Whether any plugins were detected */
  detected: boolean;
  /** List of detected plugin names to install */
  plugins: string[];
  /** Confidence score (0-1) from LLM */
  confidence: number;
  /** LLM reasoning (when available) */
  reasoning?: string;
  /** Detection latency in milliseconds */
  latencyMs?: number;
  /** Whether plugins were installed (when --install used) */
  installed?: boolean;
  /** Installation result message (when --install used) */
  installMessage?: string;
  /** Whether LLM detection was skipped (config disabled) */
  skipped?: boolean;
}

/**
 * Find project root by looking for .specweave directory
 */
function findProjectRoot(): string | null {
  let current = process.cwd();
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, '.specweave'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Check if plugin auto-load is enabled in config
 *
 * Returns true if:
 * - No config exists (default to enabled)
 * - Config exists but pluginAutoLoad.enabled is undefined (default to true)
 * - Config has pluginAutoLoad.enabled: true
 *
 * Returns false only if explicitly set to false.
 */
function isPluginAutoLoadEnabled(): boolean {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return true; // Default to enabled if no project found
  }

  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) {
    return true; // Default to enabled if no config
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Only return false if explicitly set to false
    return config.pluginAutoLoad?.enabled !== false;
  } catch {
    return true; // Default to enabled on read error
  }
}

/**
 * Detect intent from a user prompt using LLM
 *
 * v1.0.140+: Uses Claude Haiku for accurate intent detection.
 * The LLM decides which plugins are needed based on full context understanding.
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

  // Check if plugin auto-load is enabled in config
  const autoLoadEnabled = isPluginAutoLoadEnabled();

  // If plugin auto-load is disabled, return early with no plugins
  if (!autoLoadEnabled) {
    const result: DetectIntentResult = {
      detected: false,
      plugins: [],
      confidence: 0,
      latencyMs: performance.now() - startTime,
      skipped: true,
    };

    if (!options.silent) {
      console.log(JSON.stringify(result, null, 2));
    }

    logInfo('detect-intent', 'Plugin auto-load disabled via config, skipping', {
      configSetting: 'pluginAutoLoad.enabled: false',
    });

    return result;
  }

  // Run LLM detection
  const llmResult = await detectPluginsViaLLM(prompt);

  const result: DetectIntentResult = {
    detected: llmResult.success && llmResult.plugins.length > 0,
    plugins: llmResult.plugins,
    confidence: llmResult.confidence,
    reasoning: llmResult.reasoning,
    latencyMs: llmResult.durationMs,
  };

  // Handle LLM failure
  if (!llmResult.success) {
    result.installMessage = llmResult.error || 'LLM detection failed';

    logError('detect-intent', 'LLM detection failed', new Error(llmResult.error || 'Unknown error'), {
      prompt: prompt.substring(0, 100),
      durationMs: llmResult.durationMs,
    });

    if (!options.silent) {
      console.log(JSON.stringify(result, null, 2));
    }

    return result;
  }

  // Handle installation if requested
  // Note: No confidence threshold - if LLM says install, we install
  if (options.install && result.plugins.length > 0) {
    try {
      const cacheManager = new PluginCacheManager();

      // Filter to only plugins not already loaded
      const unloadedPlugins = result.plugins.filter((p) => !cacheManager.isPluginLoaded(p));

      if (unloadedPlugins.length > 0) {
        const installResult = await cacheManager.installPlugins({
          plugins: unloadedPlugins,
          force: false,
        });

        result.installed = installResult.success;
        result.installMessage = installResult.success
          ? `Installed ${installResult.pluginsAffected} plugin(s) in ${Math.round(installResult.durationMs)}ms`
          : installResult.error;

        logInfo('detect-intent', 'Plugins installed via LLM detection', {
          plugins: unloadedPlugins,
          success: installResult.success,
          durationMs: installResult.durationMs,
          reasoning: llmResult.reasoning,
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
        plugins: result.plugins,
        prompt: prompt.substring(0, 100),
      });
    }
  }

  // Output result (unless silent mode)
  if (!options.silent) {
    console.log(JSON.stringify(result, null, 2));
  }

  // Log for analytics
  logInfo('detect-intent', 'LLM detection complete', {
    detected: result.detected,
    plugins: result.plugins,
    confidence: result.confidence,
    latencyMs: result.latencyMs,
    installed: result.installed,
    reasoning: result.reasoning,
  });

  return result;
}

/**
 * Create the detect-intent command for Commander
 */
export function createDetectIntentCommand(): Command {
  const cmd = new Command('detect-intent');

  cmd
    .description('Detect SpecWeave intent from a prompt using LLM and optionally install plugins')
    .argument('<prompt>', 'User prompt text to analyze')
    .option('--install', 'Also install detected plugins after detection')
    .option('--silent', 'Silent mode - no stdout output (for hooks)')
    .option('--json', 'Output as JSON (default when not silent)')
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
      console.error('');
      console.error('Configuration:');
      console.error('  Set lazyLoading.llmDetection: false in .specweave/config.json to disable.');
    }
    process.exit(1);
  }

  const result = await detectIntentCommand(prompt, { install, silent });
  process.exit(result.detected ? 0 : 1);
}
