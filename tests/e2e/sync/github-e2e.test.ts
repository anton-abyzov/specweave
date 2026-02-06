/**
 * GitHub E2E Sync Test
 *
 * Tests real GitHub API calls against the specweave repository.
 * Requires: GITHUB_TOKEN or gh auth
 *
 * Run: npx vitest run tests/e2e/sync/github-e2e.test.ts
 */

import { describe, it, expect, afterAll } from 'vitest';
import { GitHubAdapter, type GitHubAdapterConfig } from '../../../src/sync/providers/github.js';
import { SyncEngine } from '../../../src/sync/engine.js';
import { resolvePermissions } from '../../../src/sync/config.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'anton-abyzov';
const REPO = 'specweave';

const skip = !GITHUB_TOKEN;
const createdIssueNumbers: number[] = [];

describe.skipIf(skip)('GitHub E2E Sync', () => {
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

  afterAll(async () => {
    // Cleanup: close all test issues
    for (const num of createdIssueNumbers) {
      try {
        await adapter.closeIssue(
          { platform: 'github', id: String(num), url: '', userStory: '' },
          'E2E test cleanup'
        );
      } catch { /* ignore */ }
    }
  });

  it('should test connection successfully', async () => {
    const result = await engine.testConnection('github');
    expect(result.ok).toBe(true);
  });

  it('should create an issue with clean title format', async () => {
    const result = await engine.push('github', {
      userStory: { id: 'US-999', title: 'E2E Test Issue', priority: 'P2' },
      feature: { id: 'FS-190', title: 'Sync Architecture Redesign' },
    });

    expect(result.ref.platform).toBe('github');
    expect(result.ref.id).toBeDefined();
    expect(result.ref.url).toContain('github.com');
    createdIssueNumbers.push(Number(result.ref.id));
  });

  it('should verify issue has correct labels', async () => {
    if (createdIssueNumbers.length === 0) return;

    const ref = {
      platform: 'github' as const,
      id: String(createdIssueNumbers[0]),
      url: '',
      userStory: 'US-999',
    };

    const state = await adapter.getIssueState(ref);
    expect(state.title).toContain('US-999:');
    expect(state.labels).toContain('priority:P2');
    expect(state.labels).toContain('type:user-story');
    expect(state.labels).toContain(`project:${REPO}`);
    // Should NOT have redundant "critical" or bare project name
    expect(state.labels).not.toContain('critical');
  });

  it('should pull changes', async () => {
    const result = await engine.pull('github');
    expect(result.platform).toBe('github');
    expect(Array.isArray(result.changes)).toBe(true);
  });

  it('should close and verify issue state', async () => {
    if (createdIssueNumbers.length === 0) return;

    const ref = {
      platform: 'github' as const,
      id: String(createdIssueNumbers[0]),
      url: '',
      userStory: 'US-999',
    };

    await adapter.closeIssue(ref, 'Closing for E2E test');
    const state = await adapter.getIssueState(ref);
    expect(state.status).toBe('closed');
  });
});
