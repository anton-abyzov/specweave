/**
 * Unit tests for log-decision.sh
 *
 * Tests the shared decision logging utility used by all hooks.
 * Covers: core logging, log rotation, debug mode
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('log-decision.sh', () => {
  let tempDir: string;
  let logsDir: string;
  let decisionsLog: string;
  const hookPath = path.join(process.cwd(), 'plugins/specweave/hooks/log-decision.sh');

  // Helper to run log_decision function
  function runLogDecision(params: {
    hookName: string;
    decision: string;
    reasonCode: string;
    reason: string;
    contextJson?: string;
    durationMs?: number;
    debugMode?: boolean;
  }): { stdout: string; stderr: string; status: number } {
    const {
      hookName,
      decision,
      reasonCode,
      reason,
      contextJson = '{}',
      durationMs = 100,
      debugMode = false,
    } = params;

    const escapedContext = contextJson.replace(/'/g, "'\\''");
    const debugExport = debugMode ? 'export SPECWEAVE_DEBUG_HOOKS=1' : '';
    const testScript = `
      source "${hookPath}"
      export PROJECT_ROOT="${tempDir}"
      ${debugExport}
      log_decision "${hookName}" "${decision}" "${reasonCode}" "${reason}" '${escapedContext}' ${durationMs}
    `;

    const env: NodeJS.ProcessEnv = { ...process.env, PROJECT_ROOT: tempDir };
    if (debugMode) {
      env.SPECWEAVE_DEBUG_HOOKS = '1';
    }

    const result = spawnSync('bash', ['-c', testScript], {
      encoding: 'utf-8',
      env,
      timeout: 10000,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status || 0,
    };
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-decision-test-'));
    logsDir = path.join(tempDir, '.specweave', 'logs');
    decisionsLog = path.join(logsDir, 'decisions.jsonl');
    // log-decision.sh guard requires .specweave/increments/ or .specweave/config.json
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TC-001: log_decision writes to decisions.jsonl', () => {
    it('should create decisions.jsonl with JSON entry', () => {
      expect(fs.existsSync(decisionsLog)).toBe(false);

      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No auto session active',
      });

      expect(result.status).toBe(0);
      expect(fs.existsSync(decisionsLog)).toBe(true);

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);
      expect(entry).toBeDefined();
    });
  });

  describe('TC-002: Entry includes all required fields', () => {
    it('should include timestamp, hook, decision, reason, reasonCode, durationMs, context', () => {
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: '3 tasks pending in 0001-feature',
        contextJson: JSON.stringify({ tasksPending: 3 }),
        durationMs: 150,
      });

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(entry.hook).toBe('stop-auto');
      expect(entry.decision).toBe('block');
      expect(entry.reason).toBe('3 tasks pending in 0001-feature');
      expect(entry.reasonCode).toBe('work_remaining');
      expect(entry.durationMs).toBe(150);
      expect(entry.context).toBeDefined();
    });
  });

  describe('TC-003: Context is valid JSON object', () => {
    it('should parse context as JSON object', () => {
      const testContext = {
        sessionActive: true,
        turn: { current: 5, max: 20 },
        increments: ['0001-feature'],
      };

      runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: 'Work remaining',
        contextJson: JSON.stringify(testContext),
      });

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);

      expect(entry.context).toEqual(testContext);
      expect(entry.context.sessionActive).toBe(true);
      expect(entry.context.turn.current).toBe(5);
    });

    it('should handle special characters in context JSON', () => {
      // Test shell escaping edge cases: single quotes, double quotes, $variables, backticks
      const testContext = {
        message: "Value with 'single quotes' and \"double quotes\"",
        path: '/path/to/$HOME/file',
        command: '`whoami`',
        newlines: 'line1\nline2',
        special: '!@#$%^&*()',
      };

      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'special_chars_test',
        reason: "Test with 'quotes' and $vars",
        contextJson: JSON.stringify(testContext),
      });

      expect(result.status).toBe(0);
      expect(fs.existsSync(decisionsLog)).toBe(true);

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);

      // Verify special characters survived shell escaping
      expect(entry.context.message).toContain("'single quotes'");
      expect(entry.context.message).toContain('"double quotes"');
      expect(entry.context.path).toBe('/path/to/$HOME/file');
      expect(entry.context.command).toBe('`whoami`');
      expect(entry.context.special).toBe('!@#$%^&*()');
    });
  });

  describe('TC-004: Log rotation', () => {
    it('should rotate log file when it exceeds 10MB', () => {
      // Given: decisions.jsonl is 11MB
      const largeContent: string[] = [];
      const lineSize = 500;
      const linesNeeded = Math.ceil((11 * 1024 * 1024) / lineSize);

      for (let i = 0; i < linesNeeded; i++) {
        const entry = {
          timestamp: new Date().toISOString(),
          hook: 'stop-auto',
          decision: 'approve',
          reason: 'x'.repeat(400),
          reasonCode: 'test',
          durationMs: 100,
          context: {},
        };
        largeContent.push(JSON.stringify(entry));
      }

      fs.mkdirSync(logsDir, { recursive: true });
      fs.writeFileSync(decisionsLog, largeContent.join('\n') + '\n');

      const initialSize = fs.statSync(decisionsLog).size;
      expect(initialSize).toBeGreaterThan(10 * 1024 * 1024);

      // When: log_decision called
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'test_rotation',
        reason: 'Test rotation trigger',
      });

      // Then: File truncated to ~5MB
      const newSize = fs.statSync(decisionsLog).size;
      expect(newSize).toBeLessThan(6 * 1024 * 1024);
      expect(newSize).toBeGreaterThan(4 * 1024 * 1024);

      const content = fs.readFileSync(decisionsLog, 'utf-8');
      expect(content).toContain('test_rotation');
    });

    it('should not rotate log file when under 10MB', () => {
      const content: string[] = [];
      const linesNeeded = Math.ceil((5 * 1024 * 1024) / 500);

      for (let i = 0; i < linesNeeded; i++) {
        const entry = {
          timestamp: new Date().toISOString(),
          hook: 'stop-auto',
          decision: 'approve',
          reason: 'x'.repeat(400),
          reasonCode: 'existing',
          durationMs: 100,
          context: {},
        };
        content.push(JSON.stringify(entry));
      }

      fs.mkdirSync(logsDir, { recursive: true });
      fs.writeFileSync(decisionsLog, content.join('\n') + '\n');

      const initialLineCount = content.length;

      runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'new_entry',
        reason: 'Test no rotation',
      });

      const finalContent = fs.readFileSync(decisionsLog, 'utf-8');
      const finalLineCount = finalContent.trim().split('\n').length;
      expect(finalLineCount).toBe(initialLineCount + 1);
    });
  });

  describe('TC-005: Multiple entries append to log', () => {
    it('should append entries as separate JSON lines', () => {
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: 'First decision',
      });

      runLogDecision({
        hookName: 'stop-reflect',
        decision: 'approve',
        reasonCode: 'learnings_saved',
        reason: 'Second decision',
      });

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const lines = content.split('\n');

      expect(lines).toHaveLength(2);

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.hook).toBe('stop-auto');
      expect(entry2.hook).toBe('stop-reflect');
    });
  });

  describe('TC-006: Creates logs directory if missing', () => {
    it('should create .specweave/logs/ if it does not exist', () => {
      expect(fs.existsSync(logsDir)).toBe(false);

      runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No session',
      });

      expect(fs.existsSync(logsDir)).toBe(true);
      expect(fs.existsSync(decisionsLog)).toBe(true);
    });
  });

  describe('TC-011: Debug mode writes to stderr', () => {
    it('should write debug output to stderr when SPECWEAVE_DEBUG_HOOKS=1', () => {
      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'test_debug',
        reason: 'Debug test',
        debugMode: true,
      });

      expect(result.stderr).toContain('[DECISION]');
      expect(result.stderr).toContain('stop-auto');
    });

    it('should show BLOCK tag for block decisions', () => {
      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: 'Block decision test',
        debugMode: true,
      });

      expect(result.stderr).toContain('BLOCK');
      expect(result.stderr).toContain('stop-auto');
    });
  });

  describe('TC-012: Debug mode disabled by default', () => {
    it('should not write to stderr when debug mode disabled', () => {
      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No session',
        debugMode: false,
      });

      expect(result.stderr).not.toContain('[DECISION]');
      expect(result.stderr).not.toContain('[BLOCK]');
    });

    it('should not affect stdout when debug mode is enabled', () => {
      const testScript = `
        source "${hookPath}"
        export PROJECT_ROOT="${tempDir}"
        export SPECWEAVE_DEBUG_HOOKS=1
        log_decision "stop-auto" "block" "work_remaining" "Test stdout"
        echo '{"decision":"block"}'
      `;

      const result = spawnSync('bash', ['-c', testScript], {
        encoding: 'utf-8',
        env: { ...process.env, PROJECT_ROOT: tempDir, SPECWEAVE_DEBUG_HOOKS: '1' },
        timeout: 10000,
      });

      expect(result.stdout.trim()).toBe('{"decision":"block"}');
      expect(result.stderr).toContain('[BLOCK]');
    });
  });
});
