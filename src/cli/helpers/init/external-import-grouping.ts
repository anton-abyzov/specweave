/**
 * External Import Grouping Logic
 *
 * Groups imported items by external container (JIRA project/board, ADO project/area path)
 * for 2-level directory structure support.
 *
 * Extracted from external-import.ts to reduce file size and improve maintainability.
 *
 * @module cli/helpers/init/external-import-grouping
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import type { ExternalItem } from '../../../importers/external-importer.js';
import type { ExternalContainerContext } from '../../../core/types/increment-metadata.js';
import { normalizeToProjectId } from '../../../utils/project-id-generator.js';

/**
 * Load JIRA board mappings from config.json
 * Maps jiraBoardId → normalized specweaveProject
 *
 * CRITICAL FIX (v0.34.7): For project-per-team strategy, ALL boards map to projectKey
 *
 * Config format (project-per-team):
 *   config.boards = [{ id, name }]
 *   config.strategy = "project-per-team"
 *   config.projectKey = "ID"
 *   → ALL boards in profile map to normalized projectKey (e.g., "id")
 */
function loadJiraBoardMappings(projectPath: string): Map<number, string> | undefined {
  const jiraBoardMappings = new Map<number, string>();

  try {
    const configPath = path.join(projectPath, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return undefined;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Extract board mappings from sync.profiles
    if (config.sync?.profiles) {
      for (const profile of Object.values(config.sync.profiles) as any[]) {
        if (profile.provider !== 'jira') continue;

        // project-per-team strategy: ALL boards in profile map to projectKey
        if (profile.config?.boards && profile.config?.projectKey) {
          const projectKey = profile.config.projectKey;
          const normalizedProject = normalizeToProjectId(projectKey);

          for (const board of profile.config.boards) {
            const boardId = typeof board.id === 'string' ? parseInt(board.id, 10) : board.id;
            if (boardId && !isNaN(boardId)) {
              jiraBoardMappings.set(boardId, normalizedProject);
            }
          }
        }
      }
    }

    return jiraBoardMappings.size > 0 ? jiraBoardMappings : undefined;
  } catch (error) {
    // Config parsing failed - log warning but continue with fallback behavior
    console.warn(chalk.yellow(`   ⚠️  Failed to load JIRA board mappings: ${error instanceof Error ? error.message : String(error)}`));
    return undefined;
  }
}

/**
 * Container group for organizing imported items
 */
export interface ContainerGroup {
  containerId: string;          // JIRA project key or ADO project name
  containerType: 'jira' | 'ado' | null;  // null for GitHub
  projectId: string;            // Board-based or area-path-based project ID
  items: ExternalItem[];
  externalContainer: ExternalContainerContext | undefined;
  /** The parent Epic/Capability item for this group (if ADO hierarchy) */
  parentItem?: ExternalItem;
}

/**
 * Group items by their source repository
 * Items without sourceRepo go into '_default' group
 */
export function groupItemsBySourceRepo(items: ExternalItem[]): Map<string, ExternalItem[]> {
  const groups = new Map<string, ExternalItem[]>();

  for (const item of items) {
    // Extract repo name from sourceRepo (e.g., "owner/repo" -> "repo")
    let repoKey = '_default';
    if (item.sourceRepo) {
      // sourceRepo is "owner/repo", we want just "repo"
      const parts = item.sourceRepo.split('/');
      const rawRepoName = parts.length > 1 ? parts[1] : item.sourceRepo;

      // Sanitize repo name to prevent path injection:
      // - Allow only alphanumeric, hyphens, underscores
      // - Trim leading/trailing hyphens
      // - Limit to 100 chars
      repoKey = rawRepoName
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);

      // Fall back to _default if sanitization results in empty string
      if (!repoKey) {
        repoKey = '_default';
      }
    }

    if (!groups.has(repoKey)) {
      groups.set(repoKey, []);
    }
    groups.get(repoKey)!.push(item);
  }

  return groups;
}

/**
 * Group items by external container (JIRA project/board, ADO project/area path)
 * Returns groups with container context for 2-level directory structure
 *
 * CRITICAL FIX (2025-12-01): For ADO items with hierarchy, group by parent Epic/Capability
 * instead of by area path. This ensures each Epic becomes a separate FS-XXX folder.
 *
 * CRITICAL FIX (v0.34.1): Load JIRA board mappings from config for proper 2-level structure
 *
 * ADO Hierarchy: Capability → Epic → Feature → User Story → Task
 * - Each top-level Epic/Capability becomes its own group (→ FS-XXX folder)
 * - Child User Stories/Tasks are grouped under their parent Epic
 * - Items without parents get their own individual groups
 */
export function groupItemsByExternalContainer(items: ExternalItem[], projectPath?: string): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  // CRITICAL FIX (v0.34.1): Load JIRA board mappings from config
  let jiraBoardMappings: Map<number, string> | undefined;
  if (projectPath) {
    jiraBoardMappings = loadJiraBoardMappings(projectPath);
  }

  // Check if we have ADO items with hierarchy
  const adoItems = items.filter(item => item.platform === 'ado' && item.adoProjectName);
  const hasAdoHierarchy = adoItems.some(item => item.parentId || item.type === 'epic');

  // For ADO with hierarchy, use parent-based grouping
  if (hasAdoHierarchy && adoItems.length > 0) {
    const adoGroups = groupAdoItemsByParentHierarchy(adoItems);
    for (const group of adoGroups) {
      groups.set(group.projectId, group);
    }

    // Also process non-ADO items normally
    const nonAdoItems = items.filter(item => item.platform !== 'ado' || !item.adoProjectName);
    if (nonAdoItems.length > 0) {
      const nonAdoGroups = groupNonHierarchyItems(nonAdoItems, jiraBoardMappings);
      for (const group of nonAdoGroups) {
        // Avoid key collisions with ADO groups
        const uniqueKey = `other:${group.projectId}`;
        groups.set(uniqueKey, group);
      }
    }

    return Array.from(groups.values());
  }

  // No ADO hierarchy - use original grouping logic for all items
  return groupNonHierarchyItems(items, jiraBoardMappings);
}

/**
 * Group ADO items by their parent Epic/Capability hierarchy
 * Each top-level Epic/Capability becomes its own FS-XXX folder
 */
export function groupAdoItemsByParentHierarchy(items: ExternalItem[]): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  // Build item lookup map
  const itemById = new Map<string, ExternalItem>();
  for (const item of items) {
    itemById.set(item.id, item);
  }

  // Find feature-level types (these become folder leaders)
  const featureLevelTypes = new Set(['capability', 'epic', 'feature']);

  // Find ALL top-level parents (Epics/Capabilities that are NOT children of other items in our dataset)
  const topLevelParents = new Map<string, ExternalItem>();

  for (const item of items) {
    const witType = item.adoWorkItemType?.toLowerCase() || item.type;
    if (featureLevelTypes.has(witType)) {
      // Check if this item's parent is NOT in our dataset (making it a top-level parent)
      const hasParentInDataset = item.parentId && itemById.has(item.parentId);
      if (!hasParentInDataset) {
        topLevelParents.set(item.id, item);
      }
    }
  }

  // Function to find the top-level parent for an item
  function findTopLevelParent(item: ExternalItem): ExternalItem | undefined {
    // If this item IS a top-level parent, return it
    if (topLevelParents.has(item.id)) {
      return item;
    }

    // Walk up the parent chain
    let current: ExternalItem | undefined = item;
    const visited = new Set<string>();

    while (current && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);

      // Check if parent is a top-level parent
      if (topLevelParents.has(current.parentId)) {
        return topLevelParents.get(current.parentId);
      }

      // Move to parent
      current = itemById.get(current.parentId);
    }

    // No top-level parent found
    return undefined;
  }

  // Create groups for each top-level parent first
  // CRITICAL FIX (v0.30.3): Use area path for projectId, NOT item title
  // This ensures boards like "digital-service-operations" instead of "software-maintenance-..."
  for (const [parentId, parentItem] of topLevelParents) {
    const containerId = parentItem.adoProjectName || 'default';

    // CRITICAL (v0.30.3): projectId MUST come from area path, not title
    // Area path: "Acme\Digital-Service-Operations" → "digital-service-operations"
    let projectId = 'default';
    if (parentItem.adoAreaPath) {
      const segments = parentItem.adoAreaPath.split('\\');
      // Use leaf segment (last part of area path)
      const leafSegment = segments.length > 1 ? segments[segments.length - 1] : segments[0];
      projectId = normalizeToProjectId(leafSegment) || 'default';
    }

    const groupKey = `ado:parent:${parentId}`;

    groups.set(groupKey, {
      containerId,
      containerType: 'ado',
      projectId,
      items: [parentItem], // Parent item goes first
      externalContainer: {
        type: 'ado-project',
        containerId,
        containerName: containerId,
        areaPath: parentItem.adoAreaPath
      },
      parentItem
    });
  }

  // Assign child items to their parent groups
  for (const item of items) {
    // Skip top-level parents (already added)
    if (topLevelParents.has(item.id)) {
      continue;
    }

    // Find the top-level parent
    const topLevelParent = findTopLevelParent(item);

    if (topLevelParent) {
      // Add to parent's group
      const groupKey = `ado:parent:${topLevelParent.id}`;
      const group = groups.get(groupKey);
      if (group) {
        group.items.push(item);
      }
    } else {
      // No parent found - group by area path (2-level structure: project/areaPath)
      // This handles orphan items (User Stories with parents outside our dataset)
      // CRITICAL FIX (2025-12-01): Group by area path, NOT by User Story title
      const containerId = item.adoProjectName || 'default';

      // Extract area path leaf segment for grouping (e.g., "Project\Platform-Engineering" → "platform-engineering")
      let areaFolder = '_default';
      if (item.adoAreaPath) {
        const segments = item.adoAreaPath.split('\\');
        // Use leaf segment, or second segment if only project name
        const leafSegment = segments.length > 1 ? segments[segments.length - 1] : segments[0];
        areaFolder = normalizeToProjectId(leafSegment) || '_default';
      }

      // Group all items without parents by their area path
      // This ensures siblings with same area path stay together
      const groupKey = `ado:area:${containerId}:${areaFolder}`;
      const projectId = areaFolder;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          containerId,
          containerType: 'ado',
          projectId,
          items: [],
          externalContainer: {
            type: 'ado-project',
            containerId,
            containerName: containerId,
            areaPath: item.adoAreaPath
          }
        });
      }
      groups.get(groupKey)!.items.push(item);
    }
  }

  // Log grouping results for diagnostics
  console.log(chalk.cyan(`   📊 ADO Hierarchy Grouping:`));
  console.log(chalk.gray(`      → ${topLevelParents.size} top-level Epics/Capabilities found`));
  for (const [key, group] of groups) {
    const parentInfo = group.parentItem
      ? ` (parent: ${group.parentItem.adoWorkItemType || 'Epic'} "${group.parentItem.title.slice(0, 30)}...")`
      : '';
    console.log(chalk.gray(`      → ${group.projectId}: ${group.items.length} items${parentInfo}`));
  }

  return Array.from(groups.values());
}

/**
 * Group non-hierarchy items (JIRA, GitHub, or ADO without hierarchy)
 * Original grouping logic by project/board/repo
 *
 * CRITICAL FIX (v0.34.1): Load JIRA board mappings from config
 * - Level 1 (project): JIRA projectKey (e.g., "CORE")
 * - Level 2 (board): specweaveProject from boardMapping (e.g., "fe", "be")
 *
 * This respects the structure-level-detector configuration and matches
 * the import-worker.ts grouping logic.
 */
export function groupNonHierarchyItems(items: ExternalItem[], jiraBoardMappings?: Map<number, string>): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  for (const item of items) {
    let groupKey: string;
    let containerType: 'jira' | 'ado' | null = null;
    let containerId: string | undefined;
    let projectId: string;
    let externalContainer: ExternalContainerContext | undefined;

    // Check for JIRA container context
    // CRITICAL FIX (v0.34.1): JIRA 2-level structure using config board mappings
    // - Level 1 (project): JIRA projectKey (e.g., "CORE")
    // - Level 2 (board): specweaveProject from boardMapping (e.g., "fe", "be")
    if (item.jiraProjectKey) {
      containerType = 'jira';
      containerId = item.jiraProjectKey;

      // CRITICAL FIX (v0.34.1): Use specweaveProject from boardMapping (Level 2)
      // Map jiraBoardId → specweaveProject using config
      // Fallback to normalized boardName if mapping not found
      if (item.jiraBoardId && jiraBoardMappings && jiraBoardMappings.has(item.jiraBoardId)) {
        projectId = jiraBoardMappings.get(item.jiraBoardId)!;
      } else if (item.jiraBoardName) {
        projectId = normalizeToProjectId(item.jiraBoardName) || 'default';
      } else {
        projectId = 'default';
      }

      groupKey = `jira:${containerId}:${projectId}`;

      externalContainer = {
        type: 'jira-project',
        containerId: containerId,
        containerName: item.jiraProjectName || containerId,
        boardId: item.jiraBoardId,
        boardName: item.jiraBoardName
      };
    }
    // Check for ADO container context (without hierarchy)
    else if (item.adoProjectName) {
      containerType = 'ado';
      containerId = item.adoProjectName;

      // Project ID from area path (extract last segment) or default
      if (item.adoAreaPath) {
        const areaSegments = item.adoAreaPath.split('\\');
        const lastSegment = areaSegments[areaSegments.length - 1];
        projectId = normalizeToProjectId(lastSegment) || 'default';
      } else {
        projectId = 'default';
      }

      groupKey = `ado:${containerId}:${projectId}`;

      externalContainer = {
        type: 'ado-project',
        containerId: containerId,
        containerName: containerId,
        areaPath: item.adoAreaPath
      };
    }
    // GitHub or default (1-level structure)
    else {
      // Use sourceRepo if available, otherwise '_default'
      if (item.sourceRepo) {
        const parts = item.sourceRepo.split('/');
        const rawRepoName = parts.length > 1 ? parts[1] : item.sourceRepo;
        projectId = normalizeToProjectId(rawRepoName) || '_default';
      } else {
        projectId = '_default';
      }

      groupKey = `gh:${projectId}`;
      // No externalContainer for GitHub (1-level structure)
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        containerId: containerId || projectId,
        containerType,
        projectId,
        items: [],
        externalContainer
      });
    }
    groups.get(groupKey)!.items.push(item);
  }

  return Array.from(groups.values());
}
