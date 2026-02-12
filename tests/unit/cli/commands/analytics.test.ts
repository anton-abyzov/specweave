/**
 * Tests for Analytics CLI Command
 *
 * Verifies analytics dashboard functionality:
 * - Time range filtering (24h, 7d, 30d, etc.)
 * - Event type filtering (command, skill, agent)
 * - JSON and CSV export formats
 * - Console output formatting
 * - Summary calculations (success rate, top lists)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock setup with hoisting
const { mockCollectorInstance, mockAggregatorInstance } = vi.hoisted(() => {
  const mockSummary = {
    generatedAt: new Date().toISOString(),
    since: '2024-01-01T00:00:00Z',
    until: new Date().toISOString(),
    totalEvents: 150,
    topCommands: [
      { name: 'do', count: 45, successCount: 44, failureCount: 1, lastUsed: '2024-01-15T10:00:00Z' },
      { name: 'auto', count: 30, successCount: 29, failureCount: 1, lastUsed: '2024-01-14T15:30:00Z' },
    ],
    topSkills: [
      { name: 'pm', count: 40, successCount: 40, failureCount: 0, lastUsed: '2024-01-15T10:00:00Z' },
    ],
    topAgents: [
      { name: 'agent-1', count: 50, successCount: 49, failureCount: 1, lastUsed: '2024-01-15T10:00:00Z' },
    ],
    dailySummaries: [
      {
        date: '2024-01-14',
        totalEvents: 45,
        commands: 20,
        skills: 15,
        agents: 10,
        uniqueCommands: 5,
        uniqueSkills: 3,
        uniqueAgents: 2,
      },
    ],
    successRate: 97.3,
  };

  return {
    mockCollectorInstance: {
      getAnalyticsDir: vi.fn().mockReturnValue('/fake/analytics'),
    },
    mockAggregatorInstance: {
      getSummary: vi.fn().mockReturnValue(mockSummary),
      export: vi.fn().mockReturnValue({
        filename: '/fake/analytics/export.json',
        content: JSON.stringify(mockSummary),
      }),
    },
  };
});

vi.mock('../../../../src/core/analytics/index.js', () => {
  // Create a constructor function
  const MockAggregatorConstructor = function () {
    return mockAggregatorInstance;
  };

  return {
    AnalyticsCollector: {
      getInstance: vi.fn().mockReturnValue(mockCollectorInstance),
    },
    AnalyticsAggregator: MockAggregatorConstructor,
  };
});

import {
  analyticsCommand,
} from '../../../../src/cli/commands/analytics.js';

describe('Analytics Command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Reset mocks for fresh test state
    mockCollectorInstance.getAnalyticsDir.mockClear();
    mockAggregatorInstance.getSummary.mockClear();
    mockAggregatorInstance.export.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Basic Functionality', () => {
    it('should display summary with default options', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');

      // Should contain dashboard title
      expect(output).toContain('Analytics Dashboard');
      expect(result.totalEvents).toBe(150);
    });

    it('should include total events in output', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.totalEvents).toBe(150);
      expect(result.successRate).toBe(97.3);
    });

    it('should include top commands in result', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.topCommands.length).toBeGreaterThan(0);
      expect(result.topCommands[0].name).toBeDefined();
      expect(result.topCommands[0].count).toBeDefined();
    });

    it('should include top skills in result', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.topSkills.length).toBeGreaterThan(0);
      expect(result.topSkills[0].name).toBeDefined();
    });

    it('should include top agents in result', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.topAgents.length).toBeGreaterThan(0);
    });
  });

  describe('Time Range Filtering', () => {
    it('should parse 24h time filter', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
        since: '24h',
      });

      expect(mockAggregatorInstance.getSummary).toHaveBeenCalled();
      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
    });

    it('should parse 7d time filter', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        since: '7d',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
    });

    it('should parse 30d time filter', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        since: '30d',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
    });

    it('should throw error on invalid time format', async () => {
      await expect(
        analyticsCommand({
          projectRoot: '/test',
          since: 'invalid',
        })
      ).rejects.toThrow('Invalid time format');
    });
  });

  describe('Event Type Filtering', () => {
    it('should filter by command type', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        type: 'command',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.type).toBe('command');
    });

    it('should filter by skill type', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        type: 'skill',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.type).toBe('skill');
    });

    it('should filter by agent type', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        type: 'agent',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.type).toBe('agent');
    });
  });

  describe('JSON Export', () => {
    it('should output JSON when json option is true', async () => {
      consoleSpy.mockClear();

      const result = await analyticsCommand({
        projectRoot: '/test',
        json: true,
      });

      // Should have printed JSON
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.totalEvents).toBe(150);
      expect(result.jsonOutput).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should include all summary fields in JSON output', async () => {
      consoleSpy.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        json: true,
      });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('since');
      expect(parsed).toHaveProperty('until');
      expect(parsed).toHaveProperty('totalEvents');
      expect(parsed).toHaveProperty('topCommands');
      expect(parsed).toHaveProperty('topSkills');
      expect(parsed).toHaveProperty('topAgents');
      expect(parsed).toHaveProperty('successRate');
    });
  });

  describe('CSV Export', () => {
    it('should export to CSV format', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
        export: 'csv',
      });

      expect(result.exported).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.filename).toBeDefined();
    });

    it('should export to JSON format', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
        export: 'json',
      });

      expect(result.exported).toBe(true);
      expect(result.format).toBe('json');
      expect(result.filename).toBeDefined();
    });

    it('should show export filename', async () => {
      consoleSpy.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        export: 'json',
      });

      const calls = consoleSpy.mock.calls.map(c => c[0]);
      const exportCall = calls.find(c => c?.includes('Exported to:'));
      expect(exportCall).toBeDefined();
    });
  });

  describe('Limit Option', () => {
    it('should respect custom limit for top lists', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        limit: 5,
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.limit).toBe(5);
    });

    it('should use default limit of 10 when not specified', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.limit).toBe(10);
    });
  });

  describe('Return Values', () => {
    it('should return correct summary data structure', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('topCommands');
      expect(result).toHaveProperty('topSkills');
      expect(result).toHaveProperty('topAgents');
      expect(result).toHaveProperty('successRate');
    });

    it('should return array of top commands', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(Array.isArray(result.topCommands)).toBe(true);
      expect(result.topCommands[0]).toHaveProperty('name');
      expect(result.topCommands[0]).toHaveProperty('count');
    });

    it('should return array of top skills', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(Array.isArray(result.topSkills)).toBe(true);
    });

    it('should return array of top agents', async () => {
      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(Array.isArray(result.topAgents)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty analytics data', async () => {
      mockAggregatorInstance.getSummary.mockReturnValue({
        generatedAt: new Date().toISOString(),
        since: '2024-01-01T00:00:00Z',
        until: new Date().toISOString(),
        totalEvents: 0,
        topCommands: [],
        topSkills: [],
        topAgents: [],
        dailySummaries: [],
        successRate: 0,
      });

      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.totalEvents).toBe(0);
      expect(result.topCommands.length).toBe(0);
    });

    it('should use current directory as default projectRoot', async () => {
      const { AnalyticsCollector } = await import('../../../../src/core/analytics/index.js');
      const collectMock = AnalyticsCollector.getInstance as ReturnType<typeof vi.fn>;

      collectMock.mockClear();

      await analyticsCommand({});

      expect(collectMock).toHaveBeenCalledWith(process.cwd());
    });

    it('should handle 100% success rate', async () => {
      mockAggregatorInstance.getSummary.mockReturnValue({
        generatedAt: new Date().toISOString(),
        since: '2024-01-01T00:00:00Z',
        until: new Date().toISOString(),
        totalEvents: 150,
        topCommands: [],
        topSkills: [],
        topAgents: [],
        dailySummaries: [],
        successRate: 100,
      });

      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.successRate).toBe(100);
    });

    it('should handle 0% success rate', async () => {
      mockAggregatorInstance.getSummary.mockReturnValue({
        generatedAt: new Date().toISOString(),
        since: '2024-01-01T00:00:00Z',
        until: new Date().toISOString(),
        totalEvents: 150,
        topCommands: [],
        topSkills: [],
        topAgents: [],
        dailySummaries: [],
        successRate: 0,
      });

      const result = await analyticsCommand({
        projectRoot: '/test',
      });

      expect(result.successRate).toBe(0);
    });
  });

  describe('Combined Options', () => {
    it('should combine time range and event type filters', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        since: '7d',
        type: 'skill',
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
      expect(callArgs?.type).toBe('skill');
    });

    it('should combine all filter options', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      await analyticsCommand({
        projectRoot: '/test',
        since: '30d',
        type: 'command',
        limit: 15,
      });

      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
      expect(callArgs?.type).toBe('command');
      expect(callArgs?.limit).toBe(15);
    });

    it('should handle export with time range filter', async () => {
      mockAggregatorInstance.getSummary.mockClear();

      const result = await analyticsCommand({
        projectRoot: '/test',
        export: 'json',
        since: '7d',
      });

      expect(result.exported).toBe(true);
      const callArgs = mockAggregatorInstance.getSummary.mock.calls[0]?.[0];
      expect(callArgs?.since).toBeDefined();
    });
  });
});
