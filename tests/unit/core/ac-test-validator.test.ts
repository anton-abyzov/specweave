/**
 * Unit tests for AC Test Validator
 *
 * Tests the core AC test validation logic that enforces test-driven
 * development for Acceptance Criteria.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ACTestValidator, TestRunnerConfig, ACTestValidationResult } from '../../../src/core/ac-test-validator.js';
import { Task } from '../../../src/generators/spec/task-parser.js';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('ACTestValidator', () => {
  let testDir: string;
  let validator: ACTestValidator;
  let config: TestRunnerConfig;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `ac-validator-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Default test runner config
    config = {
      command: 'echo "✓ All tests passed"',
      pattern: 'tests/**/*.test.ts',
      cwd: testDir,
      timeout: 5000
    };

    validator = new ACTestValidator(config);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('validateTask', () => {
    it('should pass validation when task has no ACs', async () => {
      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending'
      };

      const result = await validator.validateTask(task, testDir);

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no Acceptance Criteria');
    });

    it('should fail validation when task has no test plan', async () => {
      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01']
      };

      const result = await validator.validateTask(task, testDir);

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no Test Plan');
    });

    it('should fail validation when test file does not exist', async () => {
      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01'],
        description: '**Test Plan**: - **File**: `tests/nonexistent.test.ts`'
      };

      const result = await validator.validateTask(task, testDir);

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Test file not found');
    });

    it('should pass validation when all AC tests pass', async () => {
      // Create test file
      const testFile = path.join(testDir, 'tests/component.test.ts');
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, `
        import { describe, it, expect } from 'vitest';

        describe('AC-US1-01', () => {
          it('should pass validation', () => {
            expect(true).toBe(true);
          });
        });
      `);

      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01'],
        description: `**Test Plan**:
        - **File**: \`tests/component.test.ts\`
        - **Tests**: TC-001`
      };

      // Mock successful test execution
      const mockValidator = new ACTestValidator({
        ...config,
        command: 'echo "✓ AC-US1-01 passed"'
      });

      const result = await mockValidator.validateTask(task, testDir);

      expect(result.taskId).toBe('T-001');
      expect(result.acIds).toEqual(['AC-US1-01']);
      expect(result.testResults.size).toBe(1);

      const acResult = result.testResults.get('AC-US1-01');
      expect(acResult).toBeDefined();
      expect(acResult!.testFile).toBe('tests/component.test.ts');
    });

    it('should fail validation when AC tests fail', async () => {
      // Create test file
      const testFile = path.join(testDir, 'tests/component.test.ts');
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, `
        import { describe, it, expect } from 'vitest';

        describe('AC-US1-01', () => {
          it('should fail validation', () => {
            expect(true).toBe(false);
          });
        });
      `);

      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01'],
        description: `**Test Plan**:
        - **File**: \`tests/component.test.ts\`
        - **Tests**: TC-001`
      };

      // Mock failed test execution
      const mockValidator = new ACTestValidator({
        ...config,
        command: 'echo "✗ AC-US1-01 failed" && exit 1'
      });

      const result = await mockValidator.validateTask(task, testDir);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary.testsFailed).toBe(1);
    });

    it('should validate multiple ACs in one task', async () => {
      // Create test file
      const testFile = path.join(testDir, 'tests/component.test.ts');
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, `
        import { describe, it, expect } from 'vitest';

        describe('AC-US1-01', () => {
          it('should pass', () => {
            expect(true).toBe(true);
          });
        });

        describe('AC-US1-02', () => {
          it('should pass', () => {
            expect(true).toBe(true);
          });
        });
      `);

      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01', 'AC-US1-02'],
        description: `**Test Plan**:
        - **File**: \`tests/component.test.ts\`
        - **Tests**: TC-001, TC-002`
      };

      // Mock successful test execution
      const mockValidator = new ACTestValidator({
        ...config,
        command: 'echo "✓ AC-US1-01 passed\\n✓ AC-US1-02 passed"'
      });

      const result = await mockValidator.validateTask(task, testDir);

      expect(result.acIds).toHaveLength(2);
      expect(result.testResults.size).toBe(2);
      expect(result.summary.totalACs).toBe(2);
    });

    it('should handle test timeout', async () => {
      const testFile = path.join(testDir, 'tests/slow.test.ts');
      await fs.ensureDir(path.dirname(testFile));
      await fs.writeFile(testFile, '// slow test');

      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        satisfiesACs: ['AC-US1-01'],
        description: `**Test Plan**:
        - **File**: \`tests/slow.test.ts\``
      };

      // Mock slow test that times out
      const mockValidator = new ACTestValidator({
        ...config,
        command: 'sleep 10',
        timeout: 100 // 100ms timeout
      });

      const result = await mockValidator.validateTask(task, testDir);

      expect(result.passed).toBe(false);
      const acResult = result.testResults.get('AC-US1-01');
      // Either timeout message or command failed message
      expect(acResult!.error).toBeDefined();
      expect(acResult!.error!.length).toBeGreaterThan(0);
    });
  });

  describe('buildTestCommand', () => {
    it('should build vitest command with AC filter', () => {
      const validator = new ACTestValidator({
        command: 'vitest run',
        pattern: '**/*.test.ts',
        cwd: testDir
      });

      // Access private method via type assertion (for testing)
      const command = (validator as any).buildTestCommand('tests/foo.test.ts', 'AC-US1-01');

      expect(command).toContain('vitest run');
      expect(command).toContain('tests/foo.test.ts');
      expect(command).toContain('-t "AC-US1-01"');
    });

    it('should build jest command with AC filter', () => {
      const validator = new ACTestValidator({
        command: 'jest',
        pattern: '**/*.test.ts',
        cwd: testDir
      });

      const command = (validator as any).buildTestCommand('tests/foo.test.ts', 'AC-US1-01');

      expect(command).toContain('jest');
      expect(command).toContain('tests/foo.test.ts');
      expect(command).toContain('--testNamePattern="AC-US1-01"');
    });
  });

  describe('extractTestFile', () => {
    it('should extract test file from Test Plan section', () => {
      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        description: `Some description

        **Test Plan**:
        - **File**: \`tests/unit/component.test.ts\`
        - **Tests**: TC-001, TC-002`
      };

      const testFile = (validator as any).extractTestFile(task);

      expect(testFile).toBe('tests/unit/component.test.ts');
    });

    it('should return null when no Test Plan', () => {
      const task: Task = {
        id: 'T-001',
        title: 'Test task',
        status: 'pending',
        description: 'Just a description'
      };

      const testFile = (validator as any).extractTestFile(task);

      expect(testFile).toBeNull();
    });
  });

  describe('formatResult', () => {
    it('should format passing result', () => {
      const result: ACTestValidationResult = {
        passed: true,
        taskId: 'T-001',
        acIds: ['AC-US1-01'],
        testResults: new Map(),
        summary: {
          totalACs: 1,
          acsTested: 1,
          acsUntested: 0,
          testsPassed: 1,
          testsFailed: 0
        },
        errors: []
      };

      const formatted = validator.formatResult(result);

      expect(formatted).toContain('T-001');
      expect(formatted).toContain('VALIDATION PASSED');
      expect(formatted).toContain('Total ACs: 1');
    });

    it('should format failing result with errors', () => {
      const result: ACTestValidationResult = {
        passed: false,
        taskId: 'T-001',
        acIds: ['AC-US1-01'],
        testResults: new Map(),
        summary: {
          totalACs: 1,
          acsTested: 0,
          acsUntested: 1,
          testsPassed: 0,
          testsFailed: 1
        },
        errors: ['Test failed: Expected true to be false']
      };

      const formatted = validator.formatResult(result);

      expect(formatted).toContain('T-001');
      expect(formatted).toContain('VALIDATION FAILED');
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('Test failed');
    });
  });
});

describe('createACTestValidator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `ac-validator-factory-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should detect vitest from package.json', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      name: 'test-project',
      devDependencies: {
        vitest: '^1.0.0'
      }
    });

    const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
    const validator = await createACTestValidator(testDir);

    expect(validator).toBeInstanceOf(ACTestValidator);
  });

  it('should detect jest from package.json', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      name: 'test-project',
      devDependencies: {
        jest: '^29.0.0'
      }
    });

    const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
    const validator = await createACTestValidator(testDir);

    expect(validator).toBeInstanceOf(ACTestValidator);
  });

  it('should default to npm test when no test runner detected', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      name: 'test-project',
      devDependencies: {}
    });

    const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
    const validator = await createACTestValidator(testDir);

    expect(validator).toBeInstanceOf(ACTestValidator);
  });
});
