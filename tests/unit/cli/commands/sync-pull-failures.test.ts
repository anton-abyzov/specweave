import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const mocks = vi.hoisted(() => ({ ado: vi.fn(), jira: vi.fn(), github: vi.fn(), githubCtor: vi.fn(), detectRepo: vi.fn() }));
vi.mock('../../../../src/integrations/ado/ado-client.js', () => ({ AdoClient: class { fetchRecentChanges = mocks.ado; } }));
vi.mock('../../../../src/integrations/jira/jira-client.js', () => ({ JiraClient: class { fetchRecentChanges = mocks.jira; } }));
vi.mock('../../../../plugins/specweave/lib/integrations/github/github-client-v2.js', () => ({
  GitHubClientV2: class {
    constructor(...args: unknown[]) { mocks.githubCtor(...args); }
    fetchRecentChanges = mocks.github;
    static detectRepo = mocks.detectRepo;
  },
}));
import { syncPull } from '../../../../src/cli/commands/sync.js';

let root: string;
let priorExitCode: typeof process.exitCode;
const logger = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  priorExitCode = process.exitCode; process.exitCode = 0;
  root = mkdtempSync(join(tmpdir(), 'sw-pull-failure-'));
  mkdirSync(join(root, '.specweave', 'state'), { recursive: true });
  writeFileSync(join(root, '.specweave', 'config.json'), JSON.stringify({ sync: { jira: { enabled: true }, ado: { enabled: true } } }));
  writeFileSync(join(root, '.specweave', 'state', 'sync-cursor.json'), '{"since":"2026-09-01"}');
  mocks.ado.mockResolvedValue([]); mocks.jira.mockResolvedValue([]);
  mocks.github.mockResolvedValue([]);
});
afterEach(() => { process.exitCode = priorExitCode; rmSync(root, { recursive: true, force: true }); });

describe('0877 sync pull incomplete fetch', () => {
  it('exits nonzero for failed provider and never claims no external changes', async () => {
    mocks.jira.mockRejectedValue(new Error('Jira API Error (401): unauthorized'));

    await syncPull({ provider: 'jira', since: '2026-09-01' }, { projectRoot: root, logger });

    expect(process.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/incomplete/i));
    expect(logger.log.mock.calls.some(([s]) => /No external changes/.test(s))).toBe(false);
    expect(readFileSync(join(root, '.specweave', 'state', 'sync-cursor.json'), 'utf8')).toBe('{"since":"2026-09-01"}');
  });

  it('prints successful provider changes with an incomplete status when another fails', async () => {
    mocks.ado.mockResolvedValue([{
      externalId: 'ADO-42', changedAt: '2026-09-10T00:00:00Z', changedBy: 'owner', changedFields: [],
      currentState: { status: 'Active', priority: 1, assignee: null },
    }]);
    mocks.jira.mockRejectedValue(new Error('Jira unreachable'));

    await syncPull({ since: '2026-09-01' }, { projectRoot: root, logger });

    expect(process.exitCode).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('ADO-42'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/incomplete/i));
    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/partial/i));
  });

  it('reports no changes only after every requested provider succeeds', async () => {
    await syncPull({ provider: 'jira', since: '2026-09-01' }, { projectRoot: root, logger });
    expect(process.exitCode).toBe(0);
    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/No external changes/));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('routes a GitHub pull to the configured tracker repository', async () => {
    writeFileSync(join(root, '.specweave', 'config.json'), JSON.stringify({
      sync: { github: { owner: 'tracker-org', repo: 'requests', token: 'test-token' } },
    }));

    await syncPull({ provider: 'github' }, { projectRoot: root, logger });

    expect(mocks.detectRepo).not.toHaveBeenCalled();
    expect(mocks.githubCtor).toHaveBeenCalledWith(expect.objectContaining({
      config: { owner: 'tracker-org', repo: 'requests', token: 'test-token' },
    }), root);
    expect(process.exitCode).toBe(0);
  });
});
