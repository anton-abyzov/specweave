/**
 * Tests for Auto Mode Completion Evaluator
 *
 * Tests the LLM-based completion evaluation for auto mode sessions.
 * Uses mocks for Claude CLI to avoid actual API calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use vi.hoisted pattern for ESM mocking (Vitest 4.x+)
const { mockDetectClaudeCli, mockGetCleanEnv, mockSpawnSync } = vi.hoisted(() => ({
  mockDetectClaudeCli: vi.fn(),
  mockGetCleanEnv: vi.fn(),
  mockSpawnSync: vi.fn(),
}));

// Mock the claude-cli-detector module
vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getCleanEnv: mockGetCleanEnv,
}));

// Mock child_process.spawnSync
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    spawnSync: mockSpawnSync,
  };
});

// Import after mocking
import {
  evaluateCompletion,
  loadSuccessCriteria,
} from '../../../../src/core/auto/completion-evaluator.js';
import type { SuccessCriterion } from '../../../../src/core/auto/types.js';

describe('CompletionEvaluator', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementPath: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `completion-eval-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );
    fs.mkdirSync(testRoot, { recursive: true });

    incrementId = `000${testCounter}-test-increment`;
    incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementPath, { recursive: true });
    fs.mkdirSync(path.join(testRoot, '.specweave', 'state'), { recursive: true });

    // Default mock setup
    mockDetectClaudeCli.mockReturnValue({
      available: true,
      commandPath: '/usr/bin/claude',
      version: '1.0.0',
      shellWorkaround: false,
    });
    mockGetCleanEnv.mockReturnValue({ PATH: process.env.PATH });
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  describe('loadSuccessCriteria', () => {
    it('should return null when auto-mode.json does not exist', () => {
      const result = loadSuccessCriteria(testRoot);
      expect(result).toBeNull();
    });

    it('should return criteria from auto-mode.json', () => {
      const autoModeFile = path.join(testRoot, '.specweave', 'state', 'auto-mode.json');
      const criteria: SuccessCriterion[] = [
        { type: 'tasks_complete', description: 'All tasks complete', required: true },
        { type: 'tests_pass', description: 'Tests must pass', required: true },
      ];
      fs.writeFileSync(autoModeFile, JSON.stringify({ successCriteria: criteria }));

      const result = loadSuccessCriteria(testRoot);
      expect(result).toHaveLength(2);
      expect(result![0].type).toBe('tasks_complete');
      expect(result![1].type).toBe('tests_pass');
    });
  });

  describe('evaluateCompletion', () => {
    it('should return complete=false when tasks are pending', async () => {
      // Create tasks.md with pending tasks
      const tasksContent = `# Tasks

### T-001: Task One
**Status**: [x] completed

### T-002: Task Two
**Status**: [ ] pending
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await evaluateCompletion(testRoot, incrementId, { skipLLM: true });

      expect(result.complete).toBe(false);
      expect(result.overallReason).toContain('pending');
    });

    it('should return complete=false when ACs are open', async () => {
      // Create tasks.md with all complete
      const tasksContent = `# Tasks

### T-001: Task One
**Status**: [x] completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create spec.md with open ACs
      const specContent = `# Spec

### US-001: Story

- [ ] **AC-US1-01**: Open criterion
- [x] **AC-US1-02**: Closed criterion
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const result = await evaluateCompletion(testRoot, incrementId, { skipLLM: true });

      expect(result.complete).toBe(false);
      expect(result.overallReason).toContain('open');
    });

    it('should return complete=true when all basic criteria are met', async () => {
      // Create tasks.md with all complete
      const tasksContent = `# Tasks

### T-001: Task One
**Status**: [x] completed

### T-002: Task Two
**Status**: [x] completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create spec.md with all ACs closed
      const specContent = `# Spec

### US-001: Story

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const result = await evaluateCompletion(testRoot, incrementId, { skipLLM: true });

      expect(result.complete).toBe(true);
      expect(result.overallReason).toContain('success criteria met');
    });

    it('should include next steps when not complete', async () => {
      // Create tasks.md with pending tasks
      const tasksContent = `# Tasks

### T-001: Task One
**Status**: [ ] pending
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await evaluateCompletion(testRoot, incrementId, { skipLLM: true });

      expect(result.complete).toBe(false);
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.some((s) => s.includes('/sw:do'))).toBe(true);
    });

    it('should use default criteria when none specified', async () => {
      // No auto-mode.json
      const tasksContent = `# Tasks

### T-001: Task One
**Status**: [x] completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const specContent = `# Spec

### US-001: Story

- [x] **AC-US1-01**: Criterion
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const result = await evaluateCompletion(testRoot, incrementId, { skipLLM: true });

      // Should use default criteria (tasks_complete + acs_satisfied)
      expect(result.results).toHaveLength(2);
      expect(result.results.map((r) => r.criterion.type)).toContain('tasks_complete');
      expect(result.results.map((r) => r.criterion.type)).toContain('acs_satisfied');
    });
  });
});
