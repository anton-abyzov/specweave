/**
 * Tests for skill-lint.ts (0669 Wave 3 / AC-US10-03).
 *
 * The linter enforces:
 *   - SKILL.md declaring `allowed-tools` MUST also include a `## Tool-Use Rationale`
 *     section (or `tool-use-rationale:` frontmatter key).
 *   - Retired 4.7 phrases (ULTRATHINK, thinking.budget_tokens, etc.) are flagged.
 */

import { describe, it, expect } from 'vitest';
import { lintSkillFile } from './skill-lint.js';

describe('skill-lint tool-use-rationale enforcement', () => {
  it('returns a lint error when SKILL.md has allowed-tools but no tool-use-rationale', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
---

# Test Skill

Body content without a rationale block.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /tool-use-rationale/i.test(e))).toBe(true);
  });

  it('returns no errors when both allowed-tools and tool-use-rationale are present', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
---

# Test Skill

## Tool-Use Rationale

- **Read**: Load spec.md context when AC IDs are referenced.
- **Grep**: Locate existing ACs to avoid duplication.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts the frontmatter-style tool-use-rationale key', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
tool-use-rationale: |
  Read loads context, Grep locates ACs.
---

# Body
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });

  it('flags retired phrases regardless of rationale presence', async () => {
    const content = `---
name: sw/test
---

ULTRATHINK BY DEFAULT — think carefully and step-by-step.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /ULTRATHINK/i.test(e))).toBe(true);
  });

  it('flags thinking.budget_tokens retired phrase', async () => {
    const content = `---
name: sw/test
---

Sets thinking.budget_tokens = 4096 during review.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /thinking\.budget_tokens/.test(e))).toBe(true);
  });

  it('returns no errors when a SKILL.md has no allowed-tools and no retired phrases', async () => {
    const content = `---
name: sw/test
---

# Plain skill without tool declarations.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });
});

/**
 * Repo-surface lint (2.0): scripts/lint-skills.mjs is the guard that keeps the shipped
 * skill surface honest — no `name:` frontmatter, no model/effort/context pins, short
 * descriptions, and every `specweave <cmd>` / `sw:<name>` reference resolvable.
 */
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
