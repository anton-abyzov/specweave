/**
 * Hierarchy Mapper
 *
 * Maps external work item types to SpecWeave hierarchy levels.
 *
 * @module importers/item-converter/hierarchy-mapper
 * @since v1.0.115
 */

import type {
  HierarchyMappingConfig,
  SpecWeaveHierarchyLevel,
} from '../../core/types/sync-profile.js';
import {
  DEFAULT_ADO_HIERARCHY_MAPPING,
  DEFAULT_JIRA_HIERARCHY_MAPPING,
  DEFAULT_GITHUB_HIERARCHY_MAPPING,
  DEFAULT_USER_STORY_TYPES,
  DEFAULT_TASK_TYPES,
} from '../../core/types/sync-profile.js';
import type { Platform } from './types.js';

/**
 * Normalize ADO work item type to canonical form
 * ADO returns both singular ('Epic') and plural ('Epics') forms
 * CRITICAL (v0.30.4): Fixes bug where 'Epics' didn't match 'epic'
 *
 * @param witType - Work item type from ADO (e.g., 'Epics', 'Epic', 'Feature')
 * @returns Normalized lowercase singular form (e.g., 'epic', 'feature', 'capability')
 */
export function normalizeAdoWorkItemType(witType: string | undefined): string | undefined {
  if (!witType) return undefined;
  const lower = witType.toLowerCase().trim();

  // Explicit mappings for irregular plurals and known ADO types
  const pluralMappings: Record<string, string> = {
    'epics': 'epic',
    'features': 'feature',
    'capabilities': 'capability',
    'bugs': 'bug',
    'tasks': 'task',
    'user stories': 'user story',
  };

  if (pluralMappings[lower]) {
    return pluralMappings[lower];
  }

  // Fallback: remove trailing 's' for simple plurals
  if (lower.endsWith('s') && lower.length > 1 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }

  return lower;
}

/**
 * Get default hierarchy mapping for a platform
 */
export function getDefaultMapping(platform: Platform): HierarchyMappingConfig {
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
export function typeMatchesArray(normalizedType: string, types: string[]): boolean {
  return types.some(t => t.toLowerCase().trim() === normalizedType);
}

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
 * @param hierarchyMapping - Optional custom hierarchy mapping
 * @returns SpecWeave hierarchy level (epic, feature, user_story, task, skip)
 */
export function getSpecWeaveLevel(
  workItemType: string | undefined,
  platform: Platform = 'ado',
  hierarchyMapping?: HierarchyMappingConfig
): SpecWeaveHierarchyLevel {
  if (!workItemType) {
    return 'skip'; // Unknown types are skipped
  }

  const normalizedType = workItemType.toLowerCase().trim();

  // Get mapping config (user-provided or platform defaults)
  const mapping = hierarchyMapping || getDefaultMapping(platform);

  // 1. Check if type is in epicLevelTypes → 'epic'
  if (typeMatchesArray(normalizedType, mapping.epicLevelTypes)) {
    return 'epic';
  }

  // 2. Check if type is in featureLevelTypes → 'feature'
  if (typeMatchesArray(normalizedType, mapping.featureLevelTypes)) {
    return 'feature';
  }

  // 3. Check if type is in userStoryTypes (or defaults) → 'user_story'
  const userStoryTypes = mapping.userStoryTypes || DEFAULT_USER_STORY_TYPES;
  if (typeMatchesArray(normalizedType, userStoryTypes)) {
    return 'user_story';
  }

  // 4. Check if type is in taskTypes (or defaults) → 'task'
  const taskTypes = mapping.taskTypes || DEFAULT_TASK_TYPES;
  if (typeMatchesArray(normalizedType, taskTypes)) {
    return 'task';
  }

  // 5. Unknown type → skip (don't import)
  return 'skip';
}

/**
 * Check if a work item type is a "container-level" type (epic or feature)
 *
 * Container-level types create folders (EP-* or FS-*), not user story files.
 */
export function isFeatureLevelType(
  workItemType: string | undefined,
  platform: Platform = 'ado',
  hierarchyMapping?: HierarchyMappingConfig
): boolean {
  const level = getSpecWeaveLevel(workItemType, platform, hierarchyMapping);
  return level === 'epic' || level === 'feature';
}

/**
 * Get user-friendly label for JIRA work item type
 */
export function getJiraWorkItemTypeLabel(type: string | undefined): string | undefined {
  if (!type) return undefined;
  const labelMap: Record<string, string> = { 'epic': 'Epic', 'feature': 'Feature' };
  return labelMap[type];
}
