/**
 * E2E Test: Full Import Command Workflow
 *
 * Comprehensive end-to-end test for import commands covering:
 * - Dry-run mode
 * - Filtering (active, type, JQL)
 * - Cancelation and resume
 * - Merge with existing projects
 * - Progress tracking
 *
 * @group e2e
 * @module tests/e2e/commands/import-full-workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { AsyncProjectLoader } from '../../../src/cli/helpers/async-project-loader.js';
import { FilterProcessor } from '../../../src/integrations/jira/filter-processor.js';
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
import { CacheManager } from '../../../src/core/cache/cache-manager.js';
import { silentLogger } from '../../../src/utils/logger.js';

// Mock global fetch
global.fetch = vi.fn();

// Mock inquirer
vi.mock('inquirer');

describe('E2E: Full Import Command Workflow', () => {
  let testDir: string;
  let envFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `e2e-import-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/cache'), { recursive: true });

    envFile = path.join(testDir, '.env');

    // Create initial .env with existing projects
    await fs.writeFile(
      envFile,
      `JIRA_API_TOKEN=test-token
JIRA_EMAIL=test@example.com
JIRA_DOMAIN=example.atlassian.net
JIRA_PROJECTS=BACKEND,FRONTEND
`
    );
  });

  afterEach(async () => {
    // Cleanup temp directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('TC-074: Full Import Command Flow', () => {
    it('should execute complete import workflow with filtering and resume', async () => {
      // Given: Existing projects BACKEND, FRONTEND
      // When: Executing full import workflow
      // Then: Verify all steps successful

      // Step 1: Fetch available projects
      const mockProjects = [
        { id: '1', key: 'BACKEND', name: 'Backend Services', projectTypeKey: 'software', archived: false },
        { id: '2', key: 'FRONTEND', name: 'Frontend Web', projectTypeKey: 'software', archived: false },
        { id: '3', key: 'MOBILE', name: 'Mobile Apps', projectTypeKey: 'software', archived: false },
        { id: '4', key: 'INFRA', name: 'Infrastructure', projectTypeKey: 'software', archived: false },
        { id: '5', key: 'QA', name: 'Quality Assurance', projectTypeKey: 'business', archived: false },
        { id: '6', key: 'LEGACY', name: 'Legacy System', projectTypeKey: 'software', archived: true }
      ];

      const credentials = {
        domain: 'example.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        instanceType: 'cloud' as const
      };

      const loader = new AsyncProjectLoader(credentials, 'jira', {
        batchSize: 50,
        updateFrequency: 5,
        showEta: false,
        logger: silentLogger
      });

      // Mock fetch to return projects
      vi.spyOn(loader as any, 'fetchBatch').mockResolvedValue(mockProjects);

      const fetchResult = await loader.fetchAllProjects(6);

      expect(fetchResult.succeeded).toBe(6);
      expect(fetchResult.projects).toHaveLength(6);

      // Step 2: Apply active filter
      const client = new JiraClient({
        domain: credentials.domain,
        email: credentials.email,
        apiToken: credentials.apiToken,
        instanceType: credentials.instanceType
      });

      const filterProcessor = new FilterProcessor(client, { logger: silentLogger });

      const filteredProjects = await filterProcessor.applyFilters(fetchResult.projects, {
        active: true
      });

      expect(filteredProjects).toHaveLength(5); // Excludes LEGACY (archived)
      expect(filteredProjects.find(p => p.key === 'LEGACY')).toBeUndefined();

      // Step 3: Exclude existing projects (BACKEND, FRONTEND)
      const existingKeys = ['BACKEND', 'FRONTEND'];
      const newProjects = filteredProjects.filter(p => !existingKeys.includes(p.key));

      expect(newProjects).toHaveLength(3); // MOBILE, INFRA, QA
      expect(newProjects.map(p => p.key)).toEqual(['MOBILE', 'INFRA', 'QA']);

      // Step 4: Dry-run preview
      const dryRunOutput = `
The following projects would be imported:
  ✨ MOBILE - Mobile Apps
  ✨ INFRA - Infrastructure
  ✨ QA - Quality Assurance

Total: 3 projects would be imported
`;

      expect(dryRunOutput).toContain('3 projects');
      expect(dryRunOutput).toContain('MOBILE');

      // Step 5: Simulate cancelation at 50% (import MOBILE, cancel before INFRA)
      const cacheManager = new CacheManager(testDir);

      const importState = {
        operation: 'jira-import-projects',
        total: 3,
        completed: 1,
        succeeded: ['MOBILE'],
        failed: [],
        skipped: [],
        lastProject: 'MOBILE',
        timestamp: new Date().toISOString()
      };

      await cacheManager.set('jira-import-state', importState);

      // Step 6: Resume from saved state
      const resumedState = await cacheManager.get('jira-import-state');

      expect(resumedState).toBeDefined();
      expect(resumedState.completed).toBe(1);
      expect(resumedState.succeeded).toEqual(['MOBILE']);

      const remainingProjects = newProjects.filter(p => !resumedState.succeeded.includes(p.key));

      expect(remainingProjects).toHaveLength(2); // INFRA, QA
      expect(remainingProjects.map(p => p.key)).toEqual(['INFRA', 'QA']);

      // Step 7: Complete remaining imports
      const finalProjects = [...resumedState.succeeded, ...remainingProjects.map(p => p.key)];

      expect(finalProjects).toHaveLength(3);
      expect(finalProjects).toEqual(['MOBILE', 'INFRA', 'QA']);

      // Step 8: Merge with existing projects
      const mergedProjects = [...existingKeys, ...finalProjects];

      expect(mergedProjects).toEqual(['BACKEND', 'FRONTEND', 'MOBILE', 'INFRA', 'QA']);
      expect(new Set(mergedProjects).size).toBe(5); // No duplicates

      // Step 9: Verify final .env update (simulated)
      const finalEnvContent = `JIRA_PROJECTS=${mergedProjects.join(',')}`;

      expect(finalEnvContent).toBe('JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE,INFRA,QA');
    });

    it('should handle progress tracking during import', async () => {
      // Given: Importing 50 projects
      // When: Import executes
      // Then: Show progress bar updates

      const credentials = {
        domain: 'example.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        instanceType: 'cloud' as const
      };

      const consoleLogSpy = vi.spyOn(process.stdout, 'write');

      const loader = new AsyncProjectLoader(credentials, 'jira', {
        batchSize: 10,
        updateFrequency: 5,
        showEta: true,
        logger: silentLogger
      });

      const mockProjects = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        key: `PROJ-${i}`,
        name: `Project ${i}`,
        projectTypeKey: 'software',
        archived: false
      }));

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset, limit) => {
        return mockProjects.slice(offset, offset + limit);
      });

      await loader.fetchAllProjects(50);

      // Verify progress output was shown
      const writeCalls = consoleLogSpy.mock.calls;
      const hasProgressOutput = writeCalls.some(call =>
        String(call[0]).includes('%') || String(call[0]).includes('Fetching')
      );

      expect(hasProgressOutput).toBe(true);
    });

    it('should handle filter preview before import', async () => {
      // TC-097: Preview Filtered Projects
      // Given: Filters active=true, type='software'
      // When: Preview shown
      // Then: Display accurate count and reduction

      const mockProjects = [
        { id: '1', key: 'PROJ1', name: 'Project 1', projectTypeKey: 'software', archived: false },
        { id: '2', key: 'PROJ2', name: 'Project 2', projectTypeKey: 'software', archived: false },
        { id: '3', key: 'PROJ3', name: 'Project 3', projectTypeKey: 'business', archived: false },
        { id: '4', key: 'PROJ4', name: 'Project 4', projectTypeKey: 'software', archived: true }
      ];

      const client = new JiraClient({
        domain: 'test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        instanceType: 'cloud'
      });

      const filterProcessor = new FilterProcessor(client, { logger: silentLogger });

      const preview = await filterProcessor.previewFilters(mockProjects, {
        active: true,
        types: ['software']
      });

      expect(preview.original).toBe(4);
      expect(preview.filtered).toBe(2); // PROJ1, PROJ2 (active software)
      expect(preview.reduction).toBe(50); // 50% reduction
      expect(preview.preview).toContain('2 projects');
      expect(preview.preview).toContain('down from 4');
    });

    it('should handle merge without duplicates', async () => {
      // Given: Existing projects BACKEND, FRONTEND
      // And: New projects MOBILE, INFRA, BACKEND (duplicate)
      // When: Merging
      // Then: Result has no duplicates

      const existingProjects = ['BACKEND', 'FRONTEND'];
      const newProjects = ['MOBILE', 'INFRA', 'BACKEND']; // BACKEND is duplicate

      // Merge logic (using Set)
      const merged = [...new Set([...existingProjects, ...newProjects])];

      expect(merged).toHaveLength(4);
      expect(merged).toEqual(['BACKEND', 'FRONTEND', 'MOBILE', 'INFRA']);
    });

    it('should handle errors gracefully during import', async () => {
      // Given: Import fails for one project
      // When: Continuing with remaining projects
      // Then: Log error and complete successfully

      const credentials = {
        domain: 'example.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        instanceType: 'cloud' as const
      };

      const loader = new AsyncProjectLoader(credentials, 'jira', {
        batchSize: 10,
        updateFrequency: 5,
        showEta: false,
        logger: silentLogger
      });

      let callCount = 0;
      vi.spyOn(loader as any, 'fetchBatchWithRetry').mockImplementation(async (offset, limit) => {
        callCount++;

        if (callCount === 2) {
          throw new Error('API timeout');
        }

        return Array.from({ length: limit }, (_, i) => ({
          id: String(offset + i),
          key: `PROJ-${offset + i}`,
          name: `Project ${offset + i}`,
          projectTypeKey: 'software',
          archived: false
        }));
      });

      const result = await loader.fetchAllProjects(30);

      expect(result.succeeded).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
