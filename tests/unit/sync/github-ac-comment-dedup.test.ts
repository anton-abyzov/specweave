/**
 * Unit tests for postACProgressComments fingerprint-based dedup
 *
 * Tests that progress comments are skipped when the last GitHub comment
 * already contains a matching `<!-- sw-progress:N/M -->` fingerprint,
 * and posted when progress has changed or no prior comment exists.
 *
 * Expected behaviour after T-004:
 * - Matching fingerprint → skip comment
 * - Different fingerprint → post new comment with updated fingerprint
 * - No prior comments → post first comment with fingerprint
 *
 * @see T-003: RED phase — current code posts unconditionally, dedup tests fail
 * @see T-004: GREEN phase — add fingerprint dedup to comment poster
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
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
  postACProgressComments,
  type CommentPostOptions,
} from '../../../plugins/specweave/lib/integrations/github/github-ac-comment-poster.js';

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

/** Spec with US-001 having 3/5 ACs complete */
const SPEC_3_OF_5 = `---
increment: 0587-fix-github-sync-dedup
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

/** Spec with US-001 having 4/5 ACs complete */
const SPEC_4_OF_5 = `---
increment: 0587-fix-github-sync-dedup
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
- [x] **AC-US1-04**: Fourth criterion now done
- [ ] **AC-US1-05**: Fifth criterion pending
`;

const METADATA_WITH_US001 = JSON.stringify({
  id: '0587-fix-github-sync-dedup',
  status: 'active',
  externalLinks: {
    github: {
      issues: {
        'US-001': {
          issueNumber: 42,
          issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
        },
      },
    },
  },
});

function setupReadFileMock(specContent: string, metadataContent?: string) {
  mockExistsSync.mockReturnValue(!!metadataContent);
  mockReadFile.mockImplementation((filePath: string) => {
    if (filePath.endsWith('metadata.json')) {
      if (metadataContent) return Promise.resolve(metadataContent);
      return Promise.reject(new Error('ENOENT'));
    }
    return Promise.resolve(specContent);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('postACProgressComments fingerprint dedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips comment when last comment has matching fingerprint (3/5 unchanged)', async () => {
    setupReadFileMock(SPEC_3_OF_5, METADATA_WITH_US001);

    // Mock: gh api returns last comment with matching fingerprint
    mockExecFileNoThrow.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'api' && args[1]?.includes('/comments')) {
        return Promise.resolve(execSuccess('<!-- sw-progress:3/5 -->'));
      }
      // gh issue comment — should NOT be called
      if (args[0] === 'issue' && args[1] === 'comment') {
        return Promise.resolve(execSuccess(''));
      }
      // gh issue view — for patchIssueBodyCheckboxes
      if (args[0] === 'issue' && args[1] === 'view') {
        return Promise.resolve(execSuccess(''));
      }
      // gh issue edit
      if (args[0] === 'issue' && args[1] === 'edit') {
        return Promise.resolve(execSuccess(''));
      }
      return Promise.resolve(execSuccess(''));
    });

    const result = await postACProgressComments(
      '0587-fix-github-sync-dedup',
      ['US-001'],
      '/fake/spec.md',
      makeOptions(),
    );

    // With dedup, comment should be skipped — not posted
    const commentCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'comment',
    );
    expect(commentCalls).toHaveLength(0);
    expect(result.posted).toHaveLength(0);
  });

  it('posts comment when fingerprint differs (old: 2/5, new: 3/5)', async () => {
    setupReadFileMock(SPEC_3_OF_5, METADATA_WITH_US001);

    mockExecFileNoThrow.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'api' && args[1]?.includes('/comments')) {
        return Promise.resolve(execSuccess('<!-- sw-progress:2/5 -->'));
      }
      if (args[0] === 'issue' && args[1] === 'comment') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'view') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'edit') {
        return Promise.resolve(execSuccess(''));
      }
      return Promise.resolve(execSuccess(''));
    });

    const result = await postACProgressComments(
      '0587-fix-github-sync-dedup',
      ['US-001'],
      '/fake/spec.md',
      makeOptions(),
    );

    // Fingerprint changed, so comment should be posted
    const commentCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'comment',
    );
    expect(commentCalls).toHaveLength(1);
    expect(result.posted).toHaveLength(1);

    // Verify comment body contains the new fingerprint
    const commentBody = commentCalls[0][1][4]; // --body value (index 4: issue,comment,N,--body,BODY)
    expect(commentBody).toContain('<!-- sw-progress:3/5 -->');
  });

  it('posts comment with fingerprint when no prior comments exist', async () => {
    setupReadFileMock(SPEC_3_OF_5, METADATA_WITH_US001);

    mockExecFileNoThrow.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'api' && args[1]?.includes('/comments')) {
        // No comments — empty response
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'comment') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'view') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'edit') {
        return Promise.resolve(execSuccess(''));
      }
      return Promise.resolve(execSuccess(''));
    });

    const result = await postACProgressComments(
      '0587-fix-github-sync-dedup',
      ['US-001'],
      '/fake/spec.md',
      makeOptions(),
    );

    // First sync — should post with fingerprint
    const commentCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'comment',
    );
    expect(commentCalls).toHaveLength(1);
    expect(result.posted).toHaveLength(1);

    // Verify fingerprint is embedded in the comment body
    const commentBody = commentCalls[0][1][4]; // --body value (index 4: issue,comment,N,--body,BODY)
    expect(commentBody).toContain('<!-- sw-progress:3/5 -->');
  });

  it('handles gh api failure gracefully and still posts comment', async () => {
    setupReadFileMock(SPEC_3_OF_5, METADATA_WITH_US001);

    mockExecFileNoThrow.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'api' && args[1]?.includes('/comments')) {
        return Promise.resolve(execFailure('Not Found'));
      }
      if (args[0] === 'issue' && args[1] === 'comment') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'view') {
        return Promise.resolve(execSuccess(''));
      }
      if (args[0] === 'issue' && args[1] === 'edit') {
        return Promise.resolve(execSuccess(''));
      }
      return Promise.resolve(execSuccess(''));
    });

    const result = await postACProgressComments(
      '0587-fix-github-sync-dedup',
      ['US-001'],
      '/fake/spec.md',
      makeOptions(),
    );

    // API failure should not block posting
    const commentCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'comment',
    );
    expect(commentCalls).toHaveLength(1);
    expect(result.posted).toHaveLength(1);
  });
});
