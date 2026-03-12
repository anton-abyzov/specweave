import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncGapsCommand } from '../../../../src/cli/commands/sync-gaps.js';

describe('syncGapsCommand', () => {
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
    const result = await syncGapsCommand(tempDir);
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('returns empty when all increments fully synced', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0001-test', {
      id: '0001-test',
      status: 'active',
      externalLinks: { github: { url: 'https://github.com' }, jira: { key: 'TEST-1' } },
    });
    const result = await syncGapsCommand(tempDir);
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('detects gaps when increment missing a provider', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0001-gap', {
      id: '0001-gap',
      status: 'active',
      externalLinks: { github: { url: 'https://github.com' } },
    });
    const result = await syncGapsCommand(tempDir);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].incrementId).toBe('0001-gap');
    expect(result.gaps[0].missingProviders).toContain('jira');
    expect(result.exitCode).toBe(1);
  });

  it('outputs JSON with --json flag', async () => {
    writeConfig({ github: true });
    writeIncrement('0002-json', {
      id: '0002-json',
      status: 'in-progress',
      externalLinks: {},
    });
    const logSpy = vi.spyOn(console, 'log');
    const result = await syncGapsCommand(tempDir, { json: true });
    expect(result.gaps).toHaveLength(1);
    // Verify JSON was logged
    const jsonOutput = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].startsWith('['),
    );
    expect(jsonOutput).toBeTruthy();
    const parsed = JSON.parse(jsonOutput![0] as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].incrementId).toBe('0002-json');
  });

  it('calls fixFn for each gap with --fix', async () => {
    writeConfig({ github: true, jira: true });
    writeIncrement('0003-fix', {
      id: '0003-fix',
      status: 'active',
      externalLinks: { github: { url: 'https://github.com' } },
    });
    const fixFn = vi.fn().mockResolvedValue(undefined);
    const result = await syncGapsCommand(tempDir, { fix: true }, { fixFn });
    expect(fixFn).toHaveBeenCalledWith('0003-fix', 'jira');
    expect(result.fixed).toBe(1);
  });

  it('skips non-active increments', async () => {
    writeConfig({ github: true });
    writeIncrement('0004-completed', {
      id: '0004-completed',
      status: 'completed',
      externalLinks: {},
    });
    const result = await syncGapsCommand(tempDir);
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 when no gaps', async () => {
    writeConfig({ github: true });
    // No increments
    const result = await syncGapsCommand(tempDir);
    expect(result.exitCode).toBe(0);
  });

  it('gracefully handles missing config', async () => {
    // No config file at all
    const result = await syncGapsCommand(tempDir);
    expect(result.gaps).toEqual([]);
    expect(result.exitCode).toBe(0);
  });
});
