/**
 * Tests for AdoReconciler
 *
 * Tests the Azure DevOps reconciliation logic that syncs ADO work item states
 * with local increment metadata statuses.
 *
 * @module tests/unit/sync/ado-reconciler.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockConfigManagerRead, mockResolvePermissions, mockDeriveFeatureId, mockFetch } = vi.hoisted(() => {
  const mockConfigManagerRead = vi.fn();
  const mockResolvePermissions = vi.fn();
  const mockDeriveFeatureId = vi.fn();
  const mockFetch = vi.fn();
  return { mockConfigManagerRead, mockResolvePermissions, mockDeriveFeatureId, mockFetch };
});

vi.mock('../../../src/core/config/config-manager.js', () => {
  return {
    ConfigManager: class MockConfigManager {
      constructor() {}
      read = mockConfigManagerRead;
    },
  };
});

vi.mock('../../../src/sync/config.js', () => ({
  resolvePermissions: mockResolvePermissions,
}));

vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mockDeriveFeatureId,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { AdoReconciler, reconcileAdo } from '../../../src/sync/ado-reconciler.js';
import type { AdoReconcileResult, IncrementAdoState, AdoReconcileOptions } from '../../../src/sync/ado-reconciler.js';
import type { Logger } from '../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/** Create a config.json that enables ADO sync with bidirectional permissions */
function adoEnabledConfig() {
  return {
    sync: {
      preset: 'bidirectional',
      ado: { enabled: true, organization: 'test-org', project: 'test-proj' },
      settings: {
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      },
    },
  };
}

/** Write config.json inside the temp dir */
async function writeConfig(tmpDir: string, config: Record<string, unknown>) {
  const configDir = path.join(tmpDir, '.specweave');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(config));
}

/** Write a metadata.json for an increment */
async function writeIncrement(tmpDir: string, name: string, metadata: Record<string, unknown>) {
  const incDir = path.join(tmpDir, '.specweave', 'increments', name);
  await fs.mkdir(incDir, { recursive: true });
  await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata));
}

/** Build a fake ADO API JSON response for getWorkItem */
function adoWorkItemResponse(state: string, id = 100) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      id,
      fields: { 'System.State': state },
    }),
    text: vi.fn().mockResolvedValue(''),
  };
}

/** Build a fake ADO API error response */
function adoErrorResponse(status: number, body = 'Error') {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ message: body }),
    text: vi.fn().mockResolvedValue(body),
  };
}

/** Build a fake ADO API success PATCH response */
function adoPatchSuccess() {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ id: 1 }),
    text: vi.fn().mockResolvedValue(''),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdoReconciler', () => {
  let tmpDir: string;
  let logger: Logger;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ado-reconciler-test-'));
    logger = createMockLogger();

    // Save env vars
    savedEnv.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT;
    savedEnv.AZURE_DEVOPS_TOKEN = process.env.AZURE_DEVOPS_TOKEN;

    // Set ADO credentials by default
    process.env.AZURE_DEVOPS_PAT = 'test-pat-token';
    delete process.env.AZURE_DEVOPS_TOKEN;

    // Default mock returns
    mockResolvePermissions.mockReturnValue({
      canRead: true,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: false,
    });

    mockConfigManagerRead.mockResolvedValue({
      issueTracker: { organization_ado: 'test-org' },
      sync: { ado: { organization: 'test-org' } },
    });

    mockDeriveFeatureId.mockImplementation((id: string) => {
      const match = id.match(/^(\d+)/);
      if (!match) throw new Error('Invalid');
      return `FS-${String(parseInt(match[1], 10)).padStart(3, '0')}`;
    });

    // Replace global fetch
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(async () => {
    // Restore env vars
    if (savedEnv.AZURE_DEVOPS_PAT !== undefined) {
      process.env.AZURE_DEVOPS_PAT = savedEnv.AZURE_DEVOPS_PAT;
    } else {
      delete process.env.AZURE_DEVOPS_PAT;
    }
    if (savedEnv.AZURE_DEVOPS_TOKEN !== undefined) {
      process.env.AZURE_DEVOPS_TOKEN = savedEnv.AZURE_DEVOPS_TOKEN;
    } else {
      delete process.env.AZURE_DEVOPS_TOKEN;
    }

    vi.unstubAllGlobals();
    vi.clearAllMocks();

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should set projectRoot from options', () => {
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      expect(rec['projectRoot']).toBe(tmpDir);
    });

    it('should default dryRun to false', () => {
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      expect(rec['dryRun']).toBe(false);
    });

    it('should set dryRun to true when provided', () => {
      const rec = new AdoReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      expect(rec['dryRun']).toBe(true);
    });

    it('should create a ConfigManager with projectRoot', () => {
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      expect(rec['configManager']).toBeDefined();
    });
  });

  // =========================================================================
  // reconcile() - config/credential checks
  // =========================================================================

  describe('reconcile - config and credential checks', () => {
    it('should return early with 0 results when ADO sync is disabled', async () => {
      await writeConfig(tmpDir, { sync: { ado: { enabled: false } } });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: false });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(result.mismatches).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('ADO sync is disabled'));
    });

    it('should return early when canUpdateExternalItems is false and canUpsert is false', async () => {
      await writeConfig(tmpDir, {
        sync: {
          ado: { enabled: true },
          settings: { canUpdateExternalItems: false },
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: true });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('ADO sync is disabled'));
    });

    it('should return early when canUpdateStatus is false', async () => {
      await writeConfig(tmpDir, {
        sync: {
          ado: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: false },
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: true, canUpdateStatus: false });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('status updates are disabled'));
    });

    it('should error when no ADO credentials are configured', async () => {
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_TOKEN;

      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('ADO credentials not configured');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ADO PAT not found'));
    });

    it('should accept AZURE_DEVOPS_TOKEN as alternative credential', async () => {
      delete process.env.AZURE_DEVOPS_PAT;
      process.env.AZURE_DEVOPS_TOKEN = 'alt-token';

      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should not have credentials error (may have 0 increments)
      expect(result.errors).not.toContain('ADO credentials not configured');
    });

    it('should call resolvePermissions with preset and legacy settings', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'bidirectional',
          ado: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: true },
        },
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockResolvePermissions).toHaveBeenCalledWith(
        'bidirectional',
        undefined,
        expect.objectContaining({ canUpdateExternalItems: true }),
      );
    });

    it('should use resolvePermissions canUpsert when canUpdateExternalItems is absent', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'bidirectional',
          ado: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: true, canUpdateStatus: true });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should not return early
      expect(result.errors).not.toContain('ADO credentials not configured');
    });

    it('should return empty config when config.json does not exist', async () => {
      // No config file, so ADO will be disabled
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
    });
  });

  // =========================================================================
  // scanIncrements()
  // =========================================================================

  describe('scanIncrements', () => {
    async function callScanIncrements(projectRoot: string): Promise<IncrementAdoState[]> {
      // We need to access the private method; use reconcile and check the scanned count,
      // or instantiate and call via reconcile. We'll use an indirect approach:
      // set config to pass all checks, then check result.scanned
      await writeConfig(projectRoot, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));
      const rec = new AdoReconciler({ projectRoot, logger });
      const result = await rec.reconcile();
      return result as any; // We'll check result.scanned
    }

    it('should return 0 scanned when increments directory does not exist', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip _archive directory', async () => {
      const archiveDir = path.join(tmpDir, '.specweave', 'increments', '_archive', '0001-old');
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.writeFile(
        path.join(archiveDir, 'metadata.json'),
        JSON.stringify({
          status: 'completed',
          external_sync: { ado: { workItemId: 100 } },
        }),
      );
      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip directories starting with a dot', async () => {
      const dotDir = path.join(tmpDir, '.specweave', 'increments', '.hidden');
      await fs.mkdir(dotDir, { recursive: true });
      await fs.writeFile(
        path.join(dotDir, 'metadata.json'),
        JSON.stringify({
          status: 'active',
          external_sync: { ado: { workItemId: 100 } },
        }),
      );
      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip directories without metadata.json', async () => {
      await fs.mkdir(path.join(tmpDir, '.specweave', 'increments', '0001-test'), { recursive: true });
      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip directories without ADO workItemId', async () => {
      await writeIncrement(tmpDir, '0001-no-ado', {
        status: 'active',
        external_sync: { github: { issueNumber: 42 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip increments with invalid JSON metadata', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments', '0001-bad');
      await fs.mkdir(incDir, { recursive: true });
      await fs.writeFile(path.join(incDir, 'metadata.json'), 'not valid json!');
      await writeConfig(tmpDir, adoEnabledConfig());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should extract increment with ADO workItemId', async () => {
      await writeIncrement(tmpDir, '0001-feature', {
        status: 'active',
        featureId: 'FS-001',
        external_sync: { ado: { workItemId: 200, workItemUrl: 'https://dev.azure.com/...' } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 200));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should derive featureId when metadata.feature_id is null', async () => {
      await writeIncrement(tmpDir, '0042-derived', {
        status: 'active',
        external_sync: { ado: { workItemId: 300 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 300));
      mockDeriveFeatureId.mockReturnValue('FS-042');

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      expect(mockDeriveFeatureId).toHaveBeenCalledWith('0042-derived');
    });

    it('should use metadata.featureId when present', async () => {
      await writeIncrement(tmpDir, '0050-explicit', {
        status: 'active',
        featureId: 'FS-050',
        external_sync: { ado: { workItemId: 400 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 400));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      // deriveFeatureId should NOT have been called because featureId is already present
      expect(mockDeriveFeatureId).not.toHaveBeenCalled();
    });

    it('should use metadata.feature_id when featureId is absent', async () => {
      await writeIncrement(tmpDir, '0051-alt', {
        status: 'active',
        feature_id: 'FS-051',
        external_sync: { ado: { workItemId: 401 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 401));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      // deriveFeatureId should NOT have been called because feature_id is present
      expect(mockDeriveFeatureId).not.toHaveBeenCalled();
    });

    it('should handle deriveFeatureId throwing without failing', async () => {
      await writeIncrement(tmpDir, '0060-bad-derive', {
        status: 'active',
        external_sync: { ado: { workItemId: 500 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 500));
      mockDeriveFeatureId.mockImplementation(() => { throw new Error('bad'); });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should extract userStory work items when present', async () => {
      await writeIncrement(tmpDir, '0070-stories', {
        status: 'active',
        external_sync: {
          ado: {
            workItemId: 600,
            userStories: [
              { id: 'US-001', workItemId: 601 },
              { userStoryId: 'US-002', workItemId: 602 },
            ],
          },
        },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      // main + 2 user stories = 3 fetch calls
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      // 3 work items: 1 main + 2 user stories
      expect(result.details).toHaveLength(3);
    });

    it('should skip userStory entries without workItemId', async () => {
      await writeIncrement(tmpDir, '0071-partial-stories', {
        status: 'active',
        external_sync: {
          ado: {
            workItemId: 700,
            userStories: [
              { id: 'US-001' }, // no workItemId
              { id: 'US-002', workItemId: 702 },
            ],
          },
        },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // 1 main + 1 valid user story = 2 work items
      expect(result.details).toHaveLength(2);
    });

    it('should set metadataStatus to unknown when metadata.status is missing', async () => {
      await writeIncrement(tmpDir, '0080-no-status', {
        external_sync: { ado: { workItemId: 800 } },
      });
      await writeConfig(tmpDir, adoEnabledConfig());
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 800));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should skip non-directory entries', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(incDir, { recursive: true });
      // Create a plain file (not directory) in increments
      await fs.writeFile(path.join(incDir, 'not-a-dir.txt'), 'hello');

      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });
  });

  // =========================================================================
  // reconcileIncrement - status mapping
  // =========================================================================

  describe('reconcileIncrement - status mapping', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should determine completed status as shouldBeClosed', async () => {
      await writeIncrement(tmpDir, '0001-done', {
        status: 'completed',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should determine abandoned status as shouldBeClosed', async () => {
      await writeIncrement(tmpDir, '0002-abandoned', {
        status: 'abandoned',
        external_sync: { ado: { workItemId: 101 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('In Progress'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should determine active status as shouldBeActive', async () => {
      await writeIncrement(tmpDir, '0003-active', {
        status: 'active',
        external_sync: { ado: { workItemId: 102 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Closed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine planning status as shouldBeActive', async () => {
      await writeIncrement(tmpDir, '0004-planning', {
        status: 'planning',
        external_sync: { ado: { workItemId: 103 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Done'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine backlog status as shouldBeActive', async () => {
      await writeIncrement(tmpDir, '0005-backlog', {
        status: 'backlog',
        external_sync: { ado: { workItemId: 104 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Resolved'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine ready_for_review status as shouldBeActive', async () => {
      await writeIncrement(tmpDir, '0006-review', {
        status: 'ready_for_review',
        external_sync: { ado: { workItemId: 105 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Removed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });
  });

  // =========================================================================
  // reconcileWorkItem - state comparison
  // =========================================================================

  describe('reconcileWorkItem - state comparison', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should skip when state already matches (both active)', async () => {
      await writeIncrement(tmpDir, '0001-match', {
        status: 'active',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(0);
      expect(result.closed).toBe(0);
      expect(result.reopened).toBe(0);
      expect(result.details[0].action).toBe('skip');
      expect(result.details[0].reason).toBe('State matches');
    });

    it('should skip when state already matches (both closed)', async () => {
      await writeIncrement(tmpDir, '0002-match-closed', {
        status: 'completed',
        external_sync: { ado: { workItemId: 101 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Closed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(0);
      expect(result.details[0].action).toBe('skip');
    });

    it('should close work item when increment completed but ADO active', async () => {
      await writeIncrement(tmpDir, '0003-need-close', {
        status: 'completed',
        external_sync: { ado: { workItemId: 102 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.details[0].action).toBe('close');
      expect(result.details[0].reason).toContain('completed');
      expect(result.details[0].reason).toContain('Active');
    });

    it('should reopen work item when increment active but ADO closed', async () => {
      await writeIncrement(tmpDir, '0004-need-reopen', {
        status: 'active',
        external_sync: { ado: { workItemId: 103 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Closed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
      expect(result.details[0].action).toBe('reopen');
    });

    it('should recognize all closed ADO states: Done', async () => {
      await writeIncrement(tmpDir, '0005-done', {
        status: 'completed',
        external_sync: { ado: { workItemId: 104 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Done'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0); // both closed
    });

    it('should recognize all closed ADO states: Resolved', async () => {
      await writeIncrement(tmpDir, '0006-resolved', {
        status: 'completed',
        external_sync: { ado: { workItemId: 105 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Resolved'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize all closed ADO states: Removed', async () => {
      await writeIncrement(tmpDir, '0007-removed', {
        status: 'completed',
        external_sync: { ado: { workItemId: 106 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Removed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize active ADO states: New', async () => {
      await writeIncrement(tmpDir, '0008-new', {
        status: 'active',
        external_sync: { ado: { workItemId: 107 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('New'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0); // both active
    });

    it('should recognize active ADO states: In Progress', async () => {
      await writeIncrement(tmpDir, '0009-ip', {
        status: 'active',
        external_sync: { ado: { workItemId: 108 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('In Progress'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize active ADO states: Committed', async () => {
      await writeIncrement(tmpDir, '0010-committed', {
        status: 'active',
        external_sync: { ado: { workItemId: 109 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Committed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should treat unknown ADO state as not closed', async () => {
      await writeIncrement(tmpDir, '0011-unknown', {
        status: 'completed',
        external_sync: { ado: { workItemId: 110 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('CustomState'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should default to Unknown when System.State field is missing', async () => {
      await writeIncrement(tmpDir, '0012-no-state', {
        status: 'completed',
        external_sync: { ado: { workItemId: 111 } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 111, fields: {} }),
        text: vi.fn().mockResolvedValue(''),
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // Unknown is not in closed list, so mismatch
      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });
  });

  // =========================================================================
  // Dry run mode
  // =========================================================================

  describe('dry run mode', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should not call updateWorkItemState in dry run', async () => {
      await writeIncrement(tmpDir, '0001-dry', {
        status: 'completed',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(0);
      expect(result.details[0].action).toBe('skip');
      // fetch was called once for GET, never for PATCH
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should log DRY RUN for close in dry run', async () => {
      await writeIncrement(tmpDir, '0002-dry-close', {
        status: 'completed',
        external_sync: { ado: { workItemId: 101 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Would close'));
    });

    it('should log DRY RUN for reopen in dry run', async () => {
      await writeIncrement(tmpDir, '0003-dry-reopen', {
        status: 'active',
        external_sync: { ado: { workItemId: 102 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Closed'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Would reactivate'));
    });

    it('should log dry run warning in summary', async () => {
      const rec = new AdoReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    });
  });

  // =========================================================================
  // API calls (getWorkItem / updateWorkItemState)
  // =========================================================================

  describe('API calls', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should call fetch with correct URL and auth for getWorkItem', async () => {
      await writeIncrement(tmpDir, '0001-api', {
        status: 'active',
        external_sync: { ado: { workItemId: 999 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 999));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/999'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should call fetch with PATCH method for updateWorkItemState', async () => {
      await writeIncrement(tmpDir, '0002-patch', {
        status: 'completed',
        external_sync: { ado: { workItemId: 888 } },
      });
      // First call: GET (active), Second call: PATCH (success)
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 888))
        .mockResolvedValueOnce(adoPatchSuccess());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      // Second fetch call should be PATCH
      const patchCall = mockFetch.mock.calls[1];
      expect(patchCall[1].method).toBe('PATCH');
      expect(patchCall[1].headers['Content-Type']).toBe('application/json-patch+json');
    });

    it('should send correct operations payload for close', async () => {
      await writeIncrement(tmpDir, '0003-close-payload', {
        status: 'completed',
        external_sync: { ado: { workItemId: 777 } },
      });
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 777))
        .mockResolvedValueOnce(adoPatchSuccess());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      const patchCall = mockFetch.mock.calls[1];
      const body = JSON.parse(patchCall[1].body);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ op: 'add', path: '/fields/System.State', value: 'Closed' }),
          expect.objectContaining({ op: 'add', path: '/fields/System.History' }),
        ]),
      );
    });

    it('should send correct operations payload for reopen', async () => {
      await writeIncrement(tmpDir, '0004-reopen-payload', {
        status: 'active',
        external_sync: { ado: { workItemId: 666 } },
      });
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Closed', 666))
        .mockResolvedValueOnce(adoPatchSuccess());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      const patchCall = mockFetch.mock.calls[1];
      const body = JSON.parse(patchCall[1].body);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ op: 'add', path: '/fields/System.State', value: 'Active' }),
        ]),
      );
    });

    it('should use organization from issueTracker.organization_ado', async () => {
      mockConfigManagerRead.mockResolvedValue({
        issueTracker: { organization_ado: 'my-org' },
      });
      await writeIncrement(tmpDir, '0005-org', {
        status: 'active',
        external_sync: { ado: { workItemId: 555 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 555));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dev.azure.com/my-org'),
        expect.anything(),
      );
    });

    it('should fall back to sync.ado.organization when issueTracker.organization_ado is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { ado: { organization: 'fallback-org' } },
      });
      await writeIncrement(tmpDir, '0006-fb-org', {
        status: 'active',
        external_sync: { ado: { workItemId: 444 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active', 444));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dev.azure.com/fallback-org'),
        expect.anything(),
      );
    });

    it('should throw when organization is empty in getWorkItem', async () => {
      mockConfigManagerRead.mockResolvedValue({});
      await writeIncrement(tmpDir, '0007-no-org', {
        status: 'active',
        external_sync: { ado: { workItemId: 333 } },
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ADO credentials not configured');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should add API error to errors array', async () => {
      await writeIncrement(tmpDir, '0001-err', {
        status: 'active',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('100');
      expect(result.errors[0]).toContain('Network error');
    });

    it('should add error detail with action=error', async () => {
      await writeIncrement(tmpDir, '0002-err-detail', {
        status: 'completed',
        external_sync: { ado: { workItemId: 200 } },
      });
      mockFetch.mockRejectedValue(new Error('Timeout'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details[0].action).toBe('error');
      expect(result.details[0].workItemId).toBe(200);
      expect(result.details[0].reason).toContain('Timeout');
    });

    it('should continue processing other increments after an error', async () => {
      await writeIncrement(tmpDir, '0001-fail', {
        status: 'active',
        external_sync: { ado: { workItemId: 100 } },
      });
      await writeIncrement(tmpDir, '0002-ok', {
        status: 'active',
        external_sync: { ado: { workItemId: 200 } },
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Fail for 100'))
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 200));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.details).toHaveLength(2);
    });

    it('should handle fetch returning non-ok status for getWorkItem', async () => {
      await writeIncrement(tmpDir, '0003-404', {
        status: 'active',
        external_sync: { ado: { workItemId: 300 } },
      });
      mockFetch.mockResolvedValue(adoErrorResponse(404, 'Not Found'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('404');
    });

    it('should handle fetch returning non-ok status for updateWorkItemState', async () => {
      await writeIncrement(tmpDir, '0004-patch-err', {
        status: 'completed',
        external_sync: { ado: { workItemId: 400 } },
      });
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 400))
        .mockResolvedValueOnce(adoErrorResponse(403, 'Forbidden'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('403');
    });

    it('should catch top-level reconciliation errors', async () => {
      // Corrupt the scanIncrements by making readdir fail after config loads
      // Write config but make increments a file instead of directory
      const incPath = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(path.dirname(incPath), { recursive: true });
      await fs.writeFile(incPath, 'not a directory');

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Reconciliation error');
    });
  });

  // =========================================================================
  // Multiple increments
  // =========================================================================

  describe('multiple increments', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should reconcile multiple increments with different states', async () => {
      // Increment 1: completed but ADO active -> should close
      await writeIncrement(tmpDir, '0001-done', {
        status: 'completed',
        external_sync: { ado: { workItemId: 101 } },
      });
      // Increment 2: active but ADO closed -> should reopen
      await writeIncrement(tmpDir, '0002-active', {
        status: 'active',
        external_sync: { ado: { workItemId: 102 } },
      });
      // Increment 3: active and ADO active -> skip
      await writeIncrement(tmpDir, '0003-ok', {
        status: 'active',
        external_sync: { ado: { workItemId: 103 } },
      });

      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 101))    // GET 101
        .mockResolvedValueOnce(adoPatchSuccess())                      // PATCH 101 -> close
        .mockResolvedValueOnce(adoWorkItemResponse('Closed', 102))    // GET 102
        .mockResolvedValueOnce(adoPatchSuccess())                      // PATCH 102 -> reopen
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 103));   // GET 103

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(3);
      expect(result.mismatches).toBe(2);
      expect(result.closed).toBe(1);
      expect(result.reopened).toBe(1);
      expect(result.details).toHaveLength(3);
    });

    it('should process user story work items in addition to main work item', async () => {
      await writeIncrement(tmpDir, '0001-stories', {
        status: 'completed',
        external_sync: {
          ado: {
            workItemId: 200,
            userStories: [
              { id: 'US-001', workItemId: 201 },
            ],
          },
        },
      });

      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 200))    // GET main
        .mockResolvedValueOnce(adoPatchSuccess())                      // PATCH main -> close
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 201))    // GET US
        .mockResolvedValueOnce(adoPatchSuccess());                     // PATCH US -> close

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(2);
      expect(result.details).toHaveLength(2);
      expect(result.details[1].incrementId).toContain('US-001');
    });
  });

  // =========================================================================
  // Summary logging
  // =========================================================================

  describe('summary logging', () => {
    it('should log reconciliation summary', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('ADO RECONCILIATION SUMMARY'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Increments scanned'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Mismatches found'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Work items closed'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Work items reopened'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Errors'));
    });

    it('should log scanning message with increment count', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      await writeIncrement(tmpDir, '0001-x', {
        status: 'active',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 increment'));
    });
  });

  // =========================================================================
  // AdoReconcileResult structure
  // =========================================================================

  describe('AdoReconcileResult structure', () => {
    it('should have all required fields initialized', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result).toHaveProperty('scanned');
      expect(result).toHaveProperty('mismatches');
      expect(result).toHaveProperty('closed');
      expect(result).toHaveProperty('reopened');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have correct detail shape for close action', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      await writeIncrement(tmpDir, '0001-shape', {
        status: 'completed',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active'))
        .mockResolvedValueOnce(adoPatchSuccess());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      const detail = result.details[0];
      expect(detail.incrementId).toBe('0001-shape');
      expect(detail.action).toBe('close');
      expect(detail.workItemId).toBe(100);
      expect(typeof detail.reason).toBe('string');
    });
  });

  // =========================================================================
  // Permission presets integration
  // =========================================================================

  describe('permission presets integration', () => {
    it('should honor bidirectional preset canUpsert for canUpdate check', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'bidirectional',
          ado: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should not return early (canUpsert=true from preset is used)
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('ADO sync is disabled'));
    });

    it('should block when read-only preset', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'read-only',
          ado: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: false,
        canUpsert: false,
        canDelete: false,
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
    });

    it('should use canUpdateExternalItems setting over preset canUpsert when both present', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'read-only',
          ado: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: true },
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: false,
        canUpsert: false,
        canDelete: false,
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // canUpdateExternalItems=true overrides preset canUpsert=false
      // canUpdateStatus=true from settings overrides preset canUpdateStatus=false
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('ADO sync is disabled'));
    });
  });

  // =========================================================================
  // reconcileAdo convenience function
  // =========================================================================

  describe('reconcileAdo convenience function', () => {
    it('should create AdoReconciler and call reconcile', async () => {
      await writeConfig(tmpDir, { sync: { ado: { enabled: false } } });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: false });

      const result = await reconcileAdo(tmpDir, false);

      expect(result.scanned).toBe(0);
    });

    it('should pass dryRun parameter through', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      await writeIncrement(tmpDir, '0001-conv', {
        status: 'completed',
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const result = await reconcileAdo(tmpDir, true);

      expect(result.closed).toBe(0); // dry run
      expect(result.mismatches).toBe(1);
    });
  });

  // =========================================================================
  // loadConfig
  // =========================================================================

  describe('loadConfig', () => {
    it('should return empty object when config.json does not exist', async () => {
      // Don't write any config
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      // loadConfig is private, so we test via reconcile behavior
      // No config = ADO disabled
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should parse valid config.json', async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // If config parsed, it won't show 'disabled' message when ADO is enabled
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Scanning'));
    });

    it('should return empty object for invalid JSON in config', async () => {
      const configDir = path.join(tmpDir, '.specweave');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), 'broken json');

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // Should not crash, but ADO will be disabled with empty config
      expect(result.scanned).toBe(0);
    });
  });

  // =========================================================================
  // hasAdoCredentials
  // =========================================================================

  describe('hasAdoCredentials', () => {
    it('should return true when AZURE_DEVOPS_PAT is set', async () => {
      process.env.AZURE_DEVOPS_PAT = 'some-pat';
      delete process.env.AZURE_DEVOPS_TOKEN;

      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).not.toContain('ADO credentials not configured');
    });

    it('should return true when AZURE_DEVOPS_TOKEN is set', async () => {
      delete process.env.AZURE_DEVOPS_PAT;
      process.env.AZURE_DEVOPS_TOKEN = 'some-token';

      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).not.toContain('ADO credentials not configured');
    });

    it('should return false when neither env var is set', async () => {
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_TOKEN;

      await writeConfig(tmpDir, adoEnabledConfig());
      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('ADO credentials not configured');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, adoEnabledConfig());
    });

    it('should handle increment with no main workItem but with user stories', async () => {
      await writeIncrement(tmpDir, '0001-us-only', {
        status: 'completed',
        external_sync: {
          ado: {
            workItemId: null, // no main work item (will be skipped by scan filter)
          },
        },
      });

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // workItemId is null/falsy, so scanIncrements should skip it
      expect(result.scanned).toBe(0);
    });

    it('should handle empty userStories array', async () => {
      await writeIncrement(tmpDir, '0001-empty-us', {
        status: 'active',
        external_sync: {
          ado: { workItemId: 100, userStories: [] },
        },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      expect(result.details).toHaveLength(1); // only main work item
    });

    it('should handle userStories being non-array', async () => {
      await writeIncrement(tmpDir, '0001-bad-us', {
        status: 'active',
        external_sync: {
          ado: { workItemId: 100, userStories: 'not-an-array' },
        },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      expect(result.details).toHaveLength(1); // only main
    });

    it('should handle unknown metadata status (neither close nor active)', async () => {
      await writeIncrement(tmpDir, '0001-weird', {
        status: 'paused', // not in either list
        external_sync: { ado: { workItemId: 100 } },
      });
      mockFetch.mockResolvedValue(adoWorkItemResponse('Active'));

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // 'paused' is neither shouldBeClosed nor shouldBeActive, so state matches (skip)
      expect(result.mismatches).toBe(0);
      expect(result.details[0].action).toBe('skip');
    });

    it('should construct user story context as incrementId/userStoryId', async () => {
      await writeIncrement(tmpDir, '0001-ctx', {
        status: 'completed',
        external_sync: {
          ado: {
            workItemId: 100,
            userStories: [{ id: 'US-007', workItemId: 107 }],
          },
        },
      });
      mockFetch
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 100))
        .mockResolvedValueOnce(adoPatchSuccess())
        .mockResolvedValueOnce(adoWorkItemResponse('Active', 107))
        .mockResolvedValueOnce(adoPatchSuccess());

      const rec = new AdoReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details[1].incrementId).toBe('0001-ctx/US-007');
    });
  });
});
