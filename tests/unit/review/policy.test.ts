import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  describePolicy,
  familyOfModel,
  parseReviewSection,
  parseReviewer,
  policyAccepts,
  resolveReviewPolicy,
} from '../../../src/core/review/policy.js';
import { commandForPolicy, reviewersFrom } from '../../../src/core/review/reviewer.js';

let root: string;
let inc: string;

const spec = (review?: string) =>
  fs.writeFileSync(path.join(inc, 'spec.md'), ['# 0001 Demo', '', '## Approach', '', 'x', '', ...(review === undefined ? [] : ['## Review', review, '']), '## Tasks', ''].join('\n'));
const config = (review: unknown) =>
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ review }));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-policy-'));
  inc = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(inc, { recursive: true });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('review policy format', () => {
  it('maps model ids and tool names to families', () => {
    expect(familyOfModel('gpt-6.1-sol')).toBe('openai');
    expect(familyOfModel('codex')).toBe('openai');
    expect(familyOfModel('claude-opus-5-5')).toBe('claude');
    expect(familyOfModel('claude-sonnet-5.5')).toBe('claude');
    expect(familyOfModel('gemini-4-carbon')).toBe('google');
    expect(familyOfModel('grok-4.7')).toBe('xai');
    expect(familyOfModel('muse-wonder-1.0')).toBe('meta');
  });

  it('reads a family, a family with a model, a bare model and cross-family', () => {
    expect(parseReviewer('openai (gpt-6.1-sol)')).toEqual({ family: 'openai', model: 'gpt-6.1-sol' });
    expect(parseReviewer('OpenAI')).toEqual({ family: 'openai' });
    expect(parseReviewer('gpt-6.1-sol')).toEqual({ family: 'openai', model: 'gpt-6.1-sol' });
    expect(parseReviewer('`claude-opus-5-5`')).toEqual({ family: 'claude', model: 'claude-opus-5-5' });
    expect(parseReviewer('cross-family')).toEqual({ family: 'cross-family' });
  });

  it('parses the ## Review section and stops at the next heading', () => {
    const s = parseReviewSection('# T\n\n## Review\n- Reviewer: openai (gpt-6.1-sol)\n- **Depth**: deep  # Sol at xhigh\n- Required: yes\n\n## Tasks\n- Required: no\n');
    expect(s).toEqual({ family: 'openai', model: 'gpt-6.1-sol', depth: 'deep', required: true });
    expect(parseReviewSection('# T\n\n## Approach\n')).toBeUndefined();
  });
});

describe('resolveReviewPolicy', () => {
  it('defaults to cross-family, standard, not required', () => {
    spec();
    expect(resolveReviewPolicy(root, inc)).toEqual({
      family: 'cross-family', depth: 'standard', required: false,
      sources: { reviewer: 'default', depth: 'default', required: 'default' },
    });
  });

  it('review.crossModel makes a cross-family review required', () => {
    spec();
    config({ crossModel: true });
    expect(resolveReviewPolicy(root, inc)).toMatchObject({ family: 'cross-family', required: true, sources: { required: 'crossModel' } });
  });

  it('review.policy sets each field; the spec section overrides field by field', () => {
    config({ policy: { reviewer: 'openai', depth: 'deep', required: true } });
    spec('- Reviewer: claude (claude-opus-5-5)');
    expect(resolveReviewPolicy(root, inc)).toEqual({
      family: 'claude', model: 'claude-opus-5-5', depth: 'deep', required: true,
      sources: { reviewer: 'spec', depth: 'config', required: 'config' },
    });
    spec('- Required: no');
    expect(resolveReviewPolicy(root, inc)).toMatchObject({ family: 'openai', required: false, sources: { reviewer: 'config', required: 'spec' } });
  });

  it('accepts reviewers by family, pinned model and cross-family against the author', () => {
    expect(policyAccepts({ family: 'cross-family' }, { family: 'openai' }, 'claude')).toBe(true);
    expect(policyAccepts({ family: 'cross-family' }, { family: 'claude', model: 'claude-sonnet-5-5' }, 'claude')).toBe(false);
    expect(policyAccepts({ family: 'cross-family' }, { family: 'unknown' }, undefined)).toBe(false);
    expect(policyAccepts({ family: 'openai' }, { family: 'openai', model: 'gpt-6-luna' }, 'claude')).toBe(true);
    expect(policyAccepts({ family: 'openai', model: 'gpt-6.1-sol' }, { family: 'openai', model: 'gpt-6-luna' }, 'claude')).toBe(false);
    expect(policyAccepts({ family: 'openai', model: 'gpt-6.1-sol' }, { family: 'openai', model: 'GPT-6.1-Sol' }, 'claude')).toBe(true);
  });

  it('describes the policy in words', () => {
    expect(describePolicy({ family: 'openai', model: 'gpt-6.1-sol', depth: 'deep', required: true, sources: { reviewer: 'spec', depth: 'spec', required: 'spec' } }))
      .toBe('an OpenAI review with gpt-6.1-sol, deep depth');
    expect(describePolicy({ family: 'cross-family', depth: 'standard', required: false, sources: { reviewer: 'default', depth: 'default', required: 'default' } }, 'claude'))
      .toBe('a review by another family than the author (claude), standard depth');
  });
});

describe('policy on the built-in reviewers', () => {
  const [codex, claude] = reviewersFrom({});
  it('a deep policy runs Codex at xhigh and a pinned model replaces the default', () => {
    const cmd = commandForPolicy(codex, { model: 'gpt-6-astra', depth: 'deep' });
    expect(cmd).toContain('-m gpt-6-astra');
    expect(cmd).toContain('model_reasoning_effort="xhigh"');
    expect(commandForPolicy(claude, { model: 'claude-opus-5-5' })).toContain('--model claude-opus-5-5');
  });
  it('never puts a model id with shell characters into the command, and leaves configured reviewers alone', () => {
    expect(commandForPolicy(codex, { model: 'x; rm -rf ~' })).toContain('-m gpt-6.1-sol');
    const [custom] = reviewersFrom({ reviewers: { codex: { command: 'my-codex -m foo' } } });
    expect(commandForPolicy(custom, { model: 'bar', depth: 'deep' })).toBe('my-codex -m foo');
  });
});
