import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { HygieneChecker, MAX_TRACKED_FILE_BYTES } from '../../../../../src/core/doctor/checkers/hygiene-checker.js';

const git = (dir: string, ...args: string[]) =>
  execFileSync('git', args, { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });

describe('HygieneChecker', () => {
  let dir: string;
  const checker = new HygieneChecker();
  const find = (checks: Array<{ name: string }>, needle: string) =>
    checks.find((c) => c.name.includes(needle))!;

  beforeEach(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-doctor-hyg-')));
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'Test');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('warns when .npmrc is missing', async () => {
    const check = find((await checker.check(dir, {})).checks, '.npmrc');
    expect(check.status).toBe('warn');
    expect(check.message).toContain('no .npmrc');
  });

  it('warns when .npmrc does not set ignore-scripts=true', async () => {
    fs.writeFileSync(path.join(dir, '.npmrc'), 'registry=https://registry.npmjs.org\n');
    expect(find((await checker.check(dir, {})).checks, '.npmrc').status).toBe('warn');
  });

  it('passes when .npmrc sets ignore-scripts=true', async () => {
    fs.writeFileSync(path.join(dir, '.npmrc'), 'ignore-scripts=true\n');
    expect(find((await checker.check(dir, {})).checks, '.npmrc').status).toBe('pass');
  });

  it('passes when .specweave/state is untracked', async () => {
    fs.mkdirSync(path.join(dir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave', 'state', 'auto-mode.json'), '{}');
    expect(find((await checker.check(dir, {})).checks, 'Tracked state').status).toBe('pass');
  });

  it('warns and names the files when .specweave/state is committed', async () => {
    fs.mkdirSync(path.join(dir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave', 'state', 'auto-mode.json'), '{}');
    git(dir, 'add', '-f', '.specweave/state/auto-mode.json');

    const check = find((await checker.check(dir, {})).checks, 'Tracked state');
    expect(check.status).toBe('warn');
    expect(check.details?.[0]).toContain('auto-mode.json');
    expect(check.fixSuggestion).toContain('git rm -r --cached');
  });

  it('warns about tracked increment files over 5 MB', async () => {
    const inc = path.join(dir, '.specweave', 'increments', '0001-x');
    fs.mkdirSync(inc, { recursive: true });
    const big = path.join(inc, 'demo.mov');
    fs.writeFileSync(big, Buffer.alloc(MAX_TRACKED_FILE_BYTES + 1024));
    git(dir, 'add', '-f', '.specweave/increments/0001-x/demo.mov');

    const check = find((await checker.check(dir, {})).checks, 'Large increment');
    expect(check.status).toBe('warn');
    expect(check.details?.[0]).toContain('demo.mov');
  });

  it('passes when every tracked increment file is small', async () => {
    const inc = path.join(dir, '.specweave', 'increments', '0001-x');
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(inc, 'spec.md'), '# Spec\n');
    git(dir, 'add', '-f', '.specweave/increments/0001-x/spec.md');
    expect(find((await checker.check(dir, {})).checks, 'Large increment').status).toBe('pass');
  });

  it('skips the git checks outside a repository', async () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-nogit-'));
    try {
      const checks = (await checker.check(plain, {})).checks;
      expect(find(checks, 'Tracked state').status).toBe('skip');
      expect(find(checks, 'Large increment').status).toBe('skip');
    } finally {
      fs.rmSync(plain, { recursive: true, force: true });
    }
  });
});
