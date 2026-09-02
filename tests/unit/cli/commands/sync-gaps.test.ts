import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectSyncGaps } from '../../../../src/cli/commands/sync-gaps.js';

describe('detectSyncGaps', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-gaps-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  function writeConfig(providers: { github?: boolean; jira?: boolean; ado?: boolean }) {
    const config: any = { sync: {} };
    if (providers.github) config.sync.github = { owner: 'test', repo: 'test' };
    if (providers.jira) config.sync.jira = { host: 'test.atlassian.net', project: 'TEST' };
    if (providers.ado) config.sync.ado = { org: 'test', project: 'Test' };
    fs.writeFileSync(path.join(tempDir, '.specweave', 'config.json'), JSON.stringify(config));
  }

  function writeIncrement(id: string, meta: any) {
    const dir = path.join(tempDir, '.specweave', 'increments', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta));
  }

  it('returns empty when no providers configured', async () => {
    fs.writeFileSync(path.join(tempDir, '.specweave', 'config.json'), '{}');
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toEqual([]);
  });

  it('returns empty when all increments fully synced', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0001-test', {
      id: '0001-test',
      status: 'active',
      externalLinks: { github: { url: 'https://github.com' }, jira: { key: 'TEST-1' } },
    });
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toEqual([]);
  });

  it('detects gaps when increment missing a provider', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0001-gap', {
      id: '0001-gap',
      status: 'active',
      externalLinks: { github: { url: 'https://github.com' } },
    });
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].incrementId).toBe('0001-gap');
    expect(gaps[0].missingProviders).toContain('jira');
    expect(gaps[0].syncedProviders).toEqual(['github']);
  });

  it('reports every missing provider for an unsynced increment', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0002-none', {
      id: '0002-none',
      status: 'in-progress',
      externalLinks: {},
    });
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].missingProviders).toEqual(['github', 'jira']);
  });

  it('skips non-active increments', async () => {
    writeConfig({ github: true });
    writeIncrement('0004-completed', {
      id: '0004-completed',
      status: 'completed',
      externalLinks: {},
    });
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toEqual([]);
  });

  it('exits 0 when no gaps', async () => {
    writeConfig({ github: true });
    // No increments
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toEqual([]);
  });

  it('gracefully handles missing config', async () => {
    // No config file at all
    const gaps = await detectSyncGaps(tempDir);
    expect(gaps).toEqual([]);
  });
});
