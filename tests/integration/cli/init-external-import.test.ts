/**
 * Integration tests for external import in init command (T-025)
 *
 * Tests the ImportCoordinator integration with external tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportCoordinator } from '../../../src/importers/import-coordinator.js';
import type { CoordinatorConfig } from '../../../src/importers/import-coordinator.js';
import { GitHubImporter } from '../../../src/importers/github-importer.js';
import { JiraImporter } from '../../../src/importers/jira-importer.js';
import { ADOImporter } from '../../../src/importers/ado-importer.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Init Command - External Import Integration (T-025)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImportCoordinator Configuration', () => {
    it('should initialize with GitHub configuration', () => {
      const config: CoordinatorConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        }
      };

      const coordinator = new ImportCoordinator(config);
      expect(coordinator.isPlatformConfigured('github')).toBe(true);
      expect(coordinator.isPlatformConfigured('jira')).toBe(false);
      expect(coordinator.isPlatformConfigured('ado')).toBe(false);
    });

    it('should initialize with JIRA configuration', () => {
      const config: CoordinatorConfig = {
        jira: {
          host: 'https://example.atlassian.net',
          email: 'test@example.com',
          apiToken: 'test-token'
        }
      };

      const coordinator = new ImportCoordinator(config);
      expect(coordinator.isPlatformConfigured('github')).toBe(false);
      expect(coordinator.isPlatformConfigured('jira')).toBe(true);
      expect(coordinator.isPlatformConfigured('ado')).toBe(false);
    });

    it('should initialize with ADO configuration', () => {
      const config: CoordinatorConfig = {
        ado: {
          orgUrl: 'https://dev.azure.com/org',
          project: 'test-project',
          pat: 'test-pat'
        }
      };

      const coordinator = new ImportCoordinator(config);
      expect(coordinator.isPlatformConfigured('github')).toBe(false);
      expect(coordinator.isPlatformConfigured('jira')).toBe(false);
      expect(coordinator.isPlatformConfigured('ado')).toBe(true);
    });

    it('should initialize with multiple platforms', () => {
      const config: CoordinatorConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        },
        jira: {
          host: 'https://example.atlassian.net',
          email: 'test@example.com',
          apiToken: 'test-token'
        },
        ado: {
          orgUrl: 'https://dev.azure.com/org',
          project: 'test-project',
          pat: 'test-pat'
        }
      };

      const coordinator = new ImportCoordinator(config);
      const platforms = coordinator.getConfiguredPlatforms();

      expect(platforms).toContain('github');
      expect(platforms).toContain('jira');
      expect(platforms).toContain('ado');
      expect(platforms.length).toBe(3);
    });

    it('should throw error if no platforms configured', () => {
      expect(() => {
        new ImportCoordinator({});
      }).toThrow('No importers configured');
    });
  });

  describe('ImportCoordinator Parallel Execution', () => {
    it('should import from multiple platforms in parallel', async () => {
      // Mock GitHub response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total_count: 0 })
      });

      // Mock JIRA response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], startAt: 0, maxResults: 50, total: 0 })
      });

      // Mock ADO WIQL response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workItems: [] })
      });

      const config: CoordinatorConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        },
        jira: {
          host: 'https://example.atlassian.net',
          email: 'test@example.com',
          apiToken: 'test-token'
        },
        ado: {
          orgUrl: 'https://dev.azure.com/org',
          project: 'test-project',
          pat: 'test-pat'
        },
        parallel: true
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      expect(result.platforms).toHaveLength(3);
      expect(result.platforms).toContain('github');
      expect(result.platforms).toContain('jira');
      expect(result.platforms).toContain('ado');
    });
  });

  describe('ImportCoordinator Progress Tracking', () => {
    it('should support progress callback configuration', () => {
      // Verify progress callback can be configured
      const progressCallback = vi.fn();

      const config: CoordinatorConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        },
        onProgress: progressCallback
      };

      const coordinator = new ImportCoordinator(config);
      expect(coordinator).toBeDefined();

      // NOTE: Full progress callback testing requires Octokit mocking
      // which is complex. This test verifies the configuration is accepted.
      // Actual callback invocation is tested in unit tests for individual importers.
    });
  });

  describe('ImportCoordinator Error Handling', () => {
    it('should handle failed imports gracefully', async () => {
      // Mock GitHub authentication failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const config: CoordinatorConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'invalid-token'
        }
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      // Should return result with errors
      expect(result.totalCount).toBe(0);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});
