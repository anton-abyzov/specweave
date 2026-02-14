/**
 * ADO Repo Cloning Tests
 *
 * Tests for triggerAdoRepoCloning:
 * - Project name sanitization for filesystem paths
 * - ADO clone URL construction with PAT
 * - Multi-project repository fetching
 * - Pattern filtering and background job launching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLaunchCloneJob = vi.hoisted(() => vi.fn());
const mockFilterRepositoriesByPattern = vi.hoisted(() => vi.fn());
const mockListRepositories = vi.hoisted(() => vi.fn());

vi.mock('../../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: mockLaunchCloneJob
}));

vi.mock('../../../../../src/cli/helpers/selection-strategy.js', () => ({
  filterRepositoriesByPattern: mockFilterRepositoriesByPattern
}));

vi.mock('../../../../../src/core/repo-structure/providers/azure-devops-provider.js', () => {
  return {
    AzureDevOpsProvider: class {
      listRepositories = mockListRepositories;
    }
  };
});

// Suppress chalk output in tests
vi.mock('chalk', () => ({
  default: {
    gray: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    cyan: (s: string) => s,
  }
}));

import { triggerAdoRepoCloning } from '../../../../../src/cli/helpers/init/ado-repo-cloning.js';

describe('ado-repo-cloning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('sanitizeProjectNameForPath (tested via triggerAdoRepoCloning)', () => {
    // The sanitization is internal but we verify it through the clone URL paths

    it('converts spaces to hyphens in project names', async () => {
      const repos = [{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '' }];
      mockListRepositories.mockResolvedValue(repos);
      mockFilterRepositoriesByPattern.mockReturnValue(
        repos.map(r => ({ ...r, project: 'My Enterprise Project' }))
      );
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['My Enterprise Project'] },
        { strategy: 'all' }
      );

      // The display should show sanitized name (tested via console.log mock)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('my-enterprise-project')
      );
    });
  });

  describe('triggerAdoRepoCloning', () => {
    it('returns undefined when strategy is skip', async () => {
      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1'] },
        { strategy: 'skip' }
      );
      expect(result).toBeUndefined();
      expect(mockListRepositories).not.toHaveBeenCalled();
    });

    it('returns undefined when no projects selected', async () => {
      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: [] },
        { strategy: 'all' }
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when no PAT provided', async () => {
      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: '', projects: ['proj1'] },
        { strategy: 'all' }
      );
      expect(result).toBeUndefined();
    });

    it('fetches repos from each selected project', async () => {
      const repos1 = [{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '' }];
      const repos2 = [{ id: '2', name: 'repo-b', remoteUrl: '', sshUrl: '', webUrl: '' }];

      mockListRepositories
        .mockResolvedValueOnce(repos1)
        .mockResolvedValueOnce(repos2);

      const allWithProject = [
        { ...repos1[0], project: 'proj1' },
        { ...repos2[0], project: 'proj2' }
      ];
      mockFilterRepositoriesByPattern.mockReturnValue(allWithProject);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1', 'proj2'] },
        { strategy: 'all' }
      );

      expect(mockListRepositories).toHaveBeenCalledTimes(2);
      expect(mockListRepositories).toHaveBeenCalledWith('contoso', 'proj1', 'pat-test');
      expect(mockListRepositories).toHaveBeenCalledWith('contoso', 'proj2', 'pat-test');
      expect(result).toBe('job-123');
    });

    it('continues when one project fails to fetch', async () => {
      mockListRepositories
        .mockRejectedValueOnce(new Error('Access denied'))
        .mockResolvedValueOnce([{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '' }]);

      const repoWithProject = [{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '', project: 'proj2' }];
      mockFilterRepositoriesByPattern.mockReturnValue(repoWithProject);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1', 'proj2'] },
        { strategy: 'all' }
      );

      expect(result).toBe('job-123');
    });

    it('returns undefined when all projects fail to fetch', async () => {
      mockListRepositories.mockRejectedValue(new Error('Access denied'));

      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1'] },
        { strategy: 'all' }
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when pattern filters out all repos', async () => {
      mockListRepositories.mockResolvedValue([{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '' }]);
      mockFilterRepositoriesByPattern.mockReturnValue([]);

      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1'] },
        { strategy: 'pattern-glob', pattern: 'nonexistent-*' }
      );

      expect(result).toBeUndefined();
    });

    it('builds ADO clone URLs with PAT authentication', async () => {
      const repos = [{ id: '1', name: 'my-repo', remoteUrl: '', sshUrl: '', webUrl: '' }];
      mockListRepositories.mockResolvedValue(repos);
      mockFilterRepositoriesByPattern.mockReturnValue(
        repos.map(r => ({ ...r, project: 'MyProject' }))
      );
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'my-secret-pat', projects: ['MyProject'] },
        { strategy: 'all' }
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      expect(launchCall.repositories[0].cloneUrl).toContain('my-secret-pat@dev.azure.com');
      expect(launchCall.repositories[0].cloneUrl).toContain('contoso');
      expect(launchCall.repositories[0].cloneUrl).toContain('MyProject');
      expect(launchCall.repositories[0].cloneUrl).toContain('my-repo');
    });

    it('URL-encodes special characters in ADO clone URLs', async () => {
      const repos = [{ id: '1', name: 'repo with spaces', remoteUrl: '', sshUrl: '', webUrl: '' }];
      mockListRepositories.mockResolvedValue(repos);
      mockFilterRepositoriesByPattern.mockReturnValue(
        repos.map(r => ({ ...r, project: 'My Project' }))
      );
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['My Project'] },
        { strategy: 'all' }
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      const cloneUrl = launchCall.repositories[0].cloneUrl;
      // Spaces should be URL-encoded as %20
      expect(cloneUrl).toContain('My%20Project');
      expect(cloneUrl).toContain('repo%20with%20spaces');
    });

    it('uses repositories/{org}/{repo} path structure', async () => {
      const repos = [{ id: '1', name: 'my-repo', remoteUrl: '', sshUrl: '', webUrl: '' }];
      mockListRepositories.mockResolvedValue(repos);
      mockFilterRepositoriesByPattern.mockReturnValue(
        repos.map(r => ({ ...r, project: 'proj1' }))
      );
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1'] },
        { strategy: 'all' }
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      expect(launchCall.repositories[0].path).toBe('repositories/contoso/my-repo');
    });

    it('returns job ID for dependency tracking', async () => {
      const repos = [{ id: '1', name: 'repo-a', remoteUrl: '', sshUrl: '', webUrl: '' }];
      mockListRepositories.mockResolvedValue(repos);
      mockFilterRepositoriesByPattern.mockReturnValue(
        repos.map(r => ({ ...r, project: 'proj1' }))
      );
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'dep-tracking-job' },
        isBackground: true,
        pid: 1234
      });

      const result = await triggerAdoRepoCloning(
        '/project',
        { org: 'contoso', pat: 'pat-test', projects: ['proj1'] },
        { strategy: 'all' }
      );

      expect(result).toBe('dep-tracking-job');
    });
  });
});
