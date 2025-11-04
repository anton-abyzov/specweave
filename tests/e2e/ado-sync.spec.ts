import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { AdoClient, createAdoClient } from '../../plugins/specweave-ado/lib/ado-client';

/**
 * E2E Tests for Azure DevOps (ADO) Sync
 *
 * Prerequisites:
 * - AZURE_DEVOPS_PAT environment variable set
 * - ADO_ORGANIZATION environment variable set
 * - ADO_PROJECT environment variable set
 * - ADO test project with permissions to create/delete work items
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_INCREMENT_ID = 'test-0001-ado-sync';
const TEST_SPECWEAVE_DIR = path.join(__dirname, '..', '..', '.specweave-test-ado');

// Skip tests if ADO not configured
const skipIfNoAdo = !process.env.AZURE_DEVOPS_PAT || !process.env.ADO_ORGANIZATION || !process.env.ADO_PROJECT;

test.describe('Azure DevOps Sync E2E', () => {
  let adoClient: AdoClient;
  let workItemId: number;

  test.beforeAll(async () => {
    if (skipIfNoAdo) {
      test.skip();
      return;
    }

    // Create ADO client
    adoClient = createAdoClient({
      organization: process.env.ADO_ORGANIZATION!,
      project: process.env.ADO_PROJECT!,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT!,
      workItemType: 'Epic',
    });

    // Test connection
    const connected = await adoClient.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Azure DevOps. Check PAT and permissions.');
    }

    // Create test SpecWeave structure
    await fs.ensureDir(TEST_SPECWEAVE_DIR);
    await fs.ensureDir(path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID));

    // Create test config
    const config = {
      project: { name: 'test-ado-sync', version: '0.1.0' },
      externalPM: {
        tool: 'ado',
        enabled: true,
        config: {
          organization: process.env.ADO_ORGANIZATION,
          project: process.env.ADO_PROJECT,
          workItemType: 'Epic',
          syncOnTaskComplete: true,
        },
      },
    };
    await fs.writeJson(path.join(TEST_SPECWEAVE_DIR, 'config.json'), config, { spaces: 2 });

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
    await fs.remove(TEST_SPECWEAVE_DIR);
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
    expect(workItem.fields['System.State']).toBe('New');
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
    await fs.writeJson(
      path.join(TEST_SPECWEAVE_DIR, 'increments', TEST_INCREMENT_ID, 'increment-metadata.json'),
      metadata,
      { spaces: 2 }
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

    // Update state to Active
    const updatedWorkItem = await adoClient.updateWorkItem(workItemId, {
      state: 'Active',
    });

    expect(updatedWorkItem).toBeDefined();
    expect(updatedWorkItem.fields['System.State']).toBe('Active');
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

    // Close work item
    const closedWorkItem = await adoClient.updateWorkItem(workItemId, {
      state: 'Closed',
    });

    expect(closedWorkItem).toBeDefined();
    expect(closedWorkItem.fields['System.State']).toBe('Closed');
  });

  test('should handle error when PAT is invalid', async () => {
    const invalidClient = createAdoClient({
      organization: process.env.ADO_ORGANIZATION!,
      project: process.env.ADO_PROJECT!,
      personalAccessToken: 'invalid-token',
    });

    await expect(
      invalidClient.createWorkItem({ title: 'Test' })
    ).rejects.toThrow(/ADO API error: 401/);
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
      organization: process.env.ADO_ORGANIZATION!,
      project: process.env.ADO_PROJECT!,
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
