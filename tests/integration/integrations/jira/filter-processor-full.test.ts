/**
 * Integration Tests: JIRA Filter Processor (Full Coverage)
 *
 * Comprehensive integration tests for FilterProcessor with all filter types,
 * presets, and edge cases.
 *
 * @group integration
 * @module tests/integration/integrations/jira/filter-processor-full
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterProcessor, type JiraProject } from '../../../../src/integrations/jira/filter-processor.js';
import { JiraClient } from '../../../../src/integrations/jira/jira-client.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// Mock JiraClient
vi.mock('../../../../src/integrations/jira/jira-client.js');

describe('FilterProcessor Integration Tests', () => {
  let filterProcessor: FilterProcessor;
  let mockClient: JiraClient;
  let mockProjects: JiraProject[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = new JiraClient({
      domain: 'test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      instanceType: 'cloud'
    });

    filterProcessor = new FilterProcessor(mockClient, { logger: silentLogger });

    // Create realistic mock project data
    mockProjects = [
      {
        id: '1',
        key: 'BACKEND',
        name: 'Backend Services',
        projectTypeKey: 'software',
        lead: { displayName: 'John Doe', emailAddress: 'john.doe@example.com' },
        archived: false
      },
      {
        id: '2',
        key: 'FRONTEND',
        name: 'Frontend Web',
        projectTypeKey: 'software',
        lead: { displayName: 'Jane Smith', emailAddress: 'jane.smith@example.com' },
        archived: false
      },
      {
        id: '3',
        key: 'MOBILE',
        name: 'Mobile Apps',
        projectTypeKey: 'software',
        lead: { displayName: 'John Doe', emailAddress: 'john.doe@example.com' },
        archived: false
      },
      {
        id: '4',
        key: 'LEGACY',
        name: 'Legacy System',
        projectTypeKey: 'software',
        lead: { displayName: 'Bob Wilson', emailAddress: 'bob.wilson@example.com' },
        archived: true
      },
      {
        id: '5',
        key: 'QA',
        name: 'Quality Assurance',
        projectTypeKey: 'business',
        lead: { displayName: 'Alice Cooper', emailAddress: 'alice.cooper@example.com' },
        archived: false
      },
      {
        id: '6',
        key: 'INFRA',
        name: 'Infrastructure',
        projectTypeKey: 'service_desk',
        lead: { displayName: 'John Doe', emailAddress: 'john.doe@example.com' },
        archived: false
      }
    ];
  });

  describe('Filter: Active Projects', () => {
    it('should filter active projects only', async () => {
      // TC-093: Filter Active Projects
      const result = await filterProcessor.applyFilters(mockProjects, { active: true });

      expect(result).toHaveLength(5);
      expect(result.every(p => !p.archived)).toBe(true);
      expect(result.find(p => p.key === 'LEGACY')).toBeUndefined();
    });

    it('should return archived projects when active=false', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, { active: false });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('LEGACY');
      expect(result[0].archived).toBe(true);
    });

    it('should return all projects when active filter not specified', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {});

      expect(result).toHaveLength(6);
    });
  });

  describe('Filter: Project Type', () => {
    it('should filter by single project type', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        types: ['software']
      });

      expect(result).toHaveLength(4); // BACKEND, FRONTEND, MOBILE, LEGACY (archived but software)
      expect(result.every(p => p.projectTypeKey === 'software')).toBe(true);
    });

    it('should filter by multiple project types', async () => {
      // TC-094: Filter by Multiple Types
      const result = await filterProcessor.applyFilters(mockProjects, {
        types: ['software', 'business']
      });

      expect(result).toHaveLength(5); // All software + QA (business)
      expect(result.find(p => p.key === 'QA')).toBeDefined();
      expect(result.find(p => p.key === 'INFRA')).toBeUndefined();
    });

    it('should return empty array for non-existent type', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        types: ['non-existent']
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('Filter: Project Lead', () => {
    it('should filter by lead email', async () => {
      // TC-095: Filter by Lead Email
      const result = await filterProcessor.applyFilters(mockProjects, {
        lead: 'john.doe@example.com'
      });

      expect(result).toHaveLength(3); // BACKEND, MOBILE, INFRA
      expect(result.every(p => p.lead?.emailAddress === 'john.doe@example.com')).toBe(true);
    });

    it('should filter by lead display name (partial match)', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        lead: 'John Doe'
      });

      expect(result).toHaveLength(3);
      expect(result.every(p => p.lead?.displayName === 'John Doe')).toBe(true);
    });

    it('should return empty array for non-existent lead', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        lead: 'nonexistent@example.com'
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('Filter: Custom JQL', () => {
    it('should filter using JQL query', async () => {
      // TC-096: Custom JQL Filter
      const mockJqlResponse = {
        issues: [
          { fields: { project: { id: '1', key: 'BACKEND', name: 'Backend Services', projectTypeKey: 'software' } } },
          { fields: { project: { id: '2', key: 'FRONTEND', name: 'Frontend Web', projectTypeKey: 'software' } } }
        ]
      };

      vi.spyOn(mockClient, 'searchWithJql').mockResolvedValueOnce(mockJqlResponse);

      const result = await filterProcessor.applyFilters(mockProjects, {
        jql: 'project IN (BACKEND, FRONTEND) AND status != Archived'
      });

      expect(result).toHaveLength(2);
      expect(result.map(p => p.key)).toEqual(['BACKEND', 'FRONTEND']);
      expect(mockClient.searchWithJql).toHaveBeenCalledWith('project IN (BACKEND, FRONTEND) AND status != Archived');
    });

    it('should handle JQL errors gracefully', async () => {
      vi.spyOn(mockClient, 'searchWithJql').mockRejectedValueOnce(new Error('Invalid JQL'));

      await expect(
        filterProcessor.applyFilters(mockProjects, { jql: 'INVALID JQL' })
      ).rejects.toThrow('Invalid JQL query');
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters in sequence', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        active: true,
        types: ['software'],
        lead: 'john.doe@example.com'
      });

      // Active software projects by John Doe: BACKEND, MOBILE
      expect(result).toHaveLength(2);
      expect(result.every(p => !p.archived && p.projectTypeKey === 'software' && p.lead?.emailAddress === 'john.doe@example.com')).toBe(true);
    });

    it('should handle edge case: no projects match all filters', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        active: true,
        types: ['business'],
        lead: 'john.doe@example.com'
      });

      // No active business projects by John Doe
      expect(result).toHaveLength(0);
    });
  });

  describe('Filter Presets', () => {
    it('should apply production preset', async () => {
      const productionPreset = filterProcessor.getPreset('production');
      expect(productionPreset).toBeDefined();

      vi.spyOn(mockClient, 'searchWithJql').mockResolvedValueOnce({
        issues: mockProjects.filter(p => !['TEST', 'SANDBOX', 'DEMO'].includes(p.key)).map(p => ({
          fields: { project: p }
        }))
      });

      const result = await filterProcessor.applyPreset(mockProjects, 'production');

      expect(result.every(p => !p.archived)).toBe(true);
      expect(result.find(p => p.key === 'LEGACY')).toBeUndefined();
    });

    it('should apply active-only preset', async () => {
      const result = await filterProcessor.applyPreset(mockProjects, 'active-only');

      expect(result).toHaveLength(5);
      expect(result.every(p => !p.archived)).toBe(true);
    });

    it('should apply agile-only preset', async () => {
      const result = await filterProcessor.applyPreset(mockProjects, 'agile-only');

      expect(result.every(p => p.projectTypeKey === 'software' || p.projectTypeKey === 'agile')).toBe(true);
    });

    it('should throw error for non-existent preset', async () => {
      await expect(
        filterProcessor.applyPreset(mockProjects, 'non-existent')
      ).rejects.toThrow('Filter preset not found');
    });

    it('should list all available presets', () => {
      const presets = filterProcessor.listPresets();

      expect(presets).toHaveLength(3);
      expect(presets.map(p => p.name)).toEqual(['production', 'active-only', 'agile-only']);
    });
  });

  describe('Filter Preview', () => {
    it('should generate accurate preview summary', async () => {
      // TC-097: Preview Filtered Projects
      const preview = await filterProcessor.previewFilters(mockProjects, {
        active: true,
        types: ['software']
      });

      expect(preview.original).toBe(6);
      expect(preview.filtered).toBe(3); // BACKEND, FRONTEND, MOBILE (active software)
      expect(preview.reduction).toBeGreaterThan(0);
      expect(preview.preview).toContain('3 projects');
      expect(preview.preview).toContain('down from 6');
    });

    it('should show reduction percentage in preview', async () => {
      const preview = await filterProcessor.previewFilters(mockProjects, {
        active: true
      });

      expect(preview.reduction).toBe(17); // 1 archived out of 6 = ~17%
      expect(preview.preview).toContain('17%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project list', async () => {
      const result = await filterProcessor.applyFilters([], { active: true });

      expect(result).toHaveLength(0);
    });

    it('should handle projects without leads', async () => {
      const projectsWithoutLeads: JiraProject[] = [
        { id: '1', key: 'TEST', name: 'Test', projectTypeKey: 'software', archived: false }
      ];

      const result = await filterProcessor.applyFilters(projectsWithoutLeads, {
        lead: 'john.doe@example.com'
      });

      expect(result).toHaveLength(0);
    });

    it('should handle projects without type', async () => {
      const projectsWithoutType: JiraProject[] = [
        { id: '1', key: 'TEST', name: 'Test', archived: false }
      ];

      const result = await filterProcessor.applyFilters(projectsWithoutType, {
        types: ['software']
      });

      expect(result).toHaveLength(0);
    });

    it('should handle case-insensitive lead matching', async () => {
      const result = await filterProcessor.applyFilters(mockProjects, {
        lead: 'JOHN.DOE@EXAMPLE.COM'
      });

      expect(result).toHaveLength(3);
    });
  });
});
