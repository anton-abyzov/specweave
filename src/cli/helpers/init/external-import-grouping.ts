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
 * Container group for organizing imported items
 */
export interface ContainerGroup {
  containerId: string;          // JIRA project key or ADO project name
  containerType: 'jira' | 'ado' | null;  // null for GitHub
  projectId: string;            // Area-path-based or normalized project ID
  items: ExternalItem[];
  externalContainer: ExternalContainerContext | undefined;
  parentItem?: ExternalItem;    // Parent Epic/Capability (ADO hierarchy)
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
 * Group items by external container (JIRA project, ADO project/area path)
 * Returns groups with container context for directory structure
 *
 * For ADO items with hierarchy, groups by parent Epic/Capability
 * to ensure each Epic becomes a separate FS-XXX folder.
 *
 * ADO Hierarchy: Capability → Epic → Feature → User Story → Task
 * - Each top-level Epic/Capability becomes its own group (→ FS-XXX folder)
 * - Child User Stories/Tasks are grouped under their parent Epic
 * - Items without parents get their own individual groups
 */
export function groupItemsByExternalContainer(items: ExternalItem[], projectPath?: string): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

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
      const nonAdoGroups = groupNonHierarchyItems(nonAdoItems);
      for (const group of nonAdoGroups) {
        // Avoid key collisions with ADO groups
        const uniqueKey = `other:${group.projectId}`;
        groups.set(uniqueKey, group);
      }
    }

    return Array.from(groups.values());
  }

  // No ADO hierarchy - use original grouping logic for all items
  return groupNonHierarchyItems(items);
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
  // CRITICAL FIX (v0.37.0): Normalize containerId to prevent duplicate folders
  // Bug: "Nova CAD" creates both "Nova CAD/" and "nova-cad/" folders
  // Root cause: containerId used display name, not normalized form
  for (const [parentId, parentItem] of topLevelParents) {
    // CRITICAL: Extract PROJECT name (first segment) from area path and normalize
    // This prevents duplicate folders like "Nova CAD" and "nova-cad"
    let containerId = 'default';
    if (parentItem.adoAreaPath) {
      const segments = parentItem.adoAreaPath.split('\\');
      // First segment is the ADO Project name - normalize it for folder use
      const projectSegment = segments[0];
      containerId = normalizeToProjectId(projectSegment) || 'default';
    } else if (parentItem.adoProjectName) {
      // Fallback: normalize the project display name
      containerId = normalizeToProjectId(parentItem.adoProjectName) || 'default';
    }

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
        containerName: parentItem.adoProjectName || containerId, // Keep original name for display
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
      // CRITICAL FIX (v0.37.0): Normalize containerId to prevent duplicate folders
      let containerId = 'default';
      if (item.adoAreaPath) {
        const segments = item.adoAreaPath.split('\\');
        // First segment is the ADO Project name - normalize it for folder use
        const projectSegment = segments[0];
        containerId = normalizeToProjectId(projectSegment) || 'default';
      } else if (item.adoProjectName) {
        // Fallback: normalize the project display name
        containerId = normalizeToProjectId(item.adoProjectName) || 'default';
      }

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
            containerName: item.adoProjectName || containerId, // Keep original name for display
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
 * Groups by project/area path/repo for directory structure organization
 */
export function groupNonHierarchyItems(items: ExternalItem[]): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  for (const item of items) {
    let groupKey: string;
    let containerType: 'jira' | 'ado' | null = null;
    let containerId: string | undefined;
    let projectId: string;
    let externalContainer: ExternalContainerContext | undefined;

    // JIRA: 1-level structure (Project → SpecWeave Project)
    // CRITICAL FIX (v0.37.0): Normalize containerId to prevent duplicate folders
    // Even though JIRA keys are typically alphanumeric, normalize for safety
    if (item.jiraProjectKey) {
      containerType = 'jira';
      containerId = normalizeToProjectId(item.jiraProjectKey) || '_default';
      projectId = containerId; // Same as containerId for 1-level structure
      groupKey = `jira:${containerId}`;
      externalContainer = undefined;
    }
    // Check for ADO container context (without hierarchy)
    // CRITICAL FIX (v0.37.0): Normalize containerId to prevent duplicate folders
    else if (item.adoProjectName) {
      containerType = 'ado';

      // Normalize containerId from area path first segment or project name
      if (item.adoAreaPath) {
        const segments = item.adoAreaPath.split('\\');
        containerId = normalizeToProjectId(segments[0]) || 'default';
      } else {
        containerId = normalizeToProjectId(item.adoProjectName) || 'default';
      }

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
        containerName: item.adoProjectName, // Keep original name for display
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
