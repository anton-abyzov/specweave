import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildPushArgs,
  readGitHubConfig,
  parseProvider,
  deprecationNotice,
  DEPRECATED_SYNC_VERBS,
  syncPush,
  syncPull,
  syncStatus,
  syncSetup,
} from '../../../../src/cli/commands/sync.js';

const silentLogger = { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as any;

describe('specweave sync — argument mapping', () => {
  it('buildPushArgs maps typed options onto sync-progress argv', () => {
    expect(buildPushArgs({})).toEqual([]);
    expect(buildPushArgs({ incrementId: '0042', dryRun: true, create: false, force: true, reconcile: true })).toEqual([
      '0042', '--dry-run', '--no-create', '--force', '--reconcile',
    ]);
  });

  it('buildPushArgs turns --provider into --no-<other> flags', () => {
    expect(buildPushArgs({ provider: 'github' })).toEqual(['--no-jira', '--no-ado']);
    expect(buildPushArgs({ provider: 'jira' })).toEqual(['--no-github', '--no-ado']);
  });

  it('parseProvider accepts aliases and rejects unknown providers', () => {
    expect(parseProvider(undefined)).toBeUndefined();
    expect(parseProvider('GitHub')).toBe('github');
    expect(parseProvider('azure-devops')).toBe('ado');
    expect(() => parseProvider('gitlab')).toThrow(/Unknown provider 'gitlab'/);
  });

  it('readGitHubConfig prefers the legacy block, then a github profile', () => {
    expect(readGitHubConfig(null)).toEqual({});
    expect(readGitHubConfig({ sync: { github: { owner: 'o', repo: 'r', token: 't' } } })).toEqual({ owner: 'o', repo: 'r', token: 't' });
    expect(readGitHubConfig({ sync: { profiles: { gh: { provider: 'github', config: { owner: 'po', repo: 'pr' } } } } })).toEqual({
      owner: 'po', repo: 'pr', token: undefined,
    });
  });

  it('every deprecated verb points at a sync/docs verb', () => {
    for (const [oldVerb, replacement] of Object.entries(DEPRECATED_SYNC_VERBS)) {
      expect(deprecationNotice(oldVerb)).toBe(`'specweave ${oldVerb}' is deprecated — use 'specweave ${replacement}'.`);
      expect(replacement).toMatch(/^(sync|docs) /);
    }
  });
});

describe('specweave sync — verbs delegate to the working code paths', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-sync-cmd-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeConfig(config: unknown) {
    fs.writeFileSync(path.join(tempDir, '.specweave', 'config.json'), JSON.stringify(config));
  }

  it('push runs sync-progress once, then drains the retry queue through the same entry point', async () => {
    writeConfig({ sync: { github: { owner: 'acme', repo: 'app', token: 'ghp_test' } } });
    const syncProgress = vi.fn().mockResolvedValue(undefined);
    const syncRetry = vi.fn(async (_root: string, _opts: unknown, deps: { syncFn: (e: { incrementId: string }) => Promise<void> }) => {
      await deps.syncFn({ incrementId: '0007' });
      return { processed: 1, succeeded: 1, failed: 0, skipped: 0, cleared: false };
    });
    await syncPush(
      { incrementId: '0042', provider: 'github' },
      { logger: silentLogger, projectRoot: tempDir, syncProgress, syncRetry: syncRetry as any, resolveLogin: () => 'octocat' },
    );
    expect(syncProgress).toHaveBeenNthCalledWith(1, ['0042', '--no-jira', '--no-ado'], { logger: silentLogger });
    expect(syncProgress).toHaveBeenNthCalledWith(2, ['0007', '--force', '--no-jira', '--no-ado'], { logger: silentLogger });
    const banner = silentLogger.log.mock.calls.map((c: unknown[]) => String(c[0])).find((l: string) => l.includes('config.json'));
    expect(banner).toContain('octocat');
    expect(banner).toContain('acme/app');
  });

  it('push --dry-run never touches the retry queue', async () => {
    writeConfig({ sync: {} });
    const syncProgress = vi.fn().mockResolvedValue(undefined);
    const syncRetry = vi.fn();
    await syncPush({ dryRun: true, provider: 'jira' }, { logger: silentLogger, projectRoot: tempDir, syncProgress, syncRetry });
    expect(syncProgress).toHaveBeenCalledWith(['--dry-run', '--no-github', '--no-ado'], { logger: silentLogger });
    expect(syncRetry).not.toHaveBeenCalled();
  });

  it('pull --create-increments delegates to the importer', async () => {
    const runImport = vi.fn().mockResolvedValue(undefined);
    await syncPull({ createIncrements: true }, { logger: silentLogger, projectRoot: tempDir, runImport });
    expect(runImport).toHaveBeenCalledWith(tempDir);
  });

  it('pull without providers explains how to set up', async () => {
    writeConfig({ sync: {} });
    const logger = { ...silentLogger, log: vi.fn() };
    await syncPull({}, { logger, projectRoot: tempDir });
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('specweave sync setup'));
  });

  it('status reports token source, account, can-push, health and gaps', async () => {
    writeConfig({ sync: { github: { owner: 'acme', repo: 'app', token: 'ghp_cfg' } } });
    const logger = { ...silentLogger, log: vi.fn() };
    const report = await syncStatus(
      {},
      {
        logger,
        projectRoot: tempDir,
        resolveLogin: () => 'octocat',
        probeCanPush: async () => false,
        runHealthChecks: async () => [{ provider: 'github', healthy: true, checks: [] } as any],
        syncStatus: async () => ({ retryQueuePending: 0, retryQueueFailed: 0, circuitBreakers: {}, recentErrors: 0, hasIssues: false, exitCode: 0 }),
        detectGaps: async () => [{ incrementId: '0042', syncedProviders: [], missingProviders: ['github'] }],
      },
    );
    expect(report.providers).toEqual(['github']);
    expect(report.github).toMatchObject({ origin: 'config', login: 'octocat', repo: 'acme/app', canPush: false });
    expect(report.gaps).toHaveLength(1);
    expect(report.hasIssues).toBe(true);
    expect(report.exitCode).toBe(1);
    const lines = logger.log.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(lines.some((l) => l.includes('has no write access to acme/app'))).toBe(true);
    expect(lines.some((l) => l.includes('specweave sync push <incrementId>'))).toBe(true);
  });

  it('status --json emits a single parsable report', async () => {
    writeConfig({ sync: { github: { owner: 'acme', repo: 'app', token: 'ghp_cfg' } } });
    const logger = { ...silentLogger, log: vi.fn() };
    const report = await syncStatus(
      { json: true, quick: true },
      {
        logger,
        projectRoot: tempDir,
        syncStatus: async () => ({ retryQueuePending: 0, retryQueueFailed: 0, circuitBreakers: {}, recentErrors: 0, hasIssues: false, exitCode: 0 }),
        detectGaps: async () => [],
      },
    );
    expect(report.exitCode).toBe(0);
    const json = logger.log.mock.calls.map((c: unknown[]) => String(c[0])).find((l) => l.startsWith('{'));
    expect(JSON.parse(json!)).toMatchObject({ providers: ['github'], hasIssues: false, github: { origin: 'config', canPush: null } });
  });

  it('status without a project exits 1', async () => {
    fs.rmSync(path.join(tempDir, '.specweave'), { recursive: true, force: true });
    const report = await syncStatus({}, { logger: silentLogger, projectRoot: tempDir });
    expect(report.exitCode).toBe(1);
  });

  it('setup runs the wizard, setup --validate runs the health check', async () => {
    const syncSetupFn = vi.fn().mockResolvedValue(undefined);
    const syncHealth = vi.fn().mockResolvedValue(2);
    expect(await syncSetup({ provider: 'github', quick: true }, { syncSetup: syncSetupFn, syncHealth })).toBe(0);
    expect(syncSetupFn).toHaveBeenCalledWith({ provider: 'github', quick: true });
    expect(await syncSetup({ validate: true, provider: 'jira' }, { syncSetup: syncSetupFn, syncHealth })).toBe(2);
    expect(syncHealth).toHaveBeenCalledWith({ provider: 'jira' });
  });
});
