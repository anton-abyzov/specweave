/**
 * Haiku-backed diff proposer for `sw:skill-refine`.
 *
 * Given the current SKILL.md contents and an aggregate of refinement signals,
 * asks Claude Haiku for a unified-diff proposal and a short rationale. The
 * model is invoked at `temperature: 0` so repeat runs with the same inputs
 * yield byte-identical output (AC-US2-02 determinism check).
 *
 * The Anthropic client is injected via the `client` option so tests can stub
 * the call — production callers pass the real SDK instance.
 *
 * @module core/skill-refine/haiku-diff
 */

import type { AggregateResult } from './aggregator';

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export interface HaikuDiffResult {
  diff: string;
  rationale: string;
}

export interface HaikuClientLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      temperature: number;
      system?: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) => Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

export interface ProposeDiffOptions {
  client: HaikuClientLike;
  skillMd: string;
  aggregate: AggregateResult;
  model?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = [
  'You are an expert editor of Claude Code SKILL.md files.',
  'A SpecWeave user has collected refinement signals showing places where a skill\'s instructions led to gate failures.',
  'Propose a MINIMAL unified diff against the current SKILL.md that addresses the signals.',
  '',
  'Requirements:',
  '- Output a single JSON object with keys "diff" (a unified-diff string) and "rationale" (one sentence).',
  '- The diff MUST be applicable with `git apply` (standard unified format, "--- a/SKILL.md" / "+++ b/SKILL.md").',
  '- Do not restructure the document; make targeted edits that address the cited evidence.',
  '- If the signals do not warrant a change, return {"diff":"","rationale":"No change warranted — signals insufficient."}.',
  '- Never edit frontmatter unless signals specifically name it.',
  '- No markdown fences around the JSON. No commentary.',
].join('\n');

/**
 * Render the user-facing prompt. Exposed for test introspection — stable
 * string shape is part of the determinism contract (same inputs → same
 * prompt → same completion at temp 0).
 */
export function buildUserPrompt(skillMd: string, aggregate: AggregateResult): string {
  const severity = aggregate.bySeverity;
  const source = aggregate.bySource;

  const evidenceBlock = aggregate.signals
    .map(
      (s, i) =>
        `${i + 1}. [${s.severity}/${s.source}/${s.incrementId}] ${s.evidence}`,
    )
    .join('\n');

  return [
    `Target skill: ${aggregate.targetSkill}`,
    `Window: last ${aggregate.window.lastNIncrements} increments — ${aggregate.incrementIds.join(', ') || '(none)'}`,
    `Signals: ${aggregate.totalSignals} total | by-source judge-llm=${source['judge-llm']} rubric=${source.rubric} code-reviewer=${source['code-reviewer']} | by-severity high=${severity.high} medium=${severity.medium} low=${severity.low}`,
    '',
    'Evidence:',
    evidenceBlock || '(no signals)',
    '',
    '--- BEGIN CURRENT SKILL.md ---',
    skillMd,
    '--- END CURRENT SKILL.md ---',
    '',
    'Return the JSON object now.',
  ].join('\n');
}

/**
 * Call Haiku with temperature 0 and extract the proposed {diff, rationale}.
 *
 * Throws when the model returns malformed JSON — callers should surface the
 * error so the user can retry or abort (we never silently fall back to a
 * blank diff, because that would suggest "no change needed" when the truth
 * is "the model broke").
 */
export async function proposeDiff(
  opts: ProposeDiffOptions,
): Promise<HaikuDiffResult> {
  const userPrompt = buildUserPrompt(opts.skillMd, opts.aggregate);
  const response = await opts.client.messages.create({
    model: opts.model ?? HAIKU_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = (response.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
    .trim();

  return parseHaikuJson(text);
}

/**
 * Extract the JSON object from a Haiku completion. Tolerates ```json fences
 * in case the model slips past the system instruction.
 */
export function parseHaikuJson(raw: string): HaikuDiffResult {
  const cleaned = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `haiku-diff: model returned non-JSON output: ${truncate(raw, 200)}`,
    );
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'diff' in parsed &&
    'rationale' in parsed &&
    typeof (parsed as any).diff === 'string' &&
    typeof (parsed as any).rationale === 'string'
  ) {
    return {
      diff: (parsed as any).diff,
      rationale: (parsed as any).rationale,
    };
  }

  throw new Error(
    `haiku-diff: JSON missing required keys {diff, rationale}: ${truncate(cleaned, 200)}`,
  );
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  return fenced ? fenced[1].trim() : text.trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…';
}
