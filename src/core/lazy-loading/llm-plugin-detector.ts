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
import * as os from 'os';
import { consoleLogger as logger } from '../../utils/logger.js';
// IMPORTANT: Use canonical Claude CLI detection from utils (handles shell functions, nvm, etc.)
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';

/**
 * Available SpecWeave plugins for detection
 *
 * IMPORTANT: Plugin names use marketplace short names `sw-*` (not directory names `specweave-*`)
 * This matches the plugin names in marketplace.json and what `claude plugin install` expects.
 *
 * Note: Release, diagrams, and docs are now merged into CORE sw plugin (v1.0.130+)
 * - sw:npm, sw:release skills are built-in
 * - mermaid, c4, architecture diagram skills are built-in
 * - docs-writer, docs-updater skills are built-in
 */
export const SPECWEAVE_PLUGINS = [
  // Core (always loaded, contains release/diagrams/docs)
  'sw',

  // Development domains
  'sw-frontend',      // React, Vue, Angular, Next.js, UI components
  'sw-backend',       // Node.js, Express, NestJS, APIs, databases
  'sw-testing',       // Jest, Vitest, Playwright, E2E, unit tests
  'sw-mobile',        // React Native, iOS, Android, Expo

  // Infrastructure & DevOps
  'sw-infra',         // Terraform, AWS, Azure, GCP, Docker, CI/CD
  'sw-k8s',           // K8s, Helm, pods, deployments, EKS/AKS/GKE

  // External tool integrations
  'sw-github',        // GitHub issues, PRs, Actions
  'sw-jira',          // Jira integration
  'sw-ado',           // Azure DevOps

  // Specialized domains
  'sw-payments',      // Stripe, PayPal, checkout
  'sw-ml',            // Machine learning, PyTorch, TensorFlow
  'sw-kafka',         // Apache Kafka, event streaming
  'sw-confluent',     // Confluent Cloud, Schema Registry, ksqlDB

  // Additional plugins (in marketplace but less commonly used)
  'sw-kafka-streams', // Kafka Streams specific
  'sw-n8n',           // n8n workflow automation
  'sw-figma',         // Figma design integration
  'sw-cost',           // Cloud cost optimization
  'sw-docs',          // Extended documentation
  'sw-diagrams',      // Extended diagram support (beyond core)
  'sw-release',       // Extended release management (beyond core)
  'sw-ui',            // UI automation
  'sw-router',        // Agent routing
  'sw-plugin-dev',    // Plugin development
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
 * Increment recommendation action types
 *
 * - 'new': User should create a new increment (feature work, multi-file changes)
 * - 'reopen': User should reopen an existing increment (related fix, continuation)
 * - 'small_fix': No increment needed (typo, config tweak, single-line fix)
 * - 'hotfix': Urgent production bug (creates increment with --type=hotfix)
 * - 'none': No recommendation (question, general chat, unclear intent)
 */
export type IncrementAction = 'new' | 'reopen' | 'small_fix' | 'hotfix' | 'none';

/**
 * Increment recommendation from LLM analysis
 */
export interface IncrementRecommendation {
  /** Recommended action */
  action: IncrementAction;

  /** Confidence score (0-1) for this recommendation */
  confidence: number;

  /** Suggested increment name (for 'new' action) */
  suggestedName?: string;

  /** Related increment ID pattern (for 'reopen' action, e.g., "login", "auth") */
  relatedKeyword?: string;

  /** Brief explanation of why this action is recommended */
  reasoning: string;
}

/**
 * When to invoke a skill in the workflow
 *
 * - 'immediate': Invoke right away (simple tasks, no increment needed)
 * - 'after_increment': Create increment first, then invoke
 * - 'after_planning': Use plan mode first, get approval, then invoke
 * - 'with_primary': Invoke alongside primary skill (parallel)
 * - 'after_primary': Invoke after primary skill completes (sequential)
 */
export type SkillInvokeTiming =
  | 'immediate'
  | 'after_increment'
  | 'after_planning'
  | 'with_primary'
  | 'after_primary';

/**
 * Priority level for skills
 *
 * - 'primary': Main skill for the task (only one)
 * - 'secondary': Supporting skill (can be multiple)
 */
export type SkillPriority = 'primary' | 'secondary';

/**
 * Information about a skill to invoke
 */
export interface SkillInfo {
  /** Skill name (e.g., "frontend-architect") */
  name: string;

  /** Plugin that provides this skill (e.g., "sw-frontend") */
  plugin: string;

  /** Full qualified name for invocation (e.g., "sw-frontend:frontend-architect") */
  fullName: string;

  /** Priority level */
  priority: SkillPriority;

  /** When to invoke this skill in the workflow */
  invokeWhen: SkillInvokeTiming;

  /** Brief reason why this skill is recommended */
  reason: string;
}

/**
 * Workflow information for skill orchestration
 */
export interface WorkflowInfo {
  /** Whether to suggest entering plan mode first */
  suggestPlanMode: boolean;

  /** Ordered phases of the workflow */
  phases: string[];
}

/**
 * Skill routing recommendation from LLM analysis
 */
export interface SkillRouting {
  /** Skills to invoke, in priority order */
  skills: SkillInfo[];

  /** Workflow information */
  workflow: WorkflowInfo;

  /** Confidence score (0-1) for routing decision */
  confidence: number;

  /** Brief explanation of routing decision */
  reasoning: string;
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

  /** Increment recommendation (v1.0.141+) */
  increment?: IncrementRecommendation;

  /** Skill routing recommendation (v1.0.150+) */
  routing?: SkillRouting;
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
 * Keyword-based plugin detection fallback (v1.0.153)
 *
 * Fast, reliable detection when LLM is unavailable or fails.
 * Uses simple regex matching against known keywords.
 *
 * @param prompt - User prompt to analyze
 * @returns Array of plugin names to install
 */
export function detectPluginsByKeywords(prompt: string): SpecWeavePlugin[] {
  const plugins: SpecWeavePlugin[] = [];

  // Frontend
  if (/react|vue|angular|next\.?js|svelte|remix|astro|dashboard|frontend|component|ui\b|css|tailwind|spa|web.?app/i.test(prompt)) {
    plugins.push('sw-frontend');
  }

  // Backend
  if (/node\.?js|express|nest\.?js|fastify|hono|backend|server|\bapi\b|rest|graphql|database|sql|postgres|mysql|mongodb|redis|cli.?tool/i.test(prompt)) {
    plugins.push('sw-backend');
  }

  // Testing
  if (/\btest|tdd|playwright|cypress|jest|vitest|e2e|unit.?test|integration.?test|\bqa\b|quality/i.test(prompt)) {
    plugins.push('sw-testing');
  }

  // Payments
  if (/stripe|paypal|payment|checkout|billing|subscription|invoice|e-?commerce/i.test(prompt)) {
    plugins.push('sw-payments');
  }

  // Infrastructure
  if (/terraform|pulumi|\baws\b|azure|gcp|docker|ci\/?cd|cloudformation|cdk|devops|serverless|lambda/i.test(prompt)) {
    plugins.push('sw-infra');
  }

  // Kubernetes
  if (/kubernetes|k8s|helm|\bpod|deployment|ingress|kubectl|eks|aks|gke|gitops/i.test(prompt)) {
    plugins.push('sw-k8s');
  }

  // Mobile
  if (/react.?native|ios|android|mobile|expo|flutter|swift|kotlin|native.?app/i.test(prompt)) {
    plugins.push('sw-mobile');
  }

  // ML
  if (/machine.?learning|\bml\b|ai.?model|pytorch|tensorflow|training|inference|data.?science/i.test(prompt)) {
    plugins.push('sw-ml');
  }

  // Kafka
  if (/kafka|event.?streaming|msk|consumer|producer|\btopic/i.test(prompt)) {
    plugins.push('sw-kafka');
  }

  // GitHub (be specific to avoid false positives)
  if (/github.?issue|github.?pr|github.?action|github.?sync/i.test(prompt)) {
    plugins.push('sw-github');
  }

  // JIRA
  if (/\bjira|epic|story|sprint|jira.?sync/i.test(prompt)) {
    plugins.push('sw-jira');
  }

  // Azure DevOps
  if (/azure.?devops|\bado\b|work.?item|pipeline|ado.?sync/i.test(prompt)) {
    plugins.push('sw-ado');
  }

  // Limit to max 5 plugins
  return plugins.slice(0, 5);
}

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
 * Build the system prompt for plugin detection, increment recommendation, and skill routing
 *
 * v1.0.155: STRICT MINIMAL detection - only detect explicitly mentioned technologies
 * CRITICAL: Do NOT infer or assume plugins. Only detect when keywords are EXPLICITLY present.
 */
function buildDetectionPrompt(): string {
  return `You are a STRICT plugin detector. Return ONLY plugins for technologies EXPLICITLY mentioned.

CRITICAL RULES:
1. ONLY return plugins when the EXACT technology keyword appears in the prompt
2. Do NOT infer or assume. "React dashboard" = sw-frontend ONLY, NOT sw-backend or sw-testing
3. Do NOT add "related" plugins. If user says "React + Stripe", return ONLY sw-frontend + sw-payments
4. When in doubt, return FEWER plugins, not more
5. NEVER return sw-testing unless user explicitly mentions "test", "TDD", "Playwright", "Jest"
6. NEVER return sw-backend unless user explicitly mentions "API", "database", "Node.js", "Express"
7. NEVER return sw-infra unless user explicitly mentions "Terraform", "Docker", "AWS", "CI/CD"
8. NEVER return sw-ado unless user explicitly mentions "Azure DevOps", "ADO", "work items"

OUTPUT FORMAT (JSON only, no markdown):
{"plugins":[],"confidence":0.9,"reasoning":"brief"}

PLUGINS (return ONLY if keyword EXPLICITLY appears):
- sw-frontend: ONLY if prompt contains: React, Vue, Angular, Next.js, dashboard, UI, CSS, frontend, component
- sw-payments: ONLY if prompt contains: Stripe, PayPal, checkout, payment, billing, subscription
- sw-backend: ONLY if prompt contains: Node.js, Express, API, database, SQL, GraphQL, backend, server
- sw-testing: ONLY if prompt contains: test, TDD, Playwright, Jest, Vitest, E2E, QA
- sw-infra: ONLY if prompt contains: Terraform, AWS, Azure (cloud), Docker, CI/CD, serverless
- sw-k8s: ONLY if prompt contains: Kubernetes, K8s, Helm, pods, deployment
- sw-mobile: ONLY if prompt contains: React Native, iOS, Android, mobile, Expo
- sw-ml: ONLY if prompt contains: ML, machine learning, PyTorch, TensorFlow
- sw-kafka: ONLY if prompt contains: Kafka, event streaming
- sw-github: ONLY if prompt contains: GitHub issues, GitHub PR, GitHub Actions
- sw-jira: ONLY if prompt contains: JIRA, epics, stories, sprints
- sw-ado: ONLY if prompt contains: Azure DevOps, ADO, work items, pipelines

EXAMPLES:

"Build React dashboard with Stripe"
{"plugins":["sw-frontend","sw-payments"],"confidence":0.95,"reasoning":"React=frontend, Stripe=payments. No backend/testing/infra mentioned."}

"Build a React app"
{"plugins":["sw-frontend"],"confidence":0.95,"reasoning":"React=frontend only. No other tech mentioned."}

"Fix the bug in the login page"
{"plugins":[],"confidence":0.9,"reasoning":"Bug fix, no specific tech mentioned."}

"How to use hooks?"
{"plugins":[],"confidence":0.9,"reasoning":"Question, no implementation needed."}

"ultrathink" or debugging discussion
{"plugins":[],"confidence":0.95,"reasoning":"Meta-discussion, not implementation."}`;
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
 * Create a fallback result using keyword detection (v1.0.153)
 *
 * When LLM detection fails, we fall back to keyword-based detection
 * to ensure users still get some plugins loaded.
 *
 * @param userPrompt - The original user prompt
 * @param startTime - Start time for duration calculation
 * @param error - Error message from failed LLM detection
 * @returns Detection result with keyword-detected plugins or empty
 */
function createKeywordFallbackResult(
  userPrompt: string,
  startTime: number,
  error?: string
): LLMDetectionResult {
  const keywordPlugins = detectPluginsByKeywords(userPrompt);

  if (keywordPlugins.length > 0) {
    logger.info(`Keyword fallback detected plugins: ${keywordPlugins.join(', ')} (LLM error: ${error || 'unknown'})`);
    return {
      success: true,
      plugins: keywordPlugins,
      confidence: 0.7, // Lower confidence for keyword-based detection
      reasoning: `Detected via keyword matching (LLM failed: ${error || 'unknown'})`,
      durationMs: performance.now() - startTime,
    };
  }

  return {
    success: false,
    plugins: [],
    confidence: 0,
    error,
    durationMs: performance.now() - startTime,
  };
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
  timeout: number = 20000 // Reduced from 30s to allow time for keyword fallback + install
): Promise<LLMDetectionResult> {
  const startTime = performance.now();

  // Check CLI availability first
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    logger.debug('Claude CLI not available for LLM detection, using keyword fallback');

    // Fall back to keyword detection (v1.0.153)
    const keywordPlugins = detectPluginsByKeywords(userPrompt);
    if (keywordPlugins.length > 0) {
      logger.info(`Keyword fallback detected plugins: ${keywordPlugins.join(', ')}`);
      return {
        success: true,
        plugins: keywordPlugins,
        confidence: 0.7, // Lower confidence for keyword-based detection
        reasoning: 'Detected via keyword matching (Claude CLI unavailable)',
        durationMs: performance.now() - startTime,
      };
    }

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
    // Execute Claude CLI with Sonnet for accuracy (v1.0.155: switched from Haiku to prevent over-detection)
    // Use --output-format json for faster response and --setting-sources user to skip project context
    const result = executeClaudeCli(['-p', fullPrompt, '--model', 'sonnet', '--output-format', 'json', '--setting-sources', 'user'], timeout);

    // Handle spawn errors - use keyword fallback (v1.0.153)
    if (result.error) {
      const errorMsg = result.error.message || String(result.error);

      // Timeout error
      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('TIMEOUT')) {
        return createKeywordFallbackResult(userPrompt, startTime, `Detection timed out after ${timeout}ms`);
      }

      return createKeywordFallbackResult(userPrompt, startTime, `Claude CLI error: ${errorMsg}`);
    }

    // Handle non-zero exit - use keyword fallback (v1.0.153)
    if (result.status !== 0) {
      const stderr = result.stderr || '';
      const stdout = result.stdout || '';

      // Check for specific errors
      if (stderr.includes('authentication') || stderr.includes('API key')) {
        return createKeywordFallbackResult(userPrompt, startTime, 'Claude CLI authentication error. Run: claude login');
      }

      if (stderr.includes('rate limit')) {
        return createKeywordFallbackResult(userPrompt, startTime, 'Rate limit exceeded. Try again later.');
      }

      // Prompt too long - common with Haiku
      if (stderr.includes('too long') || stdout.includes('too long')) {
        return createKeywordFallbackResult(userPrompt, startTime, 'Prompt too long for Haiku model');
      }

      return createKeywordFallbackResult(userPrompt, startTime, `Claude CLI exited with code ${result.status}: ${stderr || stdout}`);
    }

    // Parse the response
    let output = (result.stdout || '').trim();

    if (!output) {
      return createKeywordFallbackResult(userPrompt, startTime, 'Empty response from Claude CLI');
    }

    // Handle --output-format json wrapper (v1.0.155)
    // The response is wrapped in: {"type":"result","result":"...actual response..."}
    try {
      const wrapper = JSON.parse(output);
      if (wrapper.type === 'result' && wrapper.result) {
        output = wrapper.result;
        logger.debug(`Extracted result from JSON wrapper, duration_ms: ${wrapper.duration_ms}`);
      }
    } catch {
      // Not a JSON wrapper, use raw output
      logger.debug('Output is not JSON wrapper, using raw output');
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
    // Use keyword fallback if no JSON found (v1.0.153)
    if (!jsonMatch) {
      logger.debug(`Invalid LLM response format: ${output.slice(0, 200)}`);
      return createKeywordFallbackResult(userPrompt, startTime, 'Invalid response format (no JSON found)');
    }


    // Parse JSON
    let parsed: {
      plugins?: string[];
      confidence?: number;
      reasoning?: string;
      increment?: {
        action?: string;
        confidence?: number;
        suggestedName?: string;
        relatedKeyword?: string;
        reasoning?: string;
      };
      routing?: {
        skills?: Array<{
          name?: string;
          plugin?: string;
          fullName?: string;
          priority?: string;
          invokeWhen?: string;
          reason?: string;
        }>;
        workflow?: {
          suggestPlanMode?: boolean;
          phases?: string[];
        };
        confidence?: number;
        reasoning?: string;
      };
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.debug(`JSON parse error: ${parseError}`);
      return createKeywordFallbackResult(userPrompt, startTime, 'Failed to parse response JSON');
    }

    // Validate and filter plugins
    const rawPlugins = parsed.plugins || [];
    let validPlugins = rawPlugins.filter((p): p is SpecWeavePlugin =>
      typeof p === 'string' && SPECWEAVE_PLUGINS.includes(p as SpecWeavePlugin)
    );

    // Log if we filtered out invalid plugins
    if (validPlugins.length !== rawPlugins.length) {
      const invalid = rawPlugins.filter((p) => !SPECWEAVE_PLUGINS.includes(p as SpecWeavePlugin));
      logger.debug(`Filtered out invalid plugins: ${invalid.join(', ')}`);
    }

    // v1.0.155: STRICT MAX PLUGINS LIMIT to prevent over-detection
    // If LLM returns more than 3 plugins, it's likely over-detecting - fall back to keywords
    const MAX_PLUGINS_FROM_LLM = 3;
    if (validPlugins.length > MAX_PLUGINS_FROM_LLM) {
      logger.warn(`LLM returned ${validPlugins.length} plugins (>${MAX_PLUGINS_FROM_LLM}), likely over-detecting. Using keyword fallback.`);
      return createKeywordFallbackResult(userPrompt, startTime, `LLM over-detected (${validPlugins.length} plugins)`);
    }

    // v1.0.155: CONFIDENCE THRESHOLD - reject low-confidence results
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
    if (confidence < 0.8 && validPlugins.length > 1) {
      logger.warn(`LLM confidence too low (${confidence}) for ${validPlugins.length} plugins. Using keyword fallback.`);
      return createKeywordFallbackResult(userPrompt, startTime, `LLM confidence too low (${confidence})`);
    }

    // Parse increment recommendation (v1.0.141+)
    let incrementRecommendation: IncrementRecommendation | undefined;
    if (parsed.increment) {
      const validActions: IncrementAction[] = ['new', 'reopen', 'small_fix', 'hotfix', 'none'];
      const action = parsed.increment.action as IncrementAction;

      if (validActions.includes(action)) {
        incrementRecommendation = {
          action,
          confidence: typeof parsed.increment.confidence === 'number' ? parsed.increment.confidence : 0.5,
          suggestedName: parsed.increment.suggestedName,
          relatedKeyword: parsed.increment.relatedKeyword,
          reasoning: parsed.increment.reasoning || 'No reasoning provided',
        };
        logger.debug(`Increment recommendation: ${action} (confidence: ${incrementRecommendation.confidence})`);
      } else {
        logger.debug(`Invalid increment action: ${parsed.increment.action}`);
      }
    }

    // Parse skill routing recommendation (v1.0.150+)
    let skillRouting: SkillRouting | undefined;
    if (parsed.routing && parsed.routing.skills) {
      const validTimings: SkillInvokeTiming[] = ['immediate', 'after_increment', 'after_planning', 'with_primary', 'after_primary'];
      const validPriorities: SkillPriority[] = ['primary', 'secondary'];

      // Validate and filter skills
      const validSkills: SkillInfo[] = [];
      for (const skill of parsed.routing.skills) {
        // Validate required fields
        if (!skill.name || !skill.plugin || !skill.fullName) {
          logger.debug(`Skipping skill with missing required fields: ${JSON.stringify(skill)}`);
          continue;
        }

        // Validate plugin name
        if (!SPECWEAVE_PLUGINS.includes(skill.plugin as SpecWeavePlugin)) {
          logger.debug(`Skipping skill with invalid plugin: ${skill.plugin}`);
          continue;
        }

        // Validate and default timing
        const invokeWhen = validTimings.includes(skill.invokeWhen as SkillInvokeTiming)
          ? (skill.invokeWhen as SkillInvokeTiming)
          : 'after_increment';

        // Validate and default priority
        const priority = validPriorities.includes(skill.priority as SkillPriority)
          ? (skill.priority as SkillPriority)
          : 'secondary';

        validSkills.push({
          name: skill.name,
          plugin: skill.plugin,
          fullName: skill.fullName,
          priority,
          invokeWhen,
          reason: skill.reason || 'No reason provided',
        });
      }

      if (validSkills.length > 0) {
        skillRouting = {
          skills: validSkills,
          workflow: {
            suggestPlanMode: parsed.routing.workflow?.suggestPlanMode ?? false,
            phases: parsed.routing.workflow?.phases ?? [],
          },
          confidence: typeof parsed.routing.confidence === 'number' ? parsed.routing.confidence : 0.5,
          reasoning: parsed.routing.reasoning || 'No reasoning provided',
        };

        // Log routing decision
        const primarySkill = validSkills.find(s => s.priority === 'primary');
        const secondarySkills = validSkills.filter(s => s.priority === 'secondary');
        logger.debug(`Skill routing: primary=${primarySkill?.fullName || 'none'}, secondary=[${secondarySkills.map(s => s.fullName).join(', ')}]`);
      }
    }

    return {
      success: true,
      plugins: validPlugins,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning,
      durationMs: performance.now() - startTime,
      increment: incrementRecommendation,
      routing: skillRouting,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`LLM detection failed: ${errorMsg}`);

    // Use keyword fallback on any exception (v1.0.153)
    return createKeywordFallbackResult(userPrompt, startTime, `Detection failed: ${errorMsg}`);
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
