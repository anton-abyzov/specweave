/**
 * JevClient — transport, validation, retries, schema guard.
 *
 * No network: every test injects a fetch stub. No real API key is ever used or printed.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  JevClient,
  JevError,
  createJevClient,
  statusToCode,
  validateQuestions,
  type Question,
} from '../../../src/core/jev/client.js';
import { JEV_DEFAULTS, type JevConfig } from '../../../src/core/jev/config.js';
import { usageLogPath } from '../../../src/core/jev/usage.js';

const TEST_KEY = 'test-key-not-a-real-credential';

function cfg(overrides: Partial<JevConfig> = {}): JevConfig {
  return { ...JEV_DEFAULTS, enabled: true, timeoutMs: 1000, ...overrides };
}

function client(fetchImpl: typeof fetch, overrides: Partial<JevConfig> = {}): JevClient {
  return new JevClient(cfg(overrides), {
    apiKey: TEST_KEY,
    fetch: fetchImpl,
    usageLog: false,
    backoffMs: 1,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const OK_BODY = {
  model: 'typesafe/jev-1.13-20260917',
  answers: {
    KIND: { type: 'choice', choice: 'bug_fix', probabilities: { bug_fix: 0.9, feature: 0.1 }, confidence: 0.88 },
    SAFE: { type: 'noul', noul: 0.12 },
  },
  usage: { input_tokens: 369, output_tokens: 61, cost: 0.0000155 },
  id: 'gen-dec-abc',
};

const TWO_QUESTIONS: Record<string, Question> = {
  KIND: { type: 'choice', instructions: 'kind?', criteria: { bug_fix: 'a bug', feature: 'a feature' } },
  SAFE: { type: 'noul', instructions: 'safe?' },
};

describe('validateQuestions', () => {
  it('rejects a choice question with fewer than two options', () => {
    expect(() =>
      validateQuestions({ Q: { type: 'choice', instructions: 'x', criteria: { only: 'one' } } }),
    ).toThrowError(/2-255 options/);
  });

  it('rejects a score question with more than ten levels', () => {
    const criteria = Array.from({ length: 11 }, (_, i) => `level ${i}`);
    expect(() => validateQuestions({ Q: { type: 'score', instructions: 'x', criteria } })).toThrowError(
      /2-10 levels/,
    );
  });

  it('rejects illegal question ids', () => {
    expect(() => validateQuestions({ 'bad id!': { type: 'noul', instructions: 'x' } })).toThrowError(
      /invalid question id/,
    );
  });

  it('rejects an empty question set', () => {
    expect(() => validateQuestions({})).toThrowError(/at least one question/);
  });

  it('accepts the 255-option boundary', () => {
    const criteria: Record<string, string> = {};
    for (let i = 0; i < 255; i++) criteria[`opt_${i}`] = `option ${i}`;
    expect(() => validateQuestions({ Q: { type: 'choice', instructions: 'x', criteria } })).not.toThrow();
  });
});

describe('statusToCode', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [422, 'validation'],
    [429, 'rate_limit'],
    [529, 'overloaded'],
    [500, 'transport'],
  ])('maps HTTP %i to %s', (status, code) => {
    expect(statusToCode(status as number)).toBe(code);
  });
});

describe('JevClient.ask', () => {
  it('posts to the provider endpoint and returns typed answers', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(OK_BODY)) as unknown as typeof fetch;
    const response = await client(fetchStub).ask({ text: 'hello' }, TWO_QUESTIONS);

    expect(response.provider).toBe('openrouter');
    expect(response.model).toBe('typesafe/jev-1.13-20260917');
    expect(response.answers.KIND).toEqual({
      type: 'choice',
      choice: 'bug_fix',
      probabilities: { bug_fix: 0.9, feature: 0.1 },
      confidence: 0.88,
    });
    expect(response.answers.SAFE).toEqual({ type: 'noul', noul: 0.12 });
    expect(response.usage).toEqual({ input_tokens: 369, output_tokens: 61, cost: 0.0000155 });
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(response.id).toBe('gen-dec-abc');

    const [url, init] = (fetchStub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/systemone');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('jev-1.13');
    expect(Object.keys(body.questions)).toEqual(['KIND', 'SAFE']);
    expect(body.state).toEqual({ text: 'hello' });
  });

  it('uses the typesafe endpoint and model when that provider is configured', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(OK_BODY)) as unknown as typeof fetch;
    await client(fetchStub, { provider: 'typesafe', model: 'jev-latest' }).ask({}, TWO_QUESTIONS);
    const [url] = (fetchStub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
  });

  it('fails validation locally without touching the network', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(OK_BODY)) as unknown as typeof fetch;
    await expect(
      client(fetchStub).ask({}, { Q: { type: 'choice', instructions: 'x', criteria: { only: '1' } } }),
    ).rejects.toMatchObject({ code: 'validation' });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('maps 401 to a non-retryable auth error and never echoes the key', async () => {
    const fetchStub = vi.fn(async () =>
      new Response(`no access for ${TEST_KEY}`, { status: 401 }),
    ) as unknown as typeof fetch;
    const error = await client(fetchStub)
      .ask({}, TWO_QUESTIONS)
      .catch((e: unknown) => e as JevError);

    expect(error).toBeInstanceOf(JevError);
    expect((error as JevError).code).toBe('auth');
    expect((error as JevError).retryable).toBe(false);
    expect((error as JevError).status).toBe(401);
    expect((error as JevError).message).not.toContain(TEST_KEY);
    expect((error as JevError).message).toContain('[redacted]');
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('maps 422 to validation and does not retry', async () => {
    const fetchStub = vi.fn(async () => new Response('bad question', { status: 422 })) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS)).rejects.toMatchObject({ code: 'validation' });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 and then succeeds', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(OK_BODY)) as unknown as typeof fetch;

    const response = await client(fetchStub).ask({}, TWO_QUESTIONS);
    expect(response.answers.SAFE).toEqual({ type: 'noul', noul: 0.12 });
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget on repeated 529s', async () => {
    const fetchStub = vi.fn(async () => new Response('overloaded', { status: 529 })) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS, { retries: 1 })).rejects.toMatchObject({
      code: 'overloaded',
      retryable: true,
    });
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('reports a transport failure when fetch itself rejects', async () => {
    const fetchStub = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS, { retries: 0 })).rejects.toMatchObject({
      code: 'transport',
    });
  });

  it('reports a schema error for a non-JSON body', async () => {
    const fetchStub = vi.fn(async () => new Response('not json {', { status: 200 })) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS)).rejects.toMatchObject({ code: 'schema' });
  });

  it('reports a schema error when an answer is missing', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({ ...OK_BODY, answers: { KIND: OK_BODY.answers.KIND } }),
    ) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS)).rejects.toMatchObject({ code: 'schema' });
  });

  it('reports a schema error when a probability is out of range', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({
        ...OK_BODY,
        answers: {
          ...OK_BODY.answers,
          KIND: { type: 'choice', choice: 'bug_fix', probabilities: { bug_fix: 1.7 }, confidence: 0.9 },
        },
      }),
    ) as unknown as typeof fetch;
    await expect(client(fetchStub).ask({}, TWO_QUESTIONS)).rejects.toMatchObject({ code: 'schema' });
  });

  it('reports a timeout when the request is aborted', async () => {
    const fetchStub = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      client(fetchStub, { timeoutMs: 20 }).ask({}, TWO_QUESTIONS, { retries: 0 }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
});

/**
 * The choke point. Scoring a command, an AC or a page excerpt means POSTing text a
 * caller assembled from the working tree — and the callers that matter most (the Bash
 * guard, handoff evidence) are exactly the ones whose text carries credentials. The
 * client redacts the serialized state itself so no caller can forget to.
 */
describe('JevClient.ask — state redaction', () => {
  /** Shaped like a real OpenRouter key, deliberately not one. */
  const FAKE_TOKEN = 'sk-or-v1-abcdefabcdefabcdefabcdef0123456789';

  function capture(): { fetch: typeof fetch; body: () => string } {
    const stub = vi.fn(async () => jsonResponse(OK_BODY));
    return {
      fetch: stub as unknown as typeof fetch,
      body: () => String((stub.mock.calls[0][1] as RequestInit).body),
    };
  }

  it('never lets an OPENROUTER-style token reach the request body', async () => {
    const { fetch: fetchStub, body } = capture();
    const response = await client(fetchStub).ask(
      { note: `export OPENROUTER_API_KEY=${FAKE_TOKEN}`, nested: { deep: [FAKE_TOKEN] } },
      TWO_QUESTIONS,
    );

    const sent = body();
    expect(sent).not.toContain(FAKE_TOKEN);
    expect(sent).not.toContain('abcdefabcdefabcdefabcdef0123456789');
    expect(sent).toContain('REDACTED');
    expect(response.redactions).toBeGreaterThanOrEqual(2);
  });

  it('keeps the state an object and its non-secret text intact', async () => {
    const { fetch: fetchStub, body } = capture();
    await client(fetchStub).ask({ command: `curl -H "Authorization: Bearer ${FAKE_TOKEN}" https://api.example.com/me` }, TWO_QUESTIONS);

    const sent = JSON.parse(body()) as { state: { command: string } };
    expect(typeof sent.state).toBe('object');
    expect(sent.state.command).toContain('curl');
    expect(sent.state.command).toContain('https://api.example.com/me');
    expect(sent.state.command).not.toContain(FAKE_TOKEN);
    expect(sent.state.command).toMatch(/<REDACTED-[a-z-]+>/);
  });

  it('sends clean state byte-identical and reports zero redactions', async () => {
    const { fetch: fetchStub, body } = capture();
    const state = { command: 'git status', cwd: '/repo', description: null };
    const response = await client(fetchStub).ask(state, TWO_QUESTIONS);

    expect((JSON.parse(body()) as { state: unknown }).state).toEqual(state);
    expect(response.redactions).toBe(0);
  });

  it('masks the other listed key shapes too', async () => {
    const secrets = {
      github: 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123',
      fineGrained: 'github_pat_' + '11ABCDEFG0abcdefghijklmnopqrstuvwxyz012345',
      slack: 'xoxb-' + '1234567890-abcdefghijkl',
      aws: 'AKIA' + 'IOSFODNN7EXAMPLE',
      jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r',
      dsn: 'psql postgres://admin:' + 'hunter2@db.example.com/prod',
    };
    const { fetch: fetchStub, body } = capture();
    await client(fetchStub).ask(secrets, TWO_QUESTIONS);

    const sent = body();
    for (const value of ['ghp_' + 'abcdefghijklmnopqrstuvwxyz0123', secrets.fineGrained, secrets.slack, secrets.aws, secrets.jwt, 'hunter2']) {
      expect(sent).not.toContain(value);
    }
    expect(sent).toContain('@db.example.com/prod'); // shape preserved
  });

  // A mask can swallow a JSON delimiter (`--otp=123456"}` is one \S+ run). Sending the
  // redacted text is the correct trade: never the unredacted object.
  it('falls back to the redacted string when the mask breaks the JSON', async () => {
    const { fetch: fetchStub, body } = capture();
    await client(fetchStub).ask({ command: 'npm publish --otp=123456' }, TWO_QUESTIONS);

    const sent = JSON.parse(body()) as { state: unknown };
    expect(typeof sent.state).toBe('string');
    expect(sent.state).not.toContain('123456');
    expect(sent.state).toContain('npm publish');
  });

  it('records the redaction count in the usage ledger', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-redact-'));
    try {
      const { fetch: fetchStub } = capture();
      const logged = new JevClient(cfg(), { apiKey: TEST_KEY, fetch: fetchStub, projectRoot: root, backoffMs: 1 });
      await logged.ask({ note: `key ${FAKE_TOKEN}` }, TWO_QUESTIONS);

      const line = fs.readFileSync(usageLogPath(root), 'utf-8').trim();
      expect(JSON.parse(line)).toMatchObject({ kind: 'ask', ok: true, redactions: 1 });
      expect(line).not.toContain(FAKE_TOKEN);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('JevClient.ping', () => {
  it('sends one noul without retries and reports the model', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({
        model: 'typesafe/jev-1.13-20260917',
        answers: { PING: { type: 'noul', noul: 0.99 } },
        usage: { input_tokens: 12, output_tokens: 2, cost: 0.0000004 },
      }),
    ) as unknown as typeof fetch;

    const result = await client(fetchStub).ping();
    expect(result.ok).toBe(true);
    expect(result.model).toBe('typesafe/jev-1.13-20260917');
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      ((fetchStub as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(Object.keys(body.questions)).toEqual(['PING']);
  });

  it('never throws when the service is down', async () => {
    const fetchStub = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const result = await client(fetchStub).ping();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('transport');
    expect(result.error).not.toContain(TEST_KEY);
  });

  // The docstring promises no ledger entry: `doctor` and `setup` ping on every run,
  // and a probe is not usage — it would drown the real calls in `jev usage`.
  it('writes no ledger entry, on success or on failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-ping-'));
    try {
      const ok = vi.fn(async () =>
        jsonResponse({
          model: 'typesafe/jev-1.13-20260917',
          answers: { PING: { type: 'noul', noul: 0.99 } },
          usage: { input_tokens: 12, output_tokens: 2, cost: 0.0000004 },
        }),
      ) as unknown as typeof fetch;
      const probe = (fetchImpl: typeof fetch) =>
        new JevClient(cfg(), { apiKey: TEST_KEY, fetch: fetchImpl, projectRoot: root, backoffMs: 1 });

      expect((await probe(ok).ping()).ok).toBe(true);
      expect(fs.existsSync(usageLogPath(root))).toBe(false);

      const down = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
      expect((await probe(down).ping()).ok).toBe(false);
      expect(fs.existsSync(usageLogPath(root))).toBe(false);

      // An ordinary ask on the same client DOES log — the skip is scoped to ping.
      const asked = vi.fn(async () => jsonResponse(OK_BODY)) as unknown as typeof fetch;
      await probe(asked).ask({}, TWO_QUESTIONS);
      expect(JSON.parse(fs.readFileSync(usageLogPath(root), 'utf-8').trim())).toMatchObject({ kind: 'ask' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('createJevClient', () => {
  it('returns null when a key is present but Jev is disabled', () => {
    vi.stubEnv('SPECWEAVE_JEV', '0');
    expect(createJevClient(process.cwd(), { apiKey: TEST_KEY })).toBeNull();
    vi.unstubAllEnvs();
  });

  it('returns null when enabled but no key can be resolved', () => {
    vi.stubEnv('SPECWEAVE_JEV', '1');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('TYPESAFE_API_KEY', '');
    vi.stubEnv('JEV_API_KEY', '');
    expect(createJevClient(process.cwd())).toBeNull();
    vi.unstubAllEnvs();
  });

  it('returns a usable client when enabled with an explicit key', async () => {
    vi.stubEnv('SPECWEAVE_JEV', '1');
    const fetchStub = vi.fn(async () => jsonResponse(OK_BODY)) as unknown as typeof fetch;
    const c = createJevClient(process.cwd(), { apiKey: TEST_KEY, fetch: fetchStub, usageLog: false });
    expect(c).not.toBeNull();
    const response = await c!.ask({}, TWO_QUESTIONS);
    expect(response.answers.SAFE).toEqual({ type: 'noul', noul: 0.12 });
    vi.unstubAllEnvs();
  });
});
