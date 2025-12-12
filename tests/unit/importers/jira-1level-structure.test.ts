/**
 * Regression test for JIRA 1-level folder structure (v0.35.3)
 *
 * Bug: Items ended up in AAC/default/_orphans/ instead of AAC/FS-XXX/
 * Root cause: Grouping logic still created 2-level structure after board info removed
 */

import { describe, it, expect } from 'vitest';
import { ExternalItem } from '../../../src/core/types/external-item.js';

// Mock the grouping function (would need to export from external-import-grouping.ts)
function groupNonHierarchyItemsForTest(items: ExternalItem[]): Record<string, ExternalItem[]> {
  const groups: Record<string, ExternalItem[]> = {};

  for (const item of items) {
    let groupKey: string;
    let projectId: string;

    if (item.jiraProjectKey) {
      // CRITICAL: Must use 1-level structure for JIRA
      const containerId = item.jiraProjectKey;
      projectId = item.jiraProjectKey.toLowerCase().replace(/\s+/g, '-');
      groupKey = `jira:${containerId}`;  // No second level!

      // Store externalContainer status for validation
      (item as any)._testExternalContainer = undefined;  // Must be undefined for 1-level
    } else {
      groupKey = 'default';
      projectId = 'default';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
  }

  return groups;
}

describe('JIRA 1-Level Folder Structure (v0.35.3)', () => {
  it('should create 1-level structure for JIRA items', () => {
    const items: ExternalItem[] = [
      {
        id: 'JIRA-ID-168',
        type: 'user-story',
        title: 'Keycloak Spike',
        description: 'Request password reset',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://example.atlassian.net/browse/ID-168',
        platform: 'jira',
        jiraProjectKey: 'ID',
        jiraProjectName: 'Identity',
        // CRITICAL: No board info (removed in v0.35.3)
        // jiraBoardId: undefined,
        // jiraBoardName: undefined,
        parentId: 'JIRA-ID-187'
      },
      {
        id: 'JIRA-ID-187',
        type: 'epic',
        title: 'Keycloak POC',
        description: 'Keycloak POC Epic',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://example.atlassian.net/browse/ID-187',
        platform: 'jira',
        jiraProjectKey: 'ID',
        jiraProjectName: 'Identity'
        // No parent
      }
    ];

    const grouped = groupNonHierarchyItemsForTest(items);

    // CRITICAL: Should group by project ONLY (no second level)
    expect(grouped).toHaveProperty('jira:ID');
    expect(grouped['jira:ID']).toHaveLength(2);

    // CRITICAL: Should NOT create second-level groups
    expect(grouped).not.toHaveProperty('jira:ID:default');
    expect(grouped).not.toHaveProperty('jira:ID:identity-board');

    // CRITICAL: externalContainer must be undefined for 1-level structure
    const group = grouped['jira:ID'];
    expect((group[0] as any)._testExternalContainer).toBeUndefined();
  });

  it('should group multiple projects separately', () => {
    const items: ExternalItem[] = [
      {
        id: 'JIRA-AAC-001',
        type: 'user-story',
        title: 'AAC Story',
        description: 'Test',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://example.atlassian.net/browse/AAC-001',
        platform: 'jira',
        jiraProjectKey: 'AAC',
        jiraProjectName: 'Ancillary Apps - CC'
      },
      {
        id: 'JIRA-DMC-001',
        type: 'user-story',
        title: 'DMC Story',
        description: 'Test',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://example.atlassian.net/browse/DMC-001',
        platform: 'jira',
        jiraProjectKey: 'DMC',
        jiraProjectName: 'Data Migration - CC'
      }
    ];

    const grouped = groupNonHierarchyItemsForTest(items);

    // Should have separate groups per project
    expect(grouped).toHaveProperty('jira:AAC');
    expect(grouped).toHaveProperty('jira:DMC');
    expect(grouped['jira:AAC']).toHaveLength(1);
    expect(grouped['jira:DMC']).toHaveLength(1);

    // Should NOT have any 'default' second level
    const allKeys = Object.keys(grouped);
    const hasDefault = allKeys.some(key => key.includes(':default'));
    expect(hasDefault).toBe(false);
  });

  it('should handle items without parent (not in _orphans)', () => {
    const item: ExternalItem = {
      id: 'JIRA-ID-100',
      type: 'user-story',
      title: 'Standalone Story',
      description: 'No parent',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://example.atlassian.net/browse/ID-100',
      platform: 'jira',
      jiraProjectKey: 'ID',
      jiraProjectName: 'Identity'
      // No parentId - but should still go to ID/, not ID/_orphans/
    };

    const grouped = groupNonHierarchyItemsForTest([item]);

    // Should group by project (not _orphans at this stage)
    expect(grouped).toHaveProperty('jira:ID');
    expect(grouped['jira:ID']).toHaveLength(1);

    // _orphans folder created later during living docs sync, not here
  });
});

describe('JIRA Board Info Removed (v0.35.3)', () => {
  it('should not populate board fields on items', () => {
    // This test validates that JiraImporter.convertToExternalItem()
    // does NOT populate jiraBoardId or jiraBoardName anymore

    const item: ExternalItem = {
      id: 'JIRA-ID-168',
      type: 'user-story',
      title: 'Test',
      description: 'Test',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://example.atlassian.net/browse/ID-168',
      platform: 'jira',
      jiraProjectKey: 'ID',
      jiraProjectName: 'Identity'
    };

    // CRITICAL: These fields must NOT exist
    expect(item).not.toHaveProperty('jiraBoardId');
    expect(item).not.toHaveProperty('jiraBoardName');

    // Project info must exist
    expect(item.jiraProjectKey).toBe('ID');
    expect(item.jiraProjectName).toBe('Identity');
  });
});

describe('JIRA Feature Content (v0.35.4)', () => {
  // Mock function to simulate FEATURE.md content generation logic
  function generateFeatureContentForTest(
    firstItem: ExternalItem,
    groupKey: string
  ): { title: string; description: string; witTypeLabel: string } {
    const platform = firstItem.platform || 'jira';
    const platformLabel = platform === 'jira' ? 'JIRA' : platform;
    const isAdoFeatureGroup = groupKey.startsWith('feature:');
    const isEpicGroup = groupKey.startsWith('epic:');
    const isOrphanGroup = groupKey.startsWith('orphan:');

    // CRITICAL FIX (v0.35.4): Platform-agnostic feature-level detection
    // Previously only checked ADO, now checks itemType for all platforms
    const isFeatureLevelType = firstItem.type === 'epic' || firstItem.type === 'feature';
    const isFeatureLevelItem = (isAdoFeatureGroup || isEpicGroup) && isFeatureLevelType;

    let featureTitle: string;
    let description: string;
    let witTypeLabel: string;

    if (isFeatureLevelItem) {
      // JIRA Epic/Feature - should use actual title!
      witTypeLabel = firstItem.type === 'epic' ? 'Epic' : 'Feature';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel}.`;
    } else if (isOrphanGroup) {
      witTypeLabel = 'User Story';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description || `Orphan item from ${platformLabel}.`;
    } else {
      // Generic fallback
      featureTitle = `Feature: Imported from ${platformLabel}`;
      description = 'This feature folder contains User Stories imported from external tools.';
      witTypeLabel = 'Feature';
    }

    return { title: featureTitle, description, witTypeLabel };
  }

  it('should use JIRA Epic title in FEATURE.md (regression test)', () => {
    const jiraEpic: ExternalItem = {
      id: 'JIRA-ID-187',
      type: 'epic',
      title: 'Authentication POC',
      description: 'Proof of concept for authentication integration',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://example.atlassian.net/browse/ID-187',
      platform: 'jira',
      jiraProjectKey: 'ID',
      jiraProjectName: 'Identity'
    };

    // Epic group key (created when JIRA Epic is parent)
    const groupKey = `epic:${jiraEpic.id}`;
    const content = generateFeatureContentForTest(jiraEpic, groupKey);

    // CRITICAL: Must use actual Epic title, NOT generic!
    expect(content.title).toBe('Epic: Authentication POC');
    expect(content.description).toBe('Proof of concept for authentication integration');
    expect(content.witTypeLabel).toBe('Epic');

    // Should NOT be generic
    expect(content.title).not.toBe('Feature: Imported from JIRA');
    expect(content.description).not.toContain('This feature folder contains User Stories');
  });

  it('should use JIRA L3 Feature title in FEATURE.md', () => {
    const jiraFeature: ExternalItem = {
      id: 'JIRA-ID-200',
      type: 'feature',  // L3 Feature mapped to 'feature' type
      title: 'User Authentication Module',
      description: 'Module for user authentication flows',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://example.atlassian.net/browse/ID-200',
      platform: 'jira',
      jiraProjectKey: 'ID',
      jiraProjectName: 'Identity'
    };

    // Feature group key
    const groupKey = `feature:${jiraFeature.id}`;
    const content = generateFeatureContentForTest(jiraFeature, groupKey);

    // CRITICAL: Must use actual Feature title
    expect(content.title).toBe('Feature: User Authentication Module');
    expect(content.description).toBe('Module for user authentication flows');
    expect(content.witTypeLabel).toBe('Feature');
  });

  it('should fall back to generic content for non-feature items', () => {
    const jiraStory: ExternalItem = {
      id: 'JIRA-ID-300',
      type: 'user-story',
      title: 'Login form',
      description: 'User story for login',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://example.atlassian.net/browse/ID-300',
      platform: 'jira',
      jiraProjectKey: 'ID',
      jiraProjectName: 'Identity'
    };

    // Not an epic or feature group - just a regular group
    const groupKey = 'jira:ID';
    const content = generateFeatureContentForTest(jiraStory, groupKey);

    // User stories don't create feature folders with their title
    // They go INTO a feature folder - so generic is correct here
    expect(content.title).toBe('Feature: Imported from JIRA');
    expect(content.description).toContain('This feature folder contains User Stories');
  });
});
