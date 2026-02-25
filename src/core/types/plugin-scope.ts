/**
 * Plugin Scope Configuration Types
 *
 * Defines types and utilities for project-scoped plugin installation.
 * Claude Code 2.1.3+ supports three installation scopes:
 * - user: ~/.claude/settings.json (personal, all projects)
 * - project: .claude/settings.json (team, shared via git)
 * - local: .claude/settings.local.json (personal, gitignored)
 *
 * @since 1.0.196
 * @increment 0179-project-scoped-plugin-installation
 */

/**
 * Plugin installation scope options
 *
 * Matches Claude Code CLI `--scope` flag values:
 * - 'user': Install for yourself across all projects (default)
 * - 'project': Install for all collaborators on this repository (shared via git)
 * - 'local': Install for yourself in this repository only (gitignored)
 */
export type PluginInstallationScope = 'user' | 'project' | 'local';

/**
 * Plugin scope configuration
 *
 * Controls default installation scope for different plugin types.
 * LSP plugins default to project scope (language-specific to project).
 * SpecWeave plugins default to user scope (useful across projects).
 */
export interface PluginScopeConfig {
  /**
   * Default scope for plugins not matched by other rules
   * @default 'user'
   */
  defaultScope?: PluginInstallationScope;

  /**
   * Scope for LSP plugins (vtsls, pyright, rust-analyzer)
   * LSP plugins should be project-scoped since they're language-specific
   * @default 'project'
   */
  lspScope?: PluginInstallationScope;

  /**
   * Scope for SpecWeave plugins (sw, sw-github, frontend, backend, etc.)
   * @default 'user'
   */
  specweaveScope?: PluginInstallationScope;

  /**
   * Per-plugin scope overrides
   * Keys are plugin names (without marketplace), values are scopes
   *
   * @example
   * {
   *   'context7': 'user',
   *   'playwright': 'user',
   *   'vtsls': 'project'
   * }
   */
  scopeOverrides?: Record<string, PluginInstallationScope>;
}

/**
 * Default plugin scope configuration
 *
 * - LSP plugins: project scope (language-specific, don't pollute global)
 * - SpecWeave/vskill plugins (frontend, backend, sw-github, etc.): project scope
 * - Core SpecWeave plugin (sw): user scope (needed across all projects)
 * - Other plugins: user scope (default)
 */
export const DEFAULT_PLUGIN_SCOPE_CONFIG: PluginScopeConfig = {
  defaultScope: 'user',
  lspScope: 'project',
  specweaveScope: 'project',
  scopeOverrides: {
    // Core SW plugin stays at user level - it's the framework itself
    'sw': 'user',
  },
};

/**
 * LSP marketplace identifier
 */
const LSP_MARKETPLACE = 'claude-code-lsps';

/**
 * SpecWeave marketplace identifier
 */
const SPECWEAVE_MARKETPLACE = 'specweave';

/**
 * Known LSP plugin names
 */
const LSP_PLUGINS = new Set([
  'vtsls',
  'pyright',
  'rust-analyzer',
  'gopls',
  'clangd',
  'jdtls',
  'kotlin-lsp',
  'lua-lsp',
  'php-lsp',
  'swift-lsp',
  'typescript-lsp',
  'csharp-lsp',
]);

/**
 * Get the installation scope for a plugin
 *
 * Resolution order:
 * 1. scopeOverrides[pluginName] - explicit override for this plugin
 * 2. lspScope - if plugin is from LSP marketplace or known LSP plugin
 * 3. specweaveScope - if plugin is from SpecWeave marketplace
 * 4. defaultScope - fallback
 *
 * @param pluginName Plugin name (without @marketplace suffix)
 * @param marketplace Marketplace name (e.g., 'claude-code-lsps', 'specweave')
 * @param config Plugin scope configuration (uses defaults if undefined)
 * @returns The scope to use for installation
 */
export function getPluginScope(
  pluginName: string,
  marketplace: string,
  config?: PluginScopeConfig | null
): PluginInstallationScope {
  // Merge with defaults
  const effectiveConfig: PluginScopeConfig = {
    ...DEFAULT_PLUGIN_SCOPE_CONFIG,
    ...config,
  };

  // 1. Check for explicit override
  if (effectiveConfig.scopeOverrides?.[pluginName]) {
    return effectiveConfig.scopeOverrides[pluginName];
  }

  // 2. Check if LSP plugin (by marketplace or known plugin name)
  const isLspPlugin =
    marketplace === LSP_MARKETPLACE ||
    marketplace.includes('lsp') ||
    LSP_PLUGINS.has(pluginName);

  if (isLspPlugin) {
    return effectiveConfig.lspScope ?? DEFAULT_PLUGIN_SCOPE_CONFIG.lspScope!;
  }

  // 3. Check if SpecWeave plugin
  const isSpecweavePlugin =
    marketplace === SPECWEAVE_MARKETPLACE || pluginName.startsWith('sw-') || pluginName === 'sw';

  if (isSpecweavePlugin) {
    return effectiveConfig.specweaveScope ?? DEFAULT_PLUGIN_SCOPE_CONFIG.specweaveScope!;
  }

  // 4. Default scope
  return effectiveConfig.defaultScope ?? DEFAULT_PLUGIN_SCOPE_CONFIG.defaultScope!;
}

/**
 * Format scope flag for CLI command
 *
 * @param scope The installation scope
 * @returns CLI flag string (e.g., '--scope project') or empty string for user scope
 */
export function formatScopeFlag(scope: PluginInstallationScope): string {
  // User scope is the default, no flag needed
  if (scope === 'user') {
    return '';
  }
  return `--scope ${scope}`;
}

/**
 * Get CLI args array for scope flag
 *
 * Returns ['--scope', 'project'] or [] for user scope.
 * Use this when building CLI arg arrays for execFileNoThrowSync/spawnSync.
 *
 * @param scope The installation scope
 * @returns CLI args array to spread into command args
 */
export function getScopeArgs(scope: PluginInstallationScope): string[] {
  if (scope === 'user') {
    return [];
  }
  return ['--scope', scope];
}
