/**
 * Tests for scripts/lint-skills.mjs — the one linter CI runs (.github/workflows/skill-lint.yml).
 *
 * It keeps the shipped skill surface honest — no `name:` frontmatter, no model/effort/context
 * pins, short descriptions, every `specweave <cmd>` / `sw:<name>` reference resolvable — and
 * since 0669 it also owns the two checks that used to sit unused in `.lint/skill-lint.ts`:
 *   - retired 4.7 phrasing (ULTRATHINK, extended thinking, budget_tokens) is flagged
 *   - a SKILL.md declaring `allowed-tools` must also carry a `## Tool-Use Rationale` section
 *     (or a `tool-use-rationale:` frontmatter key)
 */

import { describe, it, expect } from 'vitest';
// @ts-expect-error — zero-dep .mjs linter, no type declarations by design
import { lintContent, lintRepo, readRegisteredCommands, readShippedSkills } from '../../../scripts/lint-skills.mjs';

const ctx = {
  commands: new Set(['verify', 'complete', 'task', 'status']),
  skills: new Set(['do', 'done', 'review']),
  isSkillFile: true,
};
const body = (fm: string, rest = '\n# Body\n') => `---\n${fm}\n---\n${rest}`;
const rules = (r: { errors: Array<{ rule: string }> }) => r.errors.map((e) => e.rule);

describe('lint-skills: shipped skill surface', () => {
  it('rejects a `name:` frontmatter key (the directory is the skill name)', () => {
    const r = lintContent('skills/x/SKILL.md', body('name: sw/x\ndescription: short'), ctx);
    expect(rules(r)).toContain('forbidden-key');
    expect(r.errors[0].line).toBe(2);
  });

  it('rejects model / effort / context pins', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short\nmodel: opus\neffort: xhigh\ncontext: fork'),
      ctx,
    );
    expect(r.errors.filter((e: { rule: string }) => e.rule === 'forbidden-key')).toHaveLength(3);
  });

  it('rejects a description longer than 200 characters', () => {
    const r = lintContent('skills/x/SKILL.md', body(`description: ${'x'.repeat(201)}`), ctx);
    expect(rules(r)).toContain('description-length');
  });

  it('accepts a description of exactly 200 characters', () => {
    const r = lintContent('skills/x/SKILL.md', body(`description: ${'x'.repeat(200)}`), ctx);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects a `specweave <cmd>` that is not registered in the CLI', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\nRun `specweave metrics` then `specweave verify`.\n'),
      ctx,
    );
    expect(rules(r)).toEqual(['unknown-cli']);
    expect(r.errors[0].message).toMatch(/specweave metrics/);
  });

  it('does not flag prose that merely mentions the CLI', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\nThe specweave CLI is optional; specweave commands are documented.\n'),
      ctx,
    );
    expect(r.errors).toHaveLength(0);
  });

  it('rejects an `sw:<name>` with no skill directory', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\nHand off to `sw:grill`, then `sw:done`.\n'),
      ctx,
    );
    expect(rules(r)).toEqual(['unknown-skill']);
    expect(r.errors[0].message).toMatch(/sw:grill/);
  });

  it('reads the real CLI command registry and the real skill list', () => {
    const commands = readRegisteredCommands();
    expect(commands.has('verify')).toBe(true);
    expect(commands.has('complete')).toBe(true);
    expect(commands.has('metrics')).toBe(false);

    const skills = readShippedSkills();
    for (const core of ['increment', 'do', 'done', 'review', 'team', 'handoff', 'sync', 'auto', 'brainstorm', 'qa']) {
      expect(skills.has(core), `core skill ${core} missing`).toBe(true);
    }
  });

  it('the shipped tree passes the linter', () => {
    const report = lintRepo();
    const failures = report.results
      .flatMap((r: { file: string; errors: Array<{ line: number; message: string }> }) =>
        r.errors.map((e) => `${r.file}:${e.line} ${e.message}`),
      );
    expect(failures).toEqual([]);
  });
});

describe('lint-skills: retired 4.7 phrasing', () => {
  it('flags "ULTRATHINK BY DEFAULT"', () => {
    const r = lintContent('skills/x/SKILL.md', body('description: short', '\n**ULTRATHINK BY DEFAULT** - validate.\n'), ctx);
    expect(rules(r)).toEqual(['retired-phrase']);
    expect(r.errors[0].message).toMatch(/ULTRATHINK BY DEFAULT/);
    expect(r.errors[0].line).toBe(5);
  });

  it('flags a bare "Ultrathink" regardless of case', () => {
    const r = lintContent('skills/x/SKILL.md', body('description: short', '\nUltrathink the plan first.\n'), ctx);
    expect(r.errors[0].message).toMatch(/Retired phrase "ULTRATHINK"/);
  });

  it('reports one error, not two, when the longer phrase matches', () => {
    const r = lintContent('skills/x/SKILL.md', body('description: short', '\nULTRATHINK BY DEFAULT\n'), ctx);
    expect(r.errors).toHaveLength(1);
  });

  it('flags "[Extended thinking: ...]" — the survivor a lowercase-only match missed', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\n[Extended thinking: this workflow enforces test-first development.]\n'),
      ctx,
    );
    expect(r.errors[0].message).toMatch(/extended thinking/);
  });

  it('flags thinking.budget_tokens and spawn-agents-anyway', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\nSets thinking.budget_tokens = 4096.\nEven for small work — spawn agents anyway.\n'),
      ctx,
    );
    expect(rules(r)).toEqual(['retired-phrase', 'retired-phrase']);
  });

  it('does not flag a phrase quoted inside a fenced code block', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\n```\nULTRATHINK BY DEFAULT - the old wording\n```\n'),
      ctx,
    );
    expect(r.errors).toHaveLength(0);
  });

  it('does not flag a line that documents the retirement itself', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short', '\nRetired phrases: ULTRATHINK BY DEFAULT, extended thinking, budget_tokens:.\n'),
      ctx,
    );
    expect(r.errors).toHaveLength(0);
  });

  it('checks non-skill files too (agents, reference, PLUGIN.md)', () => {
    const r = lintContent('plugins/specweave/agents/x.md', 'Use extended thinking here.\n', {
      ...ctx,
      isSkillFile: false,
    });
    expect(rules(r)).toEqual(['retired-phrase']);
  });
});

describe('lint-skills: tool-use-rationale enforcement', () => {
  it('returns a lint error when SKILL.md has allowed-tools but no tool-use-rationale', () => {
    const r = lintContent('skills/x/SKILL.md', body('description: short\nallowed-tools: Read, Grep'), ctx);
    expect(rules(r)).toEqual(['tool-use-rationale']);
    expect(r.errors[0].line).toBe(3);
  });

  it('returns no errors when both allowed-tools and a rationale section are present', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body(
        'description: short\nallowed-tools: Read, Grep',
        '\n## Tool-Use Rationale\n\n- **Read**: load spec.md context.\n- **Grep**: locate existing ACs.\n',
      ),
      ctx,
    );
    expect(r.errors).toHaveLength(0);
  });

  it('accepts the frontmatter-style tool-use-rationale key', () => {
    const r = lintContent(
      'skills/x/SKILL.md',
      body('description: short\nallowed-tools: Read, Grep\ntool-use-rationale: Read loads context, Grep locates ACs.'),
      ctx,
    );
    expect(r.errors).toHaveLength(0);
  });

  it('says nothing about rationale when the skill declares no tools', () => {
    const r = lintContent('skills/x/SKILL.md', body('description: short'), ctx);
    expect(r.errors).toHaveLength(0);
  });
});
