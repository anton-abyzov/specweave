/**
 * Feature Folder Creator
 *
 * Creates feature folders with FEATURE.md files.
 *
 * @module importers/item-converter/feature-folder-creator
 * @since v1.0.115
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import type { ExternalItem, ItemConverterOptions, Platform } from './types.js';
import { normalizeAdoWorkItemType, isFeatureLevelType, getJiraWorkItemTypeLabel } from './hierarchy-mapper.js';
import { getBaseDirectory } from './path-resolver.js';

export interface FeatureFolderOptions {
  featureId: string;
  firstItem: ExternalItem;
  groupKey: string;
  shouldArchive?: boolean;
  parentEpicId?: string;
  options: ItemConverterOptions;
}

/**
 * Create feature folder with FEATURE.md
 *
 * @returns Feature folder path
 */
export async function createFeatureFolder(opts: FeatureFolderOptions): Promise<string> {
  const { featureId, firstItem, groupKey, shouldArchive = false, parentEpicId, options } = opts;

  // Use 2-level or 1-level structure based on externalContainer
  const baseDir = getBaseDirectory(options);
  const featurePath = shouldArchive
    ? path.join(baseDir, '_archive', featureId)
    : path.join(baseDir, featureId);

  // Create directory
  fs.mkdirSync(featurePath, { recursive: true });

  // Check if this is a feature-level item or orphan
  const isAdoFeatureGroup = groupKey.startsWith('feature:');
  const isEpicGroup = groupKey.startsWith('epic:');
  const isOrphanGroup = groupKey.startsWith('orphan:') || groupKey.startsWith('orphans:');

  // Normalize work item type for consistent lookup
  const adoWitType = normalizeAdoWorkItemType(firstItem.adoWorkItemType);
  const platform: Platform = (firstItem.platform as Platform) || 'ado';

  // Platform-agnostic feature-level detection
  const itemType = platform === 'ado'
    ? (adoWitType || firstItem.type)
    : firstItem.type;
  const isFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) &&
    isFeatureLevelType(itemType, platform, options.hierarchyMapping);

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
    witTypeLabel = firstItem.adoWorkItemType || getJiraWorkItemTypeLabel(firstItem.type) || 'Feature';
    featureTitle = `${witTypeLabel}: ${firstItem.title}`;
    description = firstItem.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel}.`;
    externalLink = `[${witTypeLabel} in ${platformLabel}](${firstItem.url})`;
  } else if (isOrphanGroup) {
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

  // Build parent Epic reference if available
  const hasParentEpic = parentEpicId !== undefined;
  const parentEpicLink = hasParentEpic
    ? `[${parentEpicId}](../../_epics/${parentEpicId}/EPIC.md)`
    : '';

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

/**
 * Create orphans folder with README
 */
export function createOrphansFolder(baseDir: string): void {
  const orphansDir = path.join(baseDir, '_orphans');

  if (fs.existsSync(orphansDir)) {
    return; // Already exists
  }

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
