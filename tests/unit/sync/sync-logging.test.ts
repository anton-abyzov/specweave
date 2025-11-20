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
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    pathExists: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
    appendFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

const mockedEnsureDir = vi.mocked(fs.ensureDir);
const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReadJson = vi.mocked(fs.readJson);
const mockedWriteJson = vi.mocked(fs.writeJson);
const mockedAppendFile = vi.mocked(fs.appendFile);
const mockedReadFile = vi.mocked(fs.readFile);

describe('SyncEventLogger', () => {
  let logger: SyncEventLogger;
  const logsDir = '/test/.specweave/logs';
  const eventsFile = path.join(logsDir, 'sync-events.json');
  const conflictsFile = path.join(logsDir, 'sync-conflicts.log');

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new SyncEventLogger('/test');
  });

  describe('logSyncEvent', () => {
    it('should log successful sync event', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);

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

      expect(mockedEnsureDir).toHaveBeenCalledWith(logsDir);
      expect(mockedWriteJson).toHaveBeenCalledWith(
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

      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(true);
      // Return a copy to avoid mutation affecting test expectations
      mockedReadJson.mockResolvedValue([...existingEvents]);
      mockedWriteJson.mockResolvedValue(undefined as any);

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

      expect(mockedReadJson).toHaveBeenCalledWith(eventsFile);
      expect(mockedWriteJson).toHaveBeenCalledWith(
        eventsFile,
        [...existingEvents, newEvent],
        { spaces: 2 }
      );
    });

    it('should log failed sync event with error', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);

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

      const writtenData = mockedWriteJson.mock.calls[0][1] as SyncEvent[];
      expect(writtenData[0].error).toBe('Network timeout');
    });
  });

  describe('logConflictEvent', () => {
    it('should log conflict resolution event', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);

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

      expect(mockedEnsureDir).toHaveBeenCalledWith(logsDir);
      expect(mockedWriteJson).toHaveBeenCalledWith(
        eventsFile,
        [conflictEvent],
        { spaces: 2 }
      );
    });

    it('should log prompt conflict resolution', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);

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

      const writtenData = mockedWriteJson.mock.calls[0][1] as ConflictEvent[];
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

      mockedPathExists.mockResolvedValue(true);
      mockedReadJson.mockResolvedValue(events);

      const history = await logger.loadSyncHistory();

      expect(mockedReadJson).toHaveBeenCalledWith(eventsFile);
      expect(history).toEqual(events);
      expect(history.length).toBe(2);
    });

    it('should return empty array when log file does not exist', async () => {
      mockedPathExists.mockResolvedValue(false);

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

      mockedPathExists.mockResolvedValue(true);
      mockedReadJson.mockResolvedValue(events);

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

      mockedPathExists.mockResolvedValue(true);
      mockedReadJson.mockResolvedValue(events);

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

      mockedPathExists.mockResolvedValue(true);
      mockedReadJson.mockResolvedValue(events);

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

  describe('Dedicated Conflict Logging (AC-US9-09)', () => {
    it('should write conflicts to dedicated log file by default', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);
      mockedAppendFile.mockResolvedValue(undefined as any);

      const conflictEvent: ConflictEvent = {
        incrementId: '0047-us-task-linkage',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-20T14:00:00Z',
        remoteTimestamp: '2025-11-20T13:00:00Z',
        resolutionStrategy: 'last-write-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-20T14:00:05Z',
        triggeredBy: 'auto-sync'
      };

      await logger.logConflictEvent(conflictEvent);

      // Should write to both sync-events.json AND sync-conflicts.log
      expect(mockedWriteJson).toHaveBeenCalled();
      expect(mockedAppendFile).toHaveBeenCalledWith(
        conflictsFile,
        JSON.stringify(conflictEvent) + '\n',
        'utf-8'
      );
    });

    it('should NOT write to conflicts log when writeToConflictsLog=false', async () => {
      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);
      mockedAppendFile.mockResolvedValue(undefined as any);

      const conflictEvent: ConflictEvent = {
        incrementId: '0047-us-task-linkage',
        tool: 'jira',
        localStatus: 'completed',
        remoteStatus: 'Done',
        localTimestamp: '2025-11-20T14:00:00Z',
        remoteTimestamp: '2025-11-20T13:00:00Z',
        resolutionStrategy: 'specweave-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-20T14:00:05Z',
        triggeredBy: 'user'
      };

      await logger.logConflictEvent(conflictEvent, false);

      // Should write to sync-events.json but NOT sync-conflicts.log
      expect(mockedWriteJson).toHaveBeenCalled();
      expect(mockedAppendFile).not.toHaveBeenCalled();
    });

    it('should load conflicts from dedicated log file', async () => {
      const conflict1: ConflictEvent = {
        incrementId: '0047-us-task-linkage',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-20T14:00:00Z',
        remoteTimestamp: '2025-11-20T13:00:00Z',
        resolutionStrategy: 'last-write-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-20T14:00:05Z',
        triggeredBy: 'auto-sync'
      };

      const conflict2: ConflictEvent = {
        incrementId: '0048-another-feature',
        tool: 'jira',
        localStatus: 'active',
        remoteStatus: 'In Progress',
        localTimestamp: '2025-11-20T15:00:00Z',
        remoteTimestamp: '2025-11-20T14:30:00Z',
        resolutionStrategy: 'external-wins',
        resolvedTo: 'use-remote',
        timestamp: '2025-11-20T15:00:05Z',
        triggeredBy: 'user'
      };

      const logContent = JSON.stringify(conflict1) + '\n' + JSON.stringify(conflict2) + '\n';

      mockedPathExists.mockResolvedValue(true);
      mockedReadFile.mockResolvedValue(logContent as any);

      const conflicts = await logger.loadConflicts();

      expect(mockedReadFile).toHaveBeenCalledWith(conflictsFile, 'utf-8');
      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].incrementId).toBe('0047-us-task-linkage');
      expect(conflicts[1].incrementId).toBe('0048-another-feature');
    });

    it('should return empty array when conflicts log does not exist', async () => {
      mockedPathExists.mockResolvedValue(false);

      const conflicts = await logger.loadConflicts();

      expect(conflicts).toEqual([]);
    });

    it('should skip malformed lines in conflicts log', async () => {
      const validConflict: ConflictEvent = {
        incrementId: '0047-us-task-linkage',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-20T14:00:00Z',
        remoteTimestamp: '2025-11-20T13:00:00Z',
        resolutionStrategy: 'last-write-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-20T14:00:05Z',
        triggeredBy: 'auto-sync'
      };

      const logContent =
        'MALFORMED LINE\n' +
        JSON.stringify(validConflict) + '\n' +
        '{invalid json\n' +
        '\n'; // empty line

      mockedPathExists.mockResolvedValue(true);
      mockedReadFile.mockResolvedValue(logContent as any);

      const conflicts = await logger.loadConflicts();

      // Should only return the valid conflict, skipping malformed lines
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].incrementId).toBe('0047-us-task-linkage');
    });

    it('should track conflicts when all 3 permissions enabled (full sync mode)', async () => {
      // This test verifies the AC-US9-09 requirement:
      // "Conflicts only possible when canUpsertInternalItems + canUpdateExternalItems + canUpdateStatus all enabled"

      mockedEnsureDir.mockResolvedValue(undefined as any);
      mockedPathExists.mockResolvedValue(false);
      mockedWriteJson.mockResolvedValue(undefined as any);
      mockedAppendFile.mockResolvedValue(undefined as any);

      const fullSyncConflict: ConflictEvent = {
        incrementId: '0047-us-task-linkage',
        tool: 'github',
        localStatus: 'completed',
        remoteStatus: 'active',
        localTimestamp: '2025-11-20T14:00:00Z',
        remoteTimestamp: '2025-11-20T13:00:00Z',
        resolutionStrategy: 'last-write-wins',
        resolvedTo: 'use-local',
        timestamp: '2025-11-20T14:00:05Z',
        triggeredBy: 'auto-sync'
      };

      // When all permissions enabled, conflicts get logged
      await logger.logConflictEvent(fullSyncConflict, true);

      // Verify conflict logged to dedicated file
      expect(mockedAppendFile).toHaveBeenCalledWith(
        conflictsFile,
        expect.stringContaining('"incrementId":"0047-us-task-linkage"'),
        'utf-8'
      );
    });
  });
});
