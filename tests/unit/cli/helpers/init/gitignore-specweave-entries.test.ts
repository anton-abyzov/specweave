/**
 * `specweave update` must add the 2.0 runtime-state ignores to projects that
 * were initialised before they existed — without touching user content.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
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

  it('removes the 3.0.0-3.0.2 negations: old logs stay ignored, .txt evidence stays committable', () => {
    const dir = mk();
    const broad = '!.specweave/increments/**/reports/*.log';
    const scoped = '!.specweave/increments/**/reports/task-T-*.log';
    fs.writeFileSync(path.join(dir, '.gitignore'), `*.log\n\n# SpecWeave (added by specweave update)\n.specweave/state/\n${broad}\n${scoped}\n`);
    const reports = path.join('.specweave', 'increments', '0653-old', 'reports');
    fs.mkdirSync(path.join(dir, reports), { recursive: true });
    const oldLogs = [path.join(reports, 'run.log'), path.join(reports, 'task-T-01.log')];
    for (const log of oldLogs) fs.writeFileSync(path.join(dir, log), 'old run\n');
    const evidence = path.join(reports, 'task-T-02.txt');
    fs.writeFileSync(path.join(dir, evidence), '$ npm test\n# exit 0\n');
    execFileSync('git', ['init', '-q', dir]);

    const { added } = ensureSpecweaveGitignoreEntries(dir);

    const lines = fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8').split('\n');
    expect(lines).not.toContain(broad);
    expect(lines).not.toContain(scoped);
    expect(added.filter((l) => l.startsWith('!'))).toEqual([]);
    expect(lines).toContain('*.log');
    for (const log of oldLogs) {
      expect(spawnSync('git', ['-C', dir, 'check-ignore', '-q', log]).status, log).toBe(0);
    }
    expect(spawnSync('git', ['-C', dir, 'check-ignore', '-q', evidence]).status).toBe(1);
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
