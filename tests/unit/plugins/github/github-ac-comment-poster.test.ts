/**
 * Unit tests for postACProgressComments (RED phase - TDD)
 *
 * Tests the AC comment poster that posts progress comments to GitHub
 * issues when acceptance criteria are completed in spec.md.
 *
 * Expected module: plugins/specweave-github/lib/github-ac-comment-poster.ts
 *
 * @see T-001: RED phase
 * @see T-002: GREEN phase (implementation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

const mockReadFile = vi.hoisted(() => vi.fn());
vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

const mockPushSyncUserStories = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-push-sync.js', () => ({
  pushSyncUserStories: mockPushSyncUserStories,
}));

import {
  postACProgressComments,
  type CommentPostOptions,
  type CommentPostResult,
} from '../../../../plugins/specweave-github/lib/github-ac-comment-poster.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

function makeOptions(overrides: Partial<CommentPostOptions> = {}): CommentPostOptions {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    ...overrides,
  };
}

/** Spec.md content with 2 user stories, US-001 has 3/5 ACs complete */
const SPEC_CONTENT_PARTIAL = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
externalLinks:
  github:
    syncStatus: synced
    userStories:
      US-001:
        issueNumber: 42
        issueUrl: "https://github.com/test-owner/test-repo/issues/42"
        syncedAt: "2026-02-07T00:00:00Z"
      US-002:
        issueNumber: 43
        issueUrl: "https://github.com/test-owner/test-repo/issues/43"
        syncedAt: "2026-02-07T00:00:00Z"
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: First criterion done
- [x] **AC-US1-02**: Second criterion done
- [x] **AC-US1-03**: Third criterion done
- [ ] **AC-US1-04**: Fourth criterion pending
- [ ] **AC-US1-05**: Fifth criterion pending

---

### US-002: Second User Story

**Acceptance Criteria**:
- [x] **AC-US2-01**: First criterion done
- [ ] **AC-US2-02**: Second criterion pending
`;

/** Spec.md content with ALL ACs complete for US-001 */
const SPEC_CONTENT_ALL_DONE = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
externalLinks:
  github:
    syncStatus: synced
    userStories:
      US-001:
        issueNumber: 42
        issueUrl: "https://github.com/test-owner/test-repo/issues/42"
        syncedAt: "2026-02-07T00:00:00Z"
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: First criterion done
- [x] **AC-US1-02**: Second criterion done
- [x] **AC-US1-03**: Third criterion done
`;

/** Spec.md content with NO GitHub issue links for US-003 */
const SPEC_CONTENT_NO_LINK = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
externalLinks:
  github:
    syncStatus: synced
    userStories:
      US-001:
        issueNumber: 42
        issueUrl: "https://github.com/test-owner/test-repo/issues/42"
        syncedAt: "2026-02-07T00:00:00Z"
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: First criterion done

---

### US-003: Third User Story (no GitHub link)

**Acceptance Criteria**:
- [x] **AC-US3-01**: First criterion done
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('postACProgressComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TC-001: Posts aggregated progress comment to correct GitHub issue
  // -------------------------------------------------------------------------
  it('should post progress comment to the correct GitHub issue', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(1);
    expect(result.posted[0]).toEqual({
      usId: 'US-001',
      issueNumber: 42,
    });
    expect(result.errors).toHaveLength(0);

    // Verify gh CLI was called with correct args
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining([
        'issue', 'comment', '42', '--body', expect.any(String), '-R', 'test-owner/test-repo',
      ]),
      expect.any(Object),
    );
  });

  // -------------------------------------------------------------------------
  // TC-002: Handles multiple affected user stories
  // -------------------------------------------------------------------------
  it('should post comments to multiple affected user story issues', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    // Two gh calls, one per US
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const result = await postACProgressComments(
      '0193',
      ['US-001', 'US-002'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(2);
    expect(result.posted[0].usId).toBe('US-001');
    expect(result.posted[0].issueNumber).toBe(42);
    expect(result.posted[1].usId).toBe('US-002');
    expect(result.posted[1].issueNumber).toBe(43);
    expect(result.errors).toHaveLength(0);

    // Two gh calls
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // TC-003: Skips US without GitHub issue link
  // -------------------------------------------------------------------------
  it('should skip user stories without GitHub issue links', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_NO_LINK);

    const result = await postACProgressComments(
      '0193',
      ['US-003'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    // No gh calls
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC-004: GitHub API failure returns error, does not throw
  // -------------------------------------------------------------------------
  it('should return error when GitHub API fails, not throw', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('API rate limit exceeded'),
    );

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].usId).toBe('US-001');
    expect(result.errors[0].error).toContain('rate limit');
  });

  // -------------------------------------------------------------------------
  // TC-005: Comment body contains progress percentage and AC names
  // -------------------------------------------------------------------------
  it('should include progress percentage and AC names in comment body', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // Get the body argument from the gh call
    const ghCall = mockExecFileNoThrow.mock.calls[0];
    const bodyArgIndex = ghCall[1].indexOf('--body') + 1;
    const commentBody: string = ghCall[1][bodyArgIndex];

    // Should contain progress info
    expect(commentBody).toContain('3/5');
    expect(commentBody).toContain('60%');
    // Should contain completed AC names
    expect(commentBody).toContain('AC-US1-01');
    expect(commentBody).toContain('AC-US1-02');
    expect(commentBody).toContain('AC-US1-03');
    // Should contain SpecWeave footer
    expect(commentBody).toContain('SpecWeave');
  });

  // -------------------------------------------------------------------------
  // TC-006: Non-blocking failure mode — errors become warnings
  // -------------------------------------------------------------------------
  it('should never throw, even when GitHub is completely down', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('connect ECONNREFUSED'),
    );

    // Must not throw
    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result).toBeDefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('ECONNREFUSED');
  });

  // -------------------------------------------------------------------------
  // TC-006b: Mixed success and failure across multiple USs
  // -------------------------------------------------------------------------
  it('should handle mixed success/failure across user stories', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    // US-001 succeeds, US-002 fails
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('Not Found'),
    );

    const result = await postACProgressComments(
      '0193',
      ['US-001', 'US-002'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(1);
    expect(result.posted[0].usId).toBe('US-001');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].usId).toBe('US-002');
  });

  // -------------------------------------------------------------------------
  // TC-006c: Handles spec.md read failure
  // -------------------------------------------------------------------------
  it('should return error when spec.md cannot be read', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/nonexistent/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('ENOENT');
  });

  // -------------------------------------------------------------------------
  // TC-006d: Empty affectedUSIds returns empty result
  // -------------------------------------------------------------------------
  it('should return empty result when no affected USs provided', async () => {
    const result = await postACProgressComments(
      '0193',
      [],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Targeted Push-Sync Tests (T-005 RED phase)
// ---------------------------------------------------------------------------

describe('postACProgressComments — targeted push-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushSyncUserStories.mockResolvedValue({ created: [], updated: [], errors: [] });
  });

  // -------------------------------------------------------------------------
  // TC-007: Targeted push-sync updates only affected US issue body
  // -------------------------------------------------------------------------
  it('should call pushSyncUserStories with only the affected US', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    // Comment post succeeds
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // pushSyncUserStories should be called with a single-element array
    expect(mockPushSyncUserStories).toHaveBeenCalledTimes(1);
    const pushArgs = mockPushSyncUserStories.mock.calls[0];
    // First arg: array of user stories — should contain only US-001
    expect(pushArgs[0]).toHaveLength(1);
    expect(pushArgs[0][0].id).toBe('US-001');
    // Second arg: options with owner/repo
    expect(pushArgs[1]).toMatchObject({
      owner: 'test-owner',
      repo: 'test-repo',
    });
  });

  // -------------------------------------------------------------------------
  // TC-008: Push-sync is idempotent — same AC state produces same body
  // -------------------------------------------------------------------------
  it('should pass correct AC states to push-sync for body generation', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // Check the user story object passed to pushSync has correct AC states
    const userStory = mockPushSyncUserStories.mock.calls[0][0][0];
    expect(userStory.acceptanceCriteria).toHaveLength(5);
    expect(userStory.acceptanceCriteria.filter((ac: { completed: boolean }) => ac.completed)).toHaveLength(3);
    expect(userStory.acceptanceCriteria.filter((ac: { completed: boolean }) => !ac.completed)).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // TC-009: Push-sync only called for USs with issue links
  // -------------------------------------------------------------------------
  it('should not call pushSyncUserStories for USs without issue links', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_NO_LINK);

    await postACProgressComments(
      '0193',
      ['US-003'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(mockPushSyncUserStories).not.toHaveBeenCalled();
  });
});
