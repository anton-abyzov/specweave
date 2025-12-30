/**
 * Test Gate Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestGate, quickTestCheck } from '../../../src/core/auto/test-gate.js';

// Mock child_process
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

import { execSync } from 'child_process';
const mockExecSync = vi.mocked(execSync);

describe('TestGate', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-gate-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('runGate', () => {
    it('should pass when tests pass', async () => {
      mockExecSync.mockReturnValue('All tests passed');

      const gate = new TestGate(tempDir);
      const result = await gate.runGate();

      expect(result.passed).toBe(true);
      expect(result.testsRun).toBe(true);
      expect(result.requiresHumanIntervention).toBe(false);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Tests failed') as Error & { status: number; stdout: string };
      error.status = 1;
      error.stdout = 'Error: Test failed\n';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const gate = new TestGate(tempDir, { maxRetries: 2, timeout: 1000 });
      const result = await gate.runGate();

      expect(result.passed).toBe(false);
      expect(result.retryCount).toBe(2);
      expect(result.requiresHumanIntervention).toBe(true);
      expect(mockExecSync).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should check coverage when tests pass', async () => {
      mockExecSync.mockReturnValue('All tests passed');

      // Create coverage report
      const coverageDir = path.join(tempDir, 'coverage');
      fs.mkdirSync(coverageDir, { recursive: true });
      fs.writeFileSync(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify({
          total: {
            statements: { pct: 85 },
            branches: { pct: 75 },
            functions: { pct: 90 },
            lines: { pct: 85 },
          },
        })
      );

      const gate = new TestGate(tempDir, { coverageThreshold: 80 });
      const result = await gate.runGate();

      expect(result.passed).toBe(true);
      expect(result.coveragePassed).toBe(true);
      expect(result.testResult?.coverage?.lines).toBe(85);
    });

    it('should fail when coverage below threshold', async () => {
      mockExecSync.mockReturnValue('All tests passed');

      // Create coverage report with low coverage
      const coverageDir = path.join(tempDir, 'coverage');
      fs.mkdirSync(coverageDir, { recursive: true });
      fs.writeFileSync(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify({
          total: {
            statements: { pct: 60 },
            branches: { pct: 55 },
            functions: { pct: 65 },
            lines: { pct: 60 },
          },
        })
      );

      const gate = new TestGate(tempDir, { coverageThreshold: 80 });
      const result = await gate.runGate();

      expect(result.passed).toBe(false);
      expect(result.coveragePassed).toBe(false);
      expect(result.requiresHumanIntervention).toBe(true);
    });
  });

  describe('runE2ETests', () => {
    it('should detect Playwright and run tests', async () => {
      // Create package.json with Playwright
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { '@playwright/test': '^1.0.0' },
        })
      );

      mockExecSync.mockReturnValue('Playwright tests passed');

      const gate = new TestGate(tempDir);
      const result = await gate.runE2ETests();

      expect(result.passed).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'npx playwright test',
        expect.any(Object)
      );
    });

    it('should return success when no E2E configured', async () => {
      const gate = new TestGate(tempDir);
      const result = await gate.runE2ETests();

      expect(result.passed).toBe(true);
      expect(result.output).toContain('No E2E tests configured');
    });
  });

  describe('quickTestCheck', () => {
    it('should return true when tests pass', () => {
      mockExecSync.mockReturnValue('Tests passed');

      const result = quickTestCheck(tempDir);

      expect(result).toBe(true);
    });

    it('should return false when tests fail', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Tests failed');
      });

      const result = quickTestCheck(tempDir);

      expect(result).toBe(false);
    });
  });
});
