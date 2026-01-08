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
    try {
      const result = execSync(
        `echo '${JSON.stringify(input)}' | PROJECT_ROOT="${tempDir}" bash "${hookPath}"`,
        { encoding: 'utf-8', shell: '/bin/bash', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      return JSON.parse(result.trim());
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; status?: number };
      throw new Error(
        `Hook failed with status ${execError.status}.\nSTDOUT: ${execError.stdout}\nSTDERR: ${execError.stderr}`
      );
    }
  }

  describe('no session', () => {
    it('should approve when no session file exists', () => {
      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('No auto session active');
    });
  });

  describe('stop_hook_active flag', () => {
    it('should still evaluate completion when stop_hook_active is true (Ralph Wiggum pattern)', () => {
      // Create a session with incomplete tasks
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with incomplete tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // FIXED: stop_hook_active should NOT cause immediate approval
      // The hook should still check if tasks are complete
      const result = runHook({ transcript_path: '', stop_hook_active: true });

      // Should block because tasks are incomplete, regardless of stop_hook_active
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('incomplete');
    });

    it('should approve when stop_hook_active is true AND tasks are complete', () => {
      // Create a session with completed tasks
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      const result = runHook({ transcript_path: '', stop_hook_active: true });

      // Should approve because tasks are complete (not because of stop_hook_active)
      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
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
    it('should approve when completion promise found in transcript (no tasks)', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      // Create transcript with completion promise (in last 100 lines)
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Some output\n<auto-complete>DONE</auto-complete>\nMore output');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Completion promise detected');
    });

    it('should approve when completion promise found AND all tasks complete', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create completed tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create transcript with completion promise
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Some output\n<auto-complete>DONE</auto-complete>\nMore output');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Completion promise detected');
    });

    it('should reject completion promise when tasks are incomplete (stricter v2.10)', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create INCOMPLETE tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with completion promise (should be rejected!)
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Some output\n<auto-complete>DONE</auto-complete>\nMore output');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Should block because tasks are incomplete, despite completion promise
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('incomplete');
    });

    it('should ignore completion promise if not in last 100 lines (legacy)', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create incomplete tasks
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with OLD completion promise (> 100 lines ago)
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      const oldContent = '<auto-complete>DONE</auto-complete>\n' + 'line\n'.repeat(120);
      fs.writeFileSync(transcriptPath, oldContent);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Should block - old promise is ignored
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('incomplete');
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

  describe('test enforcement', () => {
    it('should block when unit tests exist but were not run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create test files in the project (unit tests exist)
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');

      // Create transcript WITHOUT test execution evidence
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Completed implementation of feature');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TESTS NOT RUN');
      expect(result.systemMessage).toContain('MANDATORY');
      expect(result.systemMessage).toContain('npm test');
    });

    it('should block when E2E tests exist but were not run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create unit test files AND playwright config (E2E exists)
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');
      fs.writeFileSync(path.join(tempDir, 'playwright.config.ts'), '// playwright config');

      // Create transcript WITH unit test execution but WITHOUT E2E
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 5 passed, 5 total');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('E2E TESTS NOT RUN');
      expect(result.systemMessage).toContain('playwright test');
    });

    it('should approve when all tests exist and were run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create unit test files AND playwright config
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');
      fs.writeFileSync(path.join(tempDir, 'playwright.config.ts'), '// playwright config');

      // Create transcript WITH both unit test AND E2E execution
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 5 passed\nRunning npx playwright test\ne2e tests passed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should approve when no test files exist in project', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // NO test files - just regular source files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/index.ts'), '// source file');

      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should detect spec.ts files as unit tests', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create spec file (alternative naming convention)
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'tests/app.spec.ts'), '// spec file');

      // No transcript = no tests run
      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TESTS NOT RUN');
    });

    it('should detect vitest execution as tests run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create test files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');

      // Create transcript with vitest execution
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npx vitest run\n✓ src/example.test.ts (5 tests)');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should detect cypress directory as E2E tests', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create unit test files AND cypress directory
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'cypress'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');

      // Create transcript with unit tests but no cypress run
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 5 passed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('E2E TESTS NOT RUN');
    });

    it('should detect cypress run in transcript', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create unit test files AND cypress directory
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'cypress'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');

      // Create transcript with both npm test and cypress run
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 5 passed\nRunning cypress run\nAll specs passed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should detect Python test files', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create Python test file
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'tests/test_app.py'), '# python test');

      // No transcript = no tests run
      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TESTS NOT RUN');
    });

    it('should detect pytest execution as tests run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create Python test file
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'tests/test_app.py'), '# python test');

      // Create transcript with pytest
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running pytest\n5 passed in 2.3s');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });

    it('should detect Go test files', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create Go test file
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/app_test.go'), '// go test');

      // No transcript = no tests run
      const result = runHook({ transcript_path: '', stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TESTS NOT RUN');
    });

    it('should detect go test execution as tests run', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create tasks.md with all tasks completed
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create Go test file
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/app_test.go'), '// go test');

      // Create transcript with go test
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running go test ./...\nok  	example.com/app	0.5s');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('All tasks completed');
    });
  });

  // ============================================================================
  // NEW: Test Result Parsing (v2.0)
  // ============================================================================
  describe('test result parsing', () => {
    it('should parse vitest output with failures', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create incomplete tasks (so we're not in completion check)
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with vitest failures
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npx vitest run
 FAIL  src/auth.test.ts > login > should redirect after login
Error: expect(received).toEqual(expected)
Expected: "/dashboard"
Received: "/login"
 Tests  5 passed | 2 failed (7)
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('self-healing retry');
      expect(result.systemMessage).toContain('TESTS FAILED');
      expect(result.systemMessage).toContain('attempt 1/3');
    });

    it('should parse jest output with failures', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with jest failures
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npm test
FAIL src/utils.test.js
  ● should calculate total
    expect(received).toBe(expected)
    Expected: 100
    Received: 99
Tests: 10 passed, 1 failed, 11 total
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('self-healing retry');
    });

    it('should parse playwright output with failures', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with playwright failures
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npx playwright test
  1) [chromium] › auth.spec.ts:45:3 › Login Flow › should redirect after login
    Error: expect(locator).toBeVisible()
    Locator: locator('.dashboard')
    Expected: visible
    Received: hidden
  158 passed (2m)
  3 failed
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('self-healing retry');
      expect(result.systemMessage).toContain('TESTS FAILED');
    });

    it('should NOT trigger self-healing when all tests pass', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with all tests passing
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npx vitest run
 ✓ src/auth.test.ts (5 tests)
 ✓ src/utils.test.ts (10 tests)
 Tests  15 passed (15)
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      // Should continue working, not trigger self-healing
      expect(result.reason).toContain('incomplete');
      expect(result.systemMessage).not.toContain('TESTS FAILED');
    });
  });

  // ============================================================================
  // NEW: Self-Healing Loop (v2.0)
  // ============================================================================
  describe('self-healing loop', () => {
    it('should increment retry counter on test failure', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      (session as Record<string, unknown>).testRetryCount = 0;
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with test failure
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nFAIL src/test.ts\nTests: 5 passed, 1 failed');

      runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Verify retry counter was incremented
      const updated = manager.load();
      expect((updated as Record<string, unknown>).testRetryCount).toBe(1);
    });

    it('should show attempt 2/3 on second failure', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      (session as Record<string, unknown>).testRetryCount = 1; // Already failed once
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nFAIL src/test.ts\nTests: 5 passed, 1 failed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.systemMessage).toContain('attempt 2/3');

      // Verify retry counter is now 2
      const updated = manager.load();
      expect((updated as Record<string, unknown>).testRetryCount).toBe(2);
    });

    it('should escalate to human gate after 3 failures', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      (session as Record<string, unknown>).testRetryCount = 3; // Already failed 3 times
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nFAIL src/test.ts\nTests: 5 passed, 1 failed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Should approve (allow exit) to trigger human gate
      expect(result.decision).toBe('approve');
      expect(result.reason).toContain('Tests failed 3x');
      expect(result.reason).toContain('human review');

      // Verify session was paused
      const updated = manager.load();
      expect(updated?.status).toBe('paused');
      expect((updated as Record<string, unknown>).pauseReason).toBe('test_failures_exhausted');
    });

    it('should reset retry counter when tests pass', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      (session as Record<string, unknown>).testRetryCount = 2; // Had 2 failures
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Tests pass this time
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 10 passed');

      runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Verify retry counter was reset
      const updated = manager.load();
      expect((updated as Record<string, unknown>).testRetryCount).toBe(0);
    });

    it('should include failure details in retry prompt', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [ ] pending');

      // Create transcript with detailed failure
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npx vitest run
FAIL src/auth.test.ts > should validate email
Error: expect(received).toBe(expected)
Expected: true
Received: false
Tests: 10 passed, 1 failed
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.systemMessage).toContain('FAILURE DETAILS');
      expect(result.systemMessage).toContain('INSTRUCTIONS');
      expect(result.systemMessage).toContain('FIX');
    });
  });

  // ============================================================================
  // NEW: Increment Queue Transition (v2.0)
  // ============================================================================
  describe('increment queue transition', () => {
    it('should transition to next increment when current completes', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test', '0002-next'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // Create completed tasks for first increment
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create next increment directory
      fs.mkdirSync(path.join(tempDir, '.specweave/increments/0002-next'), { recursive: true });

      // Tests passed
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'Running npm test\nTests: 10 passed');

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('starting next');
      expect(result.systemMessage).toContain('0001-test');
      expect(result.systemMessage).toContain('COMPLETE');
      expect(result.systemMessage).toContain('0002-next');

      // Verify session was updated
      const updated = manager.load();
      expect(updated?.currentIncrement).toBe('0002-next');
      expect((updated as Record<string, unknown>).completedIncrements).toContain('0001-test');
    });
  });

  // ============================================================================
  // NEW: False Success Prevention (v2.0)
  // ============================================================================
  describe('false success prevention', () => {
    it('should block completion when tests claim pass but actually failed', () => {
      const manager = new SessionStateManager(tempDir);
      const session = manager.createSession({ incrementQueue: ['0001-test'] });
      session.currentIncrement = '0001-test';
      manager.save(session);

      // ALL tasks complete
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      fs.writeFileSync(tasksPath, '### T-001: Task 1\n**Status**: [x] completed');

      // Create test files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/example.test.ts'), '// test file');

      // Transcript shows tests ran but some failed
      const transcriptPath = path.join(tempDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, `
Running npm test
FAIL src/example.test.ts
Tests: 158 passed, 3 failed
      `);

      const result = runHook({ transcript_path: transcriptPath, stop_hook_active: false });

      // Should block for self-healing, NOT approve
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('self-healing');
    });
  });
});
