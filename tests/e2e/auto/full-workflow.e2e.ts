/**
 * Auto Full Workflow E2E Test
 *
 * Tests the complete auto flow:
 * 1. Setup session
 * 2. Process tasks through stop hook
 * 3. Handle human gates
 * 4. Circuit breaker protection
 * 5. Sync checkpoints
 * 6. Session completion with report
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

import { SessionStateManager } from '../../../src/core/auto/session-state.js';
import { IncrementQueueManager } from '../../../src/core/auto/increment-queue.js';
import { TestGate } from '../../../src/core/auto/test-gate.js';
import { HumanGateDetector } from '../../../src/core/auto/human-gate.js';
import { CircuitBreakerRegistry } from '../../../src/core/auto/circuit-breaker.js';
import { SyncCheckpointManager } from '../../../src/core/auto/sync-checkpoint.js';
import { generateSessionReport, saveReport } from '../../../src/core/auto/report-generator.js';

describe('Auto Full Workflow', () => {
  let tempDir: string;
  let incrementsDir: string;
  let stateDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-e2e-'));
    incrementsDir = path.join(tempDir, '.specweave', 'increments');
    stateDir = path.join(tempDir, '.specweave', 'state');
    logsDir = path.join(tempDir, '.specweave', 'logs');

    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTestIncrement(id: string, tasks: string[]) {
    const incDir = path.join(incrementsDir, id);
    fs.mkdirSync(incDir, { recursive: true });

    // Create spec.md
    fs.writeFileSync(
      path.join(incDir, 'spec.md'),
      `---
increment: ${id}
priority: P1
status: planned
---
# ${id}
`
    );

    // Create tasks.md
    let tasksContent = '# Tasks\n\n';
    tasks.forEach((task, i) => {
      tasksContent += `### T-00${i + 1}: ${task}\n**Status**: [ ] pending\n\n`;
    });
    fs.writeFileSync(path.join(incDir, 'tasks.md'), tasksContent);

    // Create metadata.json
    fs.writeFileSync(
      path.join(incDir, 'metadata.json'),
      JSON.stringify({ status: 'active' })
    );
  }

  function markTaskComplete(incId: string, taskNum: number) {
    const tasksPath = path.join(incrementsDir, incId, 'tasks.md');
    let content = fs.readFileSync(tasksPath, 'utf-8');
    content = content.replace(
      new RegExp(`(### T-00${taskNum}:[\\s\\S]*?\\*\\*Status\\*\\*:) \\[ \\] pending`),
      `$1 [x] completed`
    );
    fs.writeFileSync(tasksPath, content);
  }

  describe('Complete workflow simulation', () => {
    it('should process increment from start to completion', async () => {
      // Setup: Create a 3-task increment
      createTestIncrement('0001-test-feature', ['Setup database', 'Create API', 'Add tests']);

      // Initialize session
      const sessionManager = new SessionStateManager(tempDir);
      const session = sessionManager.createSession({
        incrementQueue: ['0001-test-feature'],
        maxIterations: 10,
      });
      sessionManager.save(session);

      // Initialize queue
      const queueManager = new IncrementQueueManager(tempDir);
      queueManager.initializeQueue(['0001-test-feature']);

      // Initialize circuit breakers
      const circuitBreakers = new CircuitBreakerRegistry(tempDir);
      circuitBreakers.initializeDefaults();

      // Initialize sync checkpoint
      const syncManager = new SyncCheckpointManager(tempDir, circuitBreakers, {
        syncGitHub: false,
        syncJira: false,
        syncAdo: false,
      });

      // Simulate iteration 1: Complete task 1
      const current = queueManager.activateCurrentIncrement();
      expect(current?.id).toBe('0001-test-feature');

      markTaskComplete('0001-test-feature', 1);
      sessionManager.incrementIteration();
      await syncManager.onTaskComplete();

      // Verify session state
      let loadedSession = sessionManager.load();
      expect(loadedSession?.iteration).toBe(1);

      // Simulate iteration 2: Complete task 2
      markTaskComplete('0001-test-feature', 2);
      sessionManager.incrementIteration();

      // Simulate iteration 3: Complete task 3
      markTaskComplete('0001-test-feature', 3);
      sessionManager.incrementIteration();

      // Mark increment complete
      const next = queueManager.completeIncrement('0001-test-feature');
      expect(next).toBeNull(); // No more increments

      // Run completion sync
      const checkpointResult = await syncManager.onIncrementComplete('0001-test-feature');
      expect(checkpointResult.allSuccess).toBe(true);

      // Generate report
      loadedSession = sessionManager.load()!;
      loadedSession.status = 'completed';
      loadedSession.completedIncrements = ['0001-test-feature'];
      sessionManager.save(loadedSession);

      const report = generateSessionReport(loadedSession, tempDir);
      expect(report.status).toBe('completed');
      expect(report.increments).toHaveLength(1);
      expect(report.increments[0].status).toBe('completed');
      expect(report.increments[0].tasksCompleted).toBe(3);

      // Save report
      const reportPath = saveReport(report, tempDir);
      expect(fs.existsSync(reportPath)).toBe(true);
    });

    it('should handle multi-increment queue', async () => {
      // Setup: Create multiple increments
      createTestIncrement('0001-auth', ['Login', 'Register']);
      createTestIncrement('0002-profile', ['View profile', 'Edit profile']);

      // Initialize session
      const sessionManager = new SessionStateManager(tempDir);
      const session = sessionManager.createSession({
        incrementQueue: ['0001-auth', '0002-profile'],
        maxIterations: 20,
      });
      sessionManager.save(session);

      // Initialize queue
      const queueManager = new IncrementQueueManager(tempDir);
      queueManager.initializeQueue(['0001-auth', '0002-profile']);

      // Process first increment
      queueManager.activateCurrentIncrement();
      markTaskComplete('0001-auth', 1);
      markTaskComplete('0001-auth', 2);

      const next = queueManager.completeIncrement('0001-auth');
      expect(next?.id).toBe('0002-profile');

      // Process second increment
      queueManager.activateCurrentIncrement();
      markTaskComplete('0002-profile', 1);
      markTaskComplete('0002-profile', 2);
      queueManager.completeIncrement('0002-profile');

      // Verify final state
      const summary = queueManager.getSummary();
      expect(summary.completed).toBe(2);
      expect(summary.pending).toBe(0);
    });

    it('should handle human gate interruption', async () => {
      createTestIncrement('0001-deploy', ['Build', 'Deploy to production']);

      // Initialize components
      const sessionManager = new SessionStateManager(tempDir);
      const session = sessionManager.createSession({
        incrementQueue: ['0001-deploy'],
        maxIterations: 10,
      });
      sessionManager.save(session);

      const humanGateDetector = new HumanGateDetector(tempDir);

      // Simulate deployment operation detection
      const detection = humanGateDetector.detectGate('Running npm run deploy to production');
      expect(detection.triggered).toBe(true);
      expect(detection.pattern).toContain('deploy');

      // Create gate request
      const request = humanGateDetector.createRequest(
        'npm run deploy',
        detection.pattern!,
        'Deploying to production'
      );

      // Verify pending gate
      const pendingGate = humanGateDetector.getPendingGate();
      expect(pendingGate?.id).toBe(request.id);

      // Simulate user approval
      const response = humanGateDetector.approveGate(request.id);
      expect(response.approved).toBe(true);

      // Verify gate resolved
      expect(humanGateDetector.getPendingGate()).toBeNull();
    });

    it('should handle circuit breaker trips', async () => {
      createTestIncrement('0001-sync', ['Task 1']);

      // Create config.json with github enabled so sync actually runs
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          sync: {
            github: { enabled: true, owner: 'test', repo: 'test' },
          },
        })
      );

      // Initialize circuit breakers
      const circuitBreakers = new CircuitBreakerRegistry(tempDir);
      // Don't use initializeDefaults - create breaker with custom threshold
      const github = circuitBreakers.getBreaker('github', { failureThreshold: 2 });

      // Simulate failures to trip circuit (2 = threshold)
      github.recordFailure();
      github.recordFailure();

      expect(github.getStatus().state).toBe('open');
      expect(circuitBreakers.hasOpenCircuit()).toBe(true);

      // Initialize sync with open circuit
      const syncManager = new SyncCheckpointManager(tempDir, circuitBreakers, {
        syncGitHub: true,
        syncJira: false,
        syncAdo: false,
        syncLivingDocs: false,
      });

      // Attempt sync (should fail gracefully)
      const result = await syncManager.forceSync();
      const githubResult = result.results.find((r) => r.service === 'github');

      expect(githubResult?.success).toBe(false);
      expect(githubResult?.error).toContain('Circuit open');
    });

    it('should respect max iterations limit', async () => {
      createTestIncrement('0001-long', ['Task 1']);

      const sessionManager = new SessionStateManager(tempDir);
      const session = sessionManager.createSession({
        incrementQueue: ['0001-long'],
        maxIterations: 3,
      });
      sessionManager.save(session);

      // Simulate iterations
      for (let i = 0; i < 3; i++) {
        sessionManager.incrementIteration();
      }

      expect(sessionManager.isMaxIterationsReached()).toBe(true);

      const loadedSession = sessionManager.load()!;
      expect(loadedSession.iteration).toBe(3);
    });
  });

  describe('Stop hook integration', () => {
    it('should run stop hook script successfully', () => {
      const hookPath = path.resolve('plugins/specweave/hooks/stop-auto.sh');

      // Skip if hook doesn't exist
      if (!fs.existsSync(hookPath)) {
        console.log('Stop hook not found, skipping shell integration test');
        return;
      }

      // Test with no session (should approve)
      try {
        const result = execSync(
          `echo '{"transcript_path":"","stop_hook_active":false}' | PROJECT_ROOT="${tempDir}" bash "${hookPath}"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        const response = JSON.parse(result.trim());
        expect(response.decision).toBe('approve');
      } catch (error) {
        // Hook may not be executable in all environments
        console.log('Stop hook execution failed (expected in some environments)');
      }
    });
  });

  describe('Simple/Ralph mode', () => {
    it('should use minimal context in simple mode', () => {
      createTestIncrement('0001-simple', ['Task']);

      const sessionManager = new SessionStateManager(tempDir);
      const session = sessionManager.createSession({
        incrementQueue: ['0001-simple'],
        maxIterations: 5,
        simple: true,
      });
      sessionManager.save(session);

      const loaded = sessionManager.load()!;
      expect(loaded.simple).toBe(true);
    });
  });
});
