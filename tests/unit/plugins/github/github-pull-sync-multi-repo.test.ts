/**
 * Unit tests for pullSyncMultiRepo (RED phase - TDD)
 *
 * Tests multi-repo pull sync with all-repos-must-agree consensus
 * for shared user stories across cross-team repositories.
 *
 * Expected function: pullSyncMultiRepo in github-pull-sync.ts
 *
 * @see T-010: RED phase
 * @see T-011: GREEN phase (implementation)
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

import {
  pullSyncMultiRepo,
  type MultiRepoPullSyncOptions,
  type MultiRepoPullSyncResult,
} from '../../../../plugins/specweave-github/lib/github-pull-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

/**
 * Create a mock GitHub issue response with AC checkboxes.
 */
function makeIssueResponse(acStates: Record<string, boolean>, state = 'OPEN') {
  return {
    title: 'Test Issue',
    body: 'mock body',
    state,
    labels: [],
  };
}

/**
 * Create parsed body result from parseIssueBody mock.
 */
function makeParsedBody(acStates: Record<string, boolean>) {
  const acs: Record<string, { checked: boolean; description: string }> = {};
  for (const [id, checked] of Object.entries(acStates)) {
    acs[id] = { checked, description: `Description of ${id}` };
  }
  return { acceptanceCriteria: acs, userStoryId: '', specId: '' };
}

/**
 * Configure mockExecFileNoThrow to return per-repo responses.
 * Matches based on -R/--repo flag value.
 */
function setupRepoResponses(repoResponses: Record<string, ReturnType<typeof execSuccess>>) {
  mockExecFileNoThrow.mockImplementation(
    (_cmd: string, args: string[], _opts?: Record<string, unknown>) => {
      // Find the repo slug from -R or --repo flag
      const repoFlagIdx = args.indexOf('-R');
      const repoFlag2Idx = args.indexOf('--repo');
      const idx = repoFlagIdx !== -1 ? repoFlagIdx : repoFlag2Idx;
      const repoSlug = idx !== -1 ? args[idx + 1] : '';

      if (repoSlug && repoResponses[repoSlug]) {
        return Promise.resolve(repoResponses[repoSlug]);
      }
      return Promise.resolve(execFailure(`No mock for repo: ${repoSlug}`));
    },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pullSyncMultiRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseIssueBody.mockReturnValue(makeParsedBody({}));
  });

  // -------------------------------------------------------------------------
  // TC-016: Shared US — all repos agree AC done → AC marked done
  // -------------------------------------------------------------------------
  it('should mark AC as done when ALL repos agree it is done', async () => {
    // US-003 is shared across frontend-app and backend-api
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-003'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-003'] },
    ];

    const specACs = {
      'US-003': [
        { id: 'AC-US3-01', completed: false },
        { id: 'AC-US3-02', completed: false },
      ],
    };

    const userStoryLinks = {
      'US-003': {
        // Per-repo issue numbers
        'org/frontend-app': { issueNumber: 10 },
        'org/backend-api': { issueNumber: 20 },
      },
    };

    // Both repos have AC-US3-01 checked
    setupRepoResponses({
      'org/frontend-app': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': true, 'AC-US3-02': false }))),
      'org/backend-api': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': true, 'AC-US3-02': false }))),
    });

    // parseIssueBody returns per-repo AC states
    mockParseIssueBody
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': true, 'AC-US3-02': false }))
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': true, 'AC-US3-02': false }));

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    // AC-US3-01 should be a change (all repos agree it's done)
    const ac01Change = result.changes.find(c => c.field === 'AC-US3-01');
    expect(ac01Change).toBeDefined();
    expect(ac01Change!.applied).toBe(true);
    expect(ac01Change!.githubValue).toBe('true');

    // AC-US3-02 should NOT be a change (still unchecked in both)
    const ac02Change = result.changes.find(c => c.field === 'AC-US3-02');
    expect(ac02Change).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TC-017: Shared US — repos disagree → AC stays unchecked
  // -------------------------------------------------------------------------
  it('should NOT mark AC as done when repos disagree', async () => {
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-003'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-003'] },
    ];

    const specACs = {
      'US-003': [
        { id: 'AC-US3-01', completed: false },
      ],
    };

    const userStoryLinks = {
      'US-003': {
        'org/frontend-app': { issueNumber: 10 },
        'org/backend-api': { issueNumber: 20 },
      },
    };

    // frontend has it checked, backend does NOT
    setupRepoResponses({
      'org/frontend-app': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': true }))),
      'org/backend-api': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': false }))),
    });

    mockParseIssueBody
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': true }))
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': false }));

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    // No changes — consensus failed
    const ac01Change = result.changes.find(c => c.field === 'AC-US3-01');
    expect(ac01Change).toBeUndefined();

    // Should have a disagreement recorded
    expect(result.disagreements).toBeDefined();
    expect(result.disagreements).toHaveLength(1);
    expect(result.disagreements![0].field).toBe('AC-US3-01');
  });

  // -------------------------------------------------------------------------
  // TC-018: Repo-specific US — standard single-repo logic applies
  // -------------------------------------------------------------------------
  it('should use single-repo result for repo-specific user stories', async () => {
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-001'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-002'] },
    ];

    const specACs = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
      'US-002': [{ id: 'AC-US2-01', completed: false }],
    };

    const userStoryLinks = {
      'US-001': {
        'org/frontend-app': { issueNumber: 10 },
      },
      'US-002': {
        'org/backend-api': { issueNumber: 20 },
      },
    };

    setupRepoResponses({
      'org/frontend-app': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US1-01': true }))),
      'org/backend-api': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US2-01': true }))),
    });

    mockParseIssueBody
      .mockReturnValueOnce(makeParsedBody({ 'AC-US1-01': true }))
      .mockReturnValueOnce(makeParsedBody({ 'AC-US2-01': true }));

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    // Both ACs should be applied (no consensus needed — single repo each)
    expect(result.changes).toHaveLength(2);
    expect(result.changes.find(c => c.field === 'AC-US1-01')!.applied).toBe(true);
    expect(result.changes.find(c => c.field === 'AC-US2-01')!.applied).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC-019: One repo unreachable — others still processed
  // -------------------------------------------------------------------------
  it('should process reachable repos when one repo is unreachable', async () => {
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-001', 'US-003'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-003'] },
    ];

    const specACs = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
      'US-003': [{ id: 'AC-US3-01', completed: false }],
    };

    const userStoryLinks = {
      'US-001': {
        'org/frontend-app': { issueNumber: 10 },
      },
      'US-003': {
        'org/frontend-app': { issueNumber: 11 },
        'org/backend-api': { issueNumber: 20 },
      },
    };

    // frontend-app works, backend-api returns 404
    setupRepoResponses({
      'org/frontend-app': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US1-01': true, 'AC-US3-01': true }))),
      'org/backend-api': execFailure('Not Found'),
    });

    mockParseIssueBody
      .mockReturnValueOnce(makeParsedBody({ 'AC-US1-01': true, 'AC-US3-01': true }));

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    // US-001 (frontend-only) should still work
    const us001Change = result.changes.find(c => c.field === 'AC-US1-01');
    expect(us001Change).toBeDefined();
    expect(us001Change!.applied).toBe(true);

    // US-003 (shared) — backend failed, so no consensus possible
    const us003Change = result.changes.find(c => c.field === 'AC-US3-01');
    expect(us003Change).toBeUndefined();

    // Error recorded for backend-api
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Not Found');
  });

  // -------------------------------------------------------------------------
  // TC-020: All repos unreachable — no changes, all errors recorded
  // -------------------------------------------------------------------------
  it('should return no changes when all repos are unreachable', async () => {
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-001'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-001'] },
    ];

    const specACs = {
      'US-001': [{ id: 'AC-US1-01', completed: false }],
    };

    const userStoryLinks = {
      'US-001': {
        'org/frontend-app': { issueNumber: 10 },
        'org/backend-api': { issueNumber: 20 },
      },
    };

    setupRepoResponses({
      'org/frontend-app': execFailure('connect ECONNREFUSED'),
      'org/backend-api': execFailure('connect ECONNREFUSED'),
    });

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // TC-021: 3 repos, 2 agree, 1 disagrees → AC stays unchecked
  // -------------------------------------------------------------------------
  it('should not mark AC done when 2/3 repos agree but 1 disagrees', async () => {
    const repos = [
      { owner: 'org', repo: 'frontend-app', relevantStories: ['US-003'] },
      { owner: 'org', repo: 'backend-api', relevantStories: ['US-003'] },
      { owner: 'org', repo: 'shared-lib', relevantStories: ['US-003'] },
    ];

    const specACs = {
      'US-003': [
        { id: 'AC-US3-01', completed: false },
      ],
    };

    const userStoryLinks = {
      'US-003': {
        'org/frontend-app': { issueNumber: 10 },
        'org/backend-api': { issueNumber: 20 },
        'org/shared-lib': { issueNumber: 30 },
      },
    };

    // 2 have it checked, 1 does NOT
    setupRepoResponses({
      'org/frontend-app': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': true }))),
      'org/backend-api': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': true }))),
      'org/shared-lib': execSuccess(JSON.stringify(makeIssueResponse({ 'AC-US3-01': false }))),
    });

    mockParseIssueBody
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': true }))
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': true }))
      .mockReturnValueOnce(makeParsedBody({ 'AC-US3-01': false }));

    const result = await pullSyncMultiRepo(
      repos,
      userStoryLinks,
      specACs,
      { owner: 'org', repo: 'frontend-app' },
    );

    // AC NOT marked done (all-repos-must-agree: 2/3 is not enough)
    const ac01Change = result.changes.find(c => c.field === 'AC-US3-01');
    expect(ac01Change).toBeUndefined();

    // Disagreement recorded
    expect(result.disagreements).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // TC-021b: Empty repos array returns empty result
  // -------------------------------------------------------------------------
  it('should return empty result with empty repos array', async () => {
    const result = await pullSyncMultiRepo(
      [],
      {},
      {},
      { owner: 'org', repo: 'main' },
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });
});
