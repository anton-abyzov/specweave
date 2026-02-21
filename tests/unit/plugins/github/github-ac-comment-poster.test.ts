/**
 * Unit tests for postACProgressComments
 *
 * Tests the AC comment poster that posts progress comments to GitHub
 * issues when acceptance criteria are completed in spec.md.
 *
 * Updated for v1.0.302: parseIssueLinks now reads from metadata.json
 * (sibling of spec.md) instead of spec.md frontmatter.
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

// --- Spec.md content (no issue links in frontmatter -- those come from metadata.json now) ---

/** Spec.md content with 2 user stories, US-001 has 3/5 ACs complete */
const SPEC_CONTENT_PARTIAL = `---
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
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: First criterion done
- [x] **AC-US1-02**: Second criterion done
- [x] **AC-US1-03**: Third criterion done
`;

/** Spec.md content with US-003 (no issue link in metadata) */
const SPEC_CONTENT_NO_LINK = `---
increment: 0193-github-sync-ac-comment-wiring
title: "Test Feature"
status: active
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

// --- Metadata.json content (OLD format: github.issues[] array) ---

const METADATA_OLD_FORMAT = JSON.stringify({
  id: '0193-github-sync-ac-comment-wiring',
  status: 'active',
  github: {
    issues: [
      {
        userStory: 'US-001',
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
        createdAt: '2026-02-07T00:00:00Z',
      },
      {
        userStory: 'US-002',
        number: 43,
        url: 'https://github.com/test-owner/test-repo/issues/43',
        createdAt: '2026-02-07T00:00:00Z',
      },
    ],
    lastSync: '2026-02-07T00:00:00Z',
  },
});

// --- Metadata.json content (NEW format: externalLinks.github.issues object) ---

const METADATA_NEW_FORMAT = JSON.stringify({
  id: '0193-github-sync-ac-comment-wiring',
  status: 'active',
  externalLinks: {
    github: {
      issues: {
        'US-001': {
          issueNumber: 42,
          issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
        },
        'US-002': {
          issueNumber: 43,
          issueUrl: 'https://github.com/test-owner/test-repo/issues/43',
        },
      },
    },
  },
});

// --- Metadata with only US-001 (no US-003) ---

const METADATA_NO_US003 = JSON.stringify({
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
 * Helper: Set up mocks for a standard test scenario.
 * readFile gets called twice: first for spec.md, then for metadata.json.
 */
function setupMocks(specContent: string, metadataContent: string) {
  mockExistsSync.mockReturnValue(true);
  // First call: readFile(specPath) for spec.md content
  // Second call: readFile(metadataPath) for metadata.json
  mockReadFile.mockImplementation((filePath: string) => {
    if (filePath.endsWith('metadata.json')) {
      return Promise.resolve(metadataContent);
    }
    return Promise.resolve(specContent);
  });
}

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
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
  // TC-001b: Works with NEW metadata format (externalLinks.github.issues)
  // -------------------------------------------------------------------------
  it('should read issue links from NEW metadata format', async () => {
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_NEW_FORMAT);
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
  });

  // -------------------------------------------------------------------------
  // TC-002: Handles multiple affected user stories
  // -------------------------------------------------------------------------
  it('should post comments to multiple affected user story issues', async () => {
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    setupMocks(SPEC_CONTENT_NO_LINK, METADATA_NO_US003);

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
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
  // TC-006: Non-blocking failure mode -- errors become warnings
  // -------------------------------------------------------------------------
  it('should never throw, even when GitHub is completely down', async () => {
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

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

  // -------------------------------------------------------------------------
  // TC-010: Missing metadata.json returns empty links (no crash)
  // -------------------------------------------------------------------------
  it('should return empty when metadata.json does not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve(SPEC_CONTENT_PARTIAL);
    });

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // No issue links found, so no comments posted (but no errors either)
    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // TC-011: Invalid JSON in metadata.json returns empty links gracefully
  // -------------------------------------------------------------------------
  it('should return empty when metadata.json has invalid JSON', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return Promise.resolve('not valid json {{{');
      }
      return Promise.resolve(SPEC_CONTENT_PARTIAL);
    });

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // parseIssueLinks should catch the JSON parse error and return empty
    expect(result.posted).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // TC-012: Both OLD and NEW format present -- NEW overrides OLD
  // -------------------------------------------------------------------------
  it('should prefer NEW format over OLD format for same US', async () => {
    const metadataBothFormats = JSON.stringify({
      github: {
        issues: [
          { userStory: 'US-001', number: 42, url: 'old-url' },
        ],
      },
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 99, issueUrl: 'new-url' },
          },
        },
      },
    });

    setupMocks(SPEC_CONTENT_PARTIAL, metadataBothFormats);
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const result = await postACProgressComments(
      '0193',
      ['US-001'],
      '/path/to/spec.md',
      makeOptions(),
    );

    // Should use NEW format issue number (99), not OLD (42)
    expect(result.posted).toHaveLength(1);
    expect(result.posted[0].issueNumber).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Targeted Push-Sync Tests
// ---------------------------------------------------------------------------

describe('postACProgressComments -- targeted push-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushSyncUserStories.mockResolvedValue({ created: [], updated: [], errors: [] });
  });

  // -------------------------------------------------------------------------
  // TC-007: Targeted push-sync updates only affected US issue body
  // -------------------------------------------------------------------------
  it('should call pushSyncUserStories with only the affected US', async () => {
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    // First arg: array of user stories -- should contain only US-001
    expect(pushArgs[0]).toHaveLength(1);
    expect(pushArgs[0][0].id).toBe('US-001');
    // Second arg: options with owner/repo
    expect(pushArgs[1]).toMatchObject({
      owner: 'test-owner',
      repo: 'test-repo',
    });
  });

  // -------------------------------------------------------------------------
  // TC-008: Push-sync is idempotent -- same AC state produces same body
  // -------------------------------------------------------------------------
  it('should pass correct AC states to push-sync for body generation', async () => {
    setupMocks(SPEC_CONTENT_PARTIAL, METADATA_OLD_FORMAT);
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
    setupMocks(SPEC_CONTENT_NO_LINK, METADATA_NO_US003);

    await postACProgressComments(
      '0193',
      ['US-003'],
      '/path/to/spec.md',
      makeOptions(),
    );

    expect(mockPushSyncUserStories).not.toHaveBeenCalled();
  });
});
