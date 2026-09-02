/**
 * The repo-root `skills/` folder is the vskill-distributable standalone core
 * (sw-increment, sw-do, sw-task, sw-review, sw-handoff) used by tools that do
 * not run the Claude Code plugin.
 *
 * These tests pin two things:
 *  1. the portability contract (scripts/lint-standalone-skills.mjs);
 *  2. that the formats the skills document are the formats the CLI actually
 *     writes and parses — the ledger line, the tasks.md definition line, the
 *     SW:BOARD markers and the handoff sections come from src/, so a drift in
 *     either direction fails here instead of in a user's repo.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseLedger, formatLedgerLine, type LedgerEvent } from '../../../src/core/tasks/ledger.js';
import { loadTaskBoard, BOARD_BEGIN, BOARD_END } from '../../../src/core/tasks/task-board.js';
import { HANDOFF_SECTION_ORDER, DOC_FORMAT_MARKER } from '../../../src/core/session/handoff-doc-format.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const LINTER = path.join(REPO_ROOT, 'scripts', 'lint-standalone-skills.mjs');
const EXPECTED_SKILLS = ['sw-do', 'sw-handoff', 'sw-increment', 'sw-review', 'sw-task'];

const read = (name: string): string => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');

/** Every fenced block of a given language, joined. */
function fenced(content: string, lang: string): string[] {
  const blocks: string[] = [];
  const lines = content.split('\n');
  let open: { fence: string; start: number } | null = null;
  lines.forEach((line, i) => {
    const m = line.match(/^(`{3,})(.*)$/);
    if (!m) return;
    if (open && m[1].length >= open.fence.length && m[2].trim() === '') {
      blocks.push(lines.slice(open.start, i).join('\n'));
      open = null;
    } else if (!open && m[2].trim().toLowerCase() === lang) {
      open = { fence: m[1], start: i + 1 };
    }
  });
  return blocks;
}

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('standalone skills (skills/)', () => {
  it('ships exactly the 2.0 standalone core plus a README', () => {
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect(dirs).toEqual(EXPECTED_SKILLS);
    expect(fs.existsSync(path.join(SKILLS_DIR, 'README.md'))).toBe(true);
  });

  it('passes the portability lint', () => {
    // Throws with the findings attached when the linter exits non-zero.
    const out = execFileSync(process.execPath, [LINTER], { cwd: REPO_ROOT, encoding: 'utf-8' });
    expect(out).toContain('OK');
  });

  it('lint catches a too-long description, a pinned name and a PowerShell append', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-skills-'));
    tmpDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'sw-bad'));
    fs.writeFileSync(
      path.join(dir, 'sw-bad', 'SKILL.md'),
      ['---', 'name: sw-bad', `description: ${'x'.repeat(220)}`, '---', '', '# bad', '',
       'specweave task list — manual path below', '', '```powershell', "'x' >> file.jsonl", '```', ''].join('\n'),
    );
    fs.writeFileSync(path.join(dir, 'README.md'), 'nothing useful\n');

    let stderr = '';
    try {
      execFileSync(process.execPath, [LINTER, dir], { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
      throw new Error('linter should have failed');
    } catch (e) {
      stderr = String((e as { stderr?: string }).stderr ?? '');
    }
    expect(stderr).toContain('description is 220 chars');
    expect(stderr).toContain('must not pin `name:`');
    expect(stderr).toMatch(/PowerShell redirect/);
    expect(stderr).toContain('no install line for sw-bad');
  });
});

describe('documented formats match the CLI', () => {
  it('every ledger example round-trips through the real parser byte-for-byte', () => {
    const examples: string[] = [];
    for (const name of EXPECTED_SKILLS) {
      // Skip `<placeholder>` examples — they are prose, not copyable lines.
      for (const m of read(name).match(/\{"t":[^{}]*\}/g) ?? []) {
        if (!m.includes('<')) examples.push(m);
      }
    }
    expect(examples.length).toBeGreaterThanOrEqual(4);

    const { events, malformed } = parseLedger(examples.join('\n') + '\n');
    expect(malformed).toBe(0);
    expect(events).toHaveLength(examples.length);
    // Key order + serialization must be identical to what `specweave task` writes.
    events.forEach((ev: LedgerEvent, i: number) => {
      expect(formatLedgerLine(ev)).toBe(examples[i] + '\n');
    });
  });

  it('the tasks.md definition format in sw-increment is what the board parser reads', () => {
    const block = fenced(read('sw-increment'), 'markdown').find((b) => b.includes('### T-01'));
    expect(block).toBeDefined();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-inc-'));
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'tasks.md'), block! + '\n');

    const board = loadTaskBoard(dir);
    expect(board.tasks.map((t) => t.id)).toEqual(['T-01', 'T-02']);
    expect(board.tasks[0].acs).toContain('AC-01');
    expect(board.tasks[0].filesAffected).toContain('src/core/tasks/ledger.ts');
    expect(board.tasks[0].test).toBe('npm test -- ledger');
    expect(board.tasks.every((t) => t.state.status === 'open')).toBe(true);
  });

  it('sw-task documents the board markers the CLI renders', () => {
    const task = read('sw-task');
    expect(task).toContain(BOARD_BEGIN);
    expect(BOARD_END).toBe('<!-- /SW:BOARD -->');
    expect(task).toMatch(/specweave task render/);
  });

  it('sw-handoff documents every handoff section, in order, with the current marker', () => {
    const handoff = read('sw-handoff');
    expect(handoff).toContain(DOC_FORMAT_MARKER);
    const positions = HANDOFF_SECTION_ORDER.map((s) => handoff.indexOf(`## ${s}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
