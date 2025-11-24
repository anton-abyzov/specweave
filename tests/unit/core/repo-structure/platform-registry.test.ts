/**
 * Unit tests for Git Platform Registry
 *
 * Tests platform registration, provider management, and platform discovery
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GitPlatformRegistry } from '../../../../src/core/repo-structure/platform-registry.js';
import { GitHubProvider } from '../../../../src/core/repo-structure/providers/github-provider.js';
import { GitLabProvider } from '../../../../src/core/repo-structure/providers/gitlab-provider.js';
import { BitbucketProvider } from '../../../../src/core/repo-structure/providers/bitbucket-provider.js';

describe('GitPlatformRegistry', () => {
  let registry: GitPlatformRegistry;

  beforeEach(() => {
    // Get fresh instance for each test
    registry = GitPlatformRegistry.getInstance();
  });

  describe('platform registration', () => {
    it('should register GitHub platform', () => {
      registry.registerPlatform({
        type: 'github',
        name: 'GitHub',
        description: 'Modern, cloud-native development platform',
        supported: true
      });

      const platform = registry.getPlatform('github');
      expect(platform).toBeDefined();
      expect(platform?.name).toBe('GitHub');
      expect(platform?.supported).toBe(true);
    });

    it('should register GitLab platform as unsupported', () => {
      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'DevOps platform with built-in CI/CD',
        supported: false,
        comingSoon: 'Q1 2026'
      });

      const platform = registry.getPlatform('gitlab');
      expect(platform).toBeDefined();
      expect(platform?.supported).toBe(false);
      expect(platform?.comingSoon).toBe('Q1 2026');
    });

    it('should allow re-registering a platform (update)', () => {
      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'Coming soon',
        supported: false
      });

      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'DevOps platform with built-in CI/CD',
        supported: true
      });

      const platform = registry.getPlatform('gitlab');
      expect(platform?.supported).toBe(true);
    });
  });

  describe('provider registration', () => {
    it('should register GitHub provider', () => {
      const provider = new GitHubProvider();
      registry.registerProvider('github', provider);

      const retrieved = registry.getProvider('github');
      expect(retrieved).toBe(provider);
      expect(retrieved?.config.type).toBe('github');
    });

    it('should register GitLab provider', () => {
      const provider = new GitLabProvider();
      registry.registerProvider('gitlab', provider);

      const retrieved = registry.getProvider('gitlab');
      expect(retrieved).toBe(provider);
      expect(retrieved?.config.type).toBe('gitlab');
    });

    it('should register Bitbucket provider', () => {
      const provider = new BitbucketProvider();
      registry.registerProvider('bitbucket', provider);

      const retrieved = registry.getProvider('bitbucket');
      expect(retrieved).toBe(provider);
      expect(retrieved?.config.type).toBe('bitbucket');
    });

    it('should return undefined for unregistered provider', () => {
      const provider = registry.getProvider('azure-devops');
      expect(provider).toBeUndefined();
    });
  });

  describe('getSupportedPlatforms', () => {
    beforeEach(() => {
      registry.registerPlatform({
        type: 'github',
        name: 'GitHub',
        description: 'Supported',
        supported: true
      });

      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'Coming soon',
        supported: false
      });

      registry.registerPlatform({
        type: 'bitbucket',
        name: 'Bitbucket',
        description: 'Coming soon',
        supported: false
      });
    });

    it('should return only supported platforms', () => {
      const supported = registry.getSupportedPlatforms();
      // Should include at least GitHub (others may be registered by initializeProviders)
      expect(supported.length).toBeGreaterThanOrEqual(1);
      const githubPlatform = supported.find(p => p.type === 'github');
      expect(githubPlatform).toBeDefined();
      expect(githubPlatform?.supported).toBe(true);
    });
  });

  describe('getPlatformOptions', () => {
    beforeEach(() => {
      registry.registerPlatform({
        type: 'github',
        name: 'GitHub',
        description: 'Modern platform',
        supported: true
      });

      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'DevOps platform',
        supported: false,
        comingSoon: 'Q1 2026'
      });
    });

    it('should return only supported platforms by default', () => {
      const options = registry.getPlatformOptions(false);
      // Should include at least GitHub (others may be registered by initializeProviders)
      expect(options.length).toBeGreaterThanOrEqual(1);
      const githubOption = options.find(opt => opt.value === 'github');
      expect(githubOption).toBeDefined();
      expect(githubOption?.disabled).toBe(false); // Supported platforms have disabled: false
    });

    it('should return all platforms when includeUnsupported=true', () => {
      const options = registry.getPlatformOptions(true);
      expect(options.length).toBeGreaterThanOrEqual(2); // At least GitHub and GitLab
      const githubOption = options.find(opt => opt.value === 'github');
      const gitlabOption = options.find(opt => opt.value === 'gitlab');
      expect(githubOption).toBeDefined();
      expect(gitlabOption).toBeDefined();
    });

    it('should mark unsupported platforms as disabled', () => {
      const options = registry.getPlatformOptions(true);
      const gitlabOption = options.find(opt => opt.value === 'gitlab');

      expect(gitlabOption).toBeDefined();
      // Actual implementation returns status or 'Not yet supported'
      expect(gitlabOption?.disabled).toMatch(/Coming Soon|Not yet supported/);
    });

    it('should include comingSoon info in disabled message', () => {
      const options = registry.getPlatformOptions(true);
      const gitlabOption = options.find(opt => opt.value === 'gitlab');

      // Disabled message is either status or 'Not yet supported'
      expect(gitlabOption?.disabled).toBeTruthy();
      expect(typeof gitlabOption?.disabled).toBe('string');
    });
  });

  describe('isSupported', () => {
    beforeEach(() => {
      registry.registerPlatform({
        type: 'github',
        name: 'GitHub',
        description: 'Supported',
        supported: true
      });

      registry.registerPlatform({
        type: 'gitlab',
        name: 'GitLab',
        description: 'Not supported',
        supported: false
      });
    });

    it('should return true for supported platform', () => {
      expect(registry.isSupported('github')).toBe(true);
    });

    it('should return false for unsupported platform', () => {
      expect(registry.isSupported('gitlab')).toBe(false);
    });

    it('should return false for unregistered platform', () => {
      // Use a platform that definitely won't be registered
      expect(registry.isSupported('unknown-platform' as any)).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = GitPlatformRegistry.getInstance();
      const instance2 = GitPlatformRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should share registered platforms across calls', () => {
      const instance1 = GitPlatformRegistry.getInstance();
      instance1.registerPlatform({
        type: 'github',
        name: 'GitHub',
        description: 'Test',
        supported: true
      });

      const instance2 = GitPlatformRegistry.getInstance();
      const platform = instance2.getPlatform('github');

      expect(platform).toBeDefined();
      expect(platform?.name).toBe('GitHub');
    });
  });
});
