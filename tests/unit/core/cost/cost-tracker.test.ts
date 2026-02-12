/**
 * Unit tests for CostTracker
 *
 * Tests session lifecycle, token recording, cost calculations,
 * increment aggregation, persistence, and summary statistics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs-native before importing CostTracker
const { mockEnsureDir, mockWriteJson, mockPathExists, mockReadJson } = vi.hoisted(() => ({
  mockEnsureDir: vi.fn().mockResolvedValue(undefined),
  mockWriteJson: vi.fn().mockResolvedValue(undefined),
  mockPathExists: vi.fn().mockResolvedValue(false),
  mockReadJson: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  ensureDir: mockEnsureDir,
  writeJson: mockWriteJson,
  pathExists: mockPathExists,
  readJson: mockReadJson,
}));

import { CostTracker } from '../../../../src/core/cost/cost-tracker.js';
import { calculateCost, calculateSavings } from '../../../../src/utils/pricing-constants.js';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new CostTracker({ autoSave: false });
  });

  // ─── 1. Constructor ───────────────────────────────────────────────

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const defaultTracker = new CostTracker();
      // Verify it initializes without error and has no sessions
      expect(defaultTracker.getAllSessions()).toEqual([]);
      expect(defaultTracker.getCurrentSession()).toBeUndefined();
    });

    it('should accept custom logPath', async () => {
      const customTracker = new CostTracker({
        logPath: 'custom/path/costs.json',
        autoSave: false,
      });
      customTracker.startSession('pm', 'sonnet');
      // Verify it works normally
      expect(customTracker.getAllSessions()).toHaveLength(1);
    });

    it('should default autoSave to true', async () => {
      const autoSaveTracker = new CostTracker();
      const sessionId = autoSaveTracker.startSession('pm', 'sonnet');
      autoSaveTracker.endSession(sessionId);
      // endSession calls saveToDisk() without await, flush microtasks
      await vi.waitFor(() => {
        expect(mockEnsureDir).toHaveBeenCalled();
        expect(mockWriteJson).toHaveBeenCalled();
      });
    });
  });

  // ─── 2. startSession ─────────────────────────────────────────────

  describe('startSession', () => {
    it('should return a unique session ID', () => {
      const id1 = tracker.startSession('pm', 'sonnet');
      const id2 = tracker.startSession('frontend', 'haiku');
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should create a session with correct initial values', () => {
      const sessionId = tracker.startSession('pm', 'opus', '0003', '/sw:increment');
      const session = tracker.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.agent).toBe('pm');
      expect(session!.model).toBe('opus');
      expect(session!.increment).toBe('0003');
      expect(session!.command).toBe('/sw:increment');
      expect(session!.startedAt).toBeDefined();
      expect(session!.endedAt).toBeUndefined();
      expect(session!.tokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
      expect(session!.cost).toBe(0);
      expect(session!.savings).toBe(0);
    });

    it('should set the new session as current', () => {
      const sessionId = tracker.startSession('architect', 'sonnet');
      const current = tracker.getCurrentSession();
      expect(current).toBeDefined();
      expect(current!.sessionId).toBe(sessionId);
    });

    it('should override current session when starting a new one', () => {
      tracker.startSession('pm', 'sonnet');
      const secondId = tracker.startSession('frontend', 'haiku');
      const current = tracker.getCurrentSession();
      expect(current!.sessionId).toBe(secondId);
    });

    it('should create session without optional increment and command', () => {
      const sessionId = tracker.startSession('pm', 'haiku');
      const session = tracker.getSession(sessionId);
      expect(session!.increment).toBeUndefined();
      expect(session!.command).toBeUndefined();
    });
  });

  // ─── 3. recordTokens ─────────────────────────────────────────────

  describe('recordTokens', () => {
    it('should update token usage on current session', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.recordTokens(1000, 500);

      const session = tracker.getSession(sessionId)!;
      expect(session.tokenUsage.inputTokens).toBe(1000);
      expect(session.tokenUsage.outputTokens).toBe(500);
      expect(session.tokenUsage.totalTokens).toBe(1500);
    });

    it('should accumulate tokens across multiple calls', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.recordTokens(1000, 500);
      tracker.recordTokens(2000, 1000);

      const session = tracker.getSession(sessionId)!;
      expect(session.tokenUsage.inputTokens).toBe(3000);
      expect(session.tokenUsage.outputTokens).toBe(1500);
      expect(session.tokenUsage.totalTokens).toBe(4500);
    });

    it('should calculate cost using pricing constants', () => {
      const sessionId = tracker.startSession('pm', 'haiku');
      tracker.recordTokens(1000000, 500000);

      const session = tracker.getSession(sessionId)!;
      const expectedCost = calculateCost('haiku', 1000000, 500000);
      expect(session.cost).toBe(expectedCost);
      expect(session.cost).toBeGreaterThan(0);
    });

    it('should calculate savings vs sonnet baseline', () => {
      const sessionId = tracker.startSession('pm', 'haiku');
      tracker.recordTokens(1000000, 500000);

      const session = tracker.getSession(sessionId)!;
      const { savedAmount } = calculateSavings('haiku', 1000000, 500000);
      expect(session.savings).toBe(savedAmount);
      expect(session.savings).toBeGreaterThan(0); // haiku is cheaper than sonnet
    });

    it('should record on a specific session when sessionId provided', () => {
      const id1 = tracker.startSession('pm', 'sonnet');
      const id2 = tracker.startSession('frontend', 'haiku');

      // Record on the first session, not current
      tracker.recordTokens(5000, 2000, id1);

      const session1 = tracker.getSession(id1)!;
      const session2 = tracker.getSession(id2)!;
      expect(session1.tokenUsage.totalTokens).toBe(7000);
      expect(session2.tokenUsage.totalTokens).toBe(0);
    });

    it('should throw when no active session exists', () => {
      expect(() => tracker.recordTokens(100, 50)).toThrow(
        'No active session. Call startSession() first.'
      );
    });

    it('should throw when session ID is not found', () => {
      tracker.startSession('pm', 'sonnet');
      expect(() => tracker.recordTokens(100, 50, 'nonexistent_session')).toThrow(
        'Session nonexistent_session not found'
      );
    });

    it('should show zero savings for sonnet model', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.recordTokens(1000000, 500000);

      const session = tracker.getSession(sessionId)!;
      expect(session.savings).toBe(0); // sonnet vs sonnet = no savings
    });

    it('should show negative savings for opus model', () => {
      const sessionId = tracker.startSession('architect', 'opus');
      tracker.recordTokens(1000000, 500000);

      const session = tracker.getSession(sessionId)!;
      expect(session.savings).toBeLessThan(0); // opus is more expensive than sonnet
    });
  });

  // ─── 4. endSession ───────────────────────────────────────────────

  describe('endSession', () => {
    it('should set endedAt timestamp', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.endSession(sessionId);

      const session = tracker.getSession(sessionId)!;
      expect(session.endedAt).toBeDefined();
      expect(new Date(session.endedAt!).getTime()).toBeGreaterThan(0);
    });

    it('should clear current session when ending the active one', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.endSession(sessionId);
      expect(tracker.getCurrentSession()).toBeUndefined();
    });

    it('should not clear current session when ending a different one', () => {
      const id1 = tracker.startSession('pm', 'sonnet');
      const id2 = tracker.startSession('frontend', 'haiku');
      tracker.endSession(id1);

      // Current should still be id2
      expect(tracker.getCurrentSession()!.sessionId).toBe(id2);
    });

    it('should call saveToDisk when autoSave is true', async () => {
      const autoTracker = new CostTracker({ autoSave: true });
      const sessionId = autoTracker.startSession('pm', 'sonnet');
      autoTracker.endSession(sessionId);
      // endSession calls saveToDisk() without await, flush microtasks
      await vi.waitFor(() => {
        expect(mockEnsureDir).toHaveBeenCalled();
        expect(mockWriteJson).toHaveBeenCalled();
      });
    });

    it('should not call saveToDisk when autoSave is false', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.endSession(sessionId);

      expect(mockEnsureDir).not.toHaveBeenCalled();
      expect(mockWriteJson).not.toHaveBeenCalled();
    });

    it('should throw when no active session to end', () => {
      expect(() => tracker.endSession()).toThrow('No active session to end');
    });

    it('should throw when session ID is not found', () => {
      tracker.startSession('pm', 'sonnet');
      expect(() => tracker.endSession('nonexistent')).toThrow(
        'Session nonexistent not found'
      );
    });

    it('should end current session when no sessionId provided', () => {
      const sessionId = tracker.startSession('pm', 'sonnet');
      tracker.endSession();

      const session = tracker.getSession(sessionId)!;
      expect(session.endedAt).toBeDefined();
      expect(tracker.getCurrentSession()).toBeUndefined();
    });
  });

  // ─── 5. getSession / getCurrentSession ────────────────────────────

  describe('getSession / getCurrentSession', () => {
    it('should return undefined for nonexistent session', () => {
      expect(tracker.getSession('does_not_exist')).toBeUndefined();
    });

    it('should return undefined for getCurrentSession with no active session', () => {
      expect(tracker.getCurrentSession()).toBeUndefined();
    });

    it('should return the correct session by ID', () => {
      const id = tracker.startSession('pm', 'sonnet', '0001');
      const session = tracker.getSession(id);
      expect(session!.agent).toBe('pm');
      expect(session!.increment).toBe('0001');
    });
  });

  // ─── 6. getIncrementSessions / getIncrementCost ───────────────────

  describe('getIncrementSessions', () => {
    it('should return empty array for unknown increment', () => {
      expect(tracker.getIncrementSessions('9999')).toEqual([]);
    });

    it('should return sessions matching the increment', () => {
      tracker.startSession('pm', 'sonnet', '0003');
      tracker.startSession('frontend', 'haiku', '0003');
      tracker.startSession('backend', 'opus', '0004');

      const sessions = tracker.getIncrementSessions('0003');
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.agent)).toEqual(['pm', 'frontend']);
    });
  });

  describe('getIncrementCost', () => {
    it('should return zero report for unknown increment', () => {
      const report = tracker.getIncrementCost('9999');
      expect(report.incrementId).toBe('9999');
      expect(report.totalCost).toBe(0);
      expect(report.totalSavings).toBe(0);
      expect(report.totalTokens).toBe(0);
      expect(report.sessionCount).toBe(0);
      expect(report.costByModel).toEqual({});
      expect(report.costByAgent).toEqual({});
    });

    it('should aggregate costs across multiple sessions for same increment', () => {
      const id1 = tracker.startSession('pm', 'haiku', '0003');
      tracker.recordTokens(100000, 50000, id1);

      const id2 = tracker.startSession('frontend', 'sonnet', '0003');
      tracker.recordTokens(200000, 100000, id2);

      const report = tracker.getIncrementCost('0003');

      expect(report.incrementId).toBe('0003');
      expect(report.sessionCount).toBe(2);
      expect(report.totalCost).toBeGreaterThan(0);
      expect(report.totalTokens).toBe(450000); // 150000 + 300000

      // costByModel should have both haiku and sonnet
      expect(report.costByModel['haiku']).toBeGreaterThan(0);
      expect(report.costByModel['sonnet']).toBeGreaterThan(0);

      // costByAgent should have both pm and frontend
      expect(report.costByAgent['pm']).toBeGreaterThan(0);
      expect(report.costByAgent['frontend']).toBeGreaterThan(0);
    });

    it('should not include sessions from other increments', () => {
      const id1 = tracker.startSession('pm', 'sonnet', '0003');
      tracker.recordTokens(100000, 50000, id1);

      const id2 = tracker.startSession('pm', 'sonnet', '0004');
      tracker.recordTokens(500000, 250000, id2);

      const report = tracker.getIncrementCost('0003');
      expect(report.sessionCount).toBe(1);
      // Cost should only reflect session id1
      const expectedCost = calculateCost('sonnet', 100000, 50000);
      expect(report.totalCost).toBeCloseTo(expectedCost, 10);
    });
  });

  // ─── 7. getTotalCost / getTotalSavings ────────────────────────────

  describe('getTotalCost / getTotalSavings', () => {
    it('should return 0 when no sessions exist', () => {
      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getTotalSavings()).toBe(0);
    });

    it('should sum costs across all sessions', () => {
      const id1 = tracker.startSession('pm', 'sonnet');
      tracker.recordTokens(1000000, 500000, id1);

      const id2 = tracker.startSession('frontend', 'haiku');
      tracker.recordTokens(1000000, 500000, id2);

      const expectedTotal =
        calculateCost('sonnet', 1000000, 500000) +
        calculateCost('haiku', 1000000, 500000);
      expect(tracker.getTotalCost()).toBeCloseTo(expectedTotal, 10);
    });

    it('should sum savings across all sessions', () => {
      const id1 = tracker.startSession('pm', 'haiku');
      tracker.recordTokens(1000000, 500000, id1);

      const id2 = tracker.startSession('frontend', 'haiku');
      tracker.recordTokens(1000000, 500000, id2);

      const { savedAmount } = calculateSavings('haiku', 1000000, 500000);
      expect(tracker.getTotalSavings()).toBeCloseTo(savedAmount * 2, 10);
    });
  });

  // ─── 8. getAllSessions / clearSessions ────────────────────────────

  describe('getAllSessions / clearSessions', () => {
    it('should return all sessions in an array', () => {
      tracker.startSession('pm', 'sonnet');
      tracker.startSession('frontend', 'haiku');
      tracker.startSession('backend', 'opus');

      const all = tracker.getAllSessions();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.agent)).toEqual(['pm', 'frontend', 'backend']);
    });

    it('should clear all sessions and reset current', () => {
      tracker.startSession('pm', 'sonnet');
      tracker.startSession('frontend', 'haiku');

      tracker.clearSessions();

      expect(tracker.getAllSessions()).toEqual([]);
      expect(tracker.getCurrentSession()).toBeUndefined();
    });
  });

  // ─── 9. saveToDisk ───────────────────────────────────────────────

  describe('saveToDisk', () => {
    it('should ensure directory exists and write JSON', async () => {
      tracker.startSession('pm', 'sonnet');
      await tracker.saveToDisk();

      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/logs')
      );
      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('costs.json'),
        expect.objectContaining({
          version: '1.0',
          savedAt: expect.any(String),
          sessions: expect.any(Array),
        }),
        { spaces: 2 }
      );
    });

    it('should serialize sessions correctly', async () => {
      const id = tracker.startSession('pm', 'haiku', '0003');
      tracker.recordTokens(1000, 500, id);
      await tracker.saveToDisk();

      const savedData = mockWriteJson.mock.calls[0][1];
      expect(savedData.sessions).toHaveLength(1);
      expect(savedData.sessions[0].sessionId).toBe(id);
      expect(savedData.sessions[0].agent).toBe('pm');
      expect(savedData.sessions[0].model).toBe('haiku');
      expect(savedData.sessions[0].tokenUsage.inputTokens).toBe(1000);
    });

    it('should use custom logPath when configured', async () => {
      const customTracker = new CostTracker({
        logPath: 'custom/dir/my-costs.json',
        autoSave: false,
      });
      customTracker.startSession('pm', 'sonnet');
      await customTracker.saveToDisk();

      expect(mockEnsureDir).toHaveBeenCalledWith('custom/dir');
      expect(mockWriteJson).toHaveBeenCalledWith(
        'custom/dir/my-costs.json',
        expect.any(Object),
        { spaces: 2 }
      );
    });

    it('should throw wrapped error on fs failure', async () => {
      mockEnsureDir.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      await expect(tracker.saveToDisk()).rejects.toThrow(
        'Failed to save cost data: EACCES: permission denied'
      );
    });
  });

  // ─── 10. loadFromDisk ─────────────────────────────────────────────

  describe('loadFromDisk', () => {
    it('should do nothing when file does not exist', async () => {
      mockPathExists.mockResolvedValueOnce(false);
      await tracker.loadFromDisk();

      expect(mockReadJson).not.toHaveBeenCalled();
      expect(tracker.getAllSessions()).toEqual([]);
    });

    it('should load sessions from disk', async () => {
      const storedData = {
        version: '1.0',
        savedAt: '2025-01-15T10:00:00.000Z',
        sessions: [
          {
            sessionId: 'session_abc_123',
            agent: 'pm',
            model: 'sonnet',
            increment: '0003',
            startedAt: '2025-01-15T09:00:00.000Z',
            endedAt: '2025-01-15T09:30:00.000Z',
            tokenUsage: { inputTokens: 5000, outputTokens: 2000, totalTokens: 7000 },
            cost: 0.045,
            savings: 0,
          },
          {
            sessionId: 'session_def_456',
            agent: 'frontend',
            model: 'haiku',
            increment: '0003',
            startedAt: '2025-01-15T10:00:00.000Z',
            tokenUsage: { inputTokens: 3000, outputTokens: 1000, totalTokens: 4000 },
            cost: 0.008,
            savings: 0.006,
          },
        ],
      };

      mockPathExists.mockResolvedValueOnce(true);
      mockReadJson.mockResolvedValueOnce(storedData);

      await tracker.loadFromDisk();

      const sessions = tracker.getAllSessions();
      expect(sessions).toHaveLength(2);
      expect(tracker.getSession('session_abc_123')!.agent).toBe('pm');
      expect(tracker.getSession('session_def_456')!.agent).toBe('frontend');
    });

    it('should clear existing sessions before loading', async () => {
      // Add an in-memory session first
      tracker.startSession('existing', 'opus');

      const storedData = {
        version: '1.0',
        savedAt: '2025-01-15T10:00:00.000Z',
        sessions: [
          {
            sessionId: 'session_loaded_1',
            agent: 'loaded',
            model: 'sonnet',
            startedAt: '2025-01-15T09:00:00.000Z',
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            cost: 0,
            savings: 0,
          },
        ],
      };

      mockPathExists.mockResolvedValueOnce(true);
      mockReadJson.mockResolvedValueOnce(storedData);

      await tracker.loadFromDisk();

      const sessions = tracker.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].agent).toBe('loaded');
    });

    it('should throw on unsupported version', async () => {
      mockPathExists.mockResolvedValueOnce(true);
      mockReadJson.mockResolvedValueOnce({
        version: '2.0',
        sessions: [],
      });

      await expect(tracker.loadFromDisk()).rejects.toThrow(
        'Failed to load cost data: Unsupported cost data version: 2.0'
      );
    });

    it('should throw wrapped error on fs failure', async () => {
      mockPathExists.mockResolvedValueOnce(true);
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT: corrupted file'));

      await expect(tracker.loadFromDisk()).rejects.toThrow(
        'Failed to load cost data: ENOENT: corrupted file'
      );
    });
  });

  // ─── 11. getSummary ──────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return empty summary when no sessions exist', () => {
      const summary = tracker.getSummary();
      expect(summary).toEqual({
        totalSessions: 0,
        totalCost: 0,
        totalSavings: 0,
        savingsPercentage: 0,
        mostExpensiveAgent: null,
        cheapestAgent: null,
      });
    });

    it('should return correct summary with a single session', () => {
      const id = tracker.startSession('pm', 'haiku', '0003');
      tracker.recordTokens(1000000, 500000, id);

      const summary = tracker.getSummary();
      expect(summary.totalSessions).toBe(1);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.totalSavings).toBeGreaterThan(0); // haiku saves vs sonnet
      expect(summary.savingsPercentage).toBeGreaterThan(0);
      expect(summary.mostExpensiveAgent).toBe('pm');
      expect(summary.cheapestAgent).toBe('pm'); // only one agent
    });

    it('should identify most expensive and cheapest agents', () => {
      // Expensive: opus agent with many tokens
      const id1 = tracker.startSession('architect', 'opus', '0003');
      tracker.recordTokens(1000000, 500000, id1);

      // Cheap: haiku agent with same tokens
      const id2 = tracker.startSession('translator', 'haiku', '0003');
      tracker.recordTokens(1000000, 500000, id2);

      const summary = tracker.getSummary();
      expect(summary.totalSessions).toBe(2);
      expect(summary.mostExpensiveAgent).toBe('architect');
      expect(summary.cheapestAgent).toBe('translator');
    });

    it('should calculate savings percentage correctly', () => {
      // Using haiku model: should have positive savings vs sonnet baseline
      const id = tracker.startSession('pm', 'haiku');
      tracker.recordTokens(1000000, 500000, id);

      const summary = tracker.getSummary();
      const totalCost = summary.totalCost;
      const totalSavings = summary.totalSavings;
      const baselineCost = totalCost + totalSavings;
      const expectedPercentage = (totalSavings / baselineCost) * 100;

      expect(summary.savingsPercentage).toBeCloseTo(expectedPercentage, 5);
    });

    it('should handle multiple sessions from the same agent', () => {
      const id1 = tracker.startSession('pm', 'haiku');
      tracker.recordTokens(100000, 50000, id1);

      const id2 = tracker.startSession('pm', 'sonnet');
      tracker.recordTokens(100000, 50000, id2);

      const summary = tracker.getSummary();
      expect(summary.totalSessions).toBe(2);
      // Both from 'pm', so most expensive and cheapest are same
      expect(summary.mostExpensiveAgent).toBe('pm');
      expect(summary.cheapestAgent).toBe('pm');
    });
  });
});
