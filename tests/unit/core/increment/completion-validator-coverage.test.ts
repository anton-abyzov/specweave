import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs-native before importing the validator
const mockReadFile = vi.hoisted(() => vi.fn());
const mockPathExists = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/utils/fs-native.js', () => ({
  readFile: mockReadFile,
  pathExists: mockPathExists,
  default: {
    readFile: mockReadFile,
    pathExists: mockPathExists,
  },
}));

// Mock parseTasksWithUSLinks
const mockParseTasksWithUSLinks = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/generators/spec/task-parser.js', () => ({
  parseTasksWithUSLinks: mockParseTasksWithUSLinks,
}));

// Mock find-project-root
vi.mock('../../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: () => '/mock-root',
}));

// Mock ac-status-manager
vi.mock('../../../../src/core/increment/ac-status-manager.js', () => ({
  ACStatusManager: class MockACStatusManager {
    constructor(_root: string) {}
  },
}));

// Mock external-tool-drift-detector
vi.mock('../../../../src/utils/external-tool-drift-detector.js', () => ({
  ExternalToolDriftDetector: class MockDriftDetector {
    constructor(_root: string, _opts?: unknown) {}
    async detectDrift(_id: string) {
      return { externalToolsConfigured: false, hasDrift: false };
    }
  },
}));

// Mock coverage-validator
const mockValidateCoverage = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/core/qa/coverage-validator.js', () => ({
  validateCoverage: mockValidateCoverage,
}));

import { IncrementCompletionValidator } from '../../../../src/core/increment/completion-validator.js';

// Helper to build file system responses
function buildFs(files: Record<string, string>) {
  mockPathExists.mockImplementation(async (p: string) => p in files);
  mockReadFile.mockImplementation(async (p: string) => {
    if (p in files) return files[p];
    throw new Error(`ENOENT: ${p}`);
  });
}

const specOk = `## Acceptance Criteria\n- [x] AC-US1-01: done`;
const tasksOk = `### T-001: Task\n**Status**: [x] completed\n**AC**: AC-US1-01`;

describe('completion-validator coverage enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseTasksWithUSLinks.mockReturnValue([]);
    mockValidateCoverage.mockResolvedValue({ skipped: true, reason: 'no coverage file' });
  });

  it('coverage below target produces a warning, never a blocking error', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0001-test/metadata.json': JSON.stringify({
        id: '0001-test', status: 'active', testMode: 'TDD', coverageTarget: 80,
      }),
      '/mock-root/.specweave/increments/0001-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0001-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({
        testing: { coverage: { unit: 90 } },
      }),
    });

    mockValidateCoverage.mockResolvedValue({
      passed: false,
      actual: 72.5,
      reason: 'Below threshold',
      coverageFile: 'coverage/coverage-summary.json',
    });

    const result = await IncrementCompletionValidator.validateCompletion('0001-test');

    const coverageWarning = result.warnings.find((w: string) => w.includes('coverage below target'));
    expect(coverageWarning).toBeDefined();
    expect(coverageWarning).toContain('72.5%');
    expect(coverageWarning).toContain('90%'); // config target, not metadata's 80
    expect(result.errors.some((e: string) => e.includes('coverage'))).toBe(false);
  });

  it('no coverage data at all is not reported as 0% coverage', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0007-test/metadata.json': JSON.stringify({
        id: '0007-test', status: 'active',
      }),
      '/mock-root/.specweave/increments/0007-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0007-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { coverage: { unit: 80 } } }),
    });
    mockValidateCoverage.mockResolvedValue({
      passed: false, skipped: false, target: 80, actual: 0,
      reason: 'Coverage data not found. Run tests with --coverage flag.',
      details: null, coverageFile: null, format: null,
    });

    const result = await IncrementCompletionValidator.validateCompletion('0007-test');

    expect(mockValidateCoverage).toHaveBeenCalled();
    expect(result.warnings.some((w: string) => /coverage/i.test(w))).toBe(false);
  });

  it('testMode=none skips coverage validation', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0002-test/metadata.json': JSON.stringify({
        id: '0002-test', status: 'active', testMode: 'none', coverageTarget: 80,
      }),
      '/mock-root/.specweave/increments/0002-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0002-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { coverage: { unit: 80 } } }),
    });

    const result = await IncrementCompletionValidator.validateCompletion('0002-test');

    expect(mockValidateCoverage).not.toHaveBeenCalled();
    // No coverage-related errors
    const coverageError = result.errors.find((e: string) => e.includes('coverage'));
    expect(coverageError).toBeUndefined();
  });

  it('coverageTarget=0 skips coverage validation', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0003-test/metadata.json': JSON.stringify({
        id: '0003-test', status: 'active', testMode: 'TDD', coverageTarget: 0,
      }),
      '/mock-root/.specweave/increments/0003-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0003-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({}),
    });

    const result = await IncrementCompletionValidator.validateCompletion('0003-test');

    expect(mockValidateCoverage).not.toHaveBeenCalled();
    const coverageError = result.errors.find((e: string) => e.includes('coverage'));
    expect(coverageError).toBeUndefined();
  });

  it('uses config.json testing.coverage.unit over metadata coverageTarget', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0004-test/metadata.json': JSON.stringify({
        id: '0004-test', status: 'active', testMode: 'TDD', coverageTarget: 50,
      }),
      '/mock-root/.specweave/increments/0004-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0004-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({
        testing: { coverage: { unit: 95 } },
      }),
    });

    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 96 });

    await IncrementCompletionValidator.validateCompletion('0004-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ coverageTarget: 95 }),
    );
  });

  it('ignores a stamped metadata coverageTarget when testing.coverage is not set', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0006-test/metadata.json': JSON.stringify({
        id: '0006-test', status: 'active', testMode: 'test-after', coverageTarget: 80,
      }),
      '/mock-root/.specweave/increments/0006-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0006-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { commands: ['npm test'] } }),
    });
    mockValidateCoverage.mockResolvedValue({
      passed: false, skipped: false, target: 80, actual: 40,
      reason: 'Coverage 40.0% is below target 80%',
      details: { lines: 40, functions: 40, branches: 40, statements: 40 },
      coverageFile: '/mock-root/coverage/coverage-summary.json', format: 'istanbul',
    });

    const result = await IncrementCompletionValidator.validateCompletion('0006-test');

    expect(mockValidateCoverage).not.toHaveBeenCalled();
    expect(result.warnings.some((w: string) => /coverage/i.test(w))).toBe(false);
  });

  it('never defaults the test mode to TDD', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0008-test/metadata.json': JSON.stringify({ id: '0008-test', status: 'active' }),
      '/mock-root/.specweave/increments/0008-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0008-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { coverage: { unit: 80 } } }),
    });
    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 90 });

    await IncrementCompletionValidator.validateCompletion('0008-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(expect.objectContaining({ testMode: 'test-after' }));
  });
  it('testing.mode none in config skips coverage even when metadata says test-after', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0009-test/metadata.json': JSON.stringify({ id: '0009-test', status: 'active', testMode: 'test-after' }),
      '/mock-root/.specweave/increments/0009-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0009-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { mode: 'none', coverage: { unit: 80 } } }),
    });

    await IncrementCompletionValidator.validateCompletion('0009-test');

    expect(mockValidateCoverage).not.toHaveBeenCalled();
  });

  it('honours a 1.x testing.coverageTargets.unit opt-in', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0010-test/metadata.json': JSON.stringify({ id: '0010-test', status: 'active' }),
      '/mock-root/.specweave/increments/0010-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0010-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({ testing: { coverageTargets: { unit: 85 } } }),
    });
    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 90 });

    await IncrementCompletionValidator.validateCompletion('0010-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(expect.objectContaining({ coverageTarget: 85 }));
  });
});
