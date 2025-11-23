/**
 * Unit tests for GitHub Provider
 *
 * Tests GitHub-specific implementation of GitProvider interface
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubProvider } from '../../../../src/core/repo-structure/providers/github-provider.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHubProvider', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should initialize with default GitHub config', () => {
      expect(provider.config.type).toBe('github');
      expect(provider.config.name).toBe('GitHub');
      expect(provider.config.host).toBe('github.com');
      expect(provider.config.apiBaseUrl).toBe('https://api.github.com');
      expect(provider.config.selfHosted).toBe(false);
    });

    it('should support custom GitHub Enterprise config', () => {
      const customProvider = new GitHubProvider({
        host: 'github.company.com',
        apiBaseUrl: 'https://github.company.com/api/v3',
        selfHosted: true
      });

      expect(customProvider.config.host).toBe('github.company.com');
      expect(customProvider.config.apiBaseUrl).toBe('https://github.company.com/api/v3');
      expect(customProvider.config.selfHosted).toBe(true);
    });
  });

  describe('validateRepository', () => {
    it('should return exists=false when repository does not exist (404)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 404,
        ok: false,
        statusText: 'Not Found'
      });

      const result = await provider.validateRepository('owner', 'repo', 'token');

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token token'
          })
        })
      );
    });

    it('should return exists=true when repository exists (200)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/owner/repo',
          private: true
        })
      });

      const result = await provider.validateRepository('owner', 'repo', 'token');

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.url).toBe('https://github.com/owner/repo');
    });

    it('should handle 401 Unauthorized error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        ok: false,
        statusText: 'Unauthorized'
      });

      const result = await provider.validateRepository('owner', 'repo', 'bad-token');

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Authentication Failed');
    });

    it('should handle 403 Forbidden error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 403,
        ok: false,
        statusText: 'Forbidden'
      });

      const result = await provider.validateRepository('owner', 'repo', 'token');

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Permission Denied');
    });

    it('should work without token (public repos)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/owner/repo'
        })
      });

      const result = await provider.validateRepository('owner', 'repo');

      expect(result.exists).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.anything()
          })
        })
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.validateRepository('owner', 'repo', 'token');

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('validateOwner', () => {
    it('should validate user account', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          type: 'User',
          login: 'username'
        })
      });

      const result = await provider.validateOwner('username', 'token');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('user');
    });

    it('should validate organization account', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          type: 'Organization',
          login: 'myorg'
        })
      });

      const result = await provider.validateOwner('myorg', 'token');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('organization');
    });

    it('should try organization endpoint if user fails', async () => {
      // First call (user) returns 404
      (global.fetch as any).mockResolvedValueOnce({
        status: 404,
        ok: false
      });

      // Second call (org) returns 200
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          type: 'Organization'
        })
      });

      const result = await provider.validateOwner('myorg', 'token');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('organization');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return error when owner not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({ status: 404, ok: false });
      (global.fetch as any).mockResolvedValueOnce({ status: 404, ok: false });

      const result = await provider.validateOwner('nonexistent', 'token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Not Found');
    });
  });

  describe('createRepository', () => {
    it('should create user repository', async () => {
      // Mock isOrganization check (returns false for user)
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'User' })
      });

      // Mock repository creation
      (global.fetch as any).mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/user/repo'
        })
      });

      const url = await provider.createRepository({
        owner: 'user',
        name: 'repo',
        description: 'Test repo',
        visibility: 'private'
      }, 'token');

      expect(url).toBe('https://github.com/user/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"repo"')
        })
      );
    });

    it('should create organization repository', async () => {
      // Mock isOrganization check (returns true for org)
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'Organization' })
      });

      // Mock repository creation
      (global.fetch as any).mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/myorg/repo'
        })
      });

      const url = await provider.createRepository({
        owner: 'myorg',
        name: 'repo',
        description: 'Org repo',
        visibility: 'private'
      }, 'token');

      expect(url).toBe('https://github.com/myorg/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/orgs/myorg/repos',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle "already exists" error gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'User' })
      });

      (global.fetch as any).mockResolvedValueOnce({
        status: 422,
        ok: false,
        json: async () => ({
          errors: [{ message: 'name already exists' }]
        })
      });

      const url = await provider.createRepository({
        owner: 'user',
        name: 'existing-repo',
        description: 'Test',
        visibility: 'private'
      }, 'token');

      // Should return constructed URL even though creation failed
      expect(url).toBe('https://github.com/user/existing-repo');
    });

    it('should throw error for other failures', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'User' })
      });

      (global.fetch as any).mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          message: 'Permission denied'
        })
      });

      await expect(
        provider.createRepository({
          owner: 'user',
          name: 'repo',
          description: 'Test',
          visibility: 'private'
        }, 'token')
      ).rejects.toThrow();
    });
  });

  describe('isOrganization', () => {
    it('should return true for organization account', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'Organization' })
      });

      const result = await provider.isOrganization('myorg', 'token');
      expect(result).toBe(true);
    });

    it('should return false for user account', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ type: 'User' })
      });

      const result = await provider.isOrganization('user', 'token');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.isOrganization('account', 'token');
      expect(result).toBe(false);
    });
  });

  describe('getTokenUrl', () => {
    it('should return GitHub.com token URL by default', () => {
      const url = provider.getTokenUrl();
      expect(url).toBe('https://github.com/settings/tokens/new');
    });

    it('should return custom URL for GitHub Enterprise', () => {
      const customProvider = new GitHubProvider({
        selfHosted: true,
        customDomain: 'github.company.com'
      });

      const url = customProvider.getTokenUrl();
      expect(url).toBe('https://github.company.com/settings/tokens/new');
    });
  });

  describe('getRequiredScopes', () => {
    it('should return repo scope for user', () => {
      const scopes = provider.getRequiredScopes(false);
      expect(scopes).toEqual(['repo']);
    });

    it('should return repo + admin:org scopes for organization', () => {
      const scopes = provider.getRequiredScopes(true);
      expect(scopes).toEqual(['repo', 'admin:org']);
    });
  });

  describe('getRemoteUrl', () => {
    it('should generate SSH URL', () => {
      const url = provider.getRemoteUrl('owner', 'repo', 'ssh');
      expect(url).toBe('git@github.com:owner/repo.git');
    });

    it('should generate HTTPS URL', () => {
      const url = provider.getRemoteUrl('owner', 'repo', 'https');
      expect(url).toBe('https://github.com/owner/repo.git');
    });

    it('should use custom domain for self-hosted', () => {
      const customProvider = new GitHubProvider({
        selfHosted: true,
        customDomain: 'github.enterprise.com'
      });

      const sshUrl = customProvider.getRemoteUrl('corp', 'app', 'ssh');
      expect(sshUrl).toBe('git@github.enterprise.com:corp/app.git');

      const httpsUrl = customProvider.getRemoteUrl('corp', 'app', 'https');
      expect(httpsUrl).toBe('https://github.enterprise.com/corp/app.git');
    });
  });
});
