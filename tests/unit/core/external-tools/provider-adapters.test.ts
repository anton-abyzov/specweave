/**
 * Provider Adapters Unit Tests
 *
 * Tests the three provider adapters:
 * - GitHubItemsAdapter
 * - JiraItemsAdapter
 * - AdoItemsAdapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Mock execFileNoThrow for GitHub adapter
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
    // Mock git remote
    if (cmd === 'git' && args[0] === 'remote') {
      return { exitCode: 0, stdout: 'git@github.com:test/repo.git\n', stderr: '' };
    }
    // Mock gh auth status
    if (cmd === 'gh' && args[0] === 'auth') {
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    // Mock gh api search (count)
    if (cmd === 'gh' && args[0] === 'api' && args[1] === 'search/issues') {
      return { exitCode: 0, stdout: '42\n', stderr: '' };
    }
    // Mock gh issue list
    if (cmd === 'gh' && args[0] === 'issue') {
      return {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            number: 1,
            title: 'Test Issue',
            url: 'https://github.com/test/repo/issues/1',
            createdAt: new Date().toISOString(),
            labels: [{ name: 'bug' }],
            state: 'open',
          },
        ]),
        stderr: '',
      };
    }
    return { exitCode: 1, stdout: '', stderr: 'Unknown command' };
  }),
}));

import { GitHubItemsAdapter } from '../../../../src/core/external-tools/providers/github-items-adapter.js';

describe('GitHubItemsAdapter', () => {
  describe('fromGitRemote', () => {
    it('should create adapter from git remote URL', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      expect(adapter).not.toBeNull();
    });
  });

  describe('getProviderName', () => {
    it('should return github', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      expect(adapter?.getProviderName()).toBe('github');
    });
  });

  describe('isConfigured', () => {
    it('should return true when gh is authenticated', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      const configured = await adapter?.isConfigured();
      expect(configured).toBe(true);
    });
  });

  describe('getOpenCount', () => {
    it('should return count from GitHub search API', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      const count = await adapter?.getOpenCount();
      expect(count).toBe(42);
    });
  });

  describe('getOpenItems', () => {
    it('should return paginated items', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      const result = await adapter?.getOpenItems();

      expect(result?.items).toHaveLength(1);
      expect(result?.items[0].id).toBe('#1');
      expect(result?.items[0].title).toBe('Test Issue');
      expect(result?.items[0].provider).toBe('github');
    });

    it('should include pagination metadata', async () => {
      const adapter = await GitHubItemsAdapter.fromGitRemote();
      const result = await adapter?.getOpenItems();

      expect(result?.page).toBeDefined();
      expect(result?.pageSize).toBeDefined();
      expect(result?.totalPages).toBeDefined();
      expect(result?.hasMore).toBeDefined();
    });
  });
});

describe('JiraItemsAdapter', () => {
  beforeEach(() => {
    // Clear env vars
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });

  afterEach(() => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });

  // Import after mocks are set up
  it('should return null when not configured', async () => {
    const { JiraItemsAdapter } = await import(
      '../../../../src/core/external-tools/providers/jira-items-adapter.js'
    );
    const adapter = JiraItemsAdapter.fromEnv();
    expect(adapter).toBeNull();
  });

  it('should create adapter when env vars are set', async () => {
    process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@test.com';
    process.env.JIRA_API_TOKEN = 'test-token';

    const { JiraItemsAdapter } = await import(
      '../../../../src/core/external-tools/providers/jira-items-adapter.js'
    );
    const adapter = JiraItemsAdapter.fromEnv();
    expect(adapter).not.toBeNull();
    expect(adapter?.getProviderName()).toBe('jira');
  });
});

describe('AdoItemsAdapter', () => {
  beforeEach(() => {
    // Clear env vars
    delete process.env.ADO_ORG_URL;
    delete process.env.ADO_PROJECT;
    delete process.env.ADO_PAT;
    delete process.env.AZURE_DEVOPS_ORG_URL;
    delete process.env.AZURE_DEVOPS_PROJECT;
    delete process.env.AZURE_DEVOPS_PAT;
  });

  afterEach(() => {
    delete process.env.ADO_ORG_URL;
    delete process.env.ADO_PROJECT;
    delete process.env.ADO_PAT;
    delete process.env.AZURE_DEVOPS_ORG_URL;
    delete process.env.AZURE_DEVOPS_PROJECT;
    delete process.env.AZURE_DEVOPS_PAT;
  });

  it('should return null when not configured', async () => {
    const { AdoItemsAdapter } = await import(
      '../../../../src/core/external-tools/providers/ado-items-adapter.js'
    );
    const adapter = AdoItemsAdapter.fromEnv();
    expect(adapter).toBeNull();
  });

  it('should create adapter when ADO env vars are set', async () => {
    process.env.ADO_ORG_URL = 'https://dev.azure.com/test';
    process.env.ADO_PROJECT = 'TestProject';
    process.env.ADO_PAT = 'test-pat';

    const { AdoItemsAdapter } = await import(
      '../../../../src/core/external-tools/providers/ado-items-adapter.js'
    );
    const adapter = AdoItemsAdapter.fromEnv();
    expect(adapter).not.toBeNull();
    expect(adapter?.getProviderName()).toBe('ado');
  });

  it('should create adapter when AZURE_DEVOPS env vars are set', async () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/test';
    process.env.AZURE_DEVOPS_PROJECT = 'TestProject';
    process.env.AZURE_DEVOPS_PAT = 'test-pat';

    const { AdoItemsAdapter } = await import(
      '../../../../src/core/external-tools/providers/ado-items-adapter.js'
    );
    const adapter = AdoItemsAdapter.fromEnv();
    expect(adapter).not.toBeNull();
  });
});
