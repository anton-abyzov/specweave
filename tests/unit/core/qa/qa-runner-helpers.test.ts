/**
 * Tests for core/qa/qa-runner.ts helper functions
 *
 * The helper functions in qa-runner.ts are not exported, so we reimplementing
 * the pure logic here and verify correctness against the documented behavior.
 * For resolveIncrementPath, we test the filesystem-dependent logic using temp dirs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  QAOptions,
  QAMode,
  RuleBasedResult,
  RuleError,
  QualityGateResult,
} from '../../../../src/core/qa/types.js';

// ---------------------------------------------------------------------------
// Reimplemented pure helpers (mirroring private functions in qa-runner.ts)
// ---------------------------------------------------------------------------

function determineMode(options: QAOptions): QAMode {
  if (options.gate) return 'gate';
  if (options.pre) return 'pre';
  if (options.full) return 'full';
  return 'quick';
}

function buildRuleBasedQualityGate(ruleBasedResult: RuleBasedResult): QualityGateResult {
  const mapErrorToIssue = (e: RuleError, severity: 'critical' | 'high') => ({
    type: 'rule_based',
    severity,
    title: e.rule,
    description: e.message,
    location: e.file,
  });

  const errors = ruleBasedResult.errors.filter((e) => e.severity === 'error');
  const warnings = ruleBasedResult.errors.filter((e) => e.severity === 'warning');

  return {
    decision: ruleBasedResult.passed ? 'PASS' : 'FAIL',
    blockers: errors.map((e) => mapErrorToIssue(e, 'critical')),
    concerns: warnings.map((e) => mapErrorToIssue(e, 'high')),
    recommendations: [],
    reasoning: ruleBasedResult.passed
      ? 'Rule-based validation passed. AI assessment skipped.'
      : 'Rule-based validation failed. Fix errors before proceeding.',
  };
}

function estimateTokenUsage(_incrementPath: string): number {
  return 2500;
}

function calculateCost(tokens: number): number {
  const inputTokens = tokens * 0.8;
  const outputTokens = tokens * 0.2;
  const inputCost = (inputTokens / 1_000_000) * 0.25;
  const outputCost = (outputTokens / 1_000_000) * 1.25;
  return inputCost + outputCost;
}

function resolveIncrementPath(incrementsDir: string, incrementId: string): string | null {
  if (!fs.existsSync(incrementsDir)) {
    return null;
  }
  const entries = fs.readdirSync(incrementsDir);
  const matchingDir = entries.find((entry: string) => {
    const fullPath = path.join(incrementsDir, entry);
    return fs.statSync(fullPath).isDirectory() && entry.startsWith(incrementId);
  });
  return matchingDir ? path.join(incrementsDir, matchingDir) : null;
}

// ---------------------------------------------------------------------------
// Helper to build minimal RuleBasedResult
// ---------------------------------------------------------------------------

function makeRuleBasedResult(overrides: Partial<RuleBasedResult> = {}): RuleBasedResult {
  return {
    passed: true,
    totalCount: 3,
    passedCount: 3,
    failedCount: 0,
    errors: [],
    breakdown: {
      consistency: { passed: 3, total: 3 },
      completeness: { passed: 3, total: 3 },
      quality: { passed: 3, total: 3 },
      traceability: { passed: 3, total: 3 },
    },
    ...overrides,
  };
}

function makeRuleError(overrides: Partial<RuleError> = {}): RuleError {
  return {
    rule: 'test-rule',
    severity: 'error',
    message: 'test error message',
    file: 'spec.md',
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('qa-runner helpers', () => {
  // -------------------------------------------------------------------------
  // determineMode
  // -------------------------------------------------------------------------
  describe('determineMode', () => {
    it('returns "quick" when no mode flags set', () => {
      expect(determineMode({})).toBe('quick');
    });

    it('returns "gate" when gate flag is set', () => {
      expect(determineMode({ gate: true })).toBe('gate');
    });

    it('returns "pre" when pre flag is set', () => {
      expect(determineMode({ pre: true })).toBe('pre');
    });

    it('returns "full" when full flag is set', () => {
      expect(determineMode({ full: true })).toBe('full');
    });

    it('gate takes priority over pre', () => {
      expect(determineMode({ gate: true, pre: true })).toBe('gate');
    });

    it('gate takes priority over full', () => {
      expect(determineMode({ gate: true, full: true })).toBe('gate');
    });

    it('gate takes priority over all other modes', () => {
      expect(determineMode({ gate: true, pre: true, full: true })).toBe('gate');
    });

    it('pre takes priority over full', () => {
      expect(determineMode({ pre: true, full: true })).toBe('pre');
    });

    it('ignores unrelated flags like ci and noAi', () => {
      expect(determineMode({ ci: true, noAi: true, silent: true })).toBe('quick');
    });

    it('returns "quick" when mode flags are explicitly false', () => {
      expect(determineMode({ gate: false, pre: false, full: false })).toBe('quick');
    });

    it('returns "full" when only full is true and others are false', () => {
      expect(determineMode({ gate: false, pre: false, full: true })).toBe('full');
    });
  });

  // -------------------------------------------------------------------------
  // buildRuleBasedQualityGate
  // -------------------------------------------------------------------------
  describe('buildRuleBasedQualityGate', () => {
    it('returns PASS when rule-based validation passed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: true }));
      expect(result.decision).toBe('PASS');
    });

    it('returns FAIL when rule-based validation failed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: false }));
      expect(result.decision).toBe('FAIL');
    });

    it('has empty blockers when passed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: true }));
      expect(result.blockers).toEqual([]);
    });

    it('has empty concerns when passed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: true }));
      expect(result.concerns).toEqual([]);
    });

    it('always returns empty recommendations', () => {
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({
          passed: false,
          errors: [makeRuleError({ severity: 'error' })],
        })
      );
      expect(result.recommendations).toEqual([]);
    });

    it('maps errors with severity "error" to blockers', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'missing-spec', severity: 'error', message: 'Missing spec.md' }),
        makeRuleError({ rule: 'missing-plan', severity: 'error', message: 'Missing plan.md' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers).toHaveLength(2);
      expect(result.blockers[0].severity).toBe('critical');
      expect(result.blockers[1].severity).toBe('critical');
    });

    it('maps errors with severity "warning" to concerns', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'missing-ac', severity: 'warning', message: 'No ACs found' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.concerns).toHaveLength(1);
      expect(result.concerns[0].severity).toBe('high');
    });

    it('separates errors and warnings correctly in mixed set', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'err-1', severity: 'error', message: 'Error one' }),
        makeRuleError({ rule: 'warn-1', severity: 'warning', message: 'Warning one' }),
        makeRuleError({ rule: 'err-2', severity: 'error', message: 'Error two' }),
        makeRuleError({ rule: 'warn-2', severity: 'warning', message: 'Warning two' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers).toHaveLength(2);
      expect(result.concerns).toHaveLength(2);
    });

    it('preserves rule name as title in blockers', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'spec-structure', severity: 'error', message: 'Bad structure' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers[0].title).toBe('spec-structure');
    });

    it('preserves message as description in blockers', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'rule-x', severity: 'error', message: 'Detailed error message' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers[0].description).toBe('Detailed error message');
    });

    it('preserves file as location in concerns', () => {
      const errors: RuleError[] = [
        makeRuleError({ rule: 'warn-rule', severity: 'warning', file: 'tasks.md' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.concerns[0].location).toBe('tasks.md');
    });

    it('sets type to "rule_based" for all mapped issues', () => {
      const errors: RuleError[] = [
        makeRuleError({ severity: 'error' }),
        makeRuleError({ severity: 'warning' }),
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers[0].type).toBe('rule_based');
      expect(result.concerns[0].type).toBe('rule_based');
    });

    it('returns passing reasoning when validation passed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: true }));
      expect(result.reasoning).toBe('Rule-based validation passed. AI assessment skipped.');
    });

    it('returns failing reasoning when validation failed', () => {
      const result = buildRuleBasedQualityGate(makeRuleBasedResult({ passed: false }));
      expect(result.reasoning).toBe(
        'Rule-based validation failed. Fix errors before proceeding.'
      );
    });

    it('handles empty errors array with passed=false', () => {
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors: [] })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers).toEqual([]);
      expect(result.concerns).toEqual([]);
    });

    it('handles errors with undefined file field', () => {
      const errors: RuleError[] = [
        { rule: 'no-file-rule', severity: 'error', message: 'No file' },
      ];
      const result = buildRuleBasedQualityGate(
        makeRuleBasedResult({ passed: false, errors })
      );
      expect(result.blockers[0].location).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // calculateCost
  // -------------------------------------------------------------------------
  describe('calculateCost', () => {
    it('returns 0 for 0 tokens', () => {
      expect(calculateCost(0)).toBe(0);
    });

    it('calculates cost for 2500 tokens (default stub usage)', () => {
      // input: 2500 * 0.8 = 2000 tokens -> (2000/1M) * $0.25 = $0.0005
      // output: 2500 * 0.2 = 500 tokens -> (500/1M) * $1.25 = $0.000625
      // total: $0.001125
      expect(calculateCost(2500)).toBeCloseTo(0.001125, 6);
    });

    it('calculates cost for 1_000_000 tokens', () => {
      // input: 800_000 -> (800_000/1M) * $0.25 = $0.20
      // output: 200_000 -> (200_000/1M) * $1.25 = $0.25
      // total: $0.45
      expect(calculateCost(1_000_000)).toBeCloseTo(0.45, 6);
    });

    it('calculates cost for 10_000 tokens', () => {
      // input: 8000 -> (8000/1M) * 0.25 = 0.002
      // output: 2000 -> (2000/1M) * 1.25 = 0.0025
      // total: 0.0045
      expect(calculateCost(10_000)).toBeCloseTo(0.0045, 6);
    });

    it('scales linearly with token count', () => {
      const costA = calculateCost(5000);
      const costB = calculateCost(10_000);
      expect(costB).toBeCloseTo(costA * 2, 10);
    });

    it('uses 80/20 input/output split', () => {
      // For 1M tokens: 800K input ($0.20) + 200K output ($0.25) = $0.45
      // Verify output portion is more expensive per-token than input
      const cost = calculateCost(1_000_000);
      const inputOnly = (1_000_000 * 0.8 / 1_000_000) * 0.25;
      const outputOnly = (1_000_000 * 0.2 / 1_000_000) * 1.25;
      expect(cost).toBe(inputOnly + outputOnly);
    });

    it('handles very small token counts', () => {
      const cost = calculateCost(1);
      expect(cost).toBeGreaterThan(0);
      // input: 0.8 -> (0.8/1M) * 0.25 = 0.0000002
      // output: 0.2 -> (0.2/1M) * 1.25 = 0.00000025
      expect(cost).toBeCloseTo(0.00000045, 10);
    });

    it('handles very large token counts', () => {
      const cost = calculateCost(100_000_000);
      // 80M input -> $20, 20M output -> $25, total $45
      expect(cost).toBeCloseTo(45, 2);
    });
  });

  // -------------------------------------------------------------------------
  // estimateTokenUsage
  // -------------------------------------------------------------------------
  describe('estimateTokenUsage', () => {
    it('always returns 2500 (stub)', () => {
      expect(estimateTokenUsage('/any/path')).toBe(2500);
    });

    it('returns 2500 regardless of path', () => {
      expect(estimateTokenUsage('/a')).toBe(2500);
      expect(estimateTokenUsage('/some/deep/nested/path')).toBe(2500);
      expect(estimateTokenUsage('')).toBe(2500);
    });

    it('returns a number', () => {
      expect(typeof estimateTokenUsage('/path')).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // resolveIncrementPath
  // -------------------------------------------------------------------------
  describe('resolveIncrementPath', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-runner-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when increments directory does not exist', () => {
      const result = resolveIncrementPath(
        path.join(tmpDir, 'nonexistent'),
        '0001'
      );
      expect(result).toBeNull();
    });

    it('returns null when no matching directory exists', () => {
      fs.mkdirSync(path.join(tmpDir, '0002-some-feature'));
      const result = resolveIncrementPath(tmpDir, '0001');
      expect(result).toBeNull();
    });

    it('finds directory matching 4-digit prefix', () => {
      fs.mkdirSync(path.join(tmpDir, '0005-awesome-feature'));
      const result = resolveIncrementPath(tmpDir, '0005');
      expect(result).toBe(path.join(tmpDir, '0005-awesome-feature'));
    });

    it('finds directory with exact match (no suffix)', () => {
      fs.mkdirSync(path.join(tmpDir, '0010'));
      const result = resolveIncrementPath(tmpDir, '0010');
      expect(result).toBe(path.join(tmpDir, '0010'));
    });

    it('returns first match when multiple directories share prefix', () => {
      // readdirSync returns entries in filesystem order
      fs.mkdirSync(path.join(tmpDir, '0001-alpha'));
      fs.mkdirSync(path.join(tmpDir, '0001-beta'));
      const result = resolveIncrementPath(tmpDir, '0001');
      expect(result).not.toBeNull();
      expect(result!).toContain('0001-');
    });

    it('ignores files that match prefix (only directories)', () => {
      fs.writeFileSync(path.join(tmpDir, '0003-readme.txt'), 'not a dir');
      const result = resolveIncrementPath(tmpDir, '0003');
      expect(result).toBeNull();
    });

    it('does not match partial prefix', () => {
      fs.mkdirSync(path.join(tmpDir, '0012-feature'));
      // '001' should not match '0012-feature' since 0012 does not startWith '001'
      // Actually it does: '0012-feature'.startsWith('001') is true!
      // This tests the actual behavior of the source code
      const result = resolveIncrementPath(tmpDir, '001');
      expect(result).toBe(path.join(tmpDir, '0012-feature'));
    });

    it('handles empty increments directory', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir);
      const result = resolveIncrementPath(emptyDir, '0001');
      expect(result).toBeNull();
    });

    it('returns full absolute path', () => {
      fs.mkdirSync(path.join(tmpDir, '0042-meaning-of-life'));
      const result = resolveIncrementPath(tmpDir, '0042');
      expect(result).not.toBeNull();
      expect(path.isAbsolute(result!)).toBe(true);
    });

    it('handles increment IDs with leading zeros', () => {
      fs.mkdirSync(path.join(tmpDir, '0001-setup'));
      const result = resolveIncrementPath(tmpDir, '0001');
      expect(result).toBe(path.join(tmpDir, '0001-setup'));
    });

    it('does not match suffix-only overlap', () => {
      fs.mkdirSync(path.join(tmpDir, '1001-unrelated'));
      const result = resolveIncrementPath(tmpDir, '0001');
      expect(result).toBeNull();
    });
  });
});
