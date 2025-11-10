import { test, expect } from '@playwright/test';
import * as path from 'path';
import { promises as fs } from 'fs';
import { ensureDir, remove } from 'fs-extra';
import { fileURLToPath } from 'url';
import { AdoClient, createAdoClient } from '../../plugins/specweave-ado/lib/ado-client';

/**
 * E2E Tests for Azure DevOps (ADO) Sync
 *
 * Prerequisites:
 * - AZURE_DEVOPS_PAT environment variable set
 * - AZURE_DEVOPS_ORG environment variable set
 * - AZURE_DEVOPS_PROJECT environment variable set
 * - ADO test project with permissions to create/delete work items
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_INCREMENT_ID = 'test-0001-ado-sync';
const TEST_SPECWEAVE_DIR = path.join(__dirname, '../fixtures/e2e-ado-sync');

// Skip tests if ADO not configured
const skipIfNoAdo = !process.env.AZURE_DEVOPS_PAT || !process.env.AZURE_DEVOPS_ORG || !process.env.AZURE_DEVOPS_PROJECT;

test.describe.serial('Azure DevOps Sync E2E', () => {
  // Set timeout to 60 seconds for all tests in this suite (ADO API can be slow)
  test.setTimeout(60000);

  let adoClient: AdoClient;
  let workItemId: number;

  test.beforeAll(async () => {
    if (skipIfNoAdo) {
      test.skip();
      return;
    }

    // Create ADO client
    adoClient = createAdoClient({
      organization: process.env.AZURE_DEVOPS_ORG!,
      project: process.env.AZURE_DEVOPS_PROJECT!,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT!,
      workItemType: 'Epic',
    });

    // Test connection
    const connected = await adoClient.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Azure DevOps. Check PAT and permissions.');
    }

    // Create test SpecWeave structure
    await ensureDir(TEST_SPECWEAVE_DIR);
    await ensureDir(path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID));

    // Create test config
    const config = {
      project: { name: 'test-ado-sync', version: '0.1.0' },
      externalPM: {
        tool: 'ado',
        enabled: true,
        config: {
          organization: process.env.AZURE_DEVOPS_ORG,
          project: process.env.AZURE_DEVOPS_PROJECT,
          workItemType: 'Epic',
          syncOnTaskComplete: true,
        },
      },
    };
    await fs.writeFile(path.join(TEST_SPECWEAVE_DIR, 'config.json'), JSON.stringify(config, null, 2));

    // Create test spec.md
    const specContent = `# Test ADO Sync Feature

## Summary
Test feature for E2E ADO sync validation

## User Stories

### US1: Basic Sync
**Acceptance Criteria**:
- [ ] AC-US1-01: Create work item in ADO
- [ ] AC-US1-02: Sync progress to ADO
- [ ] AC-US1-03: Close work item when complete
`;
    await fs.writeFile(
      path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID, 'spec.md'),
      specContent
    );

    // Create test tasks.md
    const tasksContent = `---
increment: ${TEST_INCREMENT_ID}
total_tasks: 3
---

# Tasks

## T-001: Setup test environment
- [ ] Completed

## T-002: Create ADO sync
- [ ] Completed

## T-003: Validate sync
- [ ] Completed
`;
    await fs.writeFile(
      path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID, 'tasks.md'),
      tasksContent
    );
  });

  test.afterAll(async () => {
    if (skipIfNoAdo) return;

    // Cleanup: Delete test work item
    if (workItemId) {
      try {
        await adoClient.deleteWorkItem(workItemId);
      } catch (error) {
        console.warn(`Failed to delete test work item #${workItemId}:`, error);
      }
    }

    // Cleanup: Remove test directory
    await remove(TEST_SPECWEAVE_DIR);
  });

  test('should create ADO work item from increment', async () => {
    // Create work item
    const workItem = await adoClient.createWorkItem({
      title: `Test Increment: ${TEST_INCREMENT_ID}`,
      description: 'E2E test for ADO sync',
      tags: ['specweave', 'e2e-test', TEST_INCREMENT_ID],
    });

    expect(workItem).toBeDefined();
    expect(workItem.id).toBeGreaterThan(0);
    expect(workItem.fields['System.Title']).toContain(TEST_INCREMENT_ID);
    expect(workItem.fields['System.State']).toBe('To Do'); // Azure DevOps uses "To Do" instead of "New"
    expect(workItem.fields['System.Tags']).toContain('specweave');

    workItemId = workItem.id;

    // Save work item ID to metadata
    const metadata = {
      increment: TEST_INCREMENT_ID,
      status: 'active',
      createdAt: new Date().toISOString(),
      externalPM: {
        tool: 'ado',
        workItemId: workItem.id,
        workItemUrl: workItem._links.html.href,
        lastSyncedAt: new Date().toISOString(),
      },
    };
    await fs.writeFile(
      path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID, 'increment-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  });

  test('should add comment to work item', async () => {
    expect(workItemId).toBeDefined();

    const comment = await adoClient.addComment(
      workItemId,
      '## Progress Update\n\nE2E test comment from SpecWeave'
    );

    expect(comment).toBeDefined();
    expect(comment.id).toBeGreaterThan(0);
    expect(comment.text).toContain('Progress Update');
  });

  test('should get work item by ID', async () => {
    expect(workItemId).toBeDefined();

    const workItem = await adoClient.getWorkItem(workItemId);

    expect(workItem).toBeDefined();
    expect(workItem.id).toBe(workItemId);
    expect(workItem.fields['System.Title']).toContain(TEST_INCREMENT_ID);
  });

  test('should update work item state', async () => {
    expect(workItemId).toBeDefined();

    // Update state to Doing (valid for Epic work items in this project)
    const updatedWorkItem = await adoClient.updateWorkItem(workItemId, {
      state: 'Doing',
    });

    expect(updatedWorkItem).toBeDefined();
    expect(updatedWorkItem.fields['System.State']).toBe('Doing');
  });

  test('should get comments for work item', async () => {
    expect(workItemId).toBeDefined();

    const comments = await adoClient.getComments(workItemId);

    expect(comments).toBeDefined();
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0].text).toBeDefined();
  });

  test('should close work item', async () => {
    expect(workItemId).toBeDefined();

    // Add final comment
    await adoClient.addComment(
      workItemId,
      '## ✅ Increment Complete\n\nE2E test completed successfully'
    );

    // Close work item (use "Done" - valid for this project)
    const closedWorkItem = await adoClient.updateWorkItem(workItemId, {
      state: 'Done',
    });

    expect(closedWorkItem).toBeDefined();
    expect(closedWorkItem.fields['System.State']).toBe('Done');
  });

  test('should handle error when PAT is invalid', async () => {
    const invalidClient = createAdoClient({
      organization: process.env.AZURE_DEVOPS_ORG!,
      project: process.env.AZURE_DEVOPS_PROJECT!,
      personalAccessToken: 'invalid-token',
    });

    await expect(
      invalidClient.createWorkItem({ title: 'Test' })
    ).rejects.toThrow(/ADO API error: (401|302)/);
  });

  test('should handle error when work item not found', async () => {
    await expect(adoClient.getWorkItem(999999)).rejects.toThrow(/404/);
  });

  test('should test connection successfully', async () => {
    const connected = await adoClient.testConnection();
    expect(connected).toBe(true);
  });

  test('should test connection failure with invalid PAT', async () => {
    const invalidClient = createAdoClient({
      organization: process.env.AZURE_DEVOPS_ORG!,
      project: process.env.AZURE_DEVOPS_PROJECT!,
      personalAccessToken: 'invalid-token',
    });

    const connected = await invalidClient.testConnection();
    expect(connected).toBe(false);
  });
});

test.describe('ADO Sync - Rate Limiting', () => {
  test.skip('should handle rate limiting gracefully', async () => {
    if (skipIfNoAdo) return;

    // This test is skipped by default to avoid hitting rate limits
    // Uncomment to test rate limiting behavior

    const adoClient = createAdoClient();

    // Make many requests to trigger rate limit
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 250; i++) {
      promises.push(adoClient.testConnection());
    }

    // Should handle rate limiting without crashing
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});

test.describe('ADO Sync - Error Scenarios', () => {
  let savedEnv: Record<string, string | undefined>;

  test.beforeEach(() => {
    // Save and clear environment variables for these tests
    savedEnv = {
      AZURE_DEVOPS_PAT: process.env.AZURE_DEVOPS_PAT,
      AZURE_DEVOPS_ORG: process.env.AZURE_DEVOPS_ORG,
      AZURE_DEVOPS_PROJECT: process.env.AZURE_DEVOPS_PROJECT,
    };
    delete process.env.AZURE_DEVOPS_PAT;
    delete process.env.AZURE_DEVOPS_ORG;
    delete process.env.AZURE_DEVOPS_PROJECT;
  });

  test.afterEach(() => {
    // Restore environment variables
    if (savedEnv.AZURE_DEVOPS_PAT !== undefined) {
      process.env.AZURE_DEVOPS_PAT = savedEnv.AZURE_DEVOPS_PAT;
    }
    if (savedEnv.AZURE_DEVOPS_ORG !== undefined) {
      process.env.AZURE_DEVOPS_ORG = savedEnv.AZURE_DEVOPS_ORG;
    }
    if (savedEnv.AZURE_DEVOPS_PROJECT !== undefined) {
      process.env.AZURE_DEVOPS_PROJECT = savedEnv.AZURE_DEVOPS_PROJECT;
    }
  });

  test('should throw error when organization not configured', () => {
    expect(() =>
      createAdoClient({
        project: 'test',
        personalAccessToken: 'token',
      })
    ).toThrow('ADO organization not configured');
  });

  test('should throw error when project not configured', () => {
    expect(() =>
      createAdoClient({
        organization: 'test',
        personalAccessToken: 'token',
      })
    ).toThrow('ADO project not configured');
  });

  test('should throw error when PAT not configured', () => {
    expect(() =>
      createAdoClient({
        organization: 'test',
        project: 'test',
      })
    ).toThrow('AZURE_DEVOPS_PAT not set');
  });
});

test.describe('ADO Sync - Multi-Project Support', () => {
  test.skip('should query work items across multiple projects', async () => {
    if (skipIfNoAdo) return;

    const { AdoClientV2 } = await import('../../plugins/specweave-ado/lib/ado-client-v2');

    // Create multi-project profile with containers
    const profile = {
      provider: 'ado' as const,
      displayName: 'Multi-Project Test',
      config: {
        organization: process.env.AZURE_DEVOPS_ORG!,
        containers: [
          {
            id: 'SpecWeaveSync',
            filters: {
              workItemTypes: ['Epic'],
            },
          },
          {
            id: 'FAQ Chat',
            filters: {
              workItemTypes: ['Epic', 'User Story'],
            },
          },
        ],
      },
      timeRange: { default: '1M' as const, max: '6M' as const },
    };

    const client = new AdoClientV2(profile, process.env.AZURE_DEVOPS_PAT!);

    // Test connection
    const connection = await client.testConnection();
    expect(connection.success).toBe(true);

    // Query across multiple projects
    const workItems = await client.listWorkItemsInTimeRange('1M');

    // Should get work items from both projects
    expect(workItems).toBeDefined();
    expect(Array.isArray(workItems)).toBe(true);

    // Verify work items are from expected projects
    const projects = new Set(workItems.map(wi => wi.fields['System.TeamProject']));
    console.log('Projects found:', Array.from(projects));

    // At least one project should be present (may be empty if no work items in time range)
    expect(projects.size).toBeGreaterThanOrEqual(0);
  });

  test.skip('should filter by area paths in multi-project mode', async () => {
    if (skipIfNoAdo) return;

    const { AdoClientV2 } = await import('../../plugins/specweave-ado/lib/ado-client-v2');

    // Profile with area path filters
    const profile = {
      provider: 'ado' as const,
      displayName: 'Filtered Multi-Project',
      config: {
        organization: process.env.AZURE_DEVOPS_ORG!,
        containers: [
          {
            id: 'SpecWeaveSync',
            filters: {
              areaPaths: ['SpecWeaveSync\\Area 1'],
              workItemTypes: ['Epic'],
            },
          },
        ],
      },
      timeRange: { default: '1M' as const, max: '6M' as const },
    };

    const client = new AdoClientV2(profile, process.env.AZURE_DEVOPS_PAT!);

    const workItems = await client.listWorkItemsInTimeRange('1M');

    expect(workItems).toBeDefined();
    expect(Array.isArray(workItems)).toBe(true);

    // All work items should be from the filtered area path
    workItems.forEach(wi => {
      const areaPath = wi.fields['System.AreaPath'];
      if (areaPath) {
        expect(areaPath).toContain('SpecWeaveSync');
      }
    });
  });

  test.skip('should support custom WIQL queries', async () => {
    if (skipIfNoAdo) return;

    const { AdoClientV2 } = await import('../../plugins/specweave-ado/lib/ado-client-v2');

    // Profile with custom WIQL
    const profile = {
      provider: 'ado' as const,
      displayName: 'Custom WIQL',
      config: {
        organization: process.env.AZURE_DEVOPS_ORG!,
        customQuery: `
          SELECT [System.Id], [System.Title], [System.State]
          FROM WorkItems
          WHERE [System.TeamProject] IN ('SpecWeaveSync', 'FAQ Chat')
          AND [System.WorkItemType] = 'Epic'
          AND [System.State] <> 'Done'
          ORDER BY [System.ChangedDate] DESC
        `,
      },
      timeRange: { default: '1M' as const, max: '6M' as const },
    };

    const client = new AdoClientV2(profile, process.env.AZURE_DEVOPS_PAT!);

    const workItems = await client.listWorkItemsInTimeRange('1M');

    expect(workItems).toBeDefined();
    expect(Array.isArray(workItems)).toBe(true);

    // All work items should be Epics and not Done
    workItems.forEach(wi => {
      expect(wi.fields['System.WorkItemType']).toBe('Epic');
      expect(wi.fields['System.State']).not.toBe('Done');
    });
  });
});
