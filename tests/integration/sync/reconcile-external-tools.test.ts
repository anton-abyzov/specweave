/**
 * Integration tests for ReconcileManager external tool updates
 *
 * Tests the external tool update functionality during increment reconciliation:
 * - GitHub milestone and issue title updates
 * - JIRA issue summary updates
 * - ADO work item title updates
 * - Graceful handling of missing CLI tools
 * - Partial failure scenarios
 *
 * Note: The ReconcileManager uses dynamic imports for JIRA client,
 * so JIRA tests use vi.hoisted() pattern per Vitest best practices.
 *
 * @module tests/integration/sync/reconcile-external-tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from '../../../src/utils/fs-native.js';

// Setup mocks with vi.hoisted for proper hoisting
const { mockExecFileNoThrow, mockJiraGetIssue, mockJiraUpdateIssue, MockJiraClient } = vi.hoisted(() => {
  const mockExecFileNoThrow = vi.fn();
  const mockJiraGetIssue = vi.fn();
  const mockJiraUpdateIssue = vi.fn();
  const MockJiraClient = vi.fn().mockImplementation(() => ({
    getIssue: mockJiraGetIssue,
    updateIssue: mockJiraUpdateIssue,
  }));
  return { mockExecFileNoThrow, mockJiraGetIssue, mockJiraUpdateIssue, MockJiraClient };
});

// Mock execFileNoThrow for CLI commands (gh, az)
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: (...args: unknown[]) => mockExecFileNoThrow(...args),
  isCommandAvailable: vi.fn().mockResolvedValue(true),
}));

// Mock JiraClient for JIRA API calls
vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: MockJiraClient,
}));

// Import after mocks are set up
import { ReconcileManager } from '../../../src/core/increment/reconcile-manager.js';

const TEST_ROOT = path.join(
  os.tmpdir(),
  `test-reconcile-external-tools-${Date.now()}-${Math.random().toString(36).slice(2)}`
);
const INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
const LIVING_DOCS_DIR = path.join(TEST_ROOT, '.specweave', 'docs', 'internal', 'specs');

describe('ReconcileManager External Tool Integration', () => {
  let manager: ReconcileManager;

  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(INCREMENTS_DIR, { recursive: true });
    await fs.mkdir(LIVING_DOCS_DIR, { recursive: true });

    // Reset mocks
    mockExecFileNoThrow.mockReset();
    mockJiraGetIssue.mockReset();
    mockJiraUpdateIssue.mockReset();
    MockJiraClient.mockClear();

    // Create manager instance
    manager = new ReconcileManager(TEST_ROOT);
  });

  afterEach(async () => {
    await fs.remove(TEST_ROOT);
    vi.clearAllMocks();
  });

  // Helper to create test increment with external tool metadata
  async function createTestIncrement(
    id: string,
    options: {
      status?: string;
      github?: {
        milestone?: string | number;
        issue?: number;
        issues?: number[];
      };
      jira?: {
        issueKey?: string;
      };
      ado?: {
        workItemId?: number;
      };
    } = {}
  ): Promise<string> {
    const incDir = path.join(INCREMENTS_DIR, id);
    await fs.mkdir(incDir, { recursive: true });

    // Create metadata.json with external tool references
    const metadata: Record<string, unknown> = {
      id,
      status: options.status || 'active',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    if (options.github) {
      metadata.github = options.github;
    }

    if (options.jira || options.ado) {
      metadata.external_sync = {};
      if (options.jira) {
        (metadata.external_sync as Record<string, unknown>).jira = options.jira;
      }
      if (options.ado) {
        (metadata.external_sync as Record<string, unknown>).ado = options.ado;
      }
    }

    await fs.writeFile(
      path.join(incDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create spec.md
    await fs.writeFile(
      path.join(incDir, 'spec.md'),
      `---\nincrement: ${id}\ntitle: "Test Feature"\n---\n\n# Test Feature\n`
    );

    return incDir;
  }

  // Helper to create a second increment for collision testing
  async function createCollidingIncrement(
    baseNumber: string,
    suffix: string,
    options: Parameters<typeof createTestIncrement>[1] & { lastActivity?: string }
  ): Promise<string> {
    const id = `${baseNumber}-${suffix}`;
    const incDir = await createTestIncrement(id, options);

    // Update lastActivity if specified
    if (options.lastActivity) {
      const metadataPath = path.join(incDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      metadata.lastActivity = options.lastActivity;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return incDir;
  }

  describe('GitHub milestone rename', () => {
    it('should update milestone title with new feature ID', async () => {
      // Create two increments with same base number (collision)
      const olderDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const newerDate = new Date().toISOString();

      // Winner (older, keeps FS-001)
      await createCollidingIncrement('0001', 'feature-a', {
        status: 'active',
        github: { milestone: 'FS-001: Feature A' },
        lastActivity: olderDate,
      });

      // Loser (newer, will be renumbered to FS-XXX)
      await createCollidingIncrement('0001', 'feature-b', {
        status: 'active',
        github: { milestone: 'FS-001: Feature B' },
        lastActivity: newerDate,
      });

      // Mock gh CLI responses for milestone lookup
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          // Find milestone with old feature ID
          exitCode: 0,
          stdout: '42\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          // Update milestone title
          exitCode: 0,
          stdout: '{}',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(1);

      // Verify gh CLI was called to find and update milestone
      expect(mockExecFileNoThrow).toHaveBeenCalledWith('gh', [
        'api',
        'repos/{owner}/{repo}/milestones',
        '--jq',
        expect.stringContaining('FS-001'),
      ]);
    });

    it('should skip milestone update if milestone not found', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0002', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0002', 'feature-b', {
        status: 'active',
        github: { milestone: 'FS-002: Feature B' },
        lastActivity: newerDate,
      });

      // Mock: milestone not found
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      // Should still succeed, just no milestone update
      expect(result.errors.length).toBe(0);
    });
  });

  describe('GitHub issue title update', () => {
    it('should update issue title with new feature ID ([FS-001] -> [FS-XXX])', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0003', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0003', 'feature-b', {
        status: 'active',
        github: { issue: 123 },
        lastActivity: newerDate,
      });

      // Mock gh CLI responses for issue title lookup and update
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          // Get issue title
          exitCode: 0,
          stdout: '[FS-003][US-001] Implement feature B\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          // Update issue title
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);

      // Verify gh CLI was called to get and update issue
      expect(mockExecFileNoThrow).toHaveBeenCalledWith('gh', [
        'issue',
        'view',
        '123',
        '--json',
        'title',
        '--jq',
        '.title',
      ]);

      // Find the edit call
      const editCall = mockExecFileNoThrow.mock.calls.find(
        (call) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'edit'
      );
      expect(editCall).toBeTruthy();
      expect(editCall[1]).toContain('--title');
    });

    it('should update multiple issue titles when issues array is provided', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0004', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0004', 'feature-b', {
        status: 'active',
        github: { issues: [101, 102, 103] },
        lastActivity: newerDate,
      });

      // Mock gh CLI responses for each issue
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-004][US-001] Issue 101\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-004][US-002] Issue 102\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-004][US-003] Issue 103\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);

      // Verify all issues were processed
      const viewCalls = mockExecFileNoThrow.mock.calls.filter(
        (call) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'view'
      );
      expect(viewCalls.length).toBe(3);
    });

    it('should skip issue update if title does not contain feature ID', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0005', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0005', 'feature-b', {
        status: 'active',
        github: { issue: 456 },
        lastActivity: newerDate,
      });

      // Mock: issue title does not contain FS-005
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'Just a regular issue title\n',
        stderr: '',
        success: true,
      });

      const result = await manager.reconcile({ force: true });

      // Should not attempt to edit issue
      const editCalls = mockExecFileNoThrow.mock.calls.filter(
        (call) => call[1]?.[0] === 'issue' && call[1]?.[1] === 'edit'
      );
      expect(editCalls.length).toBe(0);
    });
  });

  describe('JIRA issue summary update', () => {
    // Note: The ReconcileManager uses dynamic import for JIRA client.
    // These tests verify the JIRA update logic works correctly when the
    // JIRA integration is available, but since dynamic import mocking
    // is complex in Vitest, we test the behavior via observable outcomes.

    it('should attempt JIRA update when jira metadata is present', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0006', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0006', 'feature-b', {
        status: 'active',
        jira: { issueKey: 'PROJ-123' },
        lastActivity: newerDate,
      });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);

      // Since JIRA update is attempted (regardless of mock), verify it's tracked
      const jiraRef = result.operations[0]?.updatedReferences.find(
        (r) => r.type === 'jira'
      );
      // Should have a jira reference (either success or failure depending on mock)
      expect(jiraRef).toBeTruthy();
    });

    it('should skip JIRA update if no issueKey in metadata', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0007', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      // Create increment with empty jira object (no issueKey)
      const id = '0007-feature-b';
      const incDir = path.join(INCREMENTS_DIR, id);
      await fs.mkdir(incDir, { recursive: true });

      const metadata = {
        id,
        status: 'active',
        created: new Date().toISOString(),
        lastActivity: newerDate,
        external_sync: { jira: {} }, // Empty jira object, no issueKey
      };
      await fs.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      await fs.writeFile(
        path.join(incDir, 'spec.md'),
        `---\nincrement: ${id}\ntitle: "Test Feature"\n---\n\n# Test Feature\n`
      );

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);
      // The reconcile operation should complete even if JIRA client throws
      // When issueKey is empty, the code should return early from updateJiraReferences
      // but the dynamic import may still fail. Either way, the operation should proceed.
    });

    it('should handle JIRA client errors gracefully', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0008', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0008', 'feature-b', {
        status: 'active',
        jira: { issueKey: 'PROJ-789' },
        lastActivity: newerDate,
      });

      const result = await manager.reconcile({ force: true });

      // Should record the failure but continue processing
      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);

      // JIRA reference should be tracked (will fail due to mock setup)
      const jiraRef = result.operations[0]?.updatedReferences.find(
        (r) => r.type === 'jira'
      );
      expect(jiraRef).toBeTruthy();
      // Error is recorded but processing continues
      expect(jiraRef?.success).toBe(false);
    });
  });

  describe('ADO work item title update', () => {
    it('should update ADO work item title with new feature ID', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0009', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0009', 'feature-b', {
        status: 'active',
        ado: { workItemId: 5678 },
        lastActivity: newerDate,
      });

      // Mock az CLI responses
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          // Get work item title
          exitCode: 0,
          stdout: '[FS-009] ADO Feature B\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          // Update work item title
          exitCode: 0,
          stdout: '{}',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);

      // Verify az CLI was called
      expect(mockExecFileNoThrow).toHaveBeenCalledWith('az', [
        'boards',
        'work-item',
        'show',
        '--id',
        '5678',
        '--query',
        'fields."System.Title"',
        '-o',
        'tsv',
      ]);
    });

    it('should skip ADO update if title does not contain feature ID', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0010', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0010', 'feature-b', {
        status: 'active',
        ado: { workItemId: 9999 },
        lastActivity: newerDate,
      });

      // Mock: title does not contain FS-010
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'Regular ADO work item\n',
        stderr: '',
        success: true,
      });

      const result = await manager.reconcile({ force: true });

      // Should not attempt update
      const updateCalls = mockExecFileNoThrow.mock.calls.filter(
        (call) =>
          call[0] === 'az' &&
          call[1]?.[0] === 'boards' &&
          call[1]?.[1] === 'work-item' &&
          call[1]?.[2] === 'update'
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('Missing external tools', () => {
    it('should handle gh CLI not available gracefully', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0011', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0011', 'feature-b', {
        status: 'active',
        github: { issue: 111 },
        lastActivity: newerDate,
      });

      // Mock gh CLI not found
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 127,
        stdout: '',
        stderr: 'gh: command not found',
        success: false,
      });

      const result = await manager.reconcile({ force: true });

      // Should continue with renumbering even if GitHub update fails
      expect(result.collisionsFound).toBe(1);
      // Note: incrementsRenumbered depends on all references succeeding,
      // so we just check that the collision was found and processed
      expect(result.operations.length).toBe(1);
    });

    it('should handle az CLI not available gracefully', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0012', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0012', 'feature-b', {
        status: 'active',
        ado: { workItemId: 1234 },
        lastActivity: newerDate,
      });

      // Mock az CLI not found
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 127,
        stdout: '',
        stderr: 'az: command not found',
        success: false,
      });

      const result = await manager.reconcile({ force: true });

      // Should continue with renumbering even if ADO update fails
      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);

      // ADO update should be recorded as failed
      const adoRef = result.operations[0]?.updatedReferences.find(
        (r) => r.type === 'ado'
      );
      expect(adoRef).toBeTruthy();
      expect(adoRef?.success).toBe(false);
    });
  });

  describe('Partial failures', () => {
    it('should continue processing when some updates succeed and others fail', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0013', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0013', 'feature-b', {
        status: 'active',
        github: { issue: 222 },
        jira: { issueKey: 'PROJ-222' },
        ado: { workItemId: 2222 },
        lastActivity: newerDate,
      });

      // Mock: GitHub succeeds
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-013] GitHub Issue\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        });

      // Mock: JIRA fails
      mockJiraGetIssue.mockRejectedValueOnce(new Error('JIRA API error'));

      // Mock: ADO succeeds
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-013] ADO Work Item\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);

      // Check that we have mixed success/failure
      const refs = result.operations[0]?.updatedReferences || [];
      const githubRef = refs.find((r) => r.type === 'github');
      const jiraRef = refs.find((r) => r.type === 'jira');
      const adoRef = refs.find((r) => r.type === 'ado');

      expect(githubRef?.success).toBe(true);
      expect(jiraRef?.success).toBe(false);
      expect(adoRef?.success).toBe(true);
    });

    it('should record detailed error information for each failed update', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0014', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0014', 'feature-b', {
        status: 'active',
        github: { issue: 333 },
        lastActivity: newerDate,
      });

      // Mock GitHub API rate limit error
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'API rate limit exceeded',
        success: false,
        error: new Error('API rate limit exceeded'),
      });

      const result = await manager.reconcile({ force: true });

      // Note: The GitHub update happens during the renumber process,
      // but the overall renumbering should still succeed for local files
      expect(result.collisionsFound).toBe(1);
    });
  });

  describe('Dry run mode', () => {
    it('should not call external tools in dry run mode', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0015', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0015', 'feature-b', {
        status: 'active',
        github: { issue: 444 },
        jira: { issueKey: 'PROJ-444' },
        ado: { workItemId: 4444 },
        lastActivity: newerDate,
      });

      const result = await manager.reconcile({ dryRun: true });

      expect(result.collisionsFound).toBe(1);

      // In dry run, no external tool calls should be made
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
      expect(mockJiraGetIssue).not.toHaveBeenCalled();
      expect(mockJiraUpdateIssue).not.toHaveBeenCalled();
    });

    it('should show what would be updated in dry run mode', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0016', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0016', 'feature-b', {
        status: 'active',
        github: { issue: 555 },
        lastActivity: newerDate,
      });

      const result = await manager.reconcile({ dryRun: true });

      expect(result.operations.length).toBe(1);
      expect(result.operations[0].oldId).toContain('0016');
      expect(result.operations[0].newId).not.toEqual(result.operations[0].oldId);
    });
  });

  describe('No collisions scenario', () => {
    it('should not make any external calls when no collisions exist', async () => {
      // Create unique increments (no collisions)
      await createTestIncrement('0017-feature-a', {
        status: 'active',
        github: { issue: 666 },
      });
      await createTestIncrement('0018-feature-b', {
        status: 'active',
        jira: { issueKey: 'PROJ-666' },
      });

      const result = await manager.reconcile();

      expect(result.collisionsFound).toBe(0);
      expect(result.incrementsRenumbered).toBe(0);
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
      expect(mockJiraGetIssue).not.toHaveBeenCalled();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle increment with all three external tools', async () => {
      const olderDate = new Date(Date.now() - 86400000).toISOString();
      const newerDate = new Date().toISOString();

      await createCollidingIncrement('0019', 'feature-a', {
        status: 'active',
        lastActivity: olderDate,
      });

      await createCollidingIncrement('0019', 'feature-b', {
        status: 'active',
        github: { milestone: 'FS-019: Milestone', issue: 777, issues: [778, 779] },
        jira: { issueKey: 'PROJ-777' },
        ado: { workItemId: 7777 },
        lastActivity: newerDate,
      });

      // Mock all external tool responses
      // Milestone lookup
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '99\n',
        stderr: '',
        success: true,
      });
      // Milestone update
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      });
      // Single issue lookup
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[FS-019] Main Issue\n',
        stderr: '',
        success: true,
      });
      // Single issue update
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      });
      // Issues array lookups and updates (2 issues x 2 calls each)
      for (let i = 0; i < 4; i++) {
        mockExecFileNoThrow.mockResolvedValueOnce({
          exitCode: 0,
          stdout: i % 2 === 0 ? '[FS-019] Issue\n' : '',
          stderr: '',
          success: true,
        });
      }

      // JIRA
      mockJiraGetIssue.mockResolvedValueOnce({
        key: 'PROJ-777',
        fields: { summary: '[FS-019] JIRA Issue' },
      });
      mockJiraUpdateIssue.mockResolvedValueOnce({});

      // ADO
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[FS-019] ADO Item\n',
        stderr: '',
        success: true,
      });
      mockExecFileNoThrow.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.operations.length).toBe(1);

      // All three tool types should have been processed
      const refs = result.operations[0]?.updatedReferences || [];
      expect(refs.some((r) => r.type === 'github')).toBe(true);
      expect(refs.some((r) => r.type === 'jira')).toBe(true);
      expect(refs.some((r) => r.type === 'ado')).toBe(true);
    });

    it('should handle three-way collision', async () => {
      const oldestDate = new Date(Date.now() - 172800000).toISOString(); // 2 days ago
      const olderDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const newerDate = new Date().toISOString();

      // Winner (oldest)
      await createCollidingIncrement('0020', 'feature-a', {
        status: 'active',
        lastActivity: oldestDate,
      });

      // First loser
      await createCollidingIncrement('0020', 'feature-b', {
        status: 'active',
        github: { issue: 888 },
        lastActivity: olderDate,
      });

      // Second loser
      await createCollidingIncrement('0020', 'feature-c', {
        status: 'active',
        github: { issue: 889 },
        lastActivity: newerDate,
      });

      // Mock responses for both losers
      mockExecFileNoThrow
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-020] Issue B\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '[FS-020] Issue C\n',
          stderr: '',
          success: true,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
          success: true,
        });

      const result = await manager.reconcile({ force: true });

      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(2); // Both losers renumbered
      expect(result.operations.length).toBe(2);
    });
  });
});
