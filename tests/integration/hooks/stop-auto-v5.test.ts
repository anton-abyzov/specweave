/**
 * Integration tests for stop-auto-v5.sh - Simplified Auto Mode Stop Hook
 *
 * Tests the NEW simplified hook behavior per ADR-0225:
 * - Hook is a simple gate (~175 lines): is auto active? is there pending work?
 * - No test running (broken in v4), no LLM eval, no auto-close, no retry counter
 * - Quality gates belong in /sw:done, not the hook
 * - Dedup uses write-first pattern to prevent race condition
 * - Block messages are concise (<500 chars), not 40+ line walls
 *
 * RED PHASE: These tests will FAIL until stop-auto-v5.sh is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { getCleanEnv } from '../../test-utils/clean-env.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const HOOK_RELATIVE = '../../../plugins/specweave/hooks/stop-auto-v5.sh';

interface HookResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json: Record<string, unknown>;
}

/** Run the v5 stop hook against a temp project directory */
async function runHook(
  tempDir: string,
  hookPath: string,
  opts?: { env?: Record<string, string>; stdinData?: string }
): Promise<HookResult> {
  const stdinData = opts?.stdinData ?? '{}';

  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [hookPath], {
      cwd: tempDir,
      env: {
        ...getCleanEnv(),
        PROJECT_ROOT: tempDir,
        HOME: os.homedir(),
        PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
        ...(opts?.env ?? {}),
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.stdin.write(stdinData);
    proc.stdin.end();

    proc.on('close', (code) => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(stdout.trim());
      } catch {
        // Allow non-JSON stdout for error cases
      }
      resolve({ stdout: stdout.trim(), stderr, exitCode: code ?? 0, json });
    });

    proc.on('error', reject);

    // Safety timeout
    setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Hook timed out after 10s'));
    }, 10_000);
  });
}

/** Create a minimal SpecWeave project structure in tempDir */
async function setupProject(tempDir: string): Promise<void> {
  await fs.mkdir(path.join(tempDir, '.specweave', 'state'), { recursive: true });
  await fs.mkdir(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
  await fs.mkdir(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
}

/** Write auto-mode.json session marker */
async function writeSessionMarker(
  tempDir: string,
  data: Record<string, unknown>
): Promise<void> {
  const filePath = path.join(tempDir, '.specweave', 'state', 'auto-mode.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/** Create an increment with tasks.md and metadata.json */
async function createIncrement(
  tempDir: string,
  id: string,
  opts: {
    status?: string;
    tasks?: Array<{ id: string; title: string; done: boolean }>;
    acs?: Array<{ id: string; done: boolean }>;
  } = {}
): Promise<void> {
  const incDir = path.join(tempDir, '.specweave', 'increments', id);
  await fs.mkdir(incDir, { recursive: true });

  // metadata.json
  await fs.writeFile(
    path.join(incDir, 'metadata.json'),
    JSON.stringify({
      id,
      title: id.replace(/^\d+-/, '').replace(/-/g, ' '),
      status: opts.status ?? 'active',
    }, null, 2)
  );

  // tasks.md
  const tasks = opts.tasks ?? [{ id: 'T-001', title: 'Default task', done: false }];
  const taskLines = tasks.map(
    (t) => `### ${t.id}: ${t.title}\n**Status**: [${t.done ? 'x' : ' '}] ${t.done ? 'completed' : 'pending'}`
  );
  await fs.writeFile(path.join(incDir, 'tasks.md'), taskLines.join('\n\n') + '\n');

  // spec.md (with ACs if provided)
  if (opts.acs && opts.acs.length > 0) {
    const acLines = opts.acs.map(
      (ac) => `- [${ac.done ? 'x' : ' '}] ${ac.id}: Some acceptance criterion`
    );
    await fs.writeFile(
      path.join(incDir, 'spec.md'),
      `# ${id}\n\n**Acceptance Criteria:**\n${acLines.join('\n')}\n`
    );
  } else {
    await fs.writeFile(path.join(incDir, 'spec.md'), `# ${id}\n`);
  }
}

/** Write a minimal config.json */
async function writeConfig(
  tempDir: string,
  config: Record<string, unknown> = {}
): Promise<void> {
  const defaults = {
    auto: { enabled: true, maxTurns: 20, maxSessionAge: 7200 },
    ...config,
  };
  await fs.writeFile(
    path.join(tempDir, '.specweave', 'config.json'),
    JSON.stringify(defaults, null, 2)
  );
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('stop-auto-v5.sh - Simplified Stop Hook', () => {
  let tempDir: string;
  let hookPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-auto-v5-'));
    hookPath = path.resolve(__dirname, HOOK_RELATIVE);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ─── Quick Exits ────────────────────────────────────────────────────────

  describe('Quick Exits (no auto mode)', () => {
    it('should approve silently when not a SpecWeave project', async () => {
      // tempDir has no .specweave/ directory
      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
      // Silent approve = no systemMessage
      expect(result.json.systemMessage).toBeUndefined();
    });

    it('should approve silently when no increments directory', async () => {
      // Create .specweave but no increments/
      await fs.mkdir(path.join(tempDir, '.specweave', 'state'), { recursive: true });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
    });

    it('should approve silently when no auto-mode.json exists', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
      expect(result.json.systemMessage).toBeUndefined();
    });

    it('should approve silently when session is inactive', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: false, startedAt: new Date().toISOString() });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
    });

    it('should approve silently when auto.enabled is false in config', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: false } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
    });
  });

  // ─── Staleness Detection ────────────────────────────────────────────────

  describe('Staleness Detection', () => {
    it('should approve and cleanup when session is stale', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: true, maxSessionAge: 60 } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      const sessionFile = path.join(tempDir, '.specweave', 'state', 'auto-mode.json');

      // Backdate the file 120 seconds (exceeds maxSessionAge of 60)
      const pastTime = new Date(Date.now() - 120_000);
      await fs.utimes(sessionFile, pastTime, pastTime);

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');

      // Should have cleaned up state files
      const sessionExists = await fs.access(sessionFile).then(() => true).catch(() => false);
      expect(sessionExists).toBe(false);
    });
  });

  // ─── Active Session - Work Tracking ─────────────────────────────────────

  describe('Active Session - Work Tracking', () => {
    it('should approve when all increments are completed', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // Increment with all tasks done
      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'First task', done: true },
          { id: 'T-002', title: 'Second task', done: true },
        ],
        acs: [
          { id: 'AC-US1-01', done: true },
          { id: 'AC-US1-02', done: true },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
    });

    it('should approve when no active increments exist (all completed/archived)', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // Only a completed increment
      await createIncrement(tempDir, '0100-feature', { status: 'completed' });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
    });

    it('should block when active increment has pending tasks', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Done task', done: true },
          { id: 'T-002', title: 'Pending task', done: false },
          { id: 'T-003', title: 'Another pending', done: false },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('block');
      expect(result.json.systemMessage).toBeDefined();
    });

    it('should block when active increment has open acceptance criteria', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // All tasks done but ACs not satisfied
      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Task', done: true },
        ],
        acs: [
          { id: 'AC-US1-01', done: true },
          { id: 'AC-US1-02', done: false },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('block');
    });

    it('should block showing first incomplete increment when multiple exist', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // First: complete
      await createIncrement(tempDir, '0100-done-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Done', done: true }],
      });

      // Second: incomplete
      await createIncrement(tempDir, '0101-wip-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Done', done: true },
          { id: 'T-002', title: 'Pending', done: false },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('block');
      // Block message should reference the incomplete increment
      const msg = result.json.systemMessage as string;
      expect(msg).toContain('0101-wip-feature');
    });
  });

  // ─── Turn Counter ───────────────────────────────────────────────────────

  describe('Turn Counter (Safety Net)', () => {
    it('should approve with message when turn limit is reached', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: true, maxTurns: 5 } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // Create active increment with pending work
      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Pre-set turn counter to 4 (next call = turn 5 = limit)
      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      await fs.writeFile(turnFile, '4');

      const result = await runHook(tempDir, hookPath);

      expect(result.exitCode).toBe(0);
      expect(result.json.decision).toBe('approve');
      // Should explain why it's approving despite pending work
      expect(result.json.systemMessage).toBeDefined();
      const msg = result.json.systemMessage as string;
      expect(msg).toMatch(/turn.*limit|limit.*reached/i);
    });

    it('should increment turn counter on each invocation', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: true, maxTurns: 100 } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Run hook twice
      await runHook(tempDir, hookPath);
      await runHook(tempDir, hookPath);

      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      const turnCount = parseInt(await fs.readFile(turnFile, 'utf-8'), 10);

      // After 2 invocations, turn counter should be 2
      expect(turnCount).toBe(2);
    });

    it('should clean up state files when turn limit is reached', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: true, maxTurns: 3 } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Set turn counter to 2 (next = 3 = limit)
      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      await fs.writeFile(turnFile, '2');

      await runHook(tempDir, hookPath);

      // State files should be cleaned up
      const sessionExists = await fs.access(
        path.join(tempDir, '.specweave', 'state', 'auto-mode.json')
      ).then(() => true).catch(() => false);
      expect(sessionExists).toBe(false);

      const turnExists = await fs.access(turnFile).then(() => true).catch(() => false);
      expect(turnExists).toBe(false);
    });
  });

  // ─── Deduplication ──────────────────────────────────────────────────────

  describe('Deduplication', () => {
    it('should approve silently when fired within dedup window', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // First call should block
      const result1 = await runHook(tempDir, hookPath);
      expect(result1.json.decision).toBe('block');

      // Second call within dedup window should approve (dedup)
      const result2 = await runHook(tempDir, hookPath);
      expect(result2.json.decision).toBe('approve');
      expect(result2.json.systemMessage).toBeUndefined();
    });

    it('should write dedup timestamp BEFORE processing (write-first pattern)', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Run hook once
      await runHook(tempDir, hookPath);

      // Dedup prev marker should exist after the hook runs
      const dedupFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-dedup-prev');
      const dedupExists = await fs.access(dedupFile).then(() => true).catch(() => false);
      expect(dedupExists).toBe(true);

      // The value should be a unix timestamp
      const dedupValue = (await fs.readFile(dedupFile, 'utf-8')).trim();
      expect(parseInt(dedupValue, 10)).toBeGreaterThan(1700000000);
    });

    it('should respect custom dedup window from env var', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // First call with very large dedup window
      const result1 = await runHook(tempDir, hookPath, {
        env: { SPECWEAVE_STOP_HOOK_DEDUP: '3600' },
      });
      expect(result1.json.decision).toBe('block');

      // Second call should be deduped due to large window
      const result2 = await runHook(tempDir, hookPath, {
        env: { SPECWEAVE_STOP_HOOK_DEDUP: '3600' },
      });
      expect(result2.json.decision).toBe('approve');
    });
  });

  // ─── Block Message Quality ──────────────────────────────────────────────

  describe('Block Message Quality', () => {
    it('should produce a concise block message (< 500 chars)', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Task one', done: true },
          { id: 'T-002', title: 'Task two', done: false },
          { id: 'T-003', title: 'Task three', done: false },
        ],
        acs: [
          { id: 'AC-US1-01', done: true },
          { id: 'AC-US1-02', done: false },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      expect(result.json.decision).toBe('block');
      const msg = result.json.systemMessage as string;
      expect(msg).toBeDefined();
      expect(msg.length).toBeLessThan(500);
    });

    it('should include increment ID in block message', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-my-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      const result = await runHook(tempDir, hookPath);
      const msg = result.json.systemMessage as string;
      expect(msg).toContain('0100-my-feature');
    });

    it('should include pending task count in block message', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Done', done: true },
          { id: 'T-002', title: 'Pending 1', done: false },
          { id: 'T-003', title: 'Pending 2', done: false },
          { id: 'T-004', title: 'Pending 3', done: false },
        ],
      });

      const result = await runHook(tempDir, hookPath);
      const msg = result.json.systemMessage as string;
      // Should mention 3 pending tasks
      expect(msg).toMatch(/3\s*task/i);
    });

    it('should include actionable guidance (/sw:do or /sw:done)', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      const result = await runHook(tempDir, hookPath);
      const msg = result.json.systemMessage as string;
      // Should contain at least one actionable command
      expect(msg).toMatch(/\/sw:(do|done)/);
    });

    it('should include turn counter info in block message', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, { auto: { enabled: true, maxTurns: 50 } });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Pre-set turn counter
      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      await fs.writeFile(turnFile, '7');

      const result = await runHook(tempDir, hookPath);
      const msg = result.json.systemMessage as string;
      // Should show turn X/Y
      expect(msg).toMatch(/8\s*\/\s*50|turn\s*8/i);
    });
  });

  // ─── Decision Logging ───────────────────────────────────────────────────

  describe('Decision Logging', () => {
    it('should log block decisions to decisions.jsonl', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      await runHook(tempDir, hookPath);

      const decisionsFile = path.join(tempDir, '.specweave', 'logs', 'decisions.jsonl');
      const content = await fs.readFile(decisionsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      expect(lines.length).toBeGreaterThanOrEqual(1);

      const entry = JSON.parse(lines[lines.length - 1]);
      expect(entry.hook).toBe('stop-auto');
      expect(entry.decision).toBe('block');
      expect(entry.reasonCode).toBeDefined();
    });

    it('should log approve decisions to decisions.jsonl', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      // No session marker = silent approve

      await runHook(tempDir, hookPath);

      const decisionsFile = path.join(tempDir, '.specweave', 'logs', 'decisions.jsonl');
      const exists = await fs.access(decisionsFile).then(() => true).catch(() => false);
      if (exists) {
        const content = await fs.readFile(decisionsFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        if (lines.length > 0) {
          const entry = JSON.parse(lines[lines.length - 1]);
          expect(entry.decision).toBe('approve');
        }
      }
      // It's OK if quick-exit paths don't log (less overhead)
    });
  });

  // ─── Negative: Features NOT in v5 Hook ──────────────────────────────────

  describe('Removed Features (should NOT exist)', () => {
    it('should NOT run npm test or any test commands', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir, {
        auto: { enabled: true, requireTests: true },
        testing: { defaultTestMode: 'TDD' },
      });
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      const result = await runHook(tempDir, hookPath);

      // Hook should block due to pending tasks, NOT due to test failures
      expect(result.json.decision).toBe('block');
      // stderr should NOT contain npm or test runner output
      expect(result.stderr).not.toMatch(/npm test|vitest|jest|mocha/i);
    });

    it('should NOT have a retry counter', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      // Run hook multiple times
      await runHook(tempDir, hookPath);

      // Wait for dedup to expire (use short dedup window)
      const dedupFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-dedup');
      await fs.rm(dedupFile, { force: true });
      await runHook(tempDir, hookPath);

      // No retry file should be created
      const retryFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-retry');
      const retryExists = await fs.access(retryFile).then(() => true).catch(() => false);
      expect(retryExists).toBe(false);
    });

    it('should NOT auto-close increments (no specweave complete calls)', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      // Increment with ALL tasks done
      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [
          { id: 'T-001', title: 'Done', done: true },
          { id: 'T-002', title: 'Also done', done: true },
        ],
        acs: [
          { id: 'AC-US1-01', done: true },
        ],
      });

      const result = await runHook(tempDir, hookPath);

      // Should approve (work complete), but NOT change increment status
      expect(result.json.decision).toBe('approve');

      // Increment should still be "active" (not "completed")
      const metadataRaw = await fs.readFile(
        path.join(tempDir, '.specweave', 'increments', '0100-feature', 'metadata.json'),
        'utf-8'
      );
      const metadata = JSON.parse(metadataRaw);
      expect(metadata.status).toBe('active');
    });
  });

  // ─── Performance ────────────────────────────────────────────────────────

  describe('Performance', () => {
    it('should execute in < 500ms for quick exits (no auto mode)', async () => {
      // No .specweave directory at all
      const start = Date.now();
      await runHook(tempDir, hookPath);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });

    it('should execute in < 2000ms for blocking decisions', async () => {
      await setupProject(tempDir);
      await writeConfig(tempDir);
      await writeSessionMarker(tempDir, { active: true, startedAt: new Date().toISOString() });

      await createIncrement(tempDir, '0100-feature', {
        status: 'active',
        tasks: [{ id: 'T-001', title: 'Pending', done: false }],
      });

      const start = Date.now();
      await runHook(tempDir, hookPath);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });
  });
});
