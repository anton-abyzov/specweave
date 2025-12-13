/**
 * Unit tests for JIRA import grouping logic
 *
 * UPDATED (v0.35.3): Tests 1-level structure (Project → SpecWeave Project)
 * Board mapping was removed - JIRA boards are views, not organizational structure!
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { groupItemsByExternalContainer, groupNonHierarchyItems } from '../../../src/cli/helpers/init/external-import-grouping.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

describe('JIRA 1-Level Grouping (v0.35.3+)', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create temporary directory for test config
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    const specweaveDir = path.join(tempDir, '.specweave');
    fs.mkdirSync(specweaveDir, { recursive: true });
    configPath = path.join(specweaveDir, 'config.json');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createConfig = (config: any) => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  };

  // UPDATED: No jiraBoardId/jiraBoardName - 1-level structure!
  const createJiraItem = (overrides: Partial<ExternalItem> = {}): ExternalItem => ({
    id: 'JIRA-PROJ-123',
    type: 'user-story',
    title: 'Test User Story',
    description: 'Test description',
    status: 'open',
    priority: 'P2',
    createdAt: new Date(),
    updatedAt: new Date(),
    url: 'https://jira.example.com/browse/PROJ-123',
    platform: 'jira',
    jiraProjectKey: 'PROJ',
    jiraProjectName: 'Project Name',
    // NOTE: No jiraBoardId/jiraBoardName - removed in v0.35.3!
    ...overrides
  });

  describe('Project-Based Grouping (1-level)', () => {
    it('should use projectKey for grouping (1-level structure)', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                projectName: 'Identity',
                // boards config is ignored in 1-level structure
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraProjectKey: 'ID' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(1);
      expect(groups[0].projectId).toBe('id'); // Normalized projectKey (lowercase)
      expect(groups[0].containerId).toBe('id'); // containerId also normalized to lowercase
      expect(groups[0].containerType).toBe('jira');
    });

    it('should group items by project key, not board', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                boards: [
                  { id: '332', name: 'Identity board' },
                  { id: '401', name: 'Identity Risk Board' }
                ],
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      // Items from different "boards" but same project
      const items = [
        createJiraItem({ id: 'JIRA-ID-1', jiraProjectKey: 'ID' }),
        createJiraItem({ id: 'JIRA-ID-2', jiraProjectKey: 'ID' }),
        createJiraItem({ id: 'JIRA-ID-3', jiraProjectKey: 'ID' })
      ];
      const groups = groupItemsByExternalContainer(items, tempDir);

      // CRITICAL: All in ONE group (1-level), not separated by board
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].projectId).toBe('id');
    });

    it('should handle multiple JIRA projects separately', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-aac': {
              provider: 'jira',
              config: {
                projectKey: 'AAC',
                strategy: 'project-per-team'
              }
            },
            'jira-dmc': {
              provider: 'jira',
              config: {
                projectKey: 'DMC',
                strategy: 'project-per-team'
              }
            },
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      const items = [
        createJiraItem({ jiraProjectKey: 'AAC' }),
        createJiraItem({ id: 'JIRA-DMC-124', jiraProjectKey: 'DMC' }),
        createJiraItem({ id: 'JIRA-ID-125', jiraProjectKey: 'ID' })
      ];

      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.projectId).sort()).toEqual(['aac', 'dmc', 'id']);
    });

    it('should normalize projectKey (uppercase → lowercase)', () => {
      const items = [createJiraItem({ jiraProjectKey: 'AAC' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('aac'); // Normalized to lowercase
    });
  });

  describe('Fallback Behavior', () => {
    it('should use normalized projectKey when no config', () => {
      // No config file
      const items = [createJiraItem({ jiraProjectKey: 'PROJ' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('proj'); // Falls back to projectKey
    });

    it('should use "_default" when no projectKey', () => {
      const items = [createJiraItem({ jiraProjectKey: undefined })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('_default');
    });

    it('should handle missing config file gracefully', () => {
      // Don't create config file
      const items = [createJiraItem({ jiraProjectKey: 'TEST' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('test'); // Uses projectKey
    });

    it('should handle corrupted config file gracefully', () => {
      fs.writeFileSync(configPath, 'invalid json{{{');

      const items = [createJiraItem({ jiraProjectKey: 'TEST' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('test'); // Falls back to projectKey
    });

    it('should handle config without sync.profiles', () => {
      createConfig({
        project: {
          name: 'test-project'
        }
      });

      const items = [createJiraItem({ jiraProjectKey: 'PROJ' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('proj'); // Uses projectKey
    });
  });

  describe('Direct groupNonHierarchyItems', () => {
    it('should group by project key', () => {
      const items = [
        createJiraItem({ id: 'JIRA-ID-1', jiraProjectKey: 'ID' }),
        createJiraItem({ id: 'JIRA-ID-2', jiraProjectKey: 'ID' })
      ];
      const groups = groupNonHierarchyItems(items);

      expect(groups).toHaveLength(1);
      expect(groups[0].projectId).toBe('id');
      expect(groups[0].items).toHaveLength(2);
    });

    it('should separate different projects', () => {
      const items = [
        createJiraItem({ id: 'JIRA-AAC-1', jiraProjectKey: 'AAC' }),
        createJiraItem({ id: 'JIRA-DMC-1', jiraProjectKey: 'DMC' })
      ];
      const groups = groupNonHierarchyItems(items);

      expect(groups).toHaveLength(2);
      expect(groups.map(g => g.projectId).sort()).toEqual(['aac', 'dmc']);
    });
  });

  describe('External Container Context (1-level)', () => {
    it('should NOT populate externalContainer (1-level has no second level)', () => {
      const items = [createJiraItem({
        jiraProjectKey: 'PROJ',
        jiraProjectName: 'My Project'
      })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      // CRITICAL: externalContainer is undefined for 1-level structure
      // It's only used for 2-level structures (ADO area paths)
      expect(groups[0].externalContainer).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const groups = groupItemsByExternalContainer([], tempDir);
      expect(groups).toHaveLength(0);
    });

    it('should handle special characters in project names (uses key, not name)', () => {
      const items = [createJiraItem({
        jiraProjectKey: 'FE',
        jiraProjectName: 'Frontend & Backend (Shared)'  // Name has special chars
      })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      // Uses projectKey (clean), not projectName (has special chars)
      expect(groups[0].projectId).toBe('fe'); // Normalized to lowercase
      expect(groups[0].containerId).toBe('fe'); // containerId also normalized to lowercase
    });

    it('should handle hyphenated project keys', () => {
      const items = [createJiraItem({
        jiraProjectKey: 'MY-PROJECT',
        jiraProjectName: 'My Project'
      })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('my-project'); // Normalized to lowercase
      expect(groups[0].containerId).toBe('my-project'); // containerId also normalized to lowercase
    });
  });
});
