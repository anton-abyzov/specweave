/**
 * Detect Intent CLI Command
 *
 * Detects SpecWeave intent from a user prompt using LLM (Claude Haiku)
 * and optionally installs matching plugins.
 *
 * v1.0.140+: Switched from keyword-based to LLM-only detection.
 * v1.0.141+: Added increment creation suggestions.
 *
 * The LLM analyzes the prompt and decides:
 * 1. Which plugins are needed
 * 2. Whether work should be tracked in an increment
 *
 * Configuration:
 *   Set pluginAutoLoad.enabled: false to disable plugin detection.
 *   Set incrementAssist.enabled: false to disable increment suggestions.
 *
 * Usage:
 *   specweave detect-intent "prompt text"                    # Returns JSON with detected plugins + increment suggestion
 *   specweave detect-intent "prompt text" --install          # Also installs detected plugins
 *   specweave detect-intent "prompt text" --install --silent # Silent mode for hooks
 *
 * @module cli/commands/detect-intent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectPluginsViaLLM,
  IncrementAction,
  SkillRouting,
  SkillInvocation,
} from '../../core/lazy-loading/llm-plugin-detector.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';
import { logInfo, logError } from '../../core/lazy-loading/failure-logger.js';

export interface DetectIntentOptions {
  /** Also install detected plugins after detection */
  install?: boolean;
  /** Silent mode - no stdout output (for hooks) */
  silent?: boolean;
  /** Output format - json or text */
  json?: boolean;
  /** Read prompt from file instead of argument (avoids shell escaping issues) */
  file?: string;
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

  /** Increment recommendation (v1.0.141+, v1.0.168: added mandatory) */
  increment?: {
    /** Recommended action: new, reopen, small_fix, hotfix, none */
    action: IncrementAction;
    /** Confidence score (0-1) */
    confidence: number;
    /** Whether increment creation is mandatory (LLM decides) */
    mandatory: boolean;
    /** Suggested increment name (for 'new' action) */
    suggestedName?: string;
    /** Related keyword for reopening (for 'reopen' action) */
    relatedKeyword?: string;
    /** Brief explanation */
    reasoning: string;
  };
  /** Whether increment assist was skipped (config disabled) */
  incrementSkipped?: boolean;

  /** Skill routing recommendation (v1.0.150+) */
  routing?: SkillRouting;

  /** Skill invocation recommendation (v1.0.168) */
  skillInvocation?: SkillInvocation;
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
 * Read and cache the project config
 */
let cachedConfig: Record<string, unknown> | null = null;

function getProjectConfig(): Record<string, unknown> | null {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return null;
  }

  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return cachedConfig;
  } catch {
    return null;
  }
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
  const config = getProjectConfig();
  if (!config) {
    return true; // Default to enabled if no config
  }

  // Only return false if explicitly set to false
  const pluginAutoLoad = config.pluginAutoLoad as { enabled?: boolean } | undefined;
  return pluginAutoLoad?.enabled !== false;
}

/**
 * Check if increment assist is enabled in config
 *
 * Returns true if:
 * - No config exists (default to enabled)
 * - Config exists but incrementAssist.enabled is undefined (default to true)
 * - Config has incrementAssist.enabled: true
 *
 * Returns false only if explicitly set to false.
 */
function isIncrementAssistEnabled(): boolean {
  const config = getProjectConfig();
  if (!config) {
    return true; // Default to enabled if no config
  }

  // Only return false if explicitly set to false
  const incrementAssist = config.incrementAssist as { enabled?: boolean } | undefined;
  return incrementAssist?.enabled !== false;
}

/**
 * Get increment assist confidence threshold from config
 * @returns Threshold (0-1), defaults to 0.7
 */
function getIncrementConfidenceThreshold(): number {
  const config = getProjectConfig();
  if (!config) {
    return 0.7; // Default threshold
  }

  const incrementAssist = config.incrementAssist as { confidenceThreshold?: number } | undefined;
  const threshold = incrementAssist?.confidenceThreshold;

  if (typeof threshold === 'number' && threshold >= 0 && threshold <= 1) {
    return threshold;
  }

  return 0.7; // Default threshold
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

  // Check if increment assist is enabled
  const incrementAssistEnabled = isIncrementAssistEnabled();
  const confidenceThreshold = getIncrementConfidenceThreshold();

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

  // Process increment recommendation (v1.0.141+)
  if (!incrementAssistEnabled) {
    result.incrementSkipped = true;
    logInfo('detect-intent', 'Increment assist disabled via config', {
      configSetting: 'incrementAssist.enabled: false',
    });
  } else if (llmResult.increment) {
    // Only include recommendation if confidence exceeds threshold
    if (llmResult.increment.confidence >= confidenceThreshold) {
      result.increment = {
        action: llmResult.increment.action,
        confidence: llmResult.increment.confidence,
        mandatory: llmResult.increment.mandatory,
        suggestedName: llmResult.increment.suggestedName,
        relatedKeyword: llmResult.increment.relatedKeyword,
        reasoning: llmResult.increment.reasoning,
      };

      logInfo('detect-intent', 'Increment recommendation', {
        action: llmResult.increment.action,
        confidence: llmResult.increment.confidence,
        mandatory: llmResult.increment.mandatory,
        suggestedName: llmResult.increment.suggestedName,
        reasoning: llmResult.increment.reasoning,
      });
    } else {
      logInfo('detect-intent', 'Increment recommendation below threshold', {
        action: llmResult.increment.action,
        confidence: llmResult.increment.confidence,
        threshold: confidenceThreshold,
      });
    }
  }

  // Process skill routing recommendation (v1.0.150+)
  if (llmResult.routing && llmResult.routing.skills.length > 0) {
    result.routing = llmResult.routing;

    const primarySkill = llmResult.routing.skills.find(s => s.priority === 'primary');
    const secondarySkills = llmResult.routing.skills.filter(s => s.priority === 'secondary');

    logInfo('detect-intent', 'Skill routing recommendation', {
      primarySkill: primarySkill?.fullName,
      secondarySkills: secondarySkills.map(s => s.fullName),
      suggestPlanMode: llmResult.routing.workflow.suggestPlanMode,
      phases: llmResult.routing.workflow.phases,
      confidence: llmResult.routing.confidence,
      reasoning: llmResult.routing.reasoning,
    });
  }

  // Process skill invocation recommendation (v1.0.168)
  if (llmResult.skillInvocation) {
    result.skillInvocation = llmResult.skillInvocation;

    logInfo('detect-intent', 'Skill invocation recommendation', {
      skill: llmResult.skillInvocation.skill,
      mandatory: llmResult.skillInvocation.mandatory,
      reason: llmResult.skillInvocation.reason,
    });
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
    incrementAction: result.increment?.action,
    incrementConfidence: result.increment?.confidence,
    routingSkillCount: result.routing?.skills.length ?? 0,
    routingPrimarySkill: result.routing?.skills.find(s => s.priority === 'primary')?.fullName,
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
    .argument('[prompt]', 'User prompt text to analyze (optional if --file is used)')
    .option('--install', 'Also install detected plugins after detection')
    .option('--silent', 'Silent mode - no stdout output (for hooks)')
    .option('--json', 'Output as JSON (default when not silent)')
    .option('--file <path>', 'Read prompt from file instead of argument (avoids shell escaping issues)')
    .action(async (promptArg: string | undefined, options: DetectIntentOptions) => {
      try {
        // Read prompt from file if specified, otherwise use argument
        let prompt = promptArg || '';
        if (options.file) {
          try {
            prompt = fs.readFileSync(options.file, 'utf8').trim();
          } catch (fileError) {
            const err = fileError instanceof Error ? fileError : new Error(String(fileError));
            if (!options.silent) {
              console.error(chalk.red(`Error reading file: ${err.message}`));
            }
            process.exit(1);
          }
        }

        if (!prompt) {
          if (!options.silent) {
            console.error(chalk.red('Error: No prompt provided. Use positional argument or --file option.'));
          }
          process.exit(1);
        }

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
  let file = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--install') {
      install = true;
    } else if (args[i] === '--silent') {
      silent = true;
    } else if (args[i] === '--file' && i + 1 < args.length) {
      file = args[++i];
    } else if (!args[i].startsWith('--')) {
      prompt = args[i];
    }
  }

  // Read prompt from file if specified
  if (file) {
    try {
      prompt = fs.readFileSync(file, 'utf8').trim();
    } catch (fileError) {
      if (!silent) {
        console.error(`Error reading file: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
      }
      process.exit(1);
    }
  }

  if (!prompt) {
    if (!silent) {
      console.error('Usage: specweave detect-intent <prompt> [--install] [--silent] [--file <path>]');
      console.error('');
      console.error('Examples:');
      console.error('  specweave detect-intent "release npm version"');
      console.error('  specweave detect-intent "deploy to kubernetes" --install');
      console.error('  specweave detect-intent "create react component" --install --silent');
      console.error('  specweave detect-intent --file /tmp/prompt.txt --silent');
      console.error('');
      console.error('Configuration:');
      console.error('  Set lazyLoading.llmDetection: false in .specweave/config.json to disable.');
    }
    process.exit(1);
  }

  const result = await detectIntentCommand(prompt, { install, silent });
  process.exit(result.detected ? 0 : 1);
}
