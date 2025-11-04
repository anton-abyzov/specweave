/**
 * SpecWeave Configuration Types
 *
 * Type definitions for .specweave/config.json configuration file.
 */

import { SupportedLanguage, TranslationConfig } from '../i18n/types.js';
import { PluginConfig } from './plugin.js';

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
};
