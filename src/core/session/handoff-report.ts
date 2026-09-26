/**
 * HTML handoff report: one self-contained page that shows how an increment
 * moved between tools, accounts and sessions, straight from its ledger.
 *
 * Every row comes from `ledger.jsonl` (claims, done with evidence, handoffs,
 * pickups, sessions, notes), so the page is evidence, not a summary someone
 * wrote. No scripts, no external assets.
 *
 * @module core/session/handoff-report
 */

import * as fs from 'fs';
import * as path from 'path';
import { ledgerPath, readLedger, type LedgerEvent } from '../tasks/ledger.js';
import { loadTaskBoard } from '../tasks/task-board.js';
import { hasTasksFile } from '../tasks/tasks-source.js';
import { readSpecAcs, deriveAcStatus } from '../tasks/verify-runner.js';
import { readTitle } from './pickup.js';

export const REPORT_FILE = 'handoff-report.html';

export interface HandoffReport {
  html: string;
  /** Distinct `<tool>@<host>` agents in the ledger, in order of first appearance. */
  agents: string[];
  handoffs: number;
  pickups: number;
}

export function buildHandoffReport(incDir: string, incrementId: string, now = new Date()): HandoffReport {
  const { events } = readLedger(ledgerPath(incDir));
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const board = hasTasksFile(incDir) ? safe(() => loadTaskBoard(incDir)) : undefined;
  const acs = board ? deriveAcStatus(readSpecAcs(incDir), board) : readSpecAcs(incDir);
  const title = readTitle(incDir) || incrementId;
  const status = safe(() => (JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf8')) as { status?: string }).status) ?? 'unknown';

  const agents: string[] = [];
  for (const e of sorted) if (!agents.includes(e.by)) agents.push(e.by);
  const tools = [...new Set(agents.map((a) => a.split('@')[0]))];
  const handoffs = sorted.filter((e) => e.e === 'handoff').length;
  const pickups = sorted.filter((e) => e.e === 'pickup').length;
  const sessions = new Set(sorted.filter((e) => e.e === 'session').map((e) => e.note)).size;
  const counts = board?.counts;
  const metAcs = acs.filter((a) => a.done).length;

  const stat = (value: string | number, label: string) =>
    `<div class="stat"><div class="v">${esc(String(value))}</div><div class="l">${esc(label)}</div></div>`;

  const timeline = sorted.map((e) => {
    const kind = e.e === 'handoff' || e.e === 'pickup' ? ' class="hand"' : '';
    const detail = e.evidence ? firstLines(e.evidence, 3) : e.note ?? '';
    return `<tr${kind}><td class="t">${esc(fmt(e.at))}</td><td><span class="who ${toolClass(e.by)}">${esc(e.by)}</span></td>` +
      `<td>${esc(label(e))}</td><td>${e.t === '*' ? '' : esc(e.t)}</td><td class="d">${esc(detail)}</td></tr>`;
  }).join('\n');

  const taskRows = (board?.tasks ?? []).map((t) =>
    `<tr><td>${esc(t.id)}</td><td>${esc(t.title)}</td><td><span class="st ${esc(t.state.status)}">${esc(t.state.status)}</span></td>` +
    `<td>${t.state.by ? `<span class="who ${toolClass(t.state.by)}">${esc(t.state.by)}</span>` : ''}</td></tr>`).join('\n');

  const acRows = acs.map((a) =>
    `<li class="${a.done ? 'met' : ''}"><b>${esc(a.id)}</b> ${esc(a.text)}${a.done && a.via === 'ledger' ? ' <small>(met by its tasks)</small>' : ''}</li>`).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Handoff report: ${esc(title)}</title>
<style>
:root{--bg:#fbfaf7;--fg:#1c1b19;--mut:#6b6760;--line:#e4e0d8;--card:#fff;--acc:#2f6f5e;--hand:#fff6e0;--claude:#b8612f;--codex:#2f5f9e;--grok:#6a4bb0;--muse:#0f7c86;--gemini:#9a6a00;--other:#555}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#ece9e2;--mut:#a29d93;--line:#2e2c28;--card:#1e1d1a;--acc:#6fc2a8;--hand:#3a3120}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1000px;margin:0 auto;padding:32px 16px}h1{font-size:26px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 10px}
.sub{color:var(--mut);margin:0 0 24px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.stat .v{font-size:22px;font-weight:650}.stat .l{color:var(--mut);font-size:13px}
.wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mut);font-weight:600}tr:last-child td{border-bottom:0}tr.hand td{background:var(--hand)}
td.t{white-space:nowrap;color:var(--mut)}td.d{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;max-width:420px}
.who{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;padding:1px 6px;border-radius:6px;border:1px solid currentColor;white-space:nowrap}
.claude{color:var(--claude)}.codex{color:var(--codex)}.grok{color:var(--grok)}.muse{color:var(--muse)}.gemini{color:var(--gemini)}.other{color:var(--other)}
.st{font-size:12.5px;padding:1px 6px;border-radius:6px;background:var(--line)}.st.done{background:var(--acc);color:var(--bg)}
ul.acs{padding-left:18px}ul.acs li.met{color:var(--acc)}ul.acs li.met::marker{content:"✓ "}footer{color:var(--mut);font-size:13px;margin-top:32px}
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="sub">Increment ${esc(incrementId)} · ${esc(status)} · report generated ${esc(fmt(now.toISOString()))} from <code>ledger.jsonl</code></p>
<div class="stats">
${stat(counts ? `${counts.done + counts.skipped}/${counts.total}` : '-', 'tasks done')}
${stat(acs.length ? `${metAcs}/${acs.length}` : '-', 'acceptance criteria met')}
${stat(handoffs, handoffs === 1 ? 'handoff' : 'handoffs')}
${stat(pickups, pickups === 1 ? 'pickup' : 'pickups')}
${stat(tools.join(', ') || '-', 'tools')}
${stat(sessions || agents.length, sessions ? 'recorded sessions' : 'agents')}
</div>
<h2>Timeline</h2>
<div class="wrap"><table>
<thead><tr><th>When (UTC)</th><th>Who</th><th>What</th><th>Task</th><th>Evidence or note</th></tr></thead>
<tbody>
${timeline || '<tr><td colspan="5">No ledger events yet.</td></tr>'}
</tbody></table></div>
<h2>Tasks</h2>
<div class="wrap"><table>
<thead><tr><th>Task</th><th>Title</th><th>State</th><th>By</th></tr></thead>
<tbody>
${taskRows || '<tr><td colspan="4">No tasks.</td></tr>'}
</tbody></table></div>
<h2>Acceptance criteria</h2>
<ul class="acs">
${acRows || '<li>None listed in spec.md.</li>'}
</ul>
<footer>Agents: ${agents.map((a) => esc(a)).join(', ') || 'none'}. Handoff and pickup rows are highlighted. Generated by <code>specweave report</code>.</footer>
</main>
</body>
</html>
`;
  return { html, agents, handoffs, pickups };
}

export function writeHandoffReport(incDir: string, incrementId: string, out?: string): { path: string; report: HandoffReport } {
  const report = buildHandoffReport(incDir, incrementId);
  const file = out ?? path.join(incDir, 'reports', REPORT_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, report.html, 'utf8');
  return { path: file, report };
}

function label(e: LedgerEvent): string {
  switch (e.e) {
    case 'claim': return 'claimed';
    case 'done': return 'finished';
    case 'release': return 'released';
    case 'block': return 'blocked';
    case 'skip': return 'skipped';
    case 'note': return 'left a note';
    case 'session': return 'started a session';
    case 'handoff': return 'handed off';
    case 'pickup': return 'picked up';
  }
}

function toolClass(agent: string): string {
  const tool = agent.split('@')[0];
  return ['claude', 'codex', 'grok', 'muse', 'gemini'].includes(tool) ? tool : 'other';
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().replace('T', ' ').slice(0, 16);
}

function firstLines(s: string, n: number): string {
  const lines = s.split('\n');
  return lines.slice(0, n).join('\n') + (lines.length > n ? '\n…' : '');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}
