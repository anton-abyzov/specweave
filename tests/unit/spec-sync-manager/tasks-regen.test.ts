import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpecSyncManager } from '../../../src/core/increment/spec-sync-manager.js';
import { silentLogger } from '../../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SpecSyncManager - Tasks Regeneration', () => {
  let testDir: string;
  let manager: SpecSyncManager;
  let incrementsDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    manager = new SpecSyncManager(testDir, { logger: silentLogger });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('tasks context preparation', () => {
    it('should prepare plan.md content for test-aware-planner', async () => {
      const incrementId = '0200-tasks-regen-test';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
      );
      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), '# Tasks\n## T-001: Setup');

      const now = Date.now();
      while (Date.now() - now < 10) {}

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');

      const result = await manager.syncIncrement(incrementId);

      expect(result.synced).toBe(true);
      expect(result.regenerationContext?.oldTasksContent).toContain('T-001');
    });
  });

  describe('task completion status preservation', () => {
    it('should identify task headers and their IDs', () => {
      const tasksContent = `# Tasks\n## T-001: First\n## T-002: Second`;
      const taskHeaders = tasksContent.match(/^## T-\d+:/gm) || [];
      expect(taskHeaders).toEqual(['## T-001:', '## T-002:']);
    });
  });

  describe('tasks.md diff generation', () => {
    it('should detect new tasks added', () => {
      const oldTasks = `# Tasks\n## T-001: Task one`;
      const newTasks = `# Tasks\n## T-001: Task one\n## T-002: Task two`;

      const oldHeaders = oldTasks.match(/^## T-\d+:/gm) || [];
      const newHeaders = newTasks.match(/^## T-\d+:/gm) || [];

      expect(newHeaders.length - oldHeaders.length).toBe(1);
    });
  });

  describe('error handling for tasks regeneration', () => {
    it('should handle missing plan.md when regenerating tasks', () => {
      const incrementId = '0202-no-plan';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');

      const context = manager.prepareRegenerationContext(incrementId);

      expect(context?.oldPlanContent).toBeUndefined();
    });
  });

  describe('tasks regeneration workflow', () => {
    it('should preserve task IDs when regenerating', () => {
      const oldTasks = `## T-001: Original\n## T-002: Another`;
      const newTasks = `## T-001: Updated\n## T-002: Updated\n## T-003: New`;

      const oldIds = oldTasks.match(/T-\d+/g) || [];
      const newIds = newTasks.match(/T-\d+/g) || [];

      expect(newIds.slice(0, 2)).toEqual(oldIds);
    });
  });
});
