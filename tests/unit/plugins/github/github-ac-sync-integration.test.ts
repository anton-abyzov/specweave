/**
 * Integration tests for the full AC -> Comment -> Issue Body -> Auto-Close chain.
 *
 * Verifies that when AC completion flows through the comment poster,
 * targeted push-sync, and auto-closer, the entire chain operates
 * correctly end-to-end.
 *
 * Updated for v1.0.302: parseIssueLinks reads from metadata.json
 * (sibling of spec.md) instead of spec.md frontmatter.
 *
 * @see T-013: Integration tests
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

const mockPushSyncUserStories = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-push-sync.js', () => ({
  pushSyncUserStories: mockPushSyncUserStories,
}));

import { postACProgressComments } from '../../../../plugins/specweave-github/lib/github-ac-comment-poster.js';
import { autoCloseCompletedUserStories } from '../../../../plugins/specweave-github/lib/github-us-auto-closer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

/** Spec with US-001 partially done (3/5 ACs) -- no issue links in frontmatter */
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

/** Spec with US-001 ALL 5/5 ACs done -- no issue links in frontmatter */
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
- [x] **AC-US1-04**: Fourth criterion done
- [x] **AC-US1-05**: Fifth criterion done
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

const baseOptions = { owner: 'test-owner', repo: 'test-repo' };

/**
 * Helper: Set up readFile mock to handle both spec.md and metadata.json reads.
 */
function setupReadFileMock(specContent: string) {
  mockExistsSync.mockReturnValue(true);
  mockReadFile.mockImplementation((filePath: string) => {
    if (filePath.endsWith('metadata.json')) {
      return Promise.resolve(METADATA_WITH_US001);
    }
    return Promise.resolve(specContent);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AC -> Comment -> Issue Body -> Auto-Close (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushSyncUserStories.mockResolvedValue({ created: [], updated: [], errors: [] });
  });

  // -------------------------------------------------------------------------
  // TC-022: Full chain -- AC completion posts comment + updates body
  // -------------------------------------------------------------------------
  it('should post comment and update issue body when ACs are partially complete', async () => {
    // Comment poster reads spec + metadata
    setupReadFileMock(SPEC_PARTIAL);
    // gh issue comment succeeds
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const commentResult = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    // Verify comment posted
    expect(commentResult.posted).toHaveLength(1);
    expect(commentResult.posted[0].issueNumber).toBe(42);

    // Verify push-sync was called (updates issue body)
    expect(mockPushSyncUserStories).toHaveBeenCalledTimes(1);
    const pushArgs = mockPushSyncUserStories.mock.calls[0];
    expect(pushArgs[0]).toHaveLength(1);
    expect(pushArgs[0][0].id).toBe('US-001');
    expect(pushArgs[0][0].acceptanceCriteria).toHaveLength(5);

    // Verify gh calls: comment only (no close -- partial ACs)
    const ghCalls = mockExecFileNoThrow.mock.calls;
    expect(ghCalls).toHaveLength(1);
    expect((ghCalls[0][1] as string[])[1]).toBe('comment');
  });

  // -------------------------------------------------------------------------
  // TC-023: Full chain -- all ACs done triggers comment + push + close
  // -------------------------------------------------------------------------
  it('should post comment, update body, then close when all ACs are done', async () => {
    // --- Phase 1: Comment poster ---
    setupReadFileMock(SPEC_ALL_DONE);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('')); // comment

    const commentResult = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );
    expect(commentResult.posted).toHaveLength(1);

    // Reset exec mock for auto-closer phase
    mockExecFileNoThrow.mockReset();

    // --- Phase 2: Auto-closer ---
    // Note: auto-closer reads spec.md directly (not metadata.json)
    mockReadFile.mockReset();
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return Promise.resolve(METADATA_WITH_US001);
      }
      return Promise.resolve(SPEC_ALL_DONE);
    });

    // gh issue view -> OPEN
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'OPEN' })),
    );
    // gh issue comment (completion) -> success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));
    // gh issue close -> success
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const closeResult = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    expect(closeResult.closed).toHaveLength(1);
    expect(closeResult.closed[0].issueNumber).toBe(42);

    // Verify auto-closer call order: view -> comment -> close
    const closerCalls = mockExecFileNoThrow.mock.calls;
    expect(closerCalls).toHaveLength(3);
    expect((closerCalls[0][1] as string[])[1]).toBe('view');
    expect((closerCalls[1][1] as string[])[1]).toBe('comment');
    expect((closerCalls[2][1] as string[])[1]).toBe('close');
  });

  // -------------------------------------------------------------------------
  // TC-024: GitHub down -- errors recorded, no exceptions
  // -------------------------------------------------------------------------
  it('should record errors without throwing when GitHub is down', async () => {
    // --- Comment poster: GitHub down ---
    setupReadFileMock(SPEC_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(execFailure('connect ECONNREFUSED'));

    const commentResult = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    // Comment poster should report error (issue link exists but gh call fails)
    expect(commentResult.errors).toHaveLength(1);
    expect(commentResult.errors[0].error).toContain('ECONNREFUSED');

    // Reset for auto-closer
    mockExecFileNoThrow.mockReset();

    // --- Auto-closer: GitHub down on view ---
    mockReadFile.mockReset();
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return Promise.resolve(METADATA_WITH_US001);
      }
      return Promise.resolve(SPEC_ALL_DONE);
    });

    mockExecFileNoThrow.mockResolvedValueOnce(execFailure('connect ECONNREFUSED'));
    // Comment still attempted after view failure
    mockExecFileNoThrow.mockResolvedValueOnce(execFailure('connect ECONNREFUSED'));
    // Close still attempted
    mockExecFileNoThrow.mockResolvedValueOnce(execFailure('connect ECONNREFUSED'));

    const closeResult = await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    // Should have error but NO exception
    expect(closeResult.errors).toHaveLength(1);
    expect(closeResult.errors[0].error).toContain('ECONNREFUSED');
  });

  // -------------------------------------------------------------------------
  // TC-025: Comment body and close body both contain correct progress info
  // -------------------------------------------------------------------------
  it('should include correct progress percentages in comment bodies', async () => {
    // Partial progress comment
    setupReadFileMock(SPEC_PARTIAL);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    // Check progress comment body (partial)
    const progressBody: string = (mockExecFileNoThrow.mock.calls[0][1] as string[])[4];
    expect(progressBody).toContain('3/5');
    expect(progressBody).toContain('60%');
    expect(progressBody).toContain('AC-US1-01');
    expect(progressBody).toContain('SpecWeave');

    // Reset for completion comment
    mockExecFileNoThrow.mockReset();
    mockReadFile.mockReset();
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return Promise.resolve(METADATA_WITH_US001);
      }
      return Promise.resolve(SPEC_ALL_DONE);
    });

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({ state: 'OPEN' })),
    );
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('')); // completion comment
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('')); // close

    await autoCloseCompletedUserStories(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      baseOptions,
    );

    // Check completion comment body
    const completionBody: string = (mockExecFileNoThrow.mock.calls[1][1] as string[])[4];
    expect(completionBody).toContain('100%');
    expect(completionBody).toContain('All acceptance criteria completed');
  });
});
