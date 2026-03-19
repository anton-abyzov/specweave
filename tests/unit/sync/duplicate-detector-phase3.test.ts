/**
 * Unit tests for DuplicateDetector Phase 3 enabled by default
 *
 * Verifies that Phase 3 (post-creation verification) runs by default
 * and can be disabled via SPECWEAVE_SKIP_VERIFY_DUPLICATES=1.
 *
 * @see T-005: RED phase - Phase 3 is gated behind SPECWEAVE_VERIFY_DUPLICATES=1
 * @see T-006: GREEN phase - Invert to opt-out via SPECWEAVE_SKIP_VERIFY_DUPLICATES=1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks before any imports
const mockExecFileSync = vi.hoisted(() => vi.fn());
const mockGetGitHubAuthFromProject = vi.hoisted(() =>
  vi.fn().mockReturnValue({ token: 'test-token' })
);

vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

vi.mock('../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mockGetGitHubAuthFromProject,
}));

const { DuplicateDetector } = await import(
  '../../../plugins/specweave/lib/integrations/github/duplicate-detector.js'
);

describe('DuplicateDetector Phase 3 enabled by default', () => {
  let originalVerifyDuplicates: string | undefined;
  let originalSkipVerifyDuplicates: string | undefined;

  beforeEach(() => {
    originalVerifyDuplicates = process.env.SPECWEAVE_VERIFY_DUPLICATES;
    originalSkipVerifyDuplicates = process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES;
    delete process.env.SPECWEAVE_VERIFY_DUPLICATES;
    delete process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES;
    mockExecFileSync.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalVerifyDuplicates !== undefined) {
      process.env.SPECWEAVE_VERIFY_DUPLICATES = originalVerifyDuplicates;
    } else {
      delete process.env.SPECWEAVE_VERIFY_DUPLICATES;
    }
    if (originalSkipVerifyDuplicates !== undefined) {
      process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES = originalSkipVerifyDuplicates;
    } else {
      delete process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES;
    }
    vi.restoreAllMocks();
  });

  it('runs Phase 3 verification by default (no env vars set)', async () => {
    // Phase 1: checkBeforeCreate - gh issue list returns no matches
    mockExecFileSync.mockReturnValueOnce(JSON.stringify([]));
    // Phase 2: gh issue create returns a URL (no repo = no label creation calls)
    mockExecFileSync.mockReturnValueOnce('https://github.com/owner/repo/issues/42\n');
    // Phase 3: verifyAfterCreate - gh issue list returns single match (no duplicates)
    mockExecFileSync.mockReturnValueOnce(
      JSON.stringify([{ number: 42, title: '[FS-099] Test', url: 'https://github.com/owner/repo/issues/42', createdAt: new Date().toISOString() }])
    );

    await DuplicateDetector.createWithProtection({
      title: '[FS-099] Test Feature',
      body: 'Test body',
      titlePattern: '[FS-099]',
      labels: ['specweave'],
    });

    // Phase 3 runs by default, so execFileSync is called 3 times:
    // (1) Phase 1 search, (2) Phase 2 create, (3) Phase 3 verify
    expect(mockExecFileSync).toHaveBeenCalledTimes(3);
    // The third call should be the verification search
    const thirdCall = mockExecFileSync.mock.calls[2];
    expect(thirdCall[0]).toBe('gh');
    expect(thirdCall[1]).toContain('issue');
    expect(thirdCall[1]).toContain('list');
  }, 10000);

  it('skips Phase 3 when SPECWEAVE_SKIP_VERIFY_DUPLICATES=1', async () => {
    process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES = '1';

    // Phase 1: no existing issue
    mockExecFileSync.mockReturnValueOnce(JSON.stringify([]));
    // Phase 2: create issue (no repo = no label creation calls)
    mockExecFileSync.mockReturnValueOnce('https://github.com/owner/repo/issues/43\n');

    await DuplicateDetector.createWithProtection({
      title: '[FS-100] Skip Test',
      body: 'Test body',
      titlePattern: '[FS-100]',
      labels: ['specweave'],
    });

    // Phase 3 skipped, so only 2 calls: Phase 1 search, Phase 2 create
    expect(mockExecFileSync).toHaveBeenCalledTimes(2);
  });

  it('old SPECWEAVE_VERIFY_DUPLICATES=1 is a no-op (Phase 3 runs regardless)', async () => {
    process.env.SPECWEAVE_VERIFY_DUPLICATES = '1';

    // Phase 1: no existing issue
    mockExecFileSync.mockReturnValueOnce(JSON.stringify([]));
    // Phase 2: create issue (no repo = no label creation calls)
    mockExecFileSync.mockReturnValueOnce('https://github.com/owner/repo/issues/44\n');
    // Phase 3: verify
    mockExecFileSync.mockReturnValueOnce(
      JSON.stringify([{ number: 44, title: '[FS-101] Test', url: 'https://github.com/owner/repo/issues/44', createdAt: new Date().toISOString() }])
    );

    await DuplicateDetector.createWithProtection({
      title: '[FS-101] Old Env Var Test',
      body: 'Test body',
      titlePattern: '[FS-101]',
      labels: ['specweave'],
    });

    // Phase 3 still runs (default on, old env var is irrelevant)
    // 3 calls: Phase 1 search, Phase 2 create, Phase 3 verify
    expect(mockExecFileSync).toHaveBeenCalledTimes(3);
  }, 10000);
});
