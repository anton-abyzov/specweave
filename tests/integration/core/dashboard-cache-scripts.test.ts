/**
 * Dashboard Cache Scripts Integration Tests
 *
 * Tests for the bash scripts that manage the dashboard.json cache:
 * - rebuild-dashboard-cache.sh - Full cache rebuild
 * - read-progress.sh - Progress display (shows active work with progress bars)
 * - read-status.sh - Status overview (shows all increments by status category)
 *
 * These scripts handle increment status counting including:
 * - planning (and legacy "planned" synonym)
 * - active, backlog, paused, completed, abandoned
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
// CRITICAL: Import getCleanEnv to prevent NODE_OPTIONS debug flags from breaking child processes
import { getCleanEnv } from '../../test-utils/clean-env.js';

describe('Dashboard Cache Scripts', () => {
  let testDir: string;
  let incrementsDir: string;
  let stateDir: string;

  beforeEach(() => {
    // Create temp directory with proper structure
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-dashboard-test-'));
    const specweaveDir = path.join(testDir, '.specweave');
    incrementsDir = path.join(specweaveDir, 'increments');
    stateDir = path.join(specweaveDir, 'state');

    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create an increment with specific metadata
   */
  function createIncrement(
    id: string,
    status: string,
    type: string = 'feature',
    tasks: { total: number; completed: number } = { total: 0, completed: 0 }
  ): void {
    const incDir = path.join(incrementsDir, id);
    fs.mkdirSync(incDir, { recursive: true });

    const metadata = {
      id,
      status,
      type,
      priority: 'P1',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      tasks
    };

    fs.writeFileSync(
      path.join(incDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create tasks.md if tasks specified
    if (tasks.total > 0) {
      let tasksContent = '# Tasks\n\n';
      for (let i = 1; i <= tasks.total; i++) {
        const isCompleted = i <= tasks.completed;
        tasksContent += `### T-${String(i).padStart(3, '0')}: Task ${i}\n`;
        tasksContent += `**Status**: [${isCompleted ? 'x' : ' '}] ${isCompleted ? 'completed' : 'pending'}\n\n`;
      }
      fs.writeFileSync(path.join(incDir, 'tasks.md'), tasksContent);
    }
  }

  /**
   * Run rebuild script and return parsed cache
   */
  function rebuildCache(): any {
    const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/rebuild-dashboard-cache.sh');

    try {
      execSync(`bash "${scriptPath}" --quiet`, {
        cwd: testDir,
        env: { ...getCleanEnv(), PWD: testDir }
      });
    } catch (error) {
      // Script may not fail gracefully in all cases
      console.error('Cache rebuild failed:', error);
    }

    const cacheFile = path.join(stateDir, 'dashboard.json');
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
    return null;
  }

  describe('rebuild-dashboard-cache.sh', () => {
    it('should create cache with correct structure', () => {
      createIncrement('0001-test-feature', 'active', 'feature');

      const cache = rebuildCache();

      expect(cache).not.toBeNull();
      expect(cache).toHaveProperty('version');
      expect(cache).toHaveProperty('updatedAt');
      expect(cache).toHaveProperty('increments');
      expect(cache).toHaveProperty('summary');
      expect(cache.summary).toHaveProperty('active');
      expect(cache.summary).toHaveProperty('planning');
      expect(cache.summary).toHaveProperty('completed');
    });

    it('should count active increments correctly', () => {
      createIncrement('0001-active-1', 'active', 'feature');
      createIncrement('0002-active-2', 'active', 'bug');

      const cache = rebuildCache();

      expect(cache.summary.active).toBe(2);
    });

    it('should count planning increments (including legacy "planned")', () => {
      createIncrement('0001-planning', 'planning', 'feature');
      createIncrement('0002-planned-legacy', 'planned', 'feature'); // Legacy typo

      const cache = rebuildCache();

      // Both should count towards planning
      expect(cache.summary.planning).toBe(2);
    });

    it('should count completed increments', () => {
      createIncrement('0001-done', 'completed', 'feature');
      createIncrement('0002-done', 'completed', 'bug');
      createIncrement('0003-done', 'completed', 'refactor');

      const cache = rebuildCache();

      expect(cache.summary.completed).toBe(3);
    });

    it('should count backlog, paused, abandoned statuses', () => {
      createIncrement('0001-backlog', 'backlog', 'feature');
      createIncrement('0002-paused', 'paused', 'feature');
      createIncrement('0003-abandoned', 'abandoned', 'feature');

      const cache = rebuildCache();

      expect(cache.summary.backlog).toBe(1);
      expect(cache.summary.paused).toBe(1);
      expect(cache.summary.abandoned).toBe(1);
    });

    it('should store increment details with correct status', () => {
      createIncrement('0001-test', 'active', 'feature', { total: 5, completed: 2 });

      const cache = rebuildCache();

      expect(cache.increments['0001-test']).toBeDefined();
      expect(cache.increments['0001-test'].status).toBe('active');
      expect(cache.increments['0001-test'].type).toBe('feature');
      expect(cache.increments['0001-test'].tasks.total).toBe(5);
      expect(cache.increments['0001-test'].tasks.completed).toBe(2);
    });

    it('should handle empty increments directory', () => {
      const cache = rebuildCache();

      expect(cache).not.toBeNull();
      expect(cache.summary.total).toBe(0);
      expect(cache.summary.active).toBe(0);
    });

    it('should skip _archive directory', () => {
      createIncrement('0001-active', 'active', 'feature');

      // Create archived increment
      const archiveDir = path.join(incrementsDir, '_archive', '0002-archived');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, 'metadata.json'),
        JSON.stringify({
          id: '0002-archived',
          status: 'completed',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }, null, 2)
      );

      const cache = rebuildCache();

      expect(cache.summary.total).toBe(1); // Only non-archived
      expect(cache.increments['0002-archived']).toBeUndefined();
    });
  });

  describe('read-progress.sh', () => {
    /**
     * Run read-progress script and return output
     */
    function runProgressScript(args: string = ''): string {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-progress.sh');

      // First rebuild cache
      rebuildCache();

      try {
        return execSync(`bash "${scriptPath}" ${args}`, {
          cwd: testDir,
          env: { ...getCleanEnv(), PWD: testDir },
          encoding: 'utf-8'
        });
      } catch (error: any) {
        return error.stdout || error.message;
      }
    }

    it('should show active increments', () => {
      createIncrement('0001-my-feature', 'active', 'feature', { total: 10, completed: 5 });

      const output = runProgressScript();

      expect(output).toContain('0001-my-feature');
      expect(output).toContain('Active');
    });

    it('should show planning increments with indicator', () => {
      createIncrement('0001-planning-feature', 'planning', 'feature');

      const output = runProgressScript();

      expect(output).toContain('0001-planning-feature');
      expect(output).toMatch(/planning|📝/);
    });

    it('should show summary with counts', () => {
      createIncrement('0001-active', 'active', 'feature');
      createIncrement('0002-planning', 'planning', 'feature');
      createIncrement('0003-paused', 'paused', 'feature');

      const output = runProgressScript();

      expect(output).toContain('Summary');
    });

    it('should show "No active increments" when only completed', () => {
      createIncrement('0001-done', 'completed', 'feature');
      createIncrement('0002-done', 'completed', 'bug');

      const output = runProgressScript();

      expect(output).toMatch(/No active increments|completed/i);
    });

    it('should show progress bar with task count', () => {
      createIncrement('0001-in-progress', 'active', 'feature', { total: 10, completed: 5 });

      const output = runProgressScript();

      // Progress format: "5/10 tasks | 0/0 ACs (0%)" — percentage is now AC-based
      expect(output).toContain('5/10');
    });
  });

  describe('read-status.sh', () => {
    /**
     * Run read-status script and return output
     */
    function runStatusScript(): string {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-status.sh');

      // First rebuild cache
      rebuildCache();

      try {
        return execSync(`bash "${scriptPath}"`, {
          cwd: testDir,
          env: { ...getCleanEnv(), PWD: testDir },
          encoding: 'utf-8'
        });
      } catch (error: any) {
        return error.stdout || error.message;
      }
    }

    it('should show status overview header', () => {
      createIncrement('0001-test', 'active', 'feature');

      const output = runStatusScript();

      expect(output).toContain('Status Overview');
    });

    it('should show active increments with icon', () => {
      createIncrement('0001-active-feature', 'active', 'feature');

      const output = runStatusScript();

      expect(output).toContain('0001-active-feature');
      expect(output).toMatch(/active.*1|🔄/);
    });

    it('should show planning increments (including legacy planned)', () => {
      createIncrement('0001-planning', 'planning', 'feature');
      createIncrement('0002-planned-legacy', 'planned', 'feature');

      const output = runStatusScript();

      expect(output).toContain('0001-planning');
      expect(output).toContain('0002-planned-legacy');
      expect(output).toMatch(/planning|📝/);
    });

    it('should show completed increments', () => {
      createIncrement('0001-done', 'completed', 'feature');
      createIncrement('0002-done', 'completed', 'bug');

      const output = runStatusScript();

      expect(output).toContain('completed');
      expect(output).toMatch(/✅/);
    });

    it('should show summary line with totals', () => {
      createIncrement('0001-active', 'active', 'feature');
      createIncrement('0002-done', 'completed', 'feature');

      const output = runStatusScript();

      expect(output).toContain('Total:');
      expect(output).toMatch(/Active:/);
      expect(output).toMatch(/Completed:/);
    });

    it('should show all status categories in correct order', () => {
      createIncrement('0001-active', 'active', 'feature');
      createIncrement('0002-planning', 'planning', 'feature');
      createIncrement('0003-paused', 'paused', 'feature');
      createIncrement('0004-backlog', 'backlog', 'feature');
      createIncrement('0005-completed', 'completed', 'feature');
      createIncrement('0006-abandoned', 'abandoned', 'feature');

      const output = runStatusScript();

      // All statuses should appear
      expect(output).toContain('active');
      expect(output).toContain('planning');
      expect(output).toContain('paused');
      expect(output).toContain('backlog');
      expect(output).toContain('completed');
      expect(output).toContain('abandoned');
    });

    it('should truncate long lists with "... and X more"', () => {
      // Create 7 completed increments (more than default 5 shown)
      for (let i = 1; i <= 7; i++) {
        createIncrement(`000${i}-done`, 'completed', 'feature');
      }

      const output = runStatusScript();

      expect(output).toMatch(/\.\.\..*and.*more/i);
    });

    it('should show helpful commands at the end', () => {
      createIncrement('0001-test', 'active', 'feature');

      const output = runStatusScript();

      expect(output).toContain('/sw:progress');
      expect(output).toContain('/sw:do');
      expect(output).toContain('/sw:done');
    });
  });

  describe('update-dashboard-cache.sh (incremental)', () => {
    /**
     * Run update script for a specific increment
     */
    function runUpdateScript(incrementId: string, changeType: string = 'metadata'): void {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/update-dashboard-cache.sh');

      try {
        execSync(`bash "${scriptPath}" "${incrementId}" "${changeType}"`, {
          cwd: testDir,
          env: { ...getCleanEnv(), PWD: testDir }
        });
      } catch (error) {
        // Script may fail silently for missing increments
        console.error('Update failed:', error);
      }
    }

    /**
     * Read current cache state
     */
    function readCache(): any {
      const cacheFile = path.join(stateDir, 'dashboard.json');
      if (fs.existsSync(cacheFile)) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      }
      return null;
    }

    it('should add new increment to existing cache', () => {
      // Build initial cache with one increment
      createIncrement('0001-existing', 'active', 'feature');
      rebuildCache();

      // Add new increment and run incremental update
      createIncrement('0002-new', 'planning', 'feature');
      runUpdateScript('0002-new', 'metadata');

      const cache = readCache();

      expect(cache.summary.total).toBe(2);
      expect(cache.summary.active).toBe(1);
      expect(cache.summary.planning).toBe(1);
      expect(cache.increments['0002-new']).toBeDefined();
      expect(cache.increments['0002-new'].status).toBe('planning');
    });

    it('should handle legacy "planned" status during incremental update', () => {
      // Build initial cache
      createIncrement('0001-existing', 'active', 'feature');
      rebuildCache();

      // Add increment with legacy "planned" status
      createIncrement('0002-planned-legacy', 'planned', 'feature');
      runUpdateScript('0002-planned-legacy', 'metadata');

      const cache = readCache();

      // Should increment planning counter (not create "planned" counter)
      expect(cache.summary.planning).toBe(1);
      expect(cache.summary.planned).toBeUndefined();
      // But preserve original status in increment data
      expect(cache.increments['0002-planned-legacy'].status).toBe('planned');
    });

    it('should update status change counters correctly', () => {
      // Build initial cache with active increment
      createIncrement('0001-test', 'active', 'feature');
      rebuildCache();

      let cache = readCache();
      expect(cache.summary.active).toBe(1);
      expect(cache.summary.completed).toBe(0);

      // Change status to completed
      const incDir = path.join(incrementsDir, '0001-test');
      const metadata = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
      metadata.status = 'completed';
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      runUpdateScript('0001-test', 'metadata');

      cache = readCache();
      expect(cache.summary.active).toBe(0);
      expect(cache.summary.completed).toBe(1);
    });

    it('should handle status transition from planned to active', () => {
      // Build initial cache with planned increment
      createIncrement('0001-test', 'planned', 'feature');
      rebuildCache();

      let cache = readCache();
      expect(cache.summary.planning).toBe(1);
      expect(cache.summary.active).toBe(0);

      // Change status to active
      const incDir = path.join(incrementsDir, '0001-test');
      const metadata = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
      metadata.status = 'active';
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      runUpdateScript('0001-test', 'metadata');

      cache = readCache();
      expect(cache.summary.planning).toBe(0);
      expect(cache.summary.active).toBe(1);
    });

    it('should remove increment from cache when archived', () => {
      // Build initial cache with increment
      createIncrement('0001-test', 'active', 'feature');
      rebuildCache();

      let cache = readCache();
      expect(cache.summary.total).toBe(1);
      expect(cache.increments['0001-test']).toBeDefined();

      // Move to archive (simulate archiving)
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(
        path.join(incrementsDir, '0001-test'),
        path.join(archiveDir, '0001-test')
      );

      // Run update - should detect increment is gone and remove from cache
      runUpdateScript('0001-test', 'metadata');

      cache = readCache();
      expect(cache.summary.total).toBe(0);
      expect(cache.increments['0001-test']).toBeUndefined();
    });

    it('should update task counts during incremental update', () => {
      // Build initial cache
      createIncrement('0001-test', 'active', 'feature', { total: 5, completed: 2 });
      rebuildCache();

      let cache = readCache();
      expect(cache.increments['0001-test'].tasks.total).toBe(5);
      expect(cache.increments['0001-test'].tasks.completed).toBe(2);

      // Update tasks
      const incDir = path.join(incrementsDir, '0001-test');
      let tasksContent = '# Tasks\n\n';
      for (let i = 1; i <= 5; i++) {
        const isCompleted = i <= 4; // 4 completed now
        tasksContent += `### T-${String(i).padStart(3, '0')}: Task ${i}\n`;
        tasksContent += `**Status**: [${isCompleted ? 'x' : ' '}] ${isCompleted ? 'completed' : 'pending'}\n\n`;
      }
      fs.writeFileSync(path.join(incDir, 'tasks.md'), tasksContent);

      runUpdateScript('0001-test', 'tasks');

      cache = readCache();
      expect(cache.increments['0001-test'].tasks.completed).toBe(4);
    });
  });
});
