import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GitHubProjectsV2,
  type ProjectV2Config,
  type ProjectField,
} from '../../../src/sync/projects-v2.js';

// Mock fetch for GraphQL
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('GitHub Projects v2', () => {
  let client: GitHubProjectsV2;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubProjectsV2({
      token: 'test-token',
      owner: 'anton-abyzov',
      repo: 'specweave',
    });
  });

  describe('listProjects', () => {
    it('should list projects for the repository', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              projectsV2: {
                nodes: [
                  { id: 'PVT_1', title: 'Sprint Board', number: 1 },
                  { id: 'PVT_2', title: 'Roadmap', number: 2 },
                ],
              },
            },
          },
        }),
      });

      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].title).toBe('Sprint Board');
    });

    it('should handle empty project list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { repository: { projectsV2: { nodes: [] } } },
        }),
      });

      const projects = await client.listProjects();
      expect(projects).toHaveLength(0);
    });
  });

  describe('getProjectFields', () => {
    it('should return project fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            node: {
              fields: {
                nodes: [
                  { id: 'F1', name: 'Status', dataType: 'SINGLE_SELECT' },
                  { id: 'F2', name: 'Priority', dataType: 'SINGLE_SELECT' },
                  { id: 'F3', name: 'Sprint', dataType: 'ITERATION' },
                ],
              },
            },
          },
        }),
      });

      const fields = await client.getProjectFields('PVT_1');
      expect(fields).toHaveLength(3);
      expect(fields[0].name).toBe('Status');
      expect(fields[1].name).toBe('Priority');
    });
  });

  describe('addIssueToProject', () => {
    it('should add an issue to a project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            addProjectV2ItemById: {
              item: { id: 'PVTI_123' },
            },
          },
        }),
      });

      const itemId = await client.addIssueToProject('I_abc', 'PVT_1');
      expect(itemId).toBe('PVTI_123');
    });
  });

  describe('updateProjectItemField', () => {
    it('should update a project item field value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'PVTI_123' },
            },
          },
        }),
      });

      await expect(
        client.updateProjectItemField('PVT_1', 'PVTI_123', 'F1', { singleSelectOptionId: 'OPT_1' })
      ).resolves.not.toThrow();
    });
  });

  describe('mapFields', () => {
    it('should create a field mapping from config', () => {
      const projectFields: ProjectField[] = [
        { id: 'F1', name: 'Status', dataType: 'SINGLE_SELECT' },
        { id: 'F2', name: 'Priority', dataType: 'SINGLE_SELECT' },
      ];

      const mapping = client.mapFields(
        { status: 'Status', priority: 'Priority' },
        projectFields
      );

      expect(mapping.get('status')).toEqual({ id: 'F1', name: 'Status', dataType: 'SINGLE_SELECT' });
      expect(mapping.get('priority')).toEqual({ id: 'F2', name: 'Priority', dataType: 'SINGLE_SELECT' });
    });

    it('should skip unmatchable fields', () => {
      const projectFields: ProjectField[] = [
        { id: 'F1', name: 'Status', dataType: 'SINGLE_SELECT' },
      ];

      const mapping = client.mapFields(
        { status: 'Status', sprint: 'Sprint' },
        projectFields
      );

      expect(mapping.get('status')).toBeDefined();
      expect(mapping.has('sprint')).toBe(false);
    });
  });
});
