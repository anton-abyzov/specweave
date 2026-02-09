/**
 * Unit tests for pullSyncFromGitHub (RED phase - TDD)
 *
 * Tests the pull-sync function that fetches GitHub issue state and
 * applies changes back to spec.md acceptance criteria.
 *
 * Expected module: plugins/specweave-github/lib/github-pull-sync.ts (does NOT exist yet)
 *
 * @see T-010: Pull sync (GitHub -> spec)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

const mockParseIssueBody = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-issue-body-parser.js', () => ({
  parseIssueBody: mockParseIssueBody,
}));

// RED phase import — module does not exist yet
import {
  pullSyncFromGitHub,
  type PullSyncOptions,
  type PullSyncChange,
  type PullSyncConflict,
  type PullSyncResult,
} from '../../../../plugins/specweave-github/lib/github-pull-sync.js';

import type { GitHubUserStoryLink } from '../../../../src/core/types/sync-profile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shortcut for a successful exec result */
function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

/** Shortcut for a failed exec result */
function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

/** Build a default GitHubUserStoryLink fixture */
function makeLink(overrides: Partial<GitHubUserStoryLink> = {}): GitHubUserStoryLink {
  return {
    issueNumber: 42,
    issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
    issueNodeId: 'I_kwDOTest42',
    syncedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/** Default pull-sync options */
function makeOptions(overrides: Partial<PullSyncOptions> = {}): PullSyncOptions {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    ...overrides,
  };
}

/** Build a gh issue view JSON response */
function makeIssueViewResponse(overrides: Record<string, unknown> = {}) {
  return {
    title: '[US-001] User authentication',
    body: '## Acceptance Criteria\n\n- [x] **AC-US1-01**: User can log in\n- [ ] **AC-US1-02**: User sees error on invalid credentials\n\n<!-- specweave:sync spec=spec-001 us=US-001 -->',
    state: 'OPEN',
    labels: [{ name: 'user-story' }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pullSyncFromGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Fetches issue state for each linked user story
  // -------------------------------------------------------------------------
  it('should fetch issue state via gh issue view for each linked user story', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: false, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    await pullSyncFromGitHub(links, specACs, makeOptions());

    // Verify gh issue view was called with correct arguments
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    const call = mockExecFileNoThrow.mock.calls[0];
    expect(call[0]).toBe('gh');
    const args = call[1] as string[];
    expect(args).toContain('issue');
    expect(args).toContain('view');
    expect(args).toContain('42');
    expect(args).toContain('--json');
    expect(args).toContain('--repo');

    // Should target the correct repo
    const repoIdx = args.indexOf('--repo');
    expect(args[repoIdx + 1]).toBe('test-owner/test-repo');
  });

  // -------------------------------------------------------------------------
  // 2. Detects when GitHub AC checkbox toggled vs spec state
  // -------------------------------------------------------------------------
  it('should detect when a GitHub AC checkbox was toggled compared to spec state', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    // GitHub has AC-US1-01 checked, AC-US1-02 unchecked
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    // Spec has both unchecked
    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    // Should detect AC-US1-01 was toggled on GitHub
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'AC-US1-01',
        specValue: 'false',
        githubValue: 'true',
      })
    );

    // AC-US1-02 is the same in both, should NOT appear in changes
    const ac02Change = result.changes.find(
      (c) => c.field === 'AC-US1-02'
    );
    expect(ac02Change).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 3. Returns changes when GitHub has newer data
  // -------------------------------------------------------------------------
  it('should return applied changes when GitHub has newer AC data and no conflicts', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    // GitHub: both ACs checked
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
        'AC-US1-02': { checked: true, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    // Spec: both unchecked (GitHub is ahead)
    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(result.changes).toHaveLength(2);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'AC-US1-01',
        specValue: 'false',
        githubValue: 'true',
        applied: true,
      })
    );
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'AC-US1-02',
        specValue: 'false',
        githubValue: 'true',
        applied: true,
      })
    );
    expect(result.conflicts).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 4. Detects issue state changes (open -> closed = completed)
  // -------------------------------------------------------------------------
  it('should detect issue state change when GitHub issue is closed', async () => {
    const issueResponse = makeIssueViewResponse({ state: 'CLOSED' });

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
        'AC-US1-02': { checked: true, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    // Should detect the issue state change
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'status',
        specValue: 'open',
        githubValue: 'closed',
      })
    );
  });

  // -------------------------------------------------------------------------
  // 5. Returns conflicts when both spec and GitHub changed
  // -------------------------------------------------------------------------
  it('should return conflicts when both spec and GitHub changed the same AC', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    // GitHub: AC-US1-01 unchecked (was checked, someone unchecked it)
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: false, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({
        issueNumber: 42,
        // Record that at last sync, AC-US1-01 was checked (true).
        // Now both sides changed: spec says true, GitHub says false.
        lastConflict: null,
      }),
    };

    // Spec: AC-US1-01 completed (spec side also changed it to true since last sync)
    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: true },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    // Should detect a conflict: spec says true, GitHub says false
    expect(result.conflicts).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'AC-US1-01',
        specValue: 'true',
        githubValue: 'false',
      })
    );
  });

  // -------------------------------------------------------------------------
  // 6. Returns empty result for dry run (no changes applied)
  // -------------------------------------------------------------------------
  it('should not apply changes in dry run mode but still report them', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    // GitHub: AC-US1-01 checked
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions({ dryRun: true }));

    // Changes should be detected but NOT applied
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-001',
        field: 'AC-US1-01',
        applied: false,
      })
    );
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 7. Handles gh CLI errors gracefully
  // -------------------------------------------------------------------------
  it('should return errors array when gh issue view fails', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('HTTP 404: Not Found')
    );

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 999 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].userStoryId).toBe('US-001');
    expect(result.errors[0].error).toContain('404');
    expect(result.changes).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should continue processing other user stories when one fails', async () => {
    // US-001: fails
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('HTTP 404: Not Found')
    );

    // US-002: succeeds
    const issueResponse2 = makeIssueViewResponse({
      title: '[US-002] Dashboard',
      body: '## Acceptance Criteria\n\n- [x] **AC-US2-01**: Dashboard loads\n\n<!-- specweave:sync spec=spec-001 us=US-002 -->',
      state: 'OPEN',
    });
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse2))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US2-01': { checked: true, description: 'Dashboard loads' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-002' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 999 }),
      'US-002': makeLink({ issueNumber: 55 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
      'US-002': [{ id: 'AC-US2-01', completed: false }],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].userStoryId).toBe('US-001');

    // US-002 should still have its change detected
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        userStoryId: 'US-002',
        field: 'AC-US2-01',
        githubValue: 'true',
      })
    );
  });

  // -------------------------------------------------------------------------
  // 8. Returns empty result when no user stories linked
  // -------------------------------------------------------------------------
  it('should return empty result when no user stories are linked', async () => {
    const links: Record<string, GitHubUserStoryLink> = {};
    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {};

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(result.changes).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 9. Preserves existing sync metadata
  // -------------------------------------------------------------------------
  it('should not mutate the input userStoryLinks object', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({
        issueNumber: 42,
        syncedAt: '2026-01-15T10:00:00.000Z',
        lastConflict: null,
      }),
    };

    // Capture original syncedAt
    const originalSyncedAt = links['US-001'].syncedAt;

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    await pullSyncFromGitHub(links, specACs, makeOptions());

    // Input links should not be mutated
    expect(links['US-001'].syncedAt).toBe(originalSyncedAt);
    expect(links['US-001'].lastConflict).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Token passthrough
  // -------------------------------------------------------------------------
  it('should pass token to gh commands via environment when provided', async () => {
    const issueResponse = makeIssueViewResponse();

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: false, description: 'User can log in' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
    };

    await pullSyncFromGitHub(links, specACs, makeOptions({ token: 'ghp_secret_token_123' }));

    const call = mockExecFileNoThrow.mock.calls[0];
    const opts = call[2] as { env?: NodeJS.ProcessEnv };
    expect(opts.env).toBeDefined();
    expect(opts.env!.GH_TOKEN).toBe('ghp_secret_token_123');
  });

  // -------------------------------------------------------------------------
  // Multiple user stories
  // -------------------------------------------------------------------------
  it('should fetch and compare all linked user stories', async () => {
    // US-001 issue
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(makeIssueViewResponse()))
    );
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'User can log in' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    // US-002 issue
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(makeIssueViewResponse({
        title: '[US-002] Dashboard',
        body: '## Acceptance Criteria\n\n- [x] **AC-US2-01**: Dashboard loads\n\n<!-- specweave:sync spec=spec-001 us=US-002 -->',
      })))
    );
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US2-01': { checked: true, description: 'Dashboard loads' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-002' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
      'US-002': makeLink({ issueNumber: 43 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
      'US-002': [{ id: 'AC-US2-01', completed: false }],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);
    expect(result.changes).toHaveLength(2);
    expect(result.changes).toContainEqual(
      expect.objectContaining({ userStoryId: 'US-001', field: 'AC-US1-01' })
    );
    expect(result.changes).toContainEqual(
      expect.objectContaining({ userStoryId: 'US-002', field: 'AC-US2-01' })
    );
  });

  // -------------------------------------------------------------------------
  // No changes when spec and GitHub match
  // -------------------------------------------------------------------------
  it('should return no changes when spec and GitHub AC states match', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(makeIssueViewResponse()))
    );

    // GitHub: both unchecked (same as spec)
    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: false, description: 'User can log in' },
        'AC-US1-02': { checked: false, description: 'User sees error on invalid credentials' },
      },
      syncMarker: { specId: 'spec-001', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [
        { id: 'AC-US1-01', completed: false },
        { id: 'AC-US1-02', completed: false },
      ],
    };

    const result = await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(result.changes).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // parseIssueBody is called with the issue body
  // -------------------------------------------------------------------------
  it('should pass the issue body to parseIssueBody', async () => {
    const bodyText = '## AC\n\n- [x] **AC-US1-01**: Done\n\n<!-- specweave:sync us=US-001 -->';
    const issueResponse = makeIssueViewResponse({ body: bodyText });

    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify(issueResponse))
    );

    mockParseIssueBody.mockReturnValueOnce({
      acceptanceCriteria: {
        'AC-US1-01': { checked: true, description: 'Done' },
      },
      syncMarker: { specId: '', userStoryId: 'US-001' },
    });

    const links: Record<string, GitHubUserStoryLink> = {
      'US-001': makeLink({ issueNumber: 42 }),
    };

    const specACs: Record<string, Array<{ id: string; completed: boolean }>> = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
    };

    await pullSyncFromGitHub(links, specACs, makeOptions());

    expect(mockParseIssueBody).toHaveBeenCalledTimes(1);
    expect(mockParseIssueBody).toHaveBeenCalledWith(bodyText);
  });
});
