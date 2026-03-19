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

// Mock ac-status-manager with a proper class
vi.mock('../../../../src/core/increment/ac-status-manager.js', () => {
  return {
    ACStatusManager: class MockACStatusManager {
      constructor(_root: string) {}
    },
  };
});

// Mock external-tool-drift-detector with a proper class
vi.mock('../../../../src/utils/external-tool-drift-detector.js', () => {
  return {
    ExternalToolDriftDetector: class MockDriftDetector {
      constructor(_root: string, _opts?: unknown) {}
      async detectDrift(_id: string) {
        return { externalToolsConfigured: false, hasDrift: false };
      }
    },
  };
});

// Mock coverage-validator
vi.mock('../../../../src/core/qa/coverage-validator.js', () => ({
  validateCoverage: vi.fn().mockResolvedValue({ skipped: true, reason: 'no coverage' }),
}));

import { IncrementCompletionValidator } from '../../../../src/core/increment/completion-validator.js';

describe('validateACCoverage - parse error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: files exist, no open ACs, no pending tasks
    mockPathExists.mockResolvedValue(true);
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        return '- [x] **AC-US1-01**: Some criteria\n';
      }
      if (filePath.endsWith('metadata.json')) {
        return JSON.stringify({ testMode: 'none', coverageTarget: 0, type: 'feature' });
      }
      return '';
    });
  });

  it('calls parseTasksWithUSLinks with file PATH, not content', async () => {
    mockParseTasksWithUSLinks.mockReturnValue({
      'US-001': [{ id: 'T-001', satisfiesACs: ['AC-US1-01'], status: 'completed' }],
    });

    await IncrementCompletionValidator.validateCompletion('0589-test', {
      blockOnP0Orphans: false,
    });

    expect(mockParseTasksWithUSLinks).toHaveBeenCalledTimes(1);
    const calledWith = mockParseTasksWithUSLinks.mock.calls[0][0];
    // Should be a file path ending with tasks.md, not the content
    expect(calledWith).toMatch(/tasks\.md$/);
    expect(calledWith).not.toContain('AC-US1-01');
  });

  it('degrades to warning when parseTasksWithUSLinks throws', async () => {
    mockParseTasksWithUSLinks.mockImplementation(() => {
      throw new Error('unexpected token at line 5');
    });

    const silentLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const result = await IncrementCompletionValidator.validateCompletion('0589-test', {
      logger: silentLogger,
      blockOnP0Orphans: false,
    });

    // Should not throw — degrades gracefully
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes('AC coverage validation skipped'))).toBe(true);
  });

  it('still blocks on P0 orphan ACs when parsing succeeds', async () => {
    mockParseTasksWithUSLinks.mockReturnValue({
      'US-001': [{ id: 'T-001', satisfiesACs: [], status: 'completed' }],
    });

    // Spec has a P0 AC with no implementing task
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        return '- [ ] **AC-US1-01**: Some P0 criteria\n- **Priority**: P0\n';
      }
      if (filePath.endsWith('metadata.json')) {
        return JSON.stringify({ testMode: 'none', coverageTarget: 0, type: 'feature' });
      }
      return '';
    });

    const result = await IncrementCompletionValidator.validateCompletion('0589-test', {
      blockOnP0Orphans: true,
    });

    expect(result.errors.some(e => e.includes('P0 Acceptance Criteria'))).toBe(true);
  });

  it('includes parse error message in warning for debuggability', async () => {
    mockParseTasksWithUSLinks.mockImplementation(() => {
      throw new Error('unexpected token at line 5');
    });

    const silentLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    await IncrementCompletionValidator.validateCompletion('0589-test', {
      logger: silentLogger,
      blockOnP0Orphans: false,
    });

    // The warn log should contain the error message
    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unexpected token at line 5')
    );
  });
});
