/**
 * Unit tests for FilterProcessor
 *
 * Tests:
 * - Default presets initialization
 * - Custom preset management
 * - Project filtering by type, lead, active status
 * - JQL-based filtering
 *
 * @module tests/unit/integrations/jira/filter-processor.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock JiraClient
const mockJiraClient = {
  getProjects: vi.fn(),
  searchIssues: vi.fn()
};

// Mock credentials manager
vi.mock('../../../../src/core/credentials/credentials-manager.js', () => ({
  credentialsManager: {
    getJiraCredentials: () => ({
      email: 'test@example.com',
      apiToken: 'test-token',
      domain: 'test.atlassian.net'
    })
  }
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  silentLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocking
const { FilterProcessor } = await import('../../../../src/integrations/jira/filter-processor.js');
const { silentLogger } = await import('../../../../src/utils/logger.js');

describe('FilterProcessor', () => {
  let processor: InstanceType<typeof FilterProcessor>;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new FilterProcessor(mockJiraClient as any, { logger: silentLogger });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Default Presets', () => {
    it('should have production preset', () => {
      const preset = processor.getPreset('production');

      expect(preset).toBeDefined();
      expect(preset!.name).toBe('production');
      expect(preset!.filters.active).toBe(true);
      expect(preset!.filters.types).toContain('software');
    });

    it('should have active-only preset', () => {
      const preset = processor.getPreset('active-only');

      expect(preset).toBeDefined();
      expect(preset!.filters.active).toBe(true);
      expect(preset!.filters.excludeArchived).toBe(true);
    });

    it('should have agile-only preset', () => {
      const preset = processor.getPreset('agile-only');

      expect(preset).toBeDefined();
      expect(preset!.filters.types).toContain('software');
      expect(preset!.filters.types).toContain('agile');
    });
  });

  describe('addPreset', () => {
    it('should add custom preset', () => {
      processor.addPreset({
        name: 'custom',
        description: 'Custom filter',
        filters: { active: true, lead: 'john@example.com' }
      });

      const preset = processor.getPreset('custom');

      expect(preset).toBeDefined();
      expect(preset!.filters.lead).toBe('john@example.com');
    });

    it('should override existing preset', () => {
      processor.addPreset({
        name: 'production',
        description: 'Updated production',
        filters: { active: false }
      });

      const preset = processor.getPreset('production');

      expect(preset!.filters.active).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('should return undefined for non-existent preset', () => {
      const preset = processor.getPreset('non-existent');

      expect(preset).toBeUndefined();
    });
  });

  describe('listPresets', () => {
    it('should list all available presets', () => {
      const presets = processor.listPresets();

      expect(presets.map((p: any) => p.name)).toContain('production');
      expect(presets.map((p: any) => p.name)).toContain('active-only');
      expect(presets.map((p: any) => p.name)).toContain('agile-only');
    });
  });

  describe('applyFilters', () => {
    const sampleProjects = [
      { id: '1', key: 'PROJ1', name: 'Project 1', projectTypeKey: 'software', archived: false },
      { id: '2', key: 'PROJ2', name: 'Project 2', projectTypeKey: 'business', archived: false },
      { id: '3', key: 'PROJ3', name: 'Project 3', projectTypeKey: 'software', archived: true },
      { id: '4', key: 'TEST', name: 'Test Project', projectTypeKey: 'software', archived: false }
    ];

    it('should filter by project type', async () => {
      const filtered = await processor.applyFilters(sampleProjects, { types: ['software'] });

      expect(filtered).toHaveLength(3);
      expect(filtered.every((p: any) => p.projectTypeKey === 'software')).toBe(true);
    });

    it('should exclude archived projects', async () => {
      const filtered = await processor.applyFilters(sampleProjects, { excludeArchived: true });

      expect(filtered).toHaveLength(3);
      expect(filtered.every((p: any) => !p.archived)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const filtered = await processor.applyFilters(sampleProjects, {
        types: ['software'],
        excludeArchived: true
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((p: any) => p.projectTypeKey === 'software' && !p.archived)).toBe(true);
    });

    it('should return all projects with no filters', async () => {
      const filtered = await processor.applyFilters(sampleProjects, {});

      expect(filtered).toHaveLength(4);
    });
  });

  describe('filterActive', () => {
    const sampleProjects = [
      { id: '1', key: 'PROJ1', name: 'Active 1', archived: false },
      { id: '2', key: 'PROJ2', name: 'Active 2', archived: false },
      { id: '3', key: 'PROJ3', name: 'Archived', archived: true }
    ];

    it('should return only active projects when activeOnly is true', () => {
      const filtered = processor.filterActive(sampleProjects, true);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((p: any) => !p.archived)).toBe(true);
    });

    it('should return only archived projects when activeOnly is false', () => {
      const filtered = processor.filterActive(sampleProjects, false);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].archived).toBe(true);
    });
  });

  describe('filterByType', () => {
    const sampleProjects = [
      { id: '1', key: 'PROJ1', name: 'Project 1', projectTypeKey: 'software' },
      { id: '2', key: 'PROJ2', name: 'Project 2', projectTypeKey: 'business' },
      { id: '3', key: 'PROJ3', name: 'Project 3', projectTypeKey: 'software' }
    ];

    it('should filter by single type', () => {
      const filtered = processor.filterByType(sampleProjects, ['software']);

      expect(filtered).toHaveLength(2);
    });

    it('should filter by multiple types', () => {
      const filtered = processor.filterByType(sampleProjects, ['software', 'business']);

      expect(filtered).toHaveLength(3);
    });

    it('should be case insensitive', () => {
      const filtered = processor.filterByType(sampleProjects, ['SOFTWARE']);

      expect(filtered).toHaveLength(2);
    });
  });
});
