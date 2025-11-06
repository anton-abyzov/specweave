/**
 * SpecWeave Configuration Types
 *
 * Type definitions for .specweave/config.json configuration file.
 */

import { SupportedLanguage, TranslationConfig } from '../i18n/types.js';
import { PluginConfig } from './plugin.js';
import { IncrementType } from './increment-metadata.js';

/**
 * WIP Limits Configuration (v0.7.0+ Simplified)
 *
 * Philosophy: Default to 1 active increment (maximum focus)
 * Allow 2 only for emergencies (hotfix interrupt)
 * Never >2 (hard cap enforced)
 */
export interface LimitsConfig {
  /** Maximum active increments at any time (default: 1 for focus) */
  maxActiveIncrements?: number;

  /** Absolute maximum active increments, never exceeded (default: 2) */
  hardCap?: number;

  /** Allow 2nd active increment for hotfix/bug emergencies (default: true) */
  allowEmergencyInterrupt?: boolean;

  /** Increment type-specific behaviors */
  typeBehaviors?: {
    /** Types that can interrupt existing work (emergency scenarios) */
    canInterrupt?: (IncrementType | string)[];

    /** Auto-abandon increments after N days of inactivity */
    autoAbandonDays?: {
      /** Days before experiment auto-abandons (default: 14) */
      experiment?: number;
    };
  };

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

  /** Technology stack */
  techStack?: string[];

  /** Team name */
  team?: string;
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
    maxActiveIncrements: 1,        // v0.7.0+: 1 active increment (maximum focus)
    hardCap: 2,                    // Emergency ceiling (never >2)
    allowEmergencyInterrupt: true, // Allow hotfix/bug to interrupt
    typeBehaviors: {
      canInterrupt: [IncrementType.HOTFIX, IncrementType.BUG], // Only emergencies can interrupt
      autoAbandonDays: {
        experiment: 14,            // Auto-abandon stale experiments
      },
    },
    staleness: {
      paused: 7,                   // Warn if paused >7 days
      active: 30,                  // Warn if active >30 days
    },
  },
};
