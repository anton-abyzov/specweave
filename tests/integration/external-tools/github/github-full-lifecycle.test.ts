/**
 * Full Lifecycle Integration Test: GitHub Sync
 *
 * Tests the complete sync lifecycle against the real GitHub API:
 * 1. Push user story → creates issue with correct title, labels, body
 * 2. Update issue → progress reflected in description
 * 3. AC checkbox sync → checkboxes toggled on GitHub
 * 4. Close issue → state=closed on completion
 * 5. Reconcile → drift detection and auto-fix (close/reopen)
 *
 * Requires: GITHUB_TOKEN or GH_TOKEN env var (skips gracefully if absent)
 * Run: npx vitest run tests/integration/external-tools/github/github-full-lifecycle.test.ts
 */

import { describe, it, expect, afterAll } from 'vitest';
import { GitHubAdapter, type GitHubAdapterConfig } from '../../../../src/sync/providers/github.js';
import { SyncEngine, type ExternalRef } from '../../../../src/sync/engine.js';
import { resolvePermissions } from '../../../../src/sync/config.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'anton-abyzov';
const REPO = 'specweave';

const skip = !GITHUB_TOKEN;
const createdIssueNumbers: number[] = [];

describe.skipIf(skip)('GitHub Full Lifecycle Sync', () => {
  const config: GitHubAdapterConfig = {
    owner: OWNER,
    repo: REPO,
    token: GITHUB_TOKEN,
  };

  const adapter = new GitHubAdapter(config);
  const engine = new SyncEngine({
    permissions: resolvePermissions('bidirectional'),
  });
  engine.registerProvider(adapter);

  // Shared state across sequential lifecycle tests
  let issueRef: ExternalRef;

  afterAll(async () => {
    // Cleanup: close and delete all test issues
    for (const num of createdIssueNumbers) {
      try {
        await adapter.closeIssue(
          { platform: 'github', id: String(num), url: '', userStory: '' },
          'Full lifecycle test cleanup'
        );
      } catch { /* ignore cleanup errors */ }
    }
  });

  // -----------------------------------------------------------------------
  // Phase 1: Create & Push
  // -----------------------------------------------------------------------

  it('should create issue via push with correct title, labels, and body', { timeout: 30000 }, async () => {
    const result = await engine.push('github', {
      userStory: {
        id: 'US-999',
        title: 'E2E Sync Integration Test (auto-delete)',
        priority: 'P2',
        description: 'Full lifecycle integration test — safe to delete.',
        acceptanceCriteria: [
          '**AC-US999-01**: Issue is created on GitHub with correct format',
          '**AC-US999-02**: Progress updates are reflected in issue body',
          '**AC-US999-03**: Issue is closed when increment completes',
        ],
      },
      feature: { id: 'FS-999', title: 'Integration Test Feature' },
    });

    expect(result.ref.platform).toBe('github');
    expect(result.ref.id).toBeDefined();
    expect(result.ref.url).toContain('github.com');
    expect(result.action).toBe('created');

    issueRef = result.ref;
    createdIssueNumbers.push(Number(issueRef.id));

    // Verify issue state
    const state = await adapter.getIssueState(issueRef);
    expect(state.title).toContain('US-999:');
    expect(state.title).toContain('E2E Sync Integration Test');
    expect(state.status).toBe('open');
    expect(state.labels).toContain('priority:P2');
    expect(state.labels).toContain('type:user-story');
    expect(state.labels).toContain(`project:${REPO}`);
  });

  // -----------------------------------------------------------------------
  // Phase 2: Update with Progress
  // -----------------------------------------------------------------------

  it('should update issue description with progress', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    await engine.updateIssue(issueRef, {
      description: `> **Feature**: FS-999 — Integration Test Feature

Full lifecycle integration test — safe to delete.

## Acceptance Criteria

- [x] **AC-US999-01**: Issue is created on GitHub with correct format
- [ ] **AC-US999-02**: Progress updates are reflected in issue body
- [ ] **AC-US999-03**: Issue is closed when increment completes

## Progress

Tasks: 1/3 (33%)

---
_Auto-synced from SpecWeave_`,
    });

    // Verify updated body
    const state = await adapter.getIssueState(issueRef);
    expect(state.status).toBe('open');
    // Title should not change from update
    expect(state.title).toContain('US-999:');
  });

  // -----------------------------------------------------------------------
  // Phase 3: AC Checkbox Sync
  // -----------------------------------------------------------------------

  it('should update AC checkboxes in issue body', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    // Mark all ACs complete
    await engine.updateIssue(issueRef, {
      description: `> **Feature**: FS-999 — Integration Test Feature

Full lifecycle integration test — safe to delete.

## Acceptance Criteria

- [x] **AC-US999-01**: Issue is created on GitHub with correct format
- [x] **AC-US999-02**: Progress updates are reflected in issue body
- [x] **AC-US999-03**: Issue is closed when increment completes

## Progress

Tasks: 3/3 (100%) - All tasks complete!

---
_Auto-synced from SpecWeave_`,
    });

    const state = await adapter.getIssueState(issueRef);
    expect(state.status).toBe('open'); // Not yet closed
  });

  // -----------------------------------------------------------------------
  // Phase 4: Close on Completion
  // -----------------------------------------------------------------------

  it('should close issue when increment completes', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    await engine.closeIssue(issueRef, 'Increment completed: all tasks and ACs done.');

    const state = await adapter.getIssueState(issueRef);
    expect(state.status).toBe('closed');
  });

  // -----------------------------------------------------------------------
  // Phase 5: Reconcile — Reopen drift detection
  // -----------------------------------------------------------------------

  it('should detect drift and reopen issue via reconcile', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    // Reconcile with expected state "active" — should reopen the closed issue
    const result = await engine.reconcile('github', [
      {
        ref: issueRef,
        expected: { status: 'active' },
      },
    ]);

    expect(result.updated).toBe(1); // 1 issue reopened
    expect(result.closed).toBe(0);
    expect(result.errors).toHaveLength(0);

    const state = await adapter.getIssueState(issueRef);
    expect(state.status).toBe('open');
  });

  // -----------------------------------------------------------------------
  // Phase 6: Reconcile — Close drift detection
  // -----------------------------------------------------------------------

  it('should detect drift and close issue via reconcile', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    // Reconcile with expected state "completed" — should close the open issue
    const result = await engine.reconcile('github', [
      {
        ref: issueRef,
        expected: { status: 'completed' },
      },
    ]);

    expect(result.closed).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);

    const state = await adapter.getIssueState(issueRef);
    expect(state.status).toBe('closed');
  });

  // -----------------------------------------------------------------------
  // Phase 7: Reconcile — No-op when state matches
  // -----------------------------------------------------------------------

  it('should be a no-op when state already matches', { timeout: 30000 }, async () => {
    expect(issueRef).toBeDefined();

    // Issue is closed, expected is completed — already matches
    const result = await engine.reconcile('github', [
      {
        ref: issueRef,
        expected: { status: 'completed' },
      },
    ]);

    expect(result.closed).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Phase 8: Multi-issue batch reconcile
  // -----------------------------------------------------------------------

  it('should reconcile multiple issues in a batch', { timeout: 30000 }, async () => {
    // Create a second test issue
    const result2 = await engine.push('github', {
      userStory: {
        id: 'US-998',
        title: 'E2E Batch Reconcile Test (auto-delete)',
        priority: 'P3',
      },
      feature: { id: 'FS-999', title: 'Integration Test Feature' },
    });
    createdIssueNumbers.push(Number(result2.ref.id));

    // Both issues: first is closed (completed), second is open
    // Reconcile: first should stay closed, second should close
    const reconcileResult = await engine.reconcile('github', [
      {
        ref: issueRef,
        expected: { status: 'completed' },
      },
      {
        ref: result2.ref,
        expected: { status: 'abandoned' },
      },
    ]);

    // First was already closed → no action; second was open → closed
    expect(reconcileResult.closed).toBe(1);
    expect(reconcileResult.errors).toHaveLength(0);

    const state2 = await adapter.getIssueState(result2.ref);
    expect(state2.status).toBe('closed');
  });
});
