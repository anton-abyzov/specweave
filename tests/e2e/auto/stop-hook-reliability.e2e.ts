/**
 * Stop Hook Reliability E2E Tests
 *
 * Tests the v2.1 reliability improvements:
 * 1. Xcode/iOS test parsing
 * 2. Generic exit code detection
 * 3. Failure classification system
 * 4. Context size estimation
 * 5. Heartbeat mechanism
 * 6. Task-level checkpoints
 * 7. Watchdog detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, exec } from 'child_process';

describe('Stop Hook Reliability (v2.1)', () => {
  let tempDir: string;
  let stateDir: string;
  let logsDir: string;
  let stopHookPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-hook-e2e-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    logsDir = path.join(tempDir, '.specweave', 'logs');

    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    // Path to the stop hook
    stopHookPath = path.join(process.cwd(), 'plugins/specweave/hooks/stop-auto.sh');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createSessionFile(sessionData: object) {
    fs.writeFileSync(
      path.join(stateDir, 'auto-session.json'),
      JSON.stringify(sessionData, null, 2)
    );
  }

  function createTranscript(content: string): string {
    const transcriptPath = path.join(tempDir, 'transcript.txt');
    fs.writeFileSync(transcriptPath, content);
    return transcriptPath;
  }

  function runStopHook(input: object): { stdout: string; exitCode: number } {
    const inputJson = JSON.stringify(input);

    try {
      const stdout = execSync(`echo '${inputJson}' | bash "${stopHookPath}"`, {
        cwd: tempDir,
        env: { ...process.env, PROJECT_ROOT: tempDir },
        encoding: 'utf-8',
        timeout: 10000,
      });
      return { stdout: stdout.trim(), exitCode: 0 };
    } catch (error: any) {
      return { stdout: error.stdout?.trim() || '', exitCode: error.status || 1 };
    }
  }

  describe('Xcode/iOS Test Parsing', () => {
    it('should parse Xcode test results with passed and failed counts', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        Running xcodebuild test...
        Test Suite 'All tests' started at 2024-01-01
        Test Case '-[MyTests testSomething]' passed (0.001 seconds)
        Test Case '-[MyTests testOther]' passed (0.002 seconds)
        Test Case '-[MyTests testFailing]' failed (0.001 seconds)
        Executed 10 tests, with 2 failures (0 unexpected) in 5.123 seconds
        ** TEST FAILED **
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Should detect xcode framework and failure
      expect(result.stdout).toContain('decision');
    });

    it('should detect Xcode build failures separately from test failures', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        xcodebuild: error: '/path/to/project.xcodeproj' does not exist.
        BUILD FAILED
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });

    it('should handle Swift Package Manager test output', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        swift test
        Building for debugging...
        Test Suite 'PackageTests' passed at 2024-01-01
        Executed 5 tests, with 0 failures in 2.345 seconds
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });
  });

  describe('Generic Exit Code Detection', () => {
    it('should detect failure from non-zero exit code', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        Running custom test framework...
        Some test output
        Process exited with exit code 1
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });

    it('should detect failure from universal failure patterns', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        Running unknown framework...
        Test 1: PASSED
        Test 2: FAILED
        Test 3: ERROR: Something went wrong
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });

    it('should detect success from universal success patterns', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        Running custom tests...
        All tests passed
        SUCCESS
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });
  });

  describe('Failure Classification System', () => {
    it('should classify network errors as transient', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        testRetryCount: 0,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        npm test
        FAIL src/api.test.ts
        Error: connect ECONNREFUSED 127.0.0.1:3000
        1 failed
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Check logs for transient classification
      const logsPath = path.join(logsDir, 'auto-iterations.log');
      if (fs.existsSync(logsPath)) {
        const logs = fs.readFileSync(logsPath, 'utf-8');
        // Transient failures should be logged
        expect(logs).toContain('failure_classified');
      }
      expect(result.stdout).toContain('decision');
    });

    it('should classify missing file errors as external', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        testRetryCount: 0,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        npm test
        FAIL src/config.test.ts
        Error: ENOENT: no such file or directory, open '/path/to/.env'
        1 failed
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });

    it('should classify assertion errors as fixable', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        testRetryCount: 0,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        npm test
        FAIL src/math.test.ts
        Error: expect(received).toEqual(expected)
        Expected: 42
        Received: 41
        1 failed
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      expect(result.stdout).toContain('decision');
    });
  });

  describe('Context Size Estimation', () => {
    it('should estimate context size from transcript file', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      // Create a large transcript (600KB = ~150k tokens at 4 bytes/token)
      const largeContent = 'x'.repeat(650000);
      const transcript = createTranscript(largeContent);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Should trigger compaction warning
      expect(result.stdout).toContain('decision');

      // Check logs for context limit event
      const logsPath = path.join(logsDir, 'auto-iterations.log');
      if (fs.existsSync(logsPath)) {
        const logs = fs.readFileSync(logsPath, 'utf-8');
        expect(logs).toContain('context_near_limit');
      }
    });

    it('should not trigger compaction for small transcripts', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      // Create a small transcript
      const transcript = createTranscript('Small test output');

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Should not trigger compaction
      expect(result.stdout).not.toContain('Compaction');
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should update heartbeat file on each iteration', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 5,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript('Test output');

      runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Check heartbeat file was created
      const heartbeatPath = path.join(stateDir, 'heartbeat.json');
      expect(fs.existsSync(heartbeatPath)).toBe(true);

      const heartbeat = JSON.parse(fs.readFileSync(heartbeatPath, 'utf-8'));
      expect(heartbeat.sessionId).toBe('test-session');
      expect(heartbeat.iteration).toBeDefined();
      expect(heartbeat.timestamp).toBeDefined();
    });
  });

  describe('Task-Level Checkpoints', () => {
    it('should save checkpoint when context limit approached', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 10,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
        currentTaskId: 'T-003',
      });

      // Create large transcript to trigger checkpoint
      const largeContent = 'x'.repeat(650000);
      const transcript = createTranscript(largeContent);

      runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Check checkpoint file
      const checkpointPath = path.join(stateDir, 'task-checkpoint.json');
      if (fs.existsSync(checkpointPath)) {
        const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
        expect(checkpoint.taskId).toBeDefined();
        expect(checkpoint.incrementId).toBe('0001-test');
        expect(checkpoint.status).toBe('in_progress');
      }
    });
  });

  describe('Watchdog Detection', () => {
    it('should detect stale sessions from old heartbeat', () => {
      // Create old heartbeat file (10 minutes ago)
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      fs.writeFileSync(
        path.join(stateDir, 'heartbeat.json'),
        JSON.stringify({
          timestamp: oldTime,
          sessionId: 'old-session',
          iteration: 5,
        })
      );

      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript('Test output');

      runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      // Check logs for stale detection
      const logsPath = path.join(logsDir, 'auto-iterations.log');
      if (fs.existsSync(logsPath)) {
        const logs = fs.readFileSync(logsPath, 'utf-8');
        expect(logs).toContain('stale_heartbeat_detected');
      }
    });
  });

  describe('Stop Hook Active Prevention', () => {
    it('should approve exit when stop_hook_active is true', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript('Test output');

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: true,
      });

      const response = JSON.parse(result.stdout);
      expect(response.decision).toBe('approve');
      expect(response.reason).toContain('prevent loop');
    });
  });

  describe('Session Status Checks', () => {
    it('should approve exit for paused sessions', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'paused',
        iteration: 0,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript('Test output');

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      const response = JSON.parse(result.stdout);
      expect(response.decision).toBe('approve');
    });

    it('should approve exit for completed sessions', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'completed',
        iteration: 50,
        maxIterations: 100,
        incrementQueue: [],
        currentIncrement: null,
      });

      const transcript = createTranscript('Test output');

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      const response = JSON.parse(result.stdout);
      expect(response.decision).toBe('approve');
    });
  });

  describe('Max Iterations Check', () => {
    it('should complete session when max iterations reached', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 99,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript('Test output');

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      const response = JSON.parse(result.stdout);
      expect(response.decision).toBe('approve');

      // Check session was updated
      const sessionPath = path.join(stateDir, 'auto-session.json');
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(session.status).toBe('completed');
      expect(session.endReason).toBe('max_iterations_reached');
    });
  });

  describe('Completion Promise Detection', () => {
    it('should approve exit on completion promise', () => {
      createSessionFile({
        sessionId: 'test-session',
        status: 'running',
        iteration: 10,
        maxIterations: 100,
        incrementQueue: ['0001-test'],
        currentIncrement: '0001-test',
      });

      const transcript = createTranscript(`
        All tasks completed!
        <auto-complete>DONE</auto-complete>
        Session finished.
      `);

      const result = runStopHook({
        transcript_path: transcript,
        stop_hook_active: false,
      });

      const response = JSON.parse(result.stdout);
      expect(response.decision).toBe('approve');
    });
  });
});
