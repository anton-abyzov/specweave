/**
 * Shared types for init command helpers
 */

import type { Logger } from '../../../utils/logger.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Repository fetching limits
 *
 * These limits control how many repositories can be fetched during init.
 * Increased from 500 to 1000 in v0.35.0 to support large organizations.
 */
export const REPO_FETCH_LIMITS = {
  /** Default maximum repos to fetch during init (GitHub, Bitbucket, ADO) */
  DEFAULT_MAX_REPOS: 1000,
  /** Maximum repos allowed via gh repo list command */
  GH_CLI_MAX_REPOS: 1000,
  /** Per-page limit for API pagination (GitHub/Bitbucket API max is 100) */
  API_PER_PAGE: 100,
} as const;

/**
 * Options passed to the init command
 */
export interface InitOptions {
  template?: string;
  adapter?: string;  // 'claude', 'cursor', 'generic'
  techStack?: string;
  language?: string;  // Language for i18n support
  force?: boolean;    // Force fresh start (non-interactive)
  forceRefresh?: boolean;  // Force marketplace refresh (skip cache)
  noLivingDocs?: boolean;  // Skip living docs builder job
  fullInstall?: boolean;  // Install all plugins (skip lazy loading)
  quick?: boolean;    // Quick mode: skip prompts, use sensible defaults
  logger?: Logger;    // Logger for debug/error messages
}

/**
 * Result of smart re-initialization prompt
 */
export type ReinitAction = 'continue' | 'fresh' | 'cancel';

/**
 * Project maturity — greenfield (new) vs brownfield (existing code)
 * Greenfield projects may defer structure decisions to first increment.
 */
export type ProjectMaturity = 'greenfield' | 'brownfield';

/**
 * Repository hosting configuration
 */
export type RepositoryHosting =
  | 'github-single'
  | 'github-multirepo'
  | 'bitbucket-single'
  | 'bitbucket-multirepo'
  | 'ado-single'
  | 'ado-multirepo'
  | 'local'
  | 'other-single'
  | 'other-multirepo';

/**
 * Detected parent .specweave folder info
 */
export interface ParentSpecweaveFolder {
  path: string;
  depth: number;
  isHomeDir?: boolean;
  /**
   * True if this is a user-level .specweave folder (e.g., ~/.specweave or ~/.claude/.specweave)
   * User-level folders are VALID and should NOT block project initialization
   */
  isUserLevel?: boolean;
  /**
   * True if the .specweave folder has no config.json (stale/partial folder).
   * Stale folders are created by runtime code (hooks, loggers) using process.cwd()
   * and should NOT block project initialization.
   */
  isStale?: boolean;
}

/**
 * GitHub remote detection result
 */
export interface GitHubRemote {
  owner: string;
  repo: string;
}

/**
 * JIRA project configuration for multi-project mode
 */
export interface JiraProjectConfig {
  key: string;
  name?: string;
  id?: string;
  boards?: Array<{ id: string; name?: string }>;
  isDefault?: boolean;
}

/**
 * JIRA configuration detection result
 * Extended with multi-project support (v0.33.0+)
 */
export interface JiraConfig {
  host: string;
  email?: string;
  apiToken?: string;
  strategy?: string;
  projects?: JiraProjectConfig[];  // Multi-project support
}

/**
 * Azure DevOps project configuration for multi-project mode
 */
export interface ADOProjectConfig {
  name: string;
  areaPaths?: string[];
  isDefault?: boolean;
  isUmbrella?: boolean;  // Mark as umbrella project (folder structure only, no items imported)
}

/**
 * Azure DevOps configuration detection result
 */
export interface ADOConfig {
  orgUrl: string;
  project: string;  // Primary project (for backwards compatibility)
  pat?: string;
  teams?: string[];
  areaPaths?: string[];
  strategy?: string;
  projects?: ADOProjectConfig[];  // Multi-project support
}

/**
 * Testing mode configuration
 * - TDD: Write tests first (mission-critical systems)
 * - test-after: Implement first, test later (recommended for most)
 * - manual: Test when needed, no strict rules (flexible for startups/MVPs)
 * - none: Skip testing entirely (hackathons, experiments, prototypes)
 */
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

/**
 * Testing configuration for config.json
 */
export interface TestingConfig {
  defaultTestMode: TestMode;
  defaultCoverageTarget: number;
  coverageTargets: {
    unit: number;
    integration: number;
    e2e: number;
  };
}

/**
 * Translation scope - what gets auto-translated
 */
export interface TranslationScope {
  /** Auto-translate spec.md, plan.md, tasks.md after creation */
  incrementSpecs: boolean;
  /** Auto-translate living docs on update */
  livingDocs: boolean;
  /** Auto-translate GitHub/JIRA/ADO issues on sync */
  externalSync: boolean;
}

/**
 * Translation configuration for config.json
 *
 * CRITICAL: Translation can ~2x token usage
 * User MUST explicitly opt-in during init
 */
export interface TranslationConfig {
  /** Master switch for auto-translation */
  enabled: boolean;
  /** Enabled languages (always includes 'en' as source) */
  languages: SupportedLanguage[];
  /** Primary output language for user */
  primary: SupportedLanguage;
  /** Translation method: auto (hooks), manual (/sw:translate), none */
  method: 'auto' | 'manual' | 'none';
  /** Keep SpecWeave framework terms in English (increment, spec.md, etc.) */
  preserveFrameworkTerms: boolean;
  /** What to auto-translate */
  scope: TranslationScope;
  /** Keep English originals as .en.md files */
  keepEnglishOriginals: boolean;
}

/**
 * Result of umbrella parent detection
 */
export interface UmbrellaParentResult {
  umbrellaRoot: string;
  reason: 'config-umbrella-repo' | 'repositories-dir';
}

/**
 * Result of suspicious path detection
 */
export interface SuspiciousPathResult {
  segment: string;
  suggestedRoot: string;
}

/**
 * Context passed between init steps
 */
export interface InitContext {
  targetDir: string;
  projectName: string;
  language: SupportedLanguage;
  isCI: boolean;
  continueExisting: boolean;
  usedDotNotation: boolean;
  toolName: string;
  options: InitOptions;
}
