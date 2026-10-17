/**
 * skills/sw-<name>/ is the only hand-edited skill source; the Claude plugin
 * copies under plugins/specweave/skills/<name>/ (core) and
 * plugins/specweave/skills-optional/<name>/ (opt-in) are generated from it by
 * scripts/build/generate-skills.mjs. These tests make drift impossible to merge.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GENERATOR = path.join(REPO_ROOT, 'scripts', 'build', 'generate-skills.mjs');

type Generator = {
  SKILL_NAMES: string[];
  checkPluginSkills: (root: string) => string[];
  writePluginSkills: (root: string) => string[];
  toPluginSkill: (content: string, name: string) => string;
};
const load = async (): Promise<Generator> => (await import(GENERATOR)) as Generator;

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

function runCheck(root?: string): { code: number; out: string } {
  const args = [GENERATOR, '--check', ...(root ? ['--root', root] : [])];
  try {
    const out = execFileSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

/** A scratch checkout holding a copy of skills/ and the generated plugin skills. */
function scratchCheckout(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-gen-'));
  tmpDirs.push(root);
  fs.cpSync(path.join(REPO_ROOT, 'skills'), path.join(root, 'skills'), { recursive: true });
  for (const entry of ['skills', 'skills-optional', 'skills-catalog.json']) {
    fs.cpSync(path.join(REPO_ROOT, 'plugins', 'specweave', entry), path.join(root, 'plugins', 'specweave', entry), { recursive: true });
  }
  return root;
}

describe('generate-skills', () => {
  it('ships 6 core skills in the plugin and 5 opt-in skills beside it', async () => {
    const { SKILL_NAMES } = await load();
    expect([...SKILL_NAMES].sort()).toEqual(
      ['auto', 'do', 'done', 'glossary', 'grill-me', 'handoff', 'increment', 'jev', 'project', 'review', 'sync'],
    );
    const dirs = (sub: string) => fs.readdirSync(path.join(REPO_ROOT, 'plugins', 'specweave', sub)).sort();
    expect(dirs('skills')).toEqual(['auto', 'do', 'done', 'handoff', 'increment', 'review']);
    expect(dirs('skills-optional')).toEqual(['glossary', 'grill-me', 'jev', 'project', 'sync']);
    const catalog = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'specweave', 'skills-catalog.json'), 'utf-8'));
    expect(catalog).toEqual(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'skills', 'catalog.json'), 'utf-8')));
  });

  it('--check fails on a source skill missing from catalog.json', () => {
    const root = scratchCheckout();
    fs.mkdirSync(path.join(root, 'skills', 'sw-extra'), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', 'sw-extra', 'SKILL.md'), '---\ndescription: x\n---\n');
    const { code, out } = runCheck(root);
    expect(code).toBe(1);
    expect(out).toContain('not in skills/catalog.json');
  });

  it('--check passes on the committed tree (run `npm run generate:skills` if this fails)', () => {
    const { code, out } = runCheck();
    expect(out).toContain('match skills/');
    expect(code).toBe(0);
  });

  it('--check fails when a plugin copy is edited by hand', () => {
    const root = scratchCheckout();
    const copy = path.join(root, 'plugins', 'specweave', 'skills', 'do', 'SKILL.md');
    fs.appendFileSync(copy, '\nhand edit\n');
    const { code, out } = runCheck(root);
    expect(code).toBe(1);
    expect(out).toContain('plugins/specweave/skills/do/SKILL.md: differs from its source');
  });

  it('--check fails on a plugin skill with no source, and the generator deletes it', async () => {
    const root = scratchCheckout();
    const stray = path.join(root, 'plugins', 'specweave', 'skills', 'qa');
    fs.mkdirSync(stray, { recursive: true });
    fs.writeFileSync(path.join(stray, 'SKILL.md'), '---\ndescription: old\n---\n');
    expect(runCheck(root).out).toContain('qa/SKILL.md: has no source in skills/');

    const { writePluginSkills, checkPluginSkills } = await load();
    expect(writePluginSkills(root)).toContain('removed skills/qa/SKILL.md');
    expect(fs.existsSync(stray)).toBe(false);
    expect(checkPluginSkills(root)).toEqual([]);
  });

  it('a source edit reaches the plugin copy, marked as generated and without a name', async () => {
    const root = scratchCheckout();
    fs.appendFileSync(path.join(root, 'skills', 'sw-review', 'SKILL.md'), '\nNew rule.\n');
    expect(runCheck(root).code).toBe(1);

    const { writePluginSkills } = await load();
    writePluginSkills(root);
    const copy = fs.readFileSync(path.join(root, 'plugins', 'specweave', 'skills', 'review', 'SKILL.md'), 'utf-8');
    expect(copy.endsWith('\nNew rule.\n')).toBe(true);
    expect(copy).toContain('Generated from skills/sw-review/SKILL.md');
    expect(copy).not.toMatch(/^name:/m);
    expect(runCheck(root).code).toBe(0);
  });

  it('rejects a source that pins name:', async () => {
    const { toPluginSkill } = await load();
    expect(() => toPluginSkill('---\nname: sw-do\ndescription: x\n---\nbody\n', 'do')).toThrow(/must not set name/);
  });
});
