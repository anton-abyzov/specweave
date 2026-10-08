import { describe, it, expect, vi } from 'vitest';
import { JevClient, type Question } from '../../../src/core/jev/client.js';
import { JEV_DEFAULTS, loadJevConfig, resolveApiKey, jevEndpoint } from '../../../src/core/jev/config.js';
import { DECISIONS_BUDGET } from '../../../src/core/jev/openai.js';
import { routePrompt } from '../../../src/core/jev/decide.js';

const questions: Record<string, Question> = {
  relevant: { type: 'noul', instructions: 'Is it relevant?', criteria: { true: 'Product question', false: 'Other' } },
  route: { type: 'choice', instructions: { task: 'route' }, criteria: { support: 'Needs support', other: 'Other' } },
  severity: { type: 'score', instructions: 'Severity?', criteria: ['cosmetic', 'workaround', 'blocked'] },
};
const answers = [
  { name: 'relevant', type: 'predicate', probability: 0.7 },
  { name: 'route', type: 'choice', choice: 'support', probabilities: [{ value: 'support', probability: 0.8 }, { value: 'other', probability: 0.2 }], confidence: 0.6 },
  { name: 'severity', type: 'score', score: 1.1, probabilities: [{ value: 0, label: '0', probability: 0.1 }, { value: 1, label: '1', probability: 0.7 }, { value: 2, label: '2', probability: 0.2 }], confidence: 0.55 },
];
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'x-request-id': 'req_fixture' } });
const make = (fetch: typeof globalThis.fetch, timeoutMs = 200) => new JevClient({ ...JEV_DEFAULTS, provider: 'openai', model: 'gpt-6-luna', enabled: true, timeoutMs }, { apiKey: 'fake-api-key', fetch, usageLog: false, backoffMs: 1 });
const fixture = () => ({ model: 'gpt-6-luna', answers: structuredClone(answers), usage: { input_tokens: 300, output_tokens: 0 } });

describe('optional OpenAI Decisions provider', () => {
  it('is off by default, resolves its own model and key, and cannot target a custom host', () => {
    const cfg = loadJevConfig('/nonexistent', { SPECWEAVE_JEV_PROVIDER: 'openai' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.model).toBe('gpt-6-luna');
    expect(jevEndpoint(cfg)).toBe('https://api.openai.com/v1/decisions');
    expect(resolveApiKey(cfg, { OPENAI_API_KEY: 'test' })).toEqual({ key: 'test', source: 'OPENAI_API_KEY' });
    expect(resolveApiKey(cfg, { OPENROUTER_API_KEY: 'wrong-provider' })).toBeNull();
  });

  it('adapts all three types without confusing confidence with selected probability or rounding scores', async () => {
    const fetch = vi.fn(async () => response(fixture()));
    const result = await make(fetch).ask({ message: 'help' }, questions);
    const body = JSON.parse(String(fetch.mock.calls[0][1].body));
    expect(fetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/decisions');
    expect(body.input).toBe('{"message":"help"}');
    expect(body.state).toBeUndefined();
    expect(body.questions[0]).toMatchObject({ name: 'relevant', type: 'predicate' });
    expect(body.questions[0].instructions).toContain('Product question');
    expect(body.questions[1].choices).toEqual([{ value: 'support', description: 'Needs support' }, { value: 'other', description: 'Other' }]);
    expect(result.answers).toEqual({
      relevant: { type: 'noul', noul: 0.7 },
      route: { type: 'choice', choice: 'support', probabilities: { support: 0.8, other: 0.2 }, confidence: 0.6 },
      severity: { type: 'score', score: 1.1, probabilities: { 0: 0.1, 1: 0.7, 2: 0.2 }, legend: { 0: 'cosmetic', 1: 'workaround', 2: 'blocked' }, confidence: 0.55 },
    });
    expect(result.requestId).toBe('req_fixture');
    expect(result.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fetch.mock.calls[0][1].redirect).toBe('error');
    expect(result.usage.cost).toBeUndefined(); // No fabricated bill from the public base rate.
  });

  it('matches reordered answers by name', async () => {
    const data = fixture(); data.answers.reverse();
    expect((await make(async () => response(data)).ask('help', questions)).answers.relevant).toEqual({ type: 'noul', noul: 0.7 });
  });

  it.each([
    ['missing answer', (d: any) => d.answers.pop()],
    ['duplicate name', (d: any) => d.answers[1].name = 'relevant'],
    ['unknown name', (d: any) => d.answers[1].name = 'unknown'],
    ['wrong type', (d: any) => d.answers[0].type = 'choice'],
    ['unknown choice', (d: any) => d.answers[1].choice = 'grant_admin'],
    ['duplicate probability', (d: any) => d.answers[1].probabilities[1].value = 'support'],
    ['missing probability', (d: any) => d.answers[1].probabilities.pop()],
    ['unknown probability', (d: any) => d.answers[1].probabilities[1].value = 'write'],
    ['invalid sum', (d: any) => d.answers[1].probabilities[1].probability = 0.8],
    ['invalid confidence', (d: any) => d.answers[1].confidence = 2],
    ['invalid predicate', (d: any) => d.answers[0].probability = -1],
    ['wrong score label', (d: any) => d.answers[2].probabilities[0].label = 'blocked'],
    ['lower probability choice', (d: any) => d.answers[1].choice = 'other'],
    ['inconsistent score', (d: any) => d.answers[2].score = 2],
    ['string score index', (d: any) => d.answers[2].probabilities[0].value = '0'],
  ])('fails unavailable on %s without retry', async (_, mutate) => {
    const data = fixture(); mutate(data);
    const fetch = vi.fn(async () => response(data));
    await expect(make(fetch).ask('help', questions)).rejects.toMatchObject({ code: 'schema' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('treats a refusal as unavailable and never logs the refusal text', async () => {
    const fetch = vi.fn(async () => response({ answers: [{ name: 'relevant', type: 'refusal', refusal: 'PRIVATE SOURCE' }] }));
    await expect(make(fetch).ask('help', { relevant: questions.relevant })).rejects.toMatchObject({ code: 'refusal', message: 'OpenAI Decisions refused a question' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not expose provider error bodies or transport messages', async () => {
    await expect(make(async () => response({ error: 'PRIVATE SOURCE fake-api-key' }, 403)).ask('help', questions)).rejects.toMatchObject({ message: 'Jev request failed with HTTP 403', code: 'auth' });
    await expect(make(async () => { throw Error('PRIVATE SOURCE'); }).ask('help', questions, { retries: 0 })).rejects.toMatchObject({ message: 'Jev request failed: provider transport error' });
  });

  it('redacts secrets in input, instructions and choice descriptions', async () => {
    const secret = 'sk-or-v1-' + 'a'.repeat(64);
    const fetch = vi.fn(async () => response({ answers: [{ name: 'p', type: 'predicate', probability: 0.1 }] }));
    await make(fetch).ask({ token: secret }, { p: { type: 'noul', instructions: secret, criteria: { true: secret } } });
    expect(fetch.mock.calls[0][1].body).not.toContain(secret);
  });

  it('enforces local question/input budgets before any network call', async () => {
    const fetch = vi.fn();
    await expect(make(fetch).ask('x'.repeat(DECISIONS_BUDGET.requestBytes), questions)).rejects.toMatchObject({ code: 'validation' });
    await expect(make(fetch).ask('x', Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`q${i}`, questions.relevant])))).rejects.toMatchObject({ code: 'validation' });
    await expect(make(fetch).ask('x', questions, { retries: 200 })).rejects.toMatchObject({ code: 'validation' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('bounds even a transport that ignores abort and a body that never resolves', async () => {
    await expect(make(() => new Promise(() => {}), 15).ask('help', questions)).rejects.toMatchObject({ code: 'timeout' });
    const fetch = async () => new Response(new ReadableStream({ start() {} }));
    await expect(make(fetch, 15).ask('help', questions)).rejects.toMatchObject({ code: 'timeout' });
  });

  it('bounds streamed response bytes even without a Content-Length header', async () => {
    const cancel = vi.fn();
    const fetch = async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(DECISIONS_BUDGET.responseBytes + 1)); }, cancel,
    }));
    await expect(make(fetch).ask('help', questions)).rejects.toMatchObject({ code: 'schema' });
    expect(cancel).toHaveBeenCalled();
  });

  it('hashes canonical redacted evidence with the question version', async () => {
    const client = make(async () => response(fixture()));
    const a = await client.ask({ a: 1, b: 2 }, questions);
    const b = await client.ask({ b: 2, a: 1 }, questions);
    // Input is a JSON string on the wire, so its order is retained in the hashed evidence.
    expect(a.evidenceHash).not.toBe(b.evidenceHash);
    expect((await client.ask({ a: 1, b: 2 }, questions)).evidenceHash).toBe(a.evidenceHash);
  });

  it('retries transient errors only within the total deadline', async () => {
    const fetch = vi.fn(async () => response({}, 429));
    await expect(make(fetch, 200).ask('help', questions)).rejects.toMatchObject({ code: 'rate_limit' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('routing keeps unavailable fallback on provider refusal', async () => {
    const fetch = async (_url: unknown, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      return response({ answers: request.questions.map((q: any) => ({ name: q.name, type: 'refusal' })) });
    };
    expect(await routePrompt(make(fetch as typeof globalThis.fetch), 'help', { skills: [], activeIncrement: false })).toMatchObject({ available: false });
  });
});
