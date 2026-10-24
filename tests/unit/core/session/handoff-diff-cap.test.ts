/**
 * PreCompact diff cap: an automatic handoff writes at most 1 MB of diff (a
 * 10.8 MB dump was measured), the handoff document stays whole and names the
 * command that shows the rest; an explicit handoff keeps the whole diff.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { capDiff, AUTO_HANDOFF_DIFF_CAP_BYTES, FULL_DIFF_COMMAND } from '../../../../src/core/session/handoff-git-state.js';
import { writeAutoHandoff } from '../../../../src/core/hooks/handlers/pre-compact.js';
import { createContext } from '../../../../src/core/hooks/handlers/utils.js';
import { buildWorkHandoff } from '../../../../src/core/session/work-handoff.js';

// Built at runtime so secret scanners do not flag the fixture.
const FAKE_KEY = ['sk', 'ant', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('-');

const section = (name: string, lines: number) =>
  `diff --git a/${name} b/${name}\nnew file mode 100644\n--- /dev/null\n+++ b/${name}\n@@ -0,0 +1,${lines} @@\n` +
  Array.from({ length: lines }, (_, i) => `+line ${i} of ${name}`).join('\n') + '\n';

describe('capDiff', () => {
  it('returns a diff under the cap unchanged', () => {
    const diff = section('a.txt', 3) + section('b.txt', 3);
    expect(capDiff(diff, 10_000)).toEqual({ text: diff });
  });

  it('keeps whole file sections in order and names what it left out', () => {
    const a = section('a.txt', 50);
    const b = section('b.txt', 50);
    const c = section('c.txt', 50);
    const diff = a + b + c;
    const max = Buffer.byteLength(a + b) + 10;
    const { text, cap } = capDiff(diff, max);
    expect(text.startsWith(a + b)).toBe(true);
    expect(text).not.toContain('c.txt');
    expect(cap).toEqual({ shownBytes: Buffer.byteLength(a + b), totalBytes: Buffer.byteLength(diff), shownFiles: 2, totalFiles: 3 });
    expect(text).toContain(`# SpecWeave: diff capped at ${cap!.shownBytes} of ${cap!.totalBytes} bytes; 2 of 3 files shown whole.`);
    expect(text).toContain(`\`${FULL_DIFF_COMMAND}\``);
    expect(text).toContain('`git status --porcelain`');
  });

  it('cuts a single oversized section at a line end', () => {
    const diff = section('huge.txt', 5_000);
    const { text, cap } = capDiff(diff, 4_000);
    const body = text.slice(0, text.indexOf('# SpecWeave:'));
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(4_000);
    expect(body.endsWith('\n')).toBe(true);
    expect(diff.startsWith(body)).toBe(true);
    expect(cap).toMatchObject({ shownFiles: 0, totalFiles: 1 });
    expect(text).toContain('the first one cut at a line end');
  });

  it('gives identical bytes for identical input', () => {
    const diff = section('a.txt', 400) + section('b.txt', 400);
    const one = capDiff(diff, 9_000).text;
    const two = capDiff(diff, 9_000).text;
    expect(Buffer.from(one).equals(Buffer.from(two))).toBe(true);
  });
});

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-diffcap-'));
  const git = (...a: string[]) => execFileSync('git', a, { cwd: root, stdio: 'ignore' });
  git('init', '-q'); git('config', 'user.email', 't@example.com'); git('config', 'user.name', 'T'); git('checkout', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  git('add', 'a.txt'); git('commit', '-q', '-m', 'init');
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  const id = '0001-big';
  const d = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'metadata.json'), JSON.stringify({ id, status: 'active', type: 'feature' }));
  fs.writeFileSync(path.join(d, 'spec.md'), `# ${id}\n\n- [ ] AC-01 x\n`);
  fs.writeFileSync(path.join(d, 'tasks.md'), '### T-001: a\n**Status**: [ ] pending\n');
  fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids: [id] }));
  // About 2.1 MB of uncommitted edits; a secret in the first file that survives the cap.
  fs.appendFileSync(path.join(root, 'a.txt'), `token ${FAKE_KEY}\n`);
  fs.mkdirSync(path.join(root, 'gen'));
  const line = 'x'.repeat(99) + '\n';
  for (let i = 0; i < 40; i++) fs.writeFileSync(path.join(root, 'gen', `f${String(i).padStart(2, '0')}.txt`), line.repeat(530));
  return root;
}

describe('automatic handoff diff cap', () => {
  let repo = '';
  afterEach(() => { if (repo) fs.rmSync(repo, { recursive: true, force: true }); repo = ''; });

  it('caps the PreCompact diff, keeps the doc whole and points at the full diff', async () => {
    repo = mkRepo();
    expect(await writeAutoHandoff(createContext(repo), {}, 'auto: pre-compact', 20_000)).toBe(true);
    const inc = path.join(repo, '.specweave', 'increments', '0001-big');
    const diff = fs.readFileSync(path.join(inc, 'handoff.diff'), 'utf8');
    const doc = fs.readFileSync(path.join(inc, 'handoff.md'), 'utf8');
    const body = diff.slice(0, diff.indexOf('# SpecWeave: diff capped'));
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(AUTO_HANDOFF_DIFF_CAP_BYTES);
    expect(Buffer.byteLength(diff)).toBeLessThan(AUTO_HANDOFF_DIFF_CAP_BYTES + 1024);
    expect(diff).toMatch(/# SpecWeave: diff capped at \d+ of \d+ bytes; \d+ of \d+ files shown whole\./);
    expect(diff).toContain('diff --git a/a.txt b/a.txt');
    expect(diff).not.toContain(FAKE_KEY);
    // The doc: every changed file, the capped diff and the command for the rest.
    expect(doc).toContain('## Files touched');
    expect(doc).toContain('?? gen/');
    expect(doc).toMatch(/Diff: `\.specweave\/increments\/0001-big\/handoff\.diff`, capped at \d+ KB of 2\.\d MB \(\d+ of \d+ files whole\)\. Full diff: `git diff HEAD` in the checkout/);
    expect(doc).toContain('auto: pre-compact');
  });

  it('keeps the whole diff for an explicit handoff', async () => {
    repo = mkRepo();
    const r = await buildWorkHandoff(repo, { incrementId: '0001-big', push: false, agent: 'a@b' });
    const diff = fs.readFileSync(r.diffPath, 'utf8');
    expect(Buffer.byteLength(diff)).toBeGreaterThan(2 * 1024 * 1024);
    expect(diff).not.toContain('# SpecWeave: diff capped');
    expect(r.docMarkdown).toContain('Full diff: `.specweave/increments/0001-big/handoff.diff`');
  });
});
