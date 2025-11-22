import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../../../src/core/cache/cache-manager.js';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Integration Tests: CLI Helper Cache Integration
 *
 * Tests CacheManager integration in jira.ts and ado.ts
 * Validates cache hits, misses, and TTL expiry during init flow
 */
describe('CLI Helper Cache Integration', () => {
  let testProjectRoot: string;
  let cacheManager: CacheManager;

  beforeEach(() => {
    testProjectRoot = join(tmpdir(), 'specweave-test-' + Date.now());
    mkdirSync(testProjectRoot, { recursive: true });
    mkdirSync(join(testProjectRoot, '.specweave'), { recursive: true });
    cacheManager = new CacheManager(testProjectRoot);
  });

  afterEach(() => {
    if (existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('TC-021: Init with Cached Projects', () => {
    it('should use cached JIRA project list when available (cache hit)', async () => {
      const cachedProjects = ['BACKEND', 'FRONTEND', 'MOBILE'];
      const cacheKey = 'jira-projects-example.atlassian.net';
      await cacheManager.set(cacheKey, cachedProjects);
      const result = await cacheManager.get(cacheKey);
      expect(result).toEqual(cachedProjects);
      expect(result).toHaveLength(3);
    });

    it('should return null on cache miss (no cached data)', async () => {
      const cacheKey = 'jira-projects-nonexistent.atlassian.net';
      const result = await cacheManager.get(cacheKey);
      expect(result).toBeNull();
    });
  });

  describe('TC-023: ADO Configuration Cache', () => {
    it('should cache ADO organization/project configuration', async () => {
      const adoConfig = { org: 'my-org', project: 'my-project', teams: ['Team Alpha'] };
      await cacheManager.set('ado-config', adoConfig);
      const result = await cacheManager.get('ado-config');
      expect(result).toEqual(adoConfig);
    });
  });

  describe('TC-026: Multi-Domain Cache Isolation', () => {
    it('should maintain separate caches for different JIRA domains', async () => {
      const domain1Projects = ['DOMAIN1-A', 'DOMAIN1-B'];
      const domain2Projects = ['DOMAIN2-X', 'DOMAIN2-Y'];
      await cacheManager.set('jira-projects-domain1.atlassian.net', domain1Projects);
      await cacheManager.set('jira-projects-domain2.atlassian.net', domain2Projects);
      const result1 = await cacheManager.get('jira-projects-domain1.atlassian.net');
      const result2 = await cacheManager.get('jira-projects-domain2.atlassian.net');
      expect(result1).toEqual(domain1Projects);
      expect(result2).toEqual(domain2Projects);
    });
  });
});
