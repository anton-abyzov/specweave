/**
 * Get command clone path tests (increment 0581 - T-028)
 *
 * Asserts that `specweave get <url>` resolves the clone target to
 * repositories/owner/repo within an umbrella workspace.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

const mockCloneRepo = vi.hoisted(() => vi.fn());
const mockRegisterRepo = vi.hoisted(() => vi.fn());
const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
const mockDetectRepository = vi.hoisted(() => vi.fn());
const mockProcessExit = vi.hoisted(() => vi.fn());

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
  parseBulkSource: vi.fn().mockReturnValue(null),
  getAuthToken: vi.fn(),
  buildBulkRepoList: vi.fn(),
}));
vi.mock('../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: vi.fn(),
}));
vi.mock('fs', () => mockFs);

vi.spyOn(console, 'log').mockImplementation(() => {});

import { getCommand } from '../../../../src/cli/commands/get.js';

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, '.specweave', 'config.json');

const umbrellaConfig = JSON.stringify({
  umbrella: { enabled: true, childRepos: [] },
});

describe('AC-US6-04: specweave get clones into repositories/owner/repo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCloneRepo.mockResolvedValue({
      cloned: true,
      repoPath: path.join(projectRoot, 'repositories', 'owner', 'repo'),
    });
    mockRegisterRepo.mockResolvedValue({ registered: true, alreadyRegistered: false });
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', success: true });

    mockFs.existsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue(umbrellaConfig);
  });

  it('HTTPS URL clones to repositories/owner/repo', async () => {
    await getCommand('https://github.com/owner/repo');

    const expectedTarget = path.join(projectRoot, 'repositories', 'owner', 'repo');
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'owner', repo: 'repo', type: 'github' }),
      expectedTarget,
      expect.any(Object),
    );
  });

  it('shorthand owner/repo clones to repositories/owner/repo', async () => {
    await getCommand('owner/repo');

    const expectedTarget = path.join(projectRoot, 'repositories', 'owner', 'repo');
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'owner', repo: 'repo' }),
      expectedTarget,
      expect.any(Object),
    );
  });

  it('SSH URL clones to repositories/owner/repo', async () => {
    await getCommand('git@github.com:owner/repo');

    const expectedTarget = path.join(projectRoot, 'repositories', 'owner', 'repo');
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'owner', repo: 'repo' }),
      expectedTarget,
      expect.any(Object),
    );
  });

  it('URL with .git suffix still resolves to repositories/owner/repo', async () => {
    await getCommand('https://github.com/owner/repo.git');

    const expectedTarget = path.join(projectRoot, 'repositories', 'owner', 'repo');
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'owner', repo: 'repo' }),
      expectedTarget,
      expect.any(Object),
    );
  });

  it('registers the repo in umbrella config after clone', async () => {
    await getCommand('https://github.com/owner/repo');

    expect(mockRegisterRepo).toHaveBeenCalledWith(
      projectRoot,
      'owner',
      'repo',
      expect.stringContaining(path.join('repositories', 'owner', 'repo')),
      expect.any(Object),
    );
  });

  it('unknown owner falls back to repositories/_unknown/repo', async () => {
    // Generic git URL with no GitHub owner detection
    await getCommand('https://gitlab.com/someorg/myrepo');

    const expectedTarget = path.join(projectRoot, 'repositories', 'someorg', 'myrepo');
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'someorg', repo: 'myrepo' }),
      expectedTarget,
      expect.any(Object),
    );
  });
});
