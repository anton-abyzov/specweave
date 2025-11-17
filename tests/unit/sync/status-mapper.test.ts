import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Status Mapper
 *
 * Tests status mapping between SpecWeave and external tools (GitHub, JIRA, ADO).
 * Following TDD: Tests written first, implementation follows.
 */

import { StatusMapper } from '../../../src/core/sync/status-mapper.js';

describe('StatusMapper', () => {
  const mockConfig = {
    sync: {
      statusSync: {
        enabled: true,
        autoSync: true,
        promptUser: true,
        conflictResolution: 'prompt' as const,
        mappings: {
          github: {
            planning: 'open',
            active: { state: 'open', labels: ['in-progress'] },
            paused: { state: 'open', labels: ['paused'] },
            completed: 'closed',
            abandoned: { state: 'closed', labels: ['wontfix'] }
          },
          jira: {
            planning: 'To Do',
            active: 'In Progress',
            paused: 'On Hold',
            completed: 'Done',
            abandoned: 'Cancelled'
          },
          ado: {
            planning: 'New',
            active: 'Active',
            paused: 'On Hold',
            completed: 'Closed',
            abandoned: 'Removed'
          }
        }
      }
    }
  };

  let mapper: StatusMapper;

  beforeEach(() => {
    mapper = new StatusMapper(mockConfig as any);
  });

  describe('mapToExternal', () => {
    it('should map simple string status to external tool', () => {
      const result = mapper.mapToExternal('planning', 'github');
      expect(result.state).toBe('open');
      expect(result.labels).toBeUndefined();
    });

    it('should map complex status with labels (GitHub)', () => {
      const result = mapper.mapToExternal('active', 'github');
      expect(result.state).toBe('open');
      expect(result.labels).toEqual(['in-progress']);
    });

    it('should map paused status with labels', () => {
      const result = mapper.mapToExternal('paused', 'github');
      expect(result.state).toBe('open');
      expect(result.labels).toEqual(['paused']);
    });

    it('should map completed status to closed', () => {
      const result = mapper.mapToExternal('completed', 'github');
      expect(result.state).toBe('closed');
    });

    it('should map abandoned status with wontfix label', () => {
      const result = mapper.mapToExternal('abandoned', 'github');
      expect(result.state).toBe('closed');
      expect(result.labels).toEqual(['wontfix']);
    });

    it('should map JIRA statuses', () => {
      expect(mapper.mapToExternal('planning', 'jira').state).toBe('To Do');
      expect(mapper.mapToExternal('active', 'jira').state).toBe('In Progress');
      expect(mapper.mapToExternal('paused', 'jira').state).toBe('On Hold');
      expect(mapper.mapToExternal('completed', 'jira').state).toBe('Done');
      expect(mapper.mapToExternal('abandoned', 'jira').state).toBe('Cancelled');
    });

    it('should map ADO statuses', () => {
      expect(mapper.mapToExternal('planning', 'ado').state).toBe('New');
      expect(mapper.mapToExternal('active', 'ado').state).toBe('Active');
      expect(mapper.mapToExternal('completed', 'ado').state).toBe('Closed');
    });

    it('should throw error for unmapped status', () => {
      expect(() => mapper.mapToExternal('invalid-status', 'github')).toThrow(
        'No mapping for status "invalid-status" in github'
      );
    });

    it('should throw error for unconfigured tool', () => {
      const mapperWithoutJira = new StatusMapper({
        sync: {
          statusSync: {
            enabled: true,
            mappings: {
              github: mockConfig.sync.statusSync.mappings.github
            }
          }
        }
      } as any);

      expect(() => mapperWithoutJira.mapToExternal('active', 'jira')).toThrow(
        'No status mappings configured for jira'
      );
    });
  });

  describe('mapFromExternal', () => {
    it('should reverse map GitHub open to planning', () => {
      const result = mapper.mapFromExternal('open', 'github');
      expect(result).toBe('planning'); // First match (simple mapping)
    });

    it('should reverse map GitHub closed to completed', () => {
      const result = mapper.mapFromExternal('closed', 'github');
      expect(result).toBe('completed'); // First match
    });

    it('should reverse map JIRA statuses', () => {
      expect(mapper.mapFromExternal('To Do', 'jira')).toBe('planning');
      expect(mapper.mapFromExternal('In Progress', 'jira')).toBe('active');
      expect(mapper.mapFromExternal('On Hold', 'jira')).toBe('paused');
      expect(mapper.mapFromExternal('Done', 'jira')).toBe('completed');
      expect(mapper.mapFromExternal('Cancelled', 'jira')).toBe('abandoned');
    });

    it('should return null for unknown external status', () => {
      const result = mapper.mapFromExternal('Unknown Status', 'github');
      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate complete configuration', () => {
      const validation = mapper.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing tool mappings', () => {
      const incompleteMapper = new StatusMapper({
        sync: {
          statusSync: {
            enabled: true,
            mappings: {
              github: mockConfig.sync.statusSync.mappings.github
            }
          }
        }
      } as any);

      const validation = incompleteMapper.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No mappings configured for jira');
      expect(validation.errors).toContain('No mappings configured for ado');
    });

    it('should detect missing status mappings', () => {
      const incompleteMapper = new StatusMapper({
        sync: {
          statusSync: {
            enabled: true,
            mappings: {
              github: {
                planning: 'open',
                active: 'open'
                // Missing: paused, completed, abandoned
              },
              jira: mockConfig.sync.statusSync.mappings.jira,
              ado: mockConfig.sync.statusSync.mappings.ado
            }
          }
        }
      } as any);

      const validation = incompleteMapper.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing mapping for "paused" in github');
      expect(validation.errors).toContain('Missing mapping for "completed" in github');
      expect(validation.errors).toContain('Missing mapping for "abandoned" in github');
    });

    it('should list all validation errors', () => {
      const emptyMapper = new StatusMapper({
        sync: {
          statusSync: {
            enabled: true,
            mappings: {}
          }
        }
      } as any);

      const validation = emptyMapper.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBe(3); // 3 tools (no mappings configured)
      expect(validation.errors).toContain('No mappings configured for github');
      expect(validation.errors).toContain('No mappings configured for jira');
      expect(validation.errors).toContain('No mappings configured for ado');
    });
  });

  describe('getRequiredStatuses', () => {
    it('should return all required SpecWeave statuses', () => {
      const statuses = mapper.getRequiredStatuses();
      expect(statuses).toEqual(['planning', 'active', 'paused', 'completed', 'abandoned']);
    });
  });

  describe('getSupportedTools', () => {
    it('should return all supported external tools', () => {
      const tools = mapper.getSupportedTools();
      expect(tools).toEqual(['github', 'jira', 'ado']);
    });
  });
});
