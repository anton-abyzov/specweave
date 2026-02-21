/**
 * Unit tests for autoCloseCompletedUserStories (RED phase - TDD)
 *
 * Tests the auto-closer that closes GitHub issues when all acceptance
 * criteria for a user story are completed in spec.md.
 *
 * Updated for v1.0.302: parseIssueLinks reads from metadata.json
 * (sibling of spec.md) instead of spec.md frontmatter.
 *
 * Expected module: plugins/specweave-github/lib/github-us-auto-closer.ts
 *
 * @see T-007: RED phase
 * @see T-008: GREEN phase (implementation)
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

const mockExistsSync = vi.hoisted(() => vi.fn());
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

import {
  autoCloseCompletedUserStories,
  type AutoCloseOptions,
  type AutoCloseResult,
} from '../../../../plugins/specweave-github/lib/github-us-auto-closer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

function makeOptions(overrides: Partial<AutoCloseOptions> = {}): AutoCloseOptions {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    ...overrides,
  };
}

/** Spec.md with US-001 ALL 3 ACs complete (no issue links in frontmatter) */
const SPEC_ALL_DONE = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: First criterion done
- [x] **AC-US1-02**: Second criterion done
- [x] **AC-US1-03**: Third criterion done
`;

/** Spec.md with US-001 partially complete (3/5) */
const SPEC_PARTIAL = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
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
`;

/** Spec.md with US-003 ACs done but no issue link in metadata */
const SPEC_NO_LINK = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
---

# Feature: Test Feature

## User Stories

### US-003: Third User Story (no GitHub link)

**Acceptance Criteria**:
- [x] **AC-US3-01**: First criterion done
- [x] **AC-US3-02**: Second criterion done
`;

/** Metadata.json with issue link for US-001 */
const METADATA_WITH_US001 = JSON.stringify({
  id: '0193-github-sync-ac-comment-wiring',
  status: 'active',
  github: {
    issues: [
      {
        userStory: 'US-001',
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
      },
    ],
  },
});

/**
 * Helper: Set up readFile mock to handle both spec.md and metadata.json reads.
 */
function setupReadFileMock(specContent: string, metadataContent?: string) {
  mockExistsSync.mockReturnValue(!!metadataContent);
  mockReadFile.mockImplementation((filePath: string) => {
    if (filePath.endsWith('metadata.json')) {
      if (metadataContent) {
        return Promise.resolve(metadataContent);
      }
      return Promise.reject(new Error('ENOENT: no such file'));
    }
    return Promise.resolve(specContent);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('autoCloseCompletedUserStories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TC-010: Closes issue when all ACs complete
  // -------------------------------------------------------------------------
  it('should close issue when all ACs are complete', async () => {
    setupReadFileMock(SPEC_ALL_DONE, METADATA_WITH_US001);
    // gh issue view (check state) → OPEN
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'OPEN' })),
    );
    // gh issue comment (completion comment) → success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    // gh issue close → success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(1);
    expect(result.closed[0]).toEqual({
      usId: 'US-001',
      issueNumber: 42,
    });
    expect(result.errors).toHaveLength(0);

    // Verify gh issue close was called
    const closeCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: unknown[]) => (call[1] as string[])[1] === 'close',
    );
    expect(closeCalls).toHaveLength(1);
    expect(closeCalls[0][1]).toEqual(
      expect.arrayContaining(['issue', 'close', '42', '-R', 'test-owner/test-repo']),
    );
  });

  // -------------------------------------------------------------------------
  // TC-011: Posts completion comment before closing
  // -------------------------------------------------------------------------
  it('should post completion comment BEFORE closing issue', async () => {
    setupReadFileMock(SPEC_ALL_DONE, METADATA_WITH_US001);
    // gh issue view → OPEN
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'OPEN' })),
    );
    // gh issue comment → success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    // gh issue close → success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // Verify call order: view(0) → comment(1) → close(2)
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(3);

    const calls = mockExecFileNoThrow.mock.calls;
    // First call: issue view
    expect((calls[0][1] as string[])[1]).toBe('view');
    // Second call: issue comment
    expect((calls[1][1] as string[])[1]).toBe('comment');
    // Third call: issue close
    expect((calls[2][1] as string[])[1]).toBe('close');

    // Comment body should indicate completion
    const commentBody: string = (calls[1][1] as string[])[4]; // --body arg
    expect(commentBody).toContain('100%');
    expect(commentBody).toContain('All acceptance criteria completed');
  });

  // -------------------------------------------------------------------------
  // TC-012: Skips already-closed issues (idempotent)
  // -------------------------------------------------------------------------
  it('should skip already-closed issues', async () => {
    setupReadFileMock(SPEC_ALL_DONE, METADATA_WITH_US001);
    // gh issue view → CLOSED
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'CLOSED' })),
    );

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toEqual({
      usId: 'US-001',
      reason: 'already-closed',
    });

    // Only 1 call (view), no comment or close
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC-013: Does NOT close when some ACs still incomplete
  // -------------------------------------------------------------------------
  it('should not close issue when some ACs are incomplete', async () => {
    setupReadFileMock(SPEC_PARTIAL, METADATA_WITH_US001);

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toEqual({
      usId: 'US-001',
      reason: 'incomplete-acs',
    });

    // No gh calls at all (short-circuits before checking issue state)
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC-014: Handles GitHub failure gracefully
  // -------------------------------------------------------------------------
  it('should handle GitHub close failure gracefully', async () => {
    setupReadFileMock(SPEC_ALL_DONE, METADATA_WITH_US001);
    // gh issue view → OPEN
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'OPEN' })),
    );
    // gh issue comment → success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    // gh issue close → FAILURE
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('Resource not accessible by integration'),
    );

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].usId).toBe('US-001');
    expect(result.errors[0].error).toContain('not accessible');
  });

  // -------------------------------------------------------------------------
  // TC-015: Skips US without GitHub issue link
  // -------------------------------------------------------------------------
  it('should skip user stories without GitHub issue links', async () => {
    // metadata.json has US-001 but NOT US-003
    setupReadFileMock(SPEC_NO_LINK, METADATA_WITH_US001);

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-003'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toEqual({
      usId: 'US-003',
      reason: 'no-issue-link',
    });
    expect(result.errors).toHaveLength(0);
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC-015b: Empty affectedUSIds returns empty result
  // -------------------------------------------------------------------------
  it('should return empty result when no affected USs provided', async () => {
    const result = await autoCloseCompletedUserStories(
      '0193',
      [],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC-015c: Handles spec.md read failure
  // -------------------------------------------------------------------------
  it('should return error when spec.md cannot be read', async () => {
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

    const result = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/nonexistent/spec.md',
      makeOptions(),
    );

    expect(result.closed).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('ENOENT');
  });
});
