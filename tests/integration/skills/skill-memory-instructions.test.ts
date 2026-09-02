/**
 * Skill-memory / DCI guard (2.0).
 *
 * 1.x loaded per-skill "memories" (`.specweave/skill-memories/<skill>.md`) through a
 * `## Project Overrides` block, and earlier still through DCI shell blocks
 * (`` !`…` ``) and a `skill-memories.sh` script. 2.0 drops the whole `reflect` feature:
 * the memories were stale and duplicated, and a shell block in a SKILL.md is not
 * portable to Windows or to other vendors.
 *
 * This test is the negative guard — it fails if any of that comes back.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = process.cwd();
const SKILL_ROOTS = [
  path.join(repoRoot, 'plugins/specweave/skills'),
  path.join(repoRoot, 'skills-optional'),
];

function skillFiles(): string[] {
  const out: string[] = [];
  for (const root of SKILL_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(root, entry.name, 'SKILL.md');
      if (fs.existsSync(file)) out.push(file);
    }
  }
  return out;
}

describe('skill memories and DCI are gone (2.0)', () => {
  const files = skillFiles();

  it('finds the shipped skills', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('no SKILL.md references .specweave/skill-memories/', () => {
    const offenders = files.filter((f) => fs.readFileSync(f, 'utf-8').includes('skill-memories'));
    expect(offenders.map((f) => path.relative(repoRoot, f))).toEqual([]);
  });

  it('no SKILL.md carries a "## Project Overrides" block', () => {
    const offenders = files.filter((f) =>
      fs.readFileSync(f, 'utf-8').includes('## Project Overrides'),
    );
    expect(offenders.map((f) => path.relative(repoRoot, f))).toEqual([]);
  });

  it('no SKILL.md uses a DCI shell block (not portable to Windows / other vendors)', () => {
    const offenders = files.filter((f) => /^!`/m.test(fs.readFileSync(f, 'utf-8')));
    expect(offenders.map((f) => path.relative(repoRoot, f))).toEqual([]);
  });

  it('skill-memories.sh stays deleted', () => {
    expect(fs.existsSync(path.join(repoRoot, 'plugins/specweave/scripts/skill-memories.sh'))).toBe(false);
  });
});
