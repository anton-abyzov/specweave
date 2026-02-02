/**
 * Unit tests for log-decision.sh
 *
 * Tests the shared decision logging utility used by all hooks.
 * TDD Phase: RED - These tests should FAIL until log-decision.sh is implemented.
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
  }): { stdout: string; stderr: string; status: number } {
    const { hookName, decision, reasonCode, reason, contextJson = '{}', durationMs = 100 } = params;

    // Create a test script that sources log-decision.sh and calls log_decision
    // Note: contextJson needs to be properly escaped for shell
    const escapedContext = contextJson.replace(/'/g, "'\\''");
    const testScript = `
      source "${hookPath}"
      export PROJECT_ROOT="${tempDir}"
      log_decision "${hookName}" "${decision}" "${reasonCode}" "${reason}" '${escapedContext}' ${durationMs}
    `;

    const result = spawnSync('bash', ['-c', testScript], {
      encoding: 'utf-8',
      env: { ...process.env, PROJECT_ROOT: tempDir },
      timeout: 10000,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status || 0,
    };
  }

  beforeEach(() => {
    // Create temp project structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-decision-test-'));
    logsDir = path.join(tempDir, '.specweave', 'logs');
    decisionsLog = path.join(logsDir, 'decisions.jsonl');

    // Create .specweave directory (logs dir will be created by log_decision)
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TC-001: log_decision writes to decisions.jsonl', () => {
    it('should create decisions.jsonl with JSON entry', () => {
      // Given: Empty log directory
      expect(fs.existsSync(decisionsLog)).toBe(false);

      // When: log_decision called with valid params
      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No auto session active',
      });

      // Then: decisions.jsonl created with JSON entry
      expect(result.status).toBe(0);
      expect(fs.existsSync(decisionsLog)).toBe(true);

      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);
      expect(entry).toBeDefined();
    });
  });

  describe('TC-002: Entry includes all required fields', () => {
    it('should include timestamp, hook, decision, reason, reasonCode, durationMs, context', () => {
      // When: log_decision called
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: '3 tasks pending in 0001-feature',
        contextJson: JSON.stringify({ tasksPending: 3 }),
        durationMs: 150,
      });

      // Then: Entry has all required fields
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

      // When: log_decision called with context JSON
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'block',
        reasonCode: 'work_remaining',
        reason: 'Work remaining',
        contextJson: JSON.stringify(testContext),
      });

      // Then: context field is parseable object
      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const entry = JSON.parse(content);

      expect(entry.context).toEqual(testContext);
      expect(entry.context.sessionActive).toBe(true);
      expect(entry.context.turn.current).toBe(5);
    });
  });

  describe('TC-004: Multiple entries append to log', () => {
    it('should append entries as separate JSON lines', () => {
      // When: Multiple log_decision calls
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

      // Then: Both entries in file, one per line
      const content = fs.readFileSync(decisionsLog, 'utf-8').trim();
      const lines = content.split('\n');

      expect(lines).toHaveLength(2);

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.hook).toBe('stop-auto');
      expect(entry2.hook).toBe('stop-reflect');
    });
  });

  describe('TC-005: Creates logs directory if missing', () => {
    it('should create .specweave/logs/ if it does not exist', () => {
      // Given: No logs directory
      expect(fs.existsSync(logsDir)).toBe(false);

      // When: log_decision called
      runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No session',
      });

      // Then: Directory created
      expect(fs.existsSync(logsDir)).toBe(true);
      expect(fs.existsSync(decisionsLog)).toBe(true);
    });
  });

  describe('Debug mode', () => {
    it('TC-011: should write to stderr when SPECWEAVE_DEBUG_HOOKS=1', () => {
      // Create test script with debug mode
      const testScript = `
        source "${hookPath}"
        PROJECT_ROOT="${tempDir}"
        export SPECWEAVE_DEBUG_HOOKS=1
        log_decision "stop-auto" "approve" "session_inactive" "No session" '{}' 100
      `;

      const result = spawnSync('bash', ['-c', testScript], {
        encoding: 'utf-8',
        env: { ...process.env, PROJECT_ROOT: tempDir, SPECWEAVE_DEBUG_HOOKS: '1' },
        timeout: 10000,
      });

      // Then: Debug output appears on stderr
      expect(result.stderr).toContain('DEBUG');
      expect(result.stderr).toContain('stop-auto');
    });

    it('TC-012: should not write to stderr when debug mode disabled', () => {
      // When: log_decision called without debug mode
      const result = runLogDecision({
        hookName: 'stop-auto',
        decision: 'approve',
        reasonCode: 'session_inactive',
        reason: 'No session',
      });

      // Then: No stderr output (or minimal)
      // Note: Some minimal stderr might exist for errors, but no DEBUG prefix
      expect(result.stderr).not.toContain('[DEBUG]');
    });
  });
});
