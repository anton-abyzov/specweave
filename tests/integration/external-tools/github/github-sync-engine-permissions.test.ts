/**
 * SyncEngine Permission Enforcement Tests
 *
 * Verifies that SyncEngine correctly enforces permission presets:
 * - read-only: only pull allowed
 * - push-only: push/close/reconcile allowed, pull blocked
 * - bidirectional: all operations allowed
 * - full-control: all operations allowed
 * - custom overrides: fine-grained per-flag control
 *
 * Uses an in-memory mock ProviderAdapter — no external API calls.
 *
 * Run: npx vitest run tests/integration/external-tools/github/github-sync-engine-permissions.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SyncEngine,
  type ProviderAdapter,
  type ExternalRef,
  type UserStoryData,
  type FeatureData,
  type FieldChanges,
  type ExternalChange,
  type ItemState,
  type ExpectedState,
  type ReconcileResult,
  type DetectedHierarchy,
  type Label,
  type LabelConfig,
} from '../../../../src/sync/engine.js';
import { resolvePermissions, type SyncPreset } from '../../../../src/sync/config.js';
import type { Platform, PlatformSuffix } from '../../../../src/sync/types.js';

// ---------------------------------------------------------------------------
// In-memory mock adapter
// ---------------------------------------------------------------------------

class MockAdapter implements ProviderAdapter {
  readonly platform: Platform = 'github';
  readonly suffix: PlatformSuffix = 'G';

  private issues = new Map<string, { state: string; title: string; labels: string[] }>();
  private nextId = 1;

  // Track calls for assertion
  calls: Array<{ method: string; args: unknown[] }> = [];

  async testConnection() {
    this.calls.push({ method: 'testConnection', args: [] });
    return { ok: true };
  }

  async createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef> {
    this.calls.push({ method: 'createIssue', args: [story, feature] });
    const id = String(this.nextId++);
    this.issues.set(id, {
      state: 'open',
      title: `${story.id}: ${story.title}`,
      labels: [`priority:${story.priority || 'P2'}`, 'type:user-story'],
    });
    return { platform: 'github', id, url: `https://mock/${id}`, userStory: story.id };
  }

  async updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void> {
    this.calls.push({ method: 'updateIssue', args: [ref, changes] });
    const issue = this.issues.get(ref.id);
    if (issue) {
      if (changes.title) issue.title = changes.title;
      if (changes.status) issue.state = changes.status === 'completed' ? 'closed' : 'open';
    }
  }

  async closeIssue(ref: ExternalRef, comment?: string): Promise<void> {
    this.calls.push({ method: 'closeIssue', args: [ref, comment] });
    const issue = this.issues.get(ref.id);
    if (issue) issue.state = 'closed';
  }

  async reopenIssue(ref: ExternalRef): Promise<void> {
    this.calls.push({ method: 'reopenIssue', args: [ref] });
    const issue = this.issues.get(ref.id);
    if (issue) issue.state = 'open';
  }

  async pullChanges(since?: Date): Promise<ExternalChange[]> {
    this.calls.push({ method: 'pullChanges', args: [since] });
    return [];
  }

  async getIssueState(ref: ExternalRef): Promise<ItemState> {
    this.calls.push({ method: 'getIssueState', args: [ref] });
    const issue = this.issues.get(ref.id);
    if (!issue) throw new Error(`Issue ${ref.id} not found`);
    return { status: issue.state, labels: issue.labels, title: issue.title };
  }

  async applyLabels(ref: ExternalRef, labels: Label[]): Promise<void> {
    this.calls.push({ method: 'applyLabels', args: [ref, labels] });
  }

  async detectHierarchy(): Promise<DetectedHierarchy> {
    this.calls.push({ method: 'detectHierarchy', args: [] });
    return { pattern: 'flat', levels: [{ externalType: 'issue', specweaveMapping: 'user-story' }] };
  }

  async reconcile(items: ExpectedState[]): Promise<ReconcileResult> {
    this.calls.push({ method: 'reconcile', args: [items] });
    let closed = 0;
    let updated = 0;
    for (const item of items) {
      const issue = this.issues.get(item.ref.id);
      if (!issue) continue;
      const shouldBeClosed = item.expected.status === 'completed' || item.expected.status === 'abandoned';
      const isClosed = issue.state === 'closed';
      if (shouldBeClosed && !isClosed) { issue.state = 'closed'; closed++; }
      else if (!shouldBeClosed && isClosed) { issue.state = 'open'; updated++; }
    }
    return { created: 0, updated, closed, errors: [] };
  }

  generateLabels(config: LabelConfig): Label[] {
    return [
      { name: `priority:${config.priority}`, color: '000000' },
      { name: `type:${config.type}`, color: '000000' },
    ];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testStory: UserStoryData = { id: 'US-100', title: 'Test Story', priority: 'P2' };
const testFeature: FeatureData = { id: 'FS-100', title: 'Test Feature' };

function createEngine(preset: SyncPreset, overrides?: Record<string, boolean>): { engine: SyncEngine; adapter: MockAdapter } {
  const adapter = new MockAdapter();
  const engine = new SyncEngine({
    permissions: resolvePermissions(preset, overrides as any),
  });
  engine.registerProvider(adapter);
  return { engine, adapter };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncEngine Permission Enforcement', () => {

  // -----------------------------------------------------------------------
  // read-only preset
  // -----------------------------------------------------------------------

  describe('read-only preset', () => {
    it('should allow pull', async () => {
      const { engine } = createEngine('read-only');
      const result = await engine.pull('github');
      expect(result.platform).toBe('github');
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('should block push', async () => {
      const { engine } = createEngine('read-only');
      await expect(engine.push('github', { userStory: testStory, feature: testFeature }))
        .rejects.toThrow(/Permission denied.*canUpsert/);
    });

    it('should block close', async () => {
      const { engine } = createEngine('read-only');
      const ref: ExternalRef = { platform: 'github', id: '1', url: '', userStory: 'US-100' };
      await expect(engine.closeIssue(ref))
        .rejects.toThrow(/Permission denied.*canUpdateStatus/);
    });

    it('should block reconcile', async () => {
      const { engine } = createEngine('read-only');
      await expect(engine.reconcile('github', []))
        .rejects.toThrow(/Permission denied.*canUpdateStatus/);
    });

    it('should allow testConnection', async () => {
      const { engine } = createEngine('read-only');
      const result = await engine.testConnection('github');
      expect(result.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // push-only preset
  // -----------------------------------------------------------------------

  describe('push-only preset', () => {
    it('should allow push', async () => {
      const { engine } = createEngine('push-only');
      const result = await engine.push('github', { userStory: testStory, feature: testFeature });
      expect(result.action).toBe('created');
    });

    it('should allow close', async () => {
      const { engine, adapter } = createEngine('push-only');
      // Create an issue first
      const pushResult = await engine.push('github', { userStory: testStory, feature: testFeature });
      // Close it
      await engine.closeIssue(pushResult.ref, 'Done');
      const state = await adapter.getIssueState(pushResult.ref);
      expect(state.status).toBe('closed');
    });

    it('should allow reconcile', async () => {
      const { engine } = createEngine('push-only');
      const result = await engine.reconcile('github', []);
      expect(result.errors).toHaveLength(0);
    });

    it('should block pull', async () => {
      const { engine } = createEngine('push-only');
      await expect(engine.pull('github'))
        .rejects.toThrow(/Permission denied.*canRead/);
    });

    it('should allow update', async () => {
      const { engine } = createEngine('push-only');
      const pushResult = await engine.push('github', { userStory: testStory, feature: testFeature });
      await engine.updateIssue(pushResult.ref, { title: 'Updated' });
    });
  });

  // -----------------------------------------------------------------------
  // bidirectional preset
  // -----------------------------------------------------------------------

  describe('bidirectional preset', () => {
    it('should allow all operations', async () => {
      const { engine } = createEngine('bidirectional');

      // Push
      const pushResult = await engine.push('github', { userStory: testStory, feature: testFeature });
      expect(pushResult.action).toBe('created');

      // Update
      await engine.updateIssue(pushResult.ref, { title: 'Updated Title' });

      // Pull
      const pullResult = await engine.pull('github');
      expect(pullResult.platform).toBe('github');

      // Close
      await engine.closeIssue(pushResult.ref, 'Complete');

      // Reconcile
      const reconcileResult = await engine.reconcile('github', []);
      expect(reconcileResult.errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // full-control preset
  // -----------------------------------------------------------------------

  describe('full-control preset', () => {
    it('should allow all operations', async () => {
      const { engine } = createEngine('full-control');

      const pushResult = await engine.push('github', { userStory: testStory, feature: testFeature });
      await engine.updateIssue(pushResult.ref, { description: 'New body' });
      await engine.pull('github');
      await engine.closeIssue(pushResult.ref, 'Done');
      await engine.reconcile('github', []);
    });
  });

  // -----------------------------------------------------------------------
  // Custom overrides
  // -----------------------------------------------------------------------

  describe('custom overrides', () => {
    it('should block push when canUpsert overridden to false on bidirectional', async () => {
      const { engine } = createEngine('bidirectional', { canUpsert: false });

      await expect(engine.push('github', { userStory: testStory, feature: testFeature }))
        .rejects.toThrow(/Permission denied.*canUpsert/);

      // Close should still work (canUpdateStatus is true)
      const ref: ExternalRef = { platform: 'github', id: '1', url: '', userStory: 'US-100' };
      // Pull should still work
      await engine.pull('github');
    });

    it('should allow push when canUpsert overridden to true on read-only', async () => {
      const { engine } = createEngine('read-only', { canUpsert: true });

      const result = await engine.push('github', { userStory: testStory, feature: testFeature });
      expect(result.action).toBe('created');

      // Close should still be blocked (canUpdateStatus is false)
      await expect(engine.closeIssue(result.ref))
        .rejects.toThrow(/Permission denied.*canUpdateStatus/);
    });
  });

  // -----------------------------------------------------------------------
  // Provider registration
  // -----------------------------------------------------------------------

  describe('provider registration', () => {
    it('should throw when provider not registered', async () => {
      const engine = new SyncEngine({ permissions: resolvePermissions('bidirectional') });
      await expect(engine.push('github', { userStory: testStory, feature: testFeature }))
        .rejects.toThrow(/Provider "github" is not registered/);
    });

    it('should track registered platforms', () => {
      const { engine } = createEngine('bidirectional');
      expect(engine.getRegisteredPlatforms()).toEqual(['github']);
    });

    it('should return provider by platform', () => {
      const { engine, adapter } = createEngine('bidirectional');
      expect(engine.getProvider('github')).toBe(adapter);
      expect(engine.getProvider('jira')).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle with mock adapter
// ---------------------------------------------------------------------------

describe('SyncEngine Full Lifecycle (Mock)', () => {
  let engine: SyncEngine;
  let adapter: MockAdapter;

  beforeEach(() => {
    ({ engine, adapter } = createEngine('bidirectional'));
  });

  it('should complete full lifecycle: push → update → close → reconcile', async () => {
    // 1. Push: create issue
    const pushResult = await engine.push('github', {
      userStory: { id: 'US-001', title: 'Auth Feature', priority: 'P1', acceptanceCriteria: ['AC-1: Login works'] },
      feature: { id: 'FS-001', title: 'Authentication' },
    });
    expect(pushResult.action).toBe('created');
    const ref = pushResult.ref;

    let state = await adapter.getIssueState(ref);
    expect(state.status).toBe('open');
    expect(state.title).toContain('US-001:');

    // 2. Update: add progress
    await engine.updateIssue(ref, { title: 'US-001: Auth Feature (50%)' });
    state = await adapter.getIssueState(ref);
    expect(state.title).toContain('50%');

    // 3. Close: increment completed
    await engine.closeIssue(ref, 'All tasks done');
    state = await adapter.getIssueState(ref);
    expect(state.status).toBe('closed');

    // 4. Reconcile: verify no drift
    const noopResult = await engine.reconcile('github', [
      { ref, expected: { status: 'completed' } },
    ]);
    expect(noopResult.closed).toBe(0);
    expect(noopResult.updated).toBe(0);

    // 5. Reconcile: detect drift (reopen)
    const reopenResult = await engine.reconcile('github', [
      { ref, expected: { status: 'active' } },
    ]);
    expect(reopenResult.updated).toBe(1);
    state = await adapter.getIssueState(ref);
    expect(state.status).toBe('open');

    // 6. Reconcile: detect drift (close again)
    const closeResult = await engine.reconcile('github', [
      { ref, expected: { status: 'abandoned' } },
    ]);
    expect(closeResult.closed).toBe(1);
    state = await adapter.getIssueState(ref);
    expect(state.status).toBe('closed');
  });

  it('should handle multi-issue lifecycle independently', async () => {
    // Create 3 issues
    const refs: ExternalRef[] = [];
    for (let i = 1; i <= 3; i++) {
      const result = await engine.push('github', {
        userStory: { id: `US-00${i}`, title: `Story ${i}`, priority: 'P2' },
        feature: { id: 'FS-010', title: 'Multi-Story Feature' },
      });
      refs.push(result.ref);
    }

    // Close only the first two
    await engine.closeIssue(refs[0], 'US-001 done');
    await engine.closeIssue(refs[1], 'US-002 done');

    // Verify states
    expect((await adapter.getIssueState(refs[0])).status).toBe('closed');
    expect((await adapter.getIssueState(refs[1])).status).toBe('closed');
    expect((await adapter.getIssueState(refs[2])).status).toBe('open');

    // Reconcile: first two should stay closed, third should close
    const result = await engine.reconcile('github', [
      { ref: refs[0], expected: { status: 'completed' } },
      { ref: refs[1], expected: { status: 'completed' } },
      { ref: refs[2], expected: { status: 'completed' } },
    ]);

    expect(result.closed).toBe(1); // Only third closed
    expect(result.updated).toBe(0);
    expect((await adapter.getIssueState(refs[2])).status).toBe('closed');
  });

  it('should track adapter calls for audit trail', async () => {
    const result = await engine.push('github', {
      userStory: testStory,
      feature: testFeature,
    });

    await engine.updateIssue(result.ref, { title: 'Updated' });
    await engine.closeIssue(result.ref, 'Done');

    const methodNames = adapter.calls.map(c => c.method);
    expect(methodNames).toEqual(['createIssue', 'updateIssue', 'closeIssue']);
  });

  it('should handle hierarchy detection', async () => {
    const hierarchy = await engine.detectHierarchy('github');
    expect(hierarchy.pattern).toBe('flat');
    expect(hierarchy.levels[0].specweaveMapping).toBe('user-story');
  });
});
