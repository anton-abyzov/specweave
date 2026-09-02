import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { evaluateRubric, summarizeResults } from '../../../../src/core/rubric/rubric-evaluator.js';
import type { RubricDocument, RubricCriterion } from '../../../../src/core/rubric/types.js';

const REPORTS_DIR = path.resolve(__dirname, 'fixtures/reports');
const REPORTS_FAIL_DIR = path.resolve(__dirname, 'fixtures/reports'); // same dir, different filenames used in tests

function makeCriterion(overrides: Partial<RubricCriterion>): RubricCriterion {
  return {
    id: 'R-001',
    title: 'Test',
    severity: 'blocking',
    sourceACs: [],
    evaluator: 'sw:grill',
    category: 'functional-correctness',
    verify: '',
    threshold: '',
    result: null,
    ...overrides,
  };
}

function makeDoc(criteria: RubricCriterion[]): RubricDocument {
  return {
    incrementId: 'test',
    title: 'Test',
    generated: '',
    source: 'test',
    version: '1.0',
    status: 'pending',
    criteria,
  };
}

describe('evaluateRubric', () => {
  it('TC-001: grill evaluator — all AC references pass', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['AC-US1-01'] }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    expect(result.criteria[0].result).not.toBeNull();
    expect(result.criteria[0].result!.status).toBe('pass');
  });

  it('TC-002: grill evaluator — any AC reference fails → criterion fails', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['AC-US1-01', 'AC-US1-02'] }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR, { grillReport: 'grill-report-fail.json' });
    expect(result.criteria[0].result!.status).toBe('fail');
    expect(result.criteria[0].result!.evidence).toContain('AC-US1-02');
  });

  it('TC-003: code-reviewer evaluator — zero critical+high+medium → pass', async () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-D02', evaluator: 'sw:code-reviewer' }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    expect(result.criteria[0].result!.status).toBe('pass');
  });

  it('TC-004: code-reviewer evaluator — critical findings → fail', async () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-D02', evaluator: 'sw:code-reviewer' }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR, { codeReviewReport: 'code-review-report-critical.json' });
    expect(result.criteria[0].result!.status).toBe('fail');
    expect(result.criteria[0].result!.evidence).toContain('2 critical');
  });

  it('TC-003b: review evaluator — only low findings → pass', async () => {
    const doc = makeDoc([makeCriterion({ id: 'R-D02', evaluator: 'sw:review' })]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    expect(result.criteria[0].result!.status).toBe('pass');
  });

  it('TC-003c: review evaluator — critical/high findings → fail with counts', async () => {
    const doc = makeDoc([makeCriterion({ id: 'R-D02', evaluator: 'sw:review' })]);
    const result = await evaluateRubric(doc, REPORTS_DIR, { reviewReport: 'review-blocking.json' });
    expect(result.criteria[0].result!.status).toBe('fail');
    expect(result.criteria[0].result!.evidence).toContain('1 critical');
    expect(result.criteria[0].result!.evidence).toContain('1 high');
  });

  it('TC-003d: review evaluator — missing review.json → skip, never a silent pass', async () => {
    const doc = makeDoc([makeCriterion({ id: 'R-D02', evaluator: 'sw:review' })]);
    const result = await evaluateRubric(doc, REPORTS_DIR, { reviewReport: 'review-absent.json' });
    expect(result.criteria[0].result!.status).toBe('skip');
  });

  it('TC-005: judge-llm evaluator — APPROVED verdict → pass', async () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-D04', evaluator: 'sw:judge-llm' }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    expect(result.criteria[0].result!.status).toBe('pass');
  });

  it('TC-006: judge-llm evaluator — REJECTED verdict → fail', async () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-D04', evaluator: 'sw:judge-llm' }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR, { judgeLlmReport: 'judge-llm-report-rejected.json' });
    expect(result.criteria[0].result!.status).toBe('fail');
  });

  it('TC-007: missing gate report → criterion result is skip', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['AC-US1-01'] }),
    ]);
    const result = await evaluateRubric(doc, '/nonexistent/reports');
    expect(result.criteria[0].result!.status).toBe('skip');
  });

  it('TC-007b: grill evaluator — sourceACs=["project-default"] falls through to shipReadiness check', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['project-default'] }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    // 'project-default' is not an AC-ID, so evaluateGrill should check shipReadiness instead
    expect(result.criteria[0].result!.status).toBe('pass');
    expect(result.criteria[0].result!.evidence).toContain('shipReadiness');
  });

  it('TC-007c: grill evaluator — mixed AC + non-AC sourceACs only checks real ACs', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['AC-US1-01', 'project-default'] }),
    ]);
    const result = await evaluateRubric(doc, REPORTS_DIR);
    // Only AC-US1-01 is checked against grill report; 'project-default' is ignored
    expect(result.criteria[0].result!.status).toBe('pass');
    expect(result.criteria[0].result!.evidence).toContain('All AC references passed');
  });

  it('TC-008: malformed gate report → criterion result is skip', async () => {
    const doc = makeDoc([
      makeCriterion({ evaluator: 'sw:grill', sourceACs: ['AC-US1-01'] }),
    ]);
    // Use a directory as the "report" path — will fail JSON.parse
    const result = await evaluateRubric(doc, __dirname, { grillReport: 'fixtures' });
    expect(result.criteria[0].result!.status).toBe('skip');
  });
});

describe('summarizeResults', () => {
  it('TC-009: returns correct counts', () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-001', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-002', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-003', severity: 'blocking', result: { status: 'fail', evidence: 'x', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-004', severity: 'advisory', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-005', severity: 'advisory', result: { status: 'fail', evidence: 'y', evaluatedAt: '' } }),
    ]);
    const summary = summarizeResults(doc);
    expect(summary.total).toBe(5);
    expect(summary.blocking).toEqual({ total: 3, passed: 2, failed: 1, unevaluated: 0 });
    expect(summary.advisory).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(summary.verdict).toBe('FAIL');
  });

  it('TC-010: FAIL verdict when any blocking criterion fails', () => {
    const doc = makeDoc([
      makeCriterion({ severity: 'blocking', result: { status: 'fail', evidence: '', evaluatedAt: '' } }),
    ]);
    expect(summarizeResults(doc).verdict).toBe('FAIL');
  });

  it('TC-011: PASS verdict only when all blocking criteria pass', () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-001', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-002', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-003', severity: 'advisory', result: { status: 'fail', evidence: '', evaluatedAt: '' } }),
    ]);
    expect(summarizeResults(doc).verdict).toBe('PASS');
  });

  it('TC-012: skip status counts as unevaluated (not failed) for blocking criteria', () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-001', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-002', severity: 'blocking', result: { status: 'skip', evidence: 'report missing', evaluatedAt: '' } }),
    ]);
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('FAIL');
    expect(summary.blocking.failed).toBe(0);
    expect(summary.blocking.unevaluated).toBe(1);
    expect(summary.blocking.passed).toBe(1);
  });

  it('TC-013: null result counts as unevaluated (not failed) for blocking criteria', () => {
    const doc = makeDoc([
      makeCriterion({ id: 'R-001', severity: 'blocking', result: { status: 'pass', evidence: '', evaluatedAt: '' } }),
      makeCriterion({ id: 'R-002', severity: 'blocking', result: null }),
    ]);
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('FAIL');
    expect(summary.blocking.failed).toBe(0);
    expect(summary.blocking.unevaluated).toBe(1);
  });
});
