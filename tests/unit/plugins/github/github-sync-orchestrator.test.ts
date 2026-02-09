/**
 * Unit tests for GitHubSyncOrchestrator (RED phase - TDD)
 *
 * Tests the sync orchestrator that wires push sync, Projects V2 board,
 * field sync, and frontmatter updates into a single flow.
 *
 * Expected module: plugins/specweave-github/lib/github-sync-orchestrator.ts (does NOT exist yet)
 *
 * The module should:
 * - Push user stories to GitHub issues via pushSyncUserStories
 * - Optionally add issues to Projects V2 board via GitHubBoardResolverV2
 * - Optionally set Status/Priority fields via GitHubFieldSync
 * - Update spec frontmatter with sync results via updateSpecFrontmatter
 * - Return combined SyncOrchestratorResult
 *
 * @see T-014: Wire Projects V2 into the sync flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockPushSyncUserStories = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-push-sync.js', () => ({
  pushSyncUserStories: mockPushSyncUserStories,
}));

const {
  MockBoardResolverV2,
  mockFindOrCreateProject,
  mockAddIssuesToProject,
} = vi.hoisted(() => {
  const mockFindOrCreateProject = vi.fn();
  const mockAddIssuesToProject = vi.fn();
  const MockBoardResolverV2 = vi.fn().mockImplementation(function () {
    return {
      findOrCreateProject: mockFindOrCreateProject,
      addIssuesToProject: mockAddIssuesToProject,
    };
  });
  return { MockBoardResolverV2, mockFindOrCreateProject, mockAddIssuesToProject };
});
vi.mock('../../../../plugins/specweave-github/lib/github-board-resolver-v2.js', () => ({
  GitHubBoardResolverV2: MockBoardResolverV2,
}));

const {
  MockFieldSync,
  mockSyncItemFields,
} = vi.hoisted(() => {
  const mockSyncItemFields = vi.fn();
  const MockFieldSync = vi.fn().mockImplementation(function () {
    return { syncItemFields: mockSyncItemFields };
  });
  return { MockFieldSync, mockSyncItemFields };
});
vi.mock('../../../../plugins/specweave-github/lib/github-field-sync.js', () => ({
  GitHubFieldSync: MockFieldSync,
}));

const mockUpdateSpecFrontmatter = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-spec-frontmatter-updater.js', () => ({
  updateSpecFrontmatter: mockUpdateSpecFrontmatter,
}));

const { MockGraphQLClient } = vi.hoisted(() => {
  const MockGraphQLClient = vi.fn();
  return { MockGraphQLClient };
});
vi.mock('../../../../plugins/specweave-github/lib/github-graphql-client.js', () => ({
  GitHubGraphQLClient: MockGraphQLClient,
}));

// ---------------------------------------------------------------------------
// RED phase import — module does NOT exist yet
// ---------------------------------------------------------------------------

import {
  GitHubSyncOrchestrator,
} from '../../../../plugins/specweave-github/lib/github-sync-orchestrator.js';

import type {
  SyncOrchestratorConfig,
  SyncOrchestratorResult,
} from '../../../../plugins/specweave-github/lib/github-sync-orchestrator.js';

import type {
  UserStoryForSync,
  PushSyncResult,
} from '../../../../plugins/specweave-github/lib/github-push-sync.js';

import type {
  FieldSyncResult,
} from '../../../../plugins/specweave-github/lib/github-field-sync.js';

import type {
  GitHubSyncMetadata,
} from '../../../../src/core/types/sync-profile.js';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const SPEC_PATH = '/project/.specweave/docs/internal/specs/default/spec-auth.md';

const DEFAULT_CONFIG: SyncOrchestratorConfig = {
  owner: 'test-owner',
  repo: 'test-repo',
};

const PUSH_RESULT_CREATED: PushSyncResult = {
  created: [
    {
      userStoryId: 'US-001',
      issueNumber: 42,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
      issueNodeId: 'I_kwDOTest42',
    },
    {
      userStoryId: 'US-002',
      issueNumber: 43,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/43',
      issueNodeId: 'I_kwDOTest43',
    },
  ],
  updated: [],
  errors: [],
};

const PUSH_RESULT_EMPTY: PushSyncResult = {
  created: [],
  updated: [],
  errors: [],
};

const PUSH_RESULT_WITH_ERRORS: PushSyncResult = {
  created: [
    {
      userStoryId: 'US-001',
      issueNumber: 42,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
      issueNodeId: 'I_kwDOTest42',
    },
  ],
  updated: [],
  errors: [
    { userStoryId: 'US-002', error: 'HTTP 422: Validation Failed' },
  ],
};

const FIELD_SYNC_RESULT: FieldSyncResult = {
  updated: [
    { itemId: 'PVTI_item1', field: 'Status', value: 'Todo' },
    { itemId: 'PVTI_item1', field: 'Priority', value: 'Urgent' },
    { itemId: 'PVTI_item2', field: 'Status', value: 'Todo' },
    { itemId: 'PVTI_item2', field: 'Priority', value: 'High' },
  ],
  warnings: [],
};

const FRONTMATTER_RESULT: GitHubSyncMetadata = {
  syncStatus: 'synced',
  userStories: {
    'US-001': {
      issueNumber: 42,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
      issueNodeId: 'I_kwDOTest42',
      syncedAt: '2026-02-06T00:00:00.000Z',
    },
    'US-002': {
      issueNumber: 43,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/43',
      issueNodeId: 'I_kwDOTest43',
      syncedAt: '2026-02-06T00:00:00.000Z',
    },
  },
};

const FRONTMATTER_RESULT_WITH_V2: GitHubSyncMetadata = {
  ...FRONTMATTER_RESULT,
  projectV2Id: 'PVT_kwHOTestProj',
  projectV2Number: 5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserStory(overrides: Partial<UserStoryForSync> = {}): UserStoryForSync {
  return {
    id: 'US-001',
    title: 'User authentication',
    description: 'Users should be able to log in with email and password.',
    priority: 'P1',
    status: 'planned',
    acceptanceCriteria: [
      { id: 'AC-US1-01', description: 'User can log in with valid credentials', completed: false },
    ],
    specId: 'spec-001',
    ...overrides,
  };
}

function makeConfig(overrides: Partial<SyncOrchestratorConfig> = {}): SyncOrchestratorConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

function makeUserStories(): UserStoryForSync[] {
  return [
    makeUserStory({ id: 'US-001', title: 'Auth', priority: 'P1', status: 'planned' }),
    makeUserStory({ id: 'US-002', title: 'Dashboard', priority: 'P2', status: 'in-progress' }),
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubSyncOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behaviors
    mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_CREATED);
    mockUpdateSpecFrontmatter.mockResolvedValue(FRONTMATTER_RESULT);
    mockFindOrCreateProject.mockResolvedValue({ id: 'PVT_kwHOTestProj', number: 5 });
    mockAddIssuesToProject.mockResolvedValue(['PVTI_item1', 'PVTI_item2']);
    mockSyncItemFields.mockResolvedValue(FIELD_SYNC_RESULT);
  });

  // =========================================================================
  // 1. Constructor accepts config
  // =========================================================================
  describe('constructor', () => {
    it('should accept a config with owner and repo', () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig());
      expect(orchestrator).toBeInstanceOf(GitHubSyncOrchestrator);
    });

    it('should accept optional projectV2 config fields', () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
        projectV2Id: 'PVT_kwHOTest',
      }));
      expect(orchestrator).toBeInstanceOf(GitHubSyncOrchestrator);
    });

    it('should accept optional token in config', () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        token: 'ghp_secret_token_123',
      }));
      expect(orchestrator).toBeInstanceOf(GitHubSyncOrchestrator);
    });

    it('should accept optional field mapping configs', () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        statusFieldMapping: { 'planned': 'Todo' },
        priorityFieldMapping: { 'P1': 'Urgent' },
      }));
      expect(orchestrator).toBeInstanceOf(GitHubSyncOrchestrator);
    });

    it('should accept optional dryRun in config', () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        dryRun: true,
      }));
      expect(orchestrator).toBeInstanceOf(GitHubSyncOrchestrator);
    });
  });

  // =========================================================================
  // 2. Basic sync without Projects V2 (push + frontmatter only)
  // =========================================================================
  describe('basic sync without Projects V2', () => {
    it('should push issues and update frontmatter when projectV2Enabled is not set', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig());
      const stories = makeUserStories();

      const result = await orchestrator.syncSpec(SPEC_PATH, stories);

      // Should call pushSyncUserStories
      expect(mockPushSyncUserStories).toHaveBeenCalledTimes(1);
      expect(mockPushSyncUserStories).toHaveBeenCalledWith(stories, expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
      }));

      // Should call updateSpecFrontmatter
      expect(mockUpdateSpecFrontmatter).toHaveBeenCalledTimes(1);
      expect(mockUpdateSpecFrontmatter).toHaveBeenCalledWith(
        SPEC_PATH,
        PUSH_RESULT_CREATED,
        expect.any(Object),
      );

      // Should NOT interact with V2 board or field sync
      expect(MockBoardResolverV2).not.toHaveBeenCalled();
      expect(MockFieldSync).not.toHaveBeenCalled();

      // Result should contain pushResult and frontmatterResult but no projectV2Result
      expect(result.pushResult).toEqual(PUSH_RESULT_CREATED);
      expect(result.frontmatterResult).toEqual(FRONTMATTER_RESULT);
      expect(result.projectV2Result).toBeUndefined();
    });

    it('should return push result containing created issues', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig());
      const stories = makeUserStories();

      const result = await orchestrator.syncSpec(SPEC_PATH, stories);

      expect(result.pushResult.created).toHaveLength(2);
      expect(result.pushResult.created[0].userStoryId).toBe('US-001');
      expect(result.pushResult.created[1].userStoryId).toBe('US-002');
    });
  });

  // =========================================================================
  // 3. Full sync with Projects V2 enabled (push + V2 + fields + frontmatter)
  // =========================================================================
  describe('full sync with Projects V2 enabled', () => {
    it('should push issues, add to V2 project, sync fields, and update frontmatter', async () => {
      mockUpdateSpecFrontmatter.mockResolvedValue(FRONTMATTER_RESULT_WITH_V2);

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));
      const stories = makeUserStories();

      const result = await orchestrator.syncSpec(SPEC_PATH, stories);

      // Step 1: Push sync
      expect(mockPushSyncUserStories).toHaveBeenCalledTimes(1);

      // Step 2: Create GraphQL client
      expect(MockGraphQLClient).toHaveBeenCalled();

      // Step 3: Board resolver - find/create project
      expect(MockBoardResolverV2).toHaveBeenCalled();
      expect(mockFindOrCreateProject).toHaveBeenCalledTimes(1);

      // Step 4: Add issues to project (using node IDs from push result)
      expect(mockAddIssuesToProject).toHaveBeenCalledTimes(1);
      expect(mockAddIssuesToProject).toHaveBeenCalledWith(
        'PVT_kwHOTestProj',
        ['I_kwDOTest42', 'I_kwDOTest43'],
      );

      // Step 5: Field sync
      expect(MockFieldSync).toHaveBeenCalled();
      expect(mockSyncItemFields).toHaveBeenCalledTimes(1);

      // Step 6: Frontmatter update with projectV2 info
      expect(mockUpdateSpecFrontmatter).toHaveBeenCalledWith(
        SPEC_PATH,
        PUSH_RESULT_CREATED,
        expect.objectContaining({
          projectV2Id: 'PVT_kwHOTestProj',
          projectV2Number: 5,
        }),
      );

      // Result should contain all sub-results
      expect(result.pushResult).toEqual(PUSH_RESULT_CREATED);
      expect(result.projectV2Result).toBeDefined();
      expect(result.projectV2Result!.projectId).toBe('PVT_kwHOTestProj');
      expect(result.projectV2Result!.projectNumber).toBe(5);
      expect(result.projectV2Result!.itemIds).toEqual(['PVTI_item1', 'PVTI_item2']);
      expect(result.projectV2Result!.fieldSyncResult).toEqual(FIELD_SYNC_RESULT);
      expect(result.frontmatterResult).toEqual(FRONTMATTER_RESULT_WITH_V2);
    });

    it('should pass field mappings to GitHubFieldSync', async () => {
      const customStatusMapping = { 'planned': 'Backlog', 'in-progress': 'Active' };
      const customPriorityMapping = { 'P1': 'Critical', 'P2': 'Important' };

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
        statusFieldMapping: customStatusMapping,
        priorityFieldMapping: customPriorityMapping,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // GitHubFieldSync should be constructed with the custom mappings
      expect(MockFieldSync).toHaveBeenCalledWith(
        expect.anything(), // GraphQL client instance
        expect.objectContaining({
          projectId: 'PVT_kwHOTestProj',
          statusFieldMapping: customStatusMapping,
          priorityFieldMapping: customPriorityMapping,
        }),
      );
    });

    it('should pass user story status and priority to field sync items', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      const stories = [
        makeUserStory({ id: 'US-001', status: 'planned', priority: 'P1' }),
        makeUserStory({ id: 'US-002', status: 'in-progress', priority: 'P2' }),
      ];

      await orchestrator.syncSpec(SPEC_PATH, stories);

      // syncItemFields should receive items with status and priority from user stories
      expect(mockSyncItemFields).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ itemId: 'PVTI_item1', status: 'planned', priority: 'P1' }),
          expect.objectContaining({ itemId: 'PVTI_item2', status: 'in-progress', priority: 'P2' }),
        ]),
      );
    });
  });

  // =========================================================================
  // 4. Skips V2 when projectV2Enabled is false
  // =========================================================================
  describe('skips V2 when projectV2Enabled is false', () => {
    it('should skip V2 when projectV2Enabled is explicitly false', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: false,
        projectV2Number: 5,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(MockBoardResolverV2).not.toHaveBeenCalled();
      expect(MockFieldSync).not.toHaveBeenCalled();
      expect(result.projectV2Result).toBeUndefined();
    });

    it('should skip V2 when projectV2Enabled is undefined', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Number: 5,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(MockBoardResolverV2).not.toHaveBeenCalled();
      expect(MockFieldSync).not.toHaveBeenCalled();
      expect(result.projectV2Result).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. Handles push sync errors gracefully
  // =========================================================================
  describe('push sync error handling', () => {
    it('should propagate push sync errors and still update frontmatter', async () => {
      mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_WITH_ERRORS);

      const frontmatterWithDirty: GitHubSyncMetadata = {
        syncStatus: 'dirty',
        userStories: {
          'US-001': {
            issueNumber: 42,
            issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
            issueNodeId: 'I_kwDOTest42',
            syncedAt: '2026-02-06T00:00:00.000Z',
          },
        },
      };
      mockUpdateSpecFrontmatter.mockResolvedValue(frontmatterWithDirty);

      const orchestrator = new GitHubSyncOrchestrator(makeConfig());
      const stories = makeUserStories();

      const result = await orchestrator.syncSpec(SPEC_PATH, stories);

      // Push result should contain partial errors
      expect(result.pushResult.errors).toHaveLength(1);
      expect(result.pushResult.errors[0].userStoryId).toBe('US-002');
      expect(result.pushResult.created).toHaveLength(1);

      // Frontmatter should still be updated
      expect(mockUpdateSpecFrontmatter).toHaveBeenCalledTimes(1);
      expect(result.frontmatterResult.syncStatus).toBe('dirty');
    });

    it('should handle complete push sync failure gracefully', async () => {
      mockPushSyncUserStories.mockRejectedValue(new Error('Network error'));

      const orchestrator = new GitHubSyncOrchestrator(makeConfig());
      const stories = makeUserStories();

      await expect(orchestrator.syncSpec(SPEC_PATH, stories)).rejects.toThrow('Network error');
    });

    it('should still attempt V2 sync for successfully created issues even when some fail', async () => {
      mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_WITH_ERRORS);
      mockAddIssuesToProject.mockResolvedValue(['PVTI_item1']);
      mockSyncItemFields.mockResolvedValue({
        updated: [{ itemId: 'PVTI_item1', field: 'Status', value: 'Todo' }],
        warnings: [],
      });
      mockUpdateSpecFrontmatter.mockResolvedValue({
        syncStatus: 'dirty',
        projectV2Id: 'PVT_kwHOTestProj',
        projectV2Number: 5,
        userStories: {
          'US-001': {
            issueNumber: 42,
            issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
            issueNodeId: 'I_kwDOTest42',
            syncedAt: '2026-02-06T00:00:00.000Z',
          },
        },
      });

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // V2 should have been called with only the successful issue node IDs
      expect(mockAddIssuesToProject).toHaveBeenCalledWith(
        'PVT_kwHOTestProj',
        ['I_kwDOTest42'], // only US-001 succeeded
      );
      expect(result.projectV2Result).toBeDefined();
      expect(result.projectV2Result!.itemIds).toEqual(['PVTI_item1']);
    });
  });

  // =========================================================================
  // 6. Passes token to all sub-components
  // =========================================================================
  describe('token passthrough', () => {
    it('should pass token to pushSyncUserStories', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        token: 'ghp_test_token_abc',
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(mockPushSyncUserStories).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          token: 'ghp_test_token_abc',
        }),
      );
    });

    it('should pass token to GitHubGraphQLClient when V2 is enabled', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        token: 'ghp_test_token_abc',
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(MockGraphQLClient).toHaveBeenCalledWith('ghp_test_token_abc');
    });

    it('should work without a token (uses default gh auth)', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // Should not throw, pushSyncUserStories should be called without token
      expect(mockPushSyncUserStories).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
        }),
      );
      // GraphQL client should be created without token (undefined)
      expect(MockGraphQLClient).toHaveBeenCalledWith(undefined);
    });
  });

  // =========================================================================
  // 7. Dry run skips actual operations
  // =========================================================================
  describe('dry run mode', () => {
    it('should pass dryRun to pushSyncUserStories', async () => {
      mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_EMPTY);
      mockUpdateSpecFrontmatter.mockResolvedValue({
        syncStatus: 'synced',
        userStories: {},
      });

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        dryRun: true,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(mockPushSyncUserStories).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          dryRun: true,
        }),
      );
    });

    it('should skip V2 operations in dry run mode even when projectV2Enabled is true', async () => {
      mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_EMPTY);
      mockUpdateSpecFrontmatter.mockResolvedValue({
        syncStatus: 'synced',
        userStories: {},
      });

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        dryRun: true,
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // V2 operations should not be called in dry run
      expect(MockBoardResolverV2).not.toHaveBeenCalled();
      expect(MockFieldSync).not.toHaveBeenCalled();
      expect(result.projectV2Result).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. Returns combined result with all sub-results
  // =========================================================================
  describe('combined result structure', () => {
    it('should return SyncOrchestratorResult with pushResult and frontmatterResult (no V2)', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig());

      const result: SyncOrchestratorResult = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(result).toHaveProperty('pushResult');
      expect(result).toHaveProperty('frontmatterResult');
      expect(result.pushResult).toBeDefined();
      expect(result.frontmatterResult).toBeDefined();
    });

    it('should return SyncOrchestratorResult with all fields when V2 is enabled', async () => {
      mockUpdateSpecFrontmatter.mockResolvedValue(FRONTMATTER_RESULT_WITH_V2);

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      const result: SyncOrchestratorResult = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(result).toHaveProperty('pushResult');
      expect(result).toHaveProperty('projectV2Result');
      expect(result).toHaveProperty('frontmatterResult');

      // Verify sub-result shapes
      expect(result.pushResult.created).toBeInstanceOf(Array);
      expect(result.pushResult.updated).toBeInstanceOf(Array);
      expect(result.pushResult.errors).toBeInstanceOf(Array);

      expect(result.projectV2Result!.projectId).toBe('PVT_kwHOTestProj');
      expect(result.projectV2Result!.projectNumber).toBe(5);
      expect(result.projectV2Result!.itemIds).toBeInstanceOf(Array);
      expect(result.projectV2Result!.fieldSyncResult).toBeDefined();
      expect(result.projectV2Result!.fieldSyncResult.updated).toBeInstanceOf(Array);
      expect(result.projectV2Result!.fieldSyncResult.warnings).toBeInstanceOf(Array);

      expect(result.frontmatterResult.syncStatus).toBeDefined();
      expect(result.frontmatterResult.userStories).toBeDefined();
    });

    it('should store projectV2Id and projectV2Number in frontmatter result', async () => {
      mockUpdateSpecFrontmatter.mockResolvedValue(FRONTMATTER_RESULT_WITH_V2);

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      const result = await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(result.frontmatterResult.projectV2Id).toBe('PVT_kwHOTestProj');
      expect(result.frontmatterResult.projectV2Number).toBe(5);
    });
  });

  // =========================================================================
  // Cross-repo: issues from different repos added to same org-level project
  // =========================================================================
  describe('cross-repo project support', () => {
    it('should pass owner to board resolver for org-level project resolution', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        owner: 'my-org',
        repo: 'frontend-app',
        projectV2Enabled: true,
        projectV2Number: 10,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // Board resolver should be constructed with owner for org-level project lookup
      expect(MockBoardResolverV2).toHaveBeenCalledWith(
        expect.anything(), // GraphQL client
        expect.objectContaining({
          owner: 'my-org',
          projectV2Number: 10,
        }),
      );
    });

    it('should pass projectV2Id to board resolver when provided', async () => {
      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        owner: 'my-org',
        repo: 'frontend-app',
        projectV2Enabled: true,
        projectV2Id: 'PVT_kwHOOrgProject',
        projectV2Number: 10,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      expect(MockBoardResolverV2).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: 'my-org',
          projectV2Id: 'PVT_kwHOOrgProject',
          projectV2Number: 10,
        }),
      );
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle empty user stories array', async () => {
      mockPushSyncUserStories.mockResolvedValue(PUSH_RESULT_EMPTY);
      mockUpdateSpecFrontmatter.mockResolvedValue({
        syncStatus: 'synced',
        userStories: {},
      });

      const orchestrator = new GitHubSyncOrchestrator(makeConfig());

      const result = await orchestrator.syncSpec(SPEC_PATH, []);

      expect(mockPushSyncUserStories).toHaveBeenCalledWith([], expect.any(Object));
      expect(result.pushResult.created).toHaveLength(0);
    });

    it('should skip V2 add-to-project when push creates no issues with node IDs', async () => {
      // Push result with only updated issues (no node IDs in updated)
      mockPushSyncUserStories.mockResolvedValue({
        created: [],
        updated: [
          {
            userStoryId: 'US-001',
            issueNumber: 42,
            issueUrl: 'https://github.com/test-owner/test-repo/issues/42',
          },
        ],
        errors: [],
      });

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      await orchestrator.syncSpec(SPEC_PATH, makeUserStories());

      // Board resolver should still be created to find/create project
      expect(mockFindOrCreateProject).toHaveBeenCalledTimes(1);
      // But addIssuesToProject should be called with empty array (no new node IDs)
      // or not called at all since there are no node IDs to add
      // The implementation should handle this gracefully
    });

    it('should handle V2 board resolver failure gracefully', async () => {
      mockFindOrCreateProject.mockRejectedValue(
        new Error('GraphQL error: Resource not accessible by integration')
      );

      const orchestrator = new GitHubSyncOrchestrator(makeConfig({
        projectV2Enabled: true,
        projectV2Number: 5,
      }));

      // Should either throw or handle gracefully and still update frontmatter
      // The orchestrator should propagate V2 errors since they indicate
      // a configuration problem
      await expect(orchestrator.syncSpec(SPEC_PATH, makeUserStories())).rejects.toThrow(
        /Resource not accessible/
      );
    });
  });
});
