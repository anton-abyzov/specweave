/**
 * Item Converter Types
 *
 * Type definitions for the ItemConverter module.
 *
 * @module importers/item-converter/types
 * @since v1.0.115
 */

import type { ExternalItem } from '../external-importer.js';
import type { ExternalContainerContext } from '../../core/types/increment-metadata.js';
import type { HierarchyMappingConfig } from '../../core/types/sync-profile.js';

export interface ConvertedUserStory {
  /** User Story ID with E suffix (e.g., US-001E) */
  id: string;

  /** User Story title */
  title: string;

  /** User Story description */
  description: string;

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Priority (P0-P4) */
  priority?: string;

  /** Status (open, in-progress, completed) */
  status: string;

  /** External metadata */
  metadata: {
    externalId: string;
    externalUrl: string;
    externalPlatform: 'github' | 'jira' | 'ado';
    importedAt: string;
    createdAt: string;
    updatedAt: string;
    labels: string[];
    sourceRepo?: string;
  };

  /** Living docs file path */
  filePath: string;

  /** Living docs markdown content */
  markdown: string;

  /** Feature ID this user story belongs to (when feature allocation enabled) */
  featureId?: string;
}

export interface ItemConverterOptions {
  /** Base directory for living docs (e.g., .specweave/docs/internal/specs) */
  specsDir: string;

  /** Starting US-ID number for imported items (default: 1) */
  startingId?: number;

  /** Project root for FS-ID allocator and ID registry */
  projectRoot?: string;

  /** Enable feature-level organization with FS-ID allocation */
  enableFeatureAllocation?: boolean;

  /** Project ID for multi-project mode (default: 'default') */
  projectId?: string;

  /**
   * Enable global FS-ID collision detection across ALL projects (umbrella mode)
   *
   * CRITICAL: Set this to true in umbrella/multi-repo setups to prevent ID
   * collisions like FS-001 in project-a and FS-001E in project-b.
   *
   * Default: false (for backwards compatibility)
   */
  enableGlobalCollisionDetection?: boolean;

  /** Enable duplicate detection (default: true) */
  enableDuplicateDetection?: boolean;

  /** Auto-archive items older than this many days (default: 0 = disabled) */
  autoArchiveAfterDays?: number;

  /**
   * Hierarchy mapping for converting external work items to SpecWeave levels
   */
  hierarchyMapping?: HierarchyMappingConfig;

  /**
   * How to handle orphan items (items without parents in the hierarchy)
   *
   * - 'group': Group all orphans under _orphans/ folder (RECOMMENDED - v0.30.6 default)
   * - 'skip': Don't import orphan items
   * - 'create-feature': Create individual FS-XXXE folders (legacy behavior)
   */
  orphanHandling?: 'skip' | 'group' | 'create-feature';

  /** Callback for skipped duplicates */
  onDuplicateSkipped?: (externalId: string, existingUsId: string) => void;

  /** Callback for parent change (file moved due to hierarchy update) */
  onParentChanged?: (usId: string, oldFeatureId: string, newFeatureId: string, reason: string) => void;

  /** Callback for feature folder creation */
  onFeatureCreated?: (featureId: string, featurePath: string) => void;

  /** Callback for archived items */
  onItemArchived?: (usId: string, reason: string) => void;

  /**
   * External container context for 2-level directory structure
   */
  externalContainer?: ExternalContainerContext;
}

/**
 * Platform type for hierarchy mapping
 */
export type Platform = 'ado' | 'jira' | 'github';

/**
 * Group key type returned by groupItemsByFeature
 */
export type GroupKey = string;

/**
 * Re-export ExternalItem for convenience
 */
export type { ExternalItem } from '../external-importer.js';
