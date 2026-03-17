/**
 * Test: JIRA Status Sync — SyncError Surface
 *
 * Validates that JIRA API errors are surfaced as SyncError
 * with provider, httpStatus, and responseBody fields.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncError } from '../../../../src/core/errors/sync-error.js';

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

describe('JiraStatusSync SyncError Surface', () => {
  let statusSync: InstanceType<typeof JiraStatusSync>;

  beforeEach(() => {
    vi.clearAllMocks();
    statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
    );
  });

  it('throws SyncError with provider/httpStatus/responseBody on HTTP 400', async () => {
    const jiraErrors = { errorMessages: ['Transition not found'], errors: { status: 'Invalid transition' } };
    const axiosError = Object.assign(new Error('Bad Request'), {
      response: { status: 400, data: jiraErrors },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    try {
      await statusSync.updateStatus('PROJ-123', { state: 'Done' });
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SyncError);
      const syncErr = error as SyncError;
      expect(syncErr.provider).toBe('jira');
      expect(syncErr.httpStatus).toBe(400);
      expect(syncErr.responseBody).toContain('Transition not found');
      expect(syncErr.responseBody).toContain('Invalid transition');
    }
  });

  it('throws SyncError with httpStatus=0 for network errors', async () => {
    const networkError = Object.assign(new Error('ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    });
    mockAxiosInstance.get.mockRejectedValueOnce(networkError);

    try {
      await statusSync.getStatus('PROJ-456');
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SyncError);
      const syncErr = error as SyncError;
      expect(syncErr.provider).toBe('jira');
      expect(syncErr.httpStatus).toBe(0);
      expect(syncErr.message).toContain('ECONNREFUSED');
    }
  });

  it('does not swallow errors - SyncError propagates from updateStatus', async () => {
    const axiosError = Object.assign(new Error('Forbidden'), {
      response: { status: 403, data: { errorMessages: ['You do not have permission'] } },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    await expect(
      statusSync.updateStatus('PROJ-789', { state: 'In Progress' }),
    ).rejects.toThrow(SyncError);
  });

  it('does not swallow errors - SyncError propagates from postStatusComment', async () => {
    const axiosError = Object.assign(new Error('Internal Server Error'), {
      response: { status: 500, data: { errorMessages: ['Something went wrong'] } },
      isAxiosError: true,
    });
    mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

    await expect(
      statusSync.postStatusComment('PROJ-123', 'active', 'done'),
    ).rejects.toThrow(SyncError);
  });
});
