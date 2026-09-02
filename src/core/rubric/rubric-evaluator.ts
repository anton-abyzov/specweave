import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type {
  RubricDocument,
  RubricCriterion,
  CriterionResult,
  RubricSummary,
} from './types.js';
import { emitRefinementIfAttributable } from '../skill-signal-emit.js';
import type { SignalSeverity } from '../../types/skill-signals.js';

/** Default bound for a `command` criterion probe (ms). */
export const DEFAULT_COMMAND_TIMEOUT_MS = 60000;

/** Max bytes of stdout/stderr captured into a command criterion's evidence. */
const COMMAND_EVIDENCE_MAX_BYTES = 2048;

/**
 * Credential-like env var names stripped before running a `command` probe.
 * Keywords match only as whole `_`-delimited segments (or the full name) — so
 * `AZURE_DEVOPS_PAT` / `GITHUB_TOKEN` are stripped but `PATH` is NOT (the bare
 * substring `PAT` inside `PATH` must never trigger removal, or every probe loses
 * its executable lookup path and dies with `exit 127: command not found`).
 */
const CREDENTIAL_ENV_PATTERN = /(^|_)(PAT|TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|PRIVATE_KEY|CREDENTIAL|ACCESS_KEY)($|_)/i;

/** Env vars always preserved for the probe shell, regardless of name match. */
const ESSENTIAL_ENV_KEYS = new Set([
  'PATH', 'HOME', 'SHELL', 'USER', 'LOGNAME', 'TMPDIR', 'TMP', 'TEMP',
  'LANG', 'LC_ALL', 'PWD', 'NODE_PATH', 'NVM_DIR',
]);

export interface CommandEvalOptions {
  /** Working directory the probe runs in (repo / increment root). */
  cwd: string;
  /** Bounded timeout in ms. Defaults to {@link DEFAULT_COMMAND_TIMEOUT_MS}. */
  timeoutMs?: number;
}

/** Keep only the last `maxBytes` of a string, prefixing an ellipsis on truncation. */
function tailTruncate(text: string, maxBytes: number): string {
  if (text.length <= maxBytes) return text;
  return '…' + text.slice(text.length - maxBytes);
}

/**
 * Build a child-process env with credential-like vars stripped. We never inject
 * tokens into a probe; a `command` criterion must be self-contained.
 */
function buildSanitizedEnv(): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!ESSENTIAL_ENV_KEYS.has(key) && CREDENTIAL_ENV_PATTERN.test(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

/**
 * Run a `command` criterion's `Verify` shell probe and map the exit code to a
 * pass/fail result. Exit 0 → pass; non-zero, timeout, or spawn error → fail.
 * NEVER returns `skip`. Evidence captures a truncated tail of stdout/stderr.
 *
 * The probe runs with `shell: true` in `options.cwd`, a bounded timeout, and an
 * env with credential-like variables stripped (no token injection).
 */
export function evaluateCommandCriterion(
  criterion: RubricCriterion,
  options: CommandEvalOptions,
): CriterionResult {
  const now = new Date().toISOString();
  const command = (criterion.verify ?? '').trim();
  const timeout = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

  if (!command) {
    return {
      status: 'fail',
      evidence: 'command criterion has no Verify probe',
      evaluatedAt: now,
    };
  }

  const proc = spawnSync(command, {
    cwd: options.cwd,
    shell: true,
    timeout,
    env: buildSanitizedEnv(),
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = proc.stdout ?? '';
  const stderr = proc.stderr ?? '';
  const combined = tailTruncate([stdout, stderr].filter(Boolean).join('\n').trim(), COMMAND_EVIDENCE_MAX_BYTES);

  // Node sets error.code === 'ETIMEDOUT' and signal === 'SIGTERM' on timeout.
  const timedOut =
    proc.error && (proc.error as NodeJS.ErrnoException).code === 'ETIMEDOUT';
  if (timedOut || proc.signal === 'SIGTERM') {
    return {
      status: 'fail',
      evidence: `command timed out after ${timeout}ms${combined ? `: ${combined}` : ''}`,
      evaluatedAt: now,
    };
  }

  if (proc.error) {
    return {
      status: 'fail',
      evidence: `command failed to run: ${proc.error.message}${combined ? ` | ${combined}` : ''}`,
      evaluatedAt: now,
    };
  }

  if (proc.status === 0) {
    return {
      status: 'pass',
      evidence: combined || 'exit 0',
      evaluatedAt: now,
    };
  }

  return {
    status: 'fail',
    evidence: `exit ${proc.status ?? 'unknown'}${combined ? `: ${combined}` : ''}`,
    evaluatedAt: now,
  };
}

interface EvaluateOptions {
  /** Filename of the sw:review report inside reportsDir. Defaults to `review.json`. */
  reviewReport?: string;
  grillReport?: string;
  codeReviewReport?: string;
  judgeLlmReport?: string;
  /**
   * 0671: enable refinement-signal emission. When `projectRoot` and
   * `incrementId` are provided, each failed criterion whose evidence cites a
   * specific skill triggers an append to `.specweave/state/skill-signals.json`.
   *
   * Both fields must be present; emission is silently skipped otherwise, so
   * existing call sites continue to work unchanged.
   */
  projectRoot?: string;
  incrementId?: string;
  /**
   * Optional skills directory for pattern-match attribution. Defaults to
   * `<projectRoot>/plugins/specweave/skills` when `projectRoot` is set.
   */
  skillsRoot?: string;
  /**
   * Working directory for `command`-evaluator probes. Defaults to
   * `projectRoot`, then `reportsDir`'s parent. The probe runs here.
   */
  commandCwd?: string;
  /** Bounded timeout (ms) for `command`-evaluator probes. */
  commandTimeoutMs?: number;
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

/**
 * Evaluate a `sw:review` criterion against reports/review.json
 * (`{ ok, findings: [{ severity, file, line, summary }] }`).
 *
 * Only critical and high findings block — that is the severity contract the review
 * skill documents. `ok` is honoured when present so a reviewer can fail a review for
 * a reason that is not expressible as a finding.
 */
function evaluateReview(report: any): CriterionResult {
  const now = new Date().toISOString();
  const findings: any[] = Array.isArray(report?.findings) ? report.findings : [];
  const count = (severity: string) =>
    findings.filter((f) => String(f?.severity ?? '').toLowerCase() === severity).length;
  const critical = count('critical');
  const high = count('high');

  if (critical + high > 0) {
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (high > 0) parts.push(`${high} high`);
    return { status: 'fail', evidence: parts.join(', ') + ' findings', evaluatedAt: now };
  }
  if (report?.ok === false) {
    return { status: 'fail', evidence: 'review reported ok: false', evaluatedAt: now };
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
  const reviewFile = options.reviewReport ?? 'review.json';
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
        case 'sw:review': {
          const report = await cachedLoadReport(reviewFile);
          result = evaluateReview(report);
          break;
        }
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
        case 'command': {
          const cwd =
            options.commandCwd ?? options.projectRoot ?? path.dirname(reportsDir);
          result = evaluateCommandCriterion(criterion, {
            cwd,
            timeoutMs: options.commandTimeoutMs,
          });
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
      // A `command` criterion must NEVER resolve to skip — any failure to run
      // its probe is a hard fail, not an unevaluated pass-through.
      const fallbackStatus = criterion.evaluator === 'command' ? 'fail' : 'skip';
      result = { status: fallbackStatus, evidence: `Gate report unavailable: ${reason}`, evaluatedAt: new Date().toISOString() };
    }

    evaluatedCriteria.push({ ...criterion, result });
  }

  // 0671 T-005: emit refinement signals for failed criteria whose rationale
  // traces to a specific skill's instructions. Best-effort — never throws.
  await maybeEmitRefinementSignals(evaluatedCriteria, options);

  return { ...rubric, criteria: evaluatedCriteria };
}

/**
 * Post-evaluation emission step. Iterates failed criteria, attributes each
 * failure to a skill via `attributeSkill`, and appends one refinement signal
 * per distinct attributed skill. Silent when the caller doesn't provide the
 * project/increment context (backward compatible).
 */
async function maybeEmitRefinementSignals(
  criteria: RubricCriterion[],
  options: EvaluateOptions,
): Promise<void> {
  if (!options.projectRoot || !options.incrementId) return;

  const projectRoot = options.projectRoot;
  const incrementId = options.incrementId;
  const skillsRoot = options.skillsRoot
    ?? path.join(projectRoot, 'plugins', 'specweave', 'skills');

  const { attributeSkill } = await import('../skill-attribution.js');

  // One signal per distinct attributed skill within a single rubric pass —
  // a rubric with 5 failed criteria all blaming the same skill should emit
  // one signal (at the highest observed severity), not five.
  const perSkill = new Map<
    string,
    { severity: SignalSeverity; evidence: string }
  >();

  for (const criterion of criteria) {
    if (criterion.result?.status !== 'fail') continue;

    const evidenceParts: string[] = [
      criterion.result.evidence ?? '',
      criterion.verify ?? '',
      criterion.threshold ?? '',
    ].filter((s) => s.length > 0);

    const evidenceText = evidenceParts.join(' | ');
    const attrib = attributeSkill({ evidenceText, skillsRoot });
    if (!attrib.skill) continue;

    const severity: SignalSeverity =
      criterion.severity === 'blocking' ? 'high' : 'medium';

    const existing = perSkill.get(attrib.skill);
    if (!existing || severityRank(severity) > severityRank(existing.severity)) {
      perSkill.set(attrib.skill, { severity, evidence: evidenceText });
    }
  }

  for (const [skill, { severity, evidence }] of perSkill) {
    try {
      await emitRefinementIfAttributable({
        projectRoot,
        source: 'rubric',
        severity,
        incrementId,
        evidence,
        attribution: { toolCallOrigin: skill },
      });
    } catch {
      // Best-effort: rubric evaluation must not fail because of signal I/O.
    }
  }
}

function severityRank(sev: SignalSeverity): number {
  return sev === 'high' ? 3 : sev === 'medium' ? 2 : 1;
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
