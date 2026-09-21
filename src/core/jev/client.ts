/**
 * Jev (TypeSafe System One) — zero-dependency HTTP client
 *
 * One POST, three primitives (choice / score / noul), typed answers with calibrated
 * probabilities. No npm dependency: Node >= 20.12 global `fetch` + `AbortSignal.timeout`.
 *
 * Safety rules enforced here:
 * - the API key value never appears in an error message, a log line or the usage ledger;
 * - the serialized state passes through {@link redactSecrets} before ANY request;
 * - questions are validated locally BEFORE any network call (cheap 422 avoidance);
 * - 429 / 529 / transport failures retry with exponential backoff, everything else fails fast.
 *
 * @module core/jev/client
 */

import {
  jevEndpoint,
  loadJevConfig,
  resolveApiKey,
  type JevConfig,
  type JevProvider,
} from './config.js';
import { redactSecrets } from './redact.js';
import { appendUsage } from './usage.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type Question =
  | { type: 'choice'; instructions: Json; criteria: Record<string, Json> }
  | { type: 'score'; instructions: Json; criteria: Json[] }
  | { type: 'noul'; instructions: Json; criteria?: { true?: Json; false?: Json } };

export type Answer =
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | {
      type: 'score';
      score: number;
      probabilities: Record<string, number>;
      legend?: Record<string, string>;
      confidence: number;
    }
  | { type: 'noul'; noul: number };

export interface JevResponse {
  provider: JevProvider;
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number; cost?: number };
  latencyMs: number;
  id?: string;
  /** How many secret-shaped spans {@link redactSecrets} masked out of the state. */
  redactions?: number;
}

export type JevErrorCode =
  | 'disabled'
  | 'no_key'
  | 'auth'
  | 'validation'
  | 'rate_limit'
  | 'overloaded'
  | 'transport'
  | 'timeout'
  | 'schema';

export class JevError extends Error {
  readonly code: JevErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: JevErrorCode, message: string, opts?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = 'JevError';
    this.code = code;
    this.status = opts?.status;
    this.retryable = opts?.retryable ?? RETRYABLE_CODES.has(code);
  }
}

const RETRYABLE_CODES = new Set<JevErrorCode>(['rate_limit', 'overloaded', 'transport']);

export interface JevClientOptions {
  apiKey?: string;
  fetch?: typeof fetch;
  projectRoot?: string;
  usageLog?: boolean;
  kind?: string;
  /** Base backoff in ms (300 by default); lowered by tests. */
  backoffMs?: number;
}

/** API limits (TypeSafe, verified 2026-09-21). */
export const JEV_LIMITS = {
  maxChoiceOptions: 255,
  minChoiceOptions: 2,
  minScoreLevels: 2,
  maxScoreLevels: 10,
} as const;

const QUESTION_ID = /^[A-Za-z0-9_.-]+$/;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function probabilityMap(value: unknown): Record<string, number> | null {
  if (!isPlainObject(value)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (!finite(v) || v < 0 || v > 1) return null;
    out[k] = v;
  }
  return out;
}

/**
 * Validate questions locally so a malformed catalog fails as `validation`
 * before we spend a request (and before anything reaches the wire).
 */
export function validateQuestions(questions: Record<string, Question>): void {
  const ids = Object.keys(questions ?? {});
  if (ids.length === 0) {
    throw new JevError('validation', 'at least one question is required');
  }
  for (const id of ids) {
    if (!QUESTION_ID.test(id)) {
      throw new JevError('validation', `invalid question id "${id}" (allowed: A-Z a-z 0-9 _ . -)`);
    }
    const q = questions[id];
    if (!isPlainObject(q)) {
      throw new JevError('validation', `question "${id}" must be an object`);
    }
    if (q.type === 'choice') {
      const options = isPlainObject(q.criteria) ? Object.keys(q.criteria) : [];
      if (options.length < JEV_LIMITS.minChoiceOptions || options.length > JEV_LIMITS.maxChoiceOptions) {
        throw new JevError(
          'validation',
          `choice question "${id}" needs ${JEV_LIMITS.minChoiceOptions}-${JEV_LIMITS.maxChoiceOptions} options, got ${options.length}`,
        );
      }
    } else if (q.type === 'score') {
      const levels = Array.isArray(q.criteria) ? q.criteria.length : 0;
      if (levels < JEV_LIMITS.minScoreLevels || levels > JEV_LIMITS.maxScoreLevels) {
        throw new JevError(
          'validation',
          `score question "${id}" needs ${JEV_LIMITS.minScoreLevels}-${JEV_LIMITS.maxScoreLevels} levels, got ${levels}`,
        );
      }
    } else if (q.type !== 'noul') {
      throw new JevError('validation', `question "${id}" has unknown type "${String((q as { type?: unknown }).type)}"`);
    }
    if ((q as { instructions?: unknown }).instructions === undefined) {
      throw new JevError('validation', `question "${id}" is missing instructions`);
    }
  }
}

/** Map an HTTP status to a JevErrorCode. */
export function statusToCode(status: number): JevErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 404 || status === 422) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status === 529) return 'overloaded';
  if (status >= 500) return 'transport';
  return 'transport';
}

function parseAnswers(body: unknown, questions: Record<string, Question>): Record<string, Answer> {
  if (!isPlainObject(body) || !isPlainObject(body.answers)) {
    throw new JevError('schema', 'response is missing an "answers" object');
  }
  const raw = body.answers as Record<string, unknown>;
  const answers: Record<string, Answer> = {};

  for (const id of Object.keys(questions)) {
    const a = raw[id];
    if (!isPlainObject(a)) {
      throw new JevError('schema', `response is missing an answer for question "${id}"`);
    }
    const type = a.type;
    if (type === 'noul') {
      if (!finite(a.noul) || a.noul < 0 || a.noul > 1) {
        throw new JevError('schema', `answer "${id}" has an out-of-range noul probability`);
      }
      answers[id] = { type: 'noul', noul: a.noul };
    } else if (type === 'choice') {
      const probabilities = probabilityMap(a.probabilities);
      if (typeof a.choice !== 'string' || !probabilities || !finite(a.confidence)) {
        throw new JevError('schema', `answer "${id}" is not a well-formed choice answer`);
      }
      answers[id] = { type: 'choice', choice: a.choice, probabilities, confidence: a.confidence };
    } else if (type === 'score') {
      const probabilities = probabilityMap(a.probabilities);
      if (!finite(a.score) || !probabilities || !finite(a.confidence)) {
        throw new JevError('schema', `answer "${id}" is not a well-formed score answer`);
      }
      const legend = isPlainObject(a.legend)
        ? (Object.fromEntries(
            Object.entries(a.legend).map(([k, v]) => [k, String(v)]),
          ) as Record<string, string>)
        : undefined;
      answers[id] = { type: 'score', score: a.score, probabilities, legend, confidence: a.confidence };
    } else {
      throw new JevError('schema', `answer "${id}" has unknown type "${String(type)}"`);
    }
  }

  return answers;
}

export class JevClient {
  readonly config: JevConfig;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly projectRoot?: string;
  private readonly usageLog: boolean;
  private readonly kind: string;
  private readonly backoffMs: number;

  constructor(cfg: JevConfig, opts: JevClientOptions = {}) {
    this.config = cfg;
    const resolved = opts.apiKey ?? resolveApiKey(cfg)?.key ?? '';
    if (!resolved) {
      throw new JevError('no_key', `no API key found for provider "${cfg.provider}"`);
    }
    this.apiKey = resolved;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.projectRoot = opts.projectRoot;
    this.usageLog = opts.usageLog !== false;
    this.kind = opts.kind ?? 'ask';
    this.backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  }

  /**
   * Ask one or more questions about a piece of state. Independent questions run in
   * parallel inside a single request — fan out rather than making N calls.
   */
  async ask(
    state: Json,
    questions: Record<string, Question>,
    opts: { timeoutMs?: number; retries?: number; kind?: string; usageLog?: boolean } = {},
  ): Promise<JevResponse> {
    validateQuestions(questions);

    const timeoutMs = opts.timeoutMs ?? this.config.timeoutMs;
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const kind = opts.kind ?? this.kind;
    const usageLog = opts.usageLog ?? this.usageLog;
    const url = jevEndpoint(this.config);

    // THE choke point: nothing reaches the wire before this line. Redacting the
    // serialized form catches secrets wherever a caller buried them — a command
    // string, a diff hunk, a page excerpt — without every caller remembering to.
    // A marker never contains a quote or a backslash, so the JSON normally still
    // parses; when a mask swallowed a delimiter we send the redacted text itself
    // rather than the unredacted object.
    const redacted = redactSecrets(JSON.stringify(state) ?? '');
    let safeState: Json;
    try {
      safeState = JSON.parse(redacted.text) as Json;
    } catch {
      safeState = redacted.text;
    }
    const body = JSON.stringify({ model: this.config.model, state: safeState, questions });

    const started = Date.now();
    let lastError: JevError = new JevError('transport', 'request was never attempted');

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new JevError(
            statusToCode(response.status),
            `Jev request failed with HTTP ${response.status}${await this.detail(response)}`,
            { status: response.status },
          );
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new JevError('schema', 'Jev response was not valid JSON');
        }

        const answers = parseAnswers(payload, questions);
        const raw = payload as Record<string, unknown>;
        const usage = isPlainObject(raw.usage) ? raw.usage : {};
        const latencyMs = Date.now() - started;

        const result: JevResponse = {
          provider: this.config.provider,
          model: typeof raw.model === 'string' ? raw.model : this.config.model,
          answers,
          usage: {
            input_tokens: finite(usage.input_tokens) ? usage.input_tokens : 0,
            output_tokens: finite(usage.output_tokens) ? usage.output_tokens : 0,
            cost: finite(usage.cost) ? usage.cost : undefined,
          },
          latencyMs,
          id: typeof raw.id === 'string' ? raw.id : undefined,
          redactions: redacted.redactions,
        };

        this.log(kind, result, true, usageLog);
        return result;
      } catch (error) {
        lastError = this.toJevError(error);
        if (!lastError.retryable || attempt === retries) break;
        await sleep(this.backoffMs * Math.pow(2, attempt));
      }
    }

    this.log(kind, null, false, usageLog, redacted.redactions);
    throw lastError;
  }

  /** One tiny noul, no retries, no ledger entry. Never throws. */
  async ping(): Promise<{ ok: boolean; latencyMs: number; model?: string; error?: string }> {
    const started = Date.now();
    try {
      const response = await this.ask(
        { probe: 'ping' },
        {
          PING: {
            type: 'noul',
            instructions: 'Is the word in `probe` the English word "ping"?',
          },
        },
        { retries: 0, kind: 'ping', usageLog: false },
      );
      return { ok: true, latencyMs: response.latencyMs, model: response.model };
    } catch (error) {
      const err = this.toJevError(error);
      return { ok: false, latencyMs: Date.now() - started, error: `${err.code}: ${err.message}` };
    }
  }

  /** Read a short error body without ever echoing credentials back. */
  private async detail(response: Response): Promise<string> {
    try {
      const text = (await response.text()).slice(0, 300).replace(/\s+/g, ' ').trim();
      return text ? ` — ${this.redact(text)}` : '';
    } catch {
      return '';
    }
  }

  private redact(text: string): string {
    return this.apiKey ? text.split(this.apiKey).join('[redacted]') : text;
  }

  private toJevError(error: unknown): JevError {
    if (error instanceof JevError) {
      return new JevError(error.code, this.redact(error.message), {
        status: error.status,
        retryable: error.retryable,
      });
    }
    const name = (error as { name?: string } | null)?.name ?? '';
    const message = this.redact(
      (error as { message?: string } | null)?.message ?? 'unknown transport failure',
    );
    if (name === 'AbortError' || name === 'TimeoutError') {
      return new JevError('timeout', `Jev request timed out: ${message}`);
    }
    return new JevError('transport', `Jev request failed: ${message}`);
  }

  private log(
    kind: string,
    result: JevResponse | null,
    ok: boolean,
    usageLog: boolean = this.usageLog,
    redactions = 0,
  ): void {
    if (!usageLog) return;
    try {
      const root = this.projectRoot ?? resolveEffectiveRoot();
      appendUsage(root, {
        at: new Date().toISOString(),
        kind,
        provider: this.config.provider,
        model: result?.model ?? this.config.model,
        input_tokens: result?.usage.input_tokens ?? 0,
        output_tokens: result?.usage.output_tokens ?? 0,
        cost: result?.usage.cost,
        latencyMs: result?.latencyMs ?? 0,
        redactions: result?.redactions ?? redactions,
        ok,
      });
    } catch {
      // The ledger is best-effort; a Jev call never fails because of it.
    }
  }
}

/**
 * Build a client for a project, or null when Jev is disabled or no key is available.
 * Callers treat null as "continue without Jev" — never as an error.
 */
export function createJevClient(projectRoot?: string, opts: JevClientOptions = {}): JevClient | null {
  const cfg = loadJevConfig(projectRoot);
  if (!cfg.enabled) return null;
  const key = opts.apiKey ?? resolveApiKey(cfg)?.key;
  if (!key) return null;
  try {
    return new JevClient(cfg, { projectRoot, ...opts, apiKey: key });
  } catch {
    return null;
  }
}
