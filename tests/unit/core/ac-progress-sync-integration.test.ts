/**
 * T-017/T-018: Multi-Provider Integration Tests
 *
 * Integration tests verifying syncACProgressToProviders works correctly
 * across multiple providers simultaneously with realistic config shapes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external modules before import
const { mockPostACProgressComments, mockAutoCloseCompletedUserStories } = vi.hoisted(() => ({
  mockPostACProgressComments: vi.fn(),
  mockAutoCloseCompletedUserStories: vi.fn(),
}));

const { mockJiraUpdateStatus, mockJiraPostStatusComment } = vi.hoisted(() => ({
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
    updateStatus = mockJiraUpdateStatus;
    postProgressComment = mockJiraPostStatusComment;
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
  resetCircuitBreakers,
  type ACProgressSyncConfig,
} from '../../../src/core/ac-progress-sync.js';

// Realistic spec.md with multiple user stories and mixed AC states
const REALISTIC_SPEC = `---
increment: 0194-provider-agnostic-ac-sync
title: "Provider-Agnostic AC Progress Sync"
status: active
---

# Feature: Provider-Agnostic AC Sync

## User Stories

### US-001: Provider-Agnostic AC Sync Function (P1)

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given sync called, processes enabled providers
- [x] **AC-US1-02**: Given context built, parses AC states per US
- [x] **AC-US1-03**: Given GitHub enabled, delegates to existing functions
- [x] **AC-US1-04**: Given provider throws, error isolated per provider
- [x] **AC-US1-05**: Given no providers enabled, returns empty result
- [x] **AC-US1-06**: Given AC states, formats provider-specific checkboxes

---

### US-002: JIRA AC Sync (P1)

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given JIRA enabled, posts comment via JiraClient
- [x] **AC-US2-02**: Given ACs synced, uses JIRA markup checkboxes
- [ ] **AC-US2-03**: Given all ACs complete, transitions to Done
- [ ] **AC-US2-04**: Given JIRA API error, records non-blocking
- [x] **AC-US2-05**: Given circuit breaker open, skips JIRA

---

### US-003: ADO AC Sync (P1)

**Acceptance Criteria**:
- [x] **AC-US3-01**: Given ADO enabled, posts comment via AdoClient
- [ ] **AC-US3-02**: Given ACs synced, uses HTML checkboxes
`;

describe('multi-provider integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreakers();
    vi.mocked(readFile).mockResolvedValue(REALISTIC_SPEC);

    // GitHub defaults
    mockPostACProgressComments.mockResolvedValue({
      posted: [{ usId: 'US-001', issueNumber: 100 }],
      errors: [],
    });
    mockAutoCloseCompletedUserStories.mockResolvedValue({
      closed: [{ usId: 'US-001', issueNumber: 100 }],
      skipped: [],
      errors: [],
    });

    // JIRA defaults
    mockJiraUpdateStatus.mockResolvedValue(true);
    mockJiraPostStatusComment.mockResolvedValue(undefined);

    // ADO defaults
    mockAdoGetStatus.mockResolvedValue({ state: 'Active' });
    mockAdoUpdateStatus.mockResolvedValue(undefined);
    mockAdoAddComment.mockResolvedValue({ id: 1, text: 'comment' });
  });

  it('syncs to all 3 providers simultaneously with mixed AC states', async () => {
    const config: ACProgressSyncConfig = {
      sync: {
        github: { enabled: true },
        jira: { enabled: true },
        ado: { enabled: true },
      },
      github: { owner: 'test-owner', repo: 'test-repo' },
      jira: { domain: 'test.atlassian.net', email: 'test@example.com', apiToken: 'mock', projectKey: 'TEST' },
      ado: { organization: 'test-org', project: 'test-proj', pat: 'ado-pat' },
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 100, issueUrl: 'https://github.com/o/r/100', status: 'open' },
            'US-002': { issueNumber: 101, issueUrl: 'https://github.com/o/r/101', status: 'open' },
          },
        },
        jira: {
          userStories: {
            'US-001': { issueKey: 'TEST-100', issueUrl: 'https://jira/TEST-100', syncedAt: '' },
            'US-002': { issueKey: 'TEST-101', issueUrl: 'https://jira/TEST-101', syncedAt: '' },
          },
        },
        ado: {
          userStories: {
            'US-001': { workItemId: 200, workItemUrl: 'https://ado/200', syncedAt: '' },
            'US-003': { workItemId: 202, workItemUrl: 'https://ado/202', syncedAt: '' },
          },
        },
      },
    };

    const result = await syncACProgressToProviders(
      '0194', ['US-001', 'US-002', 'US-003'], '/fake/spec.md', config,
    );

    // All 3 providers should have results
    expect(result.github).toBeDefined();
    expect(result.jira).toBeDefined();
    expect(result.ado).toBeDefined();

    // GitHub: delegates to existing modules
    expect(mockPostACProgressComments).toHaveBeenCalledOnce();
    expect(mockAutoCloseCompletedUserStories).toHaveBeenCalledOnce();

    // JIRA: US-001 and US-002 have links, but not US-003
    expect(mockJiraPostStatusComment).toHaveBeenCalledTimes(2);

    // ADO: US-001 and US-003 have links, but not US-002
    expect(mockAdoAddComment).toHaveBeenCalledTimes(2);
    expect(result.ado!.skipped.some(s => s.usId === 'US-002' && s.reason === 'no-issue-link')).toBe(true);
  });

  it('GitHub auto-closes when all ACs complete for US-001', async () => {
    const config: ACProgressSyncConfig = {
      sync: {
        github: { enabled: true },
        jira: { enabled: false },
        ado: { enabled: false },
      },
      github: { owner: 'o', repo: 'r' },
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 100, issueUrl: 'https://github.com/o/r/100' },
          },
        },
      },
    };

    // US-001 has all 6 ACs checked in REALISTIC_SPEC
    mockAutoCloseCompletedUserStories.mockResolvedValue({
      closed: [{ usId: 'US-001', issueNumber: 100 }],
      skipped: [],
      errors: [],
    });

    const result = await syncACProgressToProviders(
      '0194', ['US-001'], '/fake/spec.md', config,
    );

    expect(result.github!.closed).toHaveLength(1);
    expect(result.github!.closed[0].usId).toBe('US-001');
  });

  it('JIRA transitions to Done when all ACs complete for a US', async () => {
    // Use spec where US-002 has ALL ACs complete
    const allDoneSpec = REALISTIC_SPEC
      .replace('[ ] **AC-US2-03**', '[x] **AC-US2-03**')
      .replace('[ ] **AC-US2-04**', '[x] **AC-US2-04**');
    vi.mocked(readFile).mockResolvedValue(allDoneSpec);

    const config: ACProgressSyncConfig = {
      sync: { github: { enabled: false }, jira: { enabled: true }, ado: { enabled: false } },
      jira: { domain: 'x', email: 'x', apiToken: 'x', projectKey: 'T' },
      externalLinks: {
        jira: {
          userStories: {
            'US-002': { issueKey: 'T-101', issueUrl: '', syncedAt: '' },
          },
        },
      },
    };

    const result = await syncACProgressToProviders(
      '0194', ['US-002'], '/fake/spec.md', config,
    );

    // Should transition to Done
    expect(mockJiraUpdateStatus).toHaveBeenCalledWith('T-101', { state: 'Done' });
    expect(result.jira!.closed).toHaveLength(1);
  });

  it('ADO transitions to Closed when all ACs complete for a US', async () => {
    // US-001 already has all 6 ACs complete in REALISTIC_SPEC
    const config: ACProgressSyncConfig = {
      sync: { github: { enabled: false }, jira: { enabled: false }, ado: { enabled: true } },
      ado: { organization: 'o', project: 'p', pat: 'pat' },
      externalLinks: {
        ado: {
          userStories: {
            'US-001': { workItemId: 200, workItemUrl: '', syncedAt: '' },
          },
        },
      },
    };

    const result = await syncACProgressToProviders(
      '0194', ['US-001'], '/fake/spec.md', config,
    );

    expect(mockAdoUpdateStatus).toHaveBeenCalledWith(200, { state: 'Closed' });
    expect(result.ado!.closed).toHaveLength(1);
  });

  it('mixed provider failures do not affect healthy providers', async () => {
    mockJiraPostStatusComment.mockRejectedValue(new Error('JIRA 500'));
    mockAdoAddComment.mockRejectedValue(new Error('ADO timeout'));

    const config: ACProgressSyncConfig = {
      sync: { github: { enabled: true }, jira: { enabled: true }, ado: { enabled: true } },
      github: { owner: 'o', repo: 'r' },
      jira: { domain: 'x', email: 'x', apiToken: 'x', projectKey: 'T' },
      ado: { organization: 'o', project: 'p', pat: 'pat' },
      externalLinks: {
        github: {
          issues: { 'US-001': { issueNumber: 100, issueUrl: '' } },
        },
        jira: {
          userStories: { 'US-001': { issueKey: 'T-1', issueUrl: '', syncedAt: '' } },
        },
        ado: {
          userStories: { 'US-001': { workItemId: 1, workItemUrl: '', syncedAt: '' } },
        },
      },
    };

    const result = await syncACProgressToProviders(
      '0194', ['US-001'], '/fake/spec.md', config,
    );

    // GitHub succeeded
    expect(result.github!.posted).toBeDefined();
    expect(result.github!.errors).toHaveLength(0);

    // JIRA had errors
    expect(result.jira!.errors.length).toBeGreaterThan(0);
    expect(result.jira!.errors[0].error).toContain('JIRA 500');

    // ADO had errors
    expect(result.ado!.errors.length).toBeGreaterThan(0);
    expect(result.ado!.errors[0].error).toContain('ADO timeout');
  });
});
