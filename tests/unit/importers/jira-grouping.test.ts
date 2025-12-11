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

  describe('Board Mapping from Config', () => {
    it('should use specweaveProject from config when boardId matches', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'PROJ',
                  boards: [
                    { boardId: 123, name: 'Frontend Board', specweaveProject: 'fe' },
                    { boardId: 456, name: 'Backend Board', specweaveProject: 'be' }
                  ]
                }
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraBoardId: 123 })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(1);
      expect(groups[0].projectId).toBe('fe'); // Uses specweaveProject from config
      expect(groups[0].containerId).toBe('PROJ');
      expect(groups[0].containerType).toBe('jira');
    });

    it('should handle multiple boards mapping to different specweaveProjects', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'CORE',
                  boards: [
                    { boardId: 10, name: 'FE Team', specweaveProject: 'frontend-app' },
                    { boardId: 20, name: 'BE Team', specweaveProject: 'backend-api' },
                    { boardId: 30, name: 'Mobile Team', specweaveProject: 'mobile-app' }
                  ]
                }
              }
            }
          }
        }
      });

      const items = [
        createJiraItem({ jiraBoardId: 10, jiraProjectKey: 'CORE' }),
        createJiraItem({ id: 'JIRA-CORE-124', jiraBoardId: 20, jiraProjectKey: 'CORE' }),
        createJiraItem({ id: 'JIRA-CORE-125', jiraBoardId: 30, jiraProjectKey: 'CORE' })
      ];

      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.projectId).sort()).toEqual(['backend-api', 'frontend-app', 'mobile-app']);
    });

    it('should normalize specweaveProject from config (spaces, uppercase)', () => {
      createConfig({
        sync: {
          profiles: {
            'jira-profile': {
              provider: 'jira',
              config: {
                boardMapping: {
                  projectKey: 'PROJ',
                  boards: [
                    { boardId: 123, name: 'Test', specweaveProject: 'Frontend App' } // Has space and uppercase
                  ]
                }
              }
            }
          }
        }
      });

      const items = [createJiraItem({ jiraBoardId: 123 })];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups[0].projectId).toBe('frontend-app'); // Normalized
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

      const items = [
        createJiraItem({ id: 'JIRA-PROJ-1', jiraBoardId: 123 }),
        createJiraItem({ id: 'JIRA-PROJ-2', jiraBoardId: 123 }),
        createJiraItem({ id: 'JIRA-PROJ-3', jiraBoardId: 123 })
      ];
      const groups = groupItemsByExternalContainer(items, tempDir);

      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].projectId).toBe('fe');
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
