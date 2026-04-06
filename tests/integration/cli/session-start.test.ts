import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sessionStartCommand } from '../../../src/cli/commands/session.js';

describe('integration: session start', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-int-session-start-'));
    projectRoot = tmpDir;
    stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0' }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001: stale files cleaned, fresh untouched
  it('should clean stale auto-mode files and leave fresh ones untouched', async () => {
    const autoFile = path.join(stateDir, 'auto-mode.json');
    fs.writeFileSync(autoFile, '{}');
    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    fs.utimesSync(autoFile, staleTime, staleTime);

    // Create a fresh file that should survive
    const freshFile = path.join(stateDir, 'other.json');
    fs.writeFileSync(freshFile, '{}');

    const result = await sessionStartCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(autoFile)).toBe(false);
    expect(fs.existsSync(freshFile)).toBe(true);
  });

  // TC-002: multiple session IDs create independent dirs
  it('should create independent session directories', async () => {
    await sessionStartCommand({ projectRoot, sessionId: 's1', silent: true });
    await sessionStartCommand({ projectRoot, sessionId: 's2', silent: true });

    expect(fs.existsSync(path.join(stateDir, 'sessions', 's1'))).toBe(true);
    expect(fs.existsSync(path.join(stateDir, 'sessions', 's2'))).toBe(true);
  });

  // TC-003: idempotency — running twice succeeds
  it('should be idempotent — running twice does not corrupt state', async () => {
    const result1 = await sessionStartCommand({ projectRoot, silent: true });
    const result2 = await sessionStartCommand({ projectRoot, silent: true });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // prompt-health.json should exist after both runs
    expect(fs.existsSync(path.join(stateDir, 'prompt-health.json'))).toBe(true);
  });

  it('should create state directory from scratch', async () => {
    // Remove existing state dir
    fs.rmSync(stateDir, { recursive: true, force: true });

    const result = await sessionStartCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(stateDir)).toBe(true);
    expect(fs.existsSync(path.join(stateDir, 'prompt-health.json'))).toBe(true);
  });
});
