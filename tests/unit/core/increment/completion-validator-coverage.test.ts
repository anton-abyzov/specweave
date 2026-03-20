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

  it('coverage below target produces a blocking error and isValid=false', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0001-test/metadata.json': JSON.stringify({
        id: '0001-test', status: 'active', testMode: 'TDD', coverageTarget: 80,
      }),
      '/mock-root/.specweave/increments/0001-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0001-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({
        testing: { coverageTargets: { unit: 90 }, defaultCoverageTarget: 80 },
      }),
    });

    mockValidateCoverage.mockResolvedValue({
      passed: false,
      actual: 72.5,
      reason: 'Below threshold',
      coverageFile: 'coverage/coverage-summary.json',
    });

    const result = await IncrementCompletionValidator.validateCompletion('0001-test');

    expect(result.isValid).toBe(false);
    const coverageError = result.errors.find((e: string) => e.includes('coverage below target'));
    expect(coverageError).toBeDefined();
    expect(coverageError).toContain('72.5%');
    expect(coverageError).toContain('90%'); // config target, not metadata's 80
    // Should NOT be in warnings
    const coverageWarning = (result.warnings ?? []).find((w: string) => w.includes('coverage below target'));
    expect(coverageWarning).toBeUndefined();
  });

  it('testMode=none skips coverage validation', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0002-test/metadata.json': JSON.stringify({
        id: '0002-test', status: 'active', testMode: 'none', coverageTarget: 80,
      }),
      '/mock-root/.specweave/increments/0002-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0002-test/tasks.md': tasksOk,
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

  it('uses config.json coverageTargets.unit over metadata coverageTarget', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0004-test/metadata.json': JSON.stringify({
        id: '0004-test', status: 'active', testMode: 'TDD', coverageTarget: 50,
      }),
      '/mock-root/.specweave/increments/0004-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0004-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({
        testing: { coverageTargets: { unit: 95 } },
      }),
    });

    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 96 });

    await IncrementCompletionValidator.validateCompletion('0004-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ coverageTarget: 95 }),
    );
  });

  it('falls back to defaultCoverageTarget when coverageTargets.unit missing', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0005-test/metadata.json': JSON.stringify({
        id: '0005-test', status: 'active', testMode: 'TDD', coverageTarget: 50,
      }),
      '/mock-root/.specweave/increments/0005-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0005-test/tasks.md': tasksOk,
      '/mock-root/.specweave/config.json': JSON.stringify({
        testing: { defaultCoverageTarget: 85 },
      }),
    });

    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 90 });

    await IncrementCompletionValidator.validateCompletion('0005-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ coverageTarget: 85 }),
    );
  });

  it('falls back to metadata coverageTarget when config.json missing', async () => {
    buildFs({
      '/mock-root/.specweave/increments/0006-test/metadata.json': JSON.stringify({
        id: '0006-test', status: 'active', testMode: 'TDD', coverageTarget: 60,
      }),
      '/mock-root/.specweave/increments/0006-test/spec.md': specOk,
      '/mock-root/.specweave/increments/0006-test/tasks.md': tasksOk,
    });

    mockValidateCoverage.mockResolvedValue({ passed: true, actual: 70 });

    await IncrementCompletionValidator.validateCompletion('0006-test');

    expect(mockValidateCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ coverageTarget: 60 }),
    );
  });
});
