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
    // Create isolated test directory
    testDir = join(tmpdir(), `specweave-test-${Date.now()}`);
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

    it('should have GitLab registered but unsupported', () => {
      const registry = getPlatformRegistry();
      const gitlab = registry.getPlatform('gitlab');

      expect(gitlab).toBeDefined();
      expect(gitlab?.supported).toBe(false);
      expect(gitlab?.comingSoon).toBeDefined();
      expect(registry.isSupported('gitlab')).toBe(false);
    });

    it('should have Bitbucket registered but unsupported', () => {
      const registry = getPlatformRegistry();
      const bitbucket = registry.getPlatform('bitbucket');

      expect(bitbucket).toBeDefined();
      expect(bitbucket?.supported).toBe(false);
      expect(bitbucket?.comingSoon).toBeDefined();
      expect(registry.isSupported('bitbucket')).toBe(false);
    });

    it('should return only GitHub when filtering for supported platforms', () => {
      const registry = getPlatformRegistry();
      const supported = registry.getSupportedPlatforms();

      expect(supported).toHaveLength(1);
      expect(supported[0].type).toBe('github');
    });

    it('should return all platforms when includeUnsupported=true', () => {
      const registry = getPlatformRegistry();
      const options = registry.getPlatformOptions(true);

      expect(options.length).toBeGreaterThanOrEqual(3);

      const githubOption = options.find(opt => opt.value === 'github');
      const gitlabOption = options.find(opt => opt.value === 'gitlab');
      const bitbucketOption = options.find(opt => opt.value === 'bitbucket');

      expect(githubOption).toBeDefined();
      expect(githubOption?.disabled).toBeUndefined();

      expect(gitlabOption).toBeDefined();
      expect(gitlabOption?.disabled).toBeDefined();
      expect(gitlabOption?.disabled).toContain('Coming soon');

      expect(bitbucketOption).toBeDefined();
      expect(bitbucketOption?.disabled).toBeDefined();
      expect(bitbucketOption?.disabled).toContain('Coming soon');
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

    it('should return undefined for unregistered platform', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('azure-devops' as any);

      expect(provider).toBeUndefined();
    });
  });

  describe('GitLab Provider Behavior', () => {
    it('should throw "coming soon" error when validating repository', async () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      await expect(
        provider!.validateRepository('owner', 'repo', 'token')
      ).rejects.toThrow(/GitLab Support Coming Soon/);
    });

    it('should throw "coming soon" error when creating repository', async () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      await expect(
        provider!.createRepository({
          owner: 'owner',
          name: 'repo',
          description: 'Test',
          visibility: 'private'
        }, 'token')
      ).rejects.toThrow(/GitLab Support Coming Soon/);
    });

    it('should provide GitLab-specific token URL', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('gitlab');

      expect(provider).toBeDefined();

      const tokenUrl = provider!.getTokenUrl();
      expect(tokenUrl).toContain('gitlab.com');
      expect(tokenUrl).toContain('/-/user_settings/personal_access_tokens');
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
    it('should throw "coming soon" error when validating repository', async () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      await expect(
        provider!.validateRepository('workspace', 'repo', 'token')
      ).rejects.toThrow(/Bitbucket Support Coming Soon/);
    });

    it('should throw "coming soon" error when creating repository', async () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('bitbucket');

      expect(provider).toBeDefined();

      await expect(
        provider!.createRepository({
          owner: 'workspace',
          name: 'repo',
          description: 'Test',
          visibility: 'private'
        }, 'token')
      ).rejects.toThrow(/Bitbucket Support Coming Soon/);
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
    it('should maintain GitHub as default platform behavior', () => {
      const registry = getPlatformRegistry();

      // GitHub should be the only supported platform
      const supported = registry.getSupportedPlatforms();
      expect(supported).toHaveLength(1);
      expect(supported[0].type).toBe('github');
    });

    it('should provide GitHub provider without errors', () => {
      const registry = getPlatformRegistry();
      const provider = registry.getProvider('github');

      expect(provider).toBeDefined();
      expect(provider?.config.supported).toBe(true);
    });
  });
});
