/**
 * Unit tests for `specweave get` bulk path
 * Verifies: bulk detection routes to launchCloneJob; single-repo path unchanged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

const mockCloneRepo = vi.hoisted(() => vi.fn());
const mockRegisterRepo = vi.hoisted(() => vi.fn());
const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
const mockDetectRepository = vi.hoisted(() => vi.fn());
const mockParseBulkSource = vi.hoisted(() => vi.fn());
const mockGetAuthToken = vi.hoisted(() => vi.fn());
const mockBuildBulkRepoList = vi.hoisted(() => vi.fn());
const mockLaunchCloneJob = vi.hoisted(() => vi.fn());

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: { mkdir: vi.fn() },
}));

vi.mock('../../../../src/cli/helpers/get/clone-repo.js', () => ({ cloneRepo: mockCloneRepo }));
vi.mock('../../../../src/cli/helpers/get/register-repo.js', () => ({ registerRepo: mockRegisterRepo }));
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({ execFileNoThrow: mockExecFileNoThrow }));
vi.mock('../../../../src/utils/git-utils.js', () => ({ detectRepository: mockDetectRepository }));
vi.mock('../../../../src/cli/helpers/get/bulk-get.js', () => ({
  parseBulkSource: mockParseBulkSource,
  getAuthToken: mockGetAuthToken,
  buildBulkRepoList: mockBuildBulkRepoList,
}));
vi.mock('../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: mockLaunchCloneJob,
}));
vi.mock('fs', () => mockFs);

vi.spyOn(console, 'log').mockImplementation(() => {});

import { getCommand } from '../../../../src/cli/commands/get.js';

const projectRoot = process.cwd();

const umbrellaConfig = JSON.stringify({
  umbrella: { enabled: true, childRepos: [] },
});

describe('getCommand — bulk path', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFs.existsSync.mockImplementation((p: string) =>
      p.endsWith('config.json') || p.endsWith('.specweave')
    );
    mockFs.readFileSync.mockReturnValue(umbrellaConfig);
    mockLaunchCloneJob.mockResolvedValue({ job: { id: 'job-123' }, isBackground: true });
    mockExecFileNoThrow.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, success: true });
  });

  it('calls launchCloneJob when parseBulkSource returns a result', async () => {
    mockParseBulkSource.mockReturnValue({ org: 'acme-corp', pattern: 'service-*' });
    mockGetAuthToken.mockResolvedValue('tok-abc');
    mockBuildBulkRepoList.mockResolvedValue([
      { owner: 'acme-corp', name: 'service-api', path: 'repositories/acme-corp/service-api', cloneUrl: 'https://github.com/acme-corp/service-api.git' },
      { owner: 'acme-corp', name: 'service-worker', path: 'repositories/acme-corp/service-worker', cloneUrl: 'https://github.com/acme-corp/service-worker.git' },
    ]);

    await getCommand('acme-corp/service-*', {});

    expect(mockLaunchCloneJob).toHaveBeenCalledWith({
      projectPath: projectRoot,
      repositories: expect.arrayContaining([
        expect.objectContaining({ name: 'service-api' }),
      ]),
    });
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  it('does NOT call launchCloneJob for single-repo (parseBulkSource returns null)', async () => {
    mockParseBulkSource.mockReturnValue(null);
    mockCloneRepo.mockResolvedValue({ cloned: true, repoPath: path.join(projectRoot, 'repositories/acme/repo') });
    mockRegisterRepo.mockResolvedValue({ alreadyRegistered: false });

    await getCommand('acme/repo', {});

    expect(mockLaunchCloneJob).not.toHaveBeenCalled();
    expect(mockCloneRepo).toHaveBeenCalled();
  });

  it('passes --all and --pattern options to parseBulkSource', async () => {
    mockParseBulkSource.mockReturnValue({ org: 'acme', pattern: 'svc-*' });
    mockGetAuthToken.mockResolvedValue('tok');
    mockBuildBulkRepoList.mockResolvedValue([]);

    await getCommand('acme', { all: true, pattern: 'svc-*' });

    expect(mockParseBulkSource).toHaveBeenCalledWith('acme', expect.objectContaining({ all: true, pattern: 'svc-*' }));
  });

  it('passes filtering options to buildBulkRepoList', async () => {
    mockParseBulkSource.mockReturnValue({ org: 'acme', pattern: null });
    mockGetAuthToken.mockResolvedValue('tok');
    mockBuildBulkRepoList.mockResolvedValue([]);

    await getCommand('acme/*', { noArchived: true, noForks: true, limit: 200 });

    expect(mockBuildBulkRepoList).toHaveBeenCalledWith(
      'acme', 'tok', null,
      expect.objectContaining({ noArchived: true, noForks: true, limit: 200 })
    );
  });

  it('exits early with error message when no repos match', async () => {
    mockParseBulkSource.mockReturnValue({ org: 'acme', pattern: 'nonexistent-*' });
    mockGetAuthToken.mockResolvedValue('tok');
    mockBuildBulkRepoList.mockResolvedValue([]);

    // Should not throw — just log and return
    await expect(getCommand('acme/nonexistent-*', {})).resolves.toBeUndefined();
    expect(mockLaunchCloneJob).not.toHaveBeenCalled();
  });
});
