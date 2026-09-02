/**
 * Smart defaults for init flow
 *
 * Applies the 2.0 config defaults without asking interactive questions.
 * Only keys that SpecWeave 2.0 actually reads are written.
 *
 * Part of 0200-init-two-phase-redesign
 */

export interface SmartDefaultsOptions {
  adapter: string;    // 'claude' | 'cursor' | 'generic'
  isGitRepo: boolean;
}

/**
 * Apply smart defaults to a config object.
 * Non-interactive — sets sensible values, preserves any existing config.
 * Returns the modified config.
 */
export function applySmartDefaults(
  config: Record<string, any>,
  options: SmartDefaultsOptions
): Record<string, any> {
  // Testing: TDD by default.
  // Coverage semantics: unit/integration = Istanbul line coverage %;
  // e2e = % of written e2e tests that must pass (Playwright has no Istanbul reporter).
  config.testing = {
    mode: 'TDD',
    commands: [],
    coverage: { unit: 80, integration: 70, e2e: 100 },
    ...config.testing,
  };

  // Planning: deep interview off at init (quick setup).
  config.planning = {
    ...config.planning,
    deepInterview: config.planning?.deepInterview ?? 'off',
  };

  // Living docs: off unless the user opts in.
  config.livingDocs = config.livingDocs ?? false;

  // LSP: auto-enable for Claude.
  if (options.adapter === 'claude') {
    config.lsp = { enabled: true, ...config.lsp };
  }

  // Sync: on by default once a provider/tracker is configured.
  const hasProvider = config.repository?.provider && config.repository.provider !== 'local';
  const hasTracker = config.issueTracker?.provider && config.issueTracker.provider !== 'none';
  if (hasProvider || hasTracker) {
    config.sync = {
      enabled: true,
      autoSync: true,
      settings: {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
        autoSyncOnCompletion: true,
      },
      ...config.sync,
      // Force enabled if provider/tracker detected (don't let stale false override)
      ...(config.sync?.enabled === false ? { enabled: true } : {}),
    };
  }

  return config;
}
