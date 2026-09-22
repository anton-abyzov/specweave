import { describe, expect, it, vi } from 'vitest';
import { JevClient, type Question } from '../../../src/core/jev/client.js';
import { JEV_DEFAULTS } from '../../../src/core/jev/config.js';
import { guardCommand } from '../../../src/core/jev/decide.js';
import { redactSecrets } from '../../../src/core/jev/redact.js';

const questions: Record<string, Question> = {
  Q: { type: 'choice', instructions: 'Pick', criteria: { yes: 'Yes', no: 'No' } },
};
const valid = { type: 'choice', choice: 'yes', confidence: 0.8, probabilities: { yes: 0.9, no: 0.1 } };
function makeClient(answer: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ answers: { Q: answer } }), { status: 200 }));
  return { client: new JevClient({ ...JEV_DEFAULTS, enabled: true }, { apiKey: 'test-only', fetch: fetch as typeof globalThis.fetch, usageLog: false }), fetch };
}

describe('Jev response schema regression', () => {
  it.each([
    { ...valid, type: 'noul', noul: 0.1 },
    { ...valid, choice: 'unknown' },
    { ...valid, confidence: 5 },
    { ...valid, confidence: -0.1 },
    { ...valid, probabilities: {} },
    { ...valid, probabilities: { yes: 0.9 } },
    { ...valid, probabilities: { yes: 0.9, wrong: 0.1 } },
    { ...valid, probabilities: { yes: 0.9, no: 0.9 } },
    { ...valid, probabilities: { yes: 1.1, no: -0.1 } },
  ])('rejects malformed provider answer %#', async (answer) => {
    const { client } = makeClient(answer);
    await expect(client.ask({}, questions)).rejects.toMatchObject({ code: 'schema' });
  });

  it('returns unavailable, never allow, for mismatched guard answer types', async () => {
    const fetch = async () => new Response(JSON.stringify({ answers: {
      COMMAND_SCOPE: { type: 'choice', choice: 'unexpected', confidence: 5, probabilities: {} },
      COMMAND_DESTRUCTIVE: { type: 'choice', choice: 'no', confidence: 1, probabilities: { no: 1 } },
    } }));
    const client = new JevClient({ ...JEV_DEFAULTS, enabled: true }, { apiKey: 'test-only', fetch, usageLog: false });
    expect(await guardCommand(client, { command: 'rm -rf /tmp/fictional-test-target' })).toMatchObject({ available: false, reason: expect.stringContaining('schema') });
  });

  it('accepts a fractional score within the requested levels', async () => {
    const { client } = makeClient({ type: 'score', score: 1.3, confidence: 0.54, probabilities: { '0': 0, '1': 0.7, '2': 0.3 }, legend: { '0': 'Low', '1': 'Medium', '2': 'High' } });
    expect((await client.ask({}, { Q: { type: 'score', instructions: 'Rate', criteria: ['Low', 'Medium', 'High'] } })).answers.Q).toMatchObject({ score: 1.3 });
  });

  it.each([-1, 3])('rejects score %s outside requested rubric', async (score) => {
    const { client } = makeClient({ type: 'score', score, confidence: 0.8, probabilities: { '0': 0.5, '1': 0.5 } });
    await expect(client.ask({}, { Q: { type: 'score', instructions: 'Rate', criteria: ['Low', 'High'] } })).rejects.toMatchObject({ code: 'schema' });
  });
});

describe('complete request redaction', () => {
  const fake = 'ghp_' + 'A'.repeat(24);
  it('scrubs nested instructions and criteria while preserving their schema', async () => {
    const { client, fetch } = makeClient(valid);
    const response = await client.ask({ nested: [fake] }, { Q: { type: 'choice', instructions: { text: fake }, criteria: { yes: [fake], no: null } } });
    const body = String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).not.toContain(fake);
    expect(JSON.parse(body).questions.Q.instructions.text).toContain('REDACTED');
    expect(JSON.parse(body).questions.Q.criteria.yes).toEqual([expect.stringContaining('REDACTED')]);
    expect(response.redactions).toBe(3);
  });
  it('refuses secret-shaped object keys without sending a request or echoing the key', async () => {
    const { client, fetch } = makeClient(valid);
    const err = await client.ask({ [fake]: 'value' }, questions).catch((e) => e);
    expect(err.code).toBe('validation');
    expect(err.message).not.toContain(fake);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['\n', '\\n'])('removes PEM bodies with newline form %j', async (newline) => {
    const pem = ['-----BEGIN PRIVATE KEY-----', 'FAKE-KEY-MATERIAL', '-----END PRIVATE KEY-----'].join(newline);
    expect(redactSecrets(pem).text).toBe('<REDACTED-private-key>');
    const { client, fetch } = makeClient(valid);
    await client.ask({ pem }, questions);
    expect(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)).not.toContain('FAKE-KEY-MATERIAL');
  });
  it('removes truncated PEM bodies to end of input', () => {
    expect(redactSecrets('-----BEGIN RSA PRIVATE KEY-----\nFAKE-KEY-MATERIAL').text).toBe('<REDACTED-private-key>');
  });
});
