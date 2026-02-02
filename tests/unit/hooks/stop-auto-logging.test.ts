/**
 * Unit tests for stop-auto.sh structured decision logging integration
 *
 * Tests that stop-auto.sh properly logs decisions with context including:
 * - Turn counter state (current/max)
 * - Retry counter state (current/max, stuck detection)
 * - Validation results per increment (tasks pending, ACs open)
 *
 * TDD Phase: RED - These tests should FAIL until stop-auto.sh is updated.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('stop-auto.sh structured logging', () => {
  let tempDir: string;
  let specweaveDir: string;
  let incrementsDir: string;
  let logsDir: string;
  let stateDir: string;
  let decisionsLog: string;
  const hookPath = path.join(process.cwd(), 'plugins/specweave/hooks/stop-auto.sh');

  // Helper to create a minimal auto-mode session
  function createAutoSession(options: {
    active?: boolean;
    userGoal?: string;
  } = {}): void {
    const { active = true, userGoal = 'Test goal' } = options;
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      JSON.stringify({
        active,
        userGoal,
        startedAt: new Date().toISOString(),
        successCriteria: [
          { type: 'tasks_complete' },
          { type: 'acs_satisfied' },
        ],
      })
    );
    // Touch the file to make it fresh (not stale)
    const now = new Date();
    fs.utimesSync(path.join(stateDir, 'auto-mode.json'), now, now);
  }

  // Helper to create a minimal config
  function createConfig(options: {
    autoEnabled?: boolean;
    maxTurns?: number;
    maxRetries?: number;
    tddMode?: string;
  } = {}): void {
    const { autoEnabled = true, maxTurns = 20, maxRetries = 20, tddMode = 'standard' } = options;
    fs.writeFileSync(
      path.join(specweaveDir, 'config.json'),
      JSON.stringify({
        auto: {
          enabled: autoEnabled,
          maxTurns,
          maxRetries,
        },
        testing: {
          defaultTestMode: tddMode,
        },
      })
    );
  }

  // Helper to create a minimal increment
  function createIncrement(id: string, options: {
    status?: string;
    pendingTasks?: number;
    openAcs?: number;
  } = {}): void {
    const { status = 'active', pendingTasks = 0, openAcs = 0 } = options;
    const incDir = path.join(incrementsDir, id);
    fs.mkdirSync(incDir, { recursive: true });

    // Create metadata.json
    fs.writeFileSync(
      path.join(incDir, 'metadata.json'),
      JSON.stringify({ status, increment: id })
    );

    // Create tasks.md with pending tasks
    let tasksContent = '# Tasks\n\n';
    for (let i = 0; i < pendingTasks; i++) {
      tasksContent += `### T-00${i + 1}: Task ${i + 1}\n**Status**: [ ] pending\n\n`;
    }
    // Add some completed tasks
    tasksContent += '### T-099: Completed task\n**Status**: [x] completed\n';
    fs.writeFileSync(path.join(incDir, 'tasks.md'), tasksContent);

    // Create spec.md with open ACs
    let specContent = '# Spec\n\n### US-001: Story\n\n';
    for (let i = 0; i < openAcs; i++) {
      specContent += `- [ ] **AC-US1-0${i + 1}**: Open criterion ${i + 1}\n`;
    }
    // Add some completed ACs
    specContent += '- [x] **AC-US1-99**: Completed criterion\n';
    fs.writeFileSync(path.join(incDir, 'spec.md'), specContent);
  }

  // Helper to set turn counter
  function setTurnCounter(turn: number): void {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, '.stop-auto-turns'), String(turn));
  }

  // Helper to set retry counter
  function setRetryCounter(count: number, increments: string, reasons: string[] = []): void {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, '.stop-auto-retry'),
      JSON.stringify({
        count,
        increments,
        lastUpdate: new Date().toISOString(),
        currentReason: reasons[0] || '',
        reasons,
      })
    );
  }

  // Helper to run stop-auto hook
  function runStopAuto(): { stdout: string; stderr: string; status: number } {
    const result = spawnSync('bash', [hookPath], {
      encoding: 'utf-8',
      env: {
        ...process.env,
        PROJECT_ROOT: tempDir,
        // Disable debug mode by default
        SPECWEAVE_DEBUG_HOOKS: '0',
      },
      input: JSON.stringify({ hook: 'stop' }),
      timeout: 30000,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status || 0,
    };
  }

  // Helper to read decisions.jsonl
  function readDecisionLog(): object[] {
    if (!fs.existsSync(decisionsLog)) {
      return [];
    }
    const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n').map((line) => JSON.parse(line));
  }

  beforeEach(() => {
    // Create temp project structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-auto-logging-test-'));
    specweaveDir = path.join(tempDir, '.specweave');
    incrementsDir = path.join(specweaveDir, 'increments');
    logsDir = path.join(specweaveDir, 'logs');
    stateDir = path.join(specweaveDir, 'state');
    decisionsLog = path.join(logsDir, 'decisions.jsonl');

    // Create base directories
    fs.mkdirSync(specweaveDir, { recursive: true });
    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TC-005: Stop-auto logs turn counter', () => {
    it('should log turn.current and turn.max in decision context', () => {
      // Given: Active auto session with turn=5, max=20
      createConfig({ maxTurns: 20 });
      createAutoSession({ active: true });
      setTurnCounter(4); // Will be incremented to 5
      createIncrement('0001-test', { status: 'active', pendingTasks: 1 });

      // When: stop-auto.sh executes
      const result = runStopAuto();

      // Debug: Log stdout/stderr if test fails
      if (result.status !== 0) {
        console.log('Stop-auto stderr:', result.stderr);
      }

      // Then: Decision log entry has turn.current=5, turn.max=20
      const entries = readDecisionLog();

      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        context: {
          turn?: { current: number; max: number };
        };
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.context.turn).toBeDefined();
      expect(lastEntry.context.turn?.current).toBe(5);
      expect(lastEntry.context.turn?.max).toBe(20);
    });
  });

  describe('TC-006: Stop-auto logs retry counter', () => {
    it('should log retry.current, retry.max, and retry.stuck in decision context', () => {
      // Given: Active auto session with retry=2
      createConfig({ maxRetries: 20 });
      createAutoSession({ active: true });
      setTurnCounter(1);
      setRetryCounter(2, '0001-test', ['Previous reason']);
      createIncrement('0001-test', { status: 'active', pendingTasks: 1 });

      // When: stop-auto.sh executes
      const result = runStopAuto();

      // Then: Decision log entry has retry.current, retry.max, retry.stuck
      const entries = readDecisionLog();

      // Debug output for CI
      if (entries.length === 0 || !entries[entries.length - 1]) {
        console.log('TC-006 DEBUG: No entries or invalid last entry');
        console.log('stdout:', result.stdout.substring(0, 200));
        console.log('stderr:', result.stderr.substring(0, 200));
      } else {
        const entry = entries[entries.length - 1] as Record<string, unknown>;
        if (!entry.context || !(entry.context as Record<string, unknown>).retry) {
          console.log('TC-006 DEBUG: Entry exists but no retry in context');
          console.log('Entry:', JSON.stringify(entry, null, 2));
        }
      }

      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        context: {
          retry?: { current: number; max: number; stuck: boolean };
        };
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.context.retry).toBeDefined();
      expect(lastEntry.context.retry?.current).toBeGreaterThanOrEqual(2);
      expect(lastEntry.context.retry?.max).toBe(20);
      expect(typeof lastEntry.context.retry?.stuck).toBe('boolean');
    });
  });

  describe('TC-007: Stop-auto logs increment validation', () => {
    it('should log blocked increments with tasksPending and acsOpen', () => {
      // Given: Active increment with 3 pending tasks and 2 open ACs
      createConfig();
      createAutoSession({ active: true });
      setTurnCounter(1);
      createIncrement('0001-test', { status: 'active', pendingTasks: 3, openAcs: 2 });

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry has blocked[0].tasksPending=3, acsOpen=2
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        decision: string;
        context: {
          increments?: {
            active: string[];
            blocked: Array<{
              id: string;
              tasksPending: number;
              acsOpen: number;
              reason: string;
            }>;
          };
        };
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.decision).toBe('block');
      expect(lastEntry.context.increments).toBeDefined();
      expect(lastEntry.context.increments?.blocked).toBeDefined();
      expect(lastEntry.context.increments?.blocked?.length).toBeGreaterThan(0);

      const blockedInc = lastEntry.context.increments?.blocked?.[0];
      expect(blockedInc?.id).toBe('0001-test');
      expect(blockedInc?.tasksPending).toBe(3);
      expect(blockedInc?.acsOpen).toBe(2);
    });
  });

  describe('TC-Extra-001: Stop-auto logs session_inactive reason', () => {
    it('should log reasonCode=session_inactive when no auto session', () => {
      // Given: SpecWeave project but no auto session
      createConfig();
      // No auto session created

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry has reasonCode=session_inactive
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        decision: string;
        reasonCode: string;
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.decision).toBe('approve');
      expect(lastEntry.reasonCode).toBe('session_inactive');
    });
  });

  describe('TC-Extra-002: Stop-auto logs turn_limit reason', () => {
    it('should log reasonCode=turn_limit when turn limit reached', () => {
      // Given: Active auto session at turn limit
      createConfig({ maxTurns: 5 });
      createAutoSession({ active: true });
      setTurnCounter(4); // Will be incremented to 5, which equals maxTurns
      createIncrement('0001-test', { status: 'active', pendingTasks: 1 });

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry has reasonCode=turn_limit
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        decision: string;
        reasonCode: string;
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.reasonCode).toBe('turn_limit');
    });
  });

  describe('TC-Extra-003: Stop-auto logs all_complete reason', () => {
    it('should log reasonCode=all_complete when all work is done', () => {
      // Given: Active auto session with completed increment
      createConfig();
      createAutoSession({ active: true });
      setTurnCounter(1);
      createIncrement('0001-test', { status: 'active', pendingTasks: 0, openAcs: 0 });

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry has reasonCode=all_complete or work_complete
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        decision: string;
        reasonCode: string;
      };
      expect(lastEntry.hook).toBe('stop-auto');
      // Could be 'all_complete' or 'work_complete' depending on implementation
      expect(['all_complete', 'work_complete', 'auto_close']).toContain(lastEntry.reasonCode);
    });
  });

  describe('TC-Extra-004: Stop-auto logs previousReasons', () => {
    it('should include previousReasons array in context', () => {
      // Given: Active auto session with retry history
      createConfig();
      createAutoSession({ active: true });
      setTurnCounter(1);
      setRetryCounter(3, '0001-test', [
        '2 tasks still pending',
        '3 tasks still pending',
        '4 tasks still pending',
      ]);
      createIncrement('0001-test', { status: 'active', pendingTasks: 1 });

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry includes previousReasons
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        context: {
          previousReasons?: string[];
        };
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(lastEntry.context.previousReasons).toBeDefined();
      expect(Array.isArray(lastEntry.context.previousReasons)).toBe(true);
    });
  });

  describe('TC-Extra-005: Stop-auto logs durationMs', () => {
    it('should include durationMs in decision entry', () => {
      // Given: Active auto session
      createConfig();
      createAutoSession({ active: true });
      setTurnCounter(1);
      createIncrement('0001-test', { status: 'active', pendingTasks: 1 });

      // When: stop-auto.sh executes
      runStopAuto();

      // Then: Decision log entry has durationMs
      const entries = readDecisionLog();
      expect(entries.length).toBeGreaterThan(0);

      const lastEntry = entries[entries.length - 1] as {
        hook: string;
        durationMs: number;
      };
      expect(lastEntry.hook).toBe('stop-auto');
      expect(typeof lastEntry.durationMs).toBe('number');
      expect(lastEntry.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
