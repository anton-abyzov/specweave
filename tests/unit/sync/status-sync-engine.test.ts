/**
 * Unit tests for Status Sync Engine
 *
 * Tests the core orchestration logic for status synchronization between
 * SpecWeave increments and external tools (GitHub, JIRA, Azure DevOps).
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { StatusSyncEngine, SyncDirection, SyncResult } from '../../../src/core/sync/status-sync-engine';

describe('StatusSyncEngine', () => {
  const mockConfig = {
    sync: {
      statusSync: {
        enabled: true,
        autoSync: true,
        promptUser: false, // Disable prompts for unit tests
        conflictResolution: 'last-write-wins' as const,
        mappings: {
          github: {
            planning: 'open',
            active: { state: 'open', labels: ['in-progress'] },
            paused: { state: 'open', labels: ['paused'] },
            completed: 'closed',
            abandoned: { state: 'closed', labels: ['wontfix'] }
          },
          jira: {
            planning: 'To Do',
            active: 'In Progress',
            paused: 'On Hold',
            completed: 'Done',
            abandoned: 'Cancelled'
          },
          ado: {
            planning: 'New',
            active: 'Active',
            paused: 'On Hold',
            completed: 'Closed',
            abandoned: 'Removed'
          }
        }
      }
    }
  };

  let engine: StatusSyncEngine;

  beforeEach(() => {
    engine = new StatusSyncEngine(mockConfig as any);
  });

  describe('syncToExternal', () => {
    it('should sync SpecWeave status to external tool (no conflict)', async () => {
      const result = await engine.syncToExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'active', // Same status = no conflict
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      });

      expect(result.success).toBe(true);
      expect(result.conflict).toBeNull();
      expect(result.action).toBe('no-sync-needed'); // Statuses match
    });

    it('should sync SpecWeave status to external tool (with conflict)', async () => {
      const result = await engine.syncToExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active', // Different status = conflict
        localTimestamp: '2025-11-12T12:00:00Z', // Newer
        remoteTimestamp: '2025-11-12T11:00:00Z' // Older
      });

      expect(result.success).toBe(true);
      expect(result.conflict).not.toBeNull();
      expect(result.conflict?.localStatus).toBe('completed');
      expect(result.conflict?.remoteStatus).toBe('active');
      expect(result.resolution?.action).toBe('use-local'); // last-write-wins: local is newer
      expect(result.resolution?.resolvedStatus).toBe('completed');
      expect(result.action).toBe('sync-to-external'); // Push local to external
    });

    it('should map SpecWeave status to GitHub format', async () => {
      const result = await engine.syncToExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'open', // GitHub "open" = SpecWeave "planning"
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      });

      expect(result.externalMapping).not.toBeNull();
      expect(result.externalMapping?.state).toBe('open');
      expect(result.externalMapping?.labels).toEqual(['in-progress']);
    });
  });

  describe('syncFromExternal', () => {
    it('should sync external status to SpecWeave (no conflict)', async () => {
      const result = await engine.syncFromExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'completed',
        localTimestamp: '2025-11-12T11:00:00Z',
        remoteTimestamp: '2025-11-12T12:00:00Z' // Remote is newer
      });

      expect(result.success).toBe(true);
      expect(result.conflict).toBeNull();
      expect(result.action).toBe('no-sync-needed'); // Statuses match
    });

    it('should sync external status to SpecWeave (with conflict)', async () => {
      const result = await engine.syncFromExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'completed',
        localTimestamp: '2025-11-12T10:00:00Z', // Older
        remoteTimestamp: '2025-11-12T12:00:00Z' // Newer
      });

      expect(result.success).toBe(true);
      expect(result.conflict).not.toBeNull();
      expect(result.resolution?.action).toBe('use-remote'); // last-write-wins: remote is newer
      expect(result.resolution?.resolvedStatus).toBe('completed');
      expect(result.action).toBe('sync-from-external'); // Pull external to local
    });
  });

  describe('bidirectionalSync', () => {
    it('should perform bidirectional sync (no conflict)', async () => {
      const result = await engine.bidirectionalSync({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T12:00:00Z'
      });

      expect(result.success).toBe(true);
      expect(result.conflict).toBeNull();
      expect(result.action).toBe('no-sync-needed');
    });

    it('should perform bidirectional sync (conflict resolved by timestamp)', async () => {
      const result = await engine.bidirectionalSync({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'paused',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z', // Newer
        remoteTimestamp: '2025-11-12T10:00:00Z' // Older
      });

      expect(result.success).toBe(true);
      expect(result.conflict).not.toBeNull();
      expect(result.resolution?.action).toBe('use-local'); // Local is newer
      expect(result.action).toBe('sync-to-external');
    });
  });

  describe('conflict resolution strategies', () => {
    it('should use specweave-wins strategy', async () => {
      const engineWithStrategy = new StatusSyncEngine({
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          statusSync: {
            ...mockConfig.sync.statusSync,
            conflictResolution: 'specweave-wins'
          }
        }
      } as any);

      const result = await engineWithStrategy.syncToExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T10:00:00Z', // Older
        remoteTimestamp: '2025-11-12T12:00:00Z' // Newer (but strategy ignores timestamps)
      });

      expect(result.resolution?.action).toBe('use-local'); // Always use local with specweave-wins
      expect(result.resolution?.resolvedStatus).toBe('completed');
    });

    it('should use external-wins strategy', async () => {
      const engineWithStrategy = new StatusSyncEngine({
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          statusSync: {
            ...mockConfig.sync.statusSync,
            conflictResolution: 'external-wins'
          }
        }
      } as any);

      const result = await engineWithStrategy.syncFromExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z', // Newer
        remoteTimestamp: '2025-11-12T10:00:00Z' // Older (but strategy ignores timestamps)
      });

      expect(result.resolution?.action).toBe('use-remote'); // Always use remote with external-wins
      expect(result.resolution?.resolvedStatus).toBe('active');
    });
  });

  describe('error handling', () => {
    it('should handle missing status mappings', async () => {
      const engineWithoutJira = new StatusSyncEngine({
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: false,
            conflictResolution: 'last-write-wins',
            mappings: {
              github: mockConfig.sync.statusSync.mappings.github
              // JIRA missing
            }
          }
        }
      } as any);

      await expect(
        engineWithoutJira.syncToExternal({
          incrementId: '0031-test',
          tool: 'jira',
          localStatus: 'active',
          remoteStatus: 'In Progress',
          localTimestamp: '2025-11-12T12:00:00Z',
          remoteTimestamp: '2025-11-12T11:00:00Z'
        })
      ).rejects.toThrow('No status mappings configured for jira');
    });

    it('should handle sync disabled', async () => {
      const engineWithSyncDisabled = new StatusSyncEngine({
        sync: {
          statusSync: {
            enabled: false, // Sync disabled
            mappings: mockConfig.sync.statusSync.mappings
          }
        }
      } as any);

      await expect(
        engineWithSyncDisabled.syncToExternal({
          incrementId: '0031-test',
          tool: 'github',
          localStatus: 'active',
          remoteStatus: 'open',
          localTimestamp: '2025-11-12T12:00:00Z',
          remoteTimestamp: '2025-11-12T11:00:00Z'
        })
      ).rejects.toThrow('Status synchronization is disabled');
    });
  });

  describe('getDirection', () => {
    it('should return correct direction for sync-to-external', async () => {
      const result = await engine.syncToExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      });

      expect(result.direction).toBe('to-external');
    });

    it('should return correct direction for sync-from-external', async () => {
      const result = await engine.syncFromExternal({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'completed',
        localTimestamp: '2025-11-12T10:00:00Z',
        remoteTimestamp: '2025-11-12T12:00:00Z'
      });

      expect(result.direction).toBe('from-external');
    });

    it('should return bidirectional for bidirectional sync', async () => {
      const result = await engine.bidirectionalSync({
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T12:00:00Z'
      });

      expect(result.direction).toBe('bidirectional');
    });
  });
});
