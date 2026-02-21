/**
 * Unit tests for updateStatusLabels auto-close behavior
 *
 * Tests that updateStatusLabels() in GitHubFeatureSync auto-closes issues
 * when the new status label is `status:complete` and the issue is still OPEN.
 *
 * @see Increment 0275-auto-close-on-status-complete
 * @see T-001: RED phase / T-002: GREEN phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const {
  mockExecFileNoThrow,
  mockGetIssue,
  mockCalculateCompletion,
  mockBuildCompletionComment,
  mockBuildProgressComment,
  mockBuildReopenComment,
  mockGetGitHubAuthFromProject,
  mockReaddir,
  mockReadFile,
  mockWriteFile,
  mockMkdir,
  mockExistsSync,
} = vi.hoisted(() => ({
  mockExecFileNoThrow: vi.fn(),
  mockGetIssue: vi.fn(),
  mockCalculateCompletion: vi.fn(),
  mockBuildCompletionComment: vi.fn(),
  mockBuildProgressComment: vi.fn(),
  mockBuildReopenComment: vi.fn(),
  mockGetGitHubAuthFromProject: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockExistsSync: vi.fn(),
}));

vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('../../../../plugins/specweave-github/lib/github-client-v2.js', () => {
  class MockGitHubClientV2 {
    getIssue = mockGetIssue;
  }
  return { GitHubClientV2: MockGitHubClientV2 };
});

vi.mock('../../../../plugins/specweave-github/lib/completion-calculator.js', () => {
  class MockCompletionCalculator {
    calculateCompletion = mockCalculateCompletion;
    buildCompletionComment = mockBuildCompletionComment;
    buildProgressComment = mockBuildProgressComment;
    buildReopenComment = mockBuildReopenComment;
  }
  return { CompletionCalculator: MockCompletionCalculator };
});

vi.mock('../../../../plugins/specweave-github/lib/user-story-issue-builder.js', () => {
  class MockUserStoryIssueBuilder {
    buildIssueContent = vi.fn().mockReturnValue({
      title: 'Test Title',
      body: 'Test Body',
      labels: ['status:active'],
      status: 'active',
    });
    computeLabels = vi.fn().mockReturnValue(['status:active']);
  }
  return { UserStoryIssueBuilder: MockUserStoryIssueBuilder };
});

vi.mock('../../../../plugins/specweave-github/lib/duplicate-detector.js', () => {
  class MockDuplicateDetector {}
  return { DuplicateDetector: MockDuplicateDetector };
});

vi.mock('../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mockGetGitHubAuthFromProject,
}));

vi.mock('fs/promises', () => ({
  readdir: mockReaddir,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

vi.mock('yaml', () => ({
  default: { parse: vi.fn().mockReturnValue({}) },
  parse: vi.fn().mockReturnValue({}),
}));

import { GitHubFeatureSync } from '../../../../plugins/specweave-github/lib/github-feature-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout = '') {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr = '') {
  return { stdout: '', stderr, exitCode: 1, success: false };
}

/**
 * Create a GitHubFeatureSync instance with mocked deps.
 *
 * Since updateStatusLabels is private, we test it indirectly through
 * updateUserStoryIssue which calls it. But we need to call the method
 * directly for focused testing. We use the class's internal access pattern.
 */
function createSync() {
  mockGetGitHubAuthFromProject.mockReturnValue({ token: 'test-token' });
  const client = { getIssue: mockGetIssue } as any;
  const sync = new GitHubFeatureSync(client, '/specs', '/project');
  return sync;
}

// ---------------------------------------------------------------------------
// Tests: updateStatusLabels auto-close behavior
//
// Since updateStatusLabels is private, we test it through the
// updateUserStoryIssue flow which calls it at the end. The auto-close
// in updateStatusLabels is additive -- it fires AFTER the label update.
//
// We test by verifying that when updateUserStoryIssue runs with
// overallComplete=true but the issue is STILL OPEN (i.e., the main
// close in updateUserStoryIssue somehow left it open, or state reads
// as open during updateStatusLabels), the auto-close fires.
//
// But more directly: we test by examining the calls to execFileNoThrow
// to verify that `gh issue close` is called from the updateStatusLabels
// code path (the second close attempt, after the first close in
// updateUserStoryIssue).
// ---------------------------------------------------------------------------

describe('updateStatusLabels auto-close behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGitHubAuthFromProject.mockReturnValue({ token: 'test-token' });
  });

  /**
   * TC-001: overallComplete=true + issue OPEN -> gh issue close called + completion comment posted
   *
   * Tests updateStatusLabels directly (via private method access) to verify
   * that when the status label transitions to status:complete AND the issue
   * is still OPEN, the method auto-closes the issue with a completion comment.
   */
  it('should close OPEN issue when overallComplete=true and status:complete label applied', async () => {
    const sync = createSync();

    const completion = {
      overallComplete: true,
      acsPercentage: 100,
      tasksPercentage: 100,
      acsTotal: 3,
      acsCompleted: 3,
      tasksTotal: 5,
      tasksCompleted: 5,
    };

    mockBuildCompletionComment.mockReturnValue('Completion comment text');

    // getIssue in updateStatusLabels: issue is OPEN with old label
    mockGetIssue.mockResolvedValueOnce({ state: 'open', labels: ['status:active'] });
    mockExecFileNoThrow.mockResolvedValue(execSuccess());

    // Call updateStatusLabels directly
    await (sync as any).updateStatusLabels(42, completion);

    // Find the `gh issue close` call
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'close'
    );

    // Should have exactly 1 close call from updateStatusLabels
    expect(closeCalls.length).toBe(1);

    // Verify the close call has correct issue number and completion comment
    const closeCall = closeCalls[0];
    expect(closeCall[1]).toContain('42');
    expect(closeCall[1]).toContain('--comment');
    expect(closeCall[1]).toContain('Completion comment text');
  });

  /**
   * TC-002: overallComplete=true + issue CLOSED -> no close attempt from updateStatusLabels
   *
   * Tests that when the issue is already CLOSED, updateStatusLabels does NOT
   * attempt a redundant close operation (idempotent).
   */
  it('should skip close on already CLOSED issue when overallComplete=true', async () => {
    const sync = createSync();

    const completion = {
      overallComplete: true,
      acsPercentage: 100,
      tasksPercentage: 100,
      acsTotal: 3,
      acsCompleted: 3,
      tasksTotal: 5,
      tasksCompleted: 5,
    };

    mockBuildCompletionComment.mockReturnValue('Completion comment text');

    // getIssue in updateStatusLabels: issue is already CLOSED with status:active label
    // (label needs update but issue is already closed)
    mockGetIssue.mockResolvedValueOnce({ state: 'closed', labels: ['status:active'] });
    mockExecFileNoThrow.mockResolvedValue(execSuccess());

    await (sync as any).updateStatusLabels(42, completion);

    // No close calls -- issue already closed
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'close'
    );

    expect(closeCalls.length).toBe(0);

    // But label update SHOULD still happen (remove old + add new)
    const editCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'edit'
    );
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-003: overallComplete=false (status:active) -> no close attempt
   *
   * When the issue is still in progress, updateStatusLabels should set
   * status:active label but NOT close the issue.
   */
  it('should not close when overallComplete=false (status:active)', async () => {
    const sync = createSync();

    const completion = {
      overallComplete: false,
      acsPercentage: 60,
      tasksPercentage: 50,
      acsTotal: 5,
      acsCompleted: 3,
      tasksTotal: 4,
      tasksCompleted: 2,
    };

    // Issue is OPEN and incomplete, label needs update from not_started to active
    mockGetIssue.mockResolvedValueOnce({ state: 'open', labels: ['status:not_started'] });
    mockExecFileNoThrow.mockResolvedValue(execSuccess());

    await (sync as any).updateStatusLabels(42, completion);

    // No close calls -- status:active should NOT trigger close
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'close'
    );

    expect(closeCalls.length).toBe(0);
  });

  /**
   * TC-004: Calling twice with overallComplete=true on CLOSED issue -> zero side effects
   *
   * Idempotency test: repeated calls to updateStatusLabels should not produce
   * duplicate close operations or comments when the issue is already closed.
   */
  it('should be idempotent: calling twice on CLOSED issue produces zero close calls', async () => {
    const sync = createSync();

    const completion = {
      overallComplete: true,
      acsPercentage: 100,
      tasksPercentage: 100,
      acsTotal: 3,
      acsCompleted: 3,
      tasksTotal: 5,
      tasksCompleted: 5,
    };

    mockBuildCompletionComment.mockReturnValue('Completion comment text');

    // Both calls: issue is already CLOSED with status:complete
    mockGetIssue.mockResolvedValue({ state: 'closed', labels: ['status:complete'] });
    mockExecFileNoThrow.mockResolvedValue(execSuccess());

    // Call 1
    await (sync as any).updateStatusLabels(42, completion);

    // Call 2
    await (sync as any).updateStatusLabels(42, completion);

    // No close calls from either invocation -- label already correct, no needsUpdate
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'close'
    );

    expect(closeCalls.length).toBe(0);
  });

  /**
   * TC-005: Verifies the completion comment is used in the --comment flag
   * when auto-closing from updateStatusLabels.
   */
  it('should post completion comment with --comment flag when auto-closing', async () => {
    const sync = createSync();

    const completion = {
      overallComplete: true,
      acsPercentage: 100,
      tasksPercentage: 100,
      acsTotal: 2,
      acsCompleted: 2,
      tasksTotal: 3,
      tasksCompleted: 3,
    };

    mockBuildCompletionComment.mockReturnValue('All ACs verified complete');

    // Issue is OPEN with old status label
    mockGetIssue.mockResolvedValueOnce({ state: 'open', labels: ['status:active'] });
    mockExecFileNoThrow.mockResolvedValue(execSuccess());

    await (sync as any).updateStatusLabels(99, completion);

    // Find the close call
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[0] === 'gh' && call[1]?.[0] === 'issue' && call[1]?.[1] === 'close'
    );

    expect(closeCalls.length).toBe(1);

    // Verify the close call has the completion comment
    const closeCall = closeCalls[0];
    const args = closeCall[1] as string[];
    const commentIdx = args.indexOf('--comment');
    expect(commentIdx).toBeGreaterThanOrEqual(0);
    expect(args[commentIdx + 1]).toBe('All ACs verified complete');

    // Verify the issue number
    expect(args).toContain('99');
  });
});
