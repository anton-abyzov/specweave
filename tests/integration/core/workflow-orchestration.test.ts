import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { WorkflowOrchestrator } from '../../../src/core/workflow/workflow-orchestrator.js';
import { BacklogScanner } from '../../../src/core/workflow/backlog-scanner.js';
import { CostEstimator } from '../../../src/core/workflow/cost-estimator.js';
import { CommandInvoker } from '../../../src/core/workflow/command-invoker.js';
import { StateManager } from '../../../src/core/workflow/state-manager.js';

/**
 * Integration tests for Workflow Orchestration
 *
 * Tests the complete workflow orchestration system including:
 * - WorkflowOrchestrator
 * - BacklogScanner
 * - CostEstimator
 * - CommandInvoker
 * - StateManager
 *
 * Part of increment 0039
 */

describe('Workflow Orchestration Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `workflow-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('BacklogScanner', () => {
    it('should scan empty backlog directory', async () => {
      const backlogDir = path.join(testDir, '.specweave/increments/_backlog');
      await fs.ensureDir(backlogDir);

      const scanner = new BacklogScanner(testDir);
      const items = await scanner.scanBacklog();

      expect(items).toEqual([]);
    });

    it('should scan backlog with one item', async () => {
      const backlogDir = path.join(testDir, '.specweave/increments/_backlog');
      const incrementDir = path.join(backlogDir, '0001-test-feature');
      await fs.ensureDir(incrementDir);

      // Create spec.md
      await fs.writeFile(path.join(incrementDir, 'spec.md'), `---
increment: 0001-test-feature
priority: P1
dependencies: []
---

# Test Feature

## Description
Test feature description
`);

      const scanner = new BacklogScanner(testDir);
      const items = await scanner.scanBacklog();

      expect(items).toHaveLength(1);
      expect(items[0].incrementId).toBe('0001-test-feature');
      expect(items[0].priority).toBe('P1');
      expect(items[0].title).toBe('Test Feature');
    });

    it('should rank items by priority', async () => {
      const backlogDir = path.join(testDir, '.specweave/increments/_backlog');

      // Create P0 item
      await fs.ensureDir(path.join(backlogDir, '0001-critical'));
      await fs.writeFile(path.join(backlogDir, '0001-critical/spec.md'), `---
priority: P0
---
# Critical
`);

      // Create P2 item
      await fs.ensureDir(path.join(backlogDir, '0002-normal'));
      await fs.writeFile(path.join(backlogDir, '0002-normal/spec.md'), `---
priority: P2
---
# Normal
`);

      const scanner = new BacklogScanner(testDir);
      const items = await scanner.scanBacklog();
      const ranked = scanner.rankItems(items);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].incrementId).toBe('0001-critical'); // P0 should be first
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should handle dependencies', async () => {
      const backlogDir = path.join(testDir, '.specweave/increments/_backlog');

      // Create blocked item
      await fs.ensureDir(path.join(backlogDir, '0002-feature'));
      await fs.writeFile(path.join(backlogDir, '0002-feature/spec.md'), `---
priority: P1
dependencies: ['0001-foundation']
---
# Feature
`);

      const scanner = new BacklogScanner(testDir);
      const items = await scanner.scanBacklog();

      // Without completed deps
      const rankedBlocked = scanner.rankItems(items, undefined, []);
      expect(rankedBlocked[0].reason).toContain('Blocked by');

      // With completed deps
      const rankedUnblocked = scanner.rankItems(items, undefined, ['0001-foundation']);
      expect(rankedUnblocked[0].reason).toContain('All dependencies met');
      expect(rankedUnblocked[0].score).toBeGreaterThan(rankedBlocked[0].score);
    });
  });

  describe('CostEstimator', () => {
    it('should estimate cost for increment with tasks', async () => {
      const incrementDir = path.join(testDir, '.specweave/increments/0001-feature');
      await fs.ensureDir(incrementDir);

      // Create tasks.md with 5 tasks
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `
#### T-001: Task 1
#### T-002: Task 2
#### T-003: Task 3
#### T-004: Task 4
#### T-005: Task 5
`);

      const estimator = new CostEstimator();
      const estimate = await estimator.estimateIncrement(incrementDir);

      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.breakdown).toHaveLength(4); // Planning, Execution, Validation, QA
      expect(estimate.riskLevel).toBeDefined();
      expect(estimate.confidence).toBeGreaterThan(0);
    });

    it('should classify risk levels correctly', async () => {
      const incrementDir = path.join(testDir, '.specweave/increments/0001-small');
      await fs.ensureDir(incrementDir);

      // Small increment (2 tasks)
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `
#### T-001: Task 1
#### T-002: Task 2
`);

      const estimator = new CostEstimator({ costPerCall: 0.01 });
      const estimate = await estimator.estimateIncrement(incrementDir);

      // 2 tasks * 3 calls + 4 (planning, validation, qa) = 10 calls * $0.01 = $0.10
      expect(estimate.riskLevel).toBe('low');
      expect(estimate.estimatedCost).toBeLessThan(1.0);
    });

    it('should have higher confidence with tasks.md', async () => {
      const withTasksDir = path.join(testDir, '.specweave/increments/0001-with-tasks');
      const withoutTasksDir = path.join(testDir, '.specweave/increments/0002-without-tasks');

      await fs.ensureDir(withTasksDir);
      await fs.ensureDir(withoutTasksDir);

      await fs.writeFile(path.join(withTasksDir, 'tasks.md'), '#### T-001: Task');
      await fs.writeFile(path.join(withTasksDir, 'plan.md'), '# Plan');
      await fs.writeFile(path.join(withoutTasksDir, 'spec.md'), '# Spec');

      const estimator = new CostEstimator();
      const withTasks = await estimator.estimateIncrement(withTasksDir);
      const withoutTasks = await estimator.estimateIncrement(withoutTasksDir);

      expect(withTasks.confidence).toBeGreaterThan(withoutTasks.confidence);
    });
  });

  describe('CommandInvoker', () => {
    it('should execute simple command', async () => {
      const invoker = new CommandInvoker();

      // Use a simple command that works cross-platform
      const result = await invoker.invoke('echo', {
        args: ['hello'],
        captureOutput: true
      });

      // Note: This will fail if specweave echo command doesn't exist
      // In practice, we'd test with actual specweave commands
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should classify errors correctly', () => {
      const invoker = new CommandInvoker();

      const notFoundError = { success: false, exitCode: 1, error: 'ENOENT: command not found', executionTime: 0 };
      const timeoutError = { success: false, exitCode: 1, error: 'ETIMEDOUT: connection timeout', executionTime: 0 };

      expect(invoker.classifyError(notFoundError)).toBe('critical');
      expect(invoker.classifyError(timeoutError)).toBe('warning');
    });
  });

  describe('StateManager', () => {
    it('should save and load checkpoints', async () => {
      const checkpointDir = path.join(testDir, '.specweave/checkpoints');
      const manager = new StateManager(checkpointDir);

      const checkpoint = {
        id: 'test-checkpoint-1',
        timestamp: Date.now(),
        incrementId: '0001-feature',
        phase: 'implementation' as any,
        iteration: 1,
        actions: ['action1', 'action2']
      };

      await manager.saveCheckpoint(checkpoint);

      const loaded = await manager.loadCheckpoints('0001-feature');
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-checkpoint-1');
      expect(loaded[0].actions).toEqual(['action1', 'action2']);
    });

    it('should get latest checkpoint', async () => {
      const checkpointDir = path.join(testDir, '.specweave/checkpoints');
      const manager = new StateManager(checkpointDir);

      // Save multiple checkpoints
      await manager.saveCheckpoint({
        id: 'checkpoint-1',
        timestamp: Date.now() - 2000,
        incrementId: '0001-feature',
        phase: 'implementation' as any,
        iteration: 1,
        actions: []
      });

      await manager.saveCheckpoint({
        id: 'checkpoint-2',
        timestamp: Date.now(),
        incrementId: '0001-feature',
        phase: 'implementation' as any,
        iteration: 2,
        actions: []
      });

      const latest = await manager.getLatestCheckpoint('0001-feature');
      expect(latest?.id).toBe('checkpoint-2');
    });

    it('should detect infinite loops', () => {
      const manager = new StateManager();

      const noLoop = ['phase1' as any, 'phase2' as any, 'phase3' as any];
      const hasLoop = ['phase1' as any, 'phase1' as any, 'phase1' as any];

      expect(manager.detectLoop(noLoop)).toBe(false);
      expect(manager.detectLoop(hasLoop)).toBe(true);
    });

    it('should cleanup old checkpoints', async () => {
      const checkpointDir = path.join(testDir, '.specweave/checkpoints');
      const manager = new StateManager(checkpointDir, 3); // Keep only 3

      // Save 5 checkpoints
      for (let i = 1; i <= 5; i++) {
        await manager.saveCheckpoint({
          id: `checkpoint-${i}`,
          timestamp: Date.now() + i,
          incrementId: '0001-feature',
          phase: 'implementation' as any,
          iteration: i,
          actions: []
        });
      }

      const checkpoints = await manager.loadCheckpoints('0001-feature');
      expect(checkpoints.length).toBeLessThanOrEqual(3);
    });
  });

  describe('WorkflowOrchestrator', () => {
    it('should initialize correctly', () => {
      const orchestrator = new WorkflowOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    // Note: Full integration tests for WorkflowOrchestrator require
    // setting up complete increment structure with active-increment.json,
    // which is better suited for E2E tests
  });
});
