/**
 * Item Converter
 *
 * Converts external items (GitHub/JIRA/ADO) to SpecWeave living docs User Stories.
 * CRITICAL: Does NOT create increments - only creates living docs.
 */

import type { ExternalItem } from './external-importer.js';
import * as fs from '../utils/fs-native.js';
import path from 'path';
import { FSIdAllocator, type ExternalWorkItem } from '../living-docs/fs-id-allocator.js';
import { EpicIdAllocator, type ExternalEpicItem } from '../living-docs/epic-id-allocator.js';
import { IDRegistry } from '../living-docs/id-registry.js';
import { createExternalMetadata } from '../core/types/origin-metadata.js';
import { DuplicateDetector } from './duplicate-detector.js';
import type { ExternalContainerContext } from '../core/types/increment-metadata.js';
import { getTwoLevelProjectPath, normalizeToProjectId } from '../utils/project-id-generator.js';
import { MarkdownGenerator, type TaskData } from './markdown-generator.js';
import { Logger, consoleLogger } from '../utils/logger.js';

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

  /** Auto-archive items older than this many days (default: 30, 0 to disable) */
  autoArchiveAfterDays?: number;

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
   * - JIRA: specs/JIRA-{containerId}/{projectId}/FS-XXX/
   * - ADO: specs/{containerId}/{projectId}/FS-XXX/ (no ADO- prefix)
   *
   * When NOT provided (default), creates 1-level structure:
   * - GitHub: specs/{projectId}/FS-XXX/
   *
   * @example
   * ```typescript
   * // JIRA board-based setup
   * externalContainer: {
   *   type: 'jira-project',
   *   containerId: 'CORE',
   *   containerName: 'Core Project',
   *   boardId: 123,
   *   boardName: 'Frontend Board'
   * }
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
      autoArchiveAfterDays: 30,  // Default: archive items older than 1 month
      enableGlobalCollisionDetection: false, // Default: false for backwards compatibility
      ...options,
    };

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
      this.fsIdAllocator = new FSIdAllocator(
        this.options.projectRoot,
        this.options.projectId,
        { globalCollisionDetection: this.options.enableGlobalCollisionDetection }
      );

      // Initialize Epic ID allocator for ADO Capabilities (v0.29.3+)
      // Capabilities are the top-level items in ADO SAFe/Enterprise setups
      // CRITICAL (v0.30.3): Epics go to {project}/_epics/EP-XXXE/ (per-project)
      // projectId is required for per-project epic storage
      const epicProjectId = this.options.projectId || 'default';
      this.epicIdAllocator = new EpicIdAllocator(
        this.options.projectRoot,
        epicProjectId,
        { globalCollisionDetection: this.options.enableGlobalCollisionDetection }
      );
    }
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
        isOrphan: !item.parentId,
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
   */
  async convertItems(items: ExternalItem[]): Promise<ConvertedUserStory[]> {
    const startingId = this.options.startingId || 1;
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

    // Process each group
    for (const [groupKey, groupItems] of itemGroups.entries()) {
      // Allocate feature ID for this group if feature allocation is enabled
      let featureId: string | undefined;

      if (this.fsIdAllocator && this.options.enableFeatureAllocation && groupItems.length > 0) {
        const firstItem = groupItems[0];
        // CRITICAL FIX (2025-12-01): Pass ALL group items to check if entire group should be archived
        // This prevents duplicate folders when all items are old
        featureId = await this.allocateFeatureForGroup(firstItem, groupKey, groupItems);
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

    // Detect ADO items
    const hasAdoItems = items.some(item => item.platform === 'ado' && item.adoProjectName);

    // Process ADO items with intelligent hierarchy mapping
    if (hasAdoItems) {
      // Build a map of all items by ID for lookup
      const itemById = new Map<string, ExternalItem>();
      for (const item of items) {
        itemById.set(item.id, item);
      }

      // CRITICAL: Separate Capability (top-level) from other feature-level items
      // Capabilities go to _epics/, everything else goes to FS-XXXE/
      const capabilityItems = items.filter(item =>
        item.adoWorkItemType?.toLowerCase() === 'capability'
      );

      // Epics and Features are "feature-level" items
      // But Epics with Capability parents become Features (FS-XXXE)
      // Epics without Capability parents become Epics (_epics/EP-XXXE)
      const epicItems = items.filter(item =>
        item.adoWorkItemType?.toLowerCase() === 'epic'
      );

      const featureItems = items.filter(item =>
        item.adoWorkItemType?.toLowerCase() === 'feature'
      );

      // Create groups for Capabilities → _epics/EP-XXXE/
      for (const capItem of capabilityItems) {
        const groupKey = `epic:${capItem.id}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(capItem);
      }

      // Process Epics: determine if they're children of Capabilities or standalone
      for (const epicItem of epicItems) {
        let groupKey: string;

        // Check if Epic has a Capability parent
        const hasCapabilityParent = epicItem.parentId &&
          capabilityItems.some(cap => cap.id === epicItem.parentId);

        if (hasCapabilityParent) {
          // Epic with Capability parent → FS-XXXE/ (Feature level)
          // The Epic becomes a Feature folder, with reference to parent Epic
          groupKey = `feature:${epicItem.id}`;
        } else {
          // Standalone Epic (no Capability parent) → _epics/EP-XXXE/
          groupKey = `epic:${epicItem.id}`;
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(epicItem);
      }

      // Create groups for Features → FS-XXXE/
      for (const featureItem of featureItems) {
        const groupKey = `feature:${featureItem.id}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(featureItem);
      }

      // Assign child items (User Stories, Tasks, Bugs) to their parent groups
      const featureLevelTypes = new Set(['capability', 'epic', 'feature']);
      for (const item of items) {
        const witType = item.adoWorkItemType?.toLowerCase() || item.type;
        if (featureLevelTypes.has(witType)) {
          continue; // Skip feature-level items, already added
        }

        // Find the parent group
        let groupKey: string | undefined;

        if (item.parentId) {
          // Try to find parent in our items
          const parent = itemById.get(item.parentId);
          if (parent) {
            // Find the appropriate ancestor group
            let current: ExternalItem | undefined = parent;
            while (current) {
              const currentType = current.adoWorkItemType?.toLowerCase() || current.type;

              // Check if this ancestor is a Capability (→ epic group)
              if (currentType === 'capability') {
                groupKey = `epic:${current.id}`;
                break;
              }

              // Check if this ancestor is an Epic
              if (currentType === 'epic') {
                // Check if Epic has Capability parent (→ feature group)
                const epicHasCapParent = current.parentId &&
                  capabilityItems.some(cap => cap.id === current!.parentId);

                groupKey = epicHasCapParent
                  ? `feature:${current.id}`
                  : `epic:${current.id}`;
                break;
              }

              // Check if this ancestor is a Feature (→ feature group)
              if (currentType === 'feature') {
                groupKey = `feature:${current.id}`;
                break;
              }

              current = current.parentId ? itemById.get(current.parentId) : undefined;
            }
          } else {
            // Parent NOT in dataset - group by parentId so siblings stay together
            groupKey = `missing-parent:${item.parentId}`;
          }
        }

        // For TRUE orphan items (no parentId at all), create INDIVIDUAL folders
        if (!groupKey) {
          groupKey = `orphan:${item.id}`;
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

    // All groups (including epic groups) need a feature folder for user stories
    // FSIdAllocator is required for feature allocation
    if (!this.fsIdAllocator) {
      throw new Error('FSIdAllocator not initialized');
    }

    // For ADO feature groups, check if it's an Epic with Capability parent
    // If so, include parent reference in the feature folder
    const isAdoFeatureGroup = groupKey.startsWith('feature:');
    const featureLevelTypes = new Set(['capability', 'epic', 'feature']);
    const isFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) &&
      featureLevelTypes.has(firstItem.adoWorkItemType?.toLowerCase() || firstItem.type);

    // CRITICAL (v0.30.3): Determine parent epic for this feature folder
    // - For epic groups: parentEpicId was set above when creating the epic
    // - For feature groups with Capability parent: look up the parent
    if (!parentEpicId) {
      const isEpicWithCapParent = firstItem.adoWorkItemType?.toLowerCase() === 'epic' &&
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
   * CRITICAL FIX (2025-12-01): Prevents duplicate folder creation
   *
   * If ALL items are old (should be archived), the feature folder itself
   * should be created in _archive/ to avoid having an empty FS-XXX/ folder
   * in the main location while all content is in _archive/FS-XXX/
   *
   * @param items - All items in the feature group
   * @returns True if ALL items should be archived
   */
  private shouldArchiveEntireGroup(items: ExternalItem[]): boolean {
    if (items.length === 0) {
      return false;
    }

    // Check if auto-archiving is disabled
    const threshold = this.options.autoArchiveAfterDays;
    if (!threshold || threshold <= 0) {
      return false;
    }

    // ALL items must be old enough to archive the entire group
    return items.every(item => this.shouldAutoArchive(item.createdAt));
  }

  /**
   * Get base directory for specs, handling both 1-level and 2-level structures
   *
   * Structure patterns:
   * - 2-level (JIRA): specs/JIRA-{containerId}/{projectId}/
   * - 2-level (ADO): specs/{containerId}/{projectId}/
   * - 1-level (GitHub): specs/{projectId}/
   * - Legacy: specs/ (no projectId)
   */
  private getBaseDirectory(): string {
    const container = this.options.externalContainer;

    if (container) {
      // 2-level structure for JIRA/ADO
      // JIRA: specs/JIRA-{projectKey}/{boardName}/
      // ADO: specs/{projectName}/{areaPath}/ (no ADO- prefix per user request)
      let containerDirName: string;
      if (container.type === 'jira-project') {
        containerDirName = `JIRA-${normalizeToProjectId(container.containerId)}`;
      } else {
        // ADO: Use project name directly without prefix
        containerDirName = normalizeToProjectId(container.containerId);
      }
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
    const isOrphanGroup = groupKey.startsWith('orphan:');
    const featureLevelTypes = new Set(['capability', 'epic', 'feature']);
    const adoWitType = firstItem.adoWorkItemType?.toLowerCase();
    // CRITICAL FIX (v0.30.3): Include epic groups in feature-level item check
    // Epic groups create feature folders for their user stories, and should use the epic's title
    const isAdoFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) &&
      firstItem.platform === 'ado' &&
      featureLevelTypes.has(adoWitType || firstItem.type);

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

    if (isAdoFeatureLevelItem) {
      // For ADO Capability/Epic/Feature, use the item's actual info
      witTypeLabel = firstItem.adoWorkItemType || 'Feature';
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
    const includeExternalMetadata = isAdoFeatureLevelItem || isOrphanGroup;

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
   *
   * @param createdAt - Item creation date
   * @returns True if item is older than autoArchiveAfterDays threshold
   */
  private shouldAutoArchive(createdAt: Date): boolean {
    const threshold = this.options.autoArchiveAfterDays;

    // Disabled if threshold is 0 or undefined
    if (!threshold || threshold <= 0) {
      return false;
    }

    const ageMs = Date.now() - createdAt.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

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
      return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(item);
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
