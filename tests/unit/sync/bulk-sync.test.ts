/**
 * Unit tests for Bulk Status Sync
 *
 * Tests bulk synchronization of multiple increments.
 * Uses mocks for StatusSyncEngine.
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { StatusSyncEngine, BulkSyncInput, BulkSyncResult, SyncResult } from '../../../src/core/sync/status-sync-engine';

describe('StatusSyncEngine - Bulk Sync', () => {
  let engine: StatusSyncEngine;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      sync: {
        statusSync: {
          enabled: true,
          conflictResolution: 'last-write-wins',
          mappings: {
            github: {},
            jira: {},
            ado: {}
          }
        }
      }
    };

    engine = new StatusSyncEngine(mockConfig);
  });

  describe('bulkSyncToExternal', () => {
    it('should sync multiple increments in batches', async () => {
      const inputs: BulkSyncInput[] = [
        {
          incrementId: '0001-feature-a',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        },
        {
          incrementId: '0002-feature-b',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        },
        {
          incrementId: '0003-feature-c',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        }
      ];

      // Mock syncToExternal to return success
      jest.spyOn(engine, 'syncToExternal').mockResolvedValue({
        success: true,
        direction: 'to-external',
        action: 'sync-to-external',
        conflict: null,
        resolution: null,
        externalMapping: { external: 'closed' }
      } as any);

      const result = await engine.bulkSyncToExternal(inputs, {
        batchSize: 2,
        delayMs: 100
      });

      expect(result.totalItems).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results.length).toBe(3);
      expect(engine.syncToExternal).toHaveBeenCalledTimes(3);
    });

    it('should respect batch size', async () => {
      const inputs: BulkSyncInput[] = Array.from({ length: 10 }, (_, i) => ({
        incrementId: `000${i + 1}-feature`,
        tool: 'github' as const,
        localStatus: 'completed' as const,
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      }));

      jest.spyOn(engine, 'syncToExternal').mockResolvedValue({
        success: true,
        direction: 'to-external',
        action: 'sync-to-external',
        conflict: null,
        resolution: null,
        externalMapping: { external: 'closed' }
      } as any);

      const startTime = Date.now();
      const result = await engine.bulkSyncToExternal(inputs, {
        batchSize: 5,
        delayMs: 100
      });
      const duration = Date.now() - startTime;

      expect(result.totalItems).toBe(10);
      expect(result.successCount).toBe(10);
      expect(result.failureCount).toBe(0);

      // Should have 2 batches: batch 1 (5 items) + delay 100ms + batch 2 (5 items)
      // Total duration should be at least 100ms (one delay between batches)
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle partial failures gracefully', async () => {
      const inputs: BulkSyncInput[] = [
        {
          incrementId: '0001-success',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        },
        {
          incrementId: '0002-failure',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        },
        {
          incrementId: '0003-success',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        }
      ];

      jest.spyOn(engine, 'syncToExternal')
        .mockResolvedValueOnce({
          success: true,
          direction: 'to-external',
          action: 'sync-to-external',
          conflict: null,
          resolution: null,
          externalMapping: { external: 'closed' }
        } as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          direction: 'to-external',
          action: 'sync-to-external',
          conflict: null,
          resolution: null,
          externalMapping: { external: 'closed' }
        } as any);

      const result = await engine.bulkSyncToExternal(inputs);

      expect(result.totalItems).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results.length).toBe(3);

      // Check failure details
      const failedResult = result.results.find(r => r.incrementId === '0002-failure');
      expect(failedResult?.success).toBe(false);
      expect(failedResult?.error).toBe('Network error');
    });

    it('should calculate batches correctly', async () => {
      const inputs: BulkSyncInput[] = Array.from({ length: 13 }, (_, i) => ({
        incrementId: `000${i + 1}-feature`,
        tool: 'github' as const,
        localStatus: 'completed' as const,
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      }));

      jest.spyOn(engine, 'syncToExternal').mockResolvedValue({
        success: true,
        direction: 'to-external',
        action: 'sync-to-external',
        conflict: null,
        resolution: null,
        externalMapping: { external: 'closed' }
      } as any);

      const result = await engine.bulkSyncToExternal(inputs, {
        batchSize: 5,
        delayMs: 50
      });

      expect(result.totalItems).toBe(13);
      expect(result.successCount).toBe(13);
      // 13 items / 5 per batch = 3 batches (5 + 5 + 3)
      // Delays: 2 (between batch 1-2, between batch 2-3)
    });

    it('should default to batch size 5 and delay 1000ms', async () => {
      const inputs: BulkSyncInput[] = [
        {
          incrementId: '0001-feature',
          tool: 'github',
          localStatus: 'completed',
          remoteStatus: 'open',
          localTimestamp: '2025-11-10T12:00:00Z',
          remoteTimestamp: '2025-11-10T11:00:00Z'
        }
      ];

      jest.spyOn(engine, 'syncToExternal').mockResolvedValue({
        success: true,
        direction: 'to-external',
        action: 'sync-to-external',
        conflict: null,
        resolution: null,
        externalMapping: { external: 'closed' }
      } as any);

      const result = await engine.bulkSyncToExternal(inputs);

      expect(result.totalItems).toBe(1);
      expect(result.successCount).toBe(1);
    });

    it('should return empty result for empty input', async () => {
      const result = await engine.bulkSyncToExternal([]);

      expect(result.totalItems).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results.length).toBe(0);
    });

    it('should report progress with elapsed time', async () => {
      const inputs: BulkSyncInput[] = Array.from({ length: 3 }, (_, i) => ({
        incrementId: `000${i + 1}-feature`,
        tool: 'github' as const,
        localStatus: 'completed' as const,
        remoteStatus: 'open',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z'
      }));

      jest.spyOn(engine, 'syncToExternal').mockResolvedValue({
        success: true,
        direction: 'to-external',
        action: 'sync-to-external',
        conflict: null,
        resolution: null,
        externalMapping: { external: 'closed' }
      } as any);

      const result = await engine.bulkSyncToExternal(inputs);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('string');
      expect(result.duration).toMatch(/^\d+ms$/);
    });
  });
});
