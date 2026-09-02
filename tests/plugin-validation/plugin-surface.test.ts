/**
 * Plugin surface guard (2.0).
 *
 * The `sw` plugin is exactly 10 skills, 1 closer agent and no commands/ namespace.
 * Every 1.x validation suite in this folder asserted the opposite surface (51 skills,
 * 73 commands, per-provider sync skills, judge-llm, team-lead/team-build) and was
 * deleted with it; this file is the replacement. Reference-level checks
 * (`specweave <cmd>` / `sw:<name>` resolvability, description length, forbidden
 * frontmatter keys) live in scripts/lint-skills.mjs and its test.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pluginDir = join(projectRoot, 'plugins', 'specweave');
const skillsDir = join(pluginDir, 'skills');

const CORE_SKILLS = [
  'auto', 'brainstorm', 'do', 'done', 'handoff', 'increment', 'qa', 'review', 'sync', 'team',
];

/** Skills whose side effects are too big to fire on a model's hunch. */
const NO_MODEL_INVOCATION = ['done', 'handoff', 'auto'];

function skillBody(name: string): string {
  return readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf-8');
}

describe('sw plugin surface', () => {
  it('ships exactly the 10 core skills', () => {
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual([...CORE_SKILLS].sort());
  });

  it('every core skill has a SKILL.md', () => {
    for (const name of CORE_SKILLS) {
      expect(existsSync(join(skillsDir, name, 'SKILL.md')), `${name}/SKILL.md`).toBe(true);
    }
  });

  it('has no commands/ namespace (deterministic work is CLI work)', () => {
    expect(existsSync(join(pluginDir, 'commands'))).toBe(false);
  });

  it('ships only the closer agent', () => {
    const agents = readdirSync(join(pluginDir, 'agents'))
      .filter((f) => f.endsWith('.md'))
      .sort();
    expect(agents).toEqual(['sw-closer.md']);
  });

  it('marks the destructive skills disable-model-invocation', () => {
    for (const name of NO_MODEL_INVOCATION) {
      expect(skillBody(name), `${name} must opt out of model invocation`).toMatch(
        /^disable-model-invocation:\s*true$/m,
      );
    }
  });

  it('leaves the other skills model-invocable', () => {
    for (const name of CORE_SKILLS.filter((n) => !NO_MODEL_INVOCATION.includes(n))) {
      expect(skillBody(name)).not.toMatch(/^disable-model-invocation:/m);
    }
  });

  it('the increment skill drives supersede through the flag the CLI registers', () => {
    const bin = readFileSync(join(projectRoot, 'bin', 'specweave.js'), 'utf-8');
    const start = bin.indexOf(".command('create-increment");
    expect(start).toBeGreaterThan(-1);
    const next = bin.indexOf('.command(', start + 10);
    const createBlock = bin.slice(start, next === -1 ? undefined : next);
    const registered = new Set(
      [...createBlock.matchAll(/\.option\('(--[a-z-]+)/g)].map((m) => m[1]),
    );
    expect(registered.has('--supersedes')).toBe(true);

    const skill = skillBody('increment');
    const lines = skill.split('\n');
    const from = lines.findIndex((l) => l.includes('specweave create-increment'));
    expect(from, 'increment skill has no create-increment example').toBeGreaterThan(-1);
    const to = lines.findIndex((l, i) => i > from && l.trim() === '```');
    const block = lines.slice(from, to === -1 ? undefined : to).join('\n');
    const used = [...block.matchAll(/--[a-z][a-z-]*/g)].map((m) => m[0]);
    expect(used).toContain('--supersedes');
    for (const flag of used) {
      expect(registered.has(flag), `${flag} is not registered on create-increment`).toBe(true);
    }
    // No "the CLI does not have it yet" workaround: supersede is one atomic call.
    expect(skill).not.toMatch(/once the CLI ships/i);
    expect(skill).not.toMatch(/specweave abandon/);
  });

  it('moved the optional procedures out of the plugin', () => {
    const optional = join(projectRoot, 'skills-optional');
    const dirs = readdirSync(optional, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual(['debug', 'diagrams', 'e2e', 'release-expert', 'tdd-cycle']);
    for (const name of dirs) {
      expect(existsSync(join(skillsDir, name)), `${name} must not also ship in the plugin`).toBe(false);
    }
    expect(existsSync(join(optional, 'README.md'))).toBe(true);
  });
});
