/**
 * README surface guard (2.0).
 *
 * README.md is in package.json `files`, so it is the npm and GitHub landing page.
 * It shipped through the 2.0 skill cull still advertising `sw:team-lead`,
 * `sw:code-reviewer` and "100+ Skills" because scripts/lint-skills.mjs only owns
 * plugin files — nothing checked the one document every new user reads first.
 * These tests close that gap by running the same reference rules over README.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// @ts-expect-error - zero-dependency linter, no type declarations
import { readRegisteredCommands, readShippedSkills, lintContent } from '../../scripts/lint-skills.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readme = readFileSync(join(projectRoot, 'README.md'), 'utf-8');
const marketplace = JSON.parse(
  readFileSync(join(projectRoot, 'plugins', 'specweave', 'marketplace.json'), 'utf-8'),
);

/** Skill directories only — `sw:<name>` may also resolve to an agent, which README never sells. */
const coreSkills = readdirSync(join(projectRoot, 'plugins', 'specweave', 'skills'), {
  withFileTypes: true,
})
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const shipped: Set<string> = readShippedSkills(projectRoot);
const commands: Set<string> = readRegisteredCommands(projectRoot);
const removed = new Set(
  Object.keys(marketplace.removedIn2_0.map).map((slug: string) => slug.replace(/^sw:/, '')),
);

/** Everything except the "Upgrading from 1.x" table, which names dead slugs on purpose. */
function liveProse(): string {
  const start = readme.indexOf('## Upgrading from 1.x');
  if (start === -1) return readme;
  const end = readme.indexOf('\n## ', start + 1);
  return readme.slice(0, start) + (end === -1 ? '' : readme.slice(end));
}

function section(heading: string): string {
  const start = readme.indexOf(heading);
  expect(start, `README is missing "${heading}"`).toBeGreaterThan(-1);
  const end = readme.indexOf('\n## ', start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
}

function slugsIn(text: string): string[] {
  return [...text.matchAll(/\bsw:([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
}

describe('README surface', () => {
  it('references only shipped skills and registered CLI commands', () => {
    const { errors } = lintContent('README.md', liveProse(), {
      commands,
      skills: shipped,
      isSkillFile: false,
    });
    expect(errors).toEqual([]);
  });

  it('sells exactly the 10 shipped skills in Core Commands', () => {
    const advertised = [...new Set(slugsIn(section('## Core Commands')))].sort();
    expect(advertised).toEqual(coreSkills);
  });

  it('names a 2.0 replacement for every dead slug it still mentions', () => {
    for (const slug of new Set(slugsIn(readme))) {
      if (shipped.has(slug)) continue;
      expect(removed.has(slug), `sw:${slug} is neither shipped nor listed in removedIn2_0`).toBe(true);
      expect(section('## Upgrading from 1.x')).toContain(`sw:${slug}`);
    }
  });
});
