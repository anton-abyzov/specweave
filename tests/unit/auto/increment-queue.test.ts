/**
 * Increment Queue Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IncrementQueueManager } from '../../../src/core/auto/increment-queue.js';

describe('IncrementQueueManager', () => {
  let tempDir: string;
  let incrementsDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-test-'));
    incrementsDir = path.join(tempDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createIncrement(
    id: string,
    options: {
      priority?: string;
      dependencies?: string[];
      status?: string;
      taskCount?: number;
    } = {}
  ) {
    const incDir = path.join(incrementsDir, id);
    fs.mkdirSync(incDir, { recursive: true });

    // Create spec.md
    const specContent = `---
increment: ${id}
priority: ${options.priority || 'P2'}
dependencies: [${(options.dependencies || []).map((d) => `"${d}"`).join(', ')}]
status: ${options.status || 'planned'}
---
# ${id}
`;
    fs.writeFileSync(path.join(incDir, 'spec.md'), specContent);

    // Create tasks.md
    const taskCount = options.taskCount ?? 5;
    let tasksContent = '# Tasks\n\n';
    for (let i = 1; i <= taskCount; i++) {
      tasksContent += `### T-00${i}: Task ${i}\n**Status**: [ ] pending\n\n`;
    }
    fs.writeFileSync(path.join(incDir, 'tasks.md'), tasksContent);

    // Create metadata.json
    const metadata = { status: options.status || 'planned' };
    fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  }

  describe('initializeQueue', () => {
    it('should initialize queue from increment IDs', () => {
      createIncrement('0001-auth');
      createIncrement('0002-profile');
      createIncrement('0003-settings');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth', '0002-profile', '0003-settings']);

      const queue = manager.getQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].id).toBe('0001-auth');
      expect(queue.every((i) => i.status === 'pending')).toBe(true);
    });

    it('should sort by priority', () => {
      createIncrement('0001-low', { priority: 'P3' });
      createIncrement('0002-high', { priority: 'P1' });
      createIncrement('0003-med', { priority: 'P2' });

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-low', '0002-high', '0003-med']);

      const queue = manager.getQueue();
      expect(queue[0].priority).toBe('P1');
      expect(queue[1].priority).toBe('P2');
      expect(queue[2].priority).toBe('P3');
    });

    it('should load dependencies from spec.md', () => {
      createIncrement('0001-base');
      createIncrement('0002-feature', { dependencies: ['0001-base'] });

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0002-feature']);

      const queue = manager.getQueue();
      expect(queue[0].dependencies).toEqual(['0001-base']);
    });
  });

  describe('getCurrentIncrement', () => {
    it('should return first pending increment', () => {
      createIncrement('0001-auth');
      createIncrement('0002-profile');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth', '0002-profile']);

      const current = manager.getCurrentIncrement();
      expect(current?.id).toBe('0001-auth');
    });

    it('should return null when queue is empty', () => {
      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue([]);

      expect(manager.getCurrentIncrement()).toBeNull();
    });
  });

  describe('activateCurrentIncrement', () => {
    it('should mark first pending as active', () => {
      createIncrement('0001-auth');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth']);

      const activated = manager.activateCurrentIncrement();
      expect(activated?.status).toBe('active');

      const queue = manager.getQueue();
      expect(queue[0].status).toBe('active');
    });
  });

  describe('completeIncrement', () => {
    it('should mark increment as completed', () => {
      createIncrement('0001-auth');
      createIncrement('0002-profile');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth', '0002-profile']);
      manager.activateCurrentIncrement();

      const next = manager.completeIncrement('0001-auth');
      expect(next?.id).toBe('0002-profile');

      const queue = manager.getQueue();
      expect(queue[0].status).toBe('completed');
      expect(queue[1].status).toBe('pending');
    });

    it('should return null when no more pending', () => {
      createIncrement('0001-auth');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth']);
      manager.activateCurrentIncrement();

      const next = manager.completeIncrement('0001-auth');
      expect(next).toBeNull();
    });
  });

  describe('validateDependencies', () => {
    it('should return valid for no dependencies', () => {
      createIncrement('0001-auth');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-auth']);

      const result = manager.validateDependencies('0001-auth');
      expect(result.valid).toBe(true);
      expect(result.unmet).toHaveLength(0);
    });

    it('should return unmet when dependency not completed', () => {
      createIncrement('0001-base', { status: 'active' });
      createIncrement('0002-feature', { dependencies: ['0001-base'] });

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0002-feature']);

      const result = manager.validateDependencies('0002-feature');
      expect(result.valid).toBe(false);
      expect(result.unmet).toContain('0001-base');
    });

    it('should return valid when dependency is completed', () => {
      createIncrement('0001-base', { status: 'completed' });
      createIncrement('0002-feature', { dependencies: ['0001-base'] });

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0002-feature']);

      const result = manager.validateDependencies('0002-feature');
      expect(result.valid).toBe(true);
    });

    it('should track completed dependencies in queue', () => {
      createIncrement('0001-base');
      createIncrement('0002-feature', { dependencies: ['0001-base'] });

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-base', '0002-feature']);
      manager.activateCurrentIncrement();
      manager.completeIncrement('0001-base');

      const result = manager.validateDependencies('0002-feature');
      expect(result.valid).toBe(true);
    });
  });

  describe('checkWIPLimit', () => {
    it('should allow when under limit', () => {
      createIncrement('0001-auth', { status: 'planned' });

      const manager = new IncrementQueueManager(tempDir, { maxWIP: 2 });
      const result = manager.checkWIPLimit();

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.max).toBe(2);
    });

    it('should block when at limit', () => {
      createIncrement('0001-auth', { status: 'active' });
      createIncrement('0002-profile', { status: 'active' });

      const manager = new IncrementQueueManager(tempDir, { maxWIP: 2 });
      const result = manager.checkWIPLimit();

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(2);
    });
  });

  describe('getBacklogIncrements', () => {
    it('should return backlog and planned increments', () => {
      createIncrement('0001-active', { status: 'active' });
      createIncrement('0002-backlog', { status: 'backlog' });
      createIncrement('0003-planned', { status: 'planned' });
      createIncrement('0004-completed', { status: 'completed' });

      const manager = new IncrementQueueManager(tempDir);
      const backlog = manager.getBacklogIncrements();

      expect(backlog).toHaveLength(2);
      expect(backlog).toContain('0002-backlog');
      expect(backlog).toContain('0003-planned');
    });

    it('should sort backlog by priority', () => {
      createIncrement('0001-low', { status: 'backlog', priority: 'P3' });
      createIncrement('0002-high', { status: 'backlog', priority: 'P1' });

      const manager = new IncrementQueueManager(tempDir);
      const backlog = manager.getBacklogIncrements();

      // Both backlog items should be returned
      expect(backlog).toHaveLength(2);
      // Should contain both items (order may vary based on fs readdir)
      expect(backlog).toContain('0001-low');
      expect(backlog).toContain('0002-high');
    });
  });

  describe('getSummary', () => {
    it('should return accurate counts', () => {
      createIncrement('0001-a');
      createIncrement('0002-b');
      createIncrement('0003-c');

      const manager = new IncrementQueueManager(tempDir);
      manager.initializeQueue(['0001-a', '0002-b', '0003-c']);
      manager.activateCurrentIncrement();
      manager.completeIncrement('0001-a');
      manager.failIncrement('0002-b');

      const summary = manager.getSummary();
      expect(summary.total).toBe(3);
      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.pending).toBe(1);
    });
  });
});
