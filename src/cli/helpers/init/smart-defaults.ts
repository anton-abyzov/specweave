/**
 * Smart defaults for init flow
 *
 * Applies sensible defaults for testing, quality gates, deep interview,
 * LSP, and translation without asking interactive questions.
 *
 * Part of 0200-init-two-phase-redesign
 */

export interface SmartDefaultsOptions {
  adapter: string;    // 'claude' | 'cursor' | 'generic'
  language: string;   // Language code e.g. 'en', 'es', 'de'
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
  // Testing: default to TDD
  config.testing = {
    defaultTestMode: 'TDD',
    defaultCoverageTarget: 80,
    coverageTargets: { unit: 80, integration: 60, e2e: 40 },
    ...config.testing,
  };

  // Quality gates: default to standard
  config.qualityGates = {
    preset: 'standard',
    enforcement: {
      testsRequired: true,
      llmValidation: true,
      specCompliance: true,
    },
    ...config.qualityGates,
  };

  // Deep interview: default to off
  config.planning = {
    ...config.planning,
    deepInterview: {
      enabled: false,
      ...config.planning?.deepInterview,
    },
  };

  // LSP: auto-enable for Claude
  if (options.adapter === 'claude') {
    config.lsp = {
      enabled: true,
      autoInstallPlugins: true,
      ...config.lsp,
    };
  }

  // Sync: ensure enabled by default when a provider is configured
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
    // Ensure auto-create GitHub issue is on
    config.hooks = {
      ...config.hooks,
      post_increment_planning: {
        auto_create_github_issue: true,
        ...config.hooks?.post_increment_planning,
      },
    };
  }

  // Translation: based on language
  if (options.language && options.language !== 'en') {
    config.translation = {
      enabled: true,
      languages: ['en', options.language],
      primary: options.language,
      method: 'auto',
      preserveFrameworkTerms: true,
      scope: { incrementSpecs: true, livingDocs: true, externalSync: false },
      keepEnglishOriginals: true,
      ...config.translation,
    };
  } else {
    config.translation = {
      enabled: false,
      ...config.translation,
    };
  }

  return config;
}
