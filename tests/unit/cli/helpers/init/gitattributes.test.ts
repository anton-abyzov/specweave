import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureGitattributes, LEDGER_MERGE_ATTRIBUTE } from '../../../../../src/cli/helpers/init/directory-structure.js';

describe('ensureGitattributes', () => {
  let dir: string;
  let templatePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-gitattr-'));
    templatePath = path.join(dir, 'template', '.gitattributes.template');
    fs.mkdirSync(path.dirname(templatePath), { recursive: true });
    fs.writeFileSync(templatePath, `* text=auto eol=lf\n${LEDGER_MERGE_ATTRIBUTE}\n`, 'utf-8');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const target = () => path.join(dir, '.gitattributes');

  it('copies the template when no .gitattributes exists', () => {
    ensureGitattributes(dir, templatePath);
    expect(fs.readFileSync(target(), 'utf-8')).toContain(LEDGER_MERGE_ATTRIBUTE);
  });

  it('writes the ledger attribute even without a template', () => {
    ensureGitattributes(dir, path.join(dir, 'missing.template'));
    expect(fs.readFileSync(target(), 'utf-8').trim()).toBe(LEDGER_MERGE_ATTRIBUTE);
  });

  it('appends to an existing user file without clobbering it', () => {
    fs.writeFileSync(target(), '*.png binary\n', 'utf-8');
    ensureGitattributes(dir, templatePath);
    const content = fs.readFileSync(target(), 'utf-8');
    expect(content).toContain('*.png binary');
    expect(content).toContain(LEDGER_MERGE_ATTRIBUTE);
  });

  it('handles a file with no trailing newline', () => {
    fs.writeFileSync(target(), '*.png binary', 'utf-8');
    ensureGitattributes(dir, templatePath);
    const lines = fs.readFileSync(target(), 'utf-8').split('\n');
    expect(lines).toContain('*.png binary');
    expect(lines).toContain(LEDGER_MERGE_ATTRIBUTE);
  });

  it('is idempotent — re-running never duplicates the attribute', () => {
    ensureGitattributes(dir, templatePath);
    ensureGitattributes(dir, templatePath);
    ensureGitattributes(dir, templatePath);
    const hits = fs.readFileSync(target(), 'utf-8').split('\n').filter((l) => l.trim() === LEDGER_MERGE_ATTRIBUTE);
    expect(hits).toHaveLength(1);
  });
});
