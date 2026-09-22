/**
 * Jev decisions — typed helpers callers can use without handling HTTP.
 *
 * Every helper is "fail soft": when Jev is unavailable (disabled, no key, timeout,
 * rate limit, schema drift) the helper returns `{ available: false, reason }` instead of
 * throwing, so the caller keeps its existing heuristic. Nothing here ever throws.
 *
 * Fan-out rule: independent questions about the same state go in ONE request.
 *
 * @module core/jev/decide
 */

import { JevError, type Answer, type JevClient, type JevResponse, type Json, type Question } from './client.js';
import type { JevConfig } from './config.js';
import {
  COMMAND_DESTRUCTIVE,
  COMMAND_SCOPE,
  COMMAND_SCOPES,
  NEEDS_INCREMENT,
  PROMPT_INJECTION,
  REQUEST_KIND,
  REQUEST_KINDS,
  TASK_COMPLEXITY,
  TASK_COMPLEXITY_LEVELS,
  TEST_FAILURE_KIND,
  TEST_FAILURE_KINDS,
  TEST_OUTPUT_PASSED,
  acSatisfiedQuestion,
  skillRouteQuestion,
  SKILL_ROUTE_NONE,
  type CommandScope,
  type RequestKind,
  type TaskComplexity,
  type TestFailureKind,
} from './questions.js';

/** Same three tiers as utils/model-selection; declared locally to avoid an import cycle. */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface Unavailable {
  available: false;
  reason: string;
}

export interface RouteDecisionOk {
  available: true;
  skill: string | null;
  skillConfidence: number;
  skillProbabilities: Record<string, number>;
  kind: RequestKind;
  kindConfidence: number;
  complexity: TaskComplexity;
  complexityConfidence: number;
  tier: ModelTier;
  needsIncrement: number;
  latencyMs: number;
  cost?: number;
}
export type RouteDecision = RouteDecisionOk | Unavailable;

export interface TaskDecisionOk {
  available: true;
  complexity: TaskComplexity;
  confidence: number;
  tier: ModelTier;
  needsIncrement: number;
  latencyMs: number;
  cost?: number;
}
export type TaskDecision = TaskDecisionOk | Unavailable;

export interface GuardDecisionOk {
  available: true;
  verdict: 'allow' | 'warn' | 'deny';
  scope: CommandScope;
  scopeConfidence: number;
  destructive: number;
  prefiltered: boolean;
  probabilities: Record<string, number>;
  reason: string;
  latencyMs: number;
  cost?: number;
}
export type GuardDecision = GuardDecisionOk | Unavailable;

export type AcDecision =
  | { id: string; available: true; satisfied: boolean; probability: number }
  | { id: string; available: false; reason: string };

export interface FailureDecisionOk {
  available: true;
  kind: TestFailureKind;
  confidence: number;
  probabilities: Record<string, number>;
  latencyMs: number;
}
export type FailureDecision = FailureDecisionOk | Unavailable;

export interface ScreenDecisionOk {
  available: true;
  injection: number;
  flagged: boolean;
  latencyMs: number;
}
export type ScreenDecision = ScreenDecisionOk | Unavailable;

/** Longest state string we send for any single field (keeps us well inside 32k/question). */
const MAX_FIELD_CHARS = 8000;
/** Hard cap on ACs judged in one fan-out request. */
export const MAX_ACS_PER_REQUEST = 40;

function clip(text: string | undefined, max = MAX_FIELD_CHARS): string {
  if (!text) return '';
  return text.length <= max ? text : `…${text.slice(text.length - max)}`;
}

function reasonOf(error: unknown): string {
  if (error instanceof JevError) return `${error.code}: ${error.message}`;
  return (error as { message?: string } | null)?.message ?? 'unknown Jev failure';
}

function choiceOf<T extends string>(
  answer: Answer | undefined,
  allowed: readonly T[],
  fallback: T,
): { value: T; confidence: number; probabilities: Record<string, number> } {
  if (answer && answer.type === 'choice') {
    const value = (allowed as readonly string[]).includes(answer.choice)
      ? (answer.choice as T)
      : fallback;
    return { value, confidence: answer.confidence, probabilities: answer.probabilities };
  }
  return { value: fallback, confidence: 0, probabilities: {} };
}

function noulOf(answer: Answer | undefined): number {
  return answer && answer.type === 'noul' ? answer.noul : 0;
}

/**
 * Complexity → model tier, with a confidence floor: an uncertain classification
 * always escalates to opus rather than saving money on a task we misread.
 */
export function modelTierFor(
  complexity: TaskComplexity,
  confidence: number,
  threshold: number,
): ModelTier {
  if (!Number.isFinite(confidence) || confidence < threshold) return 'opus';
  if (complexity === 'trivial') return 'haiku';
  if (complexity === 'moderate') return 'sonnet';
  return 'opus';
}

/**
 * Turn the two guard answers into a verdict (spec 0878, "Verdict" bullet).
 *
 * Deny needs high confidence; warn is deliberately generous.
 *
 * The scope-confidence deny arm exists because a near-certain local wipe scores its
 * *scope* high but its *destructiveness* only moderately: `rm -rf ~/Projects` comes back
 * scope=local_irreversible at 0.99 with destructive=0.81, below guardDeny (0.85). Gating
 * on the scope confidence catches it without lowering guardDeny, which would loosen every
 * remote verdict too.
 *
 * `destructive_remote` is in the warn arm so a low-confidence remote-destruction reading
 * degrades to warn rather than falling through to allow.
 */
export function guardVerdict(
  scope: string,
  scopeConf: number,
  destructive: number,
  t: JevConfig['thresholds'],
  /** p(local_irreversible) + p(destructive_remote): the two scopes that both mean "data is gone". */
  irreversibleMass = 0,
): 'allow' | 'warn' | 'deny' {
  const irreversible = scope === 'local_irreversible' || scope === 'destructive_remote';
  const confident = Number.isFinite(scopeConf) && scopeConf >= t.guardDeny;
  if (scope === 'destructive_remote' && confident) return 'deny';
  if (destructive >= t.guardDeny && irreversible) return 'deny';
  if (scope === 'local_irreversible' && confident && destructive >= t.guardWarn) return 'deny';
  // (d) Jev is sure the command destroys data but splits the scope between "local
  // irreversible" and "destructive remote" (e.g. a deleteMany against a database
  // whose location it cannot see). Neither scope alone clears guardDeny; together they do.
  if (Number.isFinite(irreversibleMass) && irreversibleMass >= t.guardDeny && destructive >= t.guardWarn) return 'deny';
  if (destructive >= t.guardWarn) return 'warn';
  if (scope === 'shared_or_remote' || irreversible) return 'warn';
  return 'allow';
}

// ── Command prefilter ────────────────────────────────────────────────────────

/** Any of these anywhere in the command means "ask Jev" — we never guess. */
const RISKY_TOKEN =
  /\b(rm|rmdir|mv|cp|dd|mkfs|shred|truncate|drop|delete|del|push|force|reset|revert|clean|prune|checkout|stash|sudo|su|chmod|chown|chgrp|kill|killall|pkill|shutdown|reboot|halt|curl|wget|ssh|scp|rsync|publish|deploy|apply|destroy|terraform|helm|eval|exec|sh|bash|zsh|source|tee|install|uninstall|link|unlink|format|migrate|seed|restore)\b/i;

/** Shell quoting/escaping needs a real parser; never infer safety from split tokens. */
const SHELL_POWER = /[<>`'"\\]|\$\(|\$\{|\n/;

/** Single-token commands that only read. */
const READ_ONLY_COMMANDS = new Set([
  'ls', 'cat', 'head', 'tail', 'wc', 'pwd', 'whoami', 'date', 'tree', 'stat',
  'du', 'df', 'which', 'echo', 'printf', 'grep', 'egrep', 'fgrep', 'ag',
  'fd', 'sort', 'uniq', 'basename', 'dirname', 'realpath', 'jq', 'uname', 'hostname',
  'less', 'man', 'true',
]);

/** Multi-token read-only command prefixes. */
const READ_ONLY_PREFIXES: readonly string[][] = [
  ['git', 'status'], ['git', 'log'], ['git', 'diff'], ['git', 'show'], ['git', 'blame'],
  ['git', 'rev-parse'], ['git', 'ls-files'], ['git', 'describe'], ['git', 'remote', '-v'],
  ['npm', 'test'], ['npm', 'run', 'build'], ['npm', 'run', 'test'], ['npm', 'run', 'lint'],
  ['npm', 'ls'], ['npm', 'view'], ['npm', '--version'], ['npm', '-v'],
  ['node', '--version'], ['node', '-v'],
  ['npx', 'tsc', '--noEmit'], ['npx', 'vitest', 'run'],
  ['pnpm', 'test'], ['yarn', 'test'],
  ['python', '--version'], ['python3', '--version'],
  ['cargo', 'check'], ['cargo', 'test'], ['go', 'test'], ['go', 'vet'],
  ['docker', 'ps'], ['kubectl', 'get'],
  ['specweave', 'status'], ['specweave', 'task', 'list'],
];

function segmentIsReadOnly(segment: string): boolean {
  const tokens = segment.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  // These read-oriented tools also write files, set system state or launch helpers.
  // Keep them out of the fast path rather than implementing a partial shell parser.
  if (['sort', 'uniq', 'fd', 'date', 'hostname', 'less', 'man'].includes(tokens[0])) return false;
  if (tokens.some((t) => /^--(?:output|pre|exec|exec-batch|pager|ext-diff|textconv|open-files-in-pager|hostname-bin|compile)(?:=|$)/.test(t))) return false;
  if (tokens[0] === 'tree' && tokens.some((t) => /^-[^-]*o/.test(t))) return false;
  // rg/find/file expose helper execution or file writes: none bypass the guard.
  if (READ_ONLY_COMMANDS.has(tokens[0])) return true;

  return READ_ONLY_PREFIXES.some(
    (prefix) => prefix.length <= tokens.length && prefix.every((part, i) => tokens[i] === part),
  );
}

/**
 * Cheap regex gate in front of the guard: plainly read-only commands skip Jev entirely.
 * Conservative by construction — anything unrecognised returns 'check'.
 */
export function prefilterCommand(command: string): 'skip' | 'check' {
  const cmd = (command ?? '').trim();
  if (!cmd || cmd.length > 500) return 'check';
  if (SHELL_POWER.test(cmd)) return 'check';
  if (RISKY_TOKEN.test(cmd)) return 'check';

  const segments = cmd.split(/&&|\|\||[|;&]/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return 'check';
  return segments.every(segmentIsReadOnly) ? 'skip' : 'check';
}

// ── Decisions ────────────────────────────────────────────────────────────────

/**
 * One fan-out request: which skill, what kind of request, how complex, increment needed.
 */
export async function routePrompt(
  client: JevClient,
  prompt: string,
  ctx: { skills: Array<{ name: string; description: string }>; activeIncrement?: string },
): Promise<RouteDecision> {
  const state: Json = {
    prompt: clip(prompt),
    active_increment: ctx.activeIncrement ?? null,
  };
  // With no skill catalog the route question would have a single option (`none`),
  // which the API rejects — and the answer would carry no information anyway.
  const skills = (ctx.skills ?? []).filter((s) => s?.name);
  const questions: Record<string, Question> = {
    ...(skills.length > 0 ? { SKILL_ROUTE: skillRouteQuestion(skills) } : {}),
    REQUEST_KIND,
    TASK_COMPLEXITY,
    NEEDS_INCREMENT,
  };

  try {
    const response = await client.ask(state, questions, { kind: 'route' });
    const allowedSkills: string[] = [...skills.map((s) => s.name), SKILL_ROUTE_NONE];
    const skill = choiceOf<string>(response.answers.SKILL_ROUTE, allowedSkills, SKILL_ROUTE_NONE);
    const kind = choiceOf<RequestKind>(response.answers.REQUEST_KIND, REQUEST_KINDS, 'other');
    const complexity = choiceOf<TaskComplexity>(
      response.answers.TASK_COMPLEXITY,
      TASK_COMPLEXITY_LEVELS,
      'complex',
    );
    return {
      available: true,
      skill: skill.value === SKILL_ROUTE_NONE ? null : skill.value,
      skillConfidence: skill.confidence,
      skillProbabilities: skill.probabilities,
      kind: kind.value,
      kindConfidence: kind.confidence,
      complexity: complexity.value,
      complexityConfidence: complexity.confidence,
      tier: modelTierFor(complexity.value, complexity.confidence, client.config.thresholds.route),
      needsIncrement: noulOf(response.answers.NEEDS_INCREMENT),
      latencyMs: response.latencyMs,
      cost: response.usage.cost,
    };
  } catch (error) {
    return { available: false, reason: reasonOf(error) };
  }
}

/** How much reasoning one increment task needs → model tier. */
export async function classifyTask(
  client: JevClient,
  task: { id: string; title: string; body: string; acs: string[]; approach?: string },
): Promise<TaskDecision> {
  const state: Json = {
    task_id: task.id,
    title: clip(task.title, 500),
    body: clip(task.body),
    acceptance_criteria: (task.acs ?? []).slice(0, MAX_ACS_PER_REQUEST).map((a) => clip(a, 1000)),
    approach: clip(task.approach, 4000),
  };

  try {
    const response = await client.ask(
      state,
      { TASK_COMPLEXITY, NEEDS_INCREMENT },
      { kind: 'task' },
    );
    const complexity = choiceOf<TaskComplexity>(
      response.answers.TASK_COMPLEXITY,
      TASK_COMPLEXITY_LEVELS,
      'complex',
    );
    return {
      available: true,
      complexity: complexity.value,
      confidence: complexity.confidence,
      tier: modelTierFor(complexity.value, complexity.confidence, client.config.thresholds.route),
      needsIncrement: noulOf(response.answers.NEEDS_INCREMENT),
      latencyMs: response.latencyMs,
      cost: response.usage.cost,
    };
  } catch (error) {
    return { available: false, reason: reasonOf(error) };
  }
}

/** Scope + destructiveness of a shell command, behind the regex prefilter. */
export async function guardCommand(
  client: JevClient,
  cmd: { command: string; cwd?: string; description?: string },
): Promise<GuardDecision> {
  if (prefilterCommand(cmd.command) === 'skip') {
    return {
      available: true,
      verdict: 'allow',
      scope: 'read_only',
      scopeConfidence: 1,
      destructive: 0,
      prefiltered: true,
      probabilities: {},
      reason: 'prefilter: plainly read-only command, Jev not consulted',
      latencyMs: 0,
    };
  }

  const state: Json = {
    command: clip(cmd.command, 2000),
    cwd: cmd.cwd ?? null,
    description: cmd.description ?? null,
  };

  try {
    const response = await client.ask(
      state,
      { COMMAND_SCOPE, COMMAND_DESTRUCTIVE },
      { kind: 'guard' },
    );
    const scope = choiceOf<CommandScope>(response.answers.COMMAND_SCOPE, COMMAND_SCOPES, 'read_only');
    const destructive = noulOf(response.answers.COMMAND_DESTRUCTIVE);
    const irreversibleMass =
      (scope.probabilities.local_irreversible ?? 0) + (scope.probabilities.destructive_remote ?? 0);
    const verdict = guardVerdict(
      scope.value,
      scope.confidence,
      destructive,
      client.config.thresholds,
      irreversibleMass,
    );
    return {
      available: true,
      verdict,
      scope: scope.value,
      scopeConfidence: scope.confidence,
      destructive,
      prefiltered: false,
      probabilities: scope.probabilities,
      reason: `Jev: scope=${scope.value} (confidence ${scope.confidence.toFixed(2)}), destructive=${destructive.toFixed(2)} → ${verdict}`,
      latencyMs: response.latencyMs,
      cost: response.usage.cost,
    };
  } catch (error) {
    return { available: false, reason: reasonOf(error) };
  }
}

/** One noul per acceptance criterion, all in one request (capped at 40). */
export async function judgeAcs(
  client: JevClient,
  acs: Array<{ id: string; text: string }>,
  evidence: { diffSummary?: string; testOutputTail?: string; notes?: string },
): Promise<AcDecision[]> {
  const list = (acs ?? []).slice(0, MAX_ACS_PER_REQUEST);
  if (list.length === 0) return [];

  const questions: Record<string, Question> = {};
  const idByKey = new Map<string, string>();
  list.forEach((ac, i) => {
    const key = `ac_${i}`;
    idByKey.set(key, ac.id);
    questions[key] = acSatisfiedQuestion(ac.text);
  });

  const state: Json = {
    diff_summary: clip(evidence?.diffSummary),
    test_output_tail: clip(evidence?.testOutputTail),
    notes: clip(evidence?.notes, 2000),
  };

  try {
    const response = await client.ask(state, questions, { kind: 'acs' });
    return list.map((ac, i) => {
      const probability = noulOf(response.answers[`ac_${i}`]);
      return { id: ac.id, available: true as const, satisfied: probability >= 0.5, probability };
    });
  } catch (error) {
    const reason = reasonOf(error);
    return list.map((ac) => ({ id: ac.id, available: false as const, reason }));
  }
}

/** Regression vs flake vs environment, from a failing test tail. */
export async function classifyFailure(
  client: JevClient,
  outputTail: string,
  ctx?: { changedFiles?: string[] },
): Promise<FailureDecision> {
  const state: Json = {
    output_tail: clip(outputTail),
    changed_files: (ctx?.changedFiles ?? []).slice(0, 100),
  };
  try {
    const response = await client.ask(state, { TEST_FAILURE_KIND }, { kind: 'failure' });
    const kind = choiceOf<TestFailureKind>(
      response.answers.TEST_FAILURE_KIND,
      TEST_FAILURE_KINDS,
      'real_regression',
    );
    return {
      available: true,
      kind: kind.value,
      confidence: kind.confidence,
      probabilities: kind.probabilities,
      latencyMs: response.latencyMs,
    };
  } catch (error) {
    return { available: false, reason: reasonOf(error) };
  }
}

/** Does untrusted text (issue body, page text, email) address an agent? */
export async function screenText(
  client: JevClient,
  text: string,
  source?: string,
): Promise<ScreenDecision> {
  const state: Json = { text: clip(text), source: source ?? null };
  try {
    const response = await client.ask(state, { PROMPT_INJECTION }, { kind: 'screen' });
    const injection = noulOf(response.answers.PROMPT_INJECTION);
    return { available: true, injection, flagged: injection >= 0.5, latencyMs: response.latencyMs };
  } catch (error) {
    return { available: false, reason: reasonOf(error) };
  }
}

/**
 * Probability that a test/build output is a clean pass.
 * `available: false` means the caller must fall back to its own parser — `passed` is 0
 * in that case so treating "unknown" as "not passed" stays the safe default.
 */
export async function testOutputPassed(
  client: JevClient,
  output: string,
  kind: 'tests' | 'build',
): Promise<{ passed: number; available: boolean; reason?: string }> {
  const state: Json = { kind, output: clip(output) };
  try {
    const response: JevResponse = await client.ask(
      state,
      { TEST_OUTPUT_PASSED },
      { kind: `output_${kind}` },
    );
    return { passed: noulOf(response.answers.TEST_OUTPUT_PASSED), available: true };
  } catch (error) {
    return { passed: 0, available: false, reason: reasonOf(error) };
  }
}
