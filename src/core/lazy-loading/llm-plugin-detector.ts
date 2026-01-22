/**
 * LLM-Based Plugin Detection
 *
 * Replaces unreliable grep-based keyword matching with Claude LLM calls.
 * Uses Haiku model for fast, accurate intent detection.
 *
 * Key features:
 * - Understands context ("don't use React" → no React plugin)
 * - Cross-platform execution (Windows, macOS, Linux)
 * - Graceful degradation when Claude CLI unavailable
 * - Proper error handling throughout
 *
 * @module core/lazy-loading/llm-plugin-detector
 */

import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { consoleLogger as logger } from '../../utils/logger.js';
// IMPORTANT: Use canonical Claude CLI detection from utils (handles shell functions, nvm, etc.)
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';

/**
 * Available SpecWeave plugins for detection
 *
 * IMPORTANT: Plugin names use `specweave-*` prefix (not `sw-*`)
 *
 * Note: Release, diagrams, and docs are now merged into CORE specweave plugin (v1.0.130+)
 * - sw:npm, sw:release skills are built-in
 * - mermaid, c4, architecture diagram skills are built-in
 * - docs-writer, docs-updater skills are built-in
 */
export const SPECWEAVE_PLUGINS = [
  // Core (always loaded, contains release/diagrams/docs)
  'specweave',

  // Development domains
  'specweave-frontend',      // React, Vue, Angular, Next.js, UI components
  'specweave-backend',       // Node.js, Express, NestJS, APIs, databases
  'specweave-testing',       // Jest, Vitest, Playwright, E2E, unit tests
  'specweave-mobile',        // React Native, iOS, Android, Expo

  // Infrastructure & DevOps
  'specweave-infrastructure', // Terraform, AWS, Azure, GCP, Docker, CI/CD
  'specweave-kubernetes',     // K8s, Helm, pods, deployments, EKS/AKS/GKE

  // External tool integrations
  'specweave-github',        // GitHub issues, PRs, Actions
  'specweave-jira',          // Jira integration
  'specweave-ado',           // Azure DevOps

  // Specialized domains
  'specweave-payments',      // Stripe, PayPal, checkout
  'specweave-ml',            // Machine learning, PyTorch, TensorFlow
  'specweave-kafka',         // Apache Kafka, event streaming
  'specweave-confluent',     // Confluent Cloud, Schema Registry, ksqlDB

  // Additional plugins (in marketplace but less commonly used)
  'specweave-kafka-streams', // Kafka Streams specific
  'specweave-n8n',           // n8n workflow automation
  'specweave-figma',         // Figma design integration
  'specweave-cost-optimizer', // Cloud cost optimization
  'specweave-docs',          // Extended documentation
  'specweave-diagrams',      // Extended diagram support (beyond core)
  'specweave-release',       // Extended release management (beyond core)
  'specweave-ui',            // UI automation
  'specweave-router',        // Agent routing
  'specweave-plugin-dev',    // Plugin development
] as const;

export type SpecWeavePlugin = (typeof SPECWEAVE_PLUGINS)[number];

/**
 * Result of Claude CLI availability check
 */
export interface ClaudeCliStatus {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

/**
 * Result of LLM-based plugin detection
 */
export interface LLMDetectionResult {
  success: boolean;
  plugins: SpecWeavePlugin[];
  confidence: number;
  reasoning?: string;
  error?: string;
  durationMs: number;
}

/**
 * Result of plugin installation via CLI
 */
export interface PluginInstallResult {
  success: boolean;
  plugin: string;
  error?: string;
  alreadyInstalled?: boolean;
}

// Cache the CLI detection result for performance (detect once per process)
let cachedCliStatus: ReturnType<typeof detectClaudeCli> | null = null;

/**
 * Clear the cached CLI status (useful for testing)
 */
export function clearCliCache(): void {
  cachedCliStatus = null;
}

/**
 * Get the current CLI detection status (for debugging/testing)
 */
export function getCliStatus(): ReturnType<typeof detectClaudeCli> | null {
  return cachedCliStatus;
}

/**
 * Check if Claude CLI is available
 *
 * REFACTORED: Uses canonical implementation from utils/claude-cli-detector.ts
 * which handles all edge cases:
 * - Binary in PATH
 * - Shell functions in .zshrc/.bashrc
 * - Shell aliases
 * - npm global paths (including nvm versions)
 *
 * Also populates the cache for use by executeClaudeCli().
 *
 * @returns Status object with availability and path info
 */
export function isClaudeCliAvailable(): ClaudeCliStatus {
  // Use cached result if available
  if (cachedCliStatus) {
    const result = {
      available: cachedCliStatus.available,
      path: cachedCliStatus.commandPath,
      version: cachedCliStatus.version,
      error: cachedCliStatus.available ? undefined : cachedCliStatus.errorMessage,
    };

    // Log when returning cached unavailable status (helps debug stale cache issues)
    if (!result.available) {
      logger.debug(`[isClaudeCliAvailable] Returning CACHED unavailable status: error=${cachedCliStatus.error}, errorMessage=${cachedCliStatus.errorMessage}, exitCode=${cachedCliStatus.exitCode}, platform=${cachedCliStatus.platform}`);
    }

    return result;
  }

  // Detect and cache
  logger.debug('[isClaudeCliAvailable] Running fresh detection (no cache)...');
  const canonicalStatus = detectClaudeCli();
  cachedCliStatus = canonicalStatus;

  // Log full detection result for debugging
  if (!canonicalStatus.available) {
    const debugInfo = [
      `error=${canonicalStatus.error}`,
      `errorMessage=${canonicalStatus.errorMessage}`,
      `commandExists=${canonicalStatus.commandExists}`,
      `pluginCommandsWork=${canonicalStatus.pluginCommandsWork}`,
      `exitCode=${canonicalStatus.exitCode}`,
      `platform=${canonicalStatus.platform}`,
      `detectionMethod=${canonicalStatus.detectionMethod}`,
      canonicalStatus.debugStdout ? `stdout=${canonicalStatus.debugStdout.substring(0, 100)}` : null,
      canonicalStatus.debugStderr ? `stderr=${canonicalStatus.debugStderr.substring(0, 100)}` : null,
    ].filter(Boolean).join(', ');
    logger.warn(`[isClaudeCliAvailable] Claude CLI NOT available: ${debugInfo}`);
  } else {
    logger.debug(`[isClaudeCliAvailable] Claude CLI available: version=${canonicalStatus.version}, path=${canonicalStatus.commandPath}, method=${canonicalStatus.detectionMethod}`);
  }

  // Map to our simpler interface
  return {
    available: canonicalStatus.available,
    path: canonicalStatus.commandPath,
    version: canonicalStatus.version,
    error: canonicalStatus.available ? undefined : canonicalStatus.errorMessage,
  };
}

/**
 * Build the system prompt for plugin detection
 */
function buildDetectionPrompt(): string {
  return `You are a plugin detection system for SpecWeave, a spec-driven development framework.

Available plugins (use EXACT names):

CORE (always available, no need to return):
- specweave: Core framework with built-in release, diagrams, docs skills

DEVELOPMENT DOMAINS:
- specweave-frontend: React, Vue, Angular, Next.js, Svelte, Remix, Astro, UI components, CSS, Tailwind, frontend, web app, dashboard, SPA
- specweave-backend: Node.js, Express, NestJS, Fastify, Hono, APIs, REST, GraphQL, databases, SQL, PostgreSQL, MySQL, MongoDB, Redis, backend, server, CLI tools, scripts
- specweave-testing: Jest, Vitest, Playwright, Cypress, testing, E2E, unit tests, TDD, test-driven, integration tests, QA
- specweave-mobile: React Native, iOS, Android, mobile apps, Expo, Flutter, Swift, Kotlin, native apps

INFRASTRUCTURE & DEVOPS:
- specweave-infrastructure: Terraform, Pulumi, AWS, Azure, GCP, Docker, CI/CD, CloudFormation, CDK, DevOps, serverless, Lambda
- specweave-kubernetes: Kubernetes, K8s, Helm, pods, deployments, services, ingress, kubectl, EKS, AKS, GKE, GitOps

EXTERNAL INTEGRATIONS:
- specweave-github: GitHub issues, PRs, Actions, workflows, GitHub sync
- specweave-jira: Jira, epics, stories, sprints, Jira sync
- specweave-ado: Azure DevOps, ADO, work items, pipelines, ADO sync

SPECIALIZED:
- specweave-payments: Stripe, PayPal, payments, checkout, billing, subscriptions, invoices
- specweave-ml: Machine learning, AI models, PyTorch, TensorFlow, training, inference, ML pipelines, data science
- specweave-kafka: Apache Kafka, event streaming, topics, consumers, producers, MSK
- specweave-confluent: Confluent Cloud, Schema Registry, ksqlDB, Kafka Connect

CRITICAL RULES - UNDERSTAND INTENT:
1. Focus on WHAT THE USER WANTS TO BUILD, not what they mention negatively
2. When user says "don't use X" or "not X", determine what they WANT instead:
   - "Don't use React" + no alternative mentioned → Could be: backend-only, CLI tool, mobile app - ASK CONTEXT
   - "Don't use React, use Vue instead" → Still frontend! Include specweave-frontend
   - "Don't use React, make it a mobile app" → Include specweave-mobile, NOT frontend
   - "Don't use React, just a CLI tool" → Include specweave-backend only
   - "Don't use React, terminal only" → Include specweave-backend only
3. Negative mentions of technology X do NOT automatically exclude the domain:
   - "I hate React but need a web dashboard" → Include specweave-frontend (they still need frontend)
   - "React is bad, let's use Angular" → Include specweave-frontend (Angular is frontend too)
4. Positive mentions always indicate need:
   - "Build with Vue" → specweave-frontend
   - "Build iOS app" → specweave-mobile
   - "Build Node.js API" → specweave-backend
5. Only include plugins that are ACTIVELY needed for the task
6. Empty array is valid if no plugins are needed (e.g., "What is 2+2?")
7. Maximum 5 plugins per response (focus on core needs)
8. Do NOT include "specweave" in response - it's always loaded

Respond with ONLY valid JSON (no markdown, no explanation, no code blocks):
{"plugins": ["specweave-plugin-name"], "confidence": 0.9, "reasoning": "brief reason"}`;
}

/**
 * Execute Claude CLI command safely
 *
 * Cross-platform safety measures:
 * - Uses spawnSync (not execSync) to avoid shell injection
 * - Proper timeout handling
 * - Buffer size limits
 * - Handles shell functions/aliases on macOS/Linux via interactive shell
 * - Windows-specific shell handling
 *
 * IMPORTANT: On macOS/Linux, if claude is installed as a shell function/alias
 * (defined in .zshrc/.bashrc), we need to use interactive shell to find it.
 * This is detected by detectClaudeCli() which we reuse here.
 *
 * @param args - Arguments to pass to claude command
 * @param timeout - Timeout in milliseconds
 * @returns Spawn result with stdout, stderr, status
 */
function executeClaudeCli(
  args: string[],
  timeout: number = 30000
): SpawnSyncReturns<string> {
  const isWindows = process.platform === 'win32';

  // Get cached CLI status or detect
  if (!cachedCliStatus) {
    cachedCliStatus = detectClaudeCli();
  }

  // CRITICAL FIX: Prefer DIRECT binary path when available.
  //
  // Why? Users often have shell wrapper functions like:
  //   function claude() { command claude --dangerously-skip-permissions "$@" }
  //
  // These wrappers are great for interactive use but can interfere with
  // programmatic access. The `--dangerously-skip-permissions` flag, for example,
  // may cause issues when combined with certain arguments.
  //
  // Strategy:
  // 1. If we have a direct binary path (via `which` or file lookup), use it directly
  // 2. Only use interactive shell if claude was detected purely as a shell function
  //    (i.e., shellWorkaround is true and no direct binary path)

  // Use direct binary path if available (bypasses shell functions)
  if (cachedCliStatus.commandPath && !cachedCliStatus.shellWorkaround) {
    logger.debug(`[executeClaudeCli] Using direct binary: ${cachedCliStatus.commandPath}`);
    // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
    // that would cause Claude CLI to fail silently in test/debug environments
    const cleanEnv = getCleanEnv();
    return spawnSync(cachedCliStatus.commandPath, args, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
      windowsHide: true,
      cwd: os.tmpdir(),
      env: {
        ...cleanEnv,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      },
    });
  }

  // On Unix with no direct binary (shell function only): use interactive shell
  if (!isWindows) {
    logger.debug('[executeClaudeCli] Using interactive shell (no direct binary)');
    return executeViaInteractiveShell(args, timeout);
  }

  // Windows: try with shell for PATH resolution
  // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
  const cleanEnv = getCleanEnv();
  return spawnSync('claude', args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    shell: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    },
  });
}

/**
 * Execute command via interactive shell (for shell functions/aliases)
 *
 * When claude is defined as a shell function or alias in .zshrc/.bashrc,
 * we need to run via interactive shell to have access to it.
 */
function executeViaInteractiveShell(
  args: string[],
  timeout: number
): SpawnSyncReturns<string> {
  const userShell = process.env.SHELL || '/bin/bash';
  const isZsh = userShell.includes('zsh');
  const shell = isZsh ? 'zsh' : 'bash';

  // Build the command string - properly escape arguments
  const escapedArgs = args.map((arg) => {
    // Escape single quotes and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  });
  const command = `claude ${escapedArgs.join(' ')}`;

  // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
  const cleanEnv = getCleanEnv();
  const result = spawnSync(shell, ['-ic', command], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      BASH_SILENCE_DEPRECATION_WARNING: '1',
    },
  });

  return result;
}

/**
 * Detect plugins needed for a user prompt using Claude LLM
 *
 * @param userPrompt - The user's prompt to analyze
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Detection result with plugins to install
 */
export async function detectPluginsViaLLM(
  userPrompt: string,
  timeout: number = 30000
): Promise<LLMDetectionResult> {
  const startTime = performance.now();

  // Check CLI availability first
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    logger.debug('Claude CLI not available for LLM detection');
    return {
      success: false,
      plugins: [],
      confidence: 0,
      error: cliStatus.error,
      durationMs: performance.now() - startTime,
    };
  }

  // Build the full prompt
  const systemPrompt = buildDetectionPrompt();
  const fullPrompt = `${systemPrompt}

User prompt to analyze:
"${userPrompt.replace(/"/g, '\\"')}"

Which plugins should be loaded?`;

  try {
    // Execute Claude CLI with Haiku for speed
    const result = executeClaudeCli(['-p', fullPrompt, '--model', 'haiku'], timeout);

    // Handle spawn errors
    if (result.error) {
      const errorMsg = result.error.message || String(result.error);

      // Timeout error
      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('TIMEOUT')) {
        return {
          success: false,
          plugins: [],
          confidence: 0,
          error: `Detection timed out after ${timeout}ms`,
          durationMs: performance.now() - startTime,
        };
      }

      return {
        success: false,
        plugins: [],
        confidence: 0,
        error: `Claude CLI error: ${errorMsg}`,
        durationMs: performance.now() - startTime,
      };
    }

    // Handle non-zero exit
    if (result.status !== 0) {
      // Check for common errors
      const stderr = result.stderr || '';

      if (stderr.includes('authentication') || stderr.includes('API key')) {
        return {
          success: false,
          plugins: [],
          confidence: 0,
          error: 'Claude CLI authentication error. Run: claude login',
          durationMs: performance.now() - startTime,
        };
      }

      if (stderr.includes('rate limit')) {
        return {
          success: false,
          plugins: [],
          confidence: 0,
          error: 'Rate limit exceeded. Try again later.',
          durationMs: performance.now() - startTime,
        };
      }

      return {
        success: false,
        plugins: [],
        confidence: 0,
        error: `Claude CLI exited with code ${result.status}: ${stderr || result.stdout}`,
        durationMs: performance.now() - startTime,
      };
    }

    // Parse the response
    const output = (result.stdout || '').trim();

    if (!output) {
      return {
        success: false,
        plugins: [],
        confidence: 0,
        error: 'Empty response from Claude CLI',
        durationMs: performance.now() - startTime,
      };
    }

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = output;

    // Remove markdown code blocks if present
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Find JSON object in the string
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.debug(`Invalid LLM response format: ${output.slice(0, 200)}`);
      return {
        success: false,
        plugins: [],
        confidence: 0,
        error: `Invalid response format (no JSON found)`,
        durationMs: performance.now() - startTime,
      };
    }

    // Parse JSON
    let parsed: { plugins?: string[]; confidence?: number; reasoning?: string };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.debug(`JSON parse error: ${parseError}`);
      return {
        success: false,
        plugins: [],
        confidence: 0,
        error: `Failed to parse response JSON`,
        durationMs: performance.now() - startTime,
      };
    }

    // Validate and filter plugins
    const rawPlugins = parsed.plugins || [];
    const validPlugins = rawPlugins.filter((p): p is SpecWeavePlugin =>
      typeof p === 'string' && SPECWEAVE_PLUGINS.includes(p as SpecWeavePlugin)
    );

    // Log if we filtered out invalid plugins
    if (validPlugins.length !== rawPlugins.length) {
      const invalid = rawPlugins.filter((p) => !SPECWEAVE_PLUGINS.includes(p as SpecWeavePlugin));
      logger.debug(`Filtered out invalid plugins: ${invalid.join(', ')}`);
    }

    return {
      success: true,
      plugins: validPlugins,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning,
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`LLM detection failed: ${errorMsg}`);

    return {
      success: false,
      plugins: [],
      confidence: 0,
      error: `Detection failed: ${errorMsg}`,
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Install a SpecWeave plugin using Claude CLI
 *
 * Uses `claude plugin install <name>` which is the official API.
 * This properly registers the plugin in installed_plugins.json.
 *
 * @param pluginName - Name of the plugin to install
 * @param timeout - Timeout in milliseconds
 * @returns Installation result
 */
export async function installPluginViaCli(
  pluginName: string,
  timeout: number = 30000
): Promise<PluginInstallResult> {
  // Validate plugin name
  if (!SPECWEAVE_PLUGINS.includes(pluginName as SpecWeavePlugin)) {
    return {
      success: false,
      plugin: pluginName,
      error: `Unknown plugin: ${pluginName}`,
    };
  }

  // Check CLI availability
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    return {
      success: false,
      plugin: pluginName,
      error: cliStatus.error,
    };
  }

  try {
    const result = executeClaudeCli(['plugin', 'install', pluginName], timeout);

    // Handle spawn errors
    if (result.error) {
      return {
        success: false,
        plugin: pluginName,
        error: `Install error: ${result.error.message}`,
      };
    }

    // Check for success indicators
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const combined = `${stdout} ${stderr}`.toLowerCase();

    // Already installed is a success
    if (combined.includes('already installed')) {
      return {
        success: true,
        plugin: pluginName,
        alreadyInstalled: true,
      };
    }

    // Successful installation
    if (result.status === 0) {
      return {
        success: true,
        plugin: pluginName,
      };
    }

    // Error
    return {
      success: false,
      plugin: pluginName,
      error: stderr || stdout || `Exit code ${result.status}`,
    };
  } catch (error) {
    return {
      success: false,
      plugin: pluginName,
      error: `Install failed: ${error}`,
    };
  }
}

/**
 * Install multiple plugins via CLI
 *
 * @param plugins - Array of plugin names to install
 * @returns Array of installation results
 */
export async function installPluginsViaCli(
  plugins: string[]
): Promise<PluginInstallResult[]> {
  const results: PluginInstallResult[] = [];

  for (const plugin of plugins) {
    const result = await installPluginViaCli(plugin);
    results.push(result);

    // Log progress
    if (result.success) {
      if (result.alreadyInstalled) {
        logger.debug(`Plugin ${plugin} already installed`);
      } else {
        logger.info(`Installed plugin: ${plugin}`);
      }
    } else {
      logger.warn(`Failed to install ${plugin}: ${result.error}`);
    }
  }

  return results;
}

/**
 * Full pipeline: detect plugins from prompt and install them
 *
 * @param userPrompt - The user's prompt
 * @returns Detection and installation results
 */
export async function detectAndInstallPlugins(userPrompt: string): Promise<{
  detection: LLMDetectionResult;
  installations: PluginInstallResult[];
}> {
  // Step 1: Detect needed plugins
  const detection = await detectPluginsViaLLM(userPrompt);

  if (!detection.success || detection.plugins.length === 0) {
    return {
      detection,
      installations: [],
    };
  }

  // Step 2: Install detected plugins
  const installations = await installPluginsViaCli(detection.plugins);

  return {
    detection,
    installations,
  };
}

/**
 * Format hook output for Claude Code
 *
 * @param result - Detection/installation result
 * @returns JSON string for hook output
 */
export function formatHookOutput(result: {
  detection: LLMDetectionResult;
  installations: PluginInstallResult[];
}): string {
  const { detection, installations } = result;

  // Always continue (don't block Claude Code)
  const output: { continue: boolean; systemMessage?: string } = {
    continue: true,
  };

  // Build system message based on results
  if (!detection.success) {
    if (detection.error?.includes('not found')) {
      output.systemMessage = `SpecWeave: Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code

Plugin auto-loading is disabled. Install Claude CLI to enable automatic plugin detection.`;
    } else if (detection.error?.includes('authentication')) {
      output.systemMessage = `SpecWeave: Claude CLI authentication required. Run: claude login`;
    }
    // Don't show message for other errors (silent degradation)
  } else if (detection.plugins.length > 0) {
    const installed = installations.filter((i) => i.success && !i.alreadyInstalled);
    const alreadyInstalled = installations.filter((i) => i.alreadyInstalled);
    const failed = installations.filter((i) => !i.success);

    const parts: string[] = [];

    if (installed.length > 0) {
      parts.push(`Loaded: ${installed.map((i) => i.plugin).join(', ')}`);
    }

    if (alreadyInstalled.length > 0 && installed.length === 0) {
      // Only mention already installed if nothing new was loaded
      parts.push(`Using: ${alreadyInstalled.map((i) => i.plugin).join(', ')}`);
    }

    if (failed.length > 0) {
      parts.push(`Failed: ${failed.map((i) => i.plugin).join(', ')}`);
    }

    if (parts.length > 0) {
      output.systemMessage = `SpecWeave: ${parts.join(' | ')}`;
    }
  }

  return JSON.stringify(output);
}
