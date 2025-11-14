/**
 * Unit tests for Conflict Resolver
 *
 * Tests conflict detection and resolution strategies for status synchronization.
 * Following TDD: Tests written first, implementation follows.
 */

import { ConflictResolver, StatusConflict, ConflictResolutionStrategy } from '../../../src/core/sync/conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('detect', () => {
    it('should return null when statuses match (no conflict)', async () => {
      const conflict = await resolver.detect({
        incrementId: '0031-test',
        local: 'active',
        remote: 'active',
        tool: 'github',
        localTimestamp: '2025-11-12T10:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      });

      expect(conflict).toBeNull();
    });

    it('should detect conflict when statuses differ', async () => {
      const conflict = await resolver.detect({
        incrementId: '0031-test',
        local: 'completed',
        remote: 'active',
        tool: 'github',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      });

      expect(conflict).not.toBeNull();
      expect(conflict?.incrementId).toBe('0031-test');
      expect(conflict?.localStatus).toBe('completed');
      expect(conflict?.remoteStatus).toBe('active');
      expect(conflict?.tool).toBe('github');
      expect(conflict?.localTimestamp).toBe('2025-11-12T12:00:00Z');
      expect(conflict?.remoteTimestamp).toBe('2025-11-12T11:00:00Z');
    });

    it('should detect conflict with different timestamps', async () => {
      const conflict = await resolver.detect({
        incrementId: '0031-test',
        local: 'paused',
        remote: 'completed',
        tool: 'jira',
        localTimestamp: '2025-11-12T08:00:00Z',
        remoteTimestamp: '2025-11-12T10:00:00Z'
      });

      expect(conflict).not.toBeNull();
      expect(conflict?.tool).toBe('jira');
    });
  });

  describe('resolve - specweave-wins strategy', () => {
    it('should use local status when strategy is specweave-wins', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      };

      const resolution = await resolver.resolve(conflict, 'specweave-wins');

      expect(resolution.action).toBe('use-local');
      expect(resolution.resolvedStatus).toBe('completed');
    });
  });

  describe('resolve - external-wins strategy', () => {
    it('should use remote status when strategy is external-wins', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      };

      const resolution = await resolver.resolve(conflict, 'external-wins');

      expect(resolution.action).toBe('use-remote');
      expect(resolution.resolvedStatus).toBe('active');
    });
  });

  describe('resolve - last-write-wins strategy', () => {
    it('should use local status when local timestamp is newer', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',  // Newer
        remoteTimestamp: '2025-11-12T11:00:00Z'  // Older
      };

      const resolution = await resolver.resolve(conflict, 'last-write-wins');

      expect(resolution.action).toBe('use-local');
      expect(resolution.resolvedStatus).toBe('completed');
    });

    it('should use remote status when remote timestamp is newer', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'active',
        remoteStatus: 'completed',
        localTimestamp: '2025-11-12T10:00:00Z',  // Older
        remoteTimestamp: '2025-11-12T12:00:00Z'  // Newer
      };

      const resolution = await resolver.resolve(conflict, 'last-write-wins');

      expect(resolution.action).toBe('use-remote');
      expect(resolution.resolvedStatus).toBe('completed');
    });

    it('should use local status when timestamps are equal (tie-break)', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'paused',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T12:00:00Z'
      };

      const resolution = await resolver.resolve(conflict, 'last-write-wins');

      expect(resolution.action).toBe('use-local'); // Tie-break favors local
      expect(resolution.resolvedStatus).toBe('paused');
    });
  });

  describe('resolve - prompt strategy', () => {
    it('should throw error indicating user interaction needed', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      };

      // Prompt strategy requires user interaction (not testable in unit tests)
      await expect(resolver.resolve(conflict, 'prompt')).rejects.toThrow(
        'Prompt strategy requires user interaction'
      );
    });
  });

  describe('resolve - unknown strategy', () => {
    it('should throw error for unknown strategy', async () => {
      const conflict: StatusConflict = {
        incrementId: '0031-test',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:00:00Z',
        remoteTimestamp: '2025-11-12T11:00:00Z'
      };

      await expect(resolver.resolve(conflict, 'invalid' as ConflictResolutionStrategy)).rejects.toThrow(
        'Unknown conflict resolution strategy: invalid'
      );
    });
  });

  describe('formatConflictMessage', () => {
    it('should format conflict details for display', () => {
      const conflict: StatusConflict = {
        incrementId: '0031-external-tool-status-sync',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-12T12:30:00Z',
        remoteTimestamp: '2025-11-12T11:45:00Z'
      };

      const message = resolver.formatConflictMessage(conflict);

      expect(message).toContain('0031-external-tool-status-sync');
      expect(message).toContain('github');
      expect(message).toContain('completed');
      expect(message).toContain('active');
      expect(message).toContain('Local');
      expect(message).toContain('Remote');
    });
  });
});
