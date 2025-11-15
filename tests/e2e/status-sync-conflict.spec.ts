/**
 * E2E Tests: Status Sync Conflict Resolution
 *
 * Tests conflict detection and resolution when local and external statuses diverge.
 * Covers all conflict resolution strategies.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_WORKSPACE = path.join(__dirname, '../fixtures/test-workspace-conflicts');

test.describe('Status Sync Conflict Resolution E2E', () => {
  test.beforeEach(async () => {
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });

    execSync('npx specweave init .', {
      cwd: TEST_WORKSPACE,
      stdio: 'pipe'
    });
  });

  test.afterEach(async () => {
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
  });

  test('should detect conflict: local=completed, external=open', async () => {
    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    const conflict = {
      incrementId: '0001-test',
      localStatus: 'completed',
      externalStatus: 'open',
      tool: 'github' as const,
      lastSynced: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    };

    const hasConflict = resolver.detectConflict('completed', 'open');
    expect(hasConflict).toBe(true);
  });

  test('should resolve conflict with "local-wins" strategy', async () => {
    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    const conflict = {
      incrementId: '0001-test',
      localStatus: 'completed',
      externalStatus: 'open',
      tool: 'github' as const,
      lastSynced: new Date().toISOString()
    };

    const resolution = await resolver.resolveConflict(conflict, 'local-wins');

    expect(resolution.resolvedStatus).toBe('completed');
    expect(resolution.action).toBe('update-external');
    expect(resolution.strategy).toBe('local-wins');
  });

  test('should resolve conflict with "external-wins" strategy', async () => {
    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    const conflict = {
      incrementId: '0001-test',
      localStatus: 'in-progress',
      externalStatus: 'closed',
      tool: 'github' as const,
      lastSynced: new Date().toISOString()
    };

    const resolution = await resolver.resolveConflict(conflict, 'external-wins');

    expect(resolution.resolvedStatus).toBe('closed');
    expect(resolution.action).toBe('update-local');
    expect(resolution.strategy).toBe('external-wins');
  });

  test('should resolve conflict with "prompt-user" strategy', async () => {
    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    const conflict = {
      incrementId: '0001-test',
      localStatus: 'completed',
      externalStatus: 'in-progress',
      tool: 'jira' as const,
      lastSynced: new Date().toISOString()
    };

    // In real E2E, this would prompt the user via CLI
    // For testing, we verify the prompt logic exists
    const resolution = await resolver.resolveConflict(conflict, 'prompt-user');

    expect(resolution.strategy).toBe('prompt-user');
    expect(['completed', 'in-progress']).toContain(resolution.resolvedStatus);
  });

  test('should log conflict resolution to event log', async () => {
    const incrementDir = path.join(TEST_WORKSPACE, '.specweave/increments/0001-test');
    fs.mkdirSync(incrementDir, { recursive: true });

    const metadata = {
      id: '0001-test',
      status: 'completed',
      github: {
        issue: 111,
        url: 'https://github.com/test/repo/issues/111',
        lastSyncedStatus: 'open'
      }
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    const { SyncEventLogger } = await import('../../src/core/sync/sync-event-logger');
    const logger = new SyncEventLogger(TEST_WORKSPACE);

    // Log conflict event
    await logger.logConflictEvent({
      incrementId: '0001-test',
      tool: 'github',
      localStatus: 'completed',
      externalStatus: 'open',
      resolvedStatus: 'completed',
      strategy: 'local-wins',
      timestamp: new Date().toISOString()
    });

    // Verify event was logged
    const logPath = path.join(TEST_WORKSPACE, '.specweave/logs/sync-events.json');
    expect(fs.existsSync(logPath)).toBe(true);

    const events = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].type).toBe('conflict');
  });

  test('should handle multiple conflicts in batch sync', async () => {
    // Create multiple increments with conflicts
    for (let i = 1; i <= 3; i++) {
      const incrementDir = path.join(TEST_WORKSPACE, `.specweave/increments/000${i}-test`);
      fs.mkdirSync(incrementDir, { recursive: true });

      const metadata = {
        id: `000${i}-test`,
        status: 'completed',
        github: {
          issue: 100 + i,
          url: `https://github.com/test/repo/issues/${100 + i}`,
          lastSyncedStatus: 'open' // All have conflicts
        }
      };
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    }

    const { ConflictResolver } = await import('../../src/core/sync/conflict-resolver');
    const resolver = new ConflictResolver();

    // Resolve all conflicts with same strategy
    const conflicts = [
      { incrementId: '0001-test', localStatus: 'completed', externalStatus: 'open', tool: 'github' as const, lastSynced: new Date().toISOString() },
      { incrementId: '0002-test', localStatus: 'completed', externalStatus: 'open', tool: 'github' as const, lastSynced: new Date().toISOString() },
      { incrementId: '0003-test', localStatus: 'completed', externalStatus: 'open', tool: 'github' as const, lastSynced: new Date().toISOString() }
    ];

    const resolutions = await Promise.all(
      conflicts.map(c => resolver.resolveConflict(c, 'local-wins'))
    );

    expect(resolutions).toHaveLength(3);
    resolutions.forEach(res => {
      expect(res.resolvedStatus).toBe('completed');
      expect(res.strategy).toBe('local-wins');
    });
  });
});
