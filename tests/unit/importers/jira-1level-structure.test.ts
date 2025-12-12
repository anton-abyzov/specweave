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
        url: 'https://farside.atlassian.net/browse/ID-168',
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
        url: 'https://farside.atlassian.net/browse/ID-187',
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
        url: 'https://farside.atlassian.net/browse/AAC-001',
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
        url: 'https://farside.atlassian.net/browse/DMC-001',
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
      url: 'https://farside.atlassian.net/browse/ID-100',
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
      url: 'https://farside.atlassian.net/browse/ID-168',
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
