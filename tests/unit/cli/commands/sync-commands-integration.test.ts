/**
 * Integration tests for sync CLI commands — graceful missing-file guards.
 *
 * Verifies that sync-retry, sync-gaps, and sync-status handle
 * missing state directories and files without crashing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncRetryCommand } from '../../../../src/cli/commands/sync-retry.js';
import { syncGapsCommand } from '../../../../src/cli/commands/sync-gaps.js';
import { syncStatusCommand } from '../../../../src/cli/commands/sync-status.js';

describe('Sync CLI Commands — missing-file guards (T-013)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-integration-'));
    // Create minimal .specweave dir but NO state/ dir
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('sync-retry exits gracefully with no queue file', async () => {
    const result = await syncRetryCommand(tempDir, {});
    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('sync-gaps exits gracefully with no increments directory', async () => {
    // No config = no configured providers = no gaps
    const result = await syncGapsCommand(tempDir, {});
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('sync-gaps exits gracefully with empty increments directory', async () => {
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ sync: { github: { owner: 'test', repo: 'test' } } }),
    );
    const result = await syncGapsCommand(tempDir, {});
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('sync-status exits gracefully with no state directory', async () => {
    const result = await syncStatusCommand(tempDir);
    expect(result.retryQueuePending).toBe(0);
    expect(result.retryQueueFailed).toBe(0);
    expect(result.recentErrors).toBe(0);
    expect(result.exitCode).toBe(0);
  });
});
