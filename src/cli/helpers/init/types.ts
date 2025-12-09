/**
 * Shared types for init command helpers
 */

import type { Logger } from '../../../utils/logger.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

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
  logger?: Logger;    // Logger for debug/error messages
}

/**
 * Result of smart re-initialization prompt
 */
export type ReinitAction = 'continue' | 'fresh' | 'cancel';

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
 */
export type TestMode = 'TDD' | 'test-after' | 'manual';

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
  /** Translation method: auto (hooks), manual (/specweave:translate), none */
  method: 'auto' | 'manual' | 'none';
  /** Keep SpecWeave framework terms in English (increment, spec.md, etc.) */
  preserveFrameworkTerms: boolean;
  /** What to auto-translate */
  scope: TranslationScope;
  /** Keep English originals as .en.md files */
  keepEnglishOriginals: boolean;
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
