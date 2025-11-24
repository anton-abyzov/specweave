/**
 * Test: User-Facing Gate Messages (T-004)
 *
 * Validates that SyncCoordinator logs clear, actionable messages when
 * permission gates block sync operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs, mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';

// Mock GitHubClientV2 to avoid import issues with execFileNoThrow
vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: {
    fromRepo: vi.fn(() => ({
      createOrGetMilestone: vi.fn(),
      searchIssueByTitle: vi.fn(),
      createUserStoryIssue: vi.fn()
    }))
  }
}));

// Import after mocking
const { SyncCoordinator } = await import('../../../src/sync/sync-coordinator.js');

describe('SyncCoordinator User Messages', () => {
  let mockLogger: any;
  let tempDir: string;
  let coordinator: SyncCoordinator;

  beforeEach(() => {
    // Create temp directory
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));

    // Create required directory structure
    const incrementDir = path.join(tempDir, '.specweave/increments/0051-test');
    mkdirSync(incrementDir, { recursive: true });

    // Create spec.md with feature_id
    const specContent = `---
increment: 0051-test
feature_id: FS-049
---

# Test Increment
`;
    writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Create metadata.json
    const metadata = {
      id: '0051-test',
      status: 'active',
      feature_id: 'FS-049'
    };
    writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create config directory
    mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });

    // Setup mock logger
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };

    // Create coordinator
    coordinator = new SyncCoordinator({
      projectRoot: tempDir,
      incrementId: '0051-test',
      logger: mockLogger
    });
  });

  it('logs clear message when GATE 1 blocks sync', async () => {
    // Setup: GATE 1 disabled
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: false
        }
      }
    };
    writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Living docs sync disabled (canUpsertInternalItems=false)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('read-only mode')
    );
  });

  it('logs clear message when GATE 2 blocks sync', async () => {
    // Setup: GATE 1 enabled, GATE 2 disabled
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: false
        }
      }
    };
    writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('External tool sync disabled (canUpdateExternalItems=false)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Living docs will be updated')
    );
  });

  it('logs clear message when GATE 3 blocks sync', async () => {
    // Setup: GATE 1 & 2 enabled, GATE 3 disabled
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: false
        },
        github: {
          enabled: true,
          owner: 'test-org',
          repo: 'test-repo'
        }
      }
    };
    writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Automatic external sync disabled (autoSyncOnCompletion=false)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Run /specweave-github:sync')
    );
  });

  it('logs clear message when GATE 4 blocks sync', async () => {
    // Setup: GATE 1, 2, 3 enabled, GATE 4 disabled
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: {
          enabled: false,
          owner: 'test-org',
          repo: 'test-repo'
        }
      }
    };
    writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('GitHub sync disabled (sync.github.enabled=false)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Set sync.github.enabled=true')
    );
  });

  it('logs success message when all gates pass', async () => {
    // Setup: All gates enabled
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: {
          enabled: true,
          owner: 'test-org',
          repo: 'test-repo'
        }
      }
    };
    writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create living docs structure
    const featureDir = path.join(tempDir, '.specweave/docs/internal/specs/specweave/FS-049');
    mkdirSync(featureDir, { recursive: true });

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Living docs sync enabled (canUpsertInternalItems=true)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('External tool sync enabled (canUpdateExternalItems=true)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Automatic external sync enabled (autoSyncOnCompletion=true)')
    );
  });
});
