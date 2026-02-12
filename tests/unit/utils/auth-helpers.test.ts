/**
 * Unit tests for auth-helpers
 *
 * Tests pure functions directly.
 * Tests project-aware functions with temp directories containing .env / config.json.
 * Tests process.env-based functions with env manipulation.
 *
 * SECURITY: No real tokens used — all values are dummy prefixed strings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  isOAuthToken,
  isPersonalAccessToken,
  getGitHubAuth,
  getGitHubAuthFromProject,
  getAzureDevOpsAuth,
  getAzureDevOpsAuthFromProject,
  getJiraAuth,
  getJiraAuthFromProject,
  shouldRunIntegrationTests,
  hasGitHubCredentials,
  hasGitHubCredentialsFromProject,
  hasAzureDevOpsCredentials,
  hasAzureDevOpsCredentialsFromProject,
  hasJiraCredentials,
  hasJiraCredentialsFromProject,
  getCredentialStatus,
} from '../../../src/utils/auth-helpers.js';

// ─── Token detection (pure) ───────────────────────────────────────

describe('auth-helpers', () => {
  describe('isOAuthToken', () => {
    it('should return true for gho_ prefix', () => {
      expect(isOAuthToken('gho_abc123')).toBe(true);
    });

    it('should return false for ghp_ prefix', () => {
      expect(isOAuthToken('ghp_abc123')).toBe(false);
    });

    it('should return false for github_pat_ prefix', () => {
      expect(isOAuthToken('github_pat_abc123')).toBe(false);
    });

    it('should return false for ghs_ prefix', () => {
      expect(isOAuthToken('ghs_abc123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isOAuthToken('')).toBe(false);
    });
  });

  describe('isPersonalAccessToken', () => {
    it('should return true for ghp_ prefix', () => {
      expect(isPersonalAccessToken('ghp_abc123')).toBe(true);
    });

    it('should return true for github_pat_ prefix', () => {
      expect(isPersonalAccessToken('github_pat_LONG_TOKEN_VALUE')).toBe(true);
    });

    it('should return false for gho_ prefix', () => {
      expect(isPersonalAccessToken('gho_abc123')).toBe(false);
    });

    it('should return false for ghs_ prefix', () => {
      expect(isPersonalAccessToken('ghs_abc123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPersonalAccessToken('')).toBe(false);
    });
  });

  // ─── shouldRunIntegrationTests ──────────────────────────────────

  describe('shouldRunIntegrationTests', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS;
      savedEnv.CI = process.env.CI;
      delete process.env.RUN_INTEGRATION_TESTS;
      delete process.env.CI;
    });

    afterEach(() => {
      if (savedEnv.RUN_INTEGRATION_TESTS !== undefined) {
        process.env.RUN_INTEGRATION_TESTS = savedEnv.RUN_INTEGRATION_TESTS;
      } else {
        delete process.env.RUN_INTEGRATION_TESTS;
      }
      if (savedEnv.CI !== undefined) {
        process.env.CI = savedEnv.CI;
      } else {
        delete process.env.CI;
      }
    });

    it('should return true when RUN_INTEGRATION_TESTS=true', () => {
      process.env.RUN_INTEGRATION_TESTS = 'true';
      expect(shouldRunIntegrationTests()).toBe(true);
    });

    it('should return true when CI=true', () => {
      process.env.CI = 'true';
      expect(shouldRunIntegrationTests()).toBe(true);
    });

    it('should return false when neither is set', () => {
      expect(shouldRunIntegrationTests()).toBe(false);
    });

    it('should return false when CI=false', () => {
      process.env.CI = 'false';
      expect(shouldRunIntegrationTests()).toBe(false);
    });
  });

  // ─── getGitHubAuth (process.env) ───────────────────────────────

  describe('getGitHubAuth', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      savedEnv.GH_TOKEN = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
    });

    it('should prefer GITHUB_TOKEN over GH_TOKEN', () => {
      process.env.GITHUB_TOKEN = 'ghp_primary';
      process.env.GH_TOKEN = 'ghp_secondary';
      const auth = getGitHubAuth();
      expect(auth.token).toBe('ghp_primary');
      expect(auth.source).toBe('GITHUB_TOKEN');
    });

    it('should fall back to GH_TOKEN', () => {
      process.env.GH_TOKEN = 'ghp_fallback';
      const auth = getGitHubAuth();
      expect(auth.token).toBe('ghp_fallback');
      expect(auth.source).toBe('GH_TOKEN');
    });

    it('should detect OAuth token', () => {
      process.env.GITHUB_TOKEN = 'gho_oauth_test';
      const auth = getGitHubAuth();
      expect(auth.isOAuthToken).toBe(true);
    });

    it('should detect PAT as not OAuth', () => {
      process.env.GITHUB_TOKEN = 'ghp_pat_test';
      const auth = getGitHubAuth();
      expect(auth.isOAuthToken).toBe(false);
    });

    it('should return source=none when no env vars set and gh CLI unavailable', () => {
      // With no env vars set, it will try gh CLI which may or may not work
      const auth = getGitHubAuth();
      // We can only assert on structure, not exact source (gh CLI may work in dev)
      expect(auth).toHaveProperty('token');
      expect(auth).toHaveProperty('source');
    });
  });

  // ─── getGitHubAuthFromProject (.env file) ──────────────────────

  describe('getGitHubAuthFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-auth-test-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });

      savedEnv.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      savedEnv.GH_TOKEN = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;

      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should read GITHUB_TOKEN from .env file', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'GITHUB_TOKEN=ghp_from_env_file\n');
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_from_env_file');
      expect(auth.source).toBe('GITHUB_TOKEN');
    });

    it('should read GH_TOKEN from .env file', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'GH_TOKEN=ghp_alt_token\n');
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_alt_token');
      expect(auth.source).toBe('GH_TOKEN');
    });

    it('should prefer GITHUB_TOKEN over GH_TOKEN in .env', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'GITHUB_TOKEN=ghp_primary\nGH_TOKEN=ghp_secondary\n'
      );
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_primary');
    });

    it('should strip surrounding quotes from .env values', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'GITHUB_TOKEN="ghp_quoted"\n');
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_quoted');
    });

    it('should strip single quotes from .env values', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), "GITHUB_TOKEN='ghp_single_quoted'\n");
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_single_quoted');
    });

    it('should skip comments in .env file', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        '# This is a comment\nGITHUB_TOKEN=ghp_after_comment\n'
      );
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_after_comment');
    });

    it('should skip empty lines in .env file', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        '\n\nGITHUB_TOKEN=ghp_after_blanks\n\n'
      );
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_after_blanks');
    });

    it('should detect OAuth token from .env', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'GITHUB_TOKEN=gho_oauth_env\n');
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.isOAuthToken).toBe(true);
    });

    it('should fall back to process.env when no .env file exists', () => {
      process.env.GITHUB_TOKEN = 'ghp_from_process_env';
      const auth = getGitHubAuthFromProject(tmpDir);
      expect(auth.token).toBe('ghp_from_process_env');
      expect(auth.source).toBe('GITHUB_TOKEN');
    });
  });

  // ─── getAzureDevOpsAuth (process.env) ──────────────────────────

  describe('getAzureDevOpsAuth', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT;
      savedEnv.AZURE_DEVOPS_ORG = process.env.AZURE_DEVOPS_ORG;
      savedEnv.AZURE_DEVOPS_PROJECT = process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PROJECT;
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
    });

    it('should return auth when all env vars set', () => {
      process.env.AZURE_DEVOPS_PAT = 'ado-pat-123';
      process.env.AZURE_DEVOPS_ORG = 'myorg';
      process.env.AZURE_DEVOPS_PROJECT = 'myproject';
      const auth = getAzureDevOpsAuth();
      expect(auth).toEqual({
        pat: 'ado-pat-123',
        org: 'myorg',
        project: 'myproject',
      });
    });

    it('should return null when PAT missing', () => {
      process.env.AZURE_DEVOPS_ORG = 'myorg';
      process.env.AZURE_DEVOPS_PROJECT = 'myproject';
      expect(getAzureDevOpsAuth()).toBeNull();
    });

    it('should return null when org missing', () => {
      process.env.AZURE_DEVOPS_PAT = 'ado-pat-123';
      process.env.AZURE_DEVOPS_PROJECT = 'myproject';
      expect(getAzureDevOpsAuth()).toBeNull();
    });

    it('should return null when project missing', () => {
      process.env.AZURE_DEVOPS_PAT = 'ado-pat-123';
      process.env.AZURE_DEVOPS_ORG = 'myorg';
      expect(getAzureDevOpsAuth()).toBeNull();
    });

    it('should return null when nothing set', () => {
      expect(getAzureDevOpsAuth()).toBeNull();
    });
  });

  // ─── getAzureDevOpsAuthFromProject ──────────────────────────────

  describe('getAzureDevOpsAuthFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-ado-auth-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });

      savedEnv.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT;
      savedEnv.AZURE_DEVOPS_ORG = process.env.AZURE_DEVOPS_ORG;
      savedEnv.AZURE_DEVOPS_PROJECT = process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PROJECT;

      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should read ADO credentials from .env file', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'AZURE_DEVOPS_PAT=ado-pat-env\nAZURE_DEVOPS_ORG=env-org\nAZURE_DEVOPS_PROJECT=env-proj\n'
      );
      const auth = getAzureDevOpsAuthFromProject(tmpDir);
      expect(auth).toEqual({
        pat: 'ado-pat-env',
        org: 'env-org',
        project: 'env-proj',
      });
    });

    it('should return auth with PAT only from .env, using process.env for org/project', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'AZURE_DEVOPS_PAT=ado-pat-only\n');
      process.env.AZURE_DEVOPS_ORG = 'fallback-org';
      process.env.AZURE_DEVOPS_PROJECT = 'fallback-proj';
      const auth = getAzureDevOpsAuthFromProject(tmpDir);
      expect(auth).not.toBeNull();
      expect(auth!.pat).toBe('ado-pat-only');
      expect(auth!.org).toBe('fallback-org');
    });

    it('should return null when no .env and no process.env', () => {
      expect(getAzureDevOpsAuthFromProject(tmpDir)).toBeNull();
    });
  });

  // ─── getJiraAuth (process.env) ──────────────────────────────────

  describe('getJiraAuth', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
      savedEnv.JIRA_EMAIL = process.env.JIRA_EMAIL;
      savedEnv.JIRA_DOMAIN = process.env.JIRA_DOMAIN;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_DOMAIN;
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
    });

    it('should return auth when all env vars set', () => {
      process.env.JIRA_API_TOKEN = 'test-jira-api-key-not-real';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_DOMAIN = 'mycompany.atlassian.net';
      const auth = getJiraAuth();
      expect(auth).not.toBeNull();
      expect(auth!.token).toBe(process.env.JIRA_API_TOKEN);
      expect(auth!.email).toBe('test@example.com');
      expect(auth!.domain).toBe('mycompany.atlassian.net');
    });

    it('should return null when token missing', () => {
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_DOMAIN = 'mycompany.atlassian.net';
      expect(getJiraAuth()).toBeNull();
    });

    it('should return null when email missing', () => {
      process.env.JIRA_API_TOKEN = 'test-jira-api-key-not-real';
      process.env.JIRA_DOMAIN = 'mycompany.atlassian.net';
      expect(getJiraAuth()).toBeNull();
    });

    it('should return null when domain missing', () => {
      process.env.JIRA_API_TOKEN = 'test-jira-api-key-not-real';
      process.env.JIRA_EMAIL = 'test@example.com';
      expect(getJiraAuth()).toBeNull();
    });
  });

  // ─── getJiraAuthFromProject ─────────────────────────────────────

  describe('getJiraAuthFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-jira-auth-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });

      savedEnv.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
      savedEnv.JIRA_EMAIL = process.env.JIRA_EMAIL;
      savedEnv.JIRA_DOMAIN = process.env.JIRA_DOMAIN;
      savedEnv.JIRA_HOST = process.env.JIRA_HOST;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_DOMAIN;
      delete process.env.JIRA_HOST;

      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should read domain from config.json and secrets from .env', async () => {
      await fs.mkdir(path.join(tmpDir, '.specweave'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '.specweave', 'config.json'),
        JSON.stringify({ issueTracker: { domain: 'acme.atlassian.net' } })
      );
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'JIRA_API_TOKEN=test-jira-key\nJIRA_EMAIL=dev@acme.com\n'
      );
      const auth = getJiraAuthFromProject(tmpDir);
      expect(auth).not.toBeNull();
      expect(auth!).toHaveProperty('token', 'test-jira-key');
      expect(auth!.email).toBe('dev@acme.com');
      expect(auth!.domain).toBe('acme.atlassian.net');
    });

    it('should use JIRA_DOMAIN from .env as fallback for domain', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'JIRA_API_TOKEN=tok\nJIRA_EMAIL=a@b.com\nJIRA_DOMAIN=fallback.atlassian.net\n'
      );
      const auth = getJiraAuthFromProject(tmpDir);
      expect(auth).not.toBeNull();
      expect(auth!).toHaveProperty('token', 'tok');
      expect(auth!.domain).toBe('fallback.atlassian.net');
    });

    it('should use JIRA_HOST from .env as fallback for domain', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'JIRA_API_TOKEN=tok\nJIRA_EMAIL=a@b.com\nJIRA_HOST=host.atlassian.net\n'
      );
      const auth = getJiraAuthFromProject(tmpDir);
      expect(auth).not.toBeNull();
      expect(auth!).toHaveProperty('token', 'tok');
      expect(auth!.domain).toBe('host.atlassian.net');
    });

    it('should fall back to process.env for missing values', async () => {
      // Only value in .env, rest in process.env
      await fs.writeFile(path.join(tmpDir, '.env'), 'JIRA_API_TOKEN=env-tok\n');
      process.env.JIRA_EMAIL = 'process@env.com';
      process.env.JIRA_DOMAIN = 'process.atlassian.net';
      const auth = getJiraAuthFromProject(tmpDir);
      expect(auth).not.toBeNull();
      expect(auth!).toHaveProperty('token', 'env-tok');
      expect(auth!.email).toBe('process@env.com');
      expect(auth!.domain).toBe('process.atlassian.net');
    });

    it('should return null when insufficient credentials', () => {
      expect(getJiraAuthFromProject(tmpDir)).toBeNull();
    });

    it('should prefer config.json domain over .env JIRA_DOMAIN', async () => {
      await fs.mkdir(path.join(tmpDir, '.specweave'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '.specweave', 'config.json'),
        JSON.stringify({ issueTracker: { domain: 'config.atlassian.net' } })
      );
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'JIRA_API_TOKEN=tok\nJIRA_EMAIL=a@b.com\nJIRA_DOMAIN=env.atlassian.net\n'
      );
      const auth = getJiraAuthFromProject(tmpDir);
      expect(auth!.domain).toBe('config.atlassian.net');
    });
  });

  // ─── hasXxxCredentials ──────────────────────────────────────────

  describe('hasGitHubCredentialsFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-has-cred-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });
      savedEnv.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      savedEnv.GH_TOKEN = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should return true when .env has GitHub token', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'GITHUB_TOKEN=ghp_test\n');
      expect(hasGitHubCredentialsFromProject(tmpDir)).toBe(true);
    });
  });

  describe('hasAzureDevOpsCredentialsFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-has-ado-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });
      savedEnv.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT;
      savedEnv.AZURE_DEVOPS_ORG = process.env.AZURE_DEVOPS_ORG;
      savedEnv.AZURE_DEVOPS_PROJECT = process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PROJECT;
      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should return true when .env has ADO PAT', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'AZURE_DEVOPS_PAT=ado-pat\nAZURE_DEVOPS_ORG=org\nAZURE_DEVOPS_PROJECT=proj\n'
      );
      expect(hasAzureDevOpsCredentialsFromProject(tmpDir)).toBe(true);
    });

    it('should return false when no credentials', () => {
      expect(hasAzureDevOpsCredentialsFromProject(tmpDir)).toBe(false);
    });
  });

  describe('hasJiraCredentialsFromProject', () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpDir = path.join(os.tmpdir(), `sw-has-jira-${suffix}`);
      await fs.mkdir(tmpDir, { recursive: true });
      savedEnv.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
      savedEnv.JIRA_EMAIL = process.env.JIRA_EMAIL;
      savedEnv.JIRA_DOMAIN = process.env.JIRA_DOMAIN;
      savedEnv.JIRA_HOST = process.env.JIRA_HOST;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_DOMAIN;
      delete process.env.JIRA_HOST;
      cleanup = async () => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      };
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
      await cleanup();
    });

    it('should return true when .env has full Jira credentials', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.env'),
        'JIRA_API_TOKEN=tok\nJIRA_EMAIL=a@b.com\nJIRA_DOMAIN=x.atlassian.net\n'
      );
      expect(hasJiraCredentialsFromProject(tmpDir)).toBe(true);
    });

    it('should return false when partial credentials', async () => {
      await fs.writeFile(path.join(tmpDir, '.env'), 'JIRA_API_TOKEN=tok\n');
      expect(hasJiraCredentialsFromProject(tmpDir)).toBe(false);
    });
  });

  // ─── getCredentialStatus ────────────────────────────────────────

  describe('getCredentialStatus', () => {
    it('should return a status object', () => {
      const status = getCredentialStatus();
      expect(status).toHaveProperty('github');
      expect(status).toHaveProperty('ado');
      expect(status).toHaveProperty('jira');
      expect(status).toHaveProperty('integrationTestsEnabled');
      expect(typeof status.github).toBe('string');
      expect(typeof status.ado).toBe('boolean');
      expect(typeof status.jira).toBe('boolean');
      expect(typeof status.integrationTestsEnabled).toBe('boolean');
    });
  });
});
