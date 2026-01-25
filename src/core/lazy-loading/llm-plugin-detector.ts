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
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
// IMPORTANT: Use canonical Claude CLI detection from utils (handles shell functions, nvm, etc.)
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';

/**
 * Plugin auto-load configuration from .specweave/config.json
 */
export interface PluginAutoLoadConfig {
  /** Whether auto-loading is enabled at all */
  enabled: boolean;
  /** If true, only suggest plugins without installing them */
  suggestOnly: boolean;
}

/**
 * Read plugin auto-load configuration from .specweave/config.json
 *
 * @returns Config object with enabled/suggestOnly flags
 */
export function readPluginAutoLoadConfig(): PluginAutoLoadConfig {
  // Default: enabled, not suggest-only (original behavior)
  const defaultConfig: PluginAutoLoadConfig = {
    enabled: true,
    suggestOnly: false,
  };

  // Check env var override first
  if (process.env.SPECWEAVE_DISABLE_AUTO_LOAD === '1') {
    logger.debug('[readPluginAutoLoadConfig] Auto-load disabled via SPECWEAVE_DISABLE_AUTO_LOAD=1');
    return { enabled: false, suggestOnly: true };
  }

  // Try to read from config file
  const configPath = path.join(process.cwd(), '.specweave', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);

      if (config.pluginAutoLoad) {
        const result = {
          enabled: config.pluginAutoLoad.enabled !== false, // default true
          suggestOnly: config.pluginAutoLoad.suggestOnly === true, // default false
        };
        logger.debug(`[readPluginAutoLoadConfig] Config: enabled=${result.enabled}, suggestOnly=${result.suggestOnly}`);
        return result;
      }
    }
  } catch (error) {
    logger.debug(`[readPluginAutoLoadConfig] Error reading config: ${error}`);
  }

  return defaultConfig;
}

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
  'sw-plugin-dev',    // Plugin development
  // NOTE: sw-router is OBSOLETE as of v1.0.160 - detect-intent now handles routing
] as const;

export type SpecWeavePlugin = (typeof SPECWEAVE_PLUGINS)[number];

/**
 * Official Claude Code plugins (from claude-plugins-official marketplace)
 *
 * v1.0.159: Consolidated plugin detection - detect-intent handles BOTH SW and official plugins
 *
 * NOTE: Excludes plugins that collide with SpecWeave:
 * - github@claude-plugins-official → use sw-github instead
 * - stripe@claude-plugins-official → use sw-payments instead
 */
export const OFFICIAL_PLUGINS = [
  // LSP (Language Server Protocol) - language-specific code intelligence
  'csharp-lsp',       // C#, .NET, ASP.NET, Blazor
  'gopls-lsp',        // Go, Golang
  'jdtls-lsp',        // Java, Spring, Maven, Gradle
  'kotlin-lsp',       // Kotlin
  'php-lsp',          // PHP, Laravel, Symfony
  'lua-lsp',          // Lua, Neovim
  'clangd-lsp',       // C, C++

  // Core/Required
  'context7',         // Documentation lookup (useful for any coding)
  'playwright',       // Browser automation, E2E testing

  // Service Integrations (no SW equivalent)
  'firebase',         // Firebase, Firestore
  'gitlab',           // GitLab, GitLab CI
  'linear',           // Linear issues
  'asana',            // Asana tasks
  'slack',            // Slack bots/apps
  'supabase',         // Supabase

  // Framework-specific
  'laravel-boost',    // Laravel (PHP)

  // Development Tools
  'code-review',      // Code review
  'commit-commands',  // Git commit workflows
  'hookify',          // Git hooks
] as const;

export type OfficialPlugin = (typeof OFFICIAL_PLUGINS)[number];

/**
 * All valid plugins (both SpecWeave and Official)
 */
export const ALL_VALID_PLUGINS = [...SPECWEAVE_PLUGINS, ...OFFICIAL_PLUGINS] as const;
export type ValidPlugin = SpecWeavePlugin | OfficialPlugin;

/**
 * Check if a plugin is a SpecWeave plugin (installed from @specweave)
 */
export function isSpecWeavePlugin(plugin: string): plugin is SpecWeavePlugin {
  return SPECWEAVE_PLUGINS.includes(plugin as SpecWeavePlugin);
}

/**
 * Check if a plugin is an official plugin (installed from @claude-plugins-official)
 */
export function isOfficialPlugin(plugin: string): plugin is OfficialPlugin {
  return OFFICIAL_PLUGINS.includes(plugin as OfficialPlugin);
}

/**
 * Get the marketplace name for a plugin
 * SW plugins: @specweave, Official plugins: @claude-plugins-official
 */
export function getPluginMarketplace(plugin: string): string {
  if (isSpecWeavePlugin(plugin)) {
    return 'specweave';
  }
  if (isOfficialPlugin(plugin)) {
    return 'claude-plugins-official';
  }
  return 'unknown';
}

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
 *
 * v1.0.159: plugins now includes both SpecWeave (sw-*) and official plugins
 */
export interface LLMDetectionResult {
  success: boolean;
  plugins: ValidPlugin[];
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
 * v1.0.155: MINIMAL detection - only detect technologies EXPLICITLY mentioned in the prompt
 */
function buildDetectionPrompt(): string {
  return `You detect which plugins to load based on the user's prompt.
Return BOTH SpecWeave (sw-*) AND official (claude-plugins-official) plugins.

⚠️ PRIORITY: SpecWeave plugins OVERRIDE official for these services:
- GitHub → sw-github (NOT github@claude-plugins-official)
- Stripe/payments → sw-payments (NOT stripe@claude-plugins-official)
- JIRA → sw-jira | Azure DevOps → sw-ado

DETECTION RULES:
1. EXPLICIT tech - user says "React" → sw-frontend, ".NET" → sw-backend + csharp-lsp
2. IMPLIED - "dashboard" needs API → sw-backend
3. LSP - language-specific code intelligence (C#→csharp-lsp, Go→gopls-lsp, etc.)
4. Questions/discussions → ZERO plugins

OUTPUT FORMAT (JSON only):
{"plugins":["sw-frontend","context7"],"confidence":0.9,"reasoning":"one-line"}

═══════════════════════════════════════════════════════════════
SPECWEAVE PLUGINS (sw-*@specweave) - PRIORITY for overlapping services
═══════════════════════════════════════════════════════════════

sw-frontend: React, Vue, Angular, Next.js, Svelte, UI, dashboard, components, Tailwind
sw-backend: API, REST, GraphQL, .NET, C#, Node.js, Express, FastAPI, Django, Spring Boot, Go, PostgreSQL, MongoDB
sw-payments: Stripe, PayPal, checkout, billing, subscriptions (USE THIS instead of stripe@official)
sw-testing: TDD, Jest, Vitest, Playwright, Cypress, E2E (ONLY if explicit)
sw-infra: Terraform, Docker, AWS, CI/CD, CloudFormation (ONLY if explicit)
sw-k8s: Kubernetes, Helm, EKS, AKS, GKE (ONLY if explicit)
sw-mobile: React Native, iOS, Android, Expo, Flutter (ONLY if explicit)
sw-ml: ML, PyTorch, TensorFlow, LLM, MLOps (ONLY if explicit)
sw-kafka: Kafka, event streaming, MSK (ONLY if explicit)
sw-confluent: Confluent Cloud, Schema Registry, ksqlDB (ONLY if explicit)
sw-github: GitHub issues, PRs, Actions, sync (USE THIS instead of github@official)
sw-jira: JIRA, Atlassian (ONLY if explicit)
sw-ado: Azure DevOps, work items (ONLY if explicit)

═══════════════════════════════════════════════════════════════
OFFICIAL PLUGINS (@claude-plugins-official) - Use when NO SW equivalent
═══════════════════════════════════════════════════════════════

LSP (Language Server Protocol) - Add for language-specific code intelligence:
  csharp-lsp: C#, .NET, ASP.NET, Blazor, Entity Framework
  gopls-lsp: Go, Golang
  jdtls-lsp: Java, Spring, Maven, Gradle
  kotlin-lsp: Kotlin, Android Kotlin
  php-lsp: PHP, Laravel, Symfony
  lua-lsp: Lua, Neovim plugins
  clangd-lsp: C, C++, embedded

Core/Required:
  context7: Documentation lookup (add for ANY coding task)
  playwright: Browser automation (add when E2E/browser testing mentioned)

Service Integrations (NO SW equivalent - use these):
  firebase: Firebase, Firestore, Firebase Auth
  gitlab: GitLab, GitLab CI/CD pipelines
  linear: Linear issues, Linear project management
  asana: Asana tasks, Asana projects
  slack: Slack bots, Slack apps, Slack webhooks
  supabase: Supabase, Supabase Auth, Supabase DB

Framework-specific:
  laravel-boost: Laravel (PHP framework)

Development Tools:
  code-review: Code review, PR review
  commit-commands: Git commit workflows
  hookify: Git hooks, pre-commit hooks

═══════════════════════════════════════════════════════════════
INCREMENT RECOMMENDATION (v1.0.160)
═══════════════════════════════════════════════════════════════

ALSO analyze if user should create/reopen a SpecWeave increment.

"increment" field with:
- action: "new" | "reopen" | "small_fix" | "hotfix" | "none"
- confidence: 0.0-1.0
- suggestedName: kebab-case name (for "new")
- reasoning: brief explanation

WHEN TO USE EACH ACTION:
┌─────────────┬─────────────────────────────────────────────────────────────┐
│ new         │ Multi-file feature, significant implementation, new func   │
│ hotfix      │ "urgent", "production bug", "critical fix"                 │
│ reopen      │ "fix the X feature", work related to recent increment      │
│ small_fix   │ Typo, config tweak, single-line fix, version bump          │
│ none        │ Questions, exploration, "how do I", general chat           │
└─────────────┴─────────────────────────────────────────────────────────────┘

EXPLICIT OPT-OUT → action: "none":
- "don't create an increment", "no increment needed", "skip workflow"
- "just a quick fix", "without tracking", "already tracking"

═══════════════════════════════════════════════════════════════
EXAMPLES (with increment field)
═══════════════════════════════════════════════════════════════

"Create React dashboard with Stripe checkout and .NET backend"
{"plugins":["sw-frontend","sw-backend","sw-payments","csharp-lsp","context7"],"confidence":0.95,"reasoning":"React→frontend, .NET→backend+csharp-lsp, Stripe→sw-payments","increment":{"action":"new","confidence":0.95,"suggestedName":"react-dashboard-stripe","reasoning":"Multi-component feature requiring spec-driven tracking"}}

"Build Go microservice with PostgreSQL"
{"plugins":["sw-backend","gopls-lsp","context7"],"confidence":0.95,"reasoning":"Go→backend+gopls-lsp","increment":{"action":"new","confidence":0.9,"suggestedName":"go-microservice-postgres","reasoning":"New service implementation"}}

"Fix the login bug"
{"plugins":[],"confidence":0.9,"reasoning":"Generic bug fix","increment":{"action":"small_fix","confidence":0.85,"reasoning":"Bug fix, likely single-file change"}}

"The auth feature is broken again"
{"plugins":[],"confidence":0.7,"reasoning":"No specific tech mentioned","increment":{"action":"reopen","confidence":0.8,"relatedKeyword":"auth","reasoning":"Related to previous auth work"}}

"How do I use React hooks?"
{"plugins":[],"confidence":0.95,"reasoning":"Question only","increment":{"action":"none","confidence":0.99,"reasoning":"Question, no implementation"}}

"Update the package version to 2.0"
{"plugins":[],"confidence":0.9,"reasoning":"Version bump","increment":{"action":"small_fix","confidence":0.95,"reasoning":"Config/version change, no feature work"}}

"Urgent: production checkout is failing"
{"plugins":["sw-payments"],"confidence":0.9,"reasoning":"Payment issue","increment":{"action":"hotfix","confidence":0.95,"suggestedName":"checkout-hotfix","reasoning":"Production issue requires immediate attention"}}

"Just fix the typo in README, don't track it"
{"plugins":[],"confidence":0.95,"reasoning":"Typo fix","increment":{"action":"none","confidence":0.99,"reasoning":"User explicitly opted out of tracking"}}`;
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
 * Create a failure result when LLM detection fails (v1.0.157)
 *
 * v1.0.157: Keyword fallback REMOVED - if LLM fails, return ZERO plugins.
 * This is safer than guessing wrong (which caused over-detection bugs).
 *
 * @param startTime - Start time for duration calculation
 * @param error - Error message from failed LLM detection
 * @returns Detection result with empty plugins
 */
function createFailureResult(
  startTime: number,
  error?: string
): LLMDetectionResult {
  logger.warn(`LLM detection failed: ${error || 'unknown'} - returning empty plugins (no fallback)`);
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
  timeout: number = 15000 // v1.0.159: Reduced to 15s with --setting-sources "" optimization (CLI starts in <1s)
): Promise<LLMDetectionResult> {
  const startTime = performance.now();

  // Check CLI availability first
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    // v1.0.157: No keyword fallback - if CLI unavailable, return empty plugins
    // This is safer than guessing wrong (which caused over-detection bugs)
    logger.warn('Claude CLI not available for LLM detection - returning empty plugins (no fallback)');
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
    // Execute Claude CLI with haiku for fast detection
    // v1.0.159: Use --setting-sources "" (empty) to skip ALL settings loading
    // This reduces startup from ~50s to <1s by avoiding context cache loading
    // The comprehensive prompt already contains all needed plugin knowledge
    const result = executeClaudeCli(['-p', fullPrompt, '--model', 'haiku', '--output-format', 'json', '--setting-sources', ''], timeout);

    // Handle spawn errors - return failure (v1.0.157 - no fallback)
    if (result.error) {
      const errorMsg = result.error.message || String(result.error);

      // Timeout error
      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('TIMEOUT')) {
        return createFailureResult(startTime, `Detection timed out after ${timeout}ms`);
      }

      return createFailureResult(startTime, `Claude CLI error: ${errorMsg}`);
    }

    // Handle non-zero exit - return failure (v1.0.157 - no fallback)
    if (result.status !== 0) {
      const stderr = result.stderr || '';
      const stdout = result.stdout || '';

      // Check for specific errors
      if (stderr.includes('authentication') || stderr.includes('API key')) {
        return createFailureResult(startTime, 'Claude CLI authentication error. Run: claude login');
      }

      if (stderr.includes('rate limit')) {
        return createFailureResult(startTime, 'Rate limit exceeded. Try again later.');
      }

      // Prompt too long - common with Haiku
      if (stderr.includes('too long') || stdout.includes('too long')) {
        return createFailureResult(startTime, 'Prompt too long for Haiku model');
      }

      return createFailureResult(startTime, `Claude CLI exited with code ${result.status}: ${stderr || stdout}`);
    }

    // Parse the response
    let output = (result.stdout || '').trim();

    if (!output) {
      return createFailureResult(startTime, 'Empty response from Claude CLI');
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
    // v1.0.157+: Return failure if no JSON (no keyword fallback - LLM-only detection)
    if (!jsonMatch) {
      logger.debug(`Invalid LLM response format: ${output.slice(0, 200)}`);
      return createFailureResult(startTime, 'Invalid response format (no JSON found)');
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
      return createFailureResult(startTime, 'Failed to parse response JSON');
    }

    // Validate and filter plugins (v1.0.159: accept both SW and official plugins)
    const rawPlugins = parsed.plugins || [];
    let validPlugins = rawPlugins.filter((p): p is ValidPlugin =>
      typeof p === 'string' && (ALL_VALID_PLUGINS as readonly string[]).includes(p)
    );

    // Log if we filtered out invalid plugins
    if (validPlugins.length !== rawPlugins.length) {
      const invalid = rawPlugins.filter((p) => !(ALL_VALID_PLUGINS as readonly string[]).includes(p));
      logger.debug(`Filtered out invalid plugins: ${invalid.join(', ')}`);
    }

    // v1.0.156: Trust Opus model - no arbitrary limits, no keyword fallback
    // Opus understands NECESSARY implications (dashboard → backend) vs OPTIONAL (→ infra)

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

    // v1.0.157+: Return failure on exception (no keyword fallback - LLM-only detection)
    return createFailureResult(startTime, `Detection failed: ${errorMsg}`);
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
  // v1.0.159: Validate against both SW and official plugins
  const isSW = isSpecWeavePlugin(pluginName);
  const isOfficial = isOfficialPlugin(pluginName);

  if (!isSW && !isOfficial) {
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

  // Determine marketplace: sw-* → @specweave, others → @claude-plugins-official
  const marketplace = isSW ? 'specweave' : 'claude-plugins-official';
  const fullPluginName = `${pluginName}@${marketplace}`;

  try {
    const result = executeClaudeCli(['plugin', 'install', fullPluginName], timeout);

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
 * Full pipeline: detect plugins from prompt and optionally install them
 *
 * Respects .specweave/config.json pluginAutoLoad settings:
 * - enabled: false → skip detection entirely
 * - suggestOnly: true → detect but don't install, return suggestions
 *
 * @param userPrompt - The user's prompt
 * @returns Detection and installation results
 */
export async function detectAndInstallPlugins(userPrompt: string): Promise<{
  detection: LLMDetectionResult;
  installations: PluginInstallResult[];
  suggestOnly?: boolean;
}> {
  // Check config first
  const config = readPluginAutoLoadConfig();

  // If auto-load is completely disabled, skip detection
  if (!config.enabled) {
    logger.debug('[detectAndInstallPlugins] Auto-load disabled in config, skipping detection');
    return {
      detection: {
        success: true,
        plugins: [],
        confidence: 1.0,
        reasoning: 'Plugin auto-load disabled in config',
        durationMs: 0,
      },
      installations: [],
    };
  }

  // Step 1: Detect needed plugins
  const detection = await detectPluginsViaLLM(userPrompt);

  if (!detection.success || detection.plugins.length === 0) {
    return {
      detection,
      installations: [],
    };
  }

  // Step 2: If suggestOnly mode, DON'T install - just return suggestions
  if (config.suggestOnly) {
    logger.info(`[detectAndInstallPlugins] Suggest-only mode: detected ${detection.plugins.join(', ')}`);
    return {
      detection,
      installations: [],
      suggestOnly: true,
    };
  }

  // Step 3: Install detected plugins (original behavior)
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
  suggestOnly?: boolean;
}): string {
  const { detection, installations, suggestOnly } = result;

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
    // SUGGEST-ONLY MODE: Show which plugins would help, but don't install
    if (suggestOnly) {
      const pluginList = detection.plugins.join(', ');
      output.systemMessage = `SpecWeave: Plugins that may help: ${pluginList}

To install: claude plugin install <plugin>@specweave
After installing, restart Claude Code session to use new plugins.`;
      return JSON.stringify(output);
    }

    // NORMAL MODE: Show what was installed
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
