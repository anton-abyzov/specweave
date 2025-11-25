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
 * JIRA configuration detection result
 */
export interface JiraConfig {
  host: string;
  email?: string;
  apiToken?: string;
}

/**
 * Azure DevOps configuration detection result
 */
export interface ADOConfig {
  orgUrl: string;
  project: string;
  pat?: string;
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
