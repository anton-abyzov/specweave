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
 * Testing mode options
 */
export type TestMode = 'TDD' | 'test-after' | 'manual';

/**
 * Coverage target configuration
 */
export interface CoverageTargets {
  /** Unit test coverage target (70-95%) */
  unit: number;

  /** Integration test coverage target (70-95%) */
  integration: number;

  /** E2E test coverage target (70-95%) */
  e2e: number;
}

/**
 * Testing configuration
 *
 * Controls default testing approach and coverage targets for all increments.
 * Can be overridden per-increment via frontmatter.
 */
export interface TestingConfig {
  /** Default testing mode for new increments */
  defaultTestMode: TestMode;

  /** Default overall coverage target (70-95%) */
  defaultCoverageTarget: number;

  /** Specific coverage targets per test type */
  coverageTargets: CoverageTargets;
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

  /** Testing configuration */
  testing?: TestingConfig;

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
  testing: {
    defaultTestMode: 'TDD',
    defaultCoverageTarget: 80,
    coverageTargets: {
      unit: 85,
      integration: 80,
      e2e: 90,
    },
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
  hooks: {
    post_task_completion: {
      sync_living_docs: true,      // CRITICAL: Auto-sync living docs after every task
      sync_tasks_md: true,         // Update tasks.md with completion status
      external_tracker_sync: true, // Sync to GitHub/Jira/ADO automatically
    },
  },
  sync: {
    statusSync: {
      enabled: true,
      autoSync: true,
      promptUser: true,
      conflictResolution: 'last-write-wins',
      mappings: {
        github: {
          planning: 'open',
          active: { state: 'open', labels: ['in-progress'] },
          paused: { state: 'open', labels: ['paused'] },
          completed: 'closed',
          abandoned: { state: 'closed', labels: ['wontfix'] }
        },
        jira: {
          planning: 'To Do',
          active: 'In Progress',
          paused: 'On Hold',
          completed: 'Done',
          abandoned: 'Cancelled'
        },
        ado: {
          planning: 'New',
          active: 'Active',
          paused: 'On Hold',
          completed: 'Closed',
          abandoned: 'Removed'
        }
      }
    }
  },
};
