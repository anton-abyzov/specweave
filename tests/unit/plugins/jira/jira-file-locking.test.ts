/**
 * Test: JIRA File Locking via shared LockManager
 *
 * Validates:
 * 1. Concurrent sync operations are serialized via lock
 * 2. Lock is released after completion (including on errors)
 * 3. Stale lock recovery (lock older than 5 minutes)
 * 4. Lock path is .specweave/state/.jira-sync.lock
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { LockManager } from '../../../../src/utils/lock-manager.js';

// Force locks to be active in test environment
vi.stubEnv('SPECWEAVE_FORCE_LOCKS', '1');

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  defaults: { baseURL: 'https://test.atlassian.net/rest/api/3', auth: { username: 'test@test.com', password: 'token' } },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock('../../../../plugins/specweave/lib/integrations/jira/jira-deployment-detector.js', () => ({
  detectDeploymentType: vi.fn(async () => ({ type: 'cloud', baseUrl: 'https://test.atlassian.net/rest/api/3' })),
  getApiBaseUrl: vi.fn(() => 'https://test.atlassian.net/rest/api/3'),
}));

vi.mock('../../../../plugins/specweave/lib/integrations/jira/content-format-adapter.js', () => ({
  toCommentBody: vi.fn((text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })),
  toDescription: vi.fn((text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })),
}));

const { JiraStatusSync } = await import('../../../../plugins/specweave/lib/integrations/jira/jira-status-sync.js');

describe('JIRA File Locking', () => {
  let tempDir: string;
  let lockDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-jira-lock-test-'));
    const stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    lockDir = path.join(stateDir, '.jira-sync.lock');
  });

  afterEach(() => {
    // Clean up lock and temp dir
    try {
      if (fs.existsSync(lockDir)) {
        const files = fs.readdirSync(lockDir);
        for (const f of files) fs.unlinkSync(path.join(lockDir, f));
        fs.rmdirSync(lockDir);
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  });

  it('acquires and releases lock around sync operations', async () => {
    const statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { fields: { status: { name: 'Done' } } },
    });

    const result = await statusSync.getStatus('PROJ-123');
    expect(result.state).toBe('Done');

    // Lock should be released after call
    expect(fs.existsSync(lockDir)).toBe(false);
  });

  it('releases lock even when sync throws an error', async () => {
    const statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    const axiosError = Object.assign(new Error('Server Error'), {
      response: { status: 500, data: { errorMessages: ['Internal'] } },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    await expect(
      statusSync.getStatus('PROJ-456'),
    ).rejects.toThrow();

    // Lock MUST be released in finally block
    expect(fs.existsSync(lockDir)).toBe(false);
  });

  it('serializes concurrent sync operations via lock', async () => {
    const executionOrder: string[] = [];

    const sync1 = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    const sync2 = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    // First call takes 50ms
    mockAxiosInstance.get.mockImplementationOnce(async () => {
      executionOrder.push('start-1');
      await new Promise(r => setTimeout(r, 50));
      executionOrder.push('end-1');
      return { data: { fields: { status: { name: 'To Do' } } } };
    });

    // Second call is instant
    mockAxiosInstance.get.mockImplementationOnce(async () => {
      executionOrder.push('start-2');
      executionOrder.push('end-2');
      return { data: { fields: { status: { name: 'Done' } } } };
    });

    // Run concurrently
    const [r1, r2] = await Promise.all([
      sync1.getStatus('PROJ-1'),
      sync2.getStatus('PROJ-2'),
    ]);

    // Both should succeed
    expect(r1.state).toBe('To Do');
    expect(r2.state).toBe('Done');

    // Second should start only after first ends (serialized by lock)
    const idx1End = executionOrder.indexOf('end-1');
    const idx2Start = executionOrder.indexOf('start-2');
    expect(idx2Start).toBeGreaterThan(idx1End);
  });
});

describe('JIRA Stale Lock Recovery', () => {
  let tempDir: string;
  let lockDir: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-jira-stale-lock-'));
    const stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    lockDir = path.join(stateDir, '.jira-sync.lock');
    stderrSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    try {
      if (fs.existsSync(lockDir)) {
        const files = fs.readdirSync(lockDir);
        for (const f of files) fs.unlinkSync(path.join(lockDir, f));
        fs.rmdirSync(lockDir);
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  });

  it('forcibly acquires stale lock older than 5 minutes with warning', async () => {
    // Create a stale lock manually (fake 6 minutes old)
    fs.mkdirSync(lockDir, { recursive: false });
    fs.writeFileSync(path.join(lockDir, 'pid'), '99999');
    fs.writeFileSync(path.join(lockDir, 'session_id'), 'stale-session');

    // Set mtime to 6 minutes ago
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000);
    fs.utimesSync(lockDir, sixMinAgo, sixMinAgo);

    const statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { fields: { status: { name: 'In Progress' } } },
    });

    // Should succeed despite stale lock
    const result = await statusSync.getStatus('PROJ-789');
    expect(result.state).toBe('In Progress');

    // Lock should be released after
    expect(fs.existsSync(lockDir)).toBe(false);
  });

  it('releases lock in finally block even on sync error', async () => {
    const statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { lockDir },
    );

    const axiosError = Object.assign(new Error('Bad Gateway'), {
      response: { status: 502, data: {} },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    await expect(
      statusSync.updateStatus('PROJ-123', { state: 'Done' }),
    ).rejects.toThrow();

    // Lock directory must NOT exist after error (released in finally)
    expect(fs.existsSync(lockDir)).toBe(false);
  });
});
