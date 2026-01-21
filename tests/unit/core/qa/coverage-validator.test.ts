/**
 * Coverage Validator Tests
 *
 * Tests for the coverage validation module that enforces coverage targets
 * during /sw:done command execution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateCoverage,
  findCoverageData,
  parseCoverageReport,
  CoverageValidationResult,
  CoverageFormat,
} from '../../../../src/core/qa/coverage-validator.js';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('Coverage Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateCoverage', () => {
    it('should skip validation when coverageTarget is 0', async () => {
      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 0,
        testMode: 'TDD',
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('disabled');
    });

    it('should skip validation when testMode is "none"', async () => {
      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 80,
        testMode: 'none',
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('testMode');
    });

    it('should return passed=true when coverage meets target', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        total: {
          lines: { pct: 85 },
          statements: { pct: 85 },
          functions: { pct: 80 },
          branches: { pct: 75 },
        },
      }));

      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 80,
        testMode: 'TDD',
      });

      expect(result.passed).toBe(true);
      expect(result.actual).toBeGreaterThanOrEqual(80);
    });

    it('should return passed=false when coverage below target', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        total: {
          lines: { pct: 60 },
          statements: { pct: 60 },
          functions: { pct: 50 },
          branches: { pct: 45 },
        },
      }));

      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 80,
        testMode: 'TDD',
      });

      expect(result.passed).toBe(false);
      expect(result.actual).toBeLessThan(80);
      expect(result.target).toBe(80);
    });

    it('should handle missing coverage data gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 80,
        testMode: 'TDD',
      });

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('findCoverageData', () => {
    it('should find Istanbul coverage-summary.json', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = typeof p === 'string' ? p : p.toString();
        return pathStr.includes('coverage-summary.json');
      });

      const result = findCoverageData('/test/project');

      expect(result).not.toBeNull();
      expect(result?.format).toBe('istanbul');
    });

    it('should find c8 coverage data', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = typeof p === 'string' ? p : p.toString();
        return pathStr.includes('c8') && pathStr.includes('coverage-summary.json');
      });

      const result = findCoverageData('/test/project');

      expect(result).not.toBeNull();
      expect(result?.format).toBe('c8');
    });

    it('should find Jest coverage data', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = typeof p === 'string' ? p : p.toString();
        return pathStr.includes('jest') || pathStr.includes('coverage-summary.json');
      });

      const result = findCoverageData('/test/project');

      expect(result).not.toBeNull();
    });

    it('should return null when no coverage data found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = findCoverageData('/test/project');

      expect(result).toBeNull();
    });
  });

  describe('parseCoverageReport', () => {
    it('should parse Istanbul JSON format', () => {
      const istanbulData = {
        total: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 85, pct: 85 },
          functions: { total: 50, covered: 40, pct: 80 },
          branches: { total: 30, covered: 21, pct: 70 },
        },
      };

      const result = parseCoverageReport(JSON.stringify(istanbulData), 'istanbul');

      expect(result.lines).toBe(80);
      expect(result.statements).toBe(85);
      expect(result.functions).toBe(80);
      expect(result.branches).toBe(70);
      expect(result.overall).toBe(80); // Average or primary metric
    });

    it('should parse c8 JSON format', () => {
      const c8Data = {
        total: {
          lines: { pct: 75 },
          statements: { pct: 75 },
          functions: { pct: 70 },
          branches: { pct: 65 },
        },
      };

      const result = parseCoverageReport(JSON.stringify(c8Data), 'c8');

      expect(result.lines).toBe(75);
      expect(result.overall).toBeDefined();
    });

    it('should handle lcov format', () => {
      const lcovData = `
TN:
SF:/test/file.ts
DA:1,1
DA:2,1
DA:3,0
LF:3
LH:2
end_of_record
`;

      const result = parseCoverageReport(lcovData, 'lcov');

      // LH/LF = 2/3 = ~66.67%
      expect(result.lines).toBeCloseTo(66.67, 0);
    });

    it('should throw on invalid format', () => {
      expect(() => {
        parseCoverageReport('invalid', 'unknown' as CoverageFormat);
      }).toThrow();
    });
  });

  describe('CoverageValidationResult', () => {
    it('should have correct structure for passing result', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        total: {
          lines: { pct: 90 },
          statements: { pct: 90 },
          functions: { pct: 85 },
          branches: { pct: 80 },
        },
      }));

      const result = await validateCoverage({
        projectRoot: '/test/project',
        coverageTarget: 80,
        testMode: 'TDD',
      });

      expect(result).toMatchObject({
        passed: expect.any(Boolean),
        target: 80,
        actual: expect.any(Number),
        details: expect.any(Object),
      });
    });
  });
});
