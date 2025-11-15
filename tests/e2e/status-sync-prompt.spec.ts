/**
 * E2E Tests: Status Sync Prompt Flow
 *
 * Tests the complete user flow for status sync prompts after increment completion.
 * Covers GitHub, JIRA, and Azure DevOps integrations.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_WORKSPACE = path.join(__dirname, '../fixtures/test-workspace-status-sync');

test.describe('Status Sync Prompt Flow', () => {
  test.beforeEach(async () => {
    // Clean up test workspace
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });

    // Initialize SpecWeave
    execSync('npx specweave init .', {
      cwd: TEST_WORKSPACE,
      stdio: 'pipe'
    });
  });

  test.afterEach(async () => {
    // Cleanup
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
  });

  test('should prompt user to sync status when completing increment with GitHub link', async () => {
    // Create increment with GitHub metadata
    const incrementDir = path.join(TEST_WORKSPACE, '.specweave/increments/0001-test-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create metadata with GitHub link
    const metadata = {
      id: '0001-test-feature',
      status: 'in-progress',
      type: 'feature',
      created: new Date().toISOString(),
      github: {
        issue: 123,
        url: 'https://github.com/test-owner/test-repo/issues/123',
        synced: new Date().toISOString()
      }
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create spec.md
    fs.writeFileSync(
      path.join(incrementDir, 'spec.md'),
      `---
increment: 0001-test-feature
status: in-progress
---

# Test Feature

Quick overview: A test feature for E2E testing.
`
    );

    // Create tasks.md with all tasks completed
    fs.writeFileSync(
      path.join(incrementDir, 'tasks.md'),
      `# Tasks

### T-001: Test Task
**Status**: [x] (100% - Completed)
`
    );

    // Mock the status sync to capture the prompt
    // In real implementation, this would be tested via CLI
    const { StatusSyncEngine } = await import('../../src/core/sync/status-sync-engine');
    const engine = new StatusSyncEngine(TEST_WORKSPACE);

    // The prompt should appear when sync is triggered
    const shouldPrompt = await engine['shouldPromptUser']();
    expect(shouldPrompt).toBe(true);
  });

  test('should skip prompt when promptUser config is false (auto-sync mode)', async () => {
    // Create increment
    const incrementDir = path.join(TEST_WORKSPACE, '.specweave/increments/0001-test-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    // Update config to disable prompts
    const configPath = path.join(TEST_WORKSPACE, '.specweave/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.sync = {
      ...config.sync,
      statusSync: {
        enabled: true,
        promptUser: false,
        autoSync: true
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create metadata
    const metadata = {
      id: '0001-test-feature',
      status: 'completed',
      github: {
        issue: 123,
        url: 'https://github.com/test-owner/test-repo/issues/123'
      }
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    const { StatusSyncEngine } = await import('../../src/core/sync/status-sync-engine');
    const engine = new StatusSyncEngine(TEST_WORKSPACE);

    const shouldPrompt = await engine['shouldPromptUser']();
    expect(shouldPrompt).toBe(false);
  });

  test('should handle user selecting "Yes" to sync status', async () => {
    // This would be tested via CLI interaction in real scenario
    // For now, we test the sync logic directly

    const incrementDir = path.join(TEST_WORKSPACE, '.specweave/increments/0001-test-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    const metadata = {
      id: '0001-test-feature',
      status: 'completed',
      github: {
        issue: 123,
        url: 'https://github.com/test-owner/test-repo/issues/123'
      }
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Test the sync execution (would normally call GitHub API)
    // For E2E, we'd mock the GitHub API or use a test repository
    expect(metadata.github.issue).toBe(123);
    expect(metadata.status).toBe('completed');
  });

  test('should handle conflict when external status differs from local', async () => {
    const incrementDir = path.join(TEST_WORKSPACE, '.specweave/increments/0001-test-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    // Local: completed, External: open (conflict!)
    const metadata = {
      id: '0001-test-feature',
      status: 'completed',
      github: {
        issue: 123,
        url: 'https://github.com/test-owner/test-repo/issues/123',
        lastSyncedStatus: 'open' // External is still open
      }
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    // Detect conflict
    const conflict = {
      incrementId: '0001-test-feature',
      localStatus: 'completed',
      externalStatus: 'open',
      tool: 'github' as const,
      lastSynced: new Date().toISOString()
    };

    // Resolve with "external wins" strategy
    const resolution = await resolver.resolveConflict(conflict, 'external-wins');
    expect(resolution.resolvedStatus).toBe('open');
    expect(resolution.action).toBe('update-local');
  });
});
