/**
 * Tests for provider and credential auto-detection
 * T-001 [RED] → T-002 [GREEN]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock execFileNoThrowSync for gh auth token tests
const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));
vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

import {
  detectProvider,
  detectCredentials,
} from '../../../../../src/cli/helpers/init/provider-detection.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-provider-${name}-${suffix}`);
}

describe('provider-detection', () => {
  // ─── detectProvider ───────────────────────────────────────────

  describe('detectProvider', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('detect');
      mkdirSync(path.join(dir, '.git'), { recursive: true });
    });

    afterEach(async () => {
      await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect GitHub HTTPS remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/acme/my-project.git\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'github', owner: 'acme', repo: 'my-project' });
    });

    it('should detect GitHub SSH remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = git@github.com:org/repo.git\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'github', owner: 'org', repo: 'repo' });
    });

    it('should detect GitHub HTTPS without .git suffix', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/user/project\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'github', owner: 'user', repo: 'project' });
    });

    it('should detect ADO HTTPS remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://dev.azure.com/myorg/myproject/_git/myrepo\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'ado', organization: 'myorg' });
    });

    it('should detect ADO SSH remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = git@ssh.dev.azure.com:v3/myorg/myproject/myrepo\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'ado', organization: 'myorg' });
    });

    it('should detect ADO legacy (visualstudio.com) remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://myorg.visualstudio.com/project/_git/repo\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'ado', organization: 'myorg' });
    });

    it('should detect Bitbucket HTTPS remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://bitbucket.org/workspace/repo.git\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'bitbucket', owner: 'workspace', repo: 'repo' });
    });

    it('should detect Bitbucket SSH remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = git@bitbucket.org:workspace/repo.git\n'
      );
      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'bitbucket', owner: 'workspace', repo: 'repo' });
    });

    it('should return null for non-recognized remote (gitlab)', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://gitlab.com/user/project.git\n'
      );
      expect(detectProvider(dir)).toBeNull();
    });

    it('should return null when no .git directory', () => {
      const noGitDir = tmpPath('no-git');
      mkdirSync(noGitDir, { recursive: true });
      expect(detectProvider(noGitDir)).toBeNull();
      fsPromises.rm(noGitDir, { recursive: true, force: true }).catch(() => {});
    });

    it('should return null for empty .git/config', () => {
      writeFileSync(path.join(dir, '.git', 'config'), '');
      expect(detectProvider(dir)).toBeNull();
    });
  });

  // ─── detectCredentials ────────────────────────────────────────

  describe('detectCredentials', () => {
    let dir: string;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      dir = tmpPath('creds');
      mkdirSync(dir, { recursive: true });
      mockExecFileNoThrowSync.mockReset();

      // Save and clear relevant env vars
      for (const key of ['GITHUB_TOKEN', 'GH_TOKEN', 'AZURE_DEVOPS_PAT', 'ADO_PAT', 'BITBUCKET_TOKEN', 'BITBUCKET_APP_PASSWORD']) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) process.env[key] = value;
        else delete process.env[key];
      }
      await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    // GitHub credentials
    it('should detect GitHub token from gh auth token', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: 'ghp_test123\n', exitCode: 0 });
      const result = detectCredentials(dir, 'github');
      expect(result).toBe('ghp_test123');
    });

    it('should detect GitHub token from .env', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });
      writeFileSync(path.join(dir, '.env'), 'GITHUB_TOKEN=env-token-abc\n');
      const result = detectCredentials(dir, 'github');
      expect(result).toBe('env-token-abc');
    });

    it('should detect GH_TOKEN from .env', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });
      writeFileSync(path.join(dir, '.env'), 'GH_TOKEN=gh-tok-456\n');
      const result = detectCredentials(dir, 'github');
      expect(result).toBe('gh-tok-456');
    });

    it('should detect GitHub token from process.env', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });
      process.env.GITHUB_TOKEN = 'proc-env-token';
      const result = detectCredentials(dir, 'github');
      expect(result).toBe('proc-env-token');
    });

    it('should return null when no GitHub credentials found', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });
      const result = detectCredentials(dir, 'github');
      expect(result).toBeNull();
    });

    it('should prefer gh auth over .env', () => {
      mockExecFileNoThrowSync.mockReturnValue({ stdout: 'ghp_preferred\n', exitCode: 0 });
      writeFileSync(path.join(dir, '.env'), 'GITHUB_TOKEN=env-fallback\n');
      const result = detectCredentials(dir, 'github');
      expect(result).toBe('ghp_preferred');
    });

    // ADO credentials
    it('should detect ADO PAT from .env', () => {
      writeFileSync(path.join(dir, '.env'), 'AZURE_DEVOPS_PAT=ado-pat-123\n');
      const result = detectCredentials(dir, 'ado');
      expect(result).toBe('ado-pat-123');
    });

    it('should detect ADO_PAT from process.env', () => {
      process.env.ADO_PAT = 'ado-env-pat';
      const result = detectCredentials(dir, 'ado');
      expect(result).toBe('ado-env-pat');
    });

    it('should return null when no ADO credentials', () => {
      expect(detectCredentials(dir, 'ado')).toBeNull();
    });

    // Bitbucket credentials
    it('should detect Bitbucket token from .env', () => {
      writeFileSync(path.join(dir, '.env'), 'BITBUCKET_TOKEN=bb-tok\n');
      const result = detectCredentials(dir, 'bitbucket');
      expect(result).toBe('bb-tok');
    });

    it('should return null when no Bitbucket credentials', () => {
      expect(detectCredentials(dir, 'bitbucket')).toBeNull();
    });

    // Unknown provider
    it('should return null for unknown provider', () => {
      expect(detectCredentials(dir, 'gitlab')).toBeNull();
    });
  });
});
