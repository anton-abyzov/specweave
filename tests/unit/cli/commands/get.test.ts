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
// Stub bulk-get so single-repo tests are unaffected (parseBulkSource always returns null here)
vi.mock('../../../../src/cli/helpers/get/bulk-get.js', () => ({
  parseBulkSource: vi.fn().mockReturnValue(null),
  getAuthToken: vi.fn(),
  buildBulkRepoList: vi.fn(),
}));
vi.mock('../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: vi.fn(),
}));
vi.mock('fs', () => mockFs);

// Silence console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

import { getCommand } from '../../../../src/cli/commands/get.js';

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, '.specweave', 'config.json');

const umbrellaConfig = JSON.stringify({
  umbrella: { enabled: true, childRepos: [] },
});

const workspaceConfig = JSON.stringify({
  version: '3.0',
  workspace: { name: 'workspace', repos: [] },
});

const nonUmbrellaConfig = JSON.stringify({
  umbrella: { enabled: false },
});

describe('getCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCloneRepo.mockResolvedValue({ cloned: true, repoPath: path.join(projectRoot, 'repositories', 'org', 'repo') });
    mockRegisterRepo.mockResolvedValue({ registered: true, alreadyRegistered: false });
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', success: true });

    // Default: config exists, umbrella enabled
    mockFs.existsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue(umbrellaConfig);
  });

  describe('AC-US4-01: umbrella workspace flow', () => {
    it('clones to repositories/org/repo/, registers, and inits', async () => {
      await getCommand('org/repo');

      expect(mockCloneRepo).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'org', repo: 'repo' }),
        expect.stringContaining(path.join('repositories', 'org', 'repo')),
        expect.any(Object)
      );
      expect(mockRegisterRepo).toHaveBeenCalled();
      expect(mockExecFileNoThrow).toHaveBeenCalledWith('specweave', ['init', '.'], expect.any(Object));
    });
  });

  describe('AC-US4-02: --no-init skips specweave init', () => {
    it('does not call specweave init when init=false', async () => {
      await getCommand('org/repo', { init: false });

      expect(mockExecFileNoThrow).not.toHaveBeenCalledWith('specweave', expect.anything(), expect.anything());
    });
  });

  describe('workspace config flow', () => {
    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(workspaceConfig);
    });

    it('clones to repositories/org/repo/, registers, and inits', async () => {
      await getCommand('org/repo');

      expect(mockCloneRepo).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'org', repo: 'repo' }),
        expect.stringContaining(path.join('repositories', 'org', 'repo')),
        expect.any(Object)
      );
      expect(mockRegisterRepo).toHaveBeenCalled();
      expect(mockExecFileNoThrow).toHaveBeenCalledWith('specweave', ['init', '.'], expect.any(Object));
    });

    it('registers local repos when workspace config is current schema', async () => {
      const localPath = path.join(projectRoot, 'repositories', 'org', 'my-service');
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === configPath) return true;
        if (p === localPath) return true;
        if (p === path.join(localPath, '.git')) return true;
        return false;
      });
      mockDetectRepository.mockResolvedValue({ owner: 'org', repo: 'my-service' });

      await getCommand(localPath, { init: false });

      expect(mockCloneRepo).not.toHaveBeenCalled();
      expect(mockRegisterRepo).toHaveBeenCalledWith(
        projectRoot,
        'org',
        'my-service',
        path.normalize('repositories/org/my-service'),
        expect.objectContaining({ prefix: undefined, role: undefined }),
      );
    });
  });

  describe('AC-US4-03: local path skips clone', () => {
    it('registers without cloning when local .git exists', async () => {
      const localPath = '/home/user/my-service';
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === configPath) return true;
        if (p === localPath) return true;
        if (p === path.join(localPath, '.git')) return true;
        return false;
      });
      mockDetectRepository.mockResolvedValue({ owner: 'org', repo: 'my-service' });

      await getCommand(localPath);

      expect(mockCloneRepo).not.toHaveBeenCalled();
      expect(mockRegisterRepo).toHaveBeenCalled();
    });
  });

  describe('AC-US4-04: --yes flag is accepted without error', () => {
    it('runs successfully with --yes', async () => {
      await expect(getCommand('org/repo', { yes: true })).resolves.not.toThrow();
    });
  });

  describe('AC-US4-05: dir exists but not registered — skips clone, completes registration', () => {
    it('skips clone (cloneRepo returns cloned=false) and still registers', async () => {
      mockCloneRepo.mockResolvedValue({ cloned: false, repoPath: path.join(projectRoot, 'repositories', 'org', 'repo'), skippedReason: 'already exists' });

      await getCommand('org/repo');

      expect(mockRegisterRepo).toHaveBeenCalled();
    });
  });

  describe('error cases', () => {
    it('exits 1 when not a SpecWeave project', async () => {
      mockFs.existsSync.mockReturnValue(false);
      vi.spyOn(process, 'exit').mockImplementation(mockProcessExit as any);

      await getCommand('org/repo');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('exits 1 on parse error', async () => {
      vi.spyOn(process, 'exit').mockImplementation(mockProcessExit as any);
      mockFs.existsSync.mockImplementation((p: string) => p === configPath);
      mockFs.readFileSync.mockReturnValue(umbrellaConfig);

      await getCommand('not-valid-no-slash');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('exits 1 when local path does not exist', async () => {
      vi.spyOn(process, 'exit').mockImplementation(mockProcessExit as any);
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === configPath) return true;
        return false; // local path missing
      });
      mockFs.readFileSync.mockReturnValue(umbrellaConfig);

      await getCommand('./nonexistent');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('exits 1 when clone fails', async () => {
      vi.spyOn(process, 'exit').mockImplementation(mockProcessExit as any);
      mockCloneRepo.mockRejectedValue(new Error('Authentication failed'));

      await getCommand('org/repo');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('non-umbrella workspace', () => {
    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(nonUmbrellaConfig);
    });

    it('clones to ./{repo}/ instead of repositories/{owner}/{repo}/', async () => {
      await getCommand('org/repo');

      expect(mockCloneRepo).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringMatching(/[/\\]repo$/),
        expect.any(Object)
      );
    });

    it('does not call registerRepo', async () => {
      await getCommand('org/repo');
      expect(mockRegisterRepo).not.toHaveBeenCalled();
    });
  });
});
