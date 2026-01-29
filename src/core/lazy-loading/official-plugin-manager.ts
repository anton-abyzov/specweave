/**
 * Official Plugin Manager
 *
 * Manages required plugins from claude-plugins-official marketplace.
 * Ensures context7 and playwright are always installed, and detects
 * when other official plugins (LSP, etc.) are needed based on user prompts.
 *
 * @module core/lazy-loading/official-plugin-manager
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { consoleLogger as logger } from '../../utils/logger.js';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { detectClaudeCli } from '../../utils/claude-cli-detector.js';

/**
 * Required plugins that MUST always be installed
 */
export const REQUIRED_PLUGINS = ['context7', 'playwright'] as const;

/**
 * Plugins to EXCLUDE from official marketplace (use SpecWeave versions instead)
 * - github → use sw-github
 * - jira → use sw-jira
 * - ado/azure-devops → use sw-ado
 */
export const EXCLUDED_OFFICIAL_PLUGINS = ['github', 'jira', 'ado', 'azure-devops'] as const;

/**
 * Mapping of technology keywords to official plugins
 * Comprehensive list of ALL claude-plugins-official plugins (~33+)
 */
export const OFFICIAL_PLUGIN_MAP: Record<string, string> = {
  // ============================================================================
  // LSP PLUGINS (Language Server Protocol for code intelligence)
  // ============================================================================

  // TypeScript/JavaScript (most common - uses typescript-language-server)
  'typescript': 'typescript-lsp',
  'ts': 'typescript-lsp',
  'javascript': 'typescript-lsp',
  'js': 'typescript-lsp',
  'react': 'typescript-lsp',
  'nextjs': 'typescript-lsp',
  'next.js': 'typescript-lsp',
  'vue': 'typescript-lsp',
  'angular': 'typescript-lsp',
  'svelte': 'typescript-lsp',
  'node': 'typescript-lsp',
  'nodejs': 'typescript-lsp',
  'express': 'typescript-lsp',
  'nestjs': 'typescript-lsp',

  // C#/.NET
  'csharp': 'csharp-lsp',
  'c#': 'csharp-lsp',
  '.net': 'csharp-lsp',
  'dotnet': 'csharp-lsp',
  'asp.net': 'csharp-lsp',
  'blazor': 'csharp-lsp',

  'golang': 'gopls-lsp',
  'go lang': 'gopls-lsp',

  'java': 'jdtls-lsp',
  'spring': 'jdtls-lsp',
  'maven': 'jdtls-lsp',
  'gradle': 'jdtls-lsp',

  'kotlin': 'kotlin-lsp',
  'android kotlin': 'kotlin-lsp',

  'lua': 'lua-lsp',
  'neovim lua': 'lua-lsp',

  'php': 'php-lsp',
  'symfony': 'php-lsp',

  'c++': 'clangd-lsp',
  'cpp': 'clangd-lsp',
  'clang': 'clangd-lsp',

  // ============================================================================
  // DEVELOPMENT WORKFLOW PLUGINS
  // ============================================================================
  'agent sdk': 'agent-sdk-dev',
  'build agent': 'agent-sdk-dev',
  'claude agent': 'agent-sdk-dev',

  'claude code setup': 'claude-code-setup',
  'setup claude': 'claude-code-setup',

  'claude.md': 'claude-md-management',
  'claude md': 'claude-md-management',

  'code review': 'code-review',
  'review code': 'code-review',
  'pr review': 'code-review',

  'simplify code': 'code-simplifier',
  'code simplifier': 'code-simplifier',
  'refactor': 'code-simplifier',

  'commit': 'commit-commands',
  'git commit': 'commit-commands',

  'feature development': 'feature-dev',
  'feature dev': 'feature-dev',

  'frontend design': 'frontend-design',
  'ui design': 'frontend-design',
  'design system': 'frontend-design',

  'hooks': 'hookify',
  'hookify': 'hookify',
  'git hooks': 'hookify',

  'plugin development': 'plugin-dev',
  'plugin dev': 'plugin-dev',
  'create plugin': 'plugin-dev',

  // ============================================================================
  // EXTERNAL SERVICE INTEGRATIONS
  // NOTE: For GitHub, JIRA, ADO - use SpecWeave plugins (sw-github, sw-jira, sw-ado)
  // ============================================================================
  'firebase': 'firebase',
  'firestore': 'firebase',
  'firebase auth': 'firebase',

  'gitlab': 'gitlab',
  'gitlab ci': 'gitlab',
  'gitlab pipeline': 'gitlab',

  'linear': 'linear',
  'linear issues': 'linear',
  'linear tasks': 'linear',

  'asana': 'asana',
  'asana tasks': 'asana',
  'asana project': 'asana',

  'slack': 'slack',
  'slack bot': 'slack',
  'slack integration': 'slack',
  'slack app': 'slack',

  'stripe': 'stripe',
  'stripe api': 'stripe',
  'stripe payment': 'stripe',
  'stripe checkout': 'stripe',

  'supabase': 'supabase',
  'supabase db': 'supabase',
  'supabase auth': 'supabase',

  'laravel': 'laravel-boost',
  'laravel boost': 'laravel-boost',

  'greptile': 'greptile',
  'code search': 'greptile',
  'codebase search': 'greptile',

  'serena': 'serena',
};

/**
 * Result of plugin check
 */
export interface PluginCheckResult {
  /** All required plugins installed */
  allInstalled: boolean;
  /** Plugins that are missing */
  missingPlugins: string[];
  /** Plugins that were just installed */
  installedPlugins: string[];
  /** Whether session restart is needed */
  needsRestart: boolean;
  /** Message to show user */
  message: string;
  /** Prompt to copy-paste into new session */
  copyPastePrompt?: string;
}

/**
 * Get the Claude plugins registry path
 */
function getRegistryPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
}

/**
 * Get the official marketplace path
 */
function getOfficialMarketplacePath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', 'claude-plugins-official');
}

/**
 * Check if a plugin is installed
 */
export function isPluginInstalled(pluginName: string): boolean {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) return false;

  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const registryKey = `${pluginName}@claude-plugins-official`;
    return !!registry.plugins?.[registryKey]?.length;
  } catch {
    return false;
  }
}

/**
 * Get list of all available plugins in claude-plugins-official
 */
export function getAvailableOfficialPlugins(): string[] {
  const marketplacePath = getOfficialMarketplacePath();
  const plugins: string[] = [];

  // Check plugins/ directory
  const pluginsDir = path.join(marketplacePath, 'plugins');
  if (fs.existsSync(pluginsDir)) {
    try {
      const dirs = fs.readdirSync(pluginsDir).filter(name => {
        const fullPath = path.join(pluginsDir, name);
        return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
      });
      plugins.push(...dirs);
    } catch {
      // Ignore errors
    }
  }

  // Check external_plugins/ directory
  const externalDir = path.join(marketplacePath, 'external_plugins');
  if (fs.existsSync(externalDir)) {
    try {
      const dirs = fs.readdirSync(externalDir).filter(name => {
        const fullPath = path.join(externalDir, name);
        return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
      });
      plugins.push(...dirs);
    } catch {
      // Ignore errors
    }
  }

  return plugins;
}

/**
 * Install a plugin from claude-plugins-official marketplace
 * Skips installation if plugin is already installed (prevents double installation)
 */
export function installOfficialPlugin(pluginName: string): boolean {
  // Double-check: skip if already installed
  if (isPluginInstalled(pluginName)) {
    logger.debug(`Plugin already installed, skipping: ${pluginName}`);
    return true; // Return true since it's "installed"
  }

  const cliStatus = detectClaudeCli();
  if (!cliStatus.available) {
    logger.warn('Claude CLI not available for plugin installation');
    return false;
  }

  try {
    const result = execFileNoThrowSync('claude', [
      'plugin', 'install', `${pluginName}@claude-plugins-official`
    ], { timeout: 60000 });

    if (result.success) {
      logger.info(`Installed official plugin: ${pluginName}`);
      return true;
    }

    logger.warn(`Failed to install ${pluginName}: ${result.stderr || result.stdout}`);
    return false;
  } catch (error) {
    logger.error(`Error installing ${pluginName}: ${error}`);
    return false;
  }
}

/**
 * Ensure required plugins (context7, playwright) are installed
 */
export function ensureRequiredPlugins(): PluginCheckResult {
  const missingPlugins: string[] = [];
  const installedPlugins: string[] = [];

  for (const plugin of REQUIRED_PLUGINS) {
    if (!isPluginInstalled(plugin)) {
      missingPlugins.push(plugin);
    }
  }

  if (missingPlugins.length === 0) {
    return {
      allInstalled: true,
      missingPlugins: [],
      installedPlugins: [],
      needsRestart: false,
      message: 'All required plugins are installed.',
    };
  }

  // Try to install missing plugins
  for (const plugin of missingPlugins) {
    if (installOfficialPlugin(plugin)) {
      installedPlugins.push(plugin);
    }
  }

  const stillMissing = missingPlugins.filter(p => !installedPlugins.includes(p));

  if (installedPlugins.length > 0) {
    return {
      allInstalled: stillMissing.length === 0,
      missingPlugins: stillMissing,
      installedPlugins,
      needsRestart: true,
      message: `Installed required plugins: ${installedPlugins.join(', ')}. Please restart Claude Code to activate them.`,
      copyPastePrompt: 'Continue with my previous task.',
    };
  }

  return {
    allInstalled: false,
    missingPlugins: stillMissing,
    installedPlugins: [],
    needsRestart: false,
    message: `Failed to install required plugins: ${stillMissing.join(', ')}. Please install manually with: claude plugin install ${stillMissing.map(p => `${p}@claude-plugins-official`).join(' ')}`,
  };
}

/**
 * Detect which official plugins are needed based on user prompt
 * Uses LLM (Opus) to analyze the prompt
 */
export async function detectNeededOfficialPlugins(userPrompt: string): Promise<string[]> {
  const cliStatus = detectClaudeCli();
  if (!cliStatus.available) {
    // Fall back to keyword detection
    return detectPluginsByKeywords(userPrompt);
  }

  const allAvailablePlugins = getAvailableOfficialPlugins();

  // Filter out plugins that should use SpecWeave versions instead
  const availablePlugins = allAvailablePlugins.filter(
    p => !EXCLUDED_OFFICIAL_PLUGINS.includes(p.toLowerCase() as typeof EXCLUDED_OFFICIAL_PLUGINS[number])
  );

  const systemPrompt = `You detect which plugins from claude-plugins-official marketplace are needed.

AVAILABLE PLUGINS (${availablePlugins.length} total):
${availablePlugins.map(p => `- ${p}`).join('\n')}

=== LSP PLUGINS (Language Server Protocol - code intelligence) ===
- csharp-lsp: C#, .NET, ASP.NET, Blazor, Entity Framework
- gopls-lsp: Go, Golang
- jdtls-lsp: Java, Spring, Maven, Gradle
- kotlin-lsp: Kotlin, Android Kotlin
- lua-lsp: Lua, Neovim plugins
- php-lsp: PHP, Symfony
- clangd-lsp: C, C++, Clang

=== DEVELOPMENT WORKFLOW PLUGINS ===
- agent-sdk-dev: Building Claude agents, Agent SDK
- claude-code-setup: Setting up Claude Code
- claude-md-management: Managing CLAUDE.md files
- code-review: Code reviews, PR reviews
- code-simplifier: Code refactoring, simplification
- commit-commands: Git commits, commit messages
- feature-dev: Feature development workflow
- frontend-design: UI/UX design, design systems
- hookify: Git hooks, pre-commit hooks
- plugin-dev: Creating Claude plugins

=== EXTERNAL SERVICE INTEGRATIONS ===
- context7: Documentation lookup (ALWAYS needed for coding tasks)
- playwright: Browser automation, E2E testing, web scraping
- firebase: Firebase, Firestore, Firebase Auth
- gitlab: GitLab CI/CD, GitLab pipelines
- linear: Linear issue tracking
- asana: Asana tasks, project management
- slack: Slack bot, Slack integration, Slack app
- stripe: Stripe payments, checkout, subscriptions
- supabase: Supabase database, Supabase auth
- laravel-boost: Laravel PHP framework
- greptile: Codebase search, semantic code search
- serena: Project management assistant

=== PRIORITY RULE ===
For GitHub/JIRA/ADO → use SpecWeave plugins (sw-github, sw-jira, sw-ado) instead.

=== DETECTION RULES ===
1. context7 is ALWAYS needed for any coding task
2. playwright is ALWAYS needed for testing/E2E/browser tasks
3. LSP plugins ONLY if user explicitly mentions the language/framework
4. External plugins when user mentions specific service (Slack, Stripe, etc.)
5. Return JSON array of plugin names only

OUTPUT FORMAT (JSON only):
["plugin1", "plugin2"]

EXAMPLES:
"Build a C# API with ASP.NET" → ["context7", "csharp-lsp"]
"Create React app with tests" → ["context7", "playwright"]
"Fix the Go microservice" → ["context7", "gopls-lsp"]
"Build Slack integration" → ["context7", "slack"]
"Add Stripe payments" → ["context7", "stripe"]
"Set up Firebase auth" → ["context7", "firebase"]
"Help me with this code" → ["context7"]`;

  try {
    const result = execFileNoThrowSync('claude', [
      '-p', `${systemPrompt}\n\nUser prompt: "${userPrompt}"\n\nWhich plugins are needed?`,
      '--model', 'haiku',
      '--output-format', 'json',
      '--setting-sources', 'user'
    ], { timeout: 15000 });

    if (!result.success) {
      return detectPluginsByKeywords(userPrompt);
    }

    let output = result.stdout.trim();

    // Handle JSON wrapper
    try {
      const wrapper = JSON.parse(output);
      if (wrapper.type === 'result' && wrapper.result) {
        output = wrapper.result;
      }
    } catch {
      // Not a wrapper
    }

    // Extract JSON array
    const jsonMatch = output.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const plugins = JSON.parse(jsonMatch[0]) as string[];
      // Always include required plugins (context7, playwright)
      for (const required of REQUIRED_PLUGINS) {
        if (!plugins.includes(required)) {
          plugins.unshift(required);
        }
      }
      // Deduplicate, filter to available plugins (but always keep REQUIRED_PLUGINS), exclude SpecWeave-handled
      const uniquePlugins = [...new Set(plugins)];
      return uniquePlugins
        .filter(p => REQUIRED_PLUGINS.includes(p as typeof REQUIRED_PLUGINS[number]) || availablePlugins.includes(p))
        .filter(p => !EXCLUDED_OFFICIAL_PLUGINS.includes(p.toLowerCase() as typeof EXCLUDED_OFFICIAL_PLUGINS[number]));
    }

    return detectPluginsByKeywords(userPrompt);
  } catch (error) {
    logger.debug(`LLM detection failed: ${error}`);
    return detectPluginsByKeywords(userPrompt);
  }
}

/**
 * Simple keyword-based detection fallback
 */
function detectPluginsByKeywords(prompt: string): string[] {
  const plugins: string[] = ['context7']; // Always include context7
  const lowerPrompt = prompt.toLowerCase();

  for (const [keyword, plugin] of Object.entries(OFFICIAL_PLUGIN_MAP)) {
    if (lowerPrompt.includes(keyword.toLowerCase()) && !plugins.includes(plugin)) {
      plugins.push(plugin);
    }
  }

  // Add playwright for testing-related prompts
  if (/test|e2e|playwright|browser|automation/i.test(prompt) && !plugins.includes('playwright')) {
    plugins.push('playwright');
  }

  return plugins;
}

/**
 * Check and install needed official plugins
 * Returns result with restart instructions if needed
 */
export async function checkAndInstallOfficialPlugins(
  userPrompt: string,
  originalPrompt?: string
): Promise<PluginCheckResult> {
  // First ensure required plugins
  const requiredResult = ensureRequiredPlugins();
  if (requiredResult.needsRestart) {
    requiredResult.copyPastePrompt = originalPrompt || userPrompt;
    return requiredResult;
  }

  // Then detect additional needed plugins
  const neededPlugins = await detectNeededOfficialPlugins(userPrompt);
  const missingPlugins: string[] = [];
  const installedPlugins: string[] = [...requiredResult.installedPlugins];

  for (const plugin of neededPlugins) {
    if (!isPluginInstalled(plugin)) {
      missingPlugins.push(plugin);
    }
  }

  if (missingPlugins.length === 0) {
    return {
      allInstalled: true,
      missingPlugins: [],
      installedPlugins,
      needsRestart: installedPlugins.length > 0,
      message: installedPlugins.length > 0
        ? `Installed: ${installedPlugins.join(', ')}. Please restart Claude Code.`
        : 'All needed plugins are installed.',
      copyPastePrompt: installedPlugins.length > 0 ? (originalPrompt || userPrompt) : undefined,
    };
  }

  // Install missing plugins
  for (const plugin of missingPlugins) {
    if (installOfficialPlugin(plugin)) {
      installedPlugins.push(plugin);
    }
  }

  const stillMissing = missingPlugins.filter(p => !installedPlugins.includes(p));

  if (installedPlugins.length > 0) {
    return {
      allInstalled: stillMissing.length === 0,
      missingPlugins: stillMissing,
      installedPlugins,
      needsRestart: true,
      message: buildRestartMessage(installedPlugins, stillMissing),
      copyPastePrompt: originalPrompt || userPrompt,
    };
  }

  return {
    allInstalled: false,
    missingPlugins: stillMissing,
    installedPlugins: [],
    needsRestart: false,
    message: `Could not install: ${stillMissing.join(', ')}`,
  };
}

/**
 * Build user-friendly restart message
 */
function buildRestartMessage(installed: string[], failed: string[]): string {
  let msg = `\n${'═'.repeat(60)}\n`;
  msg += '⚠️  PLUGINS INSTALLED - RESTART REQUIRED\n';
  msg += `${'═'.repeat(60)}\n\n`;

  msg += `✅ Installed: ${installed.join(', ')}\n`;

  if (failed.length > 0) {
    msg += `❌ Failed: ${failed.join(', ')}\n`;
  }

  msg += '\n📋 To continue, please:\n';
  msg += '   1. Start a NEW Claude Code session\n';
  msg += '   2. Copy-paste your prompt below into the new session\n';
  msg += `\n${'─'.repeat(60)}\n`;

  return msg;
}

/**
 * Format the copy-paste prompt for user
 */
export function formatCopyPastePrompt(prompt: string): string {
  return `\n💬 COPY THIS PROMPT:\n${'─'.repeat(40)}\n${prompt}\n${'─'.repeat(40)}\n`;
}
