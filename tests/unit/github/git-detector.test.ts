import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Git Remote Detector
 */

import { describe, it, expect } from 'vitest';
import {
  parseGitUrl,
  type GitRemote
} from '../../../src/utils/git-detector.js';

describe('Git Remote Detector', () => {
  describe('parseGitUrl', () => {
    it('should parse GitHub HTTPS URLs', () => {
      const result = parseGitUrl('https://github.com/owner/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitHub SSH URLs', () => {
      const result = parseGitUrl('git@github.com:owner/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitHub SSH URLs with protocol', () => {
      const result = parseGitUrl('ssh://git@github.com/owner/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitHub Enterprise URLs', () => {
      const result = parseGitUrl('https://github.company.com/owner/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitHub Enterprise SSH URLs', () => {
      const result = parseGitUrl('git@github.company.com:owner/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitLab URLs', () => {
      const result = parseGitUrl('https://gitlab.com/owner/repo.git');
      expect(result.provider).toBe('gitlab');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitLab SSH URLs', () => {
      const result = parseGitUrl('git@gitlab.com:owner/repo.git');
      expect(result.provider).toBe('gitlab');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse Bitbucket URLs', () => {
      const result = parseGitUrl('https://bitbucket.org/owner/repo.git');
      expect(result.provider).toBe('bitbucket');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse Bitbucket SSH URLs', () => {
      const result = parseGitUrl('git@bitbucket.org:owner/repo.git');
      expect(result.provider).toBe('bitbucket');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse Azure DevOps URLs', () => {
      const result = parseGitUrl('https://dev.azure.com/org/project/_git/repo');
      expect(result.provider).toBe('azure');
      expect(result.owner).toBe('org');
      expect(result.repo).toBe('repo');
    });

    it('should parse Azure DevOps SSH URLs', () => {
      const result = parseGitUrl('git@ssh.dev.azure.com:v3/org/project/repo');
      expect(result.provider).toBe('azure');
      expect(result.owner).toBe('org');
      expect(result.repo).toBe('repo');
    });

    it('should parse old Visual Studio URLs', () => {
      const result = parseGitUrl('https://org.visualstudio.com/project/_git/repo');
      expect(result.provider).toBe('azure');
      expect(result.owner).toBe('org');
      expect(result.repo).toBe('repo');
    });

    it('should handle URLs without .git extension', () => {
      const result = parseGitUrl('https://github.com/owner/repo');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should return unknown for unrecognized URLs', () => {
      const result = parseGitUrl('https://example.com/something.git');
      expect(result.provider).toBe('unknown');
      expect(result.owner).toBeUndefined();
      expect(result.repo).toBeUndefined();
    });

    it('should handle complex repository names', () => {
      const result = parseGitUrl('https://github.com/owner/repo-with-dashes.and.dots.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo-with-dashes.and.dots');
    });

    it('should handle org names with dashes', () => {
      const result = parseGitUrl('https://github.com/org-with-dashes/repo.git');
      expect(result.provider).toBe('github');
      expect(result.owner).toBe('org-with-dashes');
      expect(result.repo).toBe('repo');
    });
  });
});