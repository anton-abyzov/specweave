/**
 * Tests for JiraReconciler
 *
 * Tests the JIRA reconciliation logic that syncs JIRA issue states
 * with local increment metadata statuses.
 *
 * @module tests/unit/sync/jira-reconciler.test
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

import { JiraReconciler, reconcileJira } from '../../../src/sync/jira-reconciler.js';
import type { JiraReconcileResult, IncrementJiraState, JiraReconcileOptions } from '../../../src/sync/jira-reconciler.js';
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

/** Create a config.json that enables JIRA sync with bidirectional permissions */
function jiraEnabledConfig() {
  return {
    sync: {
      preset: 'bidirectional',
      jira: { enabled: true },
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

/** Build a fake JIRA API JSON response for getIssue */
function jiraIssueResponse(statusName: string, key = 'PROJ-100') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      key,
      fields: { status: { name: statusName } },
    }),
    text: vi.fn().mockResolvedValue(''),
  };
}

/** Build a fake JIRA API error response */
function jiraErrorResponse(status: number, body = 'Error') {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ message: body }),
    text: vi.fn().mockResolvedValue(body),
  };
}

/** Build a fake JIRA transitions response */
function jiraTransitionsResponse(transitions: Array<{ id: string; name: string; to?: { name: string } }>) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ transitions }),
    text: vi.fn().mockResolvedValue(''),
  };
}

/** Build a fake JIRA API success POST response (for transitions and comments) */
function jiraPostSuccess() {
  return {
    ok: true,
    status: 204,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
  };
}

/**
 * Set up mockFetch to handle the full close flow:
 * 1. GET issue -> returns statusName
 * 2. POST comment -> success
 * 3. GET transitions -> returns transition to targetName
 * 4. POST transition -> success
 */
function setupCloseFlow(statusName: string, key = 'PROJ-100') {
  mockFetch
    .mockResolvedValueOnce(jiraIssueResponse(statusName, key))      // GET issue
    .mockResolvedValueOnce(jiraPostSuccess())                        // POST comment
    .mockResolvedValueOnce(jiraTransitionsResponse([                 // GET transitions
      { id: '31', name: 'Done', to: { name: 'Done' } },
      { id: '21', name: 'In Progress', to: { name: 'In Progress' } },
    ]))
    .mockResolvedValueOnce(jiraPostSuccess());                       // POST transition
}

/**
 * Set up mockFetch to handle the full reopen flow:
 * 1. GET issue -> returns closed status
 * 2. POST comment -> success
 * 3. GET transitions -> returns transition to To Do
 * 4. POST transition -> success
 */
function setupReopenFlow(statusName: string, key = 'PROJ-100') {
  mockFetch
    .mockResolvedValueOnce(jiraIssueResponse(statusName, key))      // GET issue
    .mockResolvedValueOnce(jiraPostSuccess())                        // POST comment
    .mockResolvedValueOnce(jiraTransitionsResponse([                 // GET transitions
      { id: '11', name: 'To Do', to: { name: 'To Do' } },
      { id: '31', name: 'Done', to: { name: 'Done' } },
    ]))
    .mockResolvedValueOnce(jiraPostSuccess());                       // POST transition
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JiraReconciler', () => {
  let tmpDir: string;
  let logger: Logger;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-reconciler-test-'));
    logger = createMockLogger();

    // Save env vars
    savedEnv.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    savedEnv.JIRA_EMAIL = process.env.JIRA_EMAIL;

    // Set JIRA credentials by default
    process.env.JIRA_API_TOKEN = 'test-jira-token';
    process.env.JIRA_EMAIL = 'test@example.com';

    // Default mock returns
    mockResolvePermissions.mockReturnValue({
      canRead: true,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: false,
    });

    mockConfigManagerRead.mockResolvedValue({
      issueTracker: { domain: 'test-company.atlassian.net' },
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
    if (savedEnv.JIRA_API_TOKEN !== undefined) {
      process.env.JIRA_API_TOKEN = savedEnv.JIRA_API_TOKEN;
    } else {
      delete process.env.JIRA_API_TOKEN;
    }
    if (savedEnv.JIRA_EMAIL !== undefined) {
      process.env.JIRA_EMAIL = savedEnv.JIRA_EMAIL;
    } else {
      delete process.env.JIRA_EMAIL;
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
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      expect(rec['projectRoot']).toBe(tmpDir);
    });

    it('should default dryRun to false', () => {
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      expect(rec['dryRun']).toBe(false);
    });

    it('should set dryRun to true when provided', () => {
      const rec = new JiraReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      expect(rec['dryRun']).toBe(true);
    });

    it('should create a ConfigManager with projectRoot', () => {
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      expect(rec['configManager']).toBeDefined();
    });

    it('should use provided logger', () => {
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      expect(rec['logger']).toBe(logger);
    });
  });

  // =========================================================================
  // reconcile() - config/credential checks
  // =========================================================================

  describe('reconcile - config and credential checks', () => {
    it('should return early with 0 results when JIRA sync is disabled', async () => {
      await writeConfig(tmpDir, { sync: { jira: { enabled: false } } });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: false });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(result.mismatches).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('JIRA sync is disabled'));
    });

    it('should return early when canUpdateExternalItems is false and canUpsert is false', async () => {
      await writeConfig(tmpDir, {
        sync: {
          jira: { enabled: true },
          settings: { canUpdateExternalItems: false },
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: true });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('JIRA sync is disabled'));
    });

    it('should return early when canUpdateStatus is false', async () => {
      await writeConfig(tmpDir, {
        sync: {
          jira: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: false },
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: true, canUpdateStatus: false });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('status updates are disabled'));
    });

    it('should error when no JIRA credentials are configured (missing token)', async () => {
      delete process.env.JIRA_API_TOKEN;

      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('JIRA credentials not found'),
      );
    });

    it('should error when no JIRA credentials are configured (missing email)', async () => {
      delete process.env.JIRA_EMAIL;

      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });

    it('should error when domain is not configured', async () => {
      mockConfigManagerRead.mockResolvedValue({});

      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });

    it('should call resolvePermissions with preset and legacy settings', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'bidirectional',
          jira: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: true },
        },
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
          jira: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({ canUpsert: true, canUpdateStatus: true });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should not return early
      expect(result.errors).not.toContain('JIRA credentials not configured');
    });

    it('should return empty config when config.json does not exist', async () => {
      // No config file, so JIRA will be disabled
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
    });

    it('should initialize auth as base64-encoded email:token', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      const expectedAuth = Buffer.from('test@example.com:test-jira-token').toString('base64');
      expect(rec['auth']).toBe(expectedAuth);
    });

    it('should set domain from configManager', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(rec['domain']).toBe('test-company.atlassian.net');
    });
  });

  // =========================================================================
  // scanIncrements()
  // =========================================================================

  describe('scanIncrements', () => {
    it('should return 0 scanned when increments directory does not exist', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
          external_sync: { jira: { issueKey: 'PROJ-1' } },
        }),
      );
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
          external_sync: { jira: { issueKey: 'PROJ-2' } },
        }),
      );
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip directories without metadata.json', async () => {
      await fs.mkdir(path.join(tmpDir, '.specweave', 'increments', '0001-test'), { recursive: true });
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip directories without JIRA issueKey or epic', async () => {
      await writeIncrement(tmpDir, '0001-no-jira', {
        status: 'active',
        external_sync: { github: { issueNumber: 42 } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should skip increments with invalid JSON metadata', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments', '0001-bad');
      await fs.mkdir(incDir, { recursive: true });
      await fs.writeFile(path.join(incDir, 'metadata.json'), 'not valid json!');
      await writeConfig(tmpDir, jiraEnabledConfig());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should extract increment with external_sync.jira.issueKey', async () => {
      await writeIncrement(tmpDir, '0001-feature', {
        status: 'active',
        featureId: 'FS-001',
        external_sync: { jira: { issueKey: 'PROJ-10', issueUrl: 'https://test.atlassian.net/browse/PROJ-10' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-10'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should extract increment with external_sync.jira.epic (legacy)', async () => {
      await writeIncrement(tmpDir, '0001-epic', {
        status: 'active',
        external_sync: { jira: { epic: 'PROJ-20' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-20'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should support external_ids.jira (legacy naming)', async () => {
      await writeIncrement(tmpDir, '0001-legacy', {
        status: 'active',
        external_ids: { jira: { issueKey: 'PROJ-30' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('To Do', 'PROJ-30'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should prefer external_sync.jira over external_ids.jira', async () => {
      await writeIncrement(tmpDir, '0001-both', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-40' } },
        external_ids: { jira: { issueKey: 'PROJ-99' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-40'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      // The issueKey used should be PROJ-40 from external_sync
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('PROJ-40'),
        expect.anything(),
      );
    });

    it('should derive featureId when metadata.feature_id is null', async () => {
      await writeIncrement(tmpDir, '0042-derived', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-50' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-50'));
      mockDeriveFeatureId.mockReturnValue('FS-042');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      expect(mockDeriveFeatureId).toHaveBeenCalledWith('0042-derived');
    });

    it('should use metadata.featureId when present', async () => {
      await writeIncrement(tmpDir, '0050-explicit', {
        status: 'active',
        featureId: 'FS-050',
        external_sync: { jira: { issueKey: 'PROJ-60' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-60'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      // deriveFeatureId should NOT have been called because featureId is already present
      expect(mockDeriveFeatureId).not.toHaveBeenCalled();
    });

    it('should use metadata.feature_id when featureId is absent', async () => {
      await writeIncrement(tmpDir, '0051-alt', {
        status: 'active',
        feature_id: 'FS-051',
        external_sync: { jira: { issueKey: 'PROJ-61' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-61'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();
      expect(mockDeriveFeatureId).not.toHaveBeenCalled();
    });

    it('should handle deriveFeatureId throwing without failing', async () => {
      await writeIncrement(tmpDir, '0060-bad-derive', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-70' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-70'));
      mockDeriveFeatureId.mockImplementation(() => { throw new Error('bad'); });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should extract user story issues when present', async () => {
      await writeIncrement(tmpDir, '0070-stories', {
        status: 'active',
        external_sync: {
          jira: {
            issueKey: 'PROJ-80',
            stories: [
              { id: 'US-001', issueKey: 'PROJ-81' },
              { userStoryId: 'US-002', key: 'PROJ-82' },
            ],
          },
        },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      // main + 2 user stories = 3 fetch calls for getIssue
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      // 3 issues: 1 main + 2 user stories
      expect(result.details).toHaveLength(3);
    });

    it('should skip user story entries without issueKey or key', async () => {
      await writeIncrement(tmpDir, '0071-partial-stories', {
        status: 'active',
        external_sync: {
          jira: {
            issueKey: 'PROJ-90',
            stories: [
              { id: 'US-001' }, // no issueKey or key
              { id: 'US-002', issueKey: 'PROJ-91' },
            ],
          },
        },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // 1 main + 1 valid user story = 2 issues
      expect(result.details).toHaveLength(2);
    });

    it('should set metadataStatus to unknown when metadata.status is missing', async () => {
      await writeIncrement(tmpDir, '0080-no-status', {
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      await writeConfig(tmpDir, jiraEnabledConfig());
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-100'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
    });

    it('should skip non-directory entries', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(incDir, { recursive: true });
      // Create a plain file (not directory) in increments
      await fs.writeFile(path.join(incDir, 'not-a-dir.txt'), 'hello');

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });
  });

  // =========================================================================
  // reconcileIncrement - status mapping
  // =========================================================================

  describe('reconcileIncrement - status mapping', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should determine completed status as shouldBeClosed', async () => {
      await writeIncrement(tmpDir, '0001-done', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      setupCloseFlow('In Progress', 'PROJ-100');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should determine abandoned status as shouldBeClosed', async () => {
      await writeIncrement(tmpDir, '0002-abandoned', {
        status: 'abandoned',
        external_sync: { jira: { issueKey: 'PROJ-101' } },
      });
      setupCloseFlow('In Progress', 'PROJ-101');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should determine active status as shouldBeOpen', async () => {
      await writeIncrement(tmpDir, '0003-active', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-102' } },
      });
      setupReopenFlow('Done', 'PROJ-102');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine planning status as shouldBeOpen', async () => {
      await writeIncrement(tmpDir, '0004-planning', {
        status: 'planning',
        external_sync: { jira: { issueKey: 'PROJ-103' } },
      });
      setupReopenFlow('Closed', 'PROJ-103');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine backlog status as shouldBeOpen', async () => {
      await writeIncrement(tmpDir, '0005-backlog', {
        status: 'backlog',
        external_sync: { jira: { issueKey: 'PROJ-104' } },
      });
      setupReopenFlow('Resolved', 'PROJ-104');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });

    it('should determine ready_for_review status as shouldBeOpen', async () => {
      await writeIncrement(tmpDir, '0006-review', {
        status: 'ready_for_review',
        external_sync: { jira: { issueKey: 'PROJ-105' } },
      });
      setupReopenFlow("Won't Do", 'PROJ-105');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
    });
  });

  // =========================================================================
  // reconcileIssue - state comparison
  // =========================================================================

  describe('reconcileIssue - state comparison', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should skip when state already matches (both open)', async () => {
      await writeIncrement(tmpDir, '0001-match', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-100'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
        external_sync: { jira: { issueKey: 'PROJ-101' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Done', 'PROJ-101'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(0);
      expect(result.details[0].action).toBe('skip');
    });

    it('should close issue when increment completed but JIRA open', async () => {
      await writeIncrement(tmpDir, '0003-need-close', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-102' } },
      });
      setupCloseFlow('In Progress', 'PROJ-102');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.details[0].action).toBe('close');
      expect(result.details[0].reason).toContain('completed');
      expect(result.details[0].reason).toContain('In Progress');
    });

    it('should reopen issue when increment active but JIRA closed', async () => {
      await writeIncrement(tmpDir, '0004-need-reopen', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-103' } },
      });
      setupReopenFlow('Done', 'PROJ-103');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.reopened).toBe(1);
      expect(result.details[0].action).toBe('reopen');
    });

    // Test all JIRA closed statuses
    it('should recognize Done as closed', async () => {
      await writeIncrement(tmpDir, '0005-done', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-104' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Done', 'PROJ-104'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0); // both closed
    });

    it('should recognize Closed as closed', async () => {
      await writeIncrement(tmpDir, '0006-closed', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-105' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Closed', 'PROJ-105'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize Resolved as closed', async () => {
      await writeIncrement(tmpDir, '0007-resolved', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-106' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Resolved', 'PROJ-106'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it("should recognize Won't Do as closed", async () => {
      await writeIncrement(tmpDir, '0008-wontdo', {
        status: 'abandoned',
        external_sync: { jira: { issueKey: 'PROJ-107' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse("Won't Do", 'PROJ-107'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0); // both "closed"
    });

    // Test all JIRA open statuses
    it('should recognize To Do as open', async () => {
      await writeIncrement(tmpDir, '0009-todo', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-108' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('To Do', 'PROJ-108'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0); // both open
    });

    it('should recognize In Progress as open', async () => {
      await writeIncrement(tmpDir, '0010-ip', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-109' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-109'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize In Review as open', async () => {
      await writeIncrement(tmpDir, '0011-review', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-110' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Review', 'PROJ-110'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize Open as open', async () => {
      await writeIncrement(tmpDir, '0012-open', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-111' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Open', 'PROJ-111'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should recognize Reopened as open', async () => {
      await writeIncrement(tmpDir, '0013-reopened', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-112' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Reopened', 'PROJ-112'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(0);
    });

    it('should treat unknown JIRA status as not closed (open)', async () => {
      await writeIncrement(tmpDir, '0014-unknown', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-113' } },
      });
      setupCloseFlow('CustomStatus', 'PROJ-113');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should default to Unknown when status field is missing', async () => {
      await writeIncrement(tmpDir, '0015-no-status', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-114' } },
      });
      // Issue with no status.name field
      setupCloseFlow('Unknown', 'PROJ-114');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // Unknown is not in closed list, so mismatch
      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });

    it('should handle issue response with null status field', async () => {
      await writeIncrement(tmpDir, '0016-null-status', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-115' } },
      });
      // Return issue with missing status entirely
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            key: 'PROJ-115',
            fields: {},
          }),
          text: vi.fn().mockResolvedValue(''),
        })
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());   // transition

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // status is Unknown (undefined), not in closed list
      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(1);
    });
  });

  // =========================================================================
  // Dry run mode
  // =========================================================================

  describe('dry run mode', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should not call transition API in dry run', async () => {
      await writeIncrement(tmpDir, '0001-dry', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-100'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      const result = await rec.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(0);
      expect(result.details[0].action).toBe('skip');
      // fetch was called once for GET issue, never for transition
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should log DRY RUN for close in dry run', async () => {
      await writeIncrement(tmpDir, '0002-dry-close', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-101' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-101'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Would close'));
    });

    it('should log DRY RUN for reopen in dry run', async () => {
      await writeIncrement(tmpDir, '0003-dry-reopen', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-102' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('Done', 'PROJ-102'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Would reopen'));
    });

    it('should log dry run warning in summary', async () => {
      const rec = new JiraReconciler({ projectRoot: tmpDir, dryRun: true, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    });
  });

  // =========================================================================
  // API calls (getIssue / transitionIssue / addComment)
  // =========================================================================

  describe('API calls', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should call fetch with correct URL and auth for getIssue', async () => {
      await writeIncrement(tmpDir, '0001-api', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-999' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-999'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-company.atlassian.net/rest/api/3/issue/PROJ-999'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
            Accept: 'application/json',
          }),
        }),
      );
    });

    it('should add comment before transitioning when closing', async () => {
      await writeIncrement(tmpDir, '0002-comment', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-200' } },
      });
      setupCloseFlow('In Progress', 'PROJ-200');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      // Second call (index 1) should be the comment POST
      const commentCall = mockFetch.mock.calls[1];
      expect(commentCall[0]).toContain('PROJ-200/comment');
      expect(commentCall[1].method).toBe('POST');

      // Verify comment body contains reconciliation info
      const body = JSON.parse(commentCall[1].body);
      expect(body.body.content[0].content[0].text).toContain('Auto-Reconciled');
    });

    it('should fetch transitions for issue', async () => {
      await writeIncrement(tmpDir, '0003-transitions', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-300' } },
      });
      setupCloseFlow('In Progress', 'PROJ-300');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      // Third call (index 2) should be GET transitions
      const transitionCall = mockFetch.mock.calls[2];
      expect(transitionCall[0]).toContain('PROJ-300/transitions');
    });

    it('should POST transition with correct transition id', async () => {
      await writeIncrement(tmpDir, '0004-transition', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-400' } },
      });
      setupCloseFlow('In Progress', 'PROJ-400');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      // Fourth call (index 3) should be POST transition
      const transCall = mockFetch.mock.calls[3];
      expect(transCall[0]).toContain('PROJ-400/transitions');
      expect(transCall[1].method).toBe('POST');
      const body = JSON.parse(transCall[1].body);
      expect(body.transition.id).toBe('31'); // 'Done' transition id
    });

    it('should find transition by name match', async () => {
      await writeIncrement(tmpDir, '0005-name-match', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-500' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-500'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '41', name: 'Done' },  // match by name
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());   // transition

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
    });

    it('should find transition by to.name match', async () => {
      await writeIncrement(tmpDir, '0006-to-match', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-600' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-600'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '51', name: 'Finish', to: { name: 'Done' } },  // match by to.name
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());   // transition

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
    });

    it('should try alternative transitions when primary not found (close)', async () => {
      await writeIncrement(tmpDir, '0007-alt-close', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-700' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-700'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '61', name: 'Closed', to: { name: 'Closed' } },  // alternative
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());   // transition

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
      // Should use alternative id
      const transCall = mockFetch.mock.calls[3];
      const body = JSON.parse(transCall[1].body);
      expect(body.transition.id).toBe('61');
    });

    it('should try alternative transitions when primary not found (reopen)', async () => {
      await writeIncrement(tmpDir, '0008-alt-reopen', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-800' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('Done', 'PROJ-800'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '71', name: 'Reopened', to: { name: 'Reopened' } },  // alternative
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());   // transition

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.reopened).toBe(1);
    });

    it('should error when no matching transition found', async () => {
      await writeIncrement(tmpDir, '0009-no-trans', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-900' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-900'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '99', name: 'Start', to: { name: 'In Progress' } },  // no close transition
        ]));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No transition found');
      expect(result.errors[0]).toContain('Start');
    });

    it('should handle Resolved as alternative close transition', async () => {
      await writeIncrement(tmpDir, '0010-resolved', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-1000' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-1000'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '81', name: 'Resolved', to: { name: 'Resolved' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
    });

    it('should handle Complete as alternative close transition', async () => {
      await writeIncrement(tmpDir, '0011-complete', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-1001' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-1001'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '82', name: 'Complete', to: { name: 'Complete' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
    });

    it('should handle Open as alternative reopen transition', async () => {
      await writeIncrement(tmpDir, '0012-open-alt', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-1002' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('Done', 'PROJ-1002'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '83', name: 'Open', to: { name: 'Open' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.reopened).toBe(1);
    });

    it('should handle In Progress as alternative reopen transition', async () => {
      await writeIncrement(tmpDir, '0013-ip-alt', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-1003' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('Closed', 'PROJ-1003'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '84', name: 'In Progress', to: { name: 'In Progress' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.reopened).toBe(1);
    });

    it('should use domain from config for API URLs', async () => {
      mockConfigManagerRead.mockResolvedValue({
        issueTracker: { domain: 'my-team.atlassian.net' },
      });
      await writeIncrement(tmpDir, '0014-domain', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-1004' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-1004'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('my-team.atlassian.net'),
        expect.anything(),
      );
    });

    it('should not fail when comment POST returns non-ok (non-fatal)', async () => {
      await writeIncrement(tmpDir, '0015-comment-fail', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-1005' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-1005'))
        .mockResolvedValueOnce(jiraErrorResponse(500, 'Server Error'))  // comment fails
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should still close despite comment failure
      expect(result.closed).toBe(1);
      // Should log warning about comment failure
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to add comment'));
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should add API error to errors array when getIssue fails', async () => {
      await writeIncrement(tmpDir, '0001-err', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('PROJ-100');
      expect(result.errors[0]).toContain('Network error');
    });

    it('should add error detail with action=error', async () => {
      await writeIncrement(tmpDir, '0002-err-detail', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-200' } },
      });
      mockFetch.mockRejectedValue(new Error('Timeout'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details[0].action).toBe('error');
      expect(result.details[0].issueKey).toBe('PROJ-200');
      expect(result.details[0].reason).toContain('Timeout');
    });

    it('should continue processing other increments after an error', async () => {
      await writeIncrement(tmpDir, '0001-fail', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      await writeIncrement(tmpDir, '0002-ok', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-200' } },
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Fail for PROJ-100'))
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-200'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.details).toHaveLength(2);
    });

    it('should handle fetch returning non-ok status for getIssue', async () => {
      await writeIncrement(tmpDir, '0003-404', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-300' } },
      });
      mockFetch.mockResolvedValue(jiraErrorResponse(404, 'Not Found'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('404');
    });

    it('should handle fetch returning non-ok status for getTransitions', async () => {
      await writeIncrement(tmpDir, '0004-trans-err', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-400' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-400'))
        .mockResolvedValueOnce(jiraPostSuccess())  // comment
        .mockResolvedValueOnce(jiraErrorResponse(403, 'Forbidden'));  // transitions fail

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('403');
    });

    it('should handle fetch returning non-ok status for doTransition', async () => {
      await writeIncrement(tmpDir, '0005-do-trans-err', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-500' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-500'))
        .mockResolvedValueOnce(jiraPostSuccess())   // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraErrorResponse(500, 'Internal Server Error'));  // doTransition fails

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('500');
    });

    it('should catch top-level reconciliation errors', async () => {
      // Corrupt the scanIncrements by making increments a file instead of directory
      const incPath = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(path.dirname(incPath), { recursive: true });
      await fs.writeFile(incPath, 'not a directory');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should reconcile multiple increments with different states', async () => {
      // Increment 1: completed but JIRA open -> should close
      await writeIncrement(tmpDir, '0001-done', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-101' } },
      });
      // Increment 2: active but JIRA closed -> should reopen
      await writeIncrement(tmpDir, '0002-active', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-102' } },
      });
      // Increment 3: active and JIRA open -> skip
      await writeIncrement(tmpDir, '0003-ok', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-103' } },
      });

      // Flow for increment 1 (close): GET, comment, transitions, doTransition
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-101'))  // GET issue 1
        .mockResolvedValueOnce(jiraPostSuccess())                              // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess())                              // doTransition
        // Flow for increment 2 (reopen): GET, comment, transitions, doTransition
        .mockResolvedValueOnce(jiraIssueResponse('Done', 'PROJ-102'))          // GET issue 2
        .mockResolvedValueOnce(jiraPostSuccess())                              // comment
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '11', name: 'To Do', to: { name: 'To Do' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess())                              // doTransition
        // Flow for increment 3 (skip): GET only
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-103')); // GET issue 3

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(3);
      expect(result.mismatches).toBe(2);
      expect(result.closed).toBe(1);
      expect(result.reopened).toBe(1);
      expect(result.details).toHaveLength(3);
    });

    it('should process user story issues in addition to main issue', async () => {
      await writeIncrement(tmpDir, '0001-stories', {
        status: 'completed',
        external_sync: {
          jira: {
            issueKey: 'PROJ-200',
            stories: [
              { id: 'US-001', issueKey: 'PROJ-201' },
            ],
          },
        },
      });

      // Main issue close flow
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-200'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess())
        // User story close flow
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-201'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('JIRA RECONCILIATION SUMMARY'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Increments scanned'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Mismatches found'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Issues closed'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Issues reopened'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Errors'));
    });

    it('should log scanning message with increment count', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      await writeIncrement(tmpDir, '0001-x', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      await rec.reconcile();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 increment'));
    });
  });

  // =========================================================================
  // JiraReconcileResult structure
  // =========================================================================

  describe('JiraReconcileResult structure', () => {
    it('should have all required fields initialized', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
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
      await writeConfig(tmpDir, jiraEnabledConfig());
      await writeIncrement(tmpDir, '0001-shape', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      setupCloseFlow('In Progress', 'PROJ-100');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      const detail = result.details[0];
      expect(detail.incrementId).toBe('0001-shape');
      expect(detail.action).toBe('close');
      expect(detail.issueKey).toBe('PROJ-100');
      expect(typeof detail.reason).toBe('string');
    });

    it('should have correct detail shape for reopen action', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      await writeIncrement(tmpDir, '0002-shape', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-200' } },
      });
      setupReopenFlow('Done', 'PROJ-200');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      const detail = result.details[0];
      expect(detail.incrementId).toBe('0002-shape');
      expect(detail.action).toBe('reopen');
      expect(detail.issueKey).toBe('PROJ-200');
    });

    it('should have correct detail shape for error action', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      await writeIncrement(tmpDir, '0003-shape', {
        status: 'active',
        external_sync: { jira: { issueKey: 'PROJ-300' } },
      });
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      const detail = result.details[0];
      expect(detail.action).toBe('error');
      expect(detail.issueKey).toBe('PROJ-300');
      expect(detail.reason).toContain('Connection refused');
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
          jira: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // Should not return early (canUpsert=true from preset is used)
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('JIRA sync is disabled'));
    });

    it('should block when read-only preset', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'read-only',
          jira: { enabled: true },
          settings: {},
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: false,
        canUpsert: false,
        canDelete: false,
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(0);
    });

    it('should use canUpdateExternalItems setting over preset canUpsert when both present', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'read-only',
          jira: { enabled: true },
          settings: { canUpdateExternalItems: true, canUpdateStatus: true },
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: true,
        canUpdateStatus: false,
        canUpsert: false,
        canDelete: false,
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // canUpdateExternalItems=true overrides preset canUpsert=false
      // canUpdateStatus=true from settings overrides preset canUpdateStatus=false
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('JIRA sync is disabled'));
    });

    it('should block when push-only preset but canUpdateStatus is false', async () => {
      await writeConfig(tmpDir, {
        sync: {
          preset: 'push-only',
          jira: { enabled: true },
          settings: { canUpdateStatus: false },
        },
      });
      mockResolvePermissions.mockReturnValue({
        canRead: false,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // canUpdateStatus=false in settings overrides preset
      expect(result.scanned).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('status updates are disabled'));
    });
  });

  // =========================================================================
  // reconcileJira convenience function
  // =========================================================================

  describe('reconcileJira convenience function', () => {
    it('should create JiraReconciler and call reconcile', async () => {
      await writeConfig(tmpDir, { sync: { jira: { enabled: false } } });
      mockResolvePermissions.mockReturnValue({ canUpsert: false, canUpdateStatus: false });

      const result = await reconcileJira(tmpDir, false);

      expect(result.scanned).toBe(0);
    });

    it('should pass dryRun parameter through', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      await writeIncrement(tmpDir, '0001-conv', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-100'));

      const result = await reconcileJira(tmpDir, true);

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
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      // loadConfig is private, so we test via reconcile behavior
      // No config = JIRA disabled
      const result = await rec.reconcile();
      expect(result.scanned).toBe(0);
    });

    it('should parse valid config.json', async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // If config parsed, it won't show 'disabled' message when JIRA is enabled
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Scanning'));
    });

    it('should return empty object for invalid JSON in config', async () => {
      const configDir = path.join(tmpDir, '.specweave');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), 'broken json');

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // Should not crash, but JIRA will be disabled with empty config
      expect(result.scanned).toBe(0);
    });
  });

  // =========================================================================
  // initCredentials
  // =========================================================================

  describe('initCredentials', () => {
    it('should return true when all credentials are configured', async () => {
      process.env.JIRA_API_TOKEN = 'my-token';
      process.env.JIRA_EMAIL = 'me@example.com';
      mockConfigManagerRead.mockResolvedValue({
        issueTracker: { domain: 'team.atlassian.net' },
      });

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).not.toContain('JIRA credentials not configured');
    });

    it('should return false when JIRA_API_TOKEN is missing', async () => {
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_EMAIL = 'me@example.com';

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });

    it('should return false when JIRA_EMAIL is missing', async () => {
      process.env.JIRA_API_TOKEN = 'my-token';
      delete process.env.JIRA_EMAIL;

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });

    it('should return false when domain is empty', async () => {
      process.env.JIRA_API_TOKEN = 'my-token';
      process.env.JIRA_EMAIL = 'me@example.com';
      mockConfigManagerRead.mockResolvedValue({
        issueTracker: { domain: '' },
      });

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });

    it('should return false when neither env var is set', async () => {
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;

      await writeConfig(tmpDir, jiraEnabledConfig());
      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.errors).toContain('JIRA credentials not configured');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should handle increment with no main issue but with user stories', async () => {
      await writeIncrement(tmpDir, '0001-us-only', {
        status: 'completed',
        external_sync: {
          jira: {
            // no issueKey or epic - will be skipped by scan filter
          },
        },
      });

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      // issueKey is absent, so scanIncrements should skip it
      expect(result.scanned).toBe(0);
    });

    it('should handle empty stories array', async () => {
      await writeIncrement(tmpDir, '0001-empty-us', {
        status: 'active',
        external_sync: {
          jira: { issueKey: 'PROJ-100', stories: [] },
        },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      expect(result.details).toHaveLength(1); // only main issue
    });

    it('should handle stories being non-array', async () => {
      await writeIncrement(tmpDir, '0001-bad-us', {
        status: 'active',
        external_sync: {
          jira: { issueKey: 'PROJ-100', stories: 'not-an-array' },
        },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();
      expect(result.scanned).toBe(1);
      expect(result.details).toHaveLength(1); // only main
    });

    it('should handle unknown metadata status (neither close nor open)', async () => {
      await writeIncrement(tmpDir, '0001-weird', {
        status: 'paused', // not in either list
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      // 'paused' is neither shouldBeClosed nor shouldBeOpen, so state matches (skip)
      expect(result.mismatches).toBe(0);
      expect(result.details[0].action).toBe('skip');
    });

    it('should construct user story context as incrementId/userStoryId', async () => {
      await writeIncrement(tmpDir, '0001-ctx', {
        status: 'completed',
        external_sync: {
          jira: {
            issueKey: 'PROJ-100',
            stories: [{ id: 'US-007', issueKey: 'PROJ-107' }],
          },
        },
      });
      // Main issue close flow
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-100'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess())
        // User story close flow
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-107'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details[1].incrementId).toBe('0001-ctx/US-007');
    });

    it('should use story.key when story.issueKey is absent', async () => {
      await writeIncrement(tmpDir, '0001-key-alt', {
        status: 'active',
        external_sync: {
          jira: {
            issueKey: 'PROJ-100',
            stories: [{ id: 'US-010', key: 'PROJ-110' }],
          },
        },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-100'))
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-110'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details).toHaveLength(2);
      expect(result.details[1].issueKey).toBe('PROJ-110');
    });

    it('should use story.userStoryId when story.id is absent', async () => {
      await writeIncrement(tmpDir, '0001-usid', {
        status: 'active',
        external_sync: {
          jira: {
            issueKey: 'PROJ-100',
            stories: [{ userStoryId: 'US-020', issueKey: 'PROJ-120' }],
          },
        },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-100'))
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-120'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.details[1].incrementId).toBe('0001-usid/US-020');
    });

    it('should handle issueKey from external_sync.jira.epic (fallback)', async () => {
      await writeIncrement(tmpDir, '0001-epic-fb', {
        status: 'active',
        external_sync: {
          jira: { epic: 'PROJ-999' },  // no issueKey, use epic
        },
      });
      mockFetch.mockResolvedValue(jiraIssueResponse('In Progress', 'PROJ-999'));

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('PROJ-999'),
        expect.anything(),
      );
    });

    it('should handle case-insensitive transition matching', async () => {
      await writeIncrement(tmpDir, '0001-case', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-100' } },
      });
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('In Progress', 'PROJ-100'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'DONE', to: { name: 'DONE' } },  // uppercase
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.closed).toBe(1);
    });

    it('should handle multiple increments with same status', async () => {
      await writeIncrement(tmpDir, '0001-a', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-1' } },
      });
      await writeIncrement(tmpDir, '0002-b', {
        status: 'completed',
        external_sync: { jira: { issueKey: 'PROJ-2' } },
      });

      // Both need closing
      setupCloseFlow('In Progress', 'PROJ-1');
      // Append second flow
      mockFetch
        .mockResolvedValueOnce(jiraIssueResponse('To Do', 'PROJ-2'))
        .mockResolvedValueOnce(jiraPostSuccess())
        .mockResolvedValueOnce(jiraTransitionsResponse([
          { id: '31', name: 'Done', to: { name: 'Done' } },
        ]))
        .mockResolvedValueOnce(jiraPostSuccess());

      const rec = new JiraReconciler({ projectRoot: tmpDir, logger });
      const result = await rec.reconcile();

      expect(result.scanned).toBe(2);
      expect(result.closed).toBe(2);
    });
  });

  // =========================================================================
  // JIRA status constants
  // =========================================================================

  describe('JIRA status constants', () => {
    beforeEach(async () => {
      await writeConfig(tmpDir, jiraEnabledConfig());
    });

    it('should recognize all 4 JIRA closed statuses', async () => {
      const closedStatuses = ['Done', 'Closed', 'Resolved', "Won't Do"];

      for (const status of closedStatuses) {
        const tmpDirLocal = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-status-'));
        await writeConfig(tmpDirLocal, jiraEnabledConfig());
        await writeIncrement(tmpDirLocal, '0001-test', {
          status: 'completed',
          external_sync: { jira: { issueKey: 'PROJ-X' } },
        });
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jiraIssueResponse(status, 'PROJ-X'));

        const rec = new JiraReconciler({ projectRoot: tmpDirLocal, logger: createMockLogger() });
        const result = await rec.reconcile();

        expect(result.mismatches).toBe(0);
        await fs.rm(tmpDirLocal, { recursive: true, force: true });
      }
    });

    it('should recognize all 5 JIRA open statuses', async () => {
      const openStatuses = ['To Do', 'In Progress', 'In Review', 'Open', 'Reopened'];

      for (const status of openStatuses) {
        const tmpDirLocal = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-status-'));
        await writeConfig(tmpDirLocal, jiraEnabledConfig());
        await writeIncrement(tmpDirLocal, '0001-test', {
          status: 'active',
          external_sync: { jira: { issueKey: 'PROJ-X' } },
        });
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jiraIssueResponse(status, 'PROJ-X'));

        const rec = new JiraReconciler({ projectRoot: tmpDirLocal, logger: createMockLogger() });
        const result = await rec.reconcile();

        expect(result.mismatches).toBe(0);
        await fs.rm(tmpDirLocal, { recursive: true, force: true });
      }
    });
  });
});
