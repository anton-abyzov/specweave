/**
 * Unit Test: FileWatcher - Prompt Health Watch Targets
 *
 * Tests that FileWatcher watches prompt-health.json and
 * prompt-health-alert.json, emitting error-detected SSE events.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { FileWatcher } from '../../../src/dashboard/server/file-watcher.js';
import type { WatchEvent } from '../../../src/dashboard/server/file-watcher.js';

describe('FileWatcher - Prompt Health Events', () => {
  let tempDir: string;
  let watcher: FileWatcher | null;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-fw-test-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    watcher = null;
  });

  afterEach(() => {
    if (watcher) {
      watcher.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should emit error-detected when prompt-health.json changes', async () => {
    // Create the file first so FileWatcher can watch it
    const healthPath = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    fs.writeFileSync(healthPath, JSON.stringify({ baseline: 50000 }));

    const events: WatchEvent[] = [];
    watcher = new FileWatcher(tempDir, (event) => events.push(event), 50);

    // Wait for watcher setup
    await new Promise((r) => setTimeout(r, 100));

    // Modify the file
    fs.writeFileSync(healthPath, JSON.stringify({ baseline: 90000 }));

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 500));

    const errorEvents = events.filter((e) => e.type === 'error-detected');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should emit error-detected when prompt-health-alert.json changes', async () => {
    // Create the file first
    const alertPath = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    fs.writeFileSync(alertPath, JSON.stringify({ level: 'elevated' }));

    const events: WatchEvent[] = [];
    watcher = new FileWatcher(tempDir, (event) => events.push(event), 50);

    // Wait for watcher setup
    await new Promise((r) => setTimeout(r, 100));

    // Modify the file
    fs.writeFileSync(alertPath, JSON.stringify({ level: 'emergency' }));

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 500));

    const errorEvents = events.filter((e) => e.type === 'error-detected');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  });
});
