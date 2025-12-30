/**
 * Stop Hook Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { SessionStateManager } from '../../../src/core/auto/session-state.js';

describe('Stop Hook Integration', () => {
  let tempDir: string;
  let hookPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-hook-test-'));
    hookPath = path.resolve('plugins/specweave/hooks/stop-auto.sh');

    // Create required directories
    fs.mkdirSync(path.join(tempDir, '.specweave/state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave/logs'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave/increments/0001-test/'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function runHook(input: object): { decision: string; reason?: string; systemMessage?: string } {
    const result = execSync(
      `echo '${JSON.stringify(input)}' | PROJECT_ROOT="${tempDir}" bash "${hookPath}"`,
      { encoding: 'utf-8', shell: '/bin/bash' }
    );
    return JSON.parse(result.trim());
  }

  describe('no session', () => {
    it('should approve when no session file exists', () => {
      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('No auto session active');
    });
  });

  describe('stop_hook_active flag', () => {
    it('should approve when stop_hook_active is true', () => {
      // Create a session
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      const result = runHook({ transcript_path: '', stop_hook_active: true });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Stop hook already active');
    });
  });

  describe('max iterations', () => {
    it('should approve when max iterations reached', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({
        incrementQueue: ['0001'],
        maxIterations: 5,
      });
      session.iteration = 5; // At max
      manager.save(session);

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Max iterations');

      // Verify session was updated
      const updated = manager.load();
      expect(updated?.status).toBe('completed');
      expect(updated?.endReason).toBe('max_iterations_reached');
    });
  });

  describe('completion promise', () => {
    it('should approve when completion promise found in transcript', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      // Create transcript with completion promise
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Some output\n<auto-complete>DONE</auto-complete>\nMore output');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Completion promise detected');
    });

    it('should block when no completion promise', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with incomplete tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending\n\n### T-002: Task 2\n**Status**: [ ] pending');

      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'No completion promise here');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('incomplete');
    });
  });

  describe('tasks completion', () => {
    it('should approve when all tasks completed (single increment)', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed\n\n### T-002: Task 2\n**Status**: [x] completed');

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should block and increment iteration when tasks incomplete', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      session.iteration = 5;
      manager.save(session);

      // Create tasks.md with incomplete tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed\n\n### T-002: Task 2\n**Status**: [ ] pending');

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.systemMessage).toContain('Iteration 6');

      // Verify iteration was incremented
      const updated = manager.load();
      expect(updated?.iteration).toBe(6);
    });
  });

  describe('session status', () => {
    it('should approve when session status is completed', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      session.status = 'completed';
      manager.save(session);

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('status is completed');
    });

    it('should approve when session status is cancelled', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      session.status = 'cancelled';
      manager.save(session);

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('status is cancelled');
    });
  });

  describe('simple mode', () => {
    it('should use minimal context in simple mode', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({
        incrementQueue: ['0001-test'],
        simple: true,
      });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create incomplete tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.systemMessage).toMatch(/Continue working\. Iteration \d+\/\d+\./);
      expect(result.systemMessage).not.toContain('AUTO ACTIVE');
    });
  });

  describe('human gate pending', () => {
    it('should approve when human gate is pending', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      session.humanGates.pending = {
        id: 'gate-123',
        operation: 'npm run deploy',
        pattern: 'deploy',
        requestedAt: new Date().toISOString(),
        timeout: 1800,
      };
      manager.save(session);

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Human gate pending');
    });
  });
});
