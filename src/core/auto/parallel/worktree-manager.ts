/**
 * Worktree Manager
 *
 * Manages git worktrees for parallel agent isolation.
 * Each agent works in its own worktree with a dedicated branch.
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import type { AgentDomain, WorktreeInfo } from '../types.js';
import { normalizePath, timestamp, isWindows } from './platform-utils.js';

export interface WorktreeCreateOptions {
  agentId: string;
  branchName?: string;
  baseBranch?: string;
}

export interface WorktreeRemoveOptions {
  force?: boolean;
  deleteBranch?: boolean;
}

export interface MergeResult {
  success: boolean;
  conflicts?: string[];
  error?: string;
}

/**
 * WorktreeManager handles git worktree operations for parallel agents.
 */
export class WorktreeManager {
  private readonly rootPath: string;
  private readonly worktreesDir: string;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
    this.worktreesDir = join(this.rootPath, '.specweave', 'worktrees');
  }

  /**
   * Create a new worktree for an agent
   */
  async create(options: WorktreeCreateOptions): Promise<WorktreeInfo> {
    const { agentId, branchName, baseBranch = 'HEAD' } = options;

    // Ensure worktrees directory exists
    if (!existsSync(this.worktreesDir)) {
      mkdirSync(this.worktreesDir, { recursive: true });
    }

    const worktreePath = join(this.worktreesDir, agentId);
    const branch = branchName || this.generateBranchName(agentId);

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      throw new Error(`Worktree already exists at ${worktreePath}`);
    }

    // Create worktree with new branch
    try {
      const result = spawnSync(
        'git',
        ['worktree', 'add', '-b', branch, worktreePath, baseBranch],
        {
          cwd: this.rootPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      if (result.status !== 0) {
        throw new Error(`Failed to create worktree: ${result.stderr || result.stdout}`);
      }

      return {
        path: normalizePath(worktreePath),
        branch,
        agentId,
        createdAt: timestamp(),
        locked: false,
      };
    } catch (error) {
      // Clean up on failure
      if (existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * Remove a worktree
   */
  async remove(agentId: string, options: WorktreeRemoveOptions = {}): Promise<void> {
    const { force = false, deleteBranch = false } = options;
    const worktreePath = join(this.worktreesDir, agentId);

    if (!existsSync(worktreePath)) {
      // Not an error - worktree might have been cleaned up already
      return;
    }

    // Get branch name before removing
    let branchName: string | undefined;
    if (deleteBranch) {
      branchName = this.getBranch(agentId);
    }

    // Remove the worktree
    const args = ['worktree', 'remove'];
    if (force) {
      args.push('--force');
    }
    args.push(worktreePath);

    const result = spawnSync('git', args, {
      cwd: this.rootPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status !== 0) {
      // If force removal failed, try manual cleanup
      if (force && existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true });
        // Prune worktree list
        spawnSync('git', ['worktree', 'prune'], {
          cwd: this.rootPath,
          encoding: 'utf-8',
        });
      } else {
        throw new Error(`Failed to remove worktree: ${result.stderr || result.stdout}`);
      }
    }

    // Delete the branch if requested
    if (deleteBranch && branchName) {
      spawnSync('git', ['branch', '-D', branchName], {
        cwd: this.rootPath,
        encoding: 'utf-8',
      });
    }
  }

  /**
   * List all worktrees
   */
  list(): WorktreeInfo[] {
    const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: this.rootPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status !== 0) {
      return [];
    }

    const worktrees: WorktreeInfo[] = [];
    const entries = result.stdout.split('\n\n').filter((e) => e.trim());

    for (const entry of entries) {
      const lines = entry.split('\n');
      const pathLine = lines.find((l) => l.startsWith('worktree '));
      const branchLine = lines.find((l) => l.startsWith('branch '));
      const isLocked = lines.some((l) => l.startsWith('locked'));

      if (pathLine) {
        const worktreePath = pathLine.replace('worktree ', '').trim();

        // Only include worktrees in our worktrees directory
        if (worktreePath.includes('.specweave/worktrees/')) {
          const agentId = worktreePath.split('/').pop() || '';
          const branch = branchLine ? branchLine.replace('branch refs/heads/', '').trim() : '';

          worktrees.push({
            path: normalizePath(worktreePath),
            branch,
            agentId,
            createdAt: '', // Not available from git worktree list
            locked: isLocked,
          });
        }
      }
    }

    return worktrees;
  }

  /**
   * Check if a worktree is locked
   */
  isLocked(agentId: string): boolean {
    const worktrees = this.list();
    const worktree = worktrees.find((w) => w.agentId === agentId);
    return worktree?.locked ?? false;
  }

  /**
   * Lock a worktree
   */
  lock(agentId: string, reason?: string): boolean {
    const worktreePath = join(this.worktreesDir, agentId);
    if (!existsSync(worktreePath)) {
      return false;
    }

    const args = ['worktree', 'lock', worktreePath];
    if (reason) {
      args.push('--reason', reason);
    }

    const result = spawnSync('git', args, {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    return result.status === 0;
  }

  /**
   * Unlock a worktree
   */
  unlock(agentId: string): boolean {
    const worktreePath = join(this.worktreesDir, agentId);
    if (!existsSync(worktreePath)) {
      return false;
    }

    const result = spawnSync('git', ['worktree', 'unlock', worktreePath], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    return result.status === 0;
  }

  /**
   * Get the branch name for a worktree
   */
  getBranch(agentId: string): string | undefined {
    const worktreePath = join(this.worktreesDir, agentId);
    if (!existsSync(worktreePath)) {
      return undefined;
    }

    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: worktreePath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return undefined;
    }

    return result.stdout.trim();
  }

  /**
   * Clean up stale worktrees
   */
  cleanup(): void {
    // First, prune any dangling worktree entries
    spawnSync('git', ['worktree', 'prune'], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    // Remove any orphaned directories in worktrees folder
    if (existsSync(this.worktreesDir)) {
      const entries = readdirSync(this.worktreesDir);
      const activeWorktrees = this.list().map((w) => w.agentId);

      for (const entry of entries) {
        if (!activeWorktrees.includes(entry)) {
          const entryPath = join(this.worktreesDir, entry);
          rmSync(entryPath, { recursive: true, force: true });
        }
      }
    }
  }

  /**
   * Generate a branch name for an agent
   */
  generateBranchName(agentId: string, domain?: AgentDomain, incrementId?: string): string {
    const parts = ['auto'];

    if (domain) {
      parts.push(domain);
    }

    if (incrementId) {
      parts.push(incrementId);
    }

    parts.push(agentId.slice(-8)); // Last 8 chars of agent ID

    return parts.join('/');
  }

  /**
   * Merge a worktree branch into the base branch
   */
  async merge(agentId: string, baseBranch: string = 'main'): Promise<MergeResult> {
    const branch = this.getBranch(agentId);
    if (!branch) {
      return {
        success: false,
        error: `Could not find branch for agent ${agentId}`,
      };
    }

    // First, switch to base branch
    const checkoutResult = spawnSync('git', ['checkout', baseBranch], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (checkoutResult.status !== 0) {
      return {
        success: false,
        error: `Failed to checkout ${baseBranch}: ${checkoutResult.stderr}`,
      };
    }

    // Merge the agent's branch
    const mergeResult = spawnSync('git', ['merge', '--no-ff', branch, '-m', `Merge ${branch}`], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (mergeResult.status !== 0) {
      // Check for conflicts
      const conflicts = this.detectConflicts();
      if (conflicts.length > 0) {
        // Abort the merge
        spawnSync('git', ['merge', '--abort'], { cwd: this.rootPath, encoding: 'utf-8' });
        return {
          success: false,
          conflicts,
          error: 'Merge conflicts detected',
        };
      }

      return {
        success: false,
        error: `Merge failed: ${mergeResult.stderr}`,
      };
    }

    return { success: true };
  }

  /**
   * Detect merge conflicts
   */
  detectConflicts(): string[] {
    const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0 || !result.stdout.trim()) {
      return [];
    }

    return result.stdout
      .trim()
      .split('\n')
      .filter((f) => f.trim());
  }

  /**
   * Check if there are conflicts between a branch and the base
   */
  async hasConflicts(agentId: string, baseBranch: string = 'main'): Promise<boolean> {
    const branch = this.getBranch(agentId);
    if (!branch) {
      return false;
    }

    // Use merge-tree to check for conflicts without actually merging
    const result = spawnSync('git', ['merge-tree', baseBranch, branch], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    // If output contains conflict markers, there are conflicts
    return result.stdout.includes('<<<<<<<') || result.stdout.includes('>>>>>>>');
  }

  /**
   * Compute merge order for agents based on domain dependencies
   * Order: database -> backend -> frontend -> devops/qa
   */
  computeMergeOrder(agents: Array<{ id: string; domain: AgentDomain }>): string[] {
    const domainOrder: Record<AgentDomain, number> = {
      database: 0,
      backend: 1,
      frontend: 2,
      devops: 3,
      qa: 4,
      general: 5,
    };

    return agents
      .slice()
      .sort((a, b) => domainOrder[a.domain] - domainOrder[b.domain])
      .map((a) => a.id);
  }

  /**
   * Get the worktrees directory path
   */
  getWorktreesDir(): string {
    return this.worktreesDir;
  }

  /**
   * Check if a worktree exists
   */
  exists(agentId: string): boolean {
    const worktreePath = join(this.worktreesDir, agentId);
    return existsSync(worktreePath);
  }

  /**
   * Get worktree path for an agent
   */
  getPath(agentId: string): string {
    return join(this.worktreesDir, agentId);
  }
}
