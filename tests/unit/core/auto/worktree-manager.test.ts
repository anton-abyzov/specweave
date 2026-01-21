/**
 * Worktree Manager Tests
 *
 * Tests for git worktree operations.
 * Target: 90%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { join } from 'path';

// Mock modules
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Import after mocking
import { WorktreeManager } from '../../../../src/core/auto/parallel/worktree-manager.js';
import type { AgentDomain } from '../../../../src/core/auto/types.js';

describe('WorktreeManager', () => {
  const rootPath = '/test/project';
  let manager: WorktreeManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorktreeManager(rootPath);

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(childProcess.spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      pid: 1234,
      output: [],
      signal: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // CREATION TESTS
  // ============================================================================

  describe('create', () => {
    it('should create a new worktree', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: 'Preparing worktree',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = await manager.create({
        agentId: 'agent-123',
        branchName: 'auto/test',
      });

      expect(result.agentId).toBe('agent-123');
      expect(result.branch).toBe('auto/test');
      expect(result.locked).toBe(false);
      expect(result.path).toContain('agent-123');
    });

    it('should create worktrees directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (String(p).includes('worktrees')) return false;
        return false;
      });

      await manager.create({ agentId: 'agent-new' });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/worktrees'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should throw if worktree already exists', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (String(p).includes('agent-exists')) return true;
        return false;
      });

      await expect(manager.create({ agentId: 'agent-exists' })).rejects.toThrow(
        'Worktree already exists'
      );
    });

    it('should throw if git worktree add fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'fatal: branch already exists',
        pid: 1234,
        output: [],
        signal: null,
      });

      await expect(manager.create({ agentId: 'agent-fail' })).rejects.toThrow(
        'Failed to create worktree'
      );
    });

    it('should clean up on creation failure', async () => {
      let callCount = 0;
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        callCount++;
        // First call: check if worktrees dir exists - return true
        // Second call: check if worktree path exists before creation - return false
        // Third call (in catch): check if worktree path exists for cleanup - return true
        if (callCount === 1) return true; // worktrees dir exists
        if (callCount === 2) return false; // worktree doesn't exist yet
        if (callCount >= 3) return true; // worktree exists (for cleanup)
        return false;
      });
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 1,
        stderr: 'error',
        stdout: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      await expect(manager.create({ agentId: 'agent-cleanup' })).rejects.toThrow();
      expect(fs.rmSync).toHaveBeenCalled();
    });

    it('should use custom base branch', async () => {
      await manager.create({
        agentId: 'agent-custom',
        baseBranch: 'develop',
      });

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['develop']),
        expect.any(Object)
      );
    });

    it('should generate branch name if not provided', async () => {
      const result = await manager.create({ agentId: 'agent-auto-branch' });

      expect(result.branch).toContain('auto');
    });
  });

  // ============================================================================
  // REMOVAL TESTS
  // ============================================================================

  describe('remove', () => {
    it('should remove an existing worktree', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      await manager.remove('agent-remove');

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['worktree', 'remove']),
        expect.any(Object)
      );
    });

    it('should not throw if worktree does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(manager.remove('agent-notfound')).resolves.toBeUndefined();
    });

    it('should force remove if specified', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await manager.remove('agent-force', { force: true });

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['--force']),
        expect.any(Object)
      );
    });

    it('should delete branch if specified', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch call
          status: 0,
          stdout: 'auto/test-branch\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // worktree remove call
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // branch delete call
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        });

      await manager.remove('agent-delbranch', { deleteBranch: true });

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', '-D']),
        expect.any(Object)
      );
    });

    it('should handle force removal failure with manual cleanup', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
        status: 1,
        stderr: 'locked',
        stdout: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      await manager.remove('agent-locked', { force: true });

      expect(fs.rmSync).toHaveBeenCalled();
    });

    it('should throw if non-force removal fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 1,
        stderr: 'worktree is locked',
        stdout: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      await expect(manager.remove('agent-fail')).rejects.toThrow('Failed to remove worktree');
    });
  });

  // ============================================================================
  // LIST TESTS
  // ============================================================================

  describe('list', () => {
    it('should return empty array if git command fails', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 1,
        stderr: 'error',
        stdout: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.list();
      expect(result).toEqual([]);
    });

    it('should parse worktree list output', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: `worktree /test/project
HEAD abc123
branch refs/heads/main

worktree /test/project/.specweave/worktrees/agent-1
HEAD def456
branch refs/heads/auto/frontend

worktree /test/project/.specweave/worktrees/agent-2
HEAD ghi789
branch refs/heads/auto/backend
locked`,
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.list();

      expect(result).toHaveLength(2);
      expect(result[0].agentId).toBe('agent-1');
      expect(result[0].branch).toBe('auto/frontend');
      expect(result[0].locked).toBe(false);
      expect(result[1].agentId).toBe('agent-2');
      expect(result[1].locked).toBe(true);
    });

    it('should only include worktrees in specweave directory', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: `worktree /other/location
HEAD abc123
branch refs/heads/feature

worktree /test/project/.specweave/worktrees/agent-1
HEAD def456
branch refs/heads/auto/test`,
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.list();

      expect(result).toHaveLength(1);
      expect(result[0].agentId).toBe('agent-1');
    });
  });

  // ============================================================================
  // LOCK TESTS
  // ============================================================================

  describe('isLocked', () => {
    it('should return true for locked worktree', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: `worktree /test/project/.specweave/worktrees/agent-locked
HEAD abc123
branch refs/heads/auto/test
locked`,
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      expect(manager.isLocked('agent-locked')).toBe(true);
    });

    it('should return false for unlocked worktree', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: `worktree /test/project/.specweave/worktrees/agent-unlocked
HEAD abc123
branch refs/heads/auto/test`,
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      expect(manager.isLocked('agent-unlocked')).toBe(false);
    });

    it('should return false for non-existent worktree', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      expect(manager.isLocked('agent-notfound')).toBe(false);
    });
  });

  describe('lock', () => {
    it('should lock a worktree', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.lock('agent-lock');

      expect(result).toBe(true);
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['worktree', 'lock']),
        expect.any(Object)
      );
    });

    it('should lock with reason', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      manager.lock('agent-lock', 'Test reason');

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['--reason', 'Test reason']),
        expect.any(Object)
      );
    });

    it('should return false if worktree does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = manager.lock('agent-notfound');

      expect(result).toBe(false);
    });
  });

  describe('unlock', () => {
    it('should unlock a worktree', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.unlock('agent-unlock');

      expect(result).toBe(true);
    });

    it('should return false if worktree does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = manager.unlock('agent-notfound');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // BRANCH TESTS
  // ============================================================================

  describe('getBranch', () => {
    it('should return branch name for existing worktree', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: 'auto/feature-branch\n',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.getBranch('agent-branch');

      expect(result).toBe('auto/feature-branch');
    });

    it('should return undefined if worktree does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = manager.getBranch('agent-notfound');

      expect(result).toBeUndefined();
    });

    it('should return undefined if git command fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 1,
        stderr: 'error',
        stdout: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.getBranch('agent-fail');

      expect(result).toBeUndefined();
    });
  });

  describe('generateBranchName', () => {
    it('should generate branch name with agent ID only', () => {
      const result = manager.generateBranchName('agent-12345678');

      expect(result).toBe('auto/12345678');
    });

    it('should generate branch name with domain', () => {
      const result = manager.generateBranchName('agent-12345678', 'frontend');

      expect(result).toBe('auto/frontend/12345678');
    });

    it('should generate branch name with domain and increment', () => {
      const result = manager.generateBranchName('agent-12345678', 'backend', '0170');

      expect(result).toBe('auto/backend/0170/12345678');
    });
  });

  // ============================================================================
  // CLEANUP TESTS
  // ============================================================================

  describe('cleanup', () => {
    it('should prune dangling worktrees', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      manager.cleanup();

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'git',
        ['worktree', 'prune'],
        expect.any(Object)
      );
    });

    it('should remove orphaned directories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['orphan-agent', 'active-agent'] as any);
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: `worktree /test/project/.specweave/worktrees/active-agent
HEAD abc123
branch refs/heads/auto/test`,
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      manager.cleanup();

      // Should remove orphan-agent but not active-agent
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining('orphan-agent'),
        expect.objectContaining({ recursive: true, force: true })
      );
    });
  });

  // ============================================================================
  // MERGE TESTS
  // ============================================================================

  describe('merge', () => {
    it('should merge worktree branch successfully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch
          status: 0,
          stdout: 'auto/feature\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // checkout
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // merge
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        });

      const result = await manager.merge('agent-merge', 'main');

      expect(result.success).toBe(true);
    });

    it('should return error if branch not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await manager.merge('agent-notfound');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find branch');
    });

    it('should return error if checkout fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch
          status: 0,
          stdout: 'auto/feature\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // checkout fails
          status: 1,
          stdout: '',
          stderr: 'error: checkout failed',
          pid: 1234,
          output: [],
          signal: null,
        });

      const result = await manager.merge('agent-checkout-fail');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to checkout');
    });

    it('should detect and report conflicts', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch
          status: 0,
          stdout: 'auto/feature\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // checkout
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // merge fails
          status: 1,
          stdout: '',
          stderr: 'CONFLICT',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // detectConflicts
          status: 0,
          stdout: 'file1.ts\nfile2.ts\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // merge --abort
          status: 0,
          stdout: '',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        });

      const result = await manager.merge('agent-conflict');

      expect(result.success).toBe(false);
      expect(result.conflicts).toContain('file1.ts');
      expect(result.conflicts).toContain('file2.ts');
    });
  });

  describe('detectConflicts', () => {
    it('should return list of conflicting files', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: 'file1.ts\nfile2.ts\n',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.detectConflicts();

      expect(result).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should return empty array if no conflicts', () => {
      vi.mocked(childProcess.spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
        pid: 1234,
        output: [],
        signal: null,
      });

      const result = manager.detectConflicts();

      expect(result).toEqual([]);
    });
  });

  describe('hasConflicts', () => {
    it('should return true if merge-tree shows conflicts', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch
          status: 0,
          stdout: 'auto/feature\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // merge-tree
          status: 0,
          stdout: '<<<<<<< HEAD\nsome content\n=======\nother content\n>>>>>>>',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        });

      const result = await manager.hasConflicts('agent-conflict');

      expect(result).toBe(true);
    });

    it('should return false if no conflicts', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.spawnSync)
        .mockReturnValueOnce({
          // getBranch
          status: 0,
          stdout: 'auto/feature\n',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        })
        .mockReturnValueOnce({
          // merge-tree
          status: 0,
          stdout: 'clean merge output',
          stderr: '',
          pid: 1234,
          output: [],
          signal: null,
        });

      const result = await manager.hasConflicts('agent-clean');

      expect(result).toBe(false);
    });

    it('should return false if branch not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await manager.hasConflicts('agent-notfound');

      expect(result).toBe(false);
    });
  });

  describe('computeMergeOrder', () => {
    it('should order database first, backend second, frontend last', () => {
      const agents: Array<{ id: string; domain: AgentDomain }> = [
        { id: 'agent-fe', domain: 'frontend' },
        { id: 'agent-db', domain: 'database' },
        { id: 'agent-be', domain: 'backend' },
      ];

      const result = manager.computeMergeOrder(agents);

      expect(result).toEqual(['agent-db', 'agent-be', 'agent-fe']);
    });

    it('should handle all domains', () => {
      const agents: Array<{ id: string; domain: AgentDomain }> = [
        { id: 'agent-gen', domain: 'general' },
        { id: 'agent-qa', domain: 'qa' },
        { id: 'agent-dev', domain: 'devops' },
        { id: 'agent-fe', domain: 'frontend' },
        { id: 'agent-be', domain: 'backend' },
        { id: 'agent-db', domain: 'database' },
      ];

      const result = manager.computeMergeOrder(agents);

      expect(result[0]).toBe('agent-db');
      expect(result[1]).toBe('agent-be');
      expect(result[2]).toBe('agent-fe');
    });
  });

  // ============================================================================
  // UTILITY TESTS
  // ============================================================================

  describe('getWorktreesDir', () => {
    it('should return worktrees directory path', () => {
      const result = manager.getWorktreesDir();

      expect(result).toContain('.specweave');
      expect(result).toContain('worktrees');
    });
  });

  describe('exists', () => {
    it('should return true if worktree exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(manager.exists('agent-exists')).toBe(true);
    });

    it('should return false if worktree does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(manager.exists('agent-notfound')).toBe(false);
    });
  });

  describe('getPath', () => {
    it('should return worktree path for agent', () => {
      const result = manager.getPath('agent-123');

      expect(result).toContain('agent-123');
      expect(result).toContain('.specweave/worktrees');
    });
  });
});
