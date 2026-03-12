import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SyncResilienceAuditLogger, ResilienceAuditEntry } from '../../../../src/core/sync/sync-resilience-audit-logger.js';

describe('SyncResilienceAuditLogger', () => {
  let tempDir: string;
  let logger: SyncResilienceAuditLogger;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-audit-test-'));
    logger = new SyncResilienceAuditLogger({ statePath: tempDir });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('append writes valid JSONL line', async () => {
    await logger.append({
      incrementId: '0499-test',
      provider: 'github',
      outcome: 'failure',
      error: 'API rate limit exceeded',
      durationMs: 1500,
    });

    const filePath = path.join(tempDir, 'sync-audit.jsonl');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const entry = JSON.parse(content) as ResilienceAuditEntry;
    expect(entry.incrementId).toBe('0499-test');
    expect(entry.provider).toBe('github');
    expect(entry.outcome).toBe('failure');
    expect(entry.error).toBe('API rate limit exceeded');
    expect(entry.durationMs).toBe(1500);
    expect(entry.timestamp).toBeDefined();
  });

  it('append adds multiple entries as separate lines', async () => {
    await logger.append({
      incrementId: '0499-test',
      provider: 'github',
      outcome: 'success',
      durationMs: 500,
    });
    await logger.append({
      incrementId: '0499-test',
      provider: 'jira',
      outcome: 'failure',
      error: 'Connection refused',
    });

    const filePath = path.join(tempDir, 'sync-audit.jsonl');
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const entry1 = JSON.parse(lines[0]);
    const entry2 = JSON.parse(lines[1]);
    expect(entry1.provider).toBe('github');
    expect(entry2.provider).toBe('jira');
  });

  it('rotate at 5MB renames file', async () => {
    const filePath = path.join(tempDir, 'sync-audit.jsonl');

    // Create a file just over 5MB
    const bigContent = 'x'.repeat(5 * 1024 * 1024 + 1);
    fs.writeFileSync(filePath, bigContent);

    // Append should trigger rotation
    await logger.append({
      incrementId: '0499-test',
      provider: 'github',
      outcome: 'success',
    });

    // Old file should be rotated
    const rotatedPath = path.join(tempDir, 'sync-audit.jsonl.1');
    expect(fs.existsSync(rotatedPath)).toBe(true);

    // New file should contain only the new entry
    const newContent = fs.readFileSync(filePath, 'utf-8').trim();
    const entry = JSON.parse(newContent);
    expect(entry.provider).toBe('github');
  });

  it('readRecent filters by time window', async () => {
    // Write an old entry manually
    const filePath = path.join(tempDir, 'sync-audit.jsonl');
    const oldEntry = {
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      incrementId: 'old-inc',
      provider: 'github',
      outcome: 'failure',
      error: 'old error',
    };
    fs.writeFileSync(filePath, JSON.stringify(oldEntry) + '\n');

    // Write a recent entry
    await logger.append({
      incrementId: 'new-inc',
      provider: 'jira',
      outcome: 'success',
    });

    // Read last 24 hours
    const recent = await logger.readRecent(24);
    expect(recent).toHaveLength(1);
    expect(recent[0].incrementId).toBe('new-inc');
  });

  it('readRecent returns empty array when file does not exist', async () => {
    const freshLogger = new SyncResilienceAuditLogger({
      statePath: path.join(tempDir, 'nonexistent'),
    });
    const entries = await freshLogger.readRecent(24);
    expect(entries).toEqual([]);
  });

  it('append creates directory on demand', async () => {
    const nestedPath = path.join(tempDir, 'nested', 'state');
    const nestedLogger = new SyncResilienceAuditLogger({ statePath: nestedPath });

    await nestedLogger.append({
      incrementId: '0499-test',
      provider: 'ado',
      outcome: 'success',
    });

    const filePath = path.join(nestedPath, 'sync-audit.jsonl');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
