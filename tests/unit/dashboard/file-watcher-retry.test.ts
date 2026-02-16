/**
 * Unit Test: FileWatcher - Late File Detection (Retry)
 *
 * Tests that FileWatcher retries watching files that don't exist
 * at startup, picking them up once they're created.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { FileWatcher } from '../../../src/dashboard/server/file-watcher.js';
import type { WatchEvent } from '../../../src/dashboard/server/file-watcher.js';

describe('FileWatcher - Late File Detection', () => {
  let tempDir: string;
  let watcher: FileWatcher | null;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    tempDir = path.join(tmpdir(), `specweave-fw-retry-${Date.now()}`);
    // Create minimal directory structure (but NOT the state files)
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
    watcher = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (watcher) {
      watcher.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should start without error when watched files do not exist', () => {
    const events: WatchEvent[] = [];
    // dashboard.json doesn't exist yet — should not throw
    expect(() => {
      watcher = new FileWatcher(tempDir, (e) => events.push(e), 50);
    }).not.toThrow();
  });

  it('should pick up files created after startup on retry', async () => {
    vi.useRealTimers(); // Need real timers for fs.watch to fire

    const events: WatchEvent[] = [];
    // Start watcher with nothing to watch (files don't exist)
    watcher = new FileWatcher(tempDir, (e) => events.push(e), 50);

    // Create the file after a short delay
    const dashPath = path.join(tempDir, '.specweave', 'state', 'dashboard.json');
    fs.writeFileSync(dashPath, JSON.stringify({ status: 'initial' }));

    // Manually trigger retry (simulating the 30s interval firing)
    // Access the private method via any cast — acceptable in tests
    (watcher as any).retryMissingFiles();

    // Now modify the file
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(dashPath, JSON.stringify({ status: 'updated' }));

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should have received an increment-update event
    const incrementEvents = events.filter(e => e.type === 'increment-update');
    expect(incrementEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should clear retry interval on close', () => {
    const events: WatchEvent[] = [];
    watcher = new FileWatcher(tempDir, (e) => events.push(e), 50);

    // Close should not throw
    expect(() => watcher!.close()).not.toThrow();

    // Calling close again should be safe
    expect(() => watcher!.close()).not.toThrow();
    watcher = null;
  });

  it('should not re-watch already watched files', () => {
    vi.useRealTimers();

    // Create a file upfront so it gets watched at startup
    const configPath = path.join(tempDir, '.specweave', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ version: '1.0' }));

    const events: WatchEvent[] = [];
    watcher = new FileWatcher(tempDir, (e) => events.push(e), 50);

    // Retry should be a no-op for already-watched files
    const watchedBefore = (watcher as any).watchedFiles.size;
    (watcher as any).retryMissingFiles();
    const watchedAfter = (watcher as any).watchedFiles.size;

    expect(watchedAfter).toBe(watchedBefore);
  });
});
