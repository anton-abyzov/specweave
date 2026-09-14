import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ado: vi.fn(), jira: vi.fn(), github: vi.fn(), detectRepo: vi.fn(), githubCtor: vi.fn(),
}));
vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: class { fetchRecentChanges = mocks.ado; },
}));
vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: class { fetchRecentChanges = mocks.jira; },
}));
vi.mock('../../../plugins/specweave/lib/integrations/github/github-client-v2.js', () => ({
  GitHubClientV2: class {
    constructor(...args: unknown[]) { mocks.githubCtor(...args); }
    fetchRecentChanges = mocks.github;
    static detectRepo = mocks.detectRepo;
    static fromRepo() { return { fetchRecentChanges: mocks.github }; }
  },
}));
import { ExternalChangePuller } from '../../../src/sync/external-change-puller.js';

const logger = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const since = new Date('2026-09-01T00:00:00Z');
const change = (externalId: string, changedAt = '2026-09-10T00:00:00Z') => ({
  externalId, changedAt, changedBy: 'reviewer', changedFields: [],
  currentState: { status: 'open', priority: null, assignee: null },
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ado.mockResolvedValue([]);
  mocks.jira.mockResolvedValue([]);
  mocks.github.mockResolvedValue([]);
  mocks.detectRepo.mockResolvedValue({ owner: 'remote', repo: 'fallback' });
});

describe('0877 external pull failure honesty', () => {
  it('rejects authentication failure instead of returning a successful empty array', async () => {
    mocks.jira.mockRejectedValue(new Error('Jira API Error (401): unauthorized'));
    const puller = new ExternalChangePuller({ projectRoot: '/project', logger, platforms: ['jira'] });

    await expect(puller.fetchRecentChanges(since)).rejects.toMatchObject({
      name: 'ExternalPullError', changes: [], completedPlatforms: [],
      failures: [{ platform: 'jira', message: 'Jira API Error (401): unauthorized' }],
    });
  });

  it('retains sorted successful results when another provider fails', async () => {
    mocks.ado.mockResolvedValue([change('ADO-1', '2026-09-09T00:00:00Z')]);
    mocks.github.mockResolvedValue([change('GH-2')]);
    mocks.jira.mockRejectedValue(new Error('Jira unavailable'));
    const puller = new ExternalChangePuller({ projectRoot: '/project', logger });

    const error = await puller.fetchRecentChanges(since).catch(error => error);

    expect(error.name).toBe('ExternalPullError');
    expect(error.changes.map((c: { externalId: string }) => c.externalId)).toEqual(['GH-2', 'ADO-1']);
    expect(error.completedPlatforms).toEqual(expect.arrayContaining(['ado', 'github']));
    expect(error.failures).toEqual([{ platform: 'jira', message: 'Jira unavailable' }]);
    expect(since.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('treats missing GitHub target as incomplete, not as no changes', async () => {
    mocks.detectRepo.mockResolvedValue(null);
    const puller = new ExternalChangePuller({ projectRoot: '/project', logger, platforms: ['github'] });

    await expect(puller.fetchRecentChanges(since)).rejects.toMatchObject({
      name: 'ExternalPullError', failures: [{ platform: 'github', message: expect.stringMatching(/repository|remote/i) }],
    });
  });

  it('keeps the array success API and passes item filters unchanged', async () => {
    mocks.ado.mockResolvedValue([change('ADO-3')]);
    const puller = new ExternalChangePuller({ projectRoot: '/project', logger, platforms: ['ado'] });
    const changes = await puller.fetchRecentChanges(since, { ado: [3] });
    expect(changes).toEqual([expect.objectContaining({ platform: 'ado', externalId: 'ADO-3' })]);
    expect(mocks.ado).toHaveBeenCalledWith(since, [3]);
    expect(mocks.jira).not.toHaveBeenCalled();
  });

  it('collects every provider failure, including non-Error rejections', async () => {
    mocks.ado.mockRejectedValue('ADO unavailable');
    mocks.jira.mockRejectedValue(new Error('Jira unavailable'));
    mocks.github.mockRejectedValue(new Error('GitHub unavailable'));
    const puller = new ExternalChangePuller({ projectRoot: '/project', logger });

    await expect(puller.fetchRecentChanges(since)).rejects.toMatchObject({
      changes: [], completedPlatforms: [], failures: [
        { platform: 'ado', message: 'ADO unavailable' },
        { platform: 'github', message: 'GitHub unavailable' },
        { platform: 'jira', message: 'Jira unavailable' },
      ],
    });
  });

  it('uses explicit GitHub target and project credentials instead of another git remote', async () => {
    const puller = new ExternalChangePuller({
      projectRoot: '/configured-project', logger, platforms: ['github'],
      github: { owner: 'configured', repo: 'tracker', token: 'test-token' },
    } as any);

    await puller.fetchRecentChanges(since);

    expect(mocks.detectRepo).not.toHaveBeenCalled();
    expect(mocks.githubCtor).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'github', config: { owner: 'configured', repo: 'tracker', token: 'test-token' },
    }), '/configured-project');
  });
});
