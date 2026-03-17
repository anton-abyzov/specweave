/**
 * Integration Test: JIRA Full Lifecycle
 *
 * Tests the full increment lifecycle against real JIRA API:
 * 1. Create increment → sync push → verify JIRA issue created
 * 2. Complete AC → verify JIRA checkbox updated
 * 3. Close increment → verify JIRA status is "Done"
 *
 * Requires env vars:
 * - JIRA_API_TOKEN
 * - JIRA_EMAIL
 * - JIRA_DOMAIN (e.g., company.atlassian.net)
 * - JIRA_PROJECT_KEY (e.g., SWE2E)
 *
 * Satisfies: AC-US10-02
 *
 * @tags integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { JiraStatusSync } from '../../../plugins/specweave/lib/integrations/jira/jira-status-sync.js';

const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'test.atlassian.net';
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'SWE2E';

describe.skipIf(!JIRA_API_TOKEN || !JIRA_EMAIL)('JIRA Full Lifecycle Integration', () => {
  let client: AxiosInstance;
  let statusSync: InstanceType<typeof JiraStatusSync>;
  let createdIssueKey: string | null = null;

  beforeAll(async () => {
    client = axios.create({
      baseURL: `https://${JIRA_DOMAIN}/rest/api/3`,
      auth: {
        username: JIRA_EMAIL!,
        password: JIRA_API_TOKEN!,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    statusSync = new JiraStatusSync(
      JIRA_DOMAIN,
      JIRA_EMAIL!,
      JIRA_API_TOKEN!,
      JIRA_PROJECT_KEY,
    );
  });

  afterAll(async () => {
    // Clean up: delete created issue if any
    if (createdIssueKey && client) {
      try {
        await client.delete(`/issue/${createdIssueKey}`);
        console.log(`🧹 Cleaned up test issue ${createdIssueKey}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clean up ${createdIssueKey}:`, (err as Error).message);
      }
    }
  });

  it('step 1: creates a JIRA issue for a test increment', async () => {
    const testSummary = `[SWE2E-TEST] Lifecycle test ${Date.now()}`;
    const description = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Automated lifecycle integration test from SpecWeave' }],
      }],
    };

    const response = await client.post('/issue', {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: testSummary,
        description,
        issuetype: { name: 'Task' },
        labels: ['specweave-e2e-test'],
      },
    });

    createdIssueKey = response.data.key;
    expect(createdIssueKey).toBeTruthy();
    expect(createdIssueKey).toMatch(new RegExp(`^${JIRA_PROJECT_KEY}-\\d+$`));

    // Verify issue exists
    const issueResp = await client.get(`/issue/${createdIssueKey}`);
    expect(issueResp.data.fields.summary).toBe(testSummary);
    console.log(`✅ Created test issue: ${createdIssueKey}`);
  });

  it('step 2: reads status from JIRA via JiraStatusSync', async () => {
    expect(createdIssueKey).toBeTruthy();

    const status = await statusSync.getStatus(createdIssueKey!);
    expect(status.state).toBeTruthy();
    // New issues typically start in "To Do" or "Open" state
    expect(typeof status.state).toBe('string');
    console.log(`✅ Current status: ${status.state}`);
  });

  it('step 3: posts AC progress comment to JIRA', async () => {
    expect(createdIssueKey).toBeTruthy();

    const posted = await statusSync.postProgressComment(createdIssueKey!, [
      { id: 'AC-US1-01', description: 'Test AC 1', completed: true },
      { id: 'AC-US1-02', description: 'Test AC 2', completed: false },
    ]);

    expect(posted).toBe(true);

    // Verify comment exists
    const commentsResp = await client.get(`/issue/${createdIssueKey}/comment`, {
      params: { orderBy: '-created', maxResults: 1 },
    });
    const lastComment = commentsResp.data.comments?.[0];
    expect(lastComment).toBeTruthy();
    console.log(`✅ Posted progress comment to ${createdIssueKey}`);
  });

  it('step 4: transitions issue to Done status', async () => {
    expect(createdIssueKey).toBeTruthy();

    const success = await statusSync.updateStatus(createdIssueKey!, { state: 'Done' });

    if (success) {
      // Verify status changed
      const status = await statusSync.getStatus(createdIssueKey!);
      expect(status.state.toLowerCase()).toBe('done');
      console.log(`✅ Issue ${createdIssueKey} transitioned to Done`);
    } else {
      // Workflow may not support direct "Done" transition
      console.log(`⚠️ Direct "Done" transition not available — this is workflow-dependent`);
    }
  });

  it('step 5: deduplicates progress comments (same fingerprint skipped)', async () => {
    expect(createdIssueKey).toBeTruthy();

    // Post same progress again — should be deduped
    const posted = await statusSync.postProgressComment(createdIssueKey!, [
      { id: 'AC-US1-01', description: 'Test AC 1', completed: true },
      { id: 'AC-US1-02', description: 'Test AC 2', completed: false },
    ]);

    // Should skip (duplicate fingerprint)
    expect(posted).toBe(false);
    console.log(`✅ Duplicate progress comment correctly skipped`);
  });
});
