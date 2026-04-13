/**
 * Rubric Quality Contracts — Type Definitions
 *
 * A rubric is a per-increment quality contract that defines pass/fail criteria
 * for closure gates. Auto-generated from spec.md ACs, customizable by the user.
 */

/** Two severity levels only — blocking must pass, advisory is informational */
export type RubricSeverity = 'blocking' | 'advisory';

/** Gate that evaluates this criterion */
export type EvaluatorId =
  | 'sw:grill'
  | 'sw:code-reviewer'
  | 'sw:judge-llm'
  | 'coverage'
  | 'manual';

/** Standard rubric categories */
export type RubricCategory =
  | 'functional-correctness'
  | 'test-coverage'
  | 'code-quality'
  | 'security'
  | 'performance'
  | 'documentation'
  | 'independent-evaluation';

/** Result of evaluating a single criterion */
export interface CriterionResult {
  status: 'pass' | 'fail' | 'skip';
  evidence: string;
  evaluatedAt: string;
}

/** A single rubric criterion */
export interface RubricCriterion {
  id: string;
  title: string;
  severity: RubricSeverity;
  sourceACs: string[];
  evaluator: EvaluatorId;
  category: RubricCategory;
  verify: string;
  threshold: string;
  result: CriterionResult | null;
}

/** Parsed rubric document */
export interface RubricDocument {
  incrementId: string;
  title: string;
  generated: string;
  source: string;
  version: string;
  status: string;
  criteria: RubricCriterion[];
}

/** A single layer in the three-tier inheritance chain */
export interface RubricLayer {
  path: string;
  criteria: RubricCriterion[];
}

/** Error thrown when rubric markdown is malformed */
export class RubricParseError extends Error {
  constructor(
    message: string,
    public readonly lineNumber: number,
    public readonly rawLine: string,
  ) {
    super(`Rubric parse error at line ${lineNumber}: ${message}`);
    this.name = 'RubricParseError';
  }
}

/**
 * Summary of rubric evaluation results.
 *
 * For blocking criteria: `failed` = explicit fail status, `unevaluated` = skip or null (pending).
 * Both `failed > 0` and `unevaluated > 0` produce verdict FAIL.
 * For advisory criteria: only explicit fail counts, skip/null are ignored.
 */
export interface RubricSummary {
  total: number;
  blocking: { total: number; passed: number; failed: number; unevaluated: number };
  advisory: { total: number; passed: number; failed: number };
  verdict: 'PASS' | 'FAIL';
}
