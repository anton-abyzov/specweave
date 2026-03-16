/**
 * Integration Test: GitHub Full Lifecycle Sync (T-024)
 *
 * End-to-end lifecycle test using GitHubAdapter:
 * 1. Create increment issue via push
 * 2. Verify issue created with AC checkboxes in body
 * 3. Close issue on completion
 * 4. Verify issue state = closed
 *
 * Requires: GITHUB_TOKEN or GH_TOKEN env var
 * Skips gracefully if absent.
 *
 * @integration
 */

import { describe, it, expect, afterAll } from 'vitest';
import { GitHubAdapter, type GitHubAdapterConfig } from '../../../src/sync/providers/github.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'anton-abyzov';
const REPO = 'specweave';

const skip = !GITHUB_TOKEN;
const createdIssueNumbers: number[] = [];

describe.skipIf(skip)('GitHub Lifecycle Integration (T-024)', () => {
  const config: GitHubAdapterConfig = {
    owner: OWNER,
    repo: REPO,
    token: GITHUB_TOKEN,
  };

  const adapter = new GitHubAdapter(config);
  let issueNumber: string;
  let issueUrl: string;

  afterAll(async () => {
    // Cleanup: close all test issues
    for (const num of createdIssueNumbers) {
      try {
        await adapter.closeIssue(
          { platform: 'github', id: String(num), url: '', userStory: '' },
          'Lifecycle test cleanup (T-024)'
        );
      } catch { /* ignore cleanup errors */ }
    }
  });

  // -----------------------------------------------------------------------
  // Phase 1: Push creates issue with AC checkboxes
  // -----------------------------------------------------------------------
  it('creates issue with acceptance criteria checkboxes in body', { timeout: 30000 }, async () => {
    const story = {
      id: 'US-T024',
      title: 'Lifecycle Test Issue (auto-delete)',
      priority: 'P3',
      description: 'Integration test for T-024 — safe to delete.',
      acceptanceCriteria: [
        '**AC-UST024-01**: Issue created on GitHub',
        '**AC-UST024-02**: AC checkboxes present in body',
        '**AC-UST024-03**: Issue closed on completion',
      ],
    };

    const feature = { id: 'FS-T024', title: 'Lifecycle Integration Test Feature' };

    const ref = await adapter.createIssue(story, feature);

    expect(ref.platform).toBe('github');
    expect(ref.id).toBeDefined();
    expect(ref.url).toContain('github.com');

    issueNumber = ref.id;
    issueUrl = ref.url;
    createdIssueNumbers.push(Number(issueNumber));

    // Verify issue state
    const state = await adapter.getIssueState(ref);
    expect(state.status).toBe('open');
    expect(state.title).toContain('US-T024');
  });

  // -----------------------------------------------------------------------
  // Phase 2: Verify AC checkboxes in issue body (read-back)
  // -----------------------------------------------------------------------
  it('verifies issue body contains AC checkboxes', { timeout: 30000 }, async () => {
    expect(issueNumber).toBeDefined();

    // Fetch the issue directly via API
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/issues/${issueNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'SpecWeave-Test',
        },
      }
    );

    expect(response.ok).toBe(true);
    const issue = await response.json();
    expect(issue.body).toContain('AC-UST024-01');
    expect(issue.body).toContain('AC-UST024-02');
    expect(issue.body).toContain('[ ]'); // unchecked checkboxes
  });

  // -----------------------------------------------------------------------
  // Phase 3: Close issue (simulates specweave complete)
  // -----------------------------------------------------------------------
  it('closes issue on completion', { timeout: 30000 }, async () => {
    expect(issueNumber).toBeDefined();

    const ref = {
      platform: 'github' as const,
      id: issueNumber,
      url: issueUrl,
      userStory: 'US-T024',
    };

    await adapter.closeIssue(ref, 'Increment completed — all tasks done.');

    // Verify closed
    const state = await adapter.getIssueState(ref);
    expect(state.status).toBe('closed');
  });
});
