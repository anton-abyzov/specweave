/** Translate the public Decisions contract into the existing Jev answer contract.
 * No network or source logging. Provider estimates never grant authorization.
 */
import type { Json, Question } from './client.js';
import { createHash } from 'node:crypto';

export class DecisionsAdapterError extends Error {
  constructor(readonly code: 'validation' | 'schema' | 'refusal', message: string) {
    super(message);
  }
}

// Application budgets, not claims about provider limits.
export const DECISIONS_BUDGET = { questions: 40, requestBytes: 512 * 1024, responseBytes: 1024 * 1024 } as const;
export const DECISIONS_ADAPTER_VERSION = 'openai-decisions-v1';
function canonical(value: Json): Json {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const decisionsEvidenceHash = (request: Json): string => createHash('sha256')
  .update(JSON.stringify({ version: DECISIONS_ADAPTER_VERSION, request: canonical(request) })).digest('hex');

const text = (value: Json): string => typeof value === 'string' ? value : JSON.stringify(value);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function decisionsRequest(model: string, state: Json, questions: Record<string, Question>): Json {
  if (model !== 'gpt-6-luna') throw new DecisionsAdapterError('validation', 'OpenAI Decisions currently requires gpt-6-luna');
  if (Object.keys(questions).length > DECISIONS_BUDGET.questions) {
    throw new DecisionsAdapterError('validation', 'OpenAI Decisions question budget exceeded');
  }
  return {
    model,
    input: typeof state === 'string' ? state : JSON.stringify(state),
    questions: Object.entries(questions).map(([name, q]): Json => {
      const instructions = text(q.instructions);
      if (q.type === 'noul') return {
        name, type: 'predicate',
        instructions: q.criteria ? `${instructions}\nCriteria: ${JSON.stringify(q.criteria)}` : instructions,
      };
      if (q.type === 'choice') return {
        name, type: 'choice', instructions,
        choices: Object.entries(q.criteria).map(([value, description]) => ({ value, description: text(description) })),
      };
      return {
        name, type: 'score', instructions,
        levels: q.criteria.map((description, i) => ({ label: String(i), description: text(description) })),
      };
    }),
  };
}

/** Normalize only after checking names, types, exact distributions and score consistency.
 * The shared Jev parser then applies range, membership and probability-sum checks.
 */
export function decisionsResponse(payload: unknown, questions: Record<string, Question>): unknown {
  if (!record(payload) || !Array.isArray(payload.answers) || payload.answers.length !== Object.keys(questions).length) {
    throw new DecisionsAdapterError('schema', 'OpenAI Decisions returned an invalid answer set');
  }
  const seen = new Set<string>();
  const answers: Record<string, unknown> = Object.create(null);
  for (const answer of payload.answers) {
    if (!record(answer) || typeof answer.name !== 'string' || !Object.prototype.hasOwnProperty.call(questions, answer.name) || seen.has(answer.name)) {
      throw new DecisionsAdapterError('schema', 'OpenAI Decisions returned missing, duplicate or unknown answer names');
    }
    const name = answer.name;
    seen.add(name);
    const q = questions[name];
    if (answer.type === 'refusal') throw new DecisionsAdapterError('refusal', 'OpenAI Decisions refused a question');
    if (answer.type !== (q.type === 'noul' ? 'predicate' : q.type)) {
      throw new DecisionsAdapterError('schema', 'OpenAI Decisions answer type mismatch');
    }
    if (q.type === 'noul') {
      answers[name] = { type: 'noul', noul: answer.probability };
      continue;
    }
    if (!Array.isArray(answer.probabilities)) throw new DecisionsAdapterError('schema', 'OpenAI Decisions probabilities are missing');
    const allowed = q.type === 'choice' ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
    const probabilities: Record<string, unknown> = Object.create(null);
    const legend: Record<string, string> = Object.create(null);
    for (const entry of answer.probabilities) {
      if (!record(entry) || (q.type === 'choice' ? typeof entry.value !== 'string' : !Number.isInteger(entry.value))) {
        throw new DecisionsAdapterError('schema', 'OpenAI Decisions probability option is invalid');
      }
      const key = String(entry.value);
      if (!allowed.includes(key) || Object.prototype.hasOwnProperty.call(probabilities, key)) {
        throw new DecisionsAdapterError('schema', 'OpenAI Decisions probability option is duplicated or unknown');
      }
      probabilities[key] = entry.probability;
      if (q.type === 'score') {
        if (entry.label !== key) throw new DecisionsAdapterError('schema', 'OpenAI Decisions score label disagrees with its level');
        legend[key] = text(q.criteria[Number(key)]);
      }
    }
    if (Object.keys(probabilities).length !== allowed.length) {
      throw new DecisionsAdapterError('schema', 'OpenAI Decisions probability distribution is incomplete');
    }
    if (q.type === 'score') {
      const weighted = Object.entries(probabilities).reduce((sum, [key, p]) => sum + Number(key) * Number(p), 0);
      if (typeof answer.score !== 'number' || !Number.isFinite(weighted) || Math.abs(weighted - answer.score) > 0.001) {
        throw new DecisionsAdapterError('schema', 'OpenAI Decisions score disagrees with its distribution');
      }
      answers[name] = { type: 'score', score: answer.score, probabilities, legend, confidence: answer.confidence };
    } else {
      const selected = probabilities[String(answer.choice)];
      const highest = Math.max(...Object.values(probabilities).map(Number));
      if (typeof selected === 'number' && selected + 0.000001 < highest) {
        throw new DecisionsAdapterError('schema', 'OpenAI Decisions selected a lower-probability choice');
      }
      answers[name] = { type: 'choice', choice: answer.choice, probabilities, confidence: answer.confidence };
    }
  }
  return { ...payload, answers };
}
