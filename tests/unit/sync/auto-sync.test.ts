/**
 * Unit tests for Auto-Sync Mode
 *
 * Tests automatic synchronization without user prompts.
 * Tests failsafe behavior when auto-sync encounters errors.
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { StatusSyncEngine, SyncInput } from '../../../src/core/sync/status-sync-engine';

describe('StatusSyncEngine - Auto-Sync Mode', () => {
  describe('isAutoSyncEnabled', () => {
    it('should return true when autoSync is enabled', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: false,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.isAutoSyncEnabled()).toBe(true);
    });

    it('should return false when autoSync is disabled', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: false,
            promptUser: true,
            conflictResolution: 'prompt' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.isAutoSyncEnabled()).toBe(false);
    });

    it('should return false when autoSync is undefined', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.isAutoSyncEnabled()).toBe(false);
    });
  });

  describe('shouldPromptUser', () => {
    it('should return false when promptUser is false', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: false,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.shouldPromptUser()).toBe(false);
    });

    it('should return true when promptUser is true', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: false,
            promptUser: true,
            conflictResolution: 'prompt' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.shouldPromptUser()).toBe(true);
    });

    it('should return true when promptUser is undefined (default)', () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);
      expect(engine.shouldPromptUser()).toBe(true);
    });
  });

  describe('executeAutoSync', () => {
    it('should sync without prompting when auto-sync enabled', async () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: false,
            conflictResolution: 'specweave-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);

      const input: SyncInput = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      };

      const result = await engine.executeAutoSync(input);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-external');
      expect(result.wasAutomatic).toBe(true);
      expect(result.wasPrompted).toBe(false);
    });

    it('should fail gracefully when auto-sync enabled but sync disabled', async () => {
      const config = {
        sync: {
          statusSync: {
            enabled: false, // Sync disabled!
            autoSync: true,
            promptUser: false,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);

      const input: SyncInput = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      };

      await expect(engine.executeAutoSync(input)).rejects.toThrow(
        'Status synchronization is disabled'
      );
    });

    it('should handle errors gracefully and not block', async () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: false,
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);

      // Mock syncToExternal to throw error
      jest.spyOn(engine, 'syncToExternal').mockRejectedValue(
        new Error('Network error')
      );

      const input: SyncInput = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      };

      const result = await engine.executeAutoSync(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.wasAutomatic).toBe(true);
      expect(result.wasPrompted).toBe(false);
    });

    it('should throw error when auto-sync disabled', async () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: false, // Auto-sync disabled
            promptUser: true,
            conflictResolution: 'prompt' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);

      const input: SyncInput = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      };

      await expect(engine.executeAutoSync(input)).rejects.toThrow(
        'Auto-sync is disabled'
      );
    });
  });

  describe('Auto-sync configuration combinations', () => {
    it('should handle autoSync:true + promptUser:true (ambiguous config)', async () => {
      const config = {
        sync: {
          statusSync: {
            enabled: true,
            autoSync: true,
            promptUser: true, // Conflict: auto-sync but also prompt?
            conflictResolution: 'last-write-wins' as const,
            mappings: { github: {}, jira: {}, ado: {} }
          }
        }
      };

      const engine = new StatusSyncEngine(config);

      // Auto-sync should take precedence over promptUser
      expect(engine.isAutoSyncEnabled()).toBe(true);
      expect(engine.shouldPromptUser()).toBe(true);

      // executeAutoSync should work (auto-sync wins)
      const input: SyncInput = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      };

      const result = await engine.executeAutoSync(input);
      expect(result.success).toBe(true);
      expect(result.wasAutomatic).toBe(true);
    });
  });
});
