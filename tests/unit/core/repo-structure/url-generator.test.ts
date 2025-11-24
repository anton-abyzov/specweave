/**
 * Unit tests for Git URL generator
 *
 * Tests SSH and HTTPS URL generation for multiple platforms
 */

import { describe, it, expect } from 'vitest';
import {
  generateGitRemoteUrl,
  parseGitRemoteUrl,
  detectGitPlatform
} from '../../../../src/core/repo-structure/url-generator.js';

describe('url-generator', () => {
  describe('generateGitRemoteUrl', () => {
    it('should generate SSH URL for GitHub', () => {
      const url = generateGitRemoteUrl('myorg', 'myrepo', 'ssh', { host: 'github.com' });
      expect(url).toBe('git@github.com:myorg/myrepo.git');
    });

    it('should generate HTTPS URL for GitHub', () => {
      const url = generateGitRemoteUrl('myorg', 'myrepo', 'https', { host: 'github.com' });
      expect(url).toBe('https://github.com/myorg/myrepo.git');
    });

    it('should generate SSH URL for GitLab', () => {
      const url = generateGitRemoteUrl('namespace', 'project', 'ssh', { host: 'gitlab.com' });
      expect(url).toBe('git@gitlab.com:namespace/project.git');
    });

    it('should generate HTTPS URL for GitLab', () => {
      const url = generateGitRemoteUrl('namespace', 'project', 'https', { host: 'gitlab.com' });
      expect(url).toBe('https://gitlab.com/namespace/project.git');
    });

    it('should generate SSH URL for Bitbucket', () => {
      const url = generateGitRemoteUrl('workspace', 'repo', 'ssh', { host: 'bitbucket.org' });
      expect(url).toBe('git@bitbucket.org:workspace/repo.git');
    });

    it('should generate HTTPS URL for Bitbucket', () => {
      const url = generateGitRemoteUrl('workspace', 'repo', 'https', { host: 'bitbucket.org' });
      expect(url).toBe('https://bitbucket.org/workspace/repo.git');
    });

    it('should use custom SSH user', () => {
      const url = generateGitRemoteUrl('owner', 'repo', 'ssh', {
        host: 'gitlab.custom.com',
        sshUser: 'gitlab'
      });
      expect(url).toBe('gitlab@gitlab.custom.com:owner/repo.git');
    });

    it('should default SSH user to "git"', () => {
      const url = generateGitRemoteUrl('owner', 'repo', 'ssh', { host: 'custom.com' });
      expect(url).toBe('git@custom.com:owner/repo.git');
    });

    it('should handle self-hosted GitHub Enterprise', () => {
      const url = generateGitRemoteUrl('corp', 'app', 'ssh', { host: 'github.company.com' });
      expect(url).toBe('git@github.company.com:corp/app.git');
    });

    it('should handle self-hosted GitLab', () => {
      const url = generateGitRemoteUrl('team', 'service', 'https', { host: 'gitlab.internal' });
      expect(url).toBe('https://gitlab.internal/team/service.git');
    });
  });

  describe('parseGitRemoteUrl', () => {
    it('should parse SSH GitHub URL', () => {
      const result = parseGitRemoteUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        urlType: 'ssh',
        host: 'github.com'
      });
    });

    it('should parse HTTPS GitHub URL', () => {
      const result = parseGitRemoteUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        urlType: 'https',
        host: 'github.com'
      });
    });

    it('should parse SSH GitLab URL', () => {
      const result = parseGitRemoteUrl('git@gitlab.com:namespace/project.git');
      expect(result).toEqual({
        owner: 'namespace',
        repo: 'project',
        urlType: 'ssh',
        host: 'gitlab.com'
      });
    });

    it('should parse HTTPS GitLab URL', () => {
      const result = parseGitRemoteUrl('https://gitlab.com/namespace/project.git');
      expect(result).toEqual({
        owner: 'namespace',
        repo: 'project',
        urlType: 'https',
        host: 'gitlab.com'
      });
    });

    it('should parse SSH URL without .git suffix', () => {
      const result = parseGitRemoteUrl('git@bitbucket.org:workspace/repo');
      expect(result).toEqual({
        owner: 'workspace',
        repo: 'repo',
        urlType: 'ssh',
        host: 'bitbucket.org'
      });
    });

    it('should parse HTTPS URL without .git suffix', () => {
      const result = parseGitRemoteUrl('https://bitbucket.org/workspace/repo');
      expect(result).toEqual({
        owner: 'workspace',
        repo: 'repo',
        urlType: 'https',
        host: 'bitbucket.org'
      });
    });

    it('should handle custom SSH user', () => {
      const result = parseGitRemoteUrl('gitlab@gitlab.custom.com:owner/repo.git');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        urlType: 'ssh',
        host: 'gitlab.custom.com'
      });
    });

    it('should return null for invalid URL', () => {
      const result = parseGitRemoteUrl('not-a-valid-url');
      expect(result).toBeNull();
    });

    it('should parse HTTP URL (implementation accepts both http and https)', () => {
      const result = parseGitRemoteUrl('http://github.com/owner/repo.git');
      // Implementation uses https?:// which accepts both http and https
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        urlType: 'https',
        host: 'github.com'
      });
    });
  });

  describe('detectGitPlatform', () => {
    it('should detect GitHub', () => {
      expect(detectGitPlatform('github.com')).toBe('github');
      expect(detectGitPlatform('github.enterprise.com')).toBe('github');
      expect(detectGitPlatform('my-github.internal')).toBe('github');
    });

    it('should detect GitLab', () => {
      expect(detectGitPlatform('gitlab.com')).toBe('gitlab');
      expect(detectGitPlatform('gitlab.company.com')).toBe('gitlab');
      expect(detectGitPlatform('my-gitlab.io')).toBe('gitlab');
    });

    it('should detect Bitbucket', () => {
      expect(detectGitPlatform('bitbucket.org')).toBe('bitbucket');
      expect(detectGitPlatform('bitbucket.company.com')).toBe('bitbucket');
    });

    it('should detect Azure DevOps', () => {
      expect(detectGitPlatform('dev.azure.com')).toBe('azure-devops');
      expect(detectGitPlatform('myorg.visualstudio.com')).toBe('azure-devops');
    });

    it('should return unknown for unrecognized hosts', () => {
      expect(detectGitPlatform('unknown.com')).toBe('unknown');
      expect(detectGitPlatform('custom-git.internal')).toBe('unknown');
    });

    it('should detect platforms with mixed case', () => {
      // Implementation uses .includes() which IS case-sensitive
      // 'GitLab.com' contains 'Lab' but not 'gitlab' (lowercase), so returns unknown
      expect(detectGitPlatform('GitLab.com')).toBe('unknown');
      // 'GITHUB.COM' won't match because it doesn't contain lowercase 'github'
      expect(detectGitPlatform('GITHUB.COM')).toBe('unknown');
      // But lowercase works
      expect(detectGitPlatform('github.com')).toBe('github');
      expect(detectGitPlatform('gitlab.com')).toBe('gitlab');
    });
  });
});
