/**
 * Unit tests for GitHubGraphQLClient
 *
 * RED phase: These tests import from a module that does not exist yet.
 * They will fail at import time until the implementation is created at:
 *   plugins/specweave-github/lib/github-graphql-client.ts
 *
 * The client wraps `gh api graphql` CLI calls for GitHub Projects V2.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process.execFile using vi.hoisted + vi.mock (ESM pattern)
const mockExecFile = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execFile: mockExecFile,
}));

// Import the module that doesn't exist yet - RED phase
import { GitHubGraphQLClient } from '../../../../plugins/specweave-github/lib/github-graphql-client.js';

/**
 * Helper: simulate execFile callback behavior.
 * gh api graphql returns JSON to stdout.
 */
function mockExecFileSuccess(stdout: string) {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
      callback(null, stdout, '');
    }
  );
}

function mockExecFileError(stderr: string, code = 1) {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
      const err = new Error(stderr) as Error & { code: number };
      err.code = code;
      callback(err, '', stderr);
    }
  );
}

describe('GitHubGraphQLClient', () => {
  let client: InstanceType<typeof GitHubGraphQLClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubGraphQLClient();
  });

  // ---------------------------------------------------------------------------
  // getOwnerNodeId
  // ---------------------------------------------------------------------------
  describe('getOwnerNodeId', () => {
    it('should return the node ID for a user login', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          user: {
            id: 'U_kgDOBxxxxQ',
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const nodeId = await client.getOwnerNodeId('octocat');

      expect(nodeId).toBe('U_kgDOBxxxxQ');
    });

    it('should return the node ID for an organization login', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          organization: {
            id: 'O_kgDOAxxxxA',
          },
        },
      });

      // First call (user) might fail, second call (org) succeeds
      mockExecFile.mockImplementation(
        (_cmd: string, args: string[], _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
          const query = JSON.stringify(args);
          if (query.includes('organization')) {
            callback(null, JSON.stringify({
              data: {
                organization: {
                  id: 'O_kgDOAxxxxA',
                },
              },
            }), '');
          } else {
            callback(null, JSON.stringify({
              data: {
                user: null,
              },
            }), '');
          }
        }
      );

      const nodeId = await client.getOwnerNodeId('my-org');

      expect(nodeId).toBe('O_kgDOAxxxxA');
    });

    it('should pass "gh" as the command with "api graphql" args', async () => {
      mockExecFileSuccess(JSON.stringify({
        data: { user: { id: 'U_kgDOBxxxxQ' } },
      }));

      await client.getOwnerNodeId('octocat');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['api', 'graphql']),
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createProjectV2
  // ---------------------------------------------------------------------------
  describe('createProjectV2', () => {
    it('should create a project and return id and number', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          createProjectV2: {
            projectV2: {
              id: 'PVT_kwHOAxxxxAg',
              number: 42,
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const result = await client.createProjectV2('U_kgDOBxxxxQ', 'Sprint Board');

      expect(result).toEqual({
        id: 'PVT_kwHOAxxxxAg',
        number: 42,
      });
    });

    it('should include the owner ID and title in the GraphQL mutation', async () => {
      mockExecFileSuccess(JSON.stringify({
        data: {
          createProjectV2: {
            projectV2: { id: 'PVT_kwHOAxxxxAg', number: 1 },
          },
        },
      }));

      await client.createProjectV2('U_kgDOBxxxxQ', 'My Project');

      // Verify the mutation variables include ownerId and title
      const callArgs = mockExecFile.mock.calls[0];
      const args = callArgs[1] as string[];
      const fieldIndex = args.indexOf('-f');
      // There should be at least one -f with the query and -F with variables
      expect(args).toEqual(expect.arrayContaining(['api', 'graphql']));
    });
  });

  // ---------------------------------------------------------------------------
  // addProjectV2Item
  // ---------------------------------------------------------------------------
  describe('addProjectV2Item', () => {
    it('should add an issue to a project and return the item ID', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_lAHOAxxxxAzI',
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const itemId = await client.addProjectV2Item('PVT_kwHOAxxxxAg', 'I_kgDOGxxxxA');

      expect(itemId).toBe('PVTI_lAHOAxxxxAzI');
    });

    it('should be idempotent (return existing item ID if already added)', async () => {
      // GitHub returns the existing item if already added
      const graphqlResponse = JSON.stringify({
        data: {
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_lAHOAxxxxAzI',
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const firstCall = await client.addProjectV2Item('PVT_kwHOAxxxxAg', 'I_kgDOGxxxxA');
      const secondCall = await client.addProjectV2Item('PVT_kwHOAxxxxAg', 'I_kgDOGxxxxA');

      expect(firstCall).toBe('PVTI_lAHOAxxxxAzI');
      expect(secondCall).toBe('PVTI_lAHOAxxxxAzI');
    });
  });

  // ---------------------------------------------------------------------------
  // updateItemFieldValue
  // ---------------------------------------------------------------------------
  describe('updateItemFieldValue', () => {
    it('should call the mutation with correct parameters', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_lAHOAxxxxAzI',
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      await client.updateItemFieldValue(
        'PVT_kwHOAxxxxAg',
        'PVTI_lAHOAxxxxAzI',
        'PVTSSF_lAHOAxxxxAzM',
        { singleSelectOptionId: 'fc94da4c' },
      );

      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['api', 'graphql']),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should resolve without returning a value', async () => {
      mockExecFileSuccess(JSON.stringify({
        data: {
          updateProjectV2ItemFieldValue: {
            projectV2Item: { id: 'PVTI_lAHOAxxxxAzI' },
          },
        },
      }));

      const result = await client.updateItemFieldValue(
        'PVT_kwHOAxxxxAg',
        'PVTI_lAHOAxxxxAzI',
        'PVTSSF_lAHOAxxxxAzM',
        { singleSelectOptionId: 'fc94da4c' },
      );

      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getProjectFields
  // ---------------------------------------------------------------------------
  describe('getProjectFields', () => {
    it('should return field definitions with options', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          node: {
            fields: {
              nodes: [
                {
                  id: 'PVTF_lAHOAxxxxAzA',
                  name: 'Title',
                  dataType: 'TITLE',
                },
                {
                  id: 'PVTSSF_lAHOAxxxxAzM',
                  name: 'Status',
                  dataType: 'SINGLE_SELECT',
                  options: [
                    { id: 'fc94da4c', name: 'Todo' },
                    { id: '47fc9ee4', name: 'In Progress' },
                    { id: '98236657', name: 'Done' },
                  ],
                },
                {
                  id: 'PVTF_lAHOAxxxxAzB',
                  name: 'Priority',
                  dataType: 'SINGLE_SELECT',
                  options: [
                    { id: 'a1b2c3d4', name: 'High' },
                    { id: 'e5f6g7h8', name: 'Medium' },
                    { id: 'i9j0k1l2', name: 'Low' },
                  ],
                },
              ],
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const fields = await client.getProjectFields('PVT_kwHOAxxxxAg');

      expect(fields).toHaveLength(3);

      expect(fields[0]).toEqual({
        id: 'PVTF_lAHOAxxxxAzA',
        name: 'Title',
      });

      expect(fields[1]).toEqual({
        id: 'PVTSSF_lAHOAxxxxAzM',
        name: 'Status',
        options: [
          { id: 'fc94da4c', name: 'Todo' },
          { id: '47fc9ee4', name: 'In Progress' },
          { id: '98236657', name: 'Done' },
        ],
      });

      expect(fields[2]).toEqual({
        id: 'PVTF_lAHOAxxxxAzB',
        name: 'Priority',
        options: [
          { id: 'a1b2c3d4', name: 'High' },
          { id: 'e5f6g7h8', name: 'Medium' },
          { id: 'i9j0k1l2', name: 'Low' },
        ],
      });
    });

    it('should handle fields without options', async () => {
      const graphqlResponse = JSON.stringify({
        data: {
          node: {
            fields: {
              nodes: [
                {
                  id: 'PVTF_lAHOAxxxxAzA',
                  name: 'Title',
                  dataType: 'TITLE',
                },
              ],
            },
          },
        },
      });

      mockExecFileSuccess(graphqlResponse);

      const fields = await client.getProjectFields('PVT_kwHOAxxxxAg');

      expect(fields).toHaveLength(1);
      expect(fields[0]).toEqual({
        id: 'PVTF_lAHOAxxxxAzA',
        name: 'Title',
      });
      expect(fields[0].options).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    it('should throw when GraphQL response contains errors', async () => {
      const graphqlResponse = JSON.stringify({
        errors: [
          {
            type: 'NOT_FOUND',
            path: ['user'],
            message: 'Could not resolve to a User with the login of \'nonexistent\'.',
          },
        ],
      });

      mockExecFileSuccess(graphqlResponse);

      await expect(client.getOwnerNodeId('nonexistent')).rejects.toThrow(
        /Could not resolve to a User/
      );
    });

    it('should throw when execFile returns an error', async () => {
      mockExecFileError('gh: Not logged into any GitHub hosts. Run gh auth login');

      await expect(client.getOwnerNodeId('octocat')).rejects.toThrow(
        /gh.*auth/i
      );
    });

    it('should throw when GraphQL response has multiple errors', async () => {
      const graphqlResponse = JSON.stringify({
        errors: [
          {
            type: 'FORBIDDEN',
            message: 'Resource not accessible by integration',
          },
          {
            type: 'INSUFFICIENT_SCOPES',
            message: 'Your token has not been granted the required scopes.',
          },
        ],
      });

      mockExecFileSuccess(graphqlResponse);

      await expect(client.createProjectV2('U_kgDOBxxxxQ', 'Test')).rejects.toThrow();
    });

    it('should throw on malformed JSON response', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
          callback(null, 'not valid json', '');
        }
      );

      await expect(client.getOwnerNodeId('octocat')).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Token passthrough
  // ---------------------------------------------------------------------------
  describe('token passthrough', () => {
    it('should set GH_TOKEN env var when token is provided', async () => {
      const tokenClient = new GitHubGraphQLClient('ghp_testtoken123');

      mockExecFileSuccess(JSON.stringify({
        data: { user: { id: 'U_kgDOBxxxxQ' } },
      }));

      await tokenClient.getOwnerNodeId('octocat');

      // Verify execFile was called with env containing GH_TOKEN
      const callArgs = mockExecFile.mock.calls[0];
      const opts = callArgs[2] as { env?: NodeJS.ProcessEnv };

      expect(opts.env).toBeDefined();
      expect(opts.env!.GH_TOKEN).toBe('ghp_testtoken123');
    });

    it('should not override env when no token is provided', async () => {
      const noTokenClient = new GitHubGraphQLClient();

      mockExecFileSuccess(JSON.stringify({
        data: { user: { id: 'U_kgDOBxxxxQ' } },
      }));

      await noTokenClient.getOwnerNodeId('octocat');

      const callArgs = mockExecFile.mock.calls[0];
      const opts = callArgs[2] as { env?: NodeJS.ProcessEnv };

      // When no token, env should either be process.env or not have GH_TOKEN overridden
      if (opts.env) {
        expect(opts.env.GH_TOKEN).toBeUndefined();
      }
    });

    it('should pass token through for all methods', async () => {
      const tokenClient = new GitHubGraphQLClient('ghp_allmethod_test');

      // Test createProjectV2
      mockExecFileSuccess(JSON.stringify({
        data: {
          createProjectV2: { projectV2: { id: 'PVT_1', number: 1 } },
        },
      }));
      await tokenClient.createProjectV2('U_1', 'Test');

      // Test addProjectV2Item
      mockExecFileSuccess(JSON.stringify({
        data: {
          addProjectV2ItemById: { item: { id: 'PVTI_1' } },
        },
      }));
      await tokenClient.addProjectV2Item('PVT_1', 'I_1');

      // Test updateItemFieldValue
      mockExecFileSuccess(JSON.stringify({
        data: {
          updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_1' } },
        },
      }));
      await tokenClient.updateItemFieldValue('PVT_1', 'PVTI_1', 'F_1', { singleSelectOptionId: 'opt1' });

      // Test getProjectFields
      mockExecFileSuccess(JSON.stringify({
        data: {
          node: { fields: { nodes: [] } },
        },
      }));
      await tokenClient.getProjectFields('PVT_1');

      // All four calls should have GH_TOKEN set
      expect(mockExecFile).toHaveBeenCalledTimes(4);
      for (const call of mockExecFile.mock.calls) {
        const opts = call[2] as { env?: NodeJS.ProcessEnv };
        expect(opts.env).toBeDefined();
        expect(opts.env!.GH_TOKEN).toBe('ghp_allmethod_test');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('should accept no arguments', () => {
      const c = new GitHubGraphQLClient();
      expect(c).toBeInstanceOf(GitHubGraphQLClient);
    });

    it('should accept a token string', () => {
      const c = new GitHubGraphQLClient('ghp_abc123');
      expect(c).toBeInstanceOf(GitHubGraphQLClient);
    });
  });
});
