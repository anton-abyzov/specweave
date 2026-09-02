/**
 * `specweave update` must add the 2.0 runtime-state ignores to projects that
 * were initialised before they existed — without touching user content.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureSpecweaveGitignoreEntries } from '../../../../../src/cli/helpers/init/gitignore-generator.js';
import { ensureGitattributes, LEDGER_MERGE_ATTRIBUTE } from '../../../../../src/cli/helpers/init/directory-structure.js';

const dirs: string[] = [];
const mk = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gitignore-2-'));
  dirs.push(d);
  return d;
};
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true }); });

const REQUIRED = [
  '.specweave/state/',
  '.specweave/logs/',
  '.specweave/jobs/',
  '.specweave/cache/',
  '.specweave/backups/',
  '.specweave/increments/**/reports/artifacts/',
  '.claude/worktrees/',
];

describe('ensureSpecweaveGitignoreEntries', () => {
  it('adds every 2.0 entry and preserves user content', () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n.env\n');
    const { added } = ensureSpecweaveGitignoreEntries(dir);
    const content = fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.env');
    for (const entry of REQUIRED) expect(content.split('\n')).toContain(entry);
    expect(added.length).toBeGreaterThan(0);
  });

  it('is idempotent and skips lines that already exist', () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, '.gitignore'), '.specweave/state/\n');
    ensureSpecweaveGitignoreEntries(dir);
    const first = fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8');
    expect(first.split('\n').filter((l) => l === '.specweave/state/')).toHaveLength(1);

    const second = ensureSpecweaveGitignoreEntries(dir);
    expect(second.added).toEqual([]);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8')).toBe(first);
  });

  it('creates .gitignore when the project has none', () => {
    const dir = mk();
    ensureSpecweaveGitignoreEntries(dir);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8')).toContain('.specweave/state/');
  });
});

describe('ensureGitattributes', () => {
  it('appends the ledger merge attribute once, keeping user rules', () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, '.gitattributes'), '*.png binary\n');
    ensureGitattributes(dir, path.join(dir, 'missing.template'));
    ensureGitattributes(dir, path.join(dir, 'missing.template'));
    const lines = fs.readFileSync(path.join(dir, '.gitattributes'), 'utf-8').split('\n');
    expect(lines).toContain('*.png binary');
    expect(lines.filter((l) => l.trim() === LEDGER_MERGE_ATTRIBUTE)).toHaveLength(1);
  });
});
