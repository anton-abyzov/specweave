/**
 * Azure DevOps E2E Sync Test
 *
 * Tests real ADO API calls against a test project.
 * Requires: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG
 *
 * Run: AZURE_DEVOPS_PAT=... AZURE_DEVOPS_ORG=... npx vitest run tests/e2e/sync/ado-e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AdoAdapter, type AdoAdapterConfig } from '../../../src/sync/providers/ado.js';
import { SyncEngine } from '../../../src/sync/engine.js';
import { resolvePermissions } from '../../../src/sync/config.js';

const ADO_PAT = process.env.AZURE_DEVOPS_PAT;
const ADO_ORG = process.env.AZURE_DEVOPS_ORG;
const ADO_PROJECT = process.env.AZURE_DEVOPS_PROJECT || 'SpecWeaveTest';

const skip = !ADO_PAT || !ADO_ORG;
const createdWorkItemIds: number[] = [];

describe.skipIf(skip)('ADO E2E Sync', () => {
  const config: AdoAdapterConfig = {
    organization: ADO_ORG!,
    project: ADO_PROJECT,
    pat: ADO_PAT!,
  };

  const adapter = new AdoAdapter(config);
  const engine = new SyncEngine({
    permissions: resolvePermissions('bidirectional'),
  });
  engine.registerProvider(adapter);

  beforeAll(async () => {
    // Pre-flight: verify credentials work before running tests
    const conn = await engine.testConnection('ado');
    if (!conn.ok) {
      throw new Error(`ADO auth failed: ${conn.error}. Check PAT at https://dev.azure.com/${ADO_ORG}/_usersSettings/tokens`);
    }
  });

  afterAll(async () => {
    for (const id of createdWorkItemIds) {
      try {
        await adapter.closeIssue(
          { platform: 'ado', id: String(id), url: '', userStory: '' },
          'E2E test cleanup'
        );
      } catch { /* ignore */ }
    }
  });

  it('should test connection successfully', async () => {
    const result = await engine.testConnection('ado');
    expect(result.ok).toBe(true);
  });

  it('should create a work item with clean title format', async () => {
    const result = await engine.push('ado', {
      userStory: { id: 'US-999A', title: 'E2E Test Work Item', priority: 'P2' },
      feature: { id: 'FS-190', title: 'Sync Architecture Redesign' },
    });

    expect(result.ref.platform).toBe('ado');
    expect(result.ref.id).toBeDefined();
    expect(result.ref.url).toContain('dev.azure.com');
    createdWorkItemIds.push(Number(result.ref.id));
  });

  it('should detect hierarchy', async () => {
    const hierarchy = await adapter.detectHierarchy();
    expect(hierarchy.pattern).toBeDefined();
    expect(hierarchy.levels.length).toBeGreaterThan(0);
  });

  it('should pull changes', async () => {
    const result = await engine.pull('ado');
    expect(result.platform).toBe('ado');
    expect(Array.isArray(result.changes)).toBe(true);
  });

  it('should close and verify work item state', async () => {
    if (createdWorkItemIds.length === 0) return;

    const ref = {
      platform: 'ado' as const,
      id: String(createdWorkItemIds[0]),
      url: '',
      userStory: 'US-999A',
    };

    await adapter.closeIssue(ref, 'Closing for E2E test');
    const state = await adapter.getIssueState(ref);
    expect(['Closed', 'Done', 'Resolved']).toContain(state.status);
  });
});
