/**
 * Item Converter
 *
 * Converts external items (GitHub/JIRA/ADO) to SpecWeave living docs User Stories.
 * CRITICAL: Does NOT create increments - only creates living docs.
 *
 * NOTE: This file uses extracted modules from ./item-converter/ for better separation
 * of concerns. The main ItemConverter class remains here for backward compatibility.
 *
 * @since v1.0.115 - Extracted helpers to ./item-converter/ modules
 */

import type { ExternalItem } from './external-importer.js';
import * as fs from '../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { FSIdAllocator, type ExternalWorkItem } from '../living-docs/fs-id-allocator.js';
import { EpicIdAllocator, type ExternalEpicItem } from '../living-docs/epic-id-allocator.js';
import { IDRegistry } from '../living-docs/id-registry.js';
import { createExternalMetadata } from '../core/types/origin-metadata.js';
import { DuplicateDetector } from './duplicate-detector.js';
import type { ExternalContainerContext } from '../core/types/increment-metadata.js';
import { getTwoLevelProjectPath, normalizeToProjectId } from '../utils/project-id-generator.js';
import { MarkdownGenerator, type TaskData } from './markdown-generator.js';
import { Logger, consoleLogger } from '../utils/logger.js';
import { findNextAvailableUSId } from '../utils/feature-id-collision.js';
import {
  type HierarchyMappingConfig,
  type SpecWeaveHierarchyLevel,
  DEFAULT_ADO_HIERARCHY_MAPPING,
  DEFAULT_JIRA_HIERARCHY_MAPPING,
  DEFAULT_GITHUB_HIERARCHY_MAPPING,
  DEFAULT_USER_STORY_TYPES,
  DEFAULT_TASK_TYPES,
} from '../core/types/sync-profile.js';

// Import from extracted modules
import {
  normalizeAdoWorkItemType as _normalizeAdoWorkItemType,
  getSpecWeaveLevel as _getSpecWeaveLevel,
  isFeatureLevelType as _isFeatureLevelType,
  getJiraWorkItemTypeLabel as _getJiraWorkItemTypeLabel,
  getDefaultMapping as _getDefaultMapping,
  typeMatchesArray as _typeMatchesArray,
} from './item-converter/hierarchy-mapper.js';
import {
  getBaseDirectory as _getBaseDirectory,
  shouldAutoArchive as _shouldAutoArchive,
  shouldArchiveEntireGroup as _shouldArchiveEntireGroup,
  cleanupEmptyFeatureFolder as _cleanupEmptyFeatureFolder,
} from './item-converter/path-resolver.js';
import {
  createFeatureFolder as _createFeatureFolder,
  createOrphansFolder as _createOrphansFolder,
} from './item-converter/feature-folder-creator.js';
import {
  hasParentChanged as _hasParentChanged,
  updateParentMetadataInContent as _updateParentMetadataInContent,
  moveUserStoryFile as _moveUserStoryFile,
} from './item-converter/parent-change-handler.js';
import {
  findExistingFeatureFolders as _findExistingFeatureFolders,
  groupHasNonDuplicates as _groupHasNonDuplicates,
} from './item-converter/duplicate-scanner.js';

/**
 * Module logger - can be replaced for testing
 */
let moduleLogger: Logger = consoleLogger;

/**
 * Set the logger for this module
 */
export function setItemConverterLogger(logger: Logger): void {
  moduleLogger = logger;
}

// Use extracted function (wrapper for backward compat)
function normalizeAdoWorkItemType(witType: string | undefined): string | undefined {
  return _normalizeAdoWorkItemType(witType);
}

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

  /** Auto-archive items older than this many days (default: 0 = disabled, was 30 before v0.30.5) */
  autoArchiveAfterDays?: number;

  // ============================================================================
  // Universal Hierarchy Mapping (v0.30.5+)
  // ============================================================================

  /**
   * Hierarchy mapping for converting external work items to SpecWeave levels
   *
   * Maps external tool work item types (Epic, Feature, User Story, Task, etc.)
   * to SpecWeave hierarchy levels (epic, feature, user_story, task, skip).
   *
   * Default mappings:
   * - ADO: DEFAULT_ADO_HIERARCHY_MAPPING
   * - JIRA: DEFAULT_JIRA_HIERARCHY_MAPPING
   * - GitHub: DEFAULT_GITHUB_HIERARCHY_MAPPING
   */
  hierarchyMapping?: HierarchyMappingConfig;

  /**
   * How to handle orphan items (items without parents in the hierarchy)
   *
   * - 'group': Group all orphans under _orphans/ folder (RECOMMENDED - v0.30.6 default)
   * - 'skip': Don't import orphan items
   * - 'create-feature': Create individual FS-XXXE folders (legacy behavior, causes bug)
   *
   * Default: 'group' (v0.30.6+) - orphans go to _orphans/ folder inside project/board
   *
   * The _orphans folder follows industry-standard naming (git orphan branches,
   * database orphan records) for items without parents in the hierarchy.
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

  // ============================================================================
  // External Container Context (v0.29.0+ - 2-Level Directory Structure Support)
  // ============================================================================

  /**
   * External container context for 2-level directory structure
   *
   * When provided, creates 2-level structure:
   * - JIRA: specs/{projectKey}/{boardName}/FS-XXX/ (e.g., AAC/aac/)
   * - ADO: specs/{projectName}/{areaPath}/FS-XXX/
   *
   * When NOT provided (default), creates 1-level structure:
   * - GitHub: specs/{projectId}/FS-XXX/
   *
   * CRITICAL (v0.35.2): Removed "JIRA-" prefix to match ADO behavior
   *
   * @example
   * ```typescript
   * // JIRA board-based setup (NO JIRA- prefix!)
   * externalContainer: {
   *   type: 'jira-project',
   *   containerId: 'AAC',  // Raw projectKey (uppercase)
   *   containerName: 'Ancillary Apps - CC',
   *   boardId: 338,
   *   boardName: 'Ancillary Apps - CC board'
   * }
   * // Result: specs/AAC/aac/FS-XXX/
   *
   * // ADO area path setup
   * externalContainer: {
   *   type: 'ado-project',
   *   containerId: 'MyProduct',
   *   containerName: 'My Product',
   *   areaPath: 'MyProduct\\Frontend'
   * }
   * ```
   */
  externalContainer?: ExternalContainerContext;
}

/**
 * Convert external items to living docs User Stories
 *
 * CRITICAL: This function ONLY creates living docs files.
 * It does NOT create increments or populate .specweave/increments/.
 */
export class ItemConverter {
  private options: ItemConverterOptions;
  private duplicateDetector: DuplicateDetector | null = null;
  private fsIdAllocator: FSIdAllocator | null = null;
  private epicIdAllocator: EpicIdAllocator | null = null;
  /** Cache of created feature folders to avoid duplicates */
  private createdFeatures: Map<string, string> = new Map();
  /** Cache of created epic folders to avoid duplicates */
  private createdEpics: Map<string, string> = new Map();
  /** Markdown generator for living docs content */
  private markdownGen: MarkdownGenerator = new MarkdownGenerator();

  constructor(options: ItemConverterOptions) {
    this.options = {
      enableDuplicateDetection: true,
      // NOTE: projectId is intentionally NOT defaulted to 'default'
      // - undefined means items go directly to specs/ (no project subfolder)
      // - a string value means items go to specs/{projectId}/
      // For umbrella repos, set enableGlobalCollisionDetection: true
      // CRITICAL (v0.30.12): Auto-archiving DISABLED for external imports!
      // External items should NEVER be auto-archived during import.
      // Archive is for increments (source of truth), not imported items.
      // Users must explicitly archive via /sw:archive --external
      autoArchiveAfterDays: 0,  // ALWAYS 0 for imports - archiving is user-initiated only
      enableGlobalCollisionDetection: false, // Default: false for backwards compatibility
      orphanHandling: 'group',  // v0.30.6: Group orphans in _orphans folder (was 'skip')
      ...options,
    };

    // CRITICAL (v0.30.12): Force autoArchiveAfterDays to 0 for external imports
    // This overrides any user-provided value to prevent accidental archiving
    this.options.autoArchiveAfterDays = 0;

    // Initialize duplicate detector if enabled
    if (this.options.enableDuplicateDetection) {
      this.duplicateDetector = new DuplicateDetector({
        specsDir: this.options.specsDir,
      });
    }

    // Initialize FS-ID allocator if feature allocation is enabled
    if (this.options.enableFeatureAllocation && this.options.projectRoot) {
      // Use projectId if provided, otherwise undefined (direct to specs/)
      // Enable global collision detection for umbrella/multi-repo setups
      // CRITICAL (v0.30.4): Pass externalContainer for 2-level path construction
      this.fsIdAllocator = new FSIdAllocator(
        this.options.projectRoot,
        this.options.projectId,
        {
          globalCollisionDetection: this.options.enableGlobalCollisionDetection,
          externalContainer: this.options.externalContainer
        }
      );

      // Initialize Epic ID allocator for ADO Capabilities (v0.29.3+)
      // Capabilities are the top-level items in ADO SAFe/Enterprise setups
      // CRITICAL (v0.30.4): Epics go to {container}/{project}/_epics/EP-XXXE/ (2-level)
      // Must pass externalContainer for correct path construction with ADO/JIRA
      const epicProjectId = this.options.projectId || 'default';
      this.epicIdAllocator = new EpicIdAllocator(
        this.options.projectRoot,
        epicProjectId,
        {
          globalCollisionDetection: this.options.enableGlobalCollisionDetection,
          externalContainer: this.options.externalContainer
        }
      );
    }
  }

  // ============================================================================
  // Universal Hierarchy Mapping Helpers (v0.30.6+ - Flexible 3/4/5 Level Support)
  // ============================================================================

  /**
   * Get the SpecWeave hierarchy level for a work item type
   *
   * Uses the new array-based HierarchyMappingConfig for flexible mapping.
   * Works with ANY hierarchy depth (3/4/5 levels) and ANY external tool.
   *
   * **Core Principle:**
   * - User Story and Task are FIXED (always the same mapping)
   * - Container levels (Epic/Feature) are FLEXIBLE (configurable per project)
   *
   * @param workItemType - External work item type (e.g., 'Epic', 'User Story', 'Task')
   * @param platform - Platform (ado, jira, github) for default mapping selection
   * @returns SpecWeave hierarchy level (epic, feature, user_story, task, skip)
   */
  private getSpecWeaveLevel(
    workItemType: string | undefined,
    platform: 'ado' | 'jira' | 'github' = 'ado'
  ): SpecWeaveHierarchyLevel {
    if (!workItemType) {
      return 'skip'; // Unknown types are skipped
    }

    const normalizedType = workItemType.toLowerCase().trim();

    // Get mapping config (user-provided or platform defaults)
    const mapping = this.options.hierarchyMapping || this.getDefaultMapping(platform);

    // 1. Check if type is in epicLevelTypes → 'epic'
    if (this.typeMatchesArray(normalizedType, mapping.epicLevelTypes)) {
      return 'epic';
    }

    // 2. Check if type is in featureLevelTypes → 'feature'
    if (this.typeMatchesArray(normalizedType, mapping.featureLevelTypes)) {
      return 'feature';
    }

    // 3. Check if type is in userStoryTypes (or defaults) → 'user_story'
    const userStoryTypes = mapping.userStoryTypes || DEFAULT_USER_STORY_TYPES;
    if (this.typeMatchesArray(normalizedType, userStoryTypes)) {
      return 'user_story';
    }

    // 4. Check if type is in taskTypes (or defaults) → 'task'
    const taskTypes = mapping.taskTypes || DEFAULT_TASK_TYPES;
    if (this.typeMatchesArray(normalizedType, taskTypes)) {
      return 'task';
    }

    // 5. Unknown type → skip (don't import)
    return 'skip';
  }

  /**
   * Get default hierarchy mapping for a platform
   */
  private getDefaultMapping(platform: 'ado' | 'jira' | 'github'): HierarchyMappingConfig {
    const mappings: Record<string, HierarchyMappingConfig> = {
      'jira': DEFAULT_JIRA_HIERARCHY_MAPPING,
      'github': DEFAULT_GITHUB_HIERARCHY_MAPPING,
      'ado': DEFAULT_ADO_HIERARCHY_MAPPING,
    };
    return mappings[platform] || DEFAULT_ADO_HIERARCHY_MAPPING;
  }

  /**
   * Case-insensitive check if a type matches any item in an array
   */
  private typeMatchesArray(normalizedType: string, types: string[]): boolean {
    return types.some(t => t.toLowerCase().trim() === normalizedType);
  }

  /**
   * Check if a work item type is a "container-level" type (epic or feature)
   *
   * Container-level types create folders (EP-* or FS-*), not user story files.
   */
  private isFeatureLevelType(
    workItemType: string | undefined,
    platform: 'ado' | 'jira' | 'github' = 'ado'
  ): boolean {
    const level = this.getSpecWeaveLevel(workItemType, platform);
    return level === 'epic' || level === 'feature';
  }

  /**
   * Get user-friendly label for JIRA work item type
   */
  private getJiraWorkItemTypeLabel(item: ExternalItem): string | undefined {
    if (item.platform !== 'jira') return undefined;
    const labelMap: Record<string, string> = { 'epic': 'Epic', 'feature': 'Feature' };
    return labelMap[item.type];
  }

  /**
   * Convert a single external item to a User Story with E suffix
   *
   * @param item - External item to convert
   * @param usId - User Story ID number
   * @param featureId - Optional feature ID for folder organization
   * @param childTasks - Optional array of child Task items (v0.30.3: rendered as checkboxes)
   */
  convertItem(item: ExternalItem, usId: number, featureId?: string, childTasks?: ExternalItem[]): ConvertedUserStory {
    // Generate US-ID with E suffix
    const id = `US-${String(usId).padStart(3, '0')}E`;

    // Map external status to SpecWeave status
    const status = this.markdownGen.mapStatus(item.status);

    // Extract acceptance criteria
    const acceptanceCriteria = item.acceptanceCriteria || [];

    // Generate origin badge
    const originBadge = this.markdownGen.generateOriginBadge(item);

    // CRITICAL FIX (v0.30.3): Convert child Tasks to TaskData for checkbox rendering
    const tasks: TaskData[] = (childTasks || []).map((task, idx) => {
      // Map ADO status to TaskData status
      const taskStatus = task.status === 'closed' || task.status === 'completed'
        ? 'completed'
        : 'pending';
      return {
        id: `T-${String(idx + 1).padStart(3, '0')}`,
        title: task.title,
        status: taskStatus as TaskData['status']
      };
    });

    // Generate markdown content for living docs
    // CRITICAL (2025-12-01): Include parent info for future re-import parent change detection
    const markdown = this.markdownGen.generateUserStoryMarkdown({
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      originBadge,
      tasks: tasks.length > 0 ? tasks : undefined,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels,
        sourceRepo: item.sourceRepo,
        // Parent tracking for re-import hierarchy updates
        parentId: item.parentId,
        featureId: featureId,
        // CRITICAL FIX (v0.35.5): isOrphan based on actual folder placement, not just parentId
        // Feature-level items (L3 Feature, Epic) without parents are NOT orphans - they ARE containers
        // Only items that end up in _orphans/ folder are true orphans
        isOrphan: featureId === '_orphans',
        adoWorkItemType: item.adoWorkItemType,
        adoAreaPath: item.adoAreaPath
      }
    });

    // Generate file path (with feature folder if allocated)
    const fileName = this.markdownGen.generateFileName(id, item.title);
    let filePath: string;

    // Check if item should be auto-archived (older than threshold)
    const shouldArchive = this.shouldAutoArchive(item.createdAt);

    if (featureId && this.options.enableFeatureAllocation) {
      // Feature folder structure:
      // - 2-level (JIRA/ADO): specs/{CONTAINER-type}/{projectId}/{featureId}/us-xxxe-title.md
      // - 1-level (GitHub): specs/{projectId}/{featureId}/us-xxxe-title.md
      // - No project: specs/{featureId}/us-xxxe-title.md (legacy)
      const baseDir = this.getBaseDirectory();
      const targetDir = shouldArchive
        ? path.join(baseDir, '_archive', featureId)
        : path.join(baseDir, featureId);
      filePath = path.join(targetDir, fileName);
    } else {
      // Legacy: direct in specs or archive folder
      const baseDir = this.getBaseDirectory();
      const targetDir = shouldArchive
        ? path.join(baseDir, '_archive')
        : baseDir;
      filePath = path.join(targetDir, fileName);
    }

    // Notify callback if item was archived
    if (shouldArchive && this.options.onItemArchived) {
      const age = Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      this.options.onItemArchived(id, `Item is ${age} days old (threshold: ${this.options.autoArchiveAfterDays} days)`);
    }

    return {
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels,
        sourceRepo: item.sourceRepo
      },
      filePath,
      markdown,
      featureId
    };
  }

  /**
   * Convert multiple external items to User Stories
   *
   * CRITICAL: This method ONLY creates living docs files.
   * It does NOT create increments.
   *
   * CRITICAL FIX (2025-12-04): Now uses collision detection for US-IDs
   * - Scans existing US-XXX and US-XXXE files in the project
   * - Includes _orphans folder in scan
   * - Prevents US-ID collisions between imports
   *
   * CRITICAL FIX (2025-12-05): Prevents empty FS-XXXE folder creation on re-import
   * - Checks if ANY item in group is non-duplicate BEFORE allocating folder
   * - Only creates folder if at least one new item will be converted
   */
  async convertItems(items: ExternalItem[]): Promise<ConvertedUserStory[]> {
    // CRITICAL FIX (2025-12-04): Use collision detection for US-IDs
    // Scans existing US-XXX/US-XXXE files to find next available ID
    const projectSpecsPath = this.getBaseDirectory();
    const collisionCheckedStartId = findNextAvailableUSId(projectSpecsPath, { logger: moduleLogger });
    const startingId = Math.max(this.options.startingId || 1, collisionCheckedStartId);

    if (collisionCheckedStartId > (this.options.startingId || 1)) {
      moduleLogger.log(`   📋 US-ID collision detected: starting from US-${String(startingId).padStart(3, '0')} instead of US-${String(this.options.startingId || 1).padStart(3, '0')}`);
    }

    const converted: ConvertedUserStory[] = [];
    let skippedCount = 0;

    // DIAGNOSTIC: Log input items count
    moduleLogger.debug(`   📥 ItemConverter received: ${items.length} items for project: ${this.options.projectId || 'default'}`);

    // Ensure specs directory exists
    fs.mkdirSync(this.options.specsDir, { recursive: true });

    // If feature allocation is enabled, scan existing IDs first
    if (this.fsIdAllocator) {
      await this.fsIdAllocator.scanExistingIds();
    }

    // Group items by source (for multi-repo) or treat as single group
    const itemGroups = this.groupItemsByFeature(items);

    // CRITICAL FIX (v0.30.3): Collect ADO Tasks and map to parent User Stories
    // Tasks should be checkboxes in US description, NOT separate files
    const tasksByParentId = new Map<string, ExternalItem[]>();
    for (const item of items) {
      if (item.adoWorkItemType?.toLowerCase() === 'task' && item.parentId) {
        if (!tasksByParentId.has(item.parentId)) {
          tasksByParentId.set(item.parentId, []);
        }
        tasksByParentId.get(item.parentId)!.push(item);
      }
    }
    if (tasksByParentId.size > 0) {
      moduleLogger.debug(`   ✅ Collected ${tasksByParentId.size} parent items with Tasks (will render as checkboxes)`);
    }

    // DIAGNOSTIC: Log grouping results
    moduleLogger.debug(`   📁 Grouped into ${itemGroups.size} groups:`);
    for (const [groupKey, groupItems] of itemGroups) {
      moduleLogger.debug(`      → ${groupKey}: ${groupItems.length} items`);
    }

    // CRITICAL FIX (2025-12-05): Pre-scan for duplicates and find existing feature folders
    // Build a map of external IDs that already exist and their feature folders
    const existingFeatureFolders = await this.findExistingFeatureFolders(itemGroups);

    // Process each group
    for (const [groupKey, groupItems] of itemGroups.entries()) {
      // CRITICAL FIX (2025-12-05): Check for existing feature folder for this source
      // If all items are duplicates and folder exists, skip folder creation entirely
      const existingFolder = existingFeatureFolders.get(groupKey);

      // Allocate feature ID for this group if feature allocation is enabled
      let featureId: string | undefined;

      if (this.fsIdAllocator && this.options.enableFeatureAllocation && groupItems.length > 0) {
        // CRITICAL FIX (2025-12-05): First check if at least one item is NOT a duplicate
        const hasNonDuplicates = await this.groupHasNonDuplicates(groupItems);

        if (existingFolder && !hasNonDuplicates) {
          // All items are duplicates AND folder already exists - reuse existing folder
          moduleLogger.log(`   ⏭️  Reusing existing folder ${existingFolder} for group "${groupKey}" (all items are duplicates)`);
          featureId = existingFolder;
        } else if (!hasNonDuplicates) {
          // All items are duplicates but no existing folder found - skip folder creation
          moduleLogger.log(`   ⏭️  Skipping folder creation for group "${groupKey}" (all items are duplicates)`);
          // Mark all items as skipped
          for (const item of groupItems) {
            if (this.duplicateDetector) {
              const existingRef = await this.duplicateDetector.findExternalIdReference(item.id);
              if (existingRef && this.options.onDuplicateSkipped) {
                this.options.onDuplicateSkipped(item.id, existingRef.usId);
              }
            }
            skippedCount++;
          }
          continue; // Skip this entire group
        } else {
          // Has non-duplicates - allocate/create feature folder
          const firstItem = groupItems[0];
          // CRITICAL FIX (2025-12-01): Pass ALL group items to check if entire group should be archived
          // This prevents duplicate folders when all items are old
          featureId = await this.allocateFeatureForGroup(firstItem, groupKey, groupItems);
        }
      }

      // Convert each item in the group
      for (let i = 0; i < groupItems.length; i++) {
        const item = groupItems[i];

        // CRITICAL FIX (v0.30.3): Skip ADO Task work items - they become checkboxes in parent US
        if (item.adoWorkItemType?.toLowerCase() === 'task') {
          moduleLogger.debug(`   ⏭️ Skipping Task "${item.title.slice(0, 40)}..." (will be checkbox in parent US)`);
          skippedCount++;
          continue;
        }

        // Check for duplicates if duplicate detection is enabled
        if (this.duplicateDetector) {
          const existingReference = await this.duplicateDetector.findExternalIdReference(item.id);
          if (existingReference) {
            // CRITICAL (2025-12-01): Check if parent has changed (orphan → has parent, or parent changed)
            const parentChanged = this.hasParentChanged(existingReference, item);

            if (parentChanged) {
              // Handle parent change - move file to new feature folder
              await this.handleParentChange(existingReference, item, featureId);
              // Skip conversion - file was moved/updated, not created
              skippedCount++;
              continue;
            }

            skippedCount++;

            // Notify callback if provided
            if (this.options.onDuplicateSkipped) {
              this.options.onDuplicateSkipped(item.id, existingReference.usId);
            }

            // Skip this item (duplicate)
            continue;
          }
        }

        const usId = startingId + (converted.length);

        // CRITICAL FIX (v0.30.3): Get child Tasks for this item
        const childTasks = tasksByParentId.get(item.id) || [];

        const userStory = this.convertItem(item, usId, featureId, childTasks);
        converted.push(userStory);

        // Ensure directory exists for feature folders
        const fileDir = path.dirname(userStory.filePath);
        fs.mkdirSync(fileDir, { recursive: true });

        // Write living docs file
        fs.writeFileSync(userStory.filePath, userStory.markdown, 'utf-8');
      }
    }

    return converted;
  }

  /**
   * Group items by feature (based on source repo, parent hierarchy, or labels)
   *
   * CRITICAL FIX (2025-12-02): Intelligent ADO Hierarchy Mapping for SAFe/Enterprise
   *
   * ADO Hierarchy (5-level SAFe): Capability → Epic → Feature → User Story → Task
   *
   * SpecWeave Mapping:
   * - Capability (ADO 5th level) → SpecWeave Epic (_epics/EP-XXXE/)
   * - Epic (ADO 4th level, child of Capability) → SpecWeave Feature (FS-XXXE/) with parent ref
   * - Epic (ADO 4th level, standalone) → SpecWeave Epic (_epics/EP-XXXE/)
   * - Feature (ADO 3rd level) → SpecWeave Feature (FS-XXXE/)
   * - User Story → us-xxxe.md in parent Feature folder
   *
   * Group Key Prefixes:
   * - "epic:" → Item goes to _epics/EP-XXXE/ (Capability or standalone Epic)
   * - "feature:" → Item goes to FS-XXXE/ (Epic under Capability, or Feature)
   * - "orphan:" → Individual FS-XXXE/ folder (no parent)
   * - "missing-parent:" → Grouped by missing parent ID
   */
  private groupItemsByFeature(items: ExternalItem[]): Map<string, ExternalItem[]> {
    const groups = new Map<string, ExternalItem[]>();

    // Detect platform (ADO, JIRA, or GitHub)
    const hasAdoItems = items.some(item => item.platform === 'ado' && item.adoProjectName);
    const hasJiraItems = items.some(item => item.platform === 'jira');
    const hasHierarchicalItems = hasAdoItems || hasJiraItems;

    // ========================================================================
    // v0.30.6: Universal Hierarchy Mapping (ADO/JIRA/GitHub)
    // ========================================================================
    // Flexible 3/4/5 level mapping that works with ANY external tool:
    // - epicLevelTypes → _epics/EP-XXXE/ (optional strategic layer)
    // - featureLevelTypes → FS-XXXE/ (feature containers)
    // - userStoryTypes → us-xxxe.md file (FIXED)
    // - taskTypes → checkbox in parent US (FIXED)
    //
    // User Story and Task mappings are FIXED (always the same).
    // Container levels (Epic/Feature) are FLEXIBLE (configurable per project).

    // Process items with intelligent hierarchy mapping (ADO or JIRA)
    if (hasHierarchicalItems) {
      // Determine platform for default mapping
      const platform: 'ado' | 'jira' | 'github' = hasAdoItems ? 'ado' : 'jira';

      // Build a map of all items by ID for lookup
      const itemById = new Map<string, ExternalItem>();
      for (const item of items) {
        itemById.set(item.id, item);
      }

      // Filter items by their SpecWeave hierarchy level using flexible mapping
      const epicLevelItems = items.filter(item => {
        const witType = platform === 'ado'
          ? (normalizeAdoWorkItemType(item.adoWorkItemType) || item.type)
          : item.type;
        return this.getSpecWeaveLevel(witType, platform) === 'epic';
      });

      const featureLevelItems = items.filter(item => {
        const witType = platform === 'ado'
          ? (normalizeAdoWorkItemType(item.adoWorkItemType) || item.type)
          : item.type;
        return this.getSpecWeaveLevel(witType, platform) === 'feature';
      });

      // Keep backward compatibility: capabilityItems for parent lookup
      const capabilityItems = epicLevelItems;

      // Create groups for Epic-level items → _epics/EP-XXXE/
      for (const epicItem of epicLevelItems) {
        const groupKey = `epic:${epicItem.id}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(epicItem);
      }

      // Create groups for Feature-level items → FS-XXXE/
      // CRITICAL FIX (v0.30.12): Only TOP-LEVEL feature items create FS-XXXE folders
      // Child feature-level items (e.g., ADO Feature under Epic) should be grouped
      // with their parent, NOT create separate folders.
      //
      // This implements the universal 4-level mapping:
      // - Epic (no feature-level parent) → Creates FS-XXXE/ folder
      // - Feature (has Epic parent) → Goes into parent Epic's FS-XXXE/ folder
      // - User Story → us-xxxe.md file
      // - Task → checkbox in US
      for (const featureItem of featureLevelItems) {
        // Check if this feature has a parent that is ALSO at feature level
        // If so, it should NOT create a separate folder - group with parent
        const hasFeatureLevelParent = featureItem.parentId &&
          featureLevelItems.some(f => f.id === featureItem.parentId);

        // Check if this feature has an epic-level parent
        const hasEpicParent = featureItem.parentId &&
          epicLevelItems.some(epic => epic.id === featureItem.parentId);

        let groupKey: string;

        if (hasFeatureLevelParent) {
          // CRITICAL FIX (v0.30.12): Child of another feature-level item
          // Group with the parent instead of creating a new folder
          // Find the TOP-LEVEL ancestor in the feature hierarchy
          let ancestorId = featureItem.parentId;
          let ancestor = featureLevelItems.find(f => f.id === ancestorId);

          // Walk up to find the top-level feature (one without feature-level parent)
          while (ancestor) {
            const ancestorHasFeatureParent = ancestor.parentId &&
              featureLevelItems.some(f => f.id === ancestor!.parentId);

            if (!ancestorHasFeatureParent) {
              // Found the top-level feature
              break;
            }

            ancestorId = ancestor.parentId;
            ancestor = featureLevelItems.find(f => f.id === ancestorId);
          }

          // Group with the top-level feature ancestor
          groupKey = ancestorId ? `feature:${ancestorId}` : `feature:${featureItem.id}`;

          moduleLogger.debug(`   📁 Feature "${featureItem.title}" grouped under parent ${ancestorId}`);
        } else if (hasEpicParent) {
          // Feature under Epic → FS-XXXE/ (Feature level) with parent reference
          groupKey = `feature:${featureItem.id}`;
        } else {
          // Standalone Feature (no feature-level or epic parent) → FS-XXXE/
          groupKey = `feature:${featureItem.id}`;
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(featureItem);
      }

      // Assign child items (User Stories, Tasks, Bugs) to their parent groups
      // v0.30.6: Use flexible hierarchy mapping for ALL platforms (ADO/JIRA)
      for (const item of items) {
        // Normalize work item type (ADO needs special handling for plurals)
        const witType = platform === 'ado'
          ? (normalizeAdoWorkItemType(item.adoWorkItemType) || item.type)
          : item.type;

        // Skip epic/feature-level items (already processed above)
        if (this.isFeatureLevelType(witType, platform)) {
          continue;
        }

        // Get the SpecWeave level for this item type
        const itemLevel = this.getSpecWeaveLevel(witType, platform);

        // Skip items marked as 'skip' in hierarchy mapping
        if (itemLevel === 'skip') {
          moduleLogger.log(`   ⏭️  Skipping ${witType} (configured as 'skip' in hierarchy mapping)`);
          continue;
        }

        // Find the parent group
        let groupKey: string | undefined;

        if (item.parentId) {
          // Try to find parent in our items
          const parent = itemById.get(item.parentId);
          if (parent) {
            // Find the appropriate ancestor group using hierarchy mapping
            // CRITICAL FIX (v0.30.12): Find the TOP-LEVEL feature ancestor
            // CRITICAL FIX (v0.34.1): Simplified logic for JIRA 3-level hierarchy
            //
            // JIRA Hierarchy (3 levels): Epic → Story → Task
            // ADO Hierarchy (5 levels): Capability → Epic → Feature → User Story → Task
            let current: ExternalItem | undefined = parent;
            while (current) {
              // Normalize work item type for consistent lookup
              const currentType = platform === 'ado'
                ? (normalizeAdoWorkItemType(current.adoWorkItemType) || current.type)
                : current.type;
              const currentLevel = this.getSpecWeaveLevel(currentType, platform);

              // DIAGNOSTIC: Log hierarchy walk for JIRA items
              if (platform === 'jira') {
                moduleLogger.debug(`   🔍 JIRA Hierarchy: ${item.id} → parent ${current.id} (${currentType} → ${currentLevel})`);
              }

              // Epic-level ancestor → epic group
              if (currentLevel === 'epic') {
                groupKey = `epic:${current.id}`;
                moduleLogger.debug(`   ✅ JIRA: Assigned ${item.id} to epic group ${groupKey}`);
                break;
              }

              // Feature-level ancestor → find TOP-LEVEL feature
              if (currentLevel === 'feature') {
                // CRITICAL FIX (v0.30.12): Walk up to find the top-level feature
                // (one without a feature-level parent)
                let topLevelFeature = current;
                while (topLevelFeature.parentId) {
                  const featureParent = itemById.get(topLevelFeature.parentId);
                  if (!featureParent) break;

                  const featureParentType = platform === 'ado'
                    ? (normalizeAdoWorkItemType(featureParent.adoWorkItemType) || featureParent.type)
                    : featureParent.type;
                  const featureParentLevel = this.getSpecWeaveLevel(featureParentType, platform);

                  // If parent is also feature-level, keep walking up
                  if (featureParentLevel === 'feature') {
                    topLevelFeature = featureParent;
                  } else {
                    // Parent is epic-level or other - stop here
                    break;
                  }
                }

                groupKey = `feature:${topLevelFeature.id}`;
                moduleLogger.debug(`   ✅ JIRA: Assigned ${item.id} to feature group ${groupKey}`);
                break;
              }

              // CRITICAL FIX (v0.34.1): For User Story level items, walk up to parent
              // JIRA: Story with Epic parent → should go to epic group
              current = current.parentId ? itemById.get(current.parentId) : undefined;

              // DIAGNOSTIC: Warn if parent lookup failed (should not happen after Phase 3 recovery)
              if (!current && parent.parentId) {
                moduleLogger.warn(`   ⚠️  JIRA: Parent ${parent.parentId} not found in itemById map for ${item.id}`);
              }
            }
          } else {
            // Parent NOT in dataset - group by parentId so siblings stay together
            // CRITICAL (v0.34.1): This should NOT happen for JIRA after Phase 3 parent recovery!
            moduleLogger.warn(`   ⚠️  JIRA: Parent ${item.parentId} missing for ${item.id} (Phase 3 recovery failed?)`);
            groupKey = `missing-parent:${item.parentId}`;
          }
        }

        // v0.30.6: Handle orphan items based on orphanHandling option
        // Default changed from 'skip' to 'group' - orphans go to _orphans/ folder
        if (!groupKey) {
          const orphanHandling = this.options.orphanHandling || 'group';

          switch (orphanHandling) {
            case 'skip':
              // Don't import orphan items
              moduleLogger.log(`   ⏭️  Skipping orphan ${witType} "${item.title}" (orphanHandling='skip')`);
              continue; // Skip this item entirely

            case 'group':
              // Group all orphans under _orphans/ folder (v0.30.6 default)
              // Industry-standard naming for items without parents in hierarchy
              groupKey = `orphans:all`;
              break;

            case 'create-feature':
            default:
              // Legacy behavior: create individual FS-XXXE folders (causes bug)
              groupKey = `orphan:${item.id}`;
              break;
          }
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(item);
      }

      return groups;
    }

    // Non-ADO or no hierarchy: group by source repo (original behavior)
    for (const item of items) {
      const groupKey = item.sourceRepo || 'default';

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    return groups;
  }

  /**
   * Allocate a feature ID for a group of items
   *
   * CRITICAL FIX (2025-12-02): Handle "epic:" groups using EpicIdAllocator
   *
   * Group Key Handling:
   * - "epic:..." → Use EpicIdAllocator, create in _epics/EP-XXXE/
   * - "feature:..." → Use FSIdAllocator, create in FS-XXXE/
   * - "orphan:..." → Use FSIdAllocator, create in FS-XXXE/
   * - Other → Use FSIdAllocator
   *
   * CRITICAL (v0.30.3): This method ALWAYS returns a FEATURE ID (FS-XXXE).
   * For epic groups, it creates the epic in {project}/_epics/ AND a feature folder.
   * User stories are NEVER placed in epic folders directly.
   *
   * @returns Feature ID (FS-XXXE) - NEVER returns Epic ID
   */
  private async allocateFeatureForGroup(
    firstItem: ExternalItem,
    groupKey: string,
    allGroupItems?: ExternalItem[]
  ): Promise<string> {
    // CRITICAL: Detect if this is an "epic:" group (Capability or standalone Epic)
    const isEpicGroup = groupKey.startsWith('epic:');

    // Check feature cache (always check this, as we always return feature IDs)
    // Epic cache is only for tracking epic creation, not for return values
    const featureGroupKey = isEpicGroup ? `feature-for-${groupKey}` : groupKey;
    if (this.createdFeatures.has(featureGroupKey)) {
      return this.createdFeatures.get(featureGroupKey)!;
    }

    // For "epic:" groups, create epic in _epics/ AND a feature folder
    // CRITICAL (v0.30.3): Do NOT return epicId - user stories go to feature folders
    let parentEpicId: string | undefined;

    if (isEpicGroup) {
      if (!this.epicIdAllocator) {
        throw new Error('EpicIdAllocator not initialized');
      }

      // Only create epic if not already created
      if (!this.createdEpics.has(groupKey)) {
        // Create external epic item for allocation
        const epicItem: ExternalEpicItem = {
          externalId: firstItem.id,
          title: firstItem.title,
          createdAt: firstItem.createdAt.toISOString(),
          externalUrl: firstItem.url,
          workItemType: firstItem.adoWorkItemType || 'Capability'
        };

        // Allocate Epic ID
        const allocation = await this.epicIdAllocator.allocateId(epicItem);
        const epicId = allocation.id;

        // Create Epic folder in {project}/_epics/
        const metadata = createExternalMetadata({
          id: epicId,
          source: firstItem.platform,
          externalId: firstItem.id,
          externalUrl: firstItem.url,
          externalTitle: firstItem.title
        });
        await this.epicIdAllocator.createEpicFolder(epicId, epicItem, metadata);

        // Cache epic for reference
        this.createdEpics.set(groupKey, epicId);

        // Notify epic creation callback (use per-project path)
        if (this.options.onFeatureCreated) {
          const epicPath = this.epicIdAllocator.getEpicsPath();
          this.options.onFeatureCreated(epicId, path.join(epicPath, epicId));
        }
      }

      // Set parent epic for the feature folder we're about to create
      parentEpicId = this.createdEpics.get(groupKey);
    }

    // v0.30.6: Handle orphans:all group (orphanHandling='group')
    // Instead of creating individual FS-* folders, put all orphans in _orphans/
    // Industry-standard naming (like git orphan branches, database orphan records)
    if (groupKey === 'orphans:all') {
      const baseDir = this.getBaseDirectory();
      const orphansDir = path.join(baseDir, '_orphans');

      // Create _orphans directory if needed
      if (!fs.existsSync(orphansDir)) {
        fs.mkdirSync(orphansDir, { recursive: true });

        // Create README.md explaining the folder purpose
        const readmeContent = `# Orphan Items

This folder contains items imported from external tools that have **no parent** in the hierarchy.

## Why are items here?

Items land here when:
1. **No parent in external tool** - The item has no Epic/Feature parent in ADO/JIRA/GitHub
2. **Parent not imported** - The parent exists but wasn't included in the import (different time range, project, or filter)
3. **Hierarchy mismatch** - The external tool's hierarchy doesn't map cleanly to SpecWeave's Epic→Feature→User Story structure

## What should I do?

1. **Review each item** - Determine which Feature it belongs to
2. **Move to correct folder** - Drag the \`.md\` file to the appropriate \`FS-XXX/\` folder
3. **Update FEATURE.md** - Add the user story to the feature's list
4. **Or create new Feature** - If no suitable feature exists, create a new increment

---
*Auto-generated by SpecWeave on ${new Date().toISOString().split('T')[0]}*
`;
        fs.writeFileSync(path.join(orphansDir, 'README.md'), readmeContent, 'utf-8');
      }

      // Return a special "orphans" folder name (not a real FS-* ID)
      // User stories will be placed directly in _orphans/ folder
      this.createdFeatures.set(featureGroupKey, '_orphans');
      return '_orphans';
    }

    // All groups (including epic groups) need a feature folder for user stories
    // FSIdAllocator is required for feature allocation
    if (!this.fsIdAllocator) {
      throw new Error('FSIdAllocator not initialized');
    }

    // For ADO feature groups, check if it's an Epic with Capability parent
    // If so, include parent reference in the feature folder
    const isAdoFeatureGroup = groupKey.startsWith('feature:');
    // CRITICAL (v0.30.4): Normalize work item type for plural handling
    // v0.30.5: Use configurable hierarchy mapping instead of hardcoded types
    const normalizedWitType = normalizeAdoWorkItemType(firstItem.adoWorkItemType) || firstItem.type;
    const isFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) &&
      this.isFeatureLevelType(normalizedWitType, firstItem.platform as 'ado' | 'jira' | 'github' || 'ado');

    // CRITICAL (v0.30.3): Determine parent epic for this feature folder
    // - For epic groups: parentEpicId was set above when creating the epic
    // - For feature groups with Capability parent: look up the parent
    if (!parentEpicId) {
      const isEpicWithCapParent = normalizedWitType === 'epic' &&
        firstItem.parentId &&
        this.createdEpics.has(`epic:${firstItem.parentId}`);

      if (isEpicWithCapParent) {
        parentEpicId = this.createdEpics.get(`epic:${firstItem.parentId}`);
      }
    }

    // Create external work item for feature allocation
    const workItem: ExternalWorkItem = {
      externalId: firstItem.id,
      title: isFeatureLevelItem ? firstItem.title : (firstItem.sourceRepo || firstItem.title),
      createdAt: firstItem.createdAt.toISOString(),
      externalUrl: firstItem.url
    };

    // Allocate feature ID
    const allocation = await this.fsIdAllocator.allocateId(workItem);
    const featureId = allocation.id;

    // Check if ALL items in the group should be archived
    const shouldArchiveFeature = this.shouldArchiveEntireGroup(allGroupItems || [firstItem]);

    // Create feature folder with FEATURE.md
    // Pass parent Epic ID for reference (epic_id field in frontmatter)
    const featurePath = await this.createFeatureFolder(
      featureId,
      firstItem,
      groupKey,
      shouldArchiveFeature,
      parentEpicId
    );

    // Cache for reuse using the feature group key
    this.createdFeatures.set(featureGroupKey, featureId);

    // Notify callback
    if (this.options.onFeatureCreated) {
      this.options.onFeatureCreated(featureId, featurePath);
    }

    return featureId;
  }

  /**
   * Check if ALL items in a group should be archived
   */
  private shouldArchiveEntireGroup(items: ExternalItem[]): boolean {
    if (items.length === 0) return false;
    const threshold = this.options.autoArchiveAfterDays;
    if (!threshold || threshold <= 0) return false;

    return items.every(item => this.shouldAutoArchive(item.createdAt));
  }

  /**
   * Get base directory for specs, handling both 1-level and 2-level structures
   *
   * Structure patterns:
   * - 2-level (JIRA): specs/{projectKey}/{boardName}/ (e.g., AAC/aac/)
   * - 2-level (ADO): specs/{projectName}/{areaPath}/
   * - 1-level (GitHub): specs/{projectId}/
   * - Legacy: specs/ (no projectId)
   *
   * CRITICAL (v0.35.2): JIRA no longer uses "JIRA-" prefix to match ADO behavior
   *
   * IMPORTANT: For 2-level structure, features ALWAYS go in the inner folder (board/area level),
   * even when containerDirName == projectId (e.g., specs/my-project/my-project/).
   * This is correct because the outer folder is PROJECT level, inner is BOARD level.
   */
  private getBaseDirectory(): string {
    const container = this.options.externalContainer;

    if (container) {
      // 2-level structure for JIRA/ADO
      // JIRA: specs/{projectKey}/{boardName}/ (no JIRA- prefix, matches ADO behavior)
      // ADO: specs/{projectName}/{areaPath}/ (no ADO- prefix per user request)
      // CRITICAL FIX (v0.35.2): Remove JIRA- prefix to match ADO behavior
      // Level 1: Use raw projectKey (e.g., "AAC", not "jira-aac")
      // Level 2: Use normalized board name from mapping (e.g., "aac")
      const containerDirName = container.containerId; // Use raw containerId (e.g., "AAC")
      const projectId = this.options.projectId || 'default';

      return path.join(
        this.options.specsDir,
        containerDirName,
        projectId
      );
    }

    // 1-level structure for GitHub or single-project mode
    if (this.options.projectId) {
      return path.join(this.options.specsDir, this.options.projectId);
    }

    // Legacy: direct to specs/
    return this.options.specsDir;
  }

  /**
   * Create feature folder with FEATURE.md
   *
   * CRITICAL FIX (2025-12-02): Support parent Epic reference for ADO Epic→Feature mapping
   *
   * @param featureId - Feature ID (e.g., "FS-001E")
   * @param firstItem - First item in the group (used for metadata)
   * @param groupKey - Group key for caching
   * @param shouldArchive - If true, create feature folder in _archive/ directory
   * @param parentEpicId - Optional parent Epic ID (EP-XXXE) for hierarchy reference
   */
  private async createFeatureFolder(
    featureId: string,
    firstItem: ExternalItem,
    groupKey: string,
    shouldArchive: boolean = false,
    parentEpicId?: string
  ): Promise<string> {
    // Use 2-level or 1-level structure based on externalContainer
    const baseDir = this.getBaseDirectory();
    // CRITICAL FIX (2025-12-01): Create in _archive if all items in group are old
    // This prevents duplicate folders: FS-XXX/ (empty) + _archive/FS-XXX/ (with content)
    const featurePath = shouldArchive
      ? path.join(baseDir, '_archive', featureId)
      : path.join(baseDir, featureId);

    // Create directory
    fs.mkdirSync(featurePath, { recursive: true });

    // Check if this is a feature-level item or orphan
    // CRITICAL FIX (v0.30.3): Also handle epic groups - they need proper titles
    const isAdoFeatureGroup = groupKey.startsWith('feature:');
    const isEpicGroup = groupKey.startsWith('epic:');
    // CRITICAL FIX (v0.35.5): Match BOTH 'orphan:' (legacy) and 'orphans:' (current v0.30.6+)
    // Legacy: 'orphan:${item.id}' - individual orphan folders
    // Current: 'orphans:all' - grouped orphans folder
    const isOrphanGroup = groupKey.startsWith('orphan:') || groupKey.startsWith('orphans:');
    // Normalize work item type for consistent lookup
    const adoWitType = normalizeAdoWorkItemType(firstItem.adoWorkItemType);
    const platform = (firstItem.platform as 'ado' | 'jira' | 'github') || 'ado';

    // CRITICAL FIX (v0.35.4): Platform-agnostic feature-level detection
    // Previously only checked ADO, now supports JIRA Epic/Feature too!
    // This ensures FEATURE.md gets actual Epic/Feature title from JIRA
    const itemType = platform === 'ado'
      ? (adoWitType || firstItem.type)
      : firstItem.type;
    const isFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) &&
      this.isFeatureLevelType(itemType, platform);

    // Generate FEATURE.md content based on item type and platform
    let featureTitle: string;
    let description: string;
    let externalLink: string;
    let witTypeLabel: string;
    let platformLabel: string;

    // Platform-specific labels and links
    switch (firstItem.platform) {
      case 'ado':
        platformLabel = 'Azure DevOps';
        break;
      case 'jira':
        platformLabel = 'JIRA';
        break;
      case 'github':
        platformLabel = 'GitHub';
        break;
      default:
        platformLabel = firstItem.platform || 'external tool';
    }

    if (isFeatureLevelItem) {
      // For feature-level items (ADO Epic/Feature, JIRA Epic/L3 Feature), use actual info
      // JIRA: Epic/L3 Feature title and description
      // ADO: Capability/Epic/Feature title and description
      witTypeLabel = firstItem.adoWorkItemType || this.getJiraWorkItemTypeLabel(firstItem) || 'Feature';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel}.`;
      externalLink = `[${witTypeLabel} in ${platformLabel}](${firstItem.url})`;
    } else if (isOrphanGroup) {
      // CRITICAL FIX (2025-12-01): For orphan items (no parent Epic/Feature),
      // create feature with the item's info. This happens when:
      // - Item has no parent in external tool
      // - Parent wasn't imported (outside time range or different project)
      // UNIVERSAL: Applies to ALL platforms (ADO, JIRA, GitHub)
      witTypeLabel = firstItem.adoWorkItemType || 'User Story';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description ||
        `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel} without a parent Epic/Feature.`;
      externalLink = firstItem.url ? `[${witTypeLabel} in ${platformLabel}](${firstItem.url})` : '';
    } else if (firstItem.sourceRepo) {
      featureTitle = `Feature: ${firstItem.sourceRepo} External Items`;
      description = 'This feature folder contains User Stories imported from external tools.';
      externalLink = '';
      witTypeLabel = 'Feature';
    } else {
      featureTitle = `Feature: Imported from ${platformLabel}`;
      description = 'This feature folder contains User Stories imported from external tools.';
      externalLink = '';
      witTypeLabel = 'Feature';
    }

    // Include external metadata for feature-level items and all orphans
    const includeExternalMetadata = isFeatureLevelItem || isOrphanGroup;

    // CRITICAL (v0.30.3): Build parent Epic reference if available
    // Epic ID is stored as `epic_id` in frontmatter for consistency
    // Epic path is relative from {project}/{board}/FS-XXX/ to {project}/_epics/EP-XXX/
    const hasParentEpic = parentEpicId !== undefined;
    const parentEpicLink = hasParentEpic
      ? `[${parentEpicId}](../../_epics/${parentEpicId}/EPIC.md)`
      : '';

    // NOTE: isEpicGroup already defined above (line ~861) - no need to redeclare

    const featureContent = `---
id: ${featureId}
title: ${featureTitle}
origin: external
source: ${firstItem.platform}
${firstItem.sourceRepo ? `source_repo: ${firstItem.sourceRepo}` : ''}
${firstItem.adoProjectName ? `ado_project: ${firstItem.adoProjectName}` : ''}
${firstItem.adoAreaPath ? `ado_area_path: ${firstItem.adoAreaPath}` : ''}
${includeExternalMetadata ? `work_item_type: ${witTypeLabel}` : ''}
${includeExternalMetadata ? `external_id: ${firstItem.id}` : ''}
${hasParentEpic ? `epic_id: ${parentEpicId}` : ''}
${isOrphanGroup ? `orphan: true` : ''}
created: ${new Date().toISOString()}
---

# ${featureTitle}

**Origin**: 🔗 ${externalLink || `Imported from ${platformLabel}`}
${hasParentEpic ? `\n**Parent Epic**: ${parentEpicLink}` : ''}

## Description

${description}

${firstItem.sourceRepo ? `**Source Repository**: ${firstItem.sourceRepo}` : ''}
${firstItem.adoAreaPath ? `**Area Path**: ${firstItem.adoAreaPath}` : ''}
${hasParentEpic ? `\n> **Hierarchy**: This feature belongs to Epic ${parentEpicId}.` : ''}
${isOrphanGroup ? `\n> **Note**: This feature was created from an orphan item (no parent Epic/Feature in ${platformLabel} or parent not imported).` : ''}

## User Stories

User stories in this ${witTypeLabel.toLowerCase()} will be listed here.

## Status

- **Created**: ${new Date().toISOString()}
- **Source**: ${platformLabel}
${includeExternalMetadata ? `- **External ID**: ${firstItem.id}` : ''}
${hasParentEpic ? `- **Epic ID**: ${parentEpicId}` : ''}
${isOrphanGroup ? `- **Type**: Orphan (no parent Epic)` : ''}
`;

    // Write FEATURE.md
    const featureFile = path.join(featurePath, 'FEATURE.md');
    fs.writeFileSync(featureFile, featureContent, 'utf-8');

    return featurePath;
  }

  // mapStatus moved to MarkdownGenerator

  /**
   * Check if an item should be auto-archived based on creation date
   */
  private shouldAutoArchive(createdAt: Date): boolean {
    const threshold = this.options.autoArchiveAfterDays;
    if (!threshold || threshold <= 0) return false;

    const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return ageDays >= threshold;
  }

  // ============================================================================
  // Parent Change Detection (v0.29.0+ - Re-Import Hierarchy Updates)
  // ============================================================================

  /**
   * Check if parent has changed between existing reference and new item
   *
   * CRITICAL (2025-12-01): Detects orphan → has parent, or parent ID change
   *
   * @param existingRef - Existing reference from living docs
   * @param newItem - New item being imported
   * @returns True if parent has changed and file should be moved
   */
  private hasParentChanged(
    existingRef: import('./duplicate-detector.js').ExternalIdReference,
    newItem: ExternalItem
  ): boolean {
    // Only check for ADO items with hierarchy support
    if (newItem.platform !== 'ado') {
      return false;
    }

    // Case 1: Was orphan, now has parent
    if (existingRef.isOrphan && newItem.parentId) {
      return true;
    }

    // Case 2: Parent ID changed (including has parent → different parent)
    if (existingRef.parentId && newItem.parentId && existingRef.parentId !== newItem.parentId) {
      return true;
    }

    return false;
  }

  /**
   * Handle parent change by moving file to new feature folder
   *
   * CRITICAL (2025-12-01): Moves US file when hierarchy changes on re-import
   *
   * @param existingRef - Existing reference with old location
   * @param newItem - New item with updated parent info
   * @param newFeatureId - New feature folder ID (if already allocated for group)
   */
  private async handleParentChange(
    existingRef: import('./duplicate-detector.js').ExternalIdReference,
    newItem: ExternalItem,
    newFeatureId: string | undefined
  ): Promise<void> {
    const oldFilePath = existingRef.filePath;
    const oldFeatureId = existingRef.featureId || 'unknown';

    // Determine the new feature folder
    // If newFeatureId not provided, allocate one based on new parent
    let targetFeatureId = newFeatureId;
    if (!targetFeatureId && this.fsIdAllocator && this.options.enableFeatureAllocation) {
      // Create a group key based on new parent
      const groupKey = `parent:${newItem.parentId}`;
      targetFeatureId = await this.allocateFeatureForGroup(newItem, groupKey);
    }

    if (!targetFeatureId || targetFeatureId === oldFeatureId) {
      // No move needed - same feature folder
      return;
    }

    // Calculate new file path
    const baseDir = this.getBaseDirectory();
    const fileName = path.basename(oldFilePath);
    const newFilePath = path.join(baseDir, targetFeatureId, fileName);

    // Read existing file content
    const existingContent = fs.readFileSync(oldFilePath, 'utf-8');

    // Update metadata in content
    const updatedContent = this.updateParentMetadataInContent(
      existingContent,
      newItem.parentId,
      targetFeatureId,
      false // No longer orphan
    );

    // Ensure target directory exists
    const targetDir = path.dirname(newFilePath);
    fs.mkdirSync(targetDir, { recursive: true });

    // Write to new location
    fs.writeFileSync(newFilePath, updatedContent, 'utf-8');

    // Remove old file
    fs.unlinkSync(oldFilePath);

    // Check if old directory is now empty and clean up
    const oldDir = path.dirname(oldFilePath);
    await this.cleanupEmptyFeatureFolder(oldDir, oldFeatureId);

    // Notify callback
    if (this.options.onParentChanged) {
      const reason = existingRef.isOrphan
        ? `Orphan now has parent: ${newItem.parentId}`
        : `Parent changed from ${existingRef.parentId} to ${newItem.parentId}`;
      this.options.onParentChanged(existingRef.usId, oldFeatureId, targetFeatureId, reason);
    }

    // Clear duplicate detector cache since file moved
    if (this.duplicateDetector) {
      this.duplicateDetector.clearCache();
    }
  }

  /**
   * Update parent metadata in file content
   */
  private updateParentMetadataInContent(
    content: string,
    newParentId: string | undefined,
    newFeatureId: string,
    isOrphan: boolean
  ): string {
    let updated = content;

    // Update Feature ID
    updated = updated.replace(
      /^- \*\*Feature ID\*\*: .+$/m,
      `- **Feature ID**: ${newFeatureId}`
    );

    // Update or add Parent ID
    if (newParentId) {
      if (updated.match(/^- \*\*Parent ID\*\*: .+$/m)) {
        updated = updated.replace(
          /^- \*\*Parent ID\*\*: .+$/m,
          `- **Parent ID**: ${newParentId}`
        );
      } else {
        // Add Parent ID after Feature ID
        updated = updated.replace(
          /^(- \*\*Feature ID\*\*: .+)$/m,
          `$1\n- **Parent ID**: ${newParentId}`
        );
      }
    }

    // Remove Orphan line if no longer orphan
    if (!isOrphan) {
      updated = updated.replace(/^- \*\*Orphan\*\*: .+\n?/m, '');
    }

    return updated;
  }

  // ============================================================================
  // Duplicate Prevention Helpers (v0.30.13+ - Prevent Empty FS-XXXE Folders)
  // ============================================================================

  /**
   * Find existing feature folders for item groups by scanning FEATURE.md files
   *
   * CRITICAL FIX (2025-12-05): Prevents duplicate FS-XXXE folder creation on re-import
   *
   * For GitHub items grouped by sourceRepo, this finds any existing FS-XXXE folder
   * that has the same source_repo in its FEATURE.md frontmatter.
   *
   * @param itemGroups - Groups of items from groupItemsByFeature()
   * @returns Map from groupKey to existing feature ID (e.g., "anton-abyzov/specweave" -> "FS-111E")
   */
  private async findExistingFeatureFolders(
    itemGroups: Map<string, ExternalItem[]>
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    // Only scan if duplicate detection is enabled
    if (!this.duplicateDetector) {
      return result;
    }

    const baseDir = this.getBaseDirectory();
    if (!fs.existsSync(baseDir)) {
      return result;
    }

    // Build a map of source_repo -> feature ID from existing FEATURE.md files
    const sourceRepoToFeature = new Map<string, string>();

    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Match FS-XXXE folders only
        if (!/^FS-\d{3,}E$/.test(entry.name)) continue;

        const featureMdPath = path.join(baseDir, entry.name, 'FEATURE.md');
        if (!fs.existsSync(featureMdPath)) continue;

        try {
          const content = fs.readFileSync(featureMdPath, 'utf-8');
          const parsed = matter(content);

          // Check for source_repo in frontmatter
          if (parsed.data.source_repo) {
            sourceRepoToFeature.set(parsed.data.source_repo, entry.name);
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    } catch {
      // Directory read failed - return empty map
      return result;
    }

    // Now match item groups to existing feature folders
    for (const [groupKey, groupItems] of itemGroups) {
      if (groupItems.length === 0) continue;

      const firstItem = groupItems[0];

      // For GitHub items grouped by sourceRepo
      if (firstItem.sourceRepo && sourceRepoToFeature.has(firstItem.sourceRepo)) {
        result.set(groupKey, sourceRepoToFeature.get(firstItem.sourceRepo)!);
        moduleLogger.debug(`   🔍 Found existing folder ${sourceRepoToFeature.get(firstItem.sourceRepo)} for source_repo: ${firstItem.sourceRepo}`);
      }
    }

    return result;
  }

  /**
   * Check if a group has at least one non-duplicate item
   *
   * CRITICAL FIX (2025-12-05): Prevents empty folder creation when all items are duplicates
   *
   * @param groupItems - Items in a group
   * @returns True if at least one item is NOT a duplicate
   */
  private async groupHasNonDuplicates(groupItems: ExternalItem[]): Promise<boolean> {
    if (!this.duplicateDetector) {
      // No duplicate detection - all items are "new"
      return groupItems.length > 0;
    }

    for (const item of groupItems) {
      // Skip ADO Tasks - they become checkboxes, not separate files
      if (item.adoWorkItemType?.toLowerCase() === 'task') {
        continue;
      }

      const existingRef = await this.duplicateDetector.findExternalIdReference(item.id);
      if (!existingRef) {
        // Found a non-duplicate item
        return true;
      }
    }

    // All items are duplicates (or Tasks)
    return false;
  }

  /**
   * Clean up empty feature folder after file move
   *
   * Checks if folder is empty (except FEATURE.md) and removes it if orphan folder
   */
  private async cleanupEmptyFeatureFolder(folderPath: string, featureId: string): Promise<void> {
    try {
      const files = fs.readdirSync(folderPath);

      // Check if only FEATURE.md remains (or empty)
      const nonTemplateFiles = files.filter(f => f.toLowerCase() !== 'feature.md');

      if (nonTemplateFiles.length === 0) {
        // Remove FEATURE.md if exists
        const featureMdPath = path.join(folderPath, 'FEATURE.md');
        if (fs.existsSync(featureMdPath)) {
          fs.unlinkSync(featureMdPath);
        }

        // Remove empty folder
        fs.removeSync(folderPath);

        moduleLogger.debug(`   🗑️ Cleaned up empty orphan folder: ${featureId}`);
      }
    } catch (error) {
      // Folder cleanup is best-effort, don't fail on errors
    }
  }

  // generateOriginBadge moved to MarkdownGenerator

  // generateMarkdown moved to MarkdownGenerator

  // generateFileName moved to MarkdownGenerator

  /**
   * Validate that no increments were created
   *
   * CRITICAL: This validation ensures we're not auto-creating increments.
   */
  static validateNoIncrementsCreated(projectRoot: string): void {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    if (!fs.existsSync(incrementsDir)) {
      return; // No increments directory - that's fine
    }

    // Check for any numbered increment directories
    const items = fs.readdirSync(incrementsDir);
    const incrementDirs = items.filter(item => {
      const fullPath = path.join(incrementsDir, item);
      return fs.statSync(fullPath).isDirectory() && /^\d{3,4}E?-/.test(item);
    });

    if (incrementDirs.length > 0) {
      throw new Error(
        `VALIDATION FAILED: Increments were auto-created during import. ` +
        `Found: ${incrementDirs.join(', ')}. ` +
        `Import should ONLY create living docs, not increments.`
      );
    }
  }

  /**
   * TESTING ONLY: Expose private method for unit tests
   * DO NOT use in production code
   */
  public __test__groupItemsByFeature(items: ExternalItem[]): Map<string, ExternalItem[]> {
    return this.groupItemsByFeature(items);
  }
}
