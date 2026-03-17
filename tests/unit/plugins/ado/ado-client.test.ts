import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock https module
const mockRequest = vi.hoisted(() => {
  const req = {
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    request: vi.fn((_options: any, callback: any) => {
      // Default: no-op; tests override via mockImplementation
      return req;
    }),
    _req: req,
  };
});

vi.mock('https', () => ({ default: mockRequest }));

import { AdoClient } from '../../../../plugins/specweave/lib/integrations/ado/ado-client.js';

describe('AdoClient — pullWorkItemState', () => {
  let client: AdoClient;

  beforeEach(() => {
    client = new AdoClient({
      organization: 'myorg',
      project: 'myproject',
      personalAccessToken: 'fake-pat',
    });
    vi.clearAllMocks();
  });

  it('returns state and modifiedAt from ADO work item', async () => {
    const modifiedDate = '2026-03-15T10:30:00Z';
    const responseData = {
      id: 42,
      fields: {
        'System.State': 'Active',
        'System.ChangedDate': modifiedDate,
      },
    };

    mockRequest.request.mockImplementation((_options: any, callback: any) => {
      const res = {
        statusCode: 200,
        statusMessage: 'OK',
        on: vi.fn((event: string, handler: any) => {
          if (event === 'data') handler(JSON.stringify(responseData));
          if (event === 'end') handler();
          return res;
        }),
      };
      callback(res);
      return mockRequest._req;
    });

    const result = await client.pullWorkItemState(42);

    expect(result.state).toBe('Active');
    expect(result.modifiedAt).toEqual(new Date(modifiedDate));
  });

  it('handles Closed state', async () => {
    const modifiedDate = '2026-03-16T08:00:00Z';
    const responseData = {
      id: 99,
      fields: {
        'System.State': 'Closed',
        'System.ChangedDate': modifiedDate,
      },
    };

    mockRequest.request.mockImplementation((_options: any, callback: any) => {
      const res = {
        statusCode: 200,
        statusMessage: 'OK',
        on: vi.fn((event: string, handler: any) => {
          if (event === 'data') handler(JSON.stringify(responseData));
          if (event === 'end') handler();
          return res;
        }),
      };
      callback(res);
      return mockRequest._req;
    });

    const result = await client.pullWorkItemState(99);

    expect(result.state).toBe('Closed');
    expect(result.modifiedAt).toEqual(new Date(modifiedDate));
  });
});
