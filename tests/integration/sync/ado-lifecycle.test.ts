/**
 * ADO Full Lifecycle Integration Test
 *
 * Tests the complete ADO sync lifecycle against a real Azure DevOps
 * organization (EasyChamp/SpecWeaveSync).
 *
 * Skip if no AZURE_DEVOPS_PAT environment variable.
 *
 * @integration
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AdoClient, createAdoClient } from '../../../plugins/specweave/lib/integrations/ado/ado-client.js';
import { AdoDescriptionUpdater } from '../../../src/core/ado-description-updater.js';
import { mapAdoStateToSpecweave } from '../../../plugins/specweave/lib/integrations/ado/ado-pull-sync.js';

const hasCredentials =
  !!process.env.AZURE_DEVOPS_PAT &&
  !!process.env.AZURE_DEVOPS_ORG &&
  !!process.env.AZURE_DEVOPS_PROJECT;

describe.skipIf(!hasCredentials)('ADO Full Lifecycle Integration', () => {
  let client: AdoClient;
  let createdWorkItemId: number;

  beforeAll(() => {
    client = createAdoClient({
      organization: process.env.AZURE_DEVOPS_ORG!,
      project: process.env.AZURE_DEVOPS_PROJECT!,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT!,
      workItemType: 'Feature',
    });
  });

  it('creates a work item', async () => {
    const workItem = await client.createWorkItem({
      title: `[SpecWeave Test] Lifecycle Test ${Date.now()}`,
      description: 'Integration test work item',
      tags: ['specweave-test', 'integration'],
    });

    expect(workItem.id).toBeGreaterThan(0);
    expect(workItem.fields['System.Title']).toContain('Lifecycle Test');
    createdWorkItemId = workItem.id;
  });

  it('pushes status and verifies work item state', async () => {
    expect(createdWorkItemId).toBeDefined();

    await client.updateWorkItem(createdWorkItemId, {
      state: 'Active',
    });

    const workItem = await client.getWorkItem(createdWorkItemId);
    expect(workItem.fields['System.State']).toBe('Active');
  });

  it('updates AC checkboxes in description', async () => {
    expect(createdWorkItemId).toBeDefined();

    const updater = new AdoDescriptionUpdater();
    const acStatus = new Map<string, boolean>([
      ['AC-US1-01', true],
      ['AC-US1-02', false],
    ]);

    const acHtml = updater.formatACCheckboxes(acStatus);
    const workItem = await client.getWorkItem(createdWorkItemId);
    const currentDesc = workItem.fields['System.Description'] || '';
    const newDesc = updater.updateAcSection(currentDesc, acHtml);

    await client.updateWorkItem(createdWorkItemId, {
      description: newDesc,
    });

    const updated = await client.getWorkItem(createdWorkItemId);
    const desc = updated.fields['System.Description'] || '';
    expect(desc).toContain('AC-US1-01');
    expect(desc).toContain('AC-US1-02');
  });

  it('pulls state and maps correctly', async () => {
    expect(createdWorkItemId).toBeDefined();

    const result = await client.pullWorkItemState(createdWorkItemId);
    expect(result.state).toBe('Active');
    expect(result.modifiedAt).toBeInstanceOf(Date);

    const mapped = mapAdoStateToSpecweave(result.state);
    expect(mapped).toBe('active');
  });

  it('closes work item and verifies state', async () => {
    expect(createdWorkItemId).toBeDefined();

    await client.updateWorkItem(createdWorkItemId, {
      state: 'Closed',
    });

    const workItem = await client.getWorkItem(createdWorkItemId);
    expect(['Closed', 'Done', 'Resolved']).toContain(workItem.fields['System.State']);

    const mapped = mapAdoStateToSpecweave(workItem.fields['System.State']);
    expect(mapped).toBe('completed');
  });

  it('cleans up test work item', async () => {
    if (createdWorkItemId) {
      await client.deleteWorkItem(createdWorkItemId);
    }
  });
});
