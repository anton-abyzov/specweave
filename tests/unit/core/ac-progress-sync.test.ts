/**
 * T-004/T-005 [RED]: Core Dispatch + GitHub Delegation Tests
 * T-007 [RED]: JIRA AC Sync Tests
 * T-009 [RED]: ADO AC Sync Tests
 * T-012 [RED]: Circuit Breaker Tests
 *
 * Tests for syncACProgressToProviders() — the provider-agnostic
 * AC progress sync function that routes to GitHub, JIRA, and ADO.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external modules before import
const { mockPostACProgressComments, mockAutoCloseCompletedUserStories } = vi.hoisted(() => ({
  mockPostACProgressComments: vi.fn(),
  mockAutoCloseCompletedUserStories: vi.fn(),
}));

const { mockJiraGetStatus, mockJiraUpdateStatus, mockJiraPostStatusComment } = vi.hoisted(() => ({
  mockJiraGetStatus: vi.fn(),
  mockJiraUpdateStatus: vi.fn(),
  mockJiraPostStatusComment: vi.fn(),
}));

const { mockAdoGetStatus, mockAdoUpdateStatus, mockAdoAddComment } = vi.hoisted(() => ({
  mockAdoGetStatus: vi.fn(),
  mockAdoUpdateStatus: vi.fn(),
  mockAdoAddComment: vi.fn(),
}));

vi.mock('../../../plugins/specweave-github/lib/github-ac-comment-poster.js', () => ({
  postACProgressComments: mockPostACProgressComments,
}));

vi.mock('../../../plugins/specweave-github/lib/github-us-auto-closer.js', () => ({
  autoCloseCompletedUserStories: mockAutoCloseCompletedUserStories,
}));

vi.mock('../../../plugins/specweave-jira/lib/jira-status-sync.js', () => {
  class MockJiraStatusSync {
    getStatus = mockJiraGetStatus;
    updateStatus = mockJiraUpdateStatus;
    postStatusComment = mockJiraPostStatusComment;
  }
  return { JiraStatusSync: MockJiraStatusSync };
});

vi.mock('../../../plugins/specweave-ado/lib/ado-status-sync.js', () => {
  class MockAdoStatusSync {
    getStatus = mockAdoGetStatus;
    updateStatus = mockAdoUpdateStatus;
  }
  return { AdoStatusSync: MockAdoStatusSync };
});

vi.mock('../../../plugins/specweave-ado/lib/ado-client.js', () => {
  class MockAdoClient {
    addComment = mockAdoAddComment;
  }
  return { AdoClient: MockAdoClient };
});

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'fs/promises';
import {
  syncACProgressToProviders,
  buildACProgressContext,
  resetCircuitBreakers,
  type ACProgressSyncConfig,
  type ACProgressSyncResult,
  type ProviderSyncResult,
} from '../../../src/core/ac-progress-sync.js';

// Sample spec.md content for testing
const SAMPLE_SPEC = `---
increment: 0194-provider-agnostic-ac-sync
title: "Provider-Agnostic AC Progress Sync"
status: active
---

# Feature: Provider-Agnostic AC Sync

## User Stories

### US-001: Provider-Agnostic AC Sync Function (P1)

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given sync called, then reads config and processes enabled providers
- [ ] **AC-US1-02**: Given context built from spec.md, then parses AC states per US
- [x] **AC-US1-03**: Given GitHub enabled, delegates to existing 0193 functions

---

### US-002: JIRA AC Sync (P1)

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given JIRA enabled, posts comment via JiraClient
- [ ] **AC-US2-02**: Given ACs synced, updates description with JIRA checkboxes
`;

function makeConfig(overrides: Partial<ACProgressSyncConfig> = {}): ACProgressSyncConfig {
  return {
    sync: {
      github: { enabled: false },
      jira: { enabled: false },
      ado: { enabled: false },
    },
    github: { owner: 'test-owner', repo: 'test-repo' },
    jira: { domain: 'test.atlassian.net', email: 'test@test.com', apiToken: 'jira-token', projectKey: 'TEST' },
    ado: { organization: 'test-org', project: 'test-project', pat: 'ado-token' },
    externalLinks: {
      github: {
        issues: {
          'US-001': { issueNumber: 100, issueUrl: 'https://github.com/test/repo/issues/100', status: 'created' },
          'US-002': { issueNumber: 101, issueUrl: 'https://github.com/test/repo/issues/101', status: 'created' },
        },
      },
      jira: {
        userStories: {
          'US-001': { issueKey: 'TEST-100', issueUrl: 'https://test.atlassian.net/browse/TEST-100', syncedAt: '2026-01-01' },
          'US-002': { issueKey: 'TEST-101', issueUrl: 'https://test.atlassian.net/browse/TEST-101', syncedAt: '2026-01-01' },
        },
      },
      ado: {
        userStories: {
          'US-001': { workItemId: 200, workItemUrl: 'https://dev.azure.com/test/work/200', syncedAt: '2026-01-01' },
          'US-002': { workItemId: 201, workItemUrl: 'https://dev.azure.com/test/work/201', syncedAt: '2026-01-01' },
        },
      },
    },
    ...overrides,
  };
}

describe('syncACProgressToProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreakers();
    vi.mocked(readFile).mockResolvedValue(SAMPLE_SPEC);
    mockPostACProgressComments.mockResolvedValue({ posted: [], errors: [] });
    mockAutoCloseCompletedUserStories.mockResolvedValue({ closed: [], skipped: [], errors: [] });
    mockJiraUpdateStatus.mockResolvedValue(true);
    mockJiraPostStatusComment.mockResolvedValue(undefined);
    mockJiraGetStatus.mockResolvedValue({ state: 'In Progress' });
    mockAdoUpdateStatus.mockResolvedValue(undefined);
    mockAdoGetStatus.mockResolvedValue({ state: 'Active' });
    mockAdoAddComment.mockResolvedValue({ id: 1, text: 'comment' });
  });

  // T-004: Core dispatch tests
  describe('provider dispatch', () => {
    it('executes only enabled providers', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: false }, ado: { enabled: false } },
      });

      const result = await syncACProgressToProviders(
        '0194', ['US-001'], '/fake/spec.md', config,
      );

      expect(result.github).toBeDefined();
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });

    it('executes all 3 providers when all enabled', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: true }, ado: { enabled: true } },
      });

      const result = await syncACProgressToProviders(
        '0194', ['US-001'], '/fake/spec.md', config,
      );

      expect(result.github).toBeDefined();
      expect(result.jira).toBeDefined();
      expect(result.ado).toBeDefined();
    });

    it('isolates errors — one provider failure does not block others', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: true }, ado: { enabled: true } },
      });

      // GitHub throws
      mockPostACProgressComments.mockRejectedValue(new Error('GitHub API down'));

      const result = await syncACProgressToProviders(
        '0194', ['US-001'], '/fake/spec.md', config,
      );

      // GitHub has error
      expect(result.github?.errors).toHaveLength(1);
      expect(result.github?.errors[0].error).toContain('GitHub API down');

      // JIRA and ADO still executed
      expect(result.jira).toBeDefined();
      expect(result.ado).toBeDefined();
    });

    it('returns empty result when no providers enabled', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: false } },
      });

      const result = await syncACProgressToProviders(
        '0194', ['US-001'], '/fake/spec.md', config,
      );

      expect(result.github).toBeUndefined();
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });

    it('returns empty result for empty affectedUSIds', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: true }, ado: { enabled: true } },
      });

      const result = await syncACProgressToProviders(
        '0194', [], '/fake/spec.md', config,
      );

      expect(result.github).toBeUndefined();
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });
  });

  // T-005: GitHub delegation tests
  describe('GitHub delegation', () => {
    it('delegates to postACProgressComments with correct args', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: false }, ado: { enabled: false } },
      });

      mockPostACProgressComments.mockResolvedValue({
        posted: [{ usId: 'US-001', issueNumber: 100 }],
        errors: [],
      });

      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(mockPostACProgressComments).toHaveBeenCalledWith(
        '0194',
        ['US-001'],
        '/fake/spec.md',
        expect.objectContaining({ owner: 'test-owner', repo: 'test-repo' }),
      );
    });

    it('delegates to autoCloseCompletedUserStories', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: false }, ado: { enabled: false } },
      });

      mockAutoCloseCompletedUserStories.mockResolvedValue({
        closed: [{ usId: 'US-001', issueNumber: 100 }],
        skipped: [],
        errors: [],
      });

      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(mockAutoCloseCompletedUserStories).toHaveBeenCalledWith(
        '0194',
        ['US-001'],
        '/fake/spec.md',
        expect.objectContaining({ owner: 'test-owner', repo: 'test-repo' }),
      );
    });

    it('aggregates GitHub results into result.github', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: false }, ado: { enabled: false } },
      });

      mockPostACProgressComments.mockResolvedValue({
        posted: [{ usId: 'US-001', issueNumber: 100 }],
        errors: [],
      });
      mockAutoCloseCompletedUserStories.mockResolvedValue({
        closed: [{ usId: 'US-001', issueNumber: 100 }],
        skipped: [],
        errors: [],
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.github?.posted).toHaveLength(1);
      expect(result.github?.posted[0]).toEqual({ usId: 'US-001', ref: '100' });
      expect(result.github?.closed).toHaveLength(1);
    });
  });

  // T-007: JIRA AC sync tests
  describe('JIRA provider', () => {
    it('posts comment with JIRA markup for enabled JIRA with issue links', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.jira).toBeDefined();
      expect(result.jira?.posted).toBeDefined();
      // Verify JIRA-specific comment was posted
      expect(mockJiraPostStatusComment).toHaveBeenCalled();
    });

    it('transitions to Done when all ACs complete for a US', async () => {
      // Spec where US-001 has all ACs complete
      const allCompleteSpec = SAMPLE_SPEC
        .replace('[ ] **AC-US1-02**', '[x] **AC-US1-02**');
      vi.mocked(readFile).mockResolvedValue(allCompleteSpec);

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(mockJiraUpdateStatus).toHaveBeenCalledWith(
        'TEST-100',
        expect.objectContaining({ state: 'Done' }),
      );
    });

    it('skips transition when issue already in done status', async () => {
      const allCompleteSpec = SAMPLE_SPEC
        .replace('[ ] **AC-US1-02**', '[x] **AC-US1-02**');
      vi.mocked(readFile).mockResolvedValue(allCompleteSpec);
      mockJiraUpdateStatus.mockResolvedValue(false); // transition not available = already done

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.jira?.skipped?.some(s => s.reason === 'already-closed')).toBe(true);
    });

    it('records JIRA API errors non-blocking', async () => {
      mockJiraPostStatusComment.mockRejectedValue(new Error('429 Too Many Requests'));

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.jira?.errors).toBeDefined();
      expect(result.jira!.errors.length).toBeGreaterThan(0);
      expect(result.jira!.errors[0].error).toContain('429');
    });

    it('skips US with no JIRA issue link', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
        externalLinks: {
          ...makeConfig().externalLinks,
          jira: { userStories: {} }, // No JIRA links
        },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.jira?.skipped?.some(s => s.reason === 'no-issue-link')).toBe(true);
    });
  });

  // T-009: ADO AC sync tests
  describe('ADO provider', () => {
    it('posts comment with HTML checkboxes for enabled ADO with work item links', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.ado).toBeDefined();
      expect(result.ado?.posted).toBeDefined();
      expect(mockAdoAddComment).toHaveBeenCalled();
    });

    it('transitions to Closed when all ACs complete for a US', async () => {
      const allCompleteSpec = SAMPLE_SPEC
        .replace('[ ] **AC-US1-02**', '[x] **AC-US1-02**');
      vi.mocked(readFile).mockResolvedValue(allCompleteSpec);

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
      });

      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(mockAdoUpdateStatus).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ state: 'Closed' }),
      );
    });

    it('skips transition when work item already closed', async () => {
      const allCompleteSpec = SAMPLE_SPEC
        .replace('[ ] **AC-US1-02**', '[x] **AC-US1-02**');
      vi.mocked(readFile).mockResolvedValue(allCompleteSpec);
      mockAdoGetStatus.mockResolvedValue({ state: 'Closed' });

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.ado?.skipped?.some(s => s.reason === 'already-closed')).toBe(true);
      expect(mockAdoUpdateStatus).not.toHaveBeenCalled();
    });

    it('records ADO API errors non-blocking', async () => {
      mockAdoAddComment.mockRejectedValue(new Error('ADO auth failed'));

      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.ado?.errors).toBeDefined();
      expect(result.ado!.errors.length).toBeGreaterThan(0);
      expect(result.ado!.errors[0].error).toContain('ADO auth failed');
    });

    it('skips US with no ADO work item link', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
        externalLinks: {
          ...makeConfig().externalLinks,
          ado: { userStories: {} }, // No ADO links
        },
      });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.ado?.skipped?.some(s => s.reason === 'no-issue-link')).toBe(true);
    });
  });

  // T-012: Circuit breaker tests
  describe('circuit breaker integration', () => {
    it('skips provider when circuit breaker is open (3 consecutive failures)', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      // Simulate 3 consecutive JIRA failures to trip the breaker
      mockJiraPostStatusComment.mockRejectedValue(new Error('JIRA down'));

      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      // 4th call should be skipped by circuit breaker
      mockJiraPostStatusComment.mockClear();
      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      expect(result.jira?.skipped).toBeDefined();
      expect(result.jira?.skipped.some(s => s.reason === 'circuit-open')).toBe(true);
      expect(mockJiraPostStatusComment).not.toHaveBeenCalled();
    });

    it('allows provider after circuit breaker resets (half-open after 5 min)', async () => {
      const config = makeConfig({
        sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      });

      // Trip the breaker with 3 failures
      mockJiraPostStatusComment.mockRejectedValue(new Error('JIRA down'));
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      // Advance time by 5+ minutes
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Now JIRA recovers
      mockJiraPostStatusComment.mockResolvedValue(undefined);

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      // Should have attempted JIRA (half-open allows one attempt)
      expect(mockJiraPostStatusComment).toHaveBeenCalled();
      expect(result.jira?.posted).toBeDefined();

      vi.useRealTimers();
    });

    it('keeps independent circuit breakers per provider (JIRA open, GitHub closed)', async () => {
      const config = makeConfig({
        sync: { github: { enabled: true }, jira: { enabled: true }, ado: { enabled: false } },
      });

      // Trip JIRA breaker with 3 failures
      mockJiraPostStatusComment.mockRejectedValue(new Error('JIRA down'));
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);
      await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      // GitHub still works, JIRA circuit should be open
      mockPostACProgressComments.mockResolvedValue({ posted: [{ usId: 'US-001', issueNumber: 100 }], errors: [] });
      mockAutoCloseCompletedUserStories.mockResolvedValue({ closed: [], skipped: [], errors: [] });

      const result = await syncACProgressToProviders('0194', ['US-001'], '/fake/spec.md', config);

      // GitHub should still execute
      expect(result.github?.posted).toBeDefined();
      expect(mockPostACProgressComments).toHaveBeenCalled();

      // JIRA should be blocked by circuit breaker
      expect(result.jira?.skipped?.some(s => s.reason === 'circuit-open')).toBe(true);
    });
  });
});

describe('buildACProgressContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readFile).mockResolvedValue(SAMPLE_SPEC);
  });

  it('parses AC states from spec.md for affected user stories', async () => {
    const ctx = await buildACProgressContext('/fake/spec.md', ['US-001']);

    expect(ctx.userStories.get('US-001')).toBeDefined();
    const us1 = ctx.userStories.get('US-001')!;
    expect(us1.acStates).toHaveLength(3);
    expect(us1.acStates[0]).toEqual({
      id: 'AC-US1-01',
      description: expect.stringContaining('reads config'),
      completed: true,
    });
    expect(us1.acStates[1]).toEqual({
      id: 'AC-US1-02',
      description: expect.stringContaining('parses AC states'),
      completed: false,
    });
  });

  it('parses AC states for multiple user stories', async () => {
    const ctx = await buildACProgressContext('/fake/spec.md', ['US-001', 'US-002']);

    expect(ctx.userStories.size).toBe(2);
    expect(ctx.userStories.get('US-001')?.acStates).toHaveLength(3);
    expect(ctx.userStories.get('US-002')?.acStates).toHaveLength(2);
  });

  it('returns empty map for non-existent user stories', async () => {
    const ctx = await buildACProgressContext('/fake/spec.md', ['US-999']);

    expect(ctx.userStories.get('US-999')?.acStates).toHaveLength(0);
  });
});
