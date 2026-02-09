/**
 * Unit tests for GitHubBoardResolverV2 (RED phase - TDD)
 *
 * Tests the Projects V2 board resolver that finds or creates GitHub Projects V2
 * boards and adds issues to them via the GitHubGraphQLClient.
 *
 * Expected module: plugins/specweave-github/lib/github-board-resolver-v2.ts (does NOT exist yet)
 *
 * @see T-012: Projects V2 Board Resolver
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGraphqlClient = {
  getOwnerNodeId: vi.fn(),
  createProjectV2: vi.fn(),
  addProjectV2Item: vi.fn(),
  getProjectFields: vi.fn(),
  updateItemFieldValue: vi.fn(),
};

import {
  GitHubBoardResolverV2,
} from '../../../../plugins/specweave-github/lib/github-board-resolver-v2.js';

import type {
  GitHubGraphQLClient,
} from '../../../../plugins/specweave-github/lib/github-graphql-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a resolver instance with default config */
function makeResolver(configOverrides: {
  owner?: string;
  projectV2Number?: number;
  projectV2Id?: string;
} = {}): InstanceType<typeof GitHubBoardResolverV2> {
  return new GitHubBoardResolverV2(mockGraphqlClient as unknown as GitHubGraphQLClient, {
    owner: 'test-owner',
    ...configOverrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubBoardResolverV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // findOrCreateProject
  // =========================================================================
  describe('findOrCreateProject', () => {
    // -----------------------------------------------------------------------
    // 1. Finds existing project by number
    // -----------------------------------------------------------------------
    it('should find an existing project when projectV2Number is configured', async () => {
      // Mock: getOwnerNodeId returns the owner's node ID
      mockGraphqlClient.getOwnerNodeId.mockResolvedValue('U_kgDOBxxxxQ');

      // The resolver should query for the project by number and return it.
      // We simulate the GraphQL client returning project data via a dedicated
      // method or by using the owner node ID to look up the project.
      // For this test, we expect the resolver to verify the project exists.
      // Mock a hypothetical getProjectByNumber or equivalent flow:
      // The resolver will use getOwnerNodeId + GraphQL query to find the project.
      // We mock the underlying client methods that the resolver should call.

      const resolver = makeResolver({ projectV2Number: 5 });

      // The resolver should look up the owner, then query for project #5.
      // We expect it calls getOwnerNodeId and then uses that to find project.
      // The internal implementation may use a dedicated GraphQL query.
      // We simulate the result:
      mockGraphqlClient.getOwnerNodeId.mockResolvedValue('U_kgDOBxxxxQ');

      const result = await resolver.findOrCreateProject('Sprint Board');

      expect(result).toEqual({
        id: expect.any(String),
        number: 5,
      });
      // Should NOT have called createProjectV2 since project exists
      expect(mockGraphqlClient.createProjectV2).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 2. Creates new project if not found
    // -----------------------------------------------------------------------
    it('should create a new project when no existing project is found', async () => {
      mockGraphqlClient.getOwnerNodeId.mockResolvedValue('U_kgDOBxxxxQ');
      mockGraphqlClient.createProjectV2.mockResolvedValue({
        id: 'PVT_kwHONewProj',
        number: 12,
      });

      // No projectV2Number or projectV2Id configured — must create
      const resolver = makeResolver();

      const result = await resolver.findOrCreateProject('New Sprint Board');

      expect(result).toEqual({
        id: 'PVT_kwHONewProj',
        number: 12,
      });
      expect(mockGraphqlClient.getOwnerNodeId).toHaveBeenCalledWith('test-owner');
      expect(mockGraphqlClient.createProjectV2).toHaveBeenCalledWith(
        'U_kgDOBxxxxQ',
        'New Sprint Board'
      );
    });

    // -----------------------------------------------------------------------
    // 3. Uses projectV2Id if provided directly
    // -----------------------------------------------------------------------
    it('should use projectV2Id directly when provided in config', async () => {
      const resolver = makeResolver({
        projectV2Id: 'PVT_kwHODirectId',
        projectV2Number: 7,
      });

      const result = await resolver.findOrCreateProject('Irrelevant Title');

      expect(result).toEqual({
        id: 'PVT_kwHODirectId',
        number: 7,
      });
      // Should NOT call getOwnerNodeId or createProjectV2 — ID is already known
      expect(mockGraphqlClient.getOwnerNodeId).not.toHaveBeenCalled();
      expect(mockGraphqlClient.createProjectV2).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Uses projectV2Id with default number when number not provided
    // -----------------------------------------------------------------------
    it('should return projectV2Id with number 0 when number is not configured', async () => {
      const resolver = makeResolver({
        projectV2Id: 'PVT_kwHODirectId',
      });

      const result = await resolver.findOrCreateProject('Board Title');

      expect(result).toEqual({
        id: 'PVT_kwHODirectId',
        number: expect.any(Number),
      });
      expect(result.id).toBe('PVT_kwHODirectId');
    });
  });

  // =========================================================================
  // addIssuesToProject
  // =========================================================================
  describe('addIssuesToProject', () => {
    // -----------------------------------------------------------------------
    // 4. Adds multiple issues, returns item IDs
    // -----------------------------------------------------------------------
    it('should add multiple issues to a project and return item IDs', async () => {
      mockGraphqlClient.addProjectV2Item
        .mockResolvedValueOnce('PVTI_item1')
        .mockResolvedValueOnce('PVTI_item2')
        .mockResolvedValueOnce('PVTI_item3');

      const resolver = makeResolver();
      const issueNodeIds = ['I_kwDOIssue1', 'I_kwDOIssue2', 'I_kwDOIssue3'];

      const itemIds = await resolver.addIssuesToProject('PVT_kwHOTestProj', issueNodeIds);

      expect(itemIds).toEqual(['PVTI_item1', 'PVTI_item2', 'PVTI_item3']);
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenCalledTimes(3);
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenNthCalledWith(
        1, 'PVT_kwHOTestProj', 'I_kwDOIssue1'
      );
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenNthCalledWith(
        2, 'PVT_kwHOTestProj', 'I_kwDOIssue2'
      );
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenNthCalledWith(
        3, 'PVT_kwHOTestProj', 'I_kwDOIssue3'
      );
    });

    // -----------------------------------------------------------------------
    // 5. Handles empty array
    // -----------------------------------------------------------------------
    it('should return an empty array when no issue node IDs are provided', async () => {
      const resolver = makeResolver();

      const itemIds = await resolver.addIssuesToProject('PVT_kwHOTestProj', []);

      expect(itemIds).toEqual([]);
      expect(mockGraphqlClient.addProjectV2Item).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Single issue works correctly
    // -----------------------------------------------------------------------
    it('should handle a single issue correctly', async () => {
      mockGraphqlClient.addProjectV2Item.mockResolvedValueOnce('PVTI_single');

      const resolver = makeResolver();

      const itemIds = await resolver.addIssuesToProject('PVT_kwHOTestProj', ['I_kwDOSingle']);

      expect(itemIds).toEqual(['PVTI_single']);
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenCalledTimes(1);
      expect(mockGraphqlClient.addProjectV2Item).toHaveBeenCalledWith(
        'PVT_kwHOTestProj', 'I_kwDOSingle'
      );
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('error handling', () => {
    // -----------------------------------------------------------------------
    // 6. Propagates GraphQL errors
    // -----------------------------------------------------------------------
    it('should propagate GraphQL errors from getOwnerNodeId', async () => {
      mockGraphqlClient.getOwnerNodeId.mockRejectedValue(
        new Error('GraphQL error: Could not resolve to a User with the login of \'nonexistent\'.')
      );

      const resolver = makeResolver({ owner: 'nonexistent' });

      await expect(resolver.findOrCreateProject('Board')).rejects.toThrow(
        /Could not resolve to a User/
      );
    });

    it('should propagate GraphQL errors from createProjectV2', async () => {
      mockGraphqlClient.getOwnerNodeId.mockResolvedValue('U_kgDOBxxxxQ');
      mockGraphqlClient.createProjectV2.mockRejectedValue(
        new Error('GraphQL error: Resource not accessible by integration')
      );

      const resolver = makeResolver();

      await expect(resolver.findOrCreateProject('Board')).rejects.toThrow(
        /Resource not accessible by integration/
      );
    });

    it('should propagate GraphQL errors from addProjectV2Item', async () => {
      mockGraphqlClient.addProjectV2Item.mockRejectedValue(
        new Error('GraphQL error: Could not resolve to a node with the global id of \'INVALID_ID\'.')
      );

      const resolver = makeResolver();

      await expect(
        resolver.addIssuesToProject('PVT_kwHOTestProj', ['INVALID_ID'])
      ).rejects.toThrow(/Could not resolve to a node/);
    });

    it('should propagate auth errors', async () => {
      mockGraphqlClient.getOwnerNodeId.mockRejectedValue(
        new Error('gh: Not logged into any GitHub hosts. Run gh auth login')
      );

      const resolver = makeResolver();

      await expect(resolver.findOrCreateProject('Board')).rejects.toThrow(
        /gh.*auth/i
      );
    });
  });

  // =========================================================================
  // Constructor
  // =========================================================================
  describe('constructor', () => {
    it('should accept a graphql client and config with owner', () => {
      const resolver = new GitHubBoardResolverV2(mockGraphqlClient as unknown as GitHubGraphQLClient, { owner: 'my-org' });
      expect(resolver).toBeInstanceOf(GitHubBoardResolverV2);
    });

    it('should accept optional projectV2Number in config', () => {
      const resolver = new GitHubBoardResolverV2(mockGraphqlClient as unknown as GitHubGraphQLClient, {
        owner: 'my-org',
        projectV2Number: 42,
      });
      expect(resolver).toBeInstanceOf(GitHubBoardResolverV2);
    });

    it('should accept optional projectV2Id in config', () => {
      const resolver = new GitHubBoardResolverV2(mockGraphqlClient as unknown as GitHubGraphQLClient, {
        owner: 'my-org',
        projectV2Id: 'PVT_kwHOAxxxxAg',
      });
      expect(resolver).toBeInstanceOf(GitHubBoardResolverV2);
    });
  });
});
