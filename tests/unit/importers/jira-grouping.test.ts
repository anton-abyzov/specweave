/**
 * Unit tests for JIRA import grouping logic
 * Tests board mapping resolution and fallback behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { groupItemsByExternalContainer, groupNonHierarchyItems } from '../../../src/cli/helpers/init/external-import-grouping.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

describe('JIRA Board Mapping Resolution', () => {
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

  const createJiraItem = (overrides: Partial<ExternalItem> = {}): ExternalItem => ({
    id: 'JIRA-PROJ-123',
    type: 'user_story',
    title: 'Test User Story',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    url: 'https://jira.example.com/browse/PROJ-123',
    platform: 'jira',
    jiraProjectKey: 'PROJ',
    jiraProjectName: 'Project Name',
    jiraBoardId: 123,
    jiraBoardName: 'Frontend Board',
    ...overrides
  });

  describe('Board Mapping from Config (project-per-team)', () => {
    it('should use projectKey for all boards in project-per-team strategy', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                projectName: 'Identity',
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

      const items = [createJiraItem({ jiraBoardId: 332, jiraProjectKey: 'ID' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(1);
      expect(groups[0].projectId).toBe('id'); // Uses normalized projectKey
      expect(groups[0].containerId).toBe('ID');
      expect(groups[0].containerType).toBe('jira');
    });

    it('should handle multiple JIRA profiles with different projects', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-aac': {
              provider: 'jira',
              config: {
                projectKey: 'AAC',
                boards: [{ id: '338', name: 'AAC board' }],
                strategy: 'project-per-team'
              }
            },
            'jira-dmc': {
              provider: 'jira',
              config: {
                projectKey: 'DMC',
                boards: [{ id: '334', name: 'DMC board' }],
                strategy: 'project-per-team'
              }
            },
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                boards: [{ id: '332', name: 'ID board' }],
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      const items = [
        createJiraItem({ jiraBoardId: 338, jiraProjectKey: 'AAC' }),
        createJiraItem({ id: 'JIRA-DMC-124', jiraBoardId: 334, jiraProjectKey: 'DMC' }),
        createJiraItem({ id: 'JIRA-ID-125', jiraBoardId: 332, jiraProjectKey: 'ID' })
      ];

      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.projectId).sort()).toEqual(['aac', 'dmc', 'id']);
    });

    it('should normalize projectKey from config (uppercase → lowercase)', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-aac': {
              provider: 'jira',
              config: {
                projectKey: 'AAC',  // Uppercase
                boards: [{ id: '338', name: 'Test Board' }],
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraBoardId: 338, jiraProjectKey: 'AAC' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('aac'); // Normalized to lowercase
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to normalized boardName when boardId not in config', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'PROJ',
                  boards: [
                    { boardId: 999, name: 'Other Board', specweaveProject: 'other' }
                  ]
                }
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraBoardId: 123, jiraBoardName: 'Frontend Board' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('frontend-board'); // Falls back to normalized boardName
    });

    it('should use "default" when no boardId and no boardName', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'PROJ',
                  boards: []
                }
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraBoardId: undefined, jiraBoardName: undefined })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('default');
    });

    it('should handle missing config file gracefully', () => {
      // Don't create config file
      const items = [createJiraItem({ jiraBoardId: 123, jiraBoardName: 'Frontend Board' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('frontend-board'); // Falls back to boardName
    });

    it('should handle corrupted config file gracefully', () => {
      fs.writeFileSync(configPath, 'invalid json{{{');

      const items = [createJiraItem({ jiraBoardId: 123, jiraBoardName: 'Frontend Board' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('frontend-board'); // Falls back to boardName
    });

    it('should handle config without sync.profiles', () => {
      createConfig({
        project: {
          name: 'test-project'
        }
      });

      const items = [createJiraItem({ jiraBoardId: 123, jiraBoardName: 'Frontend Board' })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('frontend-board');
    });
  });

  describe('Direct groupNonHierarchyItems with Mappings', () => {
    it('should accept mappings as parameter', () => {
      const mappings = new Map<number, string>();
      mappings.set(123, 'fe');
      mappings.set(456, 'be');

      const items = [createJiraItem({ jiraBoardId: 123 })];
      const groups = groupNonHierarchyItems(items, mappings);

      expect(groups[0].projectId).toBe('fe');
    });

    it('should work without mappings parameter', () => {
      const items = [createJiraItem({ jiraBoardId: 123, jiraBoardName: 'Frontend Board' })];
      const groups = groupNonHierarchyItems(items, undefined);

      expect(groups[0].projectId).toBe('frontend-board');
    });
  });

  describe('External Container Context', () => {
    it('should populate externalContainer with correct JIRA metadata', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'PROJ',
                  boards: [
                    { boardId: 123, name: 'Frontend Board', specweaveProject: 'fe' }
                  ]
                }
              }
            }
          }
        }
      });

      const items = [createJiraItem({
        jiraBoardId: 123,
        jiraProjectKey: 'PROJ',
        jiraProjectName: 'My Project'
      })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].externalContainer).toEqual({
        type: 'jira-project',
        containerId: 'PROJ',
        containerName: 'My Project',
        boardId: 123,
        boardName: 'Frontend Board'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const groups = groupItemsByExternalContainer([], tempDir);
      expect(groups).toHaveLength(0);
    });

    it('should handle items from same board grouped together', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-id': {
              provider: 'jira',
              config: {
                projectKey: 'ID',
                boards: [{ id: '332', name: 'Identity board' }],
                strategy: 'project-per-team'
              }
            }
          }
        }
      });

      const items = [
        createJiraItem({ id: 'JIRA-ID-1', jiraBoardId: 332, jiraProjectKey: 'ID' }),
        createJiraItem({ id: 'JIRA-ID-2', jiraBoardId: 332, jiraProjectKey: 'ID' }),
        createJiraItem({ id: 'JIRA-ID-3', jiraBoardId: 332, jiraProjectKey: 'ID' })
      ];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].projectId).toBe('id'); // Normalized projectKey
    });

    it('should handle special characters in board names', () => {
      const items = [createJiraItem({
        jiraBoardId: 999,
        jiraBoardName: 'Frontend & Backend (Shared)'
      })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      // Should normalize to valid project ID
      expect(groups[0].projectId).toBe('frontend-backend-shared');
    });
  });
});
