/**
 * Verify runner — `specweave verify [id]`.
 *
 * Runs the project's verification commands (config `testing.commands[]`, else
 * auto-detected from package.json scripts test → lint → build, Cargo, pytest,
 * go), collects the AC table from spec.md and the ledger summary, and writes
 * `reports/verify.md` + `reports/verify.json`. `verify.json.ok` is the single
 * closure gate consulted by `specweave complete`.
 *
 * @module core/tasks/verify-runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { runShell } from './run-shell.js';
import { loadTaskBoard, renderBoardTable, type TaskBoard } from './task-board.js';

export interface VerifyCommandResult {
  cmd: string;
  exit: number;
  tail: string;
  ms: number;
}

export interface VerifyReport {
  ok: boolean;
  ranAt: string;
  increment: string;
  commands: Array<{ cmd: string; exit: number }>;
  acs: { total: number; done: number };
  tasks: { total: number; done: number; skipped: number; open: number };
  /** Skipped tasks with the mandatory reason from `specweave task skip`. */
  skipped: Array<{ id: string; by?: string; reason?: string }>;
  /** Ledger lines that could not be parsed (BOM/CRLF are tolerated; this counts real junk). */
  ledgerMalformed: number;
}

export interface AcEntry { id: string; done: boolean; text: string }

/** Parse `- [ ] AC-01 …` / `- [x] **AC-US1-01**: …` lines from spec.md. */
export function parseSpecAcs(specContent: string): AcEntry[] {
  const acs: AcEntry[] = [];
  const re = /^-\s+\[([ xX])\]\s+\*{0,2}(AC-[A-Za-z0-9-]+)\*{0,2}:?\s*(.*)$/;
  for (const line of specContent.split('\n')) {
    const m = line.match(re);
    if (m) acs.push({ id: m[2], done: m[1].toLowerCase() === 'x', text: m[3].trim() });
  }
  return acs;
}

/** Verification commands: config `testing.commands` first, then stack auto-detection. */
export function detectVerifyCommands(projectRoot: string): { commands: string[]; source: string } {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf-8')) as {
      testing?: { commands?: unknown };
    };
    const c = cfg.testing?.commands;
    if (Array.isArray(c) && c.every((x) => typeof x === 'string') && c.length > 0) {
      return { commands: c as string[], source: 'config testing.commands' };
    }
  } catch {
    // no config → auto-detect
  }

  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { scripts?: Record<string, string> };
      const scripts = pkg.scripts ?? {};
      const commands = ['test', 'lint', 'build'].filter((s) => typeof scripts[s] === 'string' && scripts[s].trim()).map((s) => `npm run ${s}`);
      if (commands.length) return { commands, source: 'package.json scripts' };
    } catch {
      // fallthrough
    }
  }
  if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) return { commands: ['cargo test'], source: 'Cargo.toml' };
  if (['pyproject.toml', 'pytest.ini', 'setup.py', 'setup.cfg'].some((f) => fs.existsSync(path.join(projectRoot, f)))) {
    return { commands: ['pytest'], source: 'python project' };
  }
  if (fs.existsSync(path.join(projectRoot, 'go.mod'))) return { commands: ['go test ./...'], source: 'go.mod' };
  return { commands: [], source: 'none detected' };
}

export interface RunVerifyOptions {
  /** Override the command list (tests). */
  commands?: string[];
  timeoutMs?: number;
  leaseHours?: number;
  onCommand?: (cmd: string) => void;
}

export interface RunVerifyResult {
  report: VerifyReport;
  results: VerifyCommandResult[];
  acs: AcEntry[];
  board: TaskBoard;
  source: string;
  mdPath: string;
  jsonPath: string;
}

export async function runVerify(projectRoot: string, incrementId: string, incrementDir: string, opts: RunVerifyOptions = {}): Promise<RunVerifyResult> {
  const detected = opts.commands ? { commands: opts.commands, source: 'explicit' } : detectVerifyCommands(projectRoot);
  const results: VerifyCommandResult[] = [];
  for (const cmd of detected.commands) {
    opts.onCommand?.(cmd);
    const started = Date.now();
    const r = await runShell(cmd, projectRoot, opts.timeoutMs);
    results.push({ cmd, exit: r.code, tail: r.tail, ms: Date.now() - started });
  }

  const specPath = path.join(incrementDir, 'spec.md');
  const acs = fs.existsSync(specPath) ? parseSpecAcs(fs.readFileSync(specPath, 'utf-8')) : [];
  const board = loadTaskBoard(incrementDir, { leaseHours: opts.leaseHours });

  const report: VerifyReport = {
    ok: results.every((r) => r.exit === 0),
    ranAt: new Date().toISOString(),
    increment: incrementId,
    commands: results.map((r) => ({ cmd: r.cmd, exit: r.exit })),
    acs: { total: acs.length, done: acs.filter((a) => a.done).length },
    tasks: { total: board.counts.total, done: board.counts.done, skipped: board.counts.skipped, open: board.counts.total - board.counts.done - board.counts.skipped },
    skipped: board.tasks
      .filter((t) => t.state.status === 'skipped')
      .map((t) => ({ id: t.id, by: t.state.by, reason: t.state.note })),
    ledgerMalformed: board.fold.malformed,
  };

  const reportsDir = path.join(incrementDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const mdPath = path.join(reportsDir, 'verify.md');
  const jsonPath = path.join(reportsDir, 'verify.json');
  fs.writeFileSync(mdPath, renderVerifyMd(report, results, acs, board, detected.source), 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  return { report, results, acs, board, source: detected.source, mdPath, jsonPath };
}

export function renderVerifyMd(report: VerifyReport, results: VerifyCommandResult[], acs: AcEntry[], board: TaskBoard, source: string): string {
  const L: string[] = [];
  L.push(`# Verify — ${report.increment}`);
  L.push('');
  L.push(`${report.ok ? 'PASS' : 'FAIL'} · ${report.ranAt} · commands from ${source}`);
  L.push('');
  L.push('## Commands');
  L.push('');
  if (results.length === 0) L.push('_No verification commands found. Set `testing.commands` in .specweave/config.json._');
  for (const r of results) {
    L.push(`### \`${r.cmd}\` → exit ${r.exit} (${Math.round(r.ms / 1000)}s)`);
    L.push('');
    L.push('```');
    L.push(r.tail || '(no output)');
    L.push('```');
    L.push('');
  }
  L.push('## Acceptance criteria');
  L.push('');
  L.push(`${report.acs.done}/${report.acs.total} checked`);
  L.push('');
  if (acs.length) {
    L.push('| AC | Done | Text |');
    L.push('|---|---|---|');
    for (const a of acs) L.push(`| ${a.id} | ${a.done ? 'x' : ' '} | ${a.text.replace(/\|/g, '\\|')} |`);
    L.push('');
  }
  L.push('## Tasks (ledger)');
  L.push('');
  L.push(renderBoardTable(board));
  L.push('');
  if (report.skipped.length) {
    L.push('### Skipped');
    L.push('');
    for (const s of report.skipped) L.push(`- ${s.id} — ${s.reason ?? '(no reason recorded)'} (${s.by ?? 'unknown'})`);
    L.push('');
  }
  if (report.ledgerMalformed) {
    L.push(`_${report.ledgerMalformed} malformed ledger line(s) skipped — inspect ledger.jsonl._`);
    L.push('');
  }
  return L.join('\n');
}

/** Read reports/verify.json if present. */
export function readVerifyReport(incrementDir: string): VerifyReport | undefined {
  const p = path.join(incrementDir, 'reports', 'verify.json');
  if (!fs.existsSync(p)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as VerifyReport;
  } catch {
    return undefined;
  }
}
