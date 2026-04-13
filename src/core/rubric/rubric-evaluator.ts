import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type {
  RubricDocument,
  RubricCriterion,
  CriterionResult,
  RubricSummary,
} from './types.js';

interface EvaluateOptions {
  grillReport?: string;
  codeReviewReport?: string;
  judgeLlmReport?: string;
}

async function loadReport(reportsDir: string, filename: string): Promise<any> {
  const filePath = path.join(reportsDir, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function evaluateGrill(
  criterion: RubricCriterion,
  report: any,
): CriterionResult {
  const now = new Date().toISOString();

  // Check AC compliance if criterion has actual AC references (not 'project-default' etc.)
  const realACs = criterion.sourceACs.filter(s => s.startsWith('AC-'));
  if (realACs.length > 0 && Array.isArray(report.acCompliance?.results)) {
    const failedACs: string[] = [];
    for (const acId of realACs) {
      const acResult = report.acCompliance.results.find(
        (r: any) => r.acId === acId,
      );
      if (!acResult || acResult.status !== 'pass') {
        failedACs.push(acId);
      }
    }
    if (failedACs.length > 0) {
      return {
        status: 'fail',
        evidence: `${failedACs.join(', ')} failed in grill report`,
        evaluatedAt: now,
      };
    }
    return { status: 'pass', evidence: 'All AC references passed', evaluatedAt: now };
  }

  // Check ship readiness for non-AC criteria
  if (report.shipReadiness === 'NOT READY') {
    return { status: 'fail', evidence: 'shipReadiness is NOT READY', evaluatedAt: now };
  }
  return { status: 'pass', evidence: `shipReadiness: ${report.shipReadiness}`, evaluatedAt: now };
}

function evaluateCodeReviewer(report: any): CriterionResult {
  const now = new Date().toISOString();
  const { critical = 0, high = 0, medium = 0 } = report.summary || {};
  const blocking = critical + high + medium;

  if (blocking > 0) {
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (high > 0) parts.push(`${high} high`);
    if (medium > 0) parts.push(`${medium} medium`);
    return { status: 'fail', evidence: parts.join(', ') + ' findings', evaluatedAt: now };
  }
  return { status: 'pass', evidence: 'No blocking findings', evaluatedAt: now };
}

function evaluateJudgeLlm(report: any): CriterionResult {
  const now = new Date().toISOString();
  if (report.verdict === 'REJECTED') {
    return { status: 'fail', evidence: `verdict: REJECTED`, evaluatedAt: now };
  }
  return { status: 'pass', evidence: `verdict: ${report.verdict}`, evaluatedAt: now };
}

/**
 * Evaluate all criteria in a rubric document against gate reports.
 * Returns a NEW RubricDocument with updated results (immutable).
 */
export async function evaluateRubric(
  rubric: RubricDocument,
  reportsDir: string,
  options: EvaluateOptions = {},
): Promise<RubricDocument> {
  const grillFile = options.grillReport ?? 'grill-report.json';
  const codeReviewFile = options.codeReviewReport ?? 'code-review-report.json';
  const judgeLlmFile = options.judgeLlmReport ?? 'judge-llm-report.json';

  // Cache loaded reports to avoid re-reading the same file per criterion
  const reportCache = new Map<string, any>();
  async function cachedLoadReport(filename: string): Promise<any> {
    if (reportCache.has(filename)) return reportCache.get(filename);
    const report = await loadReport(reportsDir, filename);
    reportCache.set(filename, report);
    return report;
  }

  const evaluatedCriteria: RubricCriterion[] = [];

  for (const criterion of rubric.criteria) {
    let result: CriterionResult;

    try {
      switch (criterion.evaluator) {
        case 'sw:grill': {
          const report = await cachedLoadReport(grillFile);
          result = evaluateGrill(criterion, report);
          break;
        }
        case 'sw:code-reviewer': {
          const report = await cachedLoadReport(codeReviewFile);
          result = evaluateCodeReviewer(report);
          break;
        }
        case 'sw:judge-llm': {
          const report = await cachedLoadReport(judgeLlmFile);
          result = evaluateJudgeLlm(report);
          break;
        }
        case 'coverage':
        case 'manual':
        default:
          result = { status: 'skip', evidence: `evaluator ${criterion.evaluator} not automated`, evaluatedAt: new Date().toISOString() };
          break;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = { status: 'skip', evidence: `Gate report unavailable: ${reason}`, evaluatedAt: new Date().toISOString() };
    }

    evaluatedCriteria.push({ ...criterion, result });
  }

  return { ...rubric, criteria: evaluatedCriteria };
}

/**
 * Summarize rubric evaluation results.
 */
export function summarizeResults(rubric: RubricDocument): RubricSummary {
  let blockingTotal = 0, blockingPassed = 0, blockingFailed = 0, blockingUnevaluated = 0;
  let advisoryTotal = 0, advisoryPassed = 0, advisoryFailed = 0;

  for (const c of rubric.criteria) {
    if (c.severity === 'blocking') {
      blockingTotal++;
      if (c.result?.status === 'pass') blockingPassed++;
      else if (c.result?.status === 'fail') blockingFailed++;
      else blockingUnevaluated++; // skip or null (pending) — distinct from explicit fail
    } else {
      advisoryTotal++;
      if (c.result?.status === 'pass') advisoryPassed++;
      else if (c.result?.status === 'fail') advisoryFailed++;
    }
  }

  return {
    total: rubric.criteria.length,
    blocking: { total: blockingTotal, passed: blockingPassed, failed: blockingFailed, unevaluated: blockingUnevaluated },
    advisory: { total: advisoryTotal, passed: advisoryPassed, failed: advisoryFailed },
    verdict: (blockingFailed > 0 || blockingUnevaluated > 0) ? 'FAIL' : 'PASS',
  };
}
