/**
 * Unit tests for pushSyncUserStories (RED phase - TDD)
 *
 * Tests the push-sync function that creates/updates GitHub issues
 * from SpecWeave user stories via the `gh` CLI.
 *
 * Expected module: plugins/specweave-github/lib/github-push-sync.ts (does NOT exist yet)
 *
 * @see T-006: Push Sync implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

const mockGenerateIssueBody = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-issue-body-generator.js', () => ({
  generateIssueBody: mockGenerateIssueBody,
}));

// RED phase import — module does not exist yet
import {
  pushSyncUserStories,
  type PushSyncOptions,
  type PushSyncResult,
  type UserStoryForSync,
} from '../../../../plugins/specweave-github/lib/github-push-sync.js';

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

/** Build a default user story fixture */
function makeUserStory(overrides: Partial<UserStoryForSync> = {}): UserStoryForSync {
  return {
    id: 'US-001',
    title: 'User authentication',
    description: 'Users should be able to log in with email and password.',
    priority: 'P1',
    status: 'in-progress',
    acceptanceCriteria: [
      { id: 'AC-US1-01', description: 'User can log in with valid credentials', completed: false },
      { id: 'AC-US1-02', description: 'User sees error on invalid credentials', completed: false },
    ],
    specId: 'spec-001',
    ...overrides,
  };
}

/** Default push-sync options */
function makeOptions(overrides: Partial<PushSyncOptions> = {}): PushSyncOptions {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pushSyncUserStories', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: generateIssueBody returns a predictable body
    mockGenerateIssueBody.mockReturnValue(
      '## Description\n\nUsers should be able to log in.\n\n**Priority**: P1\n\n<!-- specweave:sync spec=spec-001 us=US-001 -->'
    );
  });

  // -------------------------------------------------------------------------
  // 1. Creates issue when no existing issue found
  // -------------------------------------------------------------------------
  it('should create a new issue when no existing issue is found by [US-XXX] prefix', async () => {
    // Search returns empty (no existing issue)
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess('[]')
    );

    // Create returns new issue
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
        node_id: 'I_kwDOTest42',
      }))
    );

    const stories = [makeUserStory()];
    const result = await pushSyncUserStories(stories, makeOptions());

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toEqual({
      userStoryId: 'US-001',
      issueNumber: 42,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
      issueNodeId: 'I_kwDOTest42',
    });
    expect(result.updated).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 2. Updates existing issue when found by [US-XXX] prefix
  // -------------------------------------------------------------------------
  it('should update an existing issue when found by [US-XXX] prefix search', async () => {
    // Search returns existing issue
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify([
        {
          number: 17,
          title: '[US-001] User authentication',
          node_id: 'I_kwDOTestOld17',
        },
      ]))
    );

    // Update returns success
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 17,
        url: 'https://github.com/test-owner/test-repo/issues/17',
      }))
    );

    const stories = [makeUserStory()];
    const result = await pushSyncUserStories(stories, makeOptions());

    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toEqual({
      userStoryId: 'US-001',
      issueNumber: 17,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/17',
    });
    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 3. Returns issueNumber and issueUrl from gh output
  // -------------------------------------------------------------------------
  it('should return issueNumber and issueUrl parsed from gh CLI output', async () => {
    // Search: no match
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));

    // Create: returns issue data with specific number and URL
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 99,
        url: 'https://github.com/test-owner/test-repo/issues/99',
        node_id: 'I_kwDOTest99',
      }))
    );

    const stories = [makeUserStory({ id: 'US-055' })];
    const result = await pushSyncUserStories(stories, makeOptions());

    expect(result.created[0].issueNumber).toBe(99);
    expect(result.created[0].issueUrl).toBe('https://github.com/test-owner/test-repo/issues/99');
    expect(result.created[0].issueNodeId).toBe('I_kwDOTest99');
  });

  // -------------------------------------------------------------------------
  // 4. Applies labels: user-story, spec:<specId>, priority:<priority>
  // -------------------------------------------------------------------------
  it('should apply user-story, spec, and priority labels when creating an issue', async () => {
    // Search: no match
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));

    // Create: capture the args
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 10,
        url: 'https://github.com/test-owner/test-repo/issues/10',
        node_id: 'I_kwDOTest10',
      }))
    );

    const stories = [makeUserStory({ specId: 'spec-042', priority: 'P2' })];
    await pushSyncUserStories(stories, makeOptions());

    // Find the `gh issue create` call (second call after the search)
    const createCall = mockExecFileNoThrow.mock.calls[1];
    const createArgs = createCall[1] as string[];

    // Should contain label flags
    expect(createArgs).toContain('--label');
    expect(createArgs).toContain('user-story');
    expect(createArgs).toContain('spec:spec-042');
    expect(createArgs).toContain('priority:P2');
  });

  // -------------------------------------------------------------------------
  // 5. Handles multiple user stories (creates 2 issues)
  // -------------------------------------------------------------------------
  it('should handle multiple user stories and create issues for each', async () => {
    const story1 = makeUserStory({ id: 'US-001', title: 'Auth' });
    const story2 = makeUserStory({ id: 'US-002', title: 'Dashboard', specId: 'spec-002' });

    // US-001: search empty, create
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 1,
        url: 'https://github.com/test-owner/test-repo/issues/1',
        node_id: 'I_kwDOTest1',
      }))
    );

    // US-002: search empty, create
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 2,
        url: 'https://github.com/test-owner/test-repo/issues/2',
        node_id: 'I_kwDOTest2',
      }))
    );

    const result = await pushSyncUserStories([story1, story2], makeOptions());

    expect(result.created).toHaveLength(2);
    expect(result.created[0].userStoryId).toBe('US-001');
    expect(result.created[0].issueNumber).toBe(1);
    expect(result.created[1].userStoryId).toBe('US-002');
    expect(result.created[1].issueNumber).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 6. Idempotent: second sync updates instead of creating duplicates
  // -------------------------------------------------------------------------
  it('should be idempotent: second sync updates existing issue instead of creating duplicate', async () => {
    const story = makeUserStory({ id: 'US-010', title: 'Idempotent feature' });

    // First sync: search empty, create
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 50,
        url: 'https://github.com/test-owner/test-repo/issues/50',
        node_id: 'I_kwDOTest50',
      }))
    );

    const firstResult = await pushSyncUserStories([story], makeOptions());
    expect(firstResult.created).toHaveLength(1);
    expect(firstResult.created[0].issueNumber).toBe(50);

    vi.clearAllMocks();
    mockGenerateIssueBody.mockReturnValue('## Description\n\nUpdated body.');

    // Second sync: search finds existing issue #50, update
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify([
        {
          number: 50,
          title: '[US-010] Idempotent feature',
          node_id: 'I_kwDOTest50',
        },
      ]))
    );
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 50,
        url: 'https://github.com/test-owner/test-repo/issues/50',
      }))
    );

    const secondResult = await pushSyncUserStories([story], makeOptions());
    expect(secondResult.updated).toHaveLength(1);
    expect(secondResult.updated[0].issueNumber).toBe(50);
    expect(secondResult.created).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 7. Returns errors array when gh issue create fails
  // -------------------------------------------------------------------------
  it('should return errors array when gh issue create fails', async () => {
    // Search: no match
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));

    // Create: fails
    mockExecFileNoThrow.mockResolvedValueOnce(
      execFailure('HTTP 422: Validation Failed')
    );

    const stories = [makeUserStory({ id: 'US-ERR' })];
    const result = await pushSyncUserStories(stories, makeOptions());

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].userStoryId).toBe('US-ERR');
    expect(result.errors[0].error).toContain('422');
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 8. Dry run mode: no actual gh commands executed
  // -------------------------------------------------------------------------
  it('should not execute any gh commands in dry run mode', async () => {
    const stories = [
      makeUserStory({ id: 'US-DRY1' }),
      makeUserStory({ id: 'US-DRY2' }),
    ];

    const result = await pushSyncUserStories(stories, makeOptions({ dryRun: true }));

    // No gh CLI calls should have been made
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();

    // Result should still report the stories (but nothing created/updated)
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 9. Issue title format: [US-001] User Story Title
  // -------------------------------------------------------------------------
  it('should format issue title as [US-XXX] followed by user story title', async () => {
    // Search: no match
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));

    // Create
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 77,
        url: 'https://github.com/test-owner/test-repo/issues/77',
        node_id: 'I_kwDOTest77',
      }))
    );

    const stories = [makeUserStory({ id: 'US-003', title: 'Payment processing' })];
    await pushSyncUserStories(stories, makeOptions());

    // Find the create call
    const createCall = mockExecFileNoThrow.mock.calls[1];
    const createArgs = createCall[1] as string[];

    // The --title argument should contain the formatted title
    const titleIdx = createArgs.indexOf('--title');
    expect(titleIdx).toBeGreaterThan(-1);
    expect(createArgs[titleIdx + 1]).toBe('[US-003] Payment processing');
  });

  // -------------------------------------------------------------------------
  // Search call format verification
  // -------------------------------------------------------------------------
  it('should search for existing issues using gh issue list with [US-XXX] prefix', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 1,
        url: 'https://github.com/test-owner/test-repo/issues/1',
        node_id: 'I_kwDOTest1',
      }))
    );

    await pushSyncUserStories(
      [makeUserStory({ id: 'US-042' })],
      makeOptions({ owner: 'myorg', repo: 'myrepo' })
    );

    // First call should be the search
    const searchCall = mockExecFileNoThrow.mock.calls[0];
    expect(searchCall[0]).toBe('gh');
    const searchArgs = searchCall[1] as string[];
    expect(searchArgs).toContain('issue');
    expect(searchArgs).toContain('list');
    expect(searchArgs).toContain('--search');

    // Should search for the US ID prefix
    const searchIdx = searchArgs.indexOf('--search');
    expect(searchArgs[searchIdx + 1]).toContain('[US-042]');

    // Should target the correct repo
    expect(searchArgs).toContain('--repo');
    const repoIdx = searchArgs.indexOf('--repo');
    expect(searchArgs[repoIdx + 1]).toBe('myorg/myrepo');

    // Should request JSON output with needed fields
    expect(searchArgs).toContain('--json');
  });

  // -------------------------------------------------------------------------
  // Token passthrough
  // -------------------------------------------------------------------------
  it('should pass token to gh commands via environment when provided', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 1,
        url: 'https://github.com/test-owner/test-repo/issues/1',
        node_id: 'I_kwDOTest1',
      }))
    );

    await pushSyncUserStories(
      [makeUserStory()],
      makeOptions({ token: 'ghp_secret_token_123' })
    );

    // Both calls (search + create) should have GH_TOKEN in env
    for (const call of mockExecFileNoThrow.mock.calls) {
      const opts = call[2] as { env?: NodeJS.ProcessEnv };
      expect(opts.env).toBeDefined();
      expect(opts.env!.GH_TOKEN).toBe('ghp_secret_token_123');
    }
  });

  // -------------------------------------------------------------------------
  // Body generation
  // -------------------------------------------------------------------------
  it('should pass user story to generateIssueBody for creating the issue body', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('[]'));
    mockExecFileNoThrow.mockResolvedValueOnce(
      execSuccess(JSON.stringify({
        number: 5,
        url: 'https://github.com/test-owner/test-repo/issues/5',
        node_id: 'I_kwDOTest5',
      }))
    );

    const story = makeUserStory({ id: 'US-BODY', title: 'Body test' });
    await pushSyncUserStories([story], makeOptions());

    // generateIssueBody should have been called with the user story data
    expect(mockGenerateIssueBody).toHaveBeenCalledTimes(1);
    expect(mockGenerateIssueBody).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'US-BODY',
        title: 'Body test',
      })
    );
  });
});
