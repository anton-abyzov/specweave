/**
 * Unit Tests: QA Runner (qa-runner.ts)
 *
 * Tests for the main QA orchestration logic including:
 * - runQA() full flow with all branches
 * - Rule-based validation (file existence checks)
 * - AI quality assessment (stub behavior)
 * - Quality gate decision routing
 * - Report display logic
 * - Export to tasks functionality
 * - Error handling and edge cases
 * - Mode determination
 * - Token estimation and cost calculation
 * - Increment path resolution
 *
 * @see src/core/qa/qa-runner.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fsMod from 'fs';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockExistsSync,
  mockReaddirSync,
  mockStatSync,
  mockReadFile,
  mockWriteFile,
  mockOraInstance,
  mockOra,
  mockChalkBlue,
  mockChalkRed,
  mockChalkGreen,
  mockChalkYellow,
  mockChalkGray,
  mockChalkCyan,
  mockChalk,
  mockQualityGateDeciderInstance,
  mockQualityGateDeciderConstructor,
  mockGetDecisionIcon,
  mockGetDecisionColor,
  mockRiskCalculatorCreateRisk,
  mockRiskCalculatorCalculateAssessment,
  mockProcessExit,
  mockConsoleLog,
} = vi.hoisted(() => {
  const mockExistsSync = vi.fn();
  const mockReaddirSync = vi.fn();
  const mockStatSync = vi.fn();
  const mockReadFile = vi.fn();
  const mockWriteFile = vi.fn();

  const mockOraInstance = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  const mockOra = vi.fn(() => mockOraInstance);

  // Build chalk mock: every method returns a function that returns the input string
  const passthrough = (s: string) => s;
  const makeChalkFn = (): any => {
    const fn: any = vi.fn(passthrough);
    fn.bold = vi.fn(passthrough);
    return fn;
  };

  const mockChalkBlue = makeChalkFn();
  const mockChalkRed = makeChalkFn();
  const mockChalkGreen = makeChalkFn();
  const mockChalkYellow = makeChalkFn();
  const mockChalkGray = makeChalkFn();
  const mockChalkCyan = makeChalkFn();

  const mockChalk = {
    blue: mockChalkBlue,
    red: mockChalkRed,
    green: mockChalkGreen,
    yellow: mockChalkYellow,
    gray: mockChalkGray,
    cyan: mockChalkCyan,
    bold: vi.fn(passthrough),
  };

  const mockDecide = vi.fn().mockReturnValue({
    decision: 'PASS',
    blockers: [],
    concerns: [],
    recommendations: [],
    reasoning: 'All quality checks passed.',
  });

  const mockDecideInstance = { decide: mockDecide };
  class MockQualityGateDecider {
    decide = mockDecide;
    constructor() {
      return mockDecideInstance;
    }
  }
  const mockGetDecisionIcon = vi.fn().mockReturnValue('icon');
  const mockGetDecisionColor = vi.fn().mockReturnValue('green');

  const mockRiskCalculatorCreateRisk = vi.fn().mockReturnValue({
    id: 'RISK-001',
    category: 'security',
    title: 'Example security risk',
    description: 'Mock risk',
    probability: 0.3,
    impact: 5,
    score: 1.5,
    severity: 'LOW',
    mitigation: 'Implement proper validation',
    location: 'spec.md',
  });

  const mockRiskCalculatorCalculateAssessment = vi.fn().mockReturnValue({
    risks: [],
    overall_risk_score: 0,
    risk_by_category: { security: 0, technical: 0, implementation: 0, operational: 0 },
  });

  const mockProcessExit = vi.fn();
  const mockConsoleLog = vi.fn();

  return {
    mockExistsSync,
    mockReaddirSync,
    mockStatSync,
    mockReadFile,
    mockWriteFile,
    mockOraInstance,
    mockOra,
    mockChalkBlue,
    mockChalkRed,
    mockChalkGreen,
    mockChalkYellow,
    mockChalkGray,
    mockChalkCyan,
    mockChalk,
    mockDecideInstance,
    MockQualityGateDecider,
    mockGetDecisionIcon,
    mockGetDecisionColor,
    mockRiskCalculatorCreateRisk,
    mockRiskCalculatorCalculateAssessment,
    mockProcessExit,
    mockConsoleLog,
  };
});

// ---------------------------------------------------------------------------
// vi.mock() calls
// ---------------------------------------------------------------------------

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

vi.mock('ora', () => ({ default: mockOra }));

vi.mock('chalk', () => ({ default: mockChalk }));

vi.mock('../../../../src/core/qa/quality-gate-decider.js', () => ({
  QualityGateDecider: Object.assign(MockQualityGateDecider, {
    getDecisionIcon: mockGetDecisionIcon,
    getDecisionColor: mockGetDecisionColor,
  }),
  DEFAULT_THRESHOLDS: {
    fail: { riskScore: 9.0, testCoverage: 60, specQuality: 50, criticalVulnerabilities: 1 },
    concerns: { riskScore: 6.0, testCoverage: 80, specQuality: 70, highVulnerabilities: 1 },
  },
}));

vi.mock('../../../../src/core/qa/risk-calculator.js', () => ({
  RiskCalculator: {
    createRisk: mockRiskCalculatorCreateRisk,
    calculateAssessment: mockRiskCalculatorCalculateAssessment,
  },
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocking
// ---------------------------------------------------------------------------

const { runQA } = await import('../../../../src/core/qa/qa-runner.js');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const FAKE_CWD = '/fake/project';
const INCREMENTS_DIR = path.join(FAKE_CWD, '.specweave', 'increments');
const INCREMENT_DIR_NAME = '0008-my-feature';
const INCREMENT_PATH = path.join(INCREMENTS_DIR, INCREMENT_DIR_NAME);

/**
 * Configure mocks for a standard passing scenario
 */
function setupPassingScenario(): void {
  // resolveIncrementPath: directory exists and matches
  mockExistsSync.mockImplementation((p: string) => {
    if (p === INCREMENTS_DIR) return true;
    // Required files exist
    if (p === path.join(INCREMENT_PATH, 'spec.md')) return true;
    if (p === path.join(INCREMENT_PATH, 'plan.md')) return true;
    if (p === path.join(INCREMENT_PATH, 'tasks.md')) return true;
    return false;
  });
  mockReaddirSync.mockReturnValue([INCREMENT_DIR_NAME]);
  mockStatSync.mockReturnValue({ isDirectory: () => true });
  mockReadFile.mockResolvedValue('# Spec content');
}

/**
 * Configure mocks where required files are missing
 */
function setupMissingFilesScenario(): void {
  mockExistsSync.mockImplementation((p: string) => {
    if (p === INCREMENTS_DIR) return true;
    // spec.md exists, plan.md and tasks.md missing
    if (p === path.join(INCREMENT_PATH, 'spec.md')) return true;
    return false;
  });
  mockReaddirSync.mockReturnValue([INCREMENT_DIR_NAME]);
  mockStatSync.mockReturnValue({ isDirectory: () => true });
}

// ===========================================================================
// Tests
// ===========================================================================

describe('qa-runner', () => {
  let originalCwd: () => string;
  let originalProcessExit: (code?: number) => never;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub process.cwd and process.exit
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue(FAKE_CWD);

    originalProcessExit = process.exit;
    process.exit = mockProcessExit as any;

    originalConsoleLog = console.log;
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalProcessExit;
    console.log = originalConsoleLog;
  });

  // -------------------------------------------------------------------------
  // runQA - Basic successful flow
  // -------------------------------------------------------------------------
  describe('runQA - successful flow', () => {
    it('returns a QAReport with correct increment_id', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.increment_id).toBe('0008');
    });

    it('returns a QAReport with correct mode (default: quick)', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.mode).toBe('quick');
    });

    it('includes a timestamp in the report', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.timestamp).toBeDefined();
      expect(typeof report.timestamp).toBe('string');
      // Should be ISO format
      expect(() => new Date(report.timestamp)).not.toThrow();
    });

    it('includes duration_ms in the report', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.duration_ms).toBeDefined();
      expect(typeof report.duration_ms).toBe('number');
      expect(report.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('includes rule_based results in the report', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.rule_based).toBeDefined();
      expect(report.rule_based.passed).toBe(true);
    });

    it('includes quality_gate in the report', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.quality_gate).toBeDefined();
      expect(report.quality_gate.decision).toBeDefined();
    });

    it('creates an ora spinner for rule-based validation', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true, silent: true });
      expect(mockOra).toHaveBeenCalledWith(
        expect.stringContaining('rule-based validation')
      );
    });

    it('calls spinner.succeed when rule-based validation passes', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true, silent: true });
      expect(mockOraInstance.succeed).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Mode determination
  // -------------------------------------------------------------------------
  describe('runQA - mode determination', () => {
    it('uses "gate" mode when gate option is set', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { gate: true, noAi: true, silent: true });
      expect(report.mode).toBe('gate');
    });

    it('uses "pre" mode when pre option is set', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { pre: true, noAi: true, silent: true });
      expect(report.mode).toBe('pre');
    });

    it('uses "full" mode when full option is set', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { full: true, noAi: true, silent: true });
      expect(report.mode).toBe('full');
    });

    it('gate takes priority over pre and full', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { gate: true, pre: true, full: true, noAi: true, silent: true });
      expect(report.mode).toBe('gate');
    });

    it('pre takes priority over full', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { pre: true, full: true, noAi: true, silent: true });
      expect(report.mode).toBe('pre');
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Increment not found
  // -------------------------------------------------------------------------
  describe('runQA - increment not found', () => {
    it('throws an error when increment directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([]);

      await expect(runQA('9999', { noAi: true, silent: true })).rejects.toThrow(
        /Increment 9999 not found/
      );
    });

    it('throws when increments dir exists but no matching directory found', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['0001-other-feature']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      await expect(runQA('9999', { noAi: true, silent: true })).rejects.toThrow(
        /Increment 9999 not found/
      );
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Rule-based validation
  // -------------------------------------------------------------------------
  describe('runQA - rule-based validation', () => {
    it('reports all 3 files passing when they exist', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.rule_based.passedCount).toBe(3);
      expect(report.rule_based.totalCount).toBe(3);
      expect(report.rule_based.failedCount).toBe(0);
      expect(report.rule_based.errors).toHaveLength(0);
    });

    it('reports failures when required files are missing', async () => {
      setupMissingFilesScenario();

      // force: true to skip process.exit
      const report = await runQA('0008', { noAi: true, silent: true, force: true });
      expect(report.rule_based.passed).toBe(false);
      expect(report.rule_based.errors.length).toBeGreaterThan(0);
    });

    it('checks for spec.md, plan.md, and tasks.md', async () => {
      setupMissingFilesScenario();
      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      const missingFiles = report.rule_based.errors.map(e => e.file);
      expect(missingFiles).toContain('plan.md');
      expect(missingFiles).toContain('tasks.md');
    });

    it('calls process.exit(1) when validation fails and force is not set', async () => {
      setupMissingFilesScenario();
      await runQA('0008', { noAi: true, silent: true });
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('does NOT call process.exit when validation fails but force is true', async () => {
      setupMissingFilesScenario();
      await runQA('0008', { noAi: true, silent: true, force: true });
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('calls spinner.fail when validation fails', async () => {
      setupMissingFilesScenario();
      await runQA('0008', { noAi: true, silent: true, force: true });
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('includes error details with rule, severity, message, and file', async () => {
      setupMissingFilesScenario();
      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      for (const error of report.rule_based.errors) {
        expect(error.rule).toBeDefined();
        expect(error.severity).toBe('error');
        expect(error.message).toBeDefined();
        expect(error.file).toBeDefined();
      }
    });

    it('includes breakdown scores in the result', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      const { breakdown } = report.rule_based;

      expect(breakdown.consistency).toBeDefined();
      expect(breakdown.completeness).toBeDefined();
      expect(breakdown.quality).toBeDefined();
      expect(breakdown.traceability).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // runQA - AI quality assessment
  // -------------------------------------------------------------------------
  describe('runQA - AI quality assessment', () => {
    it('runs AI assessment when noAi is not set', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });

      expect(report.spec_quality).toBeDefined();
      expect(report.spec_quality!.overall_score).toBe(75);
    });

    it('skips AI assessment when noAi is true', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });

      expect(report.spec_quality).toBeUndefined();
      expect(report.token_usage).toBe(0);
      expect(report.cost_usd).toBe(0);
    });

    it('creates a separate ora spinner for AI assessment', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      // Should have been called twice: once for rules, once for AI
      expect(mockOra).toHaveBeenCalledTimes(2);
      expect(mockOra).toHaveBeenCalledWith(
        expect.stringContaining('AI quality assessment')
      );
    });

    it('includes token_usage in report when AI runs', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });

      expect(report.token_usage).toBe(2500);
    });

    it('includes cost_usd in report when AI runs', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });

      expect(report.cost_usd).toBeDefined();
      expect(report.cost_usd).toBeGreaterThan(0);
    });

    it('includes dimension scores in spec_quality', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });

      const scores = report.spec_quality!.dimension_scores;
      expect(scores.clarity).toBeDefined();
      expect(scores.testability).toBeDefined();
      expect(scores.completeness).toBeDefined();
      expect(scores.feasibility).toBeDefined();
      expect(scores.maintainability).toBeDefined();
      expect(scores.edge_cases).toBeDefined();
      expect(scores.risk).toBeDefined();
    });

    it('reads spec.md for context during AI assessment', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      expect(mockReadFile).toHaveBeenCalledWith(
        path.join(INCREMENT_PATH, 'spec.md'),
        'utf-8'
      );
    });

    it('calls RiskCalculator.createRisk during AI assessment', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      expect(mockRiskCalculatorCreateRisk).toHaveBeenCalled();
    });

    it('calls RiskCalculator.calculateAssessment during AI assessment', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      expect(mockRiskCalculatorCalculateAssessment).toHaveBeenCalled();
    });

    it('continues with rule-based only when AI assessment throws', async () => {
      setupPassingScenario();
      // Make readFile throw to simulate AI failure
      mockReadFile.mockRejectedValueOnce(new Error('AI service unavailable'));

      const report = await runQA('0008', { silent: true });

      expect(report.spec_quality).toBeUndefined();
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('handles non-Error throw during AI assessment', async () => {
      setupPassingScenario();
      mockReadFile.mockRejectedValueOnce('string error');

      const report = await runQA('0008', { silent: true });

      expect(report.spec_quality).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Quality gate decision
  // -------------------------------------------------------------------------
  describe('runQA - quality gate decision', () => {
    it('uses QualityGateDecider when AI assessment is available', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      expect(mockDecideInstance.decide).toHaveBeenCalled();
    });

    it('builds rule-based quality gate when AI is skipped', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });

      // When noAi is true, decider.decide should NOT be called
      expect(mockDecideInstance.decide).not.toHaveBeenCalled();
      // But quality_gate should still exist from buildRuleBasedQualityGate
      expect(report.quality_gate).toBeDefined();
      expect(report.quality_gate.decision).toBe('PASS');
    });

    it('builds FAIL quality gate for failed rule-based validation (no AI)', async () => {
      setupMissingFilesScenario();
      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      expect(report.quality_gate.decision).toBe('FAIL');
      expect(report.quality_gate.reasoning).toContain('failed');
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Display report
  // -------------------------------------------------------------------------
  describe('runQA - display report', () => {
    it('displays the report when silent is not set', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true });

      // console.log should have been called for display
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('does NOT display the report when silent is true', async () => {
      setupPassingScenario();
      // Reset after the initial log calls from runQA header
      mockConsoleLog.mockClear();
      // Note: silent only affects displayReport, not the header logs
      await runQA('0008', { noAi: true, silent: true });

      // The header logs will still fire, but displayReport should not
      // Check that displayReport specific content is not called
      // (QualityGateDecider.getDecisionIcon should not be called when silent)
      expect(mockGetDecisionIcon).not.toHaveBeenCalled();
    });

    it('calls QualityGateDecider.getDecisionIcon during display', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true });

      expect(mockGetDecisionIcon).toHaveBeenCalled();
    });

    it('calls QualityGateDecider.getDecisionColor during display', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true });

      expect(mockGetDecisionColor).toHaveBeenCalled();
    });

    it('displays blockers when they exist', async () => {
      setupPassingScenario();
      // Configure quality gate with blockers
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{
          type: 'risk',
          severity: 'critical',
          title: 'Critical issue',
          description: 'Must fix',
          mitigation: 'Fix it',
          location: 'spec.md',
        }],
        concerns: [],
        recommendations: [],
        reasoning: 'Blockers found.',
      });

      await runQA('0008', {});

      // Verify blockers section is displayed (chalk.red.bold called with Blockers text)
      expect(mockChalkRed.bold).toHaveBeenCalled();
    });

    it('displays concerns when they exist', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'CONCERNS',
        blockers: [],
        concerns: [{
          type: 'spec_quality',
          severity: 'high',
          title: 'Quality concern',
          description: 'Should fix',
          mitigation: 'Improve spec',
          location: 'plan.md',
        }],
        recommendations: [],
        reasoning: 'Concerns found.',
      });

      await runQA('0008', {});

      expect(mockChalkYellow.bold).toHaveBeenCalled();
    });

    it('displays recommendations when verbose is true and they exist', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'PASS',
        blockers: [],
        concerns: [],
        recommendations: [{
          type: 'suggestion',
          severity: 'low',
          title: 'Nice to have',
          description: 'Optional improvement',
        }],
        reasoning: 'All good with suggestions.',
      });

      await runQA('0008', { verbose: true });

      expect(mockChalkCyan.bold).toHaveBeenCalled();
    });

    it('does NOT display recommendations when verbose is falsy', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'PASS',
        blockers: [],
        concerns: [],
        recommendations: [{
          type: 'suggestion',
          severity: 'low',
          title: 'Nice to have',
          description: 'Optional improvement',
        }],
        reasoning: 'All good.',
      });

      mockChalkCyan.bold.mockClear();
      await runQA('0008', {});

      // cyan.bold should NOT be called for recommendations header
      const cyanBoldCalls = mockChalkCyan.bold.mock.calls;
      const hasRecommendationsHeader = cyanBoldCalls.some(
        (args: string[]) => typeof args[0] === 'string' && args[0].includes('Recommendations')
      );
      expect(hasRecommendationsHeader).toBe(false);
    });

    it('shows spec quality scores when available', async () => {
      setupPassingScenario();
      // Default setup provides spec_quality via AI
      await runQA('0008', {});

      // Should display "SPECIFICATION QUALITY" header
      const blueBoldCalls = mockChalkBlue.bold.mock.calls;
      const hasSpecQualityHeader = blueBoldCalls.some(
        (args: string[]) => typeof args[0] === 'string' && args[0].includes('SPECIFICATION QUALITY')
      );
      expect(hasSpecQualityHeader).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Export to tasks
  // -------------------------------------------------------------------------
  describe('runQA - export to tasks', () => {
    it('exports blockers and concerns to tasks.md when export is true', async () => {
      setupPassingScenario();

      // Make tasks.md exist for the export path
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        if (p === path.join(INCREMENT_PATH, 'spec.md')) return true;
        if (p === path.join(INCREMENT_PATH, 'plan.md')) return true;
        if (p === path.join(INCREMENT_PATH, 'tasks.md')) return true;
        // Export path uses incrementId directly, not resolved path
        if (p === path.join(FAKE_CWD, '.specweave', 'increments', '0008', 'tasks.md')) return true;
        return false;
      });

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.endsWith('tasks.md')) {
          return Promise.resolve('## T-001: Existing task\n**Status**: [x] completed\n');
        }
        return Promise.resolve('# Spec content');
      });

      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{
          type: 'risk',
          severity: 'critical',
          title: 'Must fix this',
          description: 'Critical issue found',
          mitigation: 'Apply fix',
          location: 'spec.md',
        }],
        concerns: [{
          type: 'spec_quality',
          severity: 'high',
          title: 'Should improve this',
          description: 'Quality concern',
        }],
        recommendations: [],
        reasoning: 'Issues found.',
      });

      await runQA('0008', { export: true, silent: true });

      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('does NOT export when export option is false', async () => {
      setupPassingScenario();
      await runQA('0008', { silent: true });

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('does NOT export when spec_quality is undefined (noAi)', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true, export: true, silent: true });

      // Export requires specQuality to be truthy
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('skips export when tasks.md does not exist at export path', async () => {
      setupPassingScenario();

      // Override so the export-path tasks.md doesn't exist
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        if (p === path.join(INCREMENT_PATH, 'spec.md')) return true;
        if (p === path.join(INCREMENT_PATH, 'plan.md')) return true;
        if (p === path.join(INCREMENT_PATH, 'tasks.md')) return true;
        // Export path tasks.md does NOT exist
        if (p.endsWith('tasks.md') && p.includes('0008/')) return false;
        return false;
      });

      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{ type: 'risk', severity: 'critical', title: 'Issue', description: 'Desc' }],
        concerns: [],
        recommendations: [],
        reasoning: 'Blockers.',
      });

      await runQA('0008', { export: true, silent: true });

      // writeFile should not be called since tasks.md doesn't exist at export path
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // runQA - CI mode
  // -------------------------------------------------------------------------
  describe('runQA - CI mode', () => {
    it('calls process.exit(1) when CI mode and quality gate FAIL', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{ type: 'x', severity: 'critical', title: 'blocker', description: 'desc' }],
        concerns: [],
        recommendations: [],
        reasoning: 'Failed.',
      });

      await runQA('0008', { ci: true, silent: true });

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('does NOT call process.exit when CI mode and quality gate PASS', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'PASS',
        blockers: [],
        concerns: [],
        recommendations: [],
        reasoning: 'All good.',
      });

      await runQA('0008', { ci: true, silent: true });

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('does NOT call process.exit when CI mode and quality gate CONCERNS', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'CONCERNS',
        blockers: [],
        concerns: [{ type: 'x', severity: 'high', title: 'concern', description: 'desc' }],
        recommendations: [],
        reasoning: 'Concerns only.',
      });

      await runQA('0008', { ci: true, silent: true });

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('does NOT call process.exit for FAIL when ci is not set', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{ type: 'x', severity: 'critical', title: 'blocker', description: 'desc' }],
        concerns: [],
        recommendations: [],
        reasoning: 'Failed.',
      });

      await runQA('0008', { silent: true });

      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // runQA - Default options
  // -------------------------------------------------------------------------
  describe('runQA - default options', () => {
    it('works with empty options object', async () => {
      setupPassingScenario();
      const report = await runQA('0008', {});
      expect(report).toBeDefined();
      expect(report.increment_id).toBe('0008');
    });

    it('works with no options argument', async () => {
      setupPassingScenario();
      const report = await runQA('0008');
      expect(report).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Rule-based validation - edge cases
  // -------------------------------------------------------------------------
  describe('rule-based validation - edge cases', () => {
    it('handles all three files missing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([INCREMENT_DIR_NAME]);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      expect(report.rule_based.passed).toBe(false);
      expect(report.rule_based.errors).toHaveLength(3);
      expect(report.rule_based.passedCount).toBe(0);
      expect(report.rule_based.failedCount).toBe(3);
    });

    it('error messages describe which file is missing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([INCREMENT_DIR_NAME]);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      const messages = report.rule_based.errors.map(e => e.message);
      expect(messages).toContain('Missing required file: spec.md');
      expect(messages).toContain('Missing required file: plan.md');
      expect(messages).toContain('Missing required file: tasks.md');
    });
  });

  // -------------------------------------------------------------------------
  // Increment path resolution
  // -------------------------------------------------------------------------
  describe('increment path resolution', () => {
    it('finds increment with full directory name matching prefix', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        if (p.includes('0008-my-feature')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['0008-my-feature']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });
      mockReadFile.mockResolvedValue('');

      // Should not throw - increment found
      const report = await runQA('0008', { noAi: true, silent: true, force: true });
      expect(report.increment_id).toBe('0008');
    });

    it('skips files that match prefix (only directories counted)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['0008-readme.txt']);
      mockStatSync.mockReturnValue({ isDirectory: () => false });

      await expect(runQA('0008', { noAi: true, silent: true })).rejects.toThrow(
        /Increment 0008 not found/
      );
    });
  });

  // -------------------------------------------------------------------------
  // Console output during validation failures
  // -------------------------------------------------------------------------
  describe('console output during validation failures', () => {
    it('logs error details with severity and rule name', async () => {
      setupMissingFilesScenario();
      await runQA('0008', { noAi: true, force: true });

      // Check that console.log was called with formatted error lines
      const allLogCalls = mockConsoleLog.mock.calls.map(c => String(c[0]));
      // Should contain error formatting (via chalk mocks that pass through)
      expect(allLogCalls.length).toBeGreaterThan(0);
    });

    it('includes file path in error output when available', async () => {
      setupMissingFilesScenario();
      await runQA('0008', { noAi: true, force: true });

      // Chalk gray is called for file paths
      expect(mockChalkGray).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // buildRuleBasedQualityGate (via integration)
  // -------------------------------------------------------------------------
  describe('buildRuleBasedQualityGate (integration)', () => {
    it('produces PASS gate when all files exist and noAi', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });

      expect(report.quality_gate.decision).toBe('PASS');
      expect(report.quality_gate.blockers).toHaveLength(0);
      expect(report.quality_gate.concerns).toHaveLength(0);
      expect(report.quality_gate.recommendations).toHaveLength(0);
      expect(report.quality_gate.reasoning).toContain('passed');
    });

    it('produces FAIL gate with errors as blockers and noAi', async () => {
      setupMissingFilesScenario();
      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      expect(report.quality_gate.decision).toBe('FAIL');
      expect(report.quality_gate.blockers.length).toBeGreaterThan(0);
      expect(report.quality_gate.reasoning).toContain('failed');
    });

    it('maps error-severity rule errors to critical blockers', async () => {
      setupMissingFilesScenario();
      const report = await runQA('0008', { noAi: true, silent: true, force: true });

      for (const blocker of report.quality_gate.blockers) {
        expect(blocker.severity).toBe('critical');
        expect(blocker.type).toBe('rule_based');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Token usage and cost
  // -------------------------------------------------------------------------
  describe('token usage and cost', () => {
    it('sets token_usage to 0 when AI is skipped', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.token_usage).toBe(0);
    });

    it('sets cost_usd to 0 when AI is skipped', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { noAi: true, silent: true });
      expect(report.cost_usd).toBe(0);
    });

    it('estimates 2500 tokens for AI assessment (stub)', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });
      expect(report.token_usage).toBe(2500);
    });

    it('calculates correct cost for 2500 tokens', async () => {
      setupPassingScenario();
      const report = await runQA('0008', { silent: true });
      // input: 2000 -> $0.0005; output: 500 -> $0.000625; total: $0.001125
      expect(report.cost_usd).toBeCloseTo(0.001125, 6);
    });
  });

  // -------------------------------------------------------------------------
  // Display report - next steps messaging
  // -------------------------------------------------------------------------
  describe('display report - next steps', () => {
    it('shows "Fix blockers" next step when blockers exist', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{ type: 'x', severity: 'critical', title: 'b', description: 'd' }],
        concerns: [],
        recommendations: [],
        reasoning: 'Fail.',
      });

      await runQA('0008', {});

      const yellowCalls = mockChalkYellow.mock.calls.map((c: string[]) => String(c[0]));
      const hasFixBlockers = yellowCalls.some(s => s.includes('Fix blockers'));
      expect(hasFixBlockers).toBe(true);
    });

    it('shows "exported to tasks.md" when blockers exist and export is true', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{ type: 'x', severity: 'critical', title: 'b', description: 'd' }],
        concerns: [],
        recommendations: [],
        reasoning: 'Fail.',
      });

      // Need export path tasks.md to exist
      mockExistsSync.mockImplementation((p: string) => {
        if (p === INCREMENTS_DIR) return true;
        if (p.includes(INCREMENT_DIR_NAME)) return true;
        if (p.endsWith('tasks.md')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue('# tasks\n');

      await runQA('0008', { export: true });

      const yellowCalls = mockChalkYellow.mock.calls.map((c: string[]) => String(c[0]));
      const hasExportNote = yellowCalls.some(s => s.includes('exported to tasks.md'));
      expect(hasExportNote).toBe(true);
    });

    it('shows "Address concerns" when only concerns exist (no blockers)', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'CONCERNS',
        blockers: [],
        concerns: [{ type: 'x', severity: 'high', title: 'c', description: 'd' }],
        recommendations: [],
        reasoning: 'Concerns.',
      });

      await runQA('0008', {});

      const cyanCalls = mockChalkCyan.mock.calls.map((c: string[]) => String(c[0]));
      const hasConcernsMsg = cyanCalls.some(s => s.includes('Address concerns'));
      expect(hasConcernsMsg).toBe(true);
    });

    it('shows "Ready to proceed" when no blockers or concerns', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'PASS',
        blockers: [],
        concerns: [],
        recommendations: [],
        reasoning: 'All good.',
      });

      await runQA('0008', {});

      const greenCalls = mockChalkGreen.mock.calls.map((c: string[]) => String(c[0]));
      const hasReady = greenCalls.some(s => s.includes('Ready to proceed'));
      expect(hasReady).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Display report - summary section
  // -------------------------------------------------------------------------
  describe('display report - summary section', () => {
    it('displays duration in summary', async () => {
      setupPassingScenario();
      await runQA('0008', { noAi: true });

      const grayCalls = mockChalkGray.mock.calls.map((c: string[]) => String(c[0]));
      const hasDuration = grayCalls.some(s => s.includes('Duration:'));
      expect(hasDuration).toBe(true);
    });

    it('displays token count in summary when AI was run', async () => {
      setupPassingScenario();
      await runQA('0008', {});

      const grayCalls = mockChalkGray.mock.calls.map((c: string[]) => String(c[0]));
      const hasTokens = grayCalls.some(s => s.includes('Tokens:'));
      expect(hasTokens).toBe(true);
    });

    it('displays cost in summary when AI was run', async () => {
      setupPassingScenario();
      await runQA('0008', {});

      const grayCalls = mockChalkGray.mock.calls.map((c: string[]) => String(c[0]));
      const hasCost = grayCalls.some(s => s.includes('Cost:'));
      expect(hasCost).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Display report - blockers/concerns with mitigation and location
  // -------------------------------------------------------------------------
  describe('display report - issue details', () => {
    it('displays mitigation for blockers that have it', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{
          type: 'risk',
          severity: 'critical',
          title: 'Issue',
          description: 'Desc',
          mitigation: 'Apply the fix',
          location: 'spec.md',
        }],
        concerns: [],
        recommendations: [],
        reasoning: 'Fail.',
      });

      await runQA('0008', {});

      const yellowCalls = mockChalkYellow.mock.calls.map((c: string[]) => String(c[0]));
      const hasMitigation = yellowCalls.some(s => s.includes('Apply the fix'));
      expect(hasMitigation).toBe(true);
    });

    it('displays location for blockers that have it', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'FAIL',
        blockers: [{
          type: 'risk',
          severity: 'critical',
          title: 'Issue',
          description: 'Desc',
          location: 'spec.md',
        }],
        concerns: [],
        recommendations: [],
        reasoning: 'Fail.',
      });

      await runQA('0008', {});

      const grayCalls = mockChalkGray.mock.calls.map((c: string[]) => String(c[0]));
      const hasLocation = grayCalls.some(s => s.includes('spec.md'));
      expect(hasLocation).toBe(true);
    });

    it('displays mitigation for concerns that have it', async () => {
      setupPassingScenario();
      mockDecideInstance.decide.mockReturnValueOnce({
        decision: 'CONCERNS',
        blockers: [],
        concerns: [{
          type: 'spec_quality',
          severity: 'high',
          title: 'Concern',
          description: 'Desc',
          mitigation: 'Improve quality',
          location: 'plan.md',
        }],
        recommendations: [],
        reasoning: 'Concerns.',
      });

      await runQA('0008', {});

      const cyanCalls = mockChalkCyan.mock.calls.map((c: string[]) => String(c[0]));
      const hasMitigation = cyanCalls.some(s => s.includes('Improve quality'));
      expect(hasMitigation).toBe(true);
    });
  });
});
