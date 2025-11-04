/**
 * SpecWeave Configuration Types
 *
 * Type definitions for .specweave/config.json configuration file.
 */

import { SupportedLanguage, TranslationConfig } from '../i18n/types.js';
import { PluginConfig } from './plugin.js';
import { IncrementType } from './increment-metadata.js';

/**
 * WIP Limits Configuration
 */
export interface LimitsConfig {
  /** Max active feature increments (null = unlimited) */
  feature?: number | null;

  /** Max active hotfix increments (null = unlimited) */
  hotfix?: number | null;

  /** Max active bug increments (null = unlimited) */
  bug?: number | null;

  /** Max active change-request increments (null = unlimited) */
  'change-request'?: number | null;

  /** Max active refactor increments (null = unlimited) */
  refactor?: number | null;

  /** Max active experiment increments (null = unlimited) */
  experiment?: number | null;

  /** Auto-abandon experiments after N days of inactivity */
  experimentAutoAbandonDays?: number;

  /** Staleness warning thresholds */
  staleness?: {
    /** Warn if paused for more than N days */
    paused?: number;

    /** Warn if active for more than N days */
    active?: number;
  };
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project name */
  name?: string;

  /** Project version (semver) */
  version?: string;

  /** Project description */
  description?: string;
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  /** Default adapter to use (claude, cursor, generic) */
  default?: 'claude' | 'cursor' | 'generic';

  /** Additional adapter settings */
  [key: string]: any;
}

/**
 * Complete SpecWeave Configuration
 *
 * Represents the structure of .specweave/config.json
 */
export interface SpecweaveConfig {
  /** Plugin configuration */
  plugins?: PluginConfig;

  /** Project metadata */
  project?: ProjectMetadata;

  /** Adapter configuration */
  adapters?: AdapterConfig;

  /** Primary language for generated content and CLI */
  language?: SupportedLanguage;

  /** Translation settings for multilingual support */
  translation?: TranslationConfig;

  /** WIP limits configuration */
  limits?: LimitsConfig;

  /** Allow additional properties */
  [key: string]: any;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<SpecweaveConfig> = {
  language: 'en',
  translation: {
    languages: ['en'],
    primary: 'en',
    method: 'auto',
    preserveFrameworkTerms: true,
  },
  adapters: {
    default: 'claude',
  },
  limits: {
    feature: 2,
    hotfix: null,
    bug: null,
    'change-request': 2,
    refactor: 1,
    experiment: null,
    experimentAutoAbandonDays: 14,
    staleness: {
      paused: 7,
      active: 30,
    },
  },
};
