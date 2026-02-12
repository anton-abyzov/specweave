/**
 * Unit tests for git-utils
 *
 * Pure functions (parseGitRemoteUrl, getCommitUrl) tested directly.
 * Git-backed functions tested with real temp repos.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import * as fs from 'fs/promises';
import os from 'os';
import {
  parseGitRemoteUrl,
  getCommitUrl,
  getCurrentBranch,
  getCurrentCommitSha,
  isWorkingDirectoryClean,
  getRecentCommits,
  getLastSyncCommit,
  updateLastSyncCommit,
} from '../../../src/utils/git-utils.js';
import type { GitCommit, GitRepository } from '../../../src/utils/git-utils.js';

const execAsync = promisify(exec);

describe('git-utils', () => {
  describe('parseGitRemoteUrl', () => {
    it('should parse GitHub HTTPS URL', () => {
      const result = parseGitRemoteUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({
        provider: 'github',
        owner: 'owner',
        repo: 'repo',
        url: 'https://github.com/owner/repo',
      });
    });

    it('should parse GitHub HTTPS URL without .git', () => {
      const result = parseGitRemoteUrl('https://github.com/acme/my-project');
      expect(result).toEqual({
        provider: 'github',
        owner: 'acme',
        repo: 'my-project',
        url: 'https://github.com/acme/my-project',
      });
    });

    it('should parse GitHub SSH URL', () => {
      const result = parseGitRemoteUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({
        provider: 'github',
        owner: 'owner',
        repo: 'repo',
        url: 'https://github.com/owner/repo',
      });
    });

    it('should parse GitLab HTTPS URL', () => {
      const result = parseGitRemoteUrl('https://gitlab.com/org/project.git');
      expect(result).toEqual({
        provider: 'gitlab',
        owner: 'org',
        repo: 'project',
        url: 'https://gitlab.com/org/project',
      });
    });

    it('should parse GitLab SSH URL', () => {
      const result = parseGitRemoteUrl('git@gitlab.com:org/project.git');
      expect(result).toEqual({
        provider: 'gitlab',
        owner: 'org',
        repo: 'project',
        url: 'https://gitlab.com/org/project',
      });
    });

    it('should parse Bitbucket HTTPS URL', () => {
      const result = parseGitRemoteUrl('https://bitbucket.org/team/repo.git');
      expect(result).toEqual({
        provider: 'bitbucket',
        owner: 'team',
        repo: 'repo',
        url: 'https://bitbucket.org/team/repo',
      });
    });

    it('should parse Bitbucket SSH URL', () => {
      const result = parseGitRemoteUrl('git@bitbucket.org:team/repo.git');
      expect(result).toEqual({
        provider: 'bitbucket',
        owner: 'team',
        repo: 'repo',
        url: 'https://bitbucket.org/team/repo',
      });
    });

    it('should parse Azure DevOps HTTPS URL', () => {
      const result = parseGitRemoteUrl('https://dev.azure.com/myorg/_git/myrepo');
      expect(result).toEqual({
        provider: 'azure',
        owner: 'myorg',
        repo: 'myrepo',
        url: 'https://dev.azure.com/myorg/_git/myrepo',
      });
    });

    it('should parse Azure DevOps SSH URL', () => {
      const result = parseGitRemoteUrl('git@ssh.dev.azure.com:v3/myorg/myproject/myrepo');
      expect(result).toEqual({
        provider: 'azure',
        owner: 'myorg',
        repo: 'myrepo',
        url: 'https://dev.azure.com/myorg/_git/myrepo',
      });
    });

    it('should return null for unknown URL', () => {
      expect(parseGitRemoteUrl('https://example.com/some/repo')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseGitRemoteUrl('')).toBeNull();
    });
  });

  describe('getCommitUrl', () => {
    const commit: GitCommit = {
      sha: 'abc123def456',
      shortSha: 'abc123d',
      message: 'test commit',
      author: 'Test',
      date: new Date(),
    };

    it('should generate GitHub commit URL', () => {
      const repo: GitRepository = { provider: 'github', owner: 'o', repo: 'r', url: 'https://github.com/o/r' };
      expect(getCommitUrl(commit, repo)).toBe('https://github.com/o/r/commit/abc123def456');
    });

    it('should generate GitLab commit URL', () => {
      const repo: GitRepository = { provider: 'gitlab', owner: 'o', repo: 'r', url: 'https://gitlab.com/o/r' };
      expect(getCommitUrl(commit, repo)).toBe('https://gitlab.com/o/r/-/commit/abc123def456');
    });

    it('should generate Bitbucket commit URL', () => {
      const repo: GitRepository = { provider: 'bitbucket', owner: 'o', repo: 'r', url: 'https://bitbucket.org/o/r' };
      expect(getCommitUrl(commit, repo)).toBe('https://bitbucket.org/o/r/commits/abc123def456');
    });

    it('should generate Azure DevOps commit URL', () => {
      const repo: GitRepository = { provider: 'azure', owner: 'o', repo: 'r', url: 'https://dev.azure.com/o/_git/r' };
      expect(getCommitUrl(commit, repo)).toBe('https://dev.azure.com/o/_git/r/commit/abc123def456');
    });

    it('should return SHA for unknown provider', () => {
      const repo: GitRepository = { provider: 'unknown', owner: 'o', repo: 'r', url: '' };
      expect(getCommitUrl(commit, repo)).toBe('abc123def456');
    });
  });

  describe('git-backed functions', () => {
    let repoDir: string;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      repoDir = path.join(os.tmpdir(), `sw-git-test-${timestamp}-${random}`);
      await fs.mkdir(repoDir, { recursive: true });

      const cleanEnv = { ...process.env };
      delete cleanEnv.NODE_OPTIONS;

      await execAsync('git init', { cwd: repoDir, env: cleanEnv });
      await execAsync('git config user.email "test@specweave.dev"', { cwd: repoDir, env: cleanEnv });
      await execAsync('git config user.name "Test"', { cwd: repoDir, env: cleanEnv });

      await fs.writeFile(path.join(repoDir, 'init.txt'), 'initial');
      await execAsync('git add -A && git commit -m "initial"', { cwd: repoDir, env: cleanEnv });

      cleanup = async () => {
        await fs.rm(repoDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      await cleanup();
    });

    it('should get current branch', async () => {
      const branch = await getCurrentBranch(repoDir);
      // Default branch varies (main/master) depending on git config
      expect(branch).toBeTruthy();
      expect(typeof branch).toBe('string');
    });

    it('should get current commit SHA', async () => {
      const sha = await getCurrentCommitSha(repoDir);
      expect(sha).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should detect clean working directory', async () => {
      const clean = await isWorkingDirectoryClean(repoDir);
      expect(clean).toBe(true);
    });

    it('should detect dirty working directory', async () => {
      await fs.writeFile(path.join(repoDir, 'dirty.txt'), 'modified');
      const clean = await isWorkingDirectoryClean(repoDir);
      expect(clean).toBe(false);
    });

    it('should get recent commits', async () => {
      // Create a second commit
      await fs.writeFile(path.join(repoDir, 'file2.txt'), 'content');
      const cleanEnv = { ...process.env };
      delete cleanEnv.NODE_OPTIONS;
      await execAsync('git add -A && git commit -m "second commit"', { cwd: repoDir, env: cleanEnv });

      const commits = await getRecentCommits(undefined, undefined, repoDir);
      // Should include at least one commit from the last 24h
      expect(commits.length).toBeGreaterThanOrEqual(1);
      expect(commits[0]).toHaveProperty('sha');
      expect(commits[0]).toHaveProperty('message');
    });
  });

  describe('sync metadata', () => {
    let tmpDir: string;
    let metadataPath: string;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      tmpDir = path.join(os.tmpdir(), `sw-sync-meta-${timestamp}-${random}`);
      await fs.mkdir(tmpDir, { recursive: true });
      metadataPath = path.join(tmpDir, 'metadata.json');

      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      await cleanup();
    });

    it('should return null for missing metadata', async () => {
      const sha = await getLastSyncCommit(metadataPath);
      expect(sha).toBeNull();
    });

    it('should return null for metadata without lastSyncCommit', async () => {
      await fs.writeFile(metadataPath, JSON.stringify({ id: 'test' }));
      const sha = await getLastSyncCommit(metadataPath);
      expect(sha).toBeNull();
    });

    it('should return lastSyncCommit from metadata', async () => {
      await fs.writeFile(metadataPath, JSON.stringify({ lastSyncCommit: 'abc123' }));
      const sha = await getLastSyncCommit(metadataPath);
      expect(sha).toBe('abc123');
    });

    it('should update lastSyncCommit in existing metadata', async () => {
      await fs.writeFile(metadataPath, JSON.stringify({ id: 'test', version: 1 }));
      await updateLastSyncCommit(metadataPath, 'def456');

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(metadata.lastSyncCommit).toBe('def456');
      expect(metadata.lastSyncDate).toBeTruthy();
      // Preserved existing fields
      expect(metadata.id).toBe('test');
      expect(metadata.version).toBe(1);
    });

    it('should create metadata if file does not exist', async () => {
      await updateLastSyncCommit(metadataPath, 'new-sha');

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(metadata.lastSyncCommit).toBe('new-sha');
    });
  });
});
