/**
 * Unit tests for GitHubFieldSync — Status and Priority field sync for Projects V2
 *
 * RED phase (TDD): These tests import from a module that does NOT exist yet.
 * They will fail at import time until the implementation is created at:
 *   plugins/specweave-github/lib/github-field-sync.ts
 *
 * @see T-013: Status and Priority field sync for GitHub Projects V2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock GraphQL client (dependency injection — no vi.mock needed)
// ---------------------------------------------------------------------------

function makeMockClient() {
  return {
    getProjectFields: vi.fn(),
    updateItemFieldValue: vi.fn(),
    getOwnerNodeId: vi.fn(),
    createProjectV2: vi.fn(),
    addProjectV2Item: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Import the module that does NOT exist yet — RED phase
// ---------------------------------------------------------------------------

import {
  GitHubFieldSync,
} from '../../../../plugins/specweave-github/lib/github-field-sync.js';

import type {
  FieldSyncConfig,
  FieldSyncItem,
  FieldSyncResult,
} from '../../../../plugins/specweave-github/lib/github-field-sync.js';

import type {
  GitHubGraphQLClient,
} from '../../../../plugins/specweave-github/lib/github-graphql-client.js';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const PROJECT_ID = 'PVT_kwHOTestProject';

const STATUS_FIELD = {
  id: 'PVTSSF_status_001',
  name: 'Status',
  options: [
    { id: 'opt_todo', name: 'Todo' },
    { id: 'opt_inprogress', name: 'In Progress' },
    { id: 'opt_done', name: 'Done' },
  ],
};

const PRIORITY_FIELD = {
  id: 'PVTSSF_priority_001',
  name: 'Priority',
  options: [
    { id: 'opt_urgent', name: 'Urgent' },
    { id: 'opt_high', name: 'High' },
    { id: 'opt_medium', name: 'Medium' },
    { id: 'opt_low', name: 'Low' },
  ],
};

const TITLE_FIELD = {
  id: 'PVTF_title_001',
  name: 'Title',
};

/** Standard project fields fixture (Status + Priority + Title) */
const ALL_FIELDS = [TITLE_FIELD, STATUS_FIELD, PRIORITY_FIELD];

/** Fields fixture without Priority */
const FIELDS_NO_PRIORITY = [TITLE_FIELD, STATUS_FIELD];

/** Fields fixture without Status */
const FIELDS_NO_STATUS = [TITLE_FIELD, PRIORITY_FIELD];

/** Fields fixture with neither Status nor Priority */
const FIELDS_NO_CUSTOM = [TITLE_FIELD];

// ---------------------------------------------------------------------------
// Helper: create a GitHubFieldSync instance
// ---------------------------------------------------------------------------

function makeFieldSync(
  client: ReturnType<typeof makeMockClient>,
  configOverrides: Partial<FieldSyncConfig> = {},
): InstanceType<typeof GitHubFieldSync> {
  const config: FieldSyncConfig = {
    projectId: PROJECT_ID,
    ...configOverrides,
  };
  return new GitHubFieldSync(client as unknown as GitHubGraphQLClient, config);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubFieldSync', () => {
  let mockClient: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = makeMockClient();
  });

  // =========================================================================
  // 1. Constructor
  // =========================================================================
  describe('constructor', () => {
    it('should accept a client and config with projectId', () => {
      const sync = makeFieldSync(mockClient);
      expect(sync).toBeInstanceOf(GitHubFieldSync);
    });

    it('should accept optional statusFieldMapping in config', () => {
      const sync = makeFieldSync(mockClient, {
        statusFieldMapping: { 'planned': 'Todo' },
      });
      expect(sync).toBeInstanceOf(GitHubFieldSync);
    });

    it('should accept optional priorityFieldMapping in config', () => {
      const sync = makeFieldSync(mockClient, {
        priorityFieldMapping: { 'P1': 'Urgent' },
      });
      expect(sync).toBeInstanceOf(GitHubFieldSync);
    });
  });

  // =========================================================================
  // 2. loadFields — queries project fields via client
  // =========================================================================
  describe('loadFields', () => {
    it('should query project fields via the client', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      expect(mockClient.getProjectFields).toHaveBeenCalledWith(PROJECT_ID);
      expect(mockClient.getProjectFields).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 3. loadFields caches field IDs and option IDs
    // -----------------------------------------------------------------------
    it('should cache fields so subsequent calls do not re-query', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();
      await sync.loadFields(); // second call should be a no-op

      expect(mockClient.getProjectFields).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 4. syncItemFields — sets Status field using mapping
  // =========================================================================
  describe('syncItemFields — Status mapping', () => {
    it('should set Status field using configured mapping', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        statusFieldMapping: { 'planned': 'Todo' },
      });
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item1', status: 'planned' },
      ];

      const result: FieldSyncResult = await sync.syncItemFields(items);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_item1',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_todo' },
      );

      expect(result.updated).toContainEqual({
        itemId: 'PVTI_item1',
        field: 'Status',
        value: 'Todo',
      });
      expect(result.warnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. syncItemFields — sets Priority field using mapping
  // =========================================================================
  describe('syncItemFields — Priority mapping', () => {
    it('should set Priority field using configured mapping', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        priorityFieldMapping: { 'P2': 'High' },
      });
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item2', priority: 'P2' },
      ];

      const result: FieldSyncResult = await sync.syncItemFields(items);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_item2',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_high' },
      );

      expect(result.updated).toContainEqual({
        itemId: 'PVTI_item2',
        field: 'Priority',
        value: 'High',
      });
      expect(result.warnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. Default status mapping
  // =========================================================================
  describe('default status mapping', () => {
    it('should map planned -> Todo by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient); // no custom mapping
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_a', status: 'planned' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_a',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_todo' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_a',
        field: 'Status',
        value: 'Todo',
      });
    });

    it('should map in-progress -> In Progress by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_b', status: 'in-progress' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_b',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_inprogress' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_b',
        field: 'Status',
        value: 'In Progress',
      });
    });

    it('should map completed -> Done by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_c', status: 'completed' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_c',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_done' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_c',
        field: 'Status',
        value: 'Done',
      });
    });
  });

  // =========================================================================
  // 7. Default priority mapping
  // =========================================================================
  describe('default priority mapping', () => {
    it('should map P1 -> Urgent by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_p1', priority: 'P1' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_p1',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_urgent' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_p1',
        field: 'Priority',
        value: 'Urgent',
      });
    });

    it('should map P2 -> High by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_p2', priority: 'P2' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_p2',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_high' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_p2',
        field: 'Priority',
        value: 'High',
      });
    });

    it('should map P3 -> Medium by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_p3', priority: 'P3' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_p3',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_medium' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_p3',
        field: 'Priority',
        value: 'Medium',
      });
    });

    it('should map P4 -> Low by default', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_p4', priority: 'P4' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_p4',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_low' },
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_p4',
        field: 'Priority',
        value: 'Low',
      });
    });
  });

  // =========================================================================
  // 8. Warns when Status field not found on project (no throw)
  // =========================================================================
  describe('warning — Status field not found', () => {
    it('should warn (not throw) when Status field is missing from project', async () => {
      mockClient.getProjectFields.mockResolvedValue(FIELDS_NO_STATUS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item_nostatus', status: 'planned' },
      ];

      const result = await sync.syncItemFields(items);

      // Should NOT throw
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_item_nostatus',
          field: 'Status',
          message: expect.stringContaining('not found'),
        }),
      );
      // Should NOT have called updateItemFieldValue for Status
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Warns when Priority field not found on project (no throw)
  // =========================================================================
  describe('warning — Priority field not found', () => {
    it('should warn (not throw) when Priority field is missing from project', async () => {
      mockClient.getProjectFields.mockResolvedValue(FIELDS_NO_PRIORITY);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item_noprio', priority: 'P1' },
      ];

      const result = await sync.syncItemFields(items);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_item_noprio',
          field: 'Priority',
          message: expect.stringContaining('not found'),
        }),
      );
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 10. Warns when mapping target option not found (no throw)
  // =========================================================================
  describe('warning — mapping target option not found', () => {
    it('should warn when mapped Status option does not exist on the field', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        statusFieldMapping: { 'custom-status': 'Nonexistent Option' },
      });
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item_badopt', status: 'custom-status' },
      ];

      const result = await sync.syncItemFields(items);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_item_badopt',
          field: 'Status',
          message: expect.stringContaining('Nonexistent Option'),
        }),
      );
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });

    it('should warn when mapped Priority option does not exist on the field', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        priorityFieldMapping: { 'P5': 'Critical' },
      });
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_item_badprio', priority: 'P5' },
      ];

      const result = await sync.syncItemFields(items);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_item_badprio',
          field: 'Priority',
          message: expect.stringContaining('Critical'),
        }),
      );
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });

    it('should warn when item status has no mapping entry at all', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        statusFieldMapping: { 'planned': 'Todo' }, // only "planned" mapped
      });
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_unmapped', status: 'unknown-status' },
      ];

      const result = await sync.syncItemFields(items);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_unmapped',
          field: 'Status',
          message: expect.stringMatching(/unknown-status|no mapping|not found/i),
        }),
      );
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 11. Handles multiple items in batch
  // =========================================================================
  describe('batch sync — multiple items', () => {
    it('should process multiple items and set both Status and Priority', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_batch1', status: 'planned', priority: 'P1' },
        { itemId: 'PVTI_batch2', status: 'in-progress', priority: 'P3' },
        { itemId: 'PVTI_batch3', status: 'completed', priority: 'P4' },
      ];

      const result = await sync.syncItemFields(items);

      // 3 items x 2 fields each = 6 updateItemFieldValue calls
      expect(mockClient.updateItemFieldValue).toHaveBeenCalledTimes(6);

      // Verify each item had both Status and Priority updated
      expect(result.updated).toHaveLength(6);
      expect(result.warnings).toHaveLength(0);

      // Item 1: planned -> Todo, P1 -> Urgent
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch1',
        field: 'Status',
        value: 'Todo',
      });
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch1',
        field: 'Priority',
        value: 'Urgent',
      });

      // Item 2: in-progress -> In Progress, P3 -> Medium
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch2',
        field: 'Status',
        value: 'In Progress',
      });
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch2',
        field: 'Priority',
        value: 'Medium',
      });

      // Item 3: completed -> Done, P4 -> Low
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch3',
        field: 'Status',
        value: 'Done',
      });
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_batch3',
        field: 'Priority',
        value: 'Low',
      });
    });

    it('should return empty arrays when given an empty items list', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const result = await sync.syncItemFields([]);

      expect(result.updated).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
    });

    it('should accumulate warnings and updates across items', async () => {
      // Fields have Status but NOT Priority
      mockClient.getProjectFields.mockResolvedValue(FIELDS_NO_PRIORITY);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_mix1', status: 'planned', priority: 'P1' },
        { itemId: 'PVTI_mix2', status: 'completed', priority: 'P2' },
      ];

      const result = await sync.syncItemFields(items);

      // Status updates should succeed for both items
      expect(result.updated).toHaveLength(2);
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_mix1',
        field: 'Status',
        value: 'Todo',
      });
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_mix2',
        field: 'Status',
        value: 'Done',
      });

      // Priority warnings for both items (field not found)
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_mix1',
          field: 'Priority',
        }),
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_mix2',
          field: 'Priority',
        }),
      );
    });
  });

  // =========================================================================
  // 12. Skips fields that are undefined on item
  // =========================================================================
  describe('skip undefined fields on items', () => {
    it('should skip Status when item.status is undefined', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_nostat', priority: 'P2' }, // no status
      ];

      const result = await sync.syncItemFields(items);

      // Only Priority should be updated
      expect(mockClient.updateItemFieldValue).toHaveBeenCalledTimes(1);
      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_nostat',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_high' },
      );
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].field).toBe('Priority');
      expect(result.warnings).toHaveLength(0);
    });

    it('should skip Priority when item.priority is undefined', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_noprio', status: 'in-progress' }, // no priority
      ];

      const result = await sync.syncItemFields(items);

      // Only Status should be updated
      expect(mockClient.updateItemFieldValue).toHaveBeenCalledTimes(1);
      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_noprio',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_inprogress' },
      );
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].field).toBe('Status');
      expect(result.warnings).toHaveLength(0);
    });

    it('should do nothing when both status and priority are undefined', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_empty' }, // no status, no priority
      ];

      const result = await sync.syncItemFields(items);

      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
      expect(result.updated).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // 13. Auto-calls loadFields if not called yet
  // =========================================================================
  describe('auto-load fields', () => {
    it('should automatically call loadFields on first syncItemFields if not called yet', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      // Do NOT call sync.loadFields() explicitly

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_autoload', status: 'planned' },
      ];

      const result = await sync.syncItemFields(items);

      // Should have called getProjectFields automatically
      expect(mockClient.getProjectFields).toHaveBeenCalledWith(PROJECT_ID);
      expect(mockClient.getProjectFields).toHaveBeenCalledTimes(1);

      // And the sync should have succeeded
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_autoload',
        field: 'Status',
        value: 'Todo',
      });
    });

    it('should not re-load fields if loadFields was already called', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields(); // explicit call

      await sync.syncItemFields([
        { itemId: 'PVTI_nodup', status: 'completed' },
      ]);

      // getProjectFields should only have been called once (from explicit loadFields)
      expect(mockClient.getProjectFields).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Custom mapping overrides defaults
  // =========================================================================
  describe('custom mapping overrides', () => {
    it('should use custom statusFieldMapping instead of defaults', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        statusFieldMapping: {
          'planned': 'In Progress',  // override: planned -> In Progress instead of Todo
        },
      });
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_custom', status: 'planned' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_custom',
        STATUS_FIELD.id,
        { singleSelectOptionId: 'opt_inprogress' }, // In Progress, not Todo
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_custom',
        field: 'Status',
        value: 'In Progress',
      });
    });

    it('should use custom priorityFieldMapping instead of defaults', async () => {
      mockClient.getProjectFields.mockResolvedValue(ALL_FIELDS);
      mockClient.updateItemFieldValue.mockResolvedValue(undefined);

      const sync = makeFieldSync(mockClient, {
        priorityFieldMapping: {
          'P1': 'Low',  // override: P1 -> Low instead of Urgent
        },
      });
      await sync.loadFields();

      const result = await sync.syncItemFields([
        { itemId: 'PVTI_custprio', priority: 'P1' },
      ]);

      expect(mockClient.updateItemFieldValue).toHaveBeenCalledWith(
        PROJECT_ID,
        'PVTI_custprio',
        PRIORITY_FIELD.id,
        { singleSelectOptionId: 'opt_low' }, // Low, not Urgent
      );
      expect(result.updated).toContainEqual({
        itemId: 'PVTI_custprio',
        field: 'Priority',
        value: 'Low',
      });
    });
  });

  // =========================================================================
  // Edge case: both fields missing from project
  // =========================================================================
  describe('edge case — no custom fields on project', () => {
    it('should warn for both Status and Priority when neither exists on project', async () => {
      mockClient.getProjectFields.mockResolvedValue(FIELDS_NO_CUSTOM);

      const sync = makeFieldSync(mockClient);
      await sync.loadFields();

      const items: FieldSyncItem[] = [
        { itemId: 'PVTI_nofields', status: 'planned', priority: 'P1' },
      ];

      const result = await sync.syncItemFields(items);

      expect(mockClient.updateItemFieldValue).not.toHaveBeenCalled();
      expect(result.updated).toHaveLength(0);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_nofields',
          field: 'Status',
        }),
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          itemId: 'PVTI_nofields',
          field: 'Priority',
        }),
      );
    });
  });
});
