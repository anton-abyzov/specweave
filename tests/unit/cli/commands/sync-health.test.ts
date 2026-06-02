import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCheckJira = vi.hoisted(() => vi.fn());
const mockCheckAdo = vi.hoisted(() => vi.fn());
const mockCheckGitHub = vi.hoisted(() => vi.fn());
const mockFormatResults = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/sync/integration-health-check.js', () => ({
  checkJiraIntegration: mockCheckJira,
  checkAdoIntegration: mockCheckAdo,
  checkGitHubIntegration: mockCheckGitHub,
  formatHealthCheckResults: mockFormatResults,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  default: { existsSync: mockExistsSync, readFileSync: mockReadFileSync },
}));

vi.mock('chalk', () => {
  const identity = (s: string) => s;
  const chainable: any = new Proxy(identity, {
    get: () => chainable,
    apply: (_t: any, _this: any, args: any[]) => args[0],
  });
  return { default: chainable };
});

import { syncHealthCommand, runHealthChecksForConfig } from '../../../../src/cli/commands/sync-health.js';

describe('sync-health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('runHealthChecksForConfig', () => {
    it('runs GitHub health check when github is configured', async () => {
      mockCheckGitHub.mockResolvedValue({
        provider: 'github',
        checks: [{ name: 'GitHub CLI', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const config = { repository: { provider: 'github' } };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(mockCheckGitHub).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('github');
    });

    it('runs JIRA health check when jira is configured', async () => {
      mockCheckJira.mockResolvedValue({
        provider: 'jira',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'token123';

      const config = {
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net', projects: [{ key: 'TEST' }] },
        sync: { jira: { enabled: true } },
      };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(mockCheckJira).toHaveBeenCalledWith({
        domain: 'test.atlassian.net',
        projectKey: 'TEST',
        email: 'test@example.com',
        apiToken: 'token123',
      });
      expect(results).toHaveLength(1);
      expect(results[0].healthy).toBe(true);

      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    it('returns fail result when JIRA credentials missing', async () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;

      const config = {
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net' },
        sync: { jira: { enabled: true } },
      };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(results).toHaveLength(1);
      expect(results[0].healthy).toBe(false);
      expect(results[0].checks[0].status).toBe('fail');
      expect(results[0].checks[0].fix).toContain('JIRA');
    });

    it('runs ADO health check when ado is configured', async () => {
      mockCheckAdo.mockResolvedValue({
        provider: 'ado',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      process.env.ADO_PAT = 'pat123';

      const config = {
        issueTracker: { provider: 'ado', organization_ado: 'myorg', project: 'myproj' },
        sync: { ado: { enabled: true } },
      };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(mockCheckAdo).toHaveBeenCalledWith({
        organization: 'myorg',
        project: 'myproj',
        pat: 'pat123',
      });
      expect(results[0].healthy).toBe(true);

      delete process.env.ADO_PAT;
    });

    it('runs ADO health check with AZURE_DEVOPS_PAT alias', async () => {
      mockCheckAdo.mockResolvedValue({
        provider: 'ado',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const originalAdoPat = process.env.ADO_PAT;
      const originalAzurePat = process.env.AZURE_DEVOPS_PAT;
      delete process.env.ADO_PAT;
      process.env.AZURE_DEVOPS_PAT = 'azure-pat123';

      const config = {
        issueTracker: { provider: 'ado', organization_ado: 'myorg', project: 'myproj' },
        sync: { ado: { enabled: true } },
      };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(mockCheckAdo).toHaveBeenCalledWith({
        organization: 'myorg',
        project: 'myproj',
        pat: 'azure-pat123',
      });
      expect(results[0].healthy).toBe(true);

      if (originalAdoPat === undefined) {
        delete process.env.ADO_PAT;
      } else {
        process.env.ADO_PAT = originalAdoPat;
      }
      if (originalAzurePat === undefined) {
        delete process.env.AZURE_DEVOPS_PAT;
      } else {
        process.env.AZURE_DEVOPS_PAT = originalAzurePat;
      }
    });

    it('runs ADO health check for azure-devops issueTracker alias', async () => {
      mockCheckAdo.mockResolvedValue({
        provider: 'ado',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const originalAzurePat = process.env.AZURE_DEVOPS_PAT;
      process.env.AZURE_DEVOPS_PAT = 'azure-pat123';

      const config = {
        issueTracker: { provider: 'azure-devops', organization_ado: 'myorg', project: 'myproj' },
      };
      const results = await runHealthChecksForConfig(config, '/tmp');

      expect(mockCheckAdo).toHaveBeenCalledWith({
        organization: 'myorg',
        project: 'myproj',
        pat: 'azure-pat123',
      });
      expect(results[0].healthy).toBe(true);

      if (originalAzurePat === undefined) {
        delete process.env.AZURE_DEVOPS_PAT;
      } else {
        process.env.AZURE_DEVOPS_PAT = originalAzurePat;
      }
    });

    it('loads JIRA credentials from project .env', async () => {
      mockExistsSync.mockImplementation((filePath: string) => filePath.endsWith('/.env'));
      mockReadFileSync.mockReturnValue([
        'JIRA_EMAIL=test@example.com',
        'JIRA_API_TOKEN=token123',
      ].join('\n'));
      mockCheckJira.mockResolvedValue({
        provider: 'jira',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const config = {
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net', projects: [{ key: 'TEST' }] },
      };
      await runHealthChecksForConfig(config, '/tmp/project');

      expect(mockCheckJira).toHaveBeenCalledWith({
        domain: 'test.atlassian.net',
        projectKey: 'TEST',
        email: 'test@example.com',
        apiToken: 'token123',
      });
    });

    it('loads ADO credentials from project .env aliases', async () => {
      mockExistsSync.mockImplementation((filePath: string) => filePath.endsWith('/.env'));
      mockReadFileSync.mockReturnValue([
        'AZURE_DEVOPS_ORG=myorg',
        'ADO_PROJECT=myproj',
        'AZURE_DEVOPS_TOKEN=token123',
      ].join('\n'));
      mockCheckAdo.mockResolvedValue({
        provider: 'ado',
        checks: [{ name: 'API Auth', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const config = {
        issueTracker: { provider: 'azure-devops' },
      };
      await runHealthChecksForConfig(config, '/tmp/project');

      expect(mockCheckAdo).toHaveBeenCalledWith({
        organization: 'myorg',
        project: 'myproj',
        pat: 'token123',
      });
    });

    it('returns empty array when no providers configured', async () => {
      const config = {};
      const results = await runHealthChecksForConfig(config, '/tmp');
      expect(results).toHaveLength(0);
    });
  });

  describe('syncHealthCommand', () => {
    it('returns exit code 1 when no specweave project', async () => {
      mockExistsSync.mockReturnValue(false);
      const exitCode = await syncHealthCommand();
      expect(exitCode).toBe(1);
    });

    it('returns exit code 2 when no providers configured', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({}));
      const exitCode = await syncHealthCommand();
      expect(exitCode).toBe(2);
    });

    it('returns exit code 0 when all checks pass', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        repository: { provider: 'github' },
      }));
      mockCheckGitHub.mockResolvedValue({
        provider: 'github',
        checks: [{ name: 'GitHub CLI', status: 'pass', message: 'ok' }],
        healthy: true,
      });
      mockFormatResults.mockReturnValue('All healthy');

      const exitCode = await syncHealthCommand();
      expect(exitCode).toBe(0);
    });

    it('returns exit code 1 when any check fails', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        repository: { provider: 'github' },
      }));
      mockCheckGitHub.mockResolvedValue({
        provider: 'github',
        checks: [{ name: 'GitHub CLI', status: 'fail', message: 'not authed' }],
        healthy: false,
      });
      mockFormatResults.mockReturnValue('Failed');

      const exitCode = await syncHealthCommand();
      expect(exitCode).toBe(1);
    });

    it('outputs JSON when --json flag is set', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        repository: { provider: 'github' },
      }));
      mockCheckGitHub.mockResolvedValue({
        provider: 'github',
        checks: [{ name: 'GitHub CLI', status: 'pass', message: 'ok' }],
        healthy: true,
      });

      const logSpy = vi.spyOn(console, 'log');
      await syncHealthCommand({ json: true });

      const jsonOutput = logSpy.mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('"results"')
      );
      expect(jsonOutput).toBeDefined();
      const parsed = JSON.parse(jsonOutput![0]);
      expect(parsed.healthy).toBe(true);
      expect(parsed.results).toHaveLength(1);
    });
  });
});
