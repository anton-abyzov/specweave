/**
 * Unit tests for stop-auto-v5.sh helper functions
 *
 * Tests individual bash functions in isolation by sourcing the hook
 * and calling functions directly. Uses a bash harness approach.
 *
 * RED PHASE: These tests will FAIL until stop-auto-v5.sh is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getCleanEnv } from '../../test-utils/clean-env.js';

const HOOK_PATH = path.join(process.cwd(), 'plugins/specweave/hooks/stop-auto-v5.sh');

/** Run a bash snippet that sources the v5 hook functions (without executing main flow) */
function runBashHelper(
  script: string,
  opts?: { env?: Record<string, string>; cwd?: string }
): { stdout: string; stderr: string; exitCode: number } {
  // We source the hook in a subshell with __STOP_AUTO_V5_SOURCED=1
  // to prevent the main logic from executing, then run our test snippet
  const fullScript = `
    set +e
    export __STOP_AUTO_V5_SOURCED=1
    source "${HOOK_PATH}" 2>/dev/null
    ${script}
  `;

  const result = spawnSync('bash', ['-c', fullScript], {
    cwd: opts?.cwd ?? os.tmpdir(),
    env: {
      ...getCleanEnv(),
      HOME: os.homedir(),
      PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
      ...(opts?.env ?? {}),
    },
    timeout: 5000,
  });

  return {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
    exitCode: result.status ?? 1,
  };
}

describe('stop-auto-v5.sh helper functions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-helpers-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('hook file exists and is sourceable', () => {
    it('should exist at the expected path', () => {
      expect(fs.existsSync(HOOK_PATH)).toBe(true);
    });

    it('should be sourceable without errors when __STOP_AUTO_V5_SOURCED=1', () => {
      const result = runBashHelper('echo "sourced_ok"');
      expect(result.stdout.trim()).toBe('sourced_ok');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('count_pending_tasks()', () => {
    it('should return 0 for file with all completed tasks', () => {
      const tasksFile = path.join(tempDir, 'tasks.md');
      fs.writeFileSync(tasksFile, [
        '### T-001: First task',
        '**Status**: [x] completed',
        '',
        '### T-002: Second task',
        '**Status**: [x] completed',
      ].join('\n'));

      const result = runBashHelper(
        `count_pending_tasks "${tasksFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });

    it('should count tasks marked as pending', () => {
      const tasksFile = path.join(tempDir, 'tasks.md');
      fs.writeFileSync(tasksFile, [
        '### T-001: First task',
        '**Status**: [x] completed',
        '',
        '### T-002: Second task',
        '**Status**: [ ] pending',
        '',
        '### T-003: Third task',
        '**Status**: [ ] pending',
      ].join('\n'));

      const result = runBashHelper(
        `count_pending_tasks "${tasksFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('2');
    });

    it('should return 0 for empty tasks file', () => {
      const tasksFile = path.join(tempDir, 'tasks.md');
      fs.writeFileSync(tasksFile, '# Tasks\n');

      const result = runBashHelper(
        `count_pending_tasks "${tasksFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });

    it('should return 0 for non-existent file', () => {
      const result = runBashHelper(
        `count_pending_tasks "/nonexistent/tasks.md"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });

    it('should handle mixed task formats (checkbox style)', () => {
      const tasksFile = path.join(tempDir, 'tasks.md');
      fs.writeFileSync(tasksFile, [
        '- [x] T-001: Done',
        '- [ ] T-002: Not done',
        '- [x] T-003: Done',
        '- [ ] T-004: Not done',
        '- [ ] T-005: Not done',
      ].join('\n'));

      const result = runBashHelper(
        `count_pending_tasks "${tasksFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      // Should count [ ] patterns = 3
      expect(result.stdout.trim()).toBe('3');
    });
  });

  describe('count_open_acs()', () => {
    it('should return 0 when all ACs are satisfied', () => {
      const specFile = path.join(tempDir, 'spec.md');
      fs.writeFileSync(specFile, [
        '# Feature',
        '- [x] AC-US1-01: First criterion',
        '- [x] AC-US1-02: Second criterion',
      ].join('\n'));

      const result = runBashHelper(
        `count_open_acs "${specFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });

    it('should count unsatisfied ACs', () => {
      const specFile = path.join(tempDir, 'spec.md');
      fs.writeFileSync(specFile, [
        '# Feature',
        '- [x] AC-US1-01: First criterion',
        '- [ ] AC-US1-02: Second criterion',
        '- [ ] AC-US1-03: Third criterion',
      ].join('\n'));

      const result = runBashHelper(
        `count_open_acs "${specFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('2');
    });

    it('should return 0 for spec with no AC checkboxes', () => {
      const specFile = path.join(tempDir, 'spec.md');
      fs.writeFileSync(specFile, '# Feature\n\nSome description.\n');

      const result = runBashHelper(
        `count_open_acs "${specFile}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });

    it('should return 0 for non-existent file', () => {
      const result = runBashHelper(
        `count_open_acs "/nonexistent/spec.md"`,
        { env: { PROJECT_ROOT: tempDir } }
      );
      expect(result.stdout.trim()).toBe('0');
    });
  });

  describe('JSON output format', () => {
    it('silent_approve should output valid JSON with decision=approve', () => {
      const result = runBashHelper(
        `silent_approve "test reason" "test_code" "{}"`,
        { env: { PROJECT_ROOT: tempDir } }
      );

      const json = JSON.parse(result.stdout.trim());
      expect(json.decision).toBe('approve');
      expect(json.systemMessage).toBeUndefined();
    });

    it('loud_approve should include systemMessage', () => {
      const result = runBashHelper(
        `loud_approve "test reason" "test_code" "{}" "Session complete"`,
        { env: { PROJECT_ROOT: tempDir } }
      );

      const json = JSON.parse(result.stdout.trim());
      expect(json.decision).toBe('approve');
      expect(json.systemMessage).toBeDefined();
      expect(json.systemMessage).toContain('Session complete');
    });
  });

  describe('turn counter logic', () => {
    it('should start at 1 when no turn file exists', () => {
      // Run the full hook and check the turn file after
      const sessionFile = path.join(tempDir, '.specweave', 'state', 'auto-mode.json');
      fs.writeFileSync(sessionFile, JSON.stringify({ active: true }));
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ auto: { enabled: true, maxTurns: 100, maxSessionAge: 7200 } })
      );

      // Create an increment with pending tasks so the hook blocks
      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-test', status: 'active' }));
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '### T-001: Test\n**Status**: [ ] pending\n');
      fs.writeFileSync(path.join(incDir, 'spec.md'), '# Test\n');

      // Run the hook directly (not sourced)
      spawnSync('bash', [HOOK_PATH], {
        cwd: tempDir,
        input: '{}',
        env: {
          ...getCleanEnv(),
          PROJECT_ROOT: tempDir,
          HOME: os.homedir(),
          PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
        },
        timeout: 5000,
      });

      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      expect(fs.existsSync(turnFile)).toBe(true);

      const turnValue = parseInt(fs.readFileSync(turnFile, 'utf-8').trim(), 10);
      expect(turnValue).toBe(1);
    });

    it('should increment from previous value', () => {
      const turnFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-turns');
      fs.writeFileSync(turnFile, '5');

      const sessionFile = path.join(tempDir, '.specweave', 'state', 'auto-mode.json');
      fs.writeFileSync(sessionFile, JSON.stringify({ active: true }));
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ auto: { enabled: true, maxTurns: 100, maxSessionAge: 7200 } })
      );

      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-test', status: 'active' }));
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '### T-001: Test\n**Status**: [ ] pending\n');
      fs.writeFileSync(path.join(incDir, 'spec.md'), '# Test\n');

      spawnSync('bash', [HOOK_PATH], {
        cwd: tempDir,
        input: '{}',
        env: {
          ...getCleanEnv(),
          PROJECT_ROOT: tempDir,
          HOME: os.homedir(),
          PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
        },
        timeout: 5000,
      });

      const turnValue = parseInt(fs.readFileSync(turnFile, 'utf-8').trim(), 10);
      expect(turnValue).toBe(6);
    });
  });

  describe('dedup write-first pattern', () => {
    it('should write dedup file BEFORE evaluating increments', () => {
      // Set up an active session with pending work
      const sessionFile = path.join(tempDir, '.specweave', 'state', 'auto-mode.json');
      fs.writeFileSync(sessionFile, JSON.stringify({ active: true }));
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ auto: { enabled: true, maxTurns: 100, maxSessionAge: 7200 } })
      );

      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-test', status: 'active' }));
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '### T-001: Test\n**Status**: [ ] pending\n');
      fs.writeFileSync(path.join(incDir, 'spec.md'), '# Test\n');

      // Run hook
      spawnSync('bash', [HOOK_PATH], {
        cwd: tempDir,
        input: '{}',
        env: {
          ...getCleanEnv(),
          PROJECT_ROOT: tempDir,
          HOME: os.homedir(),
          PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
        },
        timeout: 5000,
      });

      // Dedup file must exist
      const dedupFile = path.join(tempDir, '.specweave', 'state', '.stop-auto-dedup-prev');
      expect(fs.existsSync(dedupFile)).toBe(true);

      // Second run should be deduped (approve silently)
      const result2 = spawnSync('bash', [HOOK_PATH], {
        cwd: tempDir,
        input: '{}',
        env: {
          ...getCleanEnv(),
          PROJECT_ROOT: tempDir,
          HOME: os.homedir(),
          PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
          SPECWEAVE_STOP_HOOK_DEDUP: '60',
        },
        timeout: 5000,
      });

      const output = JSON.parse(result2.stdout?.toString().trim() ?? '{}');
      expect(output.decision).toBe('approve');
    });
  });

  describe('hook line count', () => {
    it('should be under 200 lines', () => {
      if (!fs.existsSync(HOOK_PATH)) {
        // Skip if hook doesn't exist yet (RED phase)
        expect(true).toBe(false); // Force fail
        return;
      }
      const content = fs.readFileSync(HOOK_PATH, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThan(200);
    });
  });
});
