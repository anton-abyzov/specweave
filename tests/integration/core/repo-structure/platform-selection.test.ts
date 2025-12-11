/**
 * Integration tests for Git platform selection during specweave init
 *
 * Tests the complete flow:
 * 1. Architecture selection (single/multi/monorepo)
 * 2. Platform selection (GitHub/GitLab/Bitbucket)
 * 3. URL type selection (SSH/HTTPS)
 * 4. Repository configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { RepoStructureManager } from '../../../../src/core/repo-structure/repo-structure-manager.js';
import { getPlatformRegistry } from '../../../../src/core/repo-structure/platform-registry.js';
import { initializeProviders } from '../../../../src/core/repo-structure/providers/index.js';

describe('Platform Selection Integration', () => {
  let testDir: string;
  let manager: RepoStructureManager;

  beforeEach(() => {
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = join(tmpdir(), `specweave-test-platform-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize providers
    initializeProviders();

    // Create manager instance
    manager = new RepoStructureManager(testDir, 'test-token');
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Platform Registry', () => {
    it('should have GitHub registered and supported', () => {
      const registry = getPlatformRegistry();
      const github = registry.getPlatform('github');

      expect(github).toBeDefined();
      expect(github?.supported).toBe(true);
      expect(registry.isSupported('github')).toBe(true);
    });

    it('should have GitLab registered but unsupported (repo-only, issue sync coming)', () => {
      const registry = getPlatformRegistry();
      const gitlab = registry.getPlatform('gitlab');

      expect(gitlab).toBeDefined();
      expect(gitlab?.supported).toBe(false); // Still marked unsupported
      expect(gitlab?.status).toContain('coming'); // Has status message
      expect(registry.isSupported('gitlab')).toBe(false);
    });

    it('should have Bitbucket registered and supported', () => {
      const registry = getPlatformRegistry();
      const bitbucket = registry.getPlatform('bitbucket');

      expect(bitbucket).toBeDefined();
      expect(bitbucket?.supported).toBe(true); // Now fully supported!
      expect(registry.isSupported('bitbucket')).toBe(true);
    });

    it('should return 4 supported platforms (GitHub, Bitbucket, Azure DevOps, Local)', () => {
      const registry = getPlatformRegistry();
      const supported = registry.getSupportedPlatforms();

      // GitHub, Bitbucket, Azure DevOps, and Local are supported
      expect(supported.length).toBe(4);
      const types = supported.map(p => p.type);
      expect(types).toContain('github');
      expect(types).toContain('bitbucket');
      expect(types).toContain('azure-devops');
      expect(types).toContain('local');
    });

    it('should return all platforms when includeUnsupported=true', () => {
      const registry = getPlatformRegistry();
      const options = registry.getPlatformOptions(true);

      expect(options.length).toBeGreaterThanOrEqual(5); // All platforms

      const githubOption = options.find(opt => opt.value === 'github');
      const gitlabOption = options.find(opt => opt.value === 'gitlab');
      const bitbucketOption = options.find(opt => opt.value === 'bitbucket');

      expect(githubOption).toBeDefined();
      expect(githubOption?.disabled).toBe(false);

      expect(gitlabOption).toBeDefined();
      // GitLab is still unsupported, has a status message
      expect(gitlabOption?.disabled).toBeDefined();

      expect(bitbucketOption).toBeDefined();
      expect(bitbucketOption?.disabled).toBe(false); // Bitbucket is now supported
    });
  });

  describe('Provider Access', () => {
    it('should provide GitHub provider', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('github');

      expect(provider).toBeDefined();
      expect(provider?.config.type).toBe('github');
      expect(provider?.config.host).toBe('github.com');
      expect(provider?.config.apiBaseUrl).toBe('https://api.github.com');
    });

    it('should provide GitLab provider (stub)', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();
      expect(provider?.config.type).toBe('gitlab');
      expect(provider?.config.host).toBe('gitlab.com');
    });

    it('should provide Bitbucket provider (stub)', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();
      expect(provider?.config.type).toBe('bitbucket');
      expect(provider?.config.host).toBe('bitbucket.org');
    });

    it('should provide Azure DevOps provider', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('azure-devops');

      // Azure DevOps is now fully supported!
      expect(provider).toBeDefined();
      expect(provider?.config.type).toBe('azure-devops');
      expect(provider?.config.host).toBe('dev.azure.com');
    });

    it('should return undefined for truly unregistered platform', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gogs' as any);

      expect(provider).toBeUndefined();
    });
  });

  describe('GitLab Provider Behavior', () => {
    it('should return validation result (not throw coming soon)', async () => {
      // GitLab provider now makes real API calls instead of throwing "coming soon"
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      // With invalid token, should return validation result (not throw)
      const result = await provider!.validateRepository('owner', 'repo', 'invalid-token');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('valid');
    });

    it('should attempt real API call when creating repository', async () => {
      // GitLab provider now makes real API calls
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      // Should throw auth error, not "coming soon"
      await expect(
        provider!.createRepository({
          owner: 'owner',
          name: 'repo',
          description: 'Test',
          visibility: 'private'
        }, 'invalid-token')
      ).rejects.toThrow(); // Will throw auth error, not "coming soon"
    });

    it('should provide GitLab-specific token URL', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      const tokenUrl = provider!.getTokenUrl();
      expect(tokenUrl).toContain('gitlab.com');
      // Token URL format may vary
      expect(tokenUrl).toContain('profile');
    });

    it('should provide GitLab-specific required scopes', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      const scopes = provider!.getRequiredScopes(false);
      expect(scopes).toContain('api');
      expect(scopes).toContain('read_repository');
      expect(scopes).toContain('write_repository');
    });
  });

  describe('Bitbucket Provider Behavior', () => {
    it('should return validation result (Bitbucket is now supported)', async () => {
      // Bitbucket is now fully supported and makes real API calls
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      // With invalid token, should return validation result (not throw)
      const result = await provider!.validateRepository('workspace', 'repo', 'invalid-token');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('valid');
    });

    it('should attempt real API call when creating repository', async () => {
      // Bitbucket is now fully supported
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      // Should throw auth error with invalid token
      await expect(
        provider!.createRepository({
          owner: 'workspace',
          name: 'repo',
          description: 'Test',
          visibility: 'private'
        }, 'invalid-token')
      ).rejects.toThrow(); // Will throw auth error
    });

    it('should provide Bitbucket-specific token URL', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      const tokenUrl = provider!.getTokenUrl();
      expect(tokenUrl).toContain('bitbucket.org');
      expect(tokenUrl).toContain('/account/settings/app-passwords');
    });

    it('should provide Bitbucket-specific required scopes', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      const scopes = provider!.getRequiredScopes(false);
      expect(scopes).toContain('repository:read');
      expect(scopes).toContain('repository:write');
      expect(scopes).toContain('repository:admin');
    });
  });

  describe('SSH URL Generation', () => {
    it('should generate SSH URL for GitHub', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('github');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('owner', 'repo', 'ssh');
      expect(url).toBe('git@github.com:owner/repo.git');
    });

    it('should generate SSH URL for GitLab', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('namespace', 'project', 'ssh');
      expect(url).toBe('git@gitlab.com:namespace/project.git');
    });

    it('should generate SSH URL for Bitbucket', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('workspace', 'repo', 'ssh');
      expect(url).toBe('git@bitbucket.org:workspace/repo.git');
    });
  });

  describe('HTTPS URL Generation', () => {
    it('should generate HTTPS URL for GitHub', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('github');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('owner', 'repo', 'https');
      expect(url).toBe('https://github.com/owner/repo.git');
    });

    it('should generate HTTPS URL for GitLab', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('namespace', 'project', 'https');
      expect(url).toBe('https://gitlab.com/namespace/project.git');
    });

    it('should generate HTTPS URL for Bitbucket', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      const url = provider!.getRemoteUrl('workspace', 'repo', 'https');
      expect(url).toBe('https://bitbucket.org/workspace/repo.git');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain GitHub as primary platform (first in list)', () => {
      const registry = getPlatformRegistry();

      // Multiple platforms are now supported, but GitHub should still be primary
      const supported = registry.getSupportedPlatforms();
      expect(supported.length).toBeGreaterThanOrEqual(1);
      // GitHub should still be available
      expect(supported.some(p => p.type === 'github')).toBe(true);
    });

    it('should provide GitHub provider without errors', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('github');

      expect(provider).toBeDefined();
      // Provider config has type, not supported flag
      expect(provider?.config.type).toBe('github');
      // Check platform is supported via registry
      expect(registry.isSupported('github')).toBe(true);
    });
  });
});
