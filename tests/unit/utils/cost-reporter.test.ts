import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CostReporter } from '../../../src/utils/cost-reporter.js';
import type { IncrementCostReport, CostSession } from '../../../src/types/cost-tracking.js';

// ---------------------------------------------------------------------------
// Mock CostTracker factory
// ---------------------------------------------------------------------------

function createMockCostTracker(overrides: {
  incrementReport?: IncrementCostReport;
  sessions?: CostSession[];
  allSessions?: CostSession[];
  summary?: ReturnType<ReturnType<typeof createMockCostTracker>['getSummary']>;
} = {}) {
  const defaultReport: IncrementCostReport = {
    incrementId: '0003',
    totalCost: 1.2345,
    totalSavings: 0.5678,
    totalTokens: 50000,
    sessionCount: 3,
    costByModel: { sonnet: 0.8, haiku: 0.4345 },
    costByAgent: { pm: 0.6, architect: 0.4, frontend: 0.2345 },
  };

  const defaultSession: CostSession = {
    sessionId: 'session_001',
    agent: 'pm',
    model: 'sonnet',
    increment: '0003',
    command: '/sw:do',
    startedAt: '2026-01-15T10:00:00.000Z',
    endedAt: '2026-01-15T10:05:00.000Z',
    tokenUsage: { inputTokens: 10000, outputTokens: 5000, totalTokens: 15000 },
    cost: 0.45,
    savings: 0.15,
  };

  const defaultSummary = {
    totalSessions: 5,
    totalCost: 2.5,
    totalSavings: 1.0,
    savingsPercentage: 28.6,
    mostExpensiveAgent: 'architect',
    cheapestAgent: 'haiku-agent',
  };

  return {
    getIncrementCost: vi.fn().mockReturnValue(overrides.incrementReport ?? defaultReport),
    getIncrementSessions: vi.fn().mockReturnValue(overrides.sessions ?? [defaultSession]),
    getSummary: vi.fn().mockReturnValue(overrides.summary ?? defaultSummary),
    getAllSessions: vi.fn().mockReturnValue(overrides.allSessions ?? [defaultSession]),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cost-reporter-test-'));
}

function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CostReporter', () => {
  // -------------------------------------------------------------------------
  // generateIncrementReport
  // -------------------------------------------------------------------------

  describe('generateIncrementReport', () => {
    it('should delegate to costTracker.getIncrementCost', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const result = reporter.generateIncrementReport('0003');

      expect(tracker.getIncrementCost).toHaveBeenCalledWith('0003');
      expect(result.incrementId).toBe('0003');
    });

    it('should return the report object from the tracker', () => {
      const customReport: IncrementCostReport = {
        incrementId: '0010',
        totalCost: 5.0,
        totalSavings: 2.0,
        totalTokens: 100000,
        sessionCount: 10,
        costByModel: { opus: 5.0 },
        costByAgent: { 'backend-dev': 5.0 },
      };
      const tracker = createMockCostTracker({ incrementReport: customReport });
      const reporter = new CostReporter(tracker as any);

      const result = reporter.generateIncrementReport('0010');

      expect(result).toEqual(customReport);
    });

    it('should pass different increment IDs correctly', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      reporter.generateIncrementReport('0001');
      reporter.generateIncrementReport('0099');

      expect(tracker.getIncrementCost).toHaveBeenCalledWith('0001');
      expect(tracker.getIncrementCost).toHaveBeenCalledWith('0099');
    });
  });

  // -------------------------------------------------------------------------
  // exportToJSON
  // -------------------------------------------------------------------------

  describe('exportToJSON', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpDir();
    });

    afterEach(() => {
      cleanDir(dir);
    });

    it('should write a valid JSON file', async () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'report.json');

      await reporter.exportToJSON('0003', outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content.incrementId).toBe('0003');
      expect(content.totalCost).toBe(1.2345);
    });

    it('should include all report fields in JSON output', async () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'full.json');

      await reporter.exportToJSON('0003', outputPath);

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content).toHaveProperty('totalCost');
      expect(content).toHaveProperty('totalSavings');
      expect(content).toHaveProperty('totalTokens');
      expect(content).toHaveProperty('sessionCount');
      expect(content).toHaveProperty('costByModel');
      expect(content).toHaveProperty('costByAgent');
    });
  });

  // -------------------------------------------------------------------------
  // exportToCSV
  // -------------------------------------------------------------------------

  describe('exportToCSV', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpDir();
    });

    afterEach(() => {
      cleanDir(dir);
    });

    it('should write a CSV file with headers', async () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'report.csv');

      await reporter.exportToCSV('0003', outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf-8');
      const lines = content.split('\n');
      expect(lines[0]).toContain('Session ID');
      expect(lines[0]).toContain('Agent');
      expect(lines[0]).toContain('Model');
      expect(lines[0]).toContain('Cost ($)');
    });

    it('should include data rows matching session count', async () => {
      const sessions: CostSession[] = [
        {
          sessionId: 'ses-1',
          agent: 'pm',
          model: 'sonnet',
          increment: '0003',
          command: '/sw:do',
          startedAt: '2026-01-15T10:00:00Z',
          endedAt: '2026-01-15T10:05:00Z',
          tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
          cost: 0.01,
          savings: 0.005,
        },
        {
          sessionId: 'ses-2',
          agent: 'architect',
          model: 'haiku',
          increment: '0003',
          startedAt: '2026-01-15T11:00:00Z',
          tokenUsage: { inputTokens: 2000, outputTokens: 800, totalTokens: 2800 },
          cost: 0.02,
          savings: 0.01,
        },
      ];
      const tracker = createMockCostTracker({ sessions });
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'multi.csv');

      await reporter.exportToCSV('0003', outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      // 1 header + 2 data rows
      expect(lines).toHaveLength(3);
    });

    it('should format missing command as N/A and missing endedAt as In Progress', async () => {
      const sessions: CostSession[] = [
        {
          sessionId: 'ses-x',
          agent: 'tester',
          model: 'sonnet',
          increment: '0003',
          startedAt: '2026-01-15T12:00:00Z',
          tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          cost: 0.001,
          savings: 0.0005,
        },
      ];
      const tracker = createMockCostTracker({ sessions });
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'na.csv');

      await reporter.exportToCSV('0003', outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('N/A');
      expect(content).toContain('In Progress');
    });

    it('should produce empty data section for zero sessions', async () => {
      const tracker = createMockCostTracker({ sessions: [] });
      const reporter = new CostReporter(tracker as any);
      const outputPath = path.join(dir, 'empty.csv');

      await reporter.exportToCSV('0003', outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      // Only the header row
      expect(lines).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // generateDashboard
  // -------------------------------------------------------------------------

  describe('generateDashboard', () => {
    it('should return per-increment dashboard when incrementId is provided', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard('0003');

      expect(dashboard).toContain('Increment 0003');
      expect(dashboard).toContain('SUMMARY');
      expect(dashboard).toContain('COST BY MODEL');
      expect(dashboard).toContain('COST BY AGENT');
      expect(dashboard).toContain('RECENT SESSIONS');
    });

    it('should return overall dashboard when no incrementId', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard();

      expect(dashboard).toContain('All Increments');
      expect(dashboard).toContain('OVERALL SUMMARY');
    });

    it('should show "No cost data" message for empty increment sessions', () => {
      const emptyReport: IncrementCostReport = {
        incrementId: '9999',
        totalCost: 0,
        totalSavings: 0,
        totalTokens: 0,
        sessionCount: 0,
        costByModel: {},
        costByAgent: {},
      };
      const tracker = createMockCostTracker({
        incrementReport: emptyReport,
        sessions: [],
      });
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard('9999');

      expect(dashboard).toContain('No cost data for increment 9999');
    });

    it('should show "No cost data available" for overall with zero sessions', () => {
      const tracker = createMockCostTracker({
        summary: {
          totalSessions: 0,
          totalCost: 0,
          totalSavings: 0,
          savingsPercentage: 0,
          mostExpensiveAgent: null,
          cheapestAgent: null,
        },
        allSessions: [],
      });
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard();

      expect(dashboard).toBe('No cost data available');
    });

    it('should include cost and savings in the per-increment dashboard', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard('0003');

      expect(dashboard).toContain('$');
      expect(dashboard).toContain('Total Cost');
      expect(dashboard).toContain('Total Savings');
    });

    it('should display agent stats in overall dashboard when available', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard();

      expect(dashboard).toContain('AGENT STATS');
      expect(dashboard).toContain('Most Expensive');
      expect(dashboard).toContain('architect');
    });

    it('should list cost by increment in overall dashboard', () => {
      const sessions: CostSession[] = [
        {
          sessionId: 's1',
          agent: 'pm',
          model: 'sonnet',
          increment: '0001',
          startedAt: '2026-01-01T00:00:00Z',
          tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          cost: 0.5,
          savings: 0.1,
        },
        {
          sessionId: 's2',
          agent: 'dev',
          model: 'haiku',
          increment: '0002',
          startedAt: '2026-01-02T00:00:00Z',
          tokenUsage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
          cost: 0.3,
          savings: 0.2,
        },
      ];
      const tracker = createMockCostTracker({
        allSessions: sessions,
      });
      const reporter = new CostReporter(tracker as any);

      const dashboard = reporter.generateDashboard();

      expect(dashboard).toContain('COST BY INCREMENT');
    });
  });

  // -------------------------------------------------------------------------
  // generateSummaryLine
  // -------------------------------------------------------------------------

  describe('generateSummaryLine', () => {
    it('should return a per-increment summary line when incrementId is provided', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const line = reporter.generateSummaryLine('0003');

      expect(line).toContain('Increment 0003');
      expect(line).toContain('$');
      expect(line).toContain('cost');
      expect(line).toContain('saved');
    });

    it('should return an overall summary line when no incrementId', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      const line = reporter.generateSummaryLine();

      expect(line).toContain('Total');
      expect(line).toContain('sessions');
    });

    it('should include cost values formatted to 4 decimal places', () => {
      const report: IncrementCostReport = {
        incrementId: '0005',
        totalCost: 3.1415,
        totalSavings: 1.2345,
        totalTokens: 80000,
        sessionCount: 4,
        costByModel: {},
        costByAgent: {},
      };
      const tracker = createMockCostTracker({ incrementReport: report });
      const reporter = new CostReporter(tracker as any);

      const line = reporter.generateSummaryLine('0005');

      expect(line).toContain('$3.1415');
      expect(line).toContain('$1.2345');
    });

    it('should include savings percentage in increment summary', () => {
      const report: IncrementCostReport = {
        incrementId: '0007',
        totalCost: 2.0,
        totalSavings: 1.0,
        totalTokens: 10000,
        sessionCount: 1,
        costByModel: {},
        costByAgent: {},
      };
      const tracker = createMockCostTracker({ incrementReport: report });
      const reporter = new CostReporter(tracker as any);

      const line = reporter.generateSummaryLine('0007');

      // savings / (cost + savings) = 1 / 3 = 33.3%
      expect(line).toContain('33.3%');
    });

    it('should include savings percentage and session count in overall summary', () => {
      const tracker = createMockCostTracker({
        summary: {
          totalSessions: 12,
          totalCost: 10.0,
          totalSavings: 4.0,
          savingsPercentage: 28.6,
          mostExpensiveAgent: 'pm',
          cheapestAgent: 'haiku-agent',
        },
      });
      const reporter = new CostReporter(tracker as any);

      const line = reporter.generateSummaryLine();

      expect(line).toContain('28.6%');
      expect(line).toContain('12 sessions');
    });

    it('should call getSummary for overall and getIncrementCost for per-increment', () => {
      const tracker = createMockCostTracker();
      const reporter = new CostReporter(tracker as any);

      reporter.generateSummaryLine('0003');
      expect(tracker.getIncrementCost).toHaveBeenCalledWith('0003');

      reporter.generateSummaryLine();
      expect(tracker.getSummary).toHaveBeenCalled();
    });
  });
});
