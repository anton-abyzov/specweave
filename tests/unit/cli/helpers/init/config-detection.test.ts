/**
 * Unit tests for config-detection
 *
 * Tests detectGitHubRemote, detectJiraConfig, detectADOConfig, detectAllConfigs
 * with real temp directories containing git config and .env files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  detectGitHubRemote,
  detectJiraConfig,
  detectADOConfig,
  detectAllConfigs,
} from '../../../../../src/cli/helpers/init/config-detection.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-config-det-${name}-${suffix}`);
}

describe('config-detection', () => {
  // ─── detectGitHubRemote ─────────────────────────────────────────

  describe('detectGitHubRemote', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('gh');
      mkdirSync(path.join(dir, '.git'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect HTTPS GitHub remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/acme/my-project.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'
      );
      const result = detectGitHubRemote(dir);
      expect(result).toEqual({ owner: 'acme', repo: 'my-project' });
    });

    it('should detect SSH GitHub remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = git@github.com:owner/repo.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'
      );
      const result = detectGitHubRemote(dir);
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should detect HTTPS without .git suffix', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/user/project\n'
      );
      const result = detectGitHubRemote(dir);
      expect(result).toEqual({ owner: 'user', repo: 'project' });
    });

    it('should return null for non-GitHub remote', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://gitlab.com/user/project.git\n'
      );
      expect(detectGitHubRemote(dir)).toBeNull();
    });

    it('should return null when no .git directory', () => {
      const noGitDir = tmpPath('no-git');
      mkdirSync(noGitDir, { recursive: true });
      expect(detectGitHubRemote(noGitDir)).toBeNull();
      fs.rm(noGitDir, { recursive: true, force: true }).catch(() => {});
    });
  });

  // ─── detectJiraConfig ───────────────────────────────────────────

  describe('detectJiraConfig', () => {
    let dir: string;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      dir = tmpPath('jira');
      mkdirSync(dir, { recursive: true });

      savedEnv.JIRA_HOST = process.env.JIRA_HOST;
      savedEnv.JIRA_EMAIL = process.env.JIRA_EMAIL;
      savedEnv.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_HOST;
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) process.env[key] = value;
        else delete process.env[key];
      }
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect Jira config from .env file', () => {
      writeFileSync(
        path.join(dir, '.env'),
        'JIRA_HOST=acme.atlassian.net\nJIRA_EMAIL=dev@acme.com\nJIRA_API_TOKEN=test-key-123\n'
      );
      const result = detectJiraConfig(dir);
      expect(result).toEqual({
        host: 'acme.atlassian.net',
        email: 'dev@acme.com',
        apiToken: 'test-key-123',
      });
    });

    it('should detect Jira config from process.env', () => {
      process.env.JIRA_HOST = 'env.atlassian.net';
      process.env.JIRA_EMAIL = 'env@test.com';
      process.env.JIRA_API_TOKEN = 'env-tok';
      const result = detectJiraConfig(dir);
      expect(result).toEqual({
        host: 'env.atlassian.net',
        email: 'env@test.com',
        apiToken: 'env-tok',
      });
    });

    it('should return null when credentials incomplete', () => {
      writeFileSync(path.join(dir, '.env'), 'JIRA_HOST=acme.atlassian.net\n');
      expect(detectJiraConfig(dir)).toBeNull();
    });

    it('should return null when no credentials', () => {
      expect(detectJiraConfig(dir)).toBeNull();
    });
  });

  // ─── detectADOConfig ────────────────────────────────────────────

  describe('detectADOConfig', () => {
    let dir: string;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      dir = tmpPath('ado');
      mkdirSync(dir, { recursive: true });

      savedEnv.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT;
      savedEnv.ADO_PAT = process.env.ADO_PAT;
      savedEnv.AZURE_DEVOPS_ORG_URL = process.env.AZURE_DEVOPS_ORG_URL;
      savedEnv.AZURE_DEVOPS_ORG = process.env.AZURE_DEVOPS_ORG;
      savedEnv.AZURE_DEVOPS_PROJECT = process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.ADO_PAT;
      delete process.env.AZURE_DEVOPS_ORG_URL;
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PROJECT;
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) process.env[key] = value;
        else delete process.env[key];
      }
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect ADO config from config.json + .env PAT', () => {
      // Write PAT to .env
      writeFileSync(path.join(dir, '.env'), 'AZURE_DEVOPS_PAT=ado-pat-test\n');

      // Write config.json with ADO profile
      mkdirSync(path.join(dir, '.specweave'), { recursive: true });
      writeFileSync(
        path.join(dir, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            defaultProfile: 'main',
            profiles: {
              main: {
                provider: 'ado',
                config: {
                  organization: 'testorg',
                  project: 'testproj',
                  areaPaths: ['Area\\Path'],
                },
              },
            },
          },
        })
      );

      const result = detectADOConfig(dir);
      expect(result).not.toBeNull();
      expect(result!.orgUrl).toBe('https://dev.azure.com/testorg');
      expect(result!.project).toBe('testproj');
      expect(result!.pat).toBe('ado-pat-test');
    });

    it('should detect ADO config from env vars fallback', () => {
      process.env.AZURE_DEVOPS_PAT = 'env-pat';
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';
      process.env.AZURE_DEVOPS_PROJECT = 'myproj';

      const result = detectADOConfig(dir);
      expect(result).not.toBeNull();
      expect(result!.orgUrl).toBe('https://dev.azure.com/myorg');
      expect(result!.project).toBe('myproj');
    });

    it('should normalize org name to URL when not HTTPS', () => {
      process.env.AZURE_DEVOPS_PAT = 'pat';
      process.env.AZURE_DEVOPS_ORG = 'plainorg';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';

      const result = detectADOConfig(dir);
      expect(result).not.toBeNull();
      expect(result!.orgUrl).toBe('https://dev.azure.com/plainorg');
    });

    it('should return null when no PAT available', () => {
      expect(detectADOConfig(dir)).toBeNull();
    });

    it('should aggregate multiple ADO profiles', () => {
      writeFileSync(path.join(dir, '.env'), 'AZURE_DEVOPS_PAT=pat\n');
      mkdirSync(path.join(dir, '.specweave'), { recursive: true });
      writeFileSync(
        path.join(dir, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            defaultProfile: 'frontend',
            profiles: {
              frontend: {
                provider: 'ado',
                config: { organization: 'org', project: 'fe-proj' },
              },
              backend: {
                provider: 'ado',
                config: { organization: 'org', project: 'be-proj' },
              },
            },
          },
        })
      );

      const result = detectADOConfig(dir);
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(2);
      // Default project should be frontend (defaultProfile)
      expect(result!.project).toBe('fe-proj');
    });
  });

  // ─── detectAllConfigs ───────────────────────────────────────────

  describe('detectAllConfigs', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('all');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should return empty when nothing detected', () => {
      const result = detectAllConfigs(dir);
      expect(result.github).toBeNull();
      expect(result.jira).toBeNull();
      expect(result.ado).toBeNull();
      expect(result.availableTools).toEqual([]);
    });

    it('should detect GitHub and list it in availableTools', () => {
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = git@github.com:test/repo.git\n'
      );
      const result = detectAllConfigs(dir);
      expect(result.github).toEqual({ owner: 'test', repo: 'repo' });
      expect(result.availableTools).toContain('GitHub');
    });
  });
});
