/**
 * TDD Enforcement Guard Hook Tests
 *
 * Tests the tdd-enforcement-guard.sh hook behavior
 * for different enforcement levels and violation scenarios.
 *
 * @see spec.md US-004 (Enforcement Hook Enhancement)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('TDD Enforcement Guard', () => {
  let tempDir: string;
  let incDir: string;
  let hookPath: string;

  beforeEach(() => {
    // Create temp project structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-guard-test-'));
    incDir = path.join(tempDir, '.specweave', 'increments', '0001-test');
    fs.mkdirSync(incDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });

    // Path to the actual hook
    hookPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create metadata.json with specific testMode
   */
  function createMetadata(testMode: string): void {
    fs.writeFileSync(
      path.join(incDir, 'metadata.json'),
      JSON.stringify({ testMode }, null, 2)
    );
  }

  /**
   * Helper to create config.json with tddEnforcement level
   */
  function createConfig(tddEnforcement: string): void {
    const configDir = path.join(tempDir, '.specweave');
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ testing: { tddEnforcement } }, null, 2)
    );
  }

  /**
   * Helper to create tasks.md with specific task completions
   */
  function createTasksFile(content: string): void {
    fs.writeFileSync(path.join(incDir, 'tasks.md'), content);
  }

  /**
   * Run the hook and capture result
   */
  function runHook(): { exitCode: number; output: string } {
    const tasksPath = path.join(incDir, 'tasks.md');
    try {
      const output = execSync(`bash "${hookPath}" "${tempDir}" "${tasksPath}" "Edit"`, {
        encoding: 'utf-8',
        cwd: tempDir,
        env: { ...process.env, PATH: process.env.PATH },
      });
      return { exitCode: 0, output };
    } catch (error: unknown) {
      const execError = error as { status?: number; stdout?: string; stderr?: string };
      return {
        exitCode: execError.status || 1,
        output: (execError.stdout || '') + (execError.stderr || ''),
      };
    }
  }

  describe('testMode detection', () => {
    it('should skip enforcement when testMode is not TDD', () => {
      createMetadata('test-after');
      createTasksFile('# Tasks\n### T-001: Task\n**Status**: [x] completed');

      const result = runHook();

      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain('TDD');
    });

    it('should activate enforcement when testMode is TDD', () => {
      createMetadata('TDD');
      createConfig('warn');
      // Valid TDD tasks - no violation
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [x] completed

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should pass without warnings when no violations
      expect(result.exitCode).toBe(0);
    });
  });

  describe('enforcement levels', () => {
    it('should allow operation with warn level even with violations', () => {
      createMetadata('TDD');
      createConfig('warn');
      // GREEN completed before RED - violation
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should exit 0 (allow) but show warning
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('TDD DISCIPLINE WARNING');
    });

    it('should block operation with strict level on violations', () => {
      createMetadata('TDD');
      createConfig('strict');
      // GREEN completed before RED - violation
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should exit 1 (block) with error
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('TDD ENFORCEMENT BLOCKED');
    });

    it('should skip enforcement entirely with off level', () => {
      createMetadata('TDD');
      createConfig('off');
      // Violation that would normally trigger
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should exit 0 with no output
      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain('TDD');
    });
  });

  describe('violation detection', () => {
    it('should detect GREEN before RED violation', () => {
      createMetadata('TDD');
      createConfig('warn');
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      expect(result.output).toContain('GREEN');
      expect(result.output).toContain('RED');
    });

    it('should detect REFACTOR before GREEN violation', () => {
      createMetadata('TDD');
      createConfig('warn');
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [x] completed

### T-002: [GREEN] Implement
**Status**: [ ] pending

### T-003: [REFACTOR] Improve
**Status**: [x] completed
`);

      const result = runHook();

      expect(result.output).toContain('REFACTOR');
      expect(result.output).toContain('GREEN');
    });

    it('should not trigger on valid TDD order', () => {
      createMetadata('TDD');
      createConfig('strict');
      // Valid order: RED then GREEN then REFACTOR
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [x] completed

### T-002: [GREEN] Implement
**Status**: [x] completed

### T-003: [REFACTOR] Improve
**Status**: [x] completed
`);

      const result = runHook();

      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain('violation');
      expect(result.output).not.toContain('BLOCKED');
    });
  });

  describe('config fallback', () => {
    it('should default to warn when tddEnforcement not specified', () => {
      createMetadata('TDD');
      // Create config without tddEnforcement
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ testing: {} }, null, 2)
      );
      // Violation
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should warn but not block (default behavior)
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('WARNING');
    });

    it('should default to warn for invalid enforcement values', () => {
      createMetadata('TDD');
      createConfig('invalid-value');
      createTasksFile(`# Tasks
### T-001: [RED] Write test
**Status**: [ ] pending

### T-002: [GREEN] Implement
**Status**: [x] completed
`);

      const result = runHook();

      // Should fall back to warn
      expect(result.exitCode).toBe(0);
    });
  });
});
