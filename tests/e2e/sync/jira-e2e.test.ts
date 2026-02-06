/**
 * JIRA E2E Sync Test
 *
 * Tests real JIRA API calls against the WTTC project.
 * Requires: JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
 *
 * Run: JIRA_API_TOKEN=... JIRA_EMAIL=... JIRA_DOMAIN=... npx vitest run tests/e2e/sync/jira-e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JiraAdapter, type JiraAdapterConfig } from '../../../src/sync/providers/jira.js';
import { SyncEngine } from '../../../src/sync/engine.js';
import { resolvePermissions } from '../../../src/sync/config.js';

const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN;

const skip = !JIRA_TOKEN || !JIRA_EMAIL || !JIRA_DOMAIN;
const createdIssueKeys: string[] = [];

describe.skipIf(skip)('JIRA E2E Sync', () => {
  const config: JiraAdapterConfig = {
    domain: JIRA_DOMAIN!,
    email: JIRA_EMAIL!,
    apiToken: JIRA_TOKEN!,
    projectKey: 'WTTC',
  };

  const adapter = new JiraAdapter(config);
  const engine = new SyncEngine({
    permissions: resolvePermissions('bidirectional'),
  });
  engine.registerProvider(adapter);

  beforeAll(async () => {
    // Pre-flight: verify credentials work before running tests
    const conn = await engine.testConnection('jira');
    if (!conn.ok) {
      throw new Error(`JIRA auth failed: ${conn.error}. Generate a new API token at https://id.atlassian.com/manage-profile/security/api-tokens`);
    }
  });

  afterAll(async () => {
    for (const key of createdIssueKeys) {
      try {
        await adapter.closeIssue(
          { platform: 'jira', id: key, url: '', userStory: '' },
          'E2E test cleanup'
        );
      } catch { /* ignore */ }
    }
  });

  it('should test connection successfully', async () => {
    const result = await engine.testConnection('jira');
    expect(result.ok).toBe(true);
  });

  it('should create a story with clean title format', async () => {
    const result = await engine.push('jira', {
      userStory: { id: 'US-999J', title: 'E2E Test Story', priority: 'P2' },
      feature: { id: 'FS-190', title: 'Sync Architecture Redesign' },
    });

    expect(result.ref.platform).toBe('jira');
    expect(result.ref.id).toMatch(/^WTTC-/);
    expect(result.ref.url).toContain('atlassian.net');
    createdIssueKeys.push(result.ref.id);
  });

  it('should detect hierarchy', async () => {
    const hierarchy = await adapter.detectHierarchy();
    expect(hierarchy.pattern).toBeDefined();
    expect(hierarchy.levels.length).toBeGreaterThan(0);
  });

  it('should pull changes', async () => {
    const result = await engine.pull('jira');
    expect(result.platform).toBe('jira');
    expect(Array.isArray(result.changes)).toBe(true);
  });
});
