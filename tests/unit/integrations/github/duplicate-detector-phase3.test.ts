/**
 * Unit tests for DuplicateDetector Phase 3 guard inversion (T-003)
 *
 * Verifies that Phase 3 verification is opt-in via SPECWEAVE_VERIFY_DUPLICATES=1
 * instead of opt-out via SPECWEAVE_SKIP_VERIFY_DUPLICATES=1.
 *
 * Note: DuplicateDetector internally uses child_process.execFileSync (not exec).
 * We mock it here for test isolation only. The production code is safe.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExecFileSync } = vi.hoisted(() => {
  const mockExecFileSync = vi.fn();
  return { mockExecFileSync };
});

vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

vi.mock('../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: () => ({ token: 'test-token' }),
}));

vi.mock('../../../../plugins/specweave/lib/integrations/github/label-cache.js', () => ({
  ensureLabels: vi.fn(),
}));

import { DuplicateDetector } from '../../../../plugins/specweave/lib/integrations/github/duplicate-detector.js';

describe('DuplicateDetector Phase 3 guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPECWEAVE_VERIFY_DUPLICATES;
    delete process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Helper to set up a mock where Phase 1 search returns empty (new issue),
   * Phase 2 creates the issue, and Phase 3 verification (if it runs) finds
   * the newly created issue.
   */
  function setupNewIssueMock(issueNumber: number) {
    let searchCallCount = 0;
    mockExecFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'issue' && args[1] === 'list') {
        searchCallCount++;
        if (searchCallCount === 1) {
          // Phase 1: no existing issue
          return JSON.stringify([]);
        }
        // Phase 3: verification returns the created issue
        return JSON.stringify([
          { number: issueNumber, title: `[FS-001][US-001] Test`, url: `https://github.com/o/r/issues/${issueNumber}`, createdAt: '2026-01-01' }
        ]);
      }
      if (args[0] === 'issue' && args[1] === 'create') {
        return `https://github.com/o/r/issues/${issueNumber}\n`;
      }
      return JSON.stringify([]);
    });
  }

  it('should SKIP Phase 3 by default (no env var set)', async () => {
    setupNewIssueMock(1);

    const result = await DuplicateDetector.createWithProtection({
      title: '[FS-001][US-001] Test',
      body: 'body',
      titlePattern: '[FS-001][US-001]',
      repo: 'o/r',
    });

    expect(result.issue.number).toBe(1);
    const searchCalls = mockExecFileSync.mock.calls.filter(
      (call: any[]) => call[1][0] === 'issue' && call[1][1] === 'list'
    );
    // Only 1 search call (Phase 1), Phase 3 should be skipped
    expect(searchCalls.length).toBe(1);
  });

  it('should RUN Phase 3 when SPECWEAVE_VERIFY_DUPLICATES=1', async () => {
    process.env.SPECWEAVE_VERIFY_DUPLICATES = '1';
    setupNewIssueMock(2);

    const result = await DuplicateDetector.createWithProtection({
      title: '[FS-001][US-001] Test',
      body: 'body',
      titlePattern: '[FS-001][US-001]',
      repo: 'o/r',
    });

    expect(result.issue.number).toBe(2);
    const searchCalls = mockExecFileSync.mock.calls.filter(
      (call: any[]) => call[1][0] === 'issue' && call[1][1] === 'list'
    );
    // 2 search calls: Phase 1 + Phase 3 verification
    expect(searchCalls.length).toBe(2);
  });

  it('should SKIP Phase 3 when wasReused=true regardless of env', async () => {
    process.env.SPECWEAVE_VERIFY_DUPLICATES = '1';

    mockExecFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'issue' && args[1] === 'list') {
        // Phase 1: existing issue found (reuse)
        return JSON.stringify([
          { number: 5, title: '[FS-001][US-001] Test', url: 'https://github.com/o/r/issues/5' }
        ]);
      }
      return JSON.stringify([]);
    });

    const result = await DuplicateDetector.createWithProtection({
      title: '[FS-001][US-001] Test',
      body: 'body',
      titlePattern: '[FS-001][US-001]',
      repo: 'o/r',
    });

    expect(result.wasReused).toBe(true);
    const searchCalls = mockExecFileSync.mock.calls.filter(
      (call: any[]) => call[1][0] === 'issue' && call[1][1] === 'list'
    );
    // Only Phase 1 search, no Phase 3
    expect(searchCalls.length).toBe(1);
    const createCalls = mockExecFileSync.mock.calls.filter(
      (call: any[]) => call[1][0] === 'issue' && call[1][1] === 'create'
    );
    expect(createCalls.length).toBe(0);
  });
});
