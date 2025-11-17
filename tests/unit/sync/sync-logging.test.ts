import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Sync Event Logging
 *
 * Tests logging of status sync events and conflict resolutions.
 * Uses mocks for filesystem operations.
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { SyncEventLogger, SyncEvent, ConflictEvent } from '../../../src/core/sync/sync-event-logger.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
vi.mock('fs-extra');
const mockedFs = fs as anyed<typeof fs>;

describe('SyncEventLogger', () => {
  let logger: SyncEventLogger;
  const logsDir = '/test/.specweave/logs';
  const eventsFile = path.join(logsDir, 'sync-events.json');

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new SyncEventLogger('/test');
  });

  describe('logSyncEvent', () => {
    it('should log successful sync event', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined as any);
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.writeJson.mockResolvedValue(undefined as any);

      const event: SyncEvent = {
        incrementId: '0001-feature',
        tool: 'github',
        fromStatus: 'active',
        toStatus: 'completed',
        timestamp: '2025-11-10T12:00:00Z',
        triggeredBy: 'user',
        success: true,
        direction: 'to-external'
      };

      await logger.logSyncEvent(event);

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(logsDir);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        eventsFile,
        [event],
        { spaces: 2 }
      );
    });

    it('should append to existing log file', async () => {
      const existingEvents = [
        {
          incrementId: '0000-old',
          tool: 'github',
          fromStatus: 'planning',
          toStatus: 'active',
          timestamp: '2025-11-09T10:00:00Z',
          triggeredBy: 'user',
          success: true,
          direction: 'to-external'
        }
      ];

      mockedFs.ensureDir.mockResolvedValue(undefined as any);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingEvents);
      mockedFs.writeJson.mockResolvedValue(undefined as any);

      const newEvent: SyncEvent = {
        incrementId: '0001-feature',
        tool: 'jira',
        fromStatus: 'active',
        toStatus: 'completed',
        timestamp: '2025-11-10T12:00:00Z',
        triggeredBy: 'auto-sync',
        success: true,
        direction: 'to-external'
      };

      await logger.logSyncEvent(newEvent);

      expect(mockedFs.readJson).toHaveBeenCalledWith(eventsFile);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        eventsFile,
        [...existingEvents, newEvent],
        { spaces: 2 }
      );
    });

    it('should log failed sync event with error', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined as any);
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.writeJson.mockResolvedValue(undefined as any);

      const event: SyncEvent = {
        incrementId: '0001-feature',
        tool: 'ado',
        fromStatus: 'active',
        toStatus: 'completed',
        timestamp: '2025-11-10T12:00:00Z',
        triggeredBy: 'user',
        success: false,
        direction: 'to-external',
        error: 'Network timeout'
      };

      await logger.logSyncEvent(event);

      const writtenData = mockedFs.writeJson.mock.calls[0][1] as SyncEvent[];
      expect(writtenData[0].error).toBe('Network timeout');
    });
  });

  describe('logConflictEvent', () => {
    it('should log conflict resolution event', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined as any);
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.writeJson.mockResolvedValue(undefined as any);

      const conflictEvent: ConflictEvent = {
        incrementId: '0001-feature',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-10T12:00:00Z',
        remoteTimestamp: '2025-11-10T11:00:00Z',
        resolutionStrategy: 'last-write-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-10T12:00:05Z',
        triggeredBy: 'user'
      };

      await logger.logConflictEvent(conflictEvent);

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(logsDir);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        eventsFile,
        [conflictEvent],
        { spaces: 2 }
      );
    });

    it('should log prompt conflict resolution', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined as any);
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.writeJson.mockResolvedValue(undefined as any);

      const conflictEvent: ConflictEvent = {
        incrementId: '0002-feature',
        tool: 'jira',
        localStatus: 'completed',
        remoteStatus: 'In Progress',
        localTimestamp: '2025-11-10T13:00:00Z',
        remoteTimestamp: '2025-11-10T12:00:00Z',
        resolutionStrategy: 'prompt',
        resolvedTo: 'use-remote',
        timestamp: '2025-11-10T13:00:10Z',
        triggeredBy: 'user',
        userChoice: 'Keep external status (JIRA wins)'
      };

      await logger.logConflictEvent(conflictEvent);

      const writtenData = mockedFs.writeJson.mock.calls[0][1] as ConflictEvent[];
      expect(writtenData[0].userChoice).toBe('Keep external status (JIRA wins)');
    });
  });

  describe('loadSyncHistory', () => {
    it('should load sync history from log file', async () => {
      const events = [
        {
          incrementId: '0001-feature',
          tool: 'github',
          fromStatus: 'active',
          toStatus: 'completed',
          timestamp: '2025-11-10T12:00:00Z',
          triggeredBy: 'user',
          success: true,
          direction: 'to-external'
        },
        {
          incrementId: '0002-feature',
          tool: 'jira',
          fromStatus: 'planning',
          toStatus: 'active',
          timestamp: '2025-11-10T13:00:00Z',
          triggeredBy: 'auto-sync',
          success: true,
          direction: 'to-external'
        }
      ];

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(events);

      const history = await logger.loadSyncHistory();

      expect(mockedFs.readJson).toHaveBeenCalledWith(eventsFile);
      expect(history).toEqual(events);
      expect(history.length).toBe(2);
    });

    it('should return empty array when log file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const history = await logger.loadSyncHistory();

      expect(history).toEqual([]);
    });

    it('should filter history by increment ID', async () => {
      const events = [
        {
          incrementId: '0001-feature',
          tool: 'github',
          fromStatus: 'active',
          toStatus: 'completed',
          timestamp: '2025-11-10T12:00:00Z',
          triggeredBy: 'user',
          success: true,
          direction: 'to-external'
        },
        {
          incrementId: '0002-feature',
          tool: 'jira',
          fromStatus: 'planning',
          toStatus: 'active',
          timestamp: '2025-11-10T13:00:00Z',
          triggeredBy: 'auto-sync',
          success: true,
          direction: 'to-external'
        }
      ];

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(events);

      const history = await logger.loadSyncHistory({ incrementId: '0001-feature' });

      expect(history.length).toBe(1);
      expect(history[0].incrementId).toBe('0001-feature');
    });

    it('should filter history by tool', async () => {
      const events = [
        {
          incrementId: '0001-feature',
          tool: 'github',
          fromStatus: 'active',
          toStatus: 'completed',
          timestamp: '2025-11-10T12:00:00Z',
          triggeredBy: 'user',
          success: true,
          direction: 'to-external'
        },
        {
          incrementId: '0002-feature',
          tool: 'jira',
          fromStatus: 'planning',
          toStatus: 'active',
          timestamp: '2025-11-10T13:00:00Z',
          triggeredBy: 'auto-sync',
          success: true,
          direction: 'to-external'
        }
      ];

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(events);

      const history = await logger.loadSyncHistory({ tool: 'jira' });

      expect(history.length).toBe(1);
      expect(history[0].tool).toBe('jira');
    });

    it('should filter history by success status', async () => {
      const events = [
        {
          incrementId: '0001-success',
          tool: 'github',
          fromStatus: 'active',
          toStatus: 'completed',
          timestamp: '2025-11-10T12:00:00Z',
          triggeredBy: 'user',
          success: true,
          direction: 'to-external'
        },
        {
          incrementId: '0002-failure',
          tool: 'github',
          fromStatus: 'active',
          toStatus: 'completed',
          timestamp: '2025-11-10T13:00:00Z',
          triggeredBy: 'user',
          success: false,
          direction: 'to-external',
          error: 'Network error'
        }
      ];

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(events);

      const successHistory = await logger.loadSyncHistory({ success: true });
      const failureHistory = await logger.loadSyncHistory({ success: false });

      expect(successHistory.length).toBe(1);
      expect(successHistory[0].incrementId).toBe('0001-success');

      expect(failureHistory.length).toBe(1);
      expect(failureHistory[0].incrementId).toBe('0002-failure');
    });
  });

  describe('Constructor', () => {
    it('should create logger with project root', () => {
      const newLogger = new SyncEventLogger('/my-project');
      expect(newLogger).toBeInstanceOf(SyncEventLogger);
    });
  });
});
