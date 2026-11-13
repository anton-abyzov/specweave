/**
 * Review policy: which model family reviews an increment, how deep, and whether
 * closure waits for that review. Layers, strongest first:
 *
 *   1. spec.md `## Review` (`- Reviewer: openai (gpt-6.1-sol)`, `- Depth: deep`,
 *      `- Required: yes`), set per increment for complex work;
 *   2. `.specweave/config.json` `review.policy` (`reviewer`, `depth`, `required`);
 *   3. `review.crossModel: true`, the older switch: required, cross-family;
 *   4. the default: cross-family, standard depth, not required.
 *
 * The SpecWithCode app parses the same `## Review` section with its own copy
 * of this format; keep the two in step.
 *
 * @module core/review/policy
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewConfiguration } from '../config/types.js';

export type ReviewDepth = 'standard' | 'deep';
export type ReviewPolicySource = 'spec' | 'config' | 'crossModel' | 'default';

/** Families a policy may name. `cross-family` is any family other than the author's. */
export const REVIEW_FAMILIES = ['openai', 'claude', 'google', 'xai', 'meta'] as const;

export interface ReviewPolicy {
  /** A family from REVIEW_FAMILIES, or `cross-family`. */
  family: string;
  /** A model id the policy pins, such as `gpt-6.1-sol`; absent means any model of the family. */
  model?: string;
  depth: ReviewDepth;
  required: boolean;
  /** Which layer set each field. */
  sources: { reviewer: ReviewPolicySource; depth: ReviewPolicySource; required: ReviewPolicySource };
}

export interface ReviewSection {
  family?: string;
  model?: string;
  depth?: ReviewDepth;
  required?: boolean;
}

/**
 * Model family of a model id or tool name: `gpt-6.1-sol` and `codex` are openai,
 * `claude-opus-5-5` and `sonnet` are claude. Anything else is returned lowercased.
 */
export function familyOfModel(id: string): string {
  const t = id.trim().toLowerCase();
  if (/^(claude|anthropic|opus|sonnet|haiku|fable)/.test(t)) return 'claude';
  if (/^(codex|openai|gpt|chatgpt|o[0-9])/.test(t)) return 'openai';
  if (/^(grok|xai)/.test(t)) return 'xai';
  if (/^(gemini|google)/.test(t)) return 'google';
  if (/^(muse|meta|llama)/.test(t)) return 'meta';
  return t;
}

/** `openai (gpt-6.1-sol)`, `openai`, `gpt-6.1-sol`, `cross-family`, `any other family`. */
export function parseReviewer(value: string): { family?: string; model?: string } {
  const v = value.trim().replace(/[`*_]/g, '');
  if (!v) return {};
  const paren = v.match(/^([^()]+?)\s*\(([^()]+)\)\s*$/);
  const head = (paren ? paren[1] : v).trim().toLowerCase();
  const model = paren ? paren[2].trim() : undefined;
  if (/^(cross[- ]?family|cross[- ]?model|any other family|other family|auto)$/.test(head)) {
    return { family: 'cross-family', ...(model ? { model } : {}) };
  }
  if ((REVIEW_FAMILIES as readonly string[]).includes(head)) return { family: head, ...(model ? { model } : {}) };
  // A bare model id: its family comes from the id.
  return { family: familyOfModel(head), model: paren ? model : v.trim() };
}

function parseDepth(value: string): ReviewDepth | undefined {
  const v = value.trim().toLowerCase();
  if (/^(deep|xhigh|ultra|high|max|thorough)$/.test(v)) return 'deep';
  if (/^(standard|normal|regular|default|medium)$/.test(v)) return 'standard';
  return undefined;
}

function parseRequired(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (/^(yes|true|required|on|y)$/.test(v)) return true;
  if (/^(no|false|optional|off|n)$/.test(v)) return false;
  return undefined;
}

/** The `## Review` section of a spec, or undefined when it has none. */
export function parseReviewSection(spec: string): ReviewSection | undefined {
  const lines = spec.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^##\s+review\s*$/i.test(l.trim()));
  if (start < 0) return undefined;
  const section: ReviewSection = {};
  for (let i = start + 1; i < lines.length && !/^#{1,2}\s/.test(lines[i]); i++) {
    const m = lines[i].match(/^\s*[-*]\s*\**([A-Za-z ]+?)\**\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = m[2].replace(/\s+#.*$/, '');
    if (key === 'reviewer' || key === 'reviewed by') Object.assign(section, parseReviewer(value));
    else if (key === 'depth' || key === 'effort') {
      const depth = parseDepth(value);
      if (depth) section.depth = depth;
    } else if (key === 'required' || key === 'required to close') {
      const required = parseRequired(value);
      if (required !== undefined) section.required = required;
    }
  }
  return section;
}

function readConfig(projectRoot: string): ReviewConfiguration {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf8')) as { review?: ReviewConfiguration };
    return cfg.review && typeof cfg.review === 'object' ? cfg.review : {};
  } catch {
    return {};
  }
}

function readSpec(incrementDir: string): string {
  try {
    return fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf8');
  } catch {
    return '';
  }
}

/** The effective policy for an increment, from its spec, the project config and the defaults. */
export function resolveReviewPolicy(projectRoot: string, incrementDir: string, config?: ReviewConfiguration): ReviewPolicy {
  const review = config ?? readConfig(projectRoot);
  const spec = parseReviewSection(readSpec(incrementDir)) ?? {};
  const fromConfig: ReviewSection = {};
  const p = review.policy;
  if (p && typeof p === 'object') {
    if (typeof p.reviewer === 'string') Object.assign(fromConfig, parseReviewer(p.reviewer));
    if (typeof p.depth === 'string') {
      const depth = parseDepth(p.depth);
      if (depth) fromConfig.depth = depth;
    }
    if (typeof p.required === 'boolean') fromConfig.required = p.required;
  }

  let family = 'cross-family';
  let model: string | undefined;
  let reviewerSource: ReviewPolicySource = 'default';
  if (spec.family) {
    family = spec.family; model = spec.model; reviewerSource = 'spec';
  } else if (fromConfig.family) {
    family = fromConfig.family; model = fromConfig.model; reviewerSource = 'config';
  } else if (review.crossModel === true) {
    reviewerSource = 'crossModel';
  }

  let depth: ReviewDepth = 'standard';
  let depthSource: ReviewPolicySource = 'default';
  if (spec.depth) { depth = spec.depth; depthSource = 'spec'; }
  else if (fromConfig.depth) { depth = fromConfig.depth; depthSource = 'config'; }

  let required = false;
  let requiredSource: ReviewPolicySource = 'default';
  if (spec.required !== undefined) { required = spec.required; requiredSource = 'spec'; }
  else if (fromConfig.required !== undefined) { required = fromConfig.required; requiredSource = 'config'; }
  else if (review.crossModel === true) { required = true; requiredSource = 'crossModel'; }

  return {
    family,
    ...(model ? { model } : {}),
    depth,
    required,
    sources: { reviewer: reviewerSource, depth: depthSource, required: requiredSource },
  };
}

/** Whether a reviewer of `family` (and `model`) satisfies the policy for work `authorFamily` wrote. */
export function policyAccepts(policy: Pick<ReviewPolicy, 'family' | 'model'>, reviewer: { family: string; model?: string }, authorFamily: string | undefined): boolean {
  if (policy.model) {
    if (!reviewer.model || reviewer.model.toLowerCase() !== policy.model.toLowerCase()) return false;
  }
  if (policy.family === 'cross-family') {
    // An unknown author cannot be compared; any recorded family other than "unknown" counts.
    return authorFamily === undefined ? reviewer.family !== 'unknown' : reviewer.family !== authorFamily;
  }
  return reviewer.family === policy.family;
}

/** `OpenAI review (gpt-6.1-sol, deep)`, `cross-family review (standard)`. */
export function describePolicy(policy: ReviewPolicy, authorFamily?: string): string {
  const who = policy.family === 'cross-family'
    ? `a review by another family than the author${authorFamily ? ` (${authorFamily})` : ''}`
    : `a ${FAMILY_LABEL[policy.family] ?? policy.family} review`;
  return `${who}${policy.model ? ` with ${policy.model}` : ''}, ${policy.depth} depth`;
}

export const FAMILY_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  google: 'Google',
  xai: 'xAI',
  meta: 'Meta',
};
