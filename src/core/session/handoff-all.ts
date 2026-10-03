/**
 * Handoff index: `specweave handoff --all` and `specweave pickup --all`.
 *
 * One read for switching accounts or tools with many increments in flight.
 * `handoff --all` writes `.specweave/handoffs/<YYYY-MM-DD>-INDEX.md` plus
 * `.specweave/handoffs/index.json` with one row per active increment (tasks,
 * open ACs, last activity, what it waits on, a paste-ready resume prompt) and,
 * in an umbrella workspace, every nested checkout holding work that exists only
 * on this machine. `pickup --all` prints the newest index, actionable rows
 * first.
 *
 * Read-only toward everything but the index files: no ledger events, no claims
 * released, nothing committed or pushed, in the umbrella or in nested repos.
 *
 * @module core/session/handoff-all
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getAgentId, ledgerPath, readLedger, readIncrementEvents } from '../tasks/ledger.js';
import { loadTaskBoard } from '../tasks/task-board.js';
import { hasTasksFile } from '../tasks/tasks-source.js';
import { incrementsDir, listActiveIncrementIds, readLeaseHours } from '../tasks/resolve-increment.js';
import { readSpecAcs, deriveAcStatus } from '../tasks/verify-runner.js';
import { scrubSecrets } from './handoff-secret-scrub.js';
import { extractKeepBlocks } from './handoff-doc-format.js';
import { readTitle, ageMs } from './pickup.js';
import { scanNestedRepos, type CheckoutState, type PrLookup } from './nested-repos.js';

export const HANDOFFS_DIR = '.specweave/handoffs';
export const INDEX_JSON_FILE = 'index.json';
/** Generator marker: an INDEX file without it was written by a person and is left alone. */
export const INDEX_MARKER = '<!-- Handoff index v1 -->';

export interface IndexRepo {
  path: string;
  branch: string;
  sha: string;
  dirty: number;
  ahead: number;
  noRemote: boolean;
  upstream?: string;
  lastCommitAt?: string;
  pr?: { number: number; url: string; state: string; isDraft: boolean };
  increments: string[];
}

export interface IndexRow {
  id: string;
  title: string;
  status: string;
  tasksDone: number;
  tasksTotal: number;
  openAcs: string[];
  totalAcs: number;
  lastActivityAt?: string;
  /** What the increment waits on (a person, a decision), from `wait` events and handoff.md. */
  waits: string[];
  /** Repo-relative handoff docs that exist for it (`handoff.md`, `handoff.auto.md`). */
  handoffDocs: string[];
  /** Nested checkouts with local-only work whose path or branch carries this increment's id. */
  repos: string[];
  resumePrompt: string;
}

export interface HandoffIndex {
  version: 1;
  generatedAt: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  root: string;
  agent: string;
  reason?: string;
  rows: IndexRow[];
  /** Absent when the workspace has no `repositories/` folder or the scan was skipped. */
  repos?: { scanned: number; flagged: IndexRepo[] };
}

export interface HandoffIndexOptions {
  reason?: string;
  agent?: string;
  /** Scan nested repos (default: when `repositories/` exists). */
  scanRepos?: boolean;
  /** PR lookup for the nested scan (default: gh when installed); `false` skips it. */
  prLookup?: PrLookup | false;
  now?: Date;
}

export interface WriteIndexOptions extends HandoffIndexOptions {
  /** Directory to write into (default `.specweave/handoffs`). */
  outDir?: string;
  /** Build and render only; write nothing. */
  dryRun?: boolean;
}

export interface WriteIndexResult {
  index: HandoffIndex;
  markdown: string;
  mdPath: string;
  jsonPath: string;
  written: boolean;
}

// ── Reading one increment ────────────────────────────────────────────────

const CLEARED_WAIT = /^(none|cleared|resolved|done|no|nothing)?\.?$/i;
const EMPTY_WAIT = /^(nothing|none|n\/a|no|-|—|–)\.?$/i;

/**
 * Open waits of an increment: `wait` ledger events after the last clearing one,
 * then "Waits on" / "Waiting on" lines (or a section with that heading) in its
 * handoff docs.
 */
export function readWaits(incDir: string): string[] {
  const waits: string[] = [];
  const events = readIncrementEvents(ledgerPath(incDir), ['wait']);
  for (const e of events) {
    const note = (e.note ?? '').trim();
    if (CLEARED_WAIT.test(note)) waits.length = 0;
    else waits.push(note);
  }
  for (const f of ['handoff.md', 'handoff.auto.md']) {
    let text = '';
    try { text = fs.readFileSync(path.join(incDir, f), 'utf-8'); } catch { continue; }
    for (const w of parseWaitLines(text)) if (!waits.includes(w)) waits.push(w);
  }
  return waits;
}

/** "Waits on: X", "**Waiting on Anton:** X", or bullets under a "## Waiting on …" heading. */
export function parseWaitLines(text: string): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const v = s.replace(/[*_`]+/g, '').replace(/\s+/g, ' ').trim();
    if (v && !EMPTY_WAIT.test(v) && !out.includes(v)) out.push(v);
  };
  let inSection = false;
  for (const raw of text.split(/\r?\n/)) {
    const heading = raw.match(/^#{2,4}\s+(.+?)\s*$/);
    if (heading) {
      const h = heading[1].replace(/[*_`]+/g, '').trim();
      inSection = /^(waits?|waiting) on\b/i.test(h);
      continue;
    }
    const line = raw.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim();
    const m = line.match(/^[*_]*(?:waits?|waiting) on\b\s*([^:]*?)[*_]*\s*:\s*(.+)$/i);
    if (m) {
      const who = m[1].replace(/[*_]+/g, '').trim();
      const what = m[2].trim();
      if (EMPTY_WAIT.test(what.replace(/[*_`]+/g, '').trim())) continue;
      add(who ? `${who}: ${what}` : what);
      continue;
    }
    if (inSection && /^\s*(?:[-*+]|\d+\.)\s+/.test(raw)) add(line);
  }
  return out;
}

/** Newest of the ledger's last event and metadata `updated` / `lastActivity`. */
function lastActivity(incDir: string): string | undefined {
  let best = NaN;
  for (const e of readLedger(ledgerPath(incDir)).events) {
    const t = Date.parse(e.at);
    if (!Number.isNaN(t) && !(t <= best)) best = t;
  }
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8')) as Record<string, unknown>;
    for (const k of ['updated', 'lastActivity']) {
      const t = typeof meta[k] === 'string' ? Date.parse(meta[k] as string) : NaN;
      if (!Number.isNaN(t) && !(t <= best)) best = t;
    }
  } catch { /* no metadata */ }
  return Number.isNaN(best) ? undefined : new Date(best).toISOString();
}

function readStatus(incDir: string): string {
  try {
    const s = (JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8')) as { status?: unknown }).status;
    return typeof s === 'string' ? s : 'unknown';
  } catch { return 'unknown'; }
}

const shortId = (id: string) => id.match(/^\d{4}/)?.[0] ?? id;

function homeShort(p: string): string {
  const home = os.homedir();
  return home && (p === home || p.startsWith(home + path.sep)) ? '~' + p.slice(home.length) : p;
}

function repoBits(r: IndexRepo): string {
  const bits = [r.branch];
  if (r.dirty) bits.push(`${r.dirty} uncommitted`);
  if (r.ahead) bits.push(`${r.ahead} unpushed`);
  if (r.noRemote) bits.push('no remote branch');
  return bits.join(', ');
}

/** The short id when it names one increment folder, else the full id. */
function pickupArg(root: string, id: string): string {
  const short = shortId(id);
  if (short === id) return id;
  try {
    const same = fs.readdirSync(incrementsDir(root)).filter((n) => n === short || n.startsWith(`${short}-`));
    return same.length === 1 ? short : id;
  } catch { return id; }
}

/** `0931 Title` for display; the full id when there is no title. */
function label(row: Pick<IndexRow, 'id' | 'title'>): string {
  return row.title ? `${shortId(row.id)} ${row.title}` : row.id;
}

export function buildResumePrompt(root: string, row: Omit<IndexRow, 'resumePrompt'>, repos: IndexRepo[]): string {
  const doc = row.handoffDocs.length ? ` and read ${row.handoffDocs.join(' and ')}` : '';
  const name = row.title ? `${shortId(row.id)} "${row.title}"` : row.id;
  const P = [`Pick up increment ${name} in ${homeShort(root)}: run \`specweave pickup ${pickupArg(root, row.id)}\`${doc}, then continue with the task it names.`];
  const mine = repos.filter((r) => row.repos.includes(r.path));
  if (mine.length) {
    P.push(`Local-only work first: ${mine.map((r) => `${r.path} (${repoBits(r)}${r.pr ? `, PR #${r.pr.number}` : ''})`).join('; ')}; check \`git -C <path> status -sb\` and commit it on its branch.`);
  }
  if (row.waits.length) P.push(`It waits on ${row.waits.join('; ')}: do only the parts that do not need that answer.`);
  return P.join(' ');
}

function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const scrub = (s: string) => scrubSecrets(s).scrubbed;

function toIndexRepo(s: CheckoutState): IndexRepo {
  return {
    path: homeShort(s.display),
    branch: s.branch,
    sha: s.sha,
    dirty: s.dirty,
    ahead: s.ahead,
    noRemote: s.noRemote,
    ...(s.upstream ? { upstream: s.upstream } : {}),
    ...(s.lastCommitAt ? { lastCommitAt: s.lastCommitAt } : {}),
    ...(s.pr ? { pr: s.pr } : {}),
    increments: s.incrementIds,
  };
}

/** Build the index. Never writes. */
export async function buildHandoffIndex(root: string, opts: HandoffIndexOptions = {}): Promise<HandoffIndex> {
  const now = opts.now ?? new Date();
  const leaseHours = readLeaseHours(root);
  const incRoot = incrementsDir(root);
  const ids = listActiveIncrementIds(root);

  const scan = opts.scanRepos ?? fs.existsSync(path.join(root, 'repositories'));
  let repos: HandoffIndex['repos'];
  if (scan) {
    const result = await scanNestedRepos(root, { incrementIds: ids.map(shortId), prLookup: opts.prLookup });
    repos = { scanned: result.scanned, flagged: result.flagged.map(toIndexRepo) };
  }
  const flagged = repos?.flagged ?? [];

  const rows: IndexRow[] = ids.map((id) => {
    const dir = path.join(incRoot, id);
    let tasksDone = 0;
    let tasksTotal = 0;
    let acs = readSpecAcs(dir);
    if (hasTasksFile(dir)) {
      try {
        const board = loadTaskBoard(dir, { leaseHours });
        tasksDone = board.counts.done + board.counts.skipped;
        tasksTotal = board.counts.total;
        acs = deriveAcStatus(acs, board);
      } catch { /* unreadable task list: counts stay 0 */ }
    }
    const handoffDocs = ['handoff.md', 'handoff.auto.md']
      .map((f) => path.join(dir, f))
      .filter((p) => fs.existsSync(p))
      .map((p) => path.relative(root, p).split(path.sep).join('/'));
    const base = {
      id,
      // "0728 — Academy programs" reads as "0728 0728 — …" next to the id; drop the repeat.
      title: scrub(readTitle(dir).replace(new RegExp(`^${shortId(id)}\\s*[—–:-]\\s*`), '')),
      status: readStatus(dir),
      tasksDone,
      tasksTotal,
      openAcs: acs.filter((a) => !a.done).map((a) => a.id),
      totalAcs: acs.length,
      lastActivityAt: lastActivity(dir),
      waits: readWaits(dir).map(scrub),
      handoffDocs,
      repos: flagged.filter((r) => r.increments.includes(shortId(id))).map((r) => r.path),
    };
    return { ...base, resumePrompt: scrub(buildResumePrompt(root, base, flagged)) };
  });

  return {
    version: 1,
    generatedAt: now.toISOString(),
    date: localDate(now),
    root,
    agent: opts.agent ?? getAgentId(),
    ...(opts.reason ? { reason: scrub(opts.reason) } : {}),
    rows,
    ...(repos ? { repos } : {}),
  };
}

// ── Rendering ────────────────────────────────────────────────────────────

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();

function ageAt(iso: string | undefined, nowMs: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '-';
  const min = Math.max(0, Math.round((nowMs - t) / 60000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function acList(row: IndexRow, max = 6): string {
  if (!row.totalAcs) return '-';
  if (!row.openAcs.length) return 'none';
  const shown = row.openAcs.slice(0, max).join(', ');
  return row.openAcs.length > max ? `${shown} +${row.openAcs.length - max}` : shown;
}

/** Rows without waits first, then waiting rows; newest activity first inside each group. */
export function sortRows(rows: IndexRow[]): { actionable: IndexRow[]; waiting: IndexRow[] } {
  const byActivity = (a: IndexRow, b: IndexRow) => (Date.parse(b.lastActivityAt ?? '') || 0) - (Date.parse(a.lastActivityAt ?? '') || 0);
  return {
    actionable: rows.filter((r) => !r.waits.length).sort(byActivity),
    waiting: rows.filter((r) => r.waits.length).sort(byActivity),
  };
}

function prCell(r: IndexRepo): string {
  if (!r.pr) return '-';
  return `[#${r.pr.number}](${r.pr.url}) ${r.pr.isDraft ? 'draft' : r.pr.state.toLowerCase()}`;
}

/** Render INDEX.md. `keep` blocks from the previous version go under the header. */
export function renderHandoffIndex(index: HandoffIndex, keep: string[] = []): string {
  const nowMs = Date.parse(index.generatedAt);
  const { actionable, waiting } = sortRows(index.rows);
  const L: string[] = [];
  L.push(`# Handoff index, ${index.date}`);
  L.push('');
  L.push(`Written ${index.generatedAt} by ${index.agent} with \`specweave handoff --all\`${index.reason ? ` (${index.reason})` : ''}. Workspace \`${homeShort(index.root)}\`.`);
  L.push(`${index.rows.length} active increment${index.rows.length === 1 ? '' : 's'}: ${actionable.length} actionable now, ${waiting.length} waiting on a person.` +
    (index.repos ? ` ${index.repos.flagged.length} of ${index.repos.scanned} checkouts hold work that exists only on this machine.` : ''));
  L.push('');
  L.push('On the other account or tool: run `specweave pickup --all` (or read this file), then start each topic with its resume prompt. Nothing here was committed or pushed for you.');
  L.push('');
  for (const block of keep) { L.push(block); L.push(''); }

  const table = (rows: IndexRow[], withWaits: boolean) => {
    if (!rows.length) { L.push('_None._'); return; }
    L.push(`| Increment | Tasks | Open ACs | Last activity |${withWaits ? ' Waits on |' : ''} Local-only repos | Resume prompt |`);
    L.push(`|---|---|---|---|${withWaits ? '---|' : ''}---|---|`);
    for (const r of rows) {
      L.push(`| ${cell(label(r))} | ${r.tasksDone}/${r.tasksTotal} | ${cell(acList(r))} | ${ageAt(r.lastActivityAt, nowMs)} |` +
        `${withWaits ? ` ${cell(r.waits.join('; '))} |` : ''} ${cell(r.repos.join(', ') || '-')} | ${cell(r.resumePrompt)} |`);
    }
  };

  L.push('## Actionable now');
  L.push('');
  table(actionable, false);
  L.push('');
  L.push('## Waiting on a person');
  L.push('');
  table(waiting, true);
  L.push('');

  if (index.repos) {
    L.push('## Repositories with local-only work');
    L.push('');
    L.push(`Read-only scan of ${index.repos.scanned} checkouts (the workspace, \`repositories/<org>/<repo>\` and their worktrees). Before resuming a topic, run \`git -C <path> status -sb\` and commit what is still there on its branch.`);
    L.push('');
    if (!index.repos.flagged.length) {
      L.push('_Every checkout is clean and pushed._');
    } else {
      L.push('| Path | Branch | Uncommitted | Unpushed | Last commit | PR | Increment |');
      L.push('|---|---|---|---|---|---|---|');
      for (const r of index.repos.flagged) {
        const branch = `${r.branch}${r.noRemote ? ' (no remote branch)' : ''}`;
        L.push(`| ${cell(r.path)} | ${cell(branch)} | ${r.dirty} | ${r.ahead} | ${ageAt(r.lastCommitAt, nowMs)} | ${prCell(r)} | ${r.increments.join(', ') || '-'} |`);
      }
    }
    L.push('');
  }
  L.push('---');
  L.push(INDEX_MARKER);
  return scrub(L.join('\n')) + '\n';
}

// ── Writing and reading ──────────────────────────────────────────────────

function isForeign(file: string): boolean {
  try { return !fs.readFileSync(file, 'utf-8').includes(INDEX_MARKER); } catch { return false; }
}

/** Build, render and (unless `dryRun`) write INDEX.md and index.json. */
export async function writeHandoffIndex(root: string, opts: WriteIndexOptions = {}): Promise<WriteIndexResult> {
  const index = await buildHandoffIndex(root, opts);
  const dir = opts.outDir ? path.resolve(root, opts.outDir) : path.join(root, HANDOFFS_DIR);
  let mdPath = path.join(dir, `${index.date}-INDEX.md`);
  // A same-named file a person wrote stays; the generated one goes beside it.
  if (isForeign(mdPath)) mdPath = path.join(dir, `${index.date}-INDEX.auto.md`);
  const jsonPath = path.join(dir, INDEX_JSON_FILE);
  let keep: string[] = [];
  try { keep = extractKeepBlocks(fs.readFileSync(mdPath, 'utf-8')).map(scrub); } catch { /* first write */ }
  const markdown = renderHandoffIndex(index, keep);
  if (!opts.dryRun) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mdPath, markdown, 'utf-8');
    fs.writeFileSync(jsonPath, JSON.stringify({ ...index, markdown: path.basename(mdPath) }, null, 2) + '\n', 'utf-8');
  }
  return { index, markdown, mdPath, jsonPath, written: !opts.dryRun };
}

export interface LatestIndex {
  index?: HandoffIndex & { markdown?: string };
  /** The newest INDEX markdown file, when there is one. */
  mdPath?: string;
}

/** The newest index: `index.json` when present, else the newest `*-INDEX*.md` file. */
export function readLatestIndex(root: string): LatestIndex {
  const dir = path.join(root, HANDOFFS_DIR);
  let index: LatestIndex['index'];
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, INDEX_JSON_FILE), 'utf-8')) as LatestIndex['index'];
    if (parsed && Array.isArray(parsed.rows)) index = parsed;
  } catch { /* none */ }
  let mdPath: string | undefined;
  if (index?.markdown && fs.existsSync(path.join(dir, index.markdown))) {
    mdPath = path.join(dir, index.markdown);
  } else {
    try {
      const names = fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}-INDEX(\.auto)?\.md$/.test(n)).sort();
      if (names.length) mdPath = path.join(dir, names[names.length - 1]);
    } catch { /* no folder */ }
  }
  return { index, mdPath };
}

/** What `pickup --all` prints: actionable rows first, then waiting rows, then local-only repos. */
export function renderPickupAll(root: string, latest: LatestIndex, now: Date = new Date()): string {
  const rel = (p: string) => path.relative(root, p).split(path.sep).join('/');
  if (!latest.index) {
    if (latest.mdPath) return [`Handoff index (no index.json): ${rel(latest.mdPath)}`, '', fs.readFileSync(latest.mdPath, 'utf-8').trimEnd()].join('\n');
    return 'No handoff index yet. On the side you are leaving, run `specweave handoff --all`.';
  }
  const idx = latest.index;
  const nowMs = now.getTime();
  const { actionable, waiting } = sortRows(idx.rows);
  const L: string[] = [];
  L.push(`Handoff index ${idx.date}, written ${ageMs(Date.parse(idx.generatedAt))} by ${idx.agent}${idx.reason ? ` (${idx.reason})` : ''}${latest.mdPath ? ` · ${rel(latest.mdPath)}` : ''}`);
  const line = (r: IndexRow) => {
    L.push(`  ${label(r)} · tasks ${r.tasksDone}/${r.tasksTotal} · open ACs ${acList(r)} · ${ageAt(r.lastActivityAt, nowMs)}`);
    if (r.waits.length) L.push(`    Waits on: ${r.waits.join('; ')}`);
    if (r.repos.length) L.push(`    Local-only repos: ${r.repos.join(', ')}`);
    L.push(`    Resume: ${r.resumePrompt}`);
  };
  L.push(`Actionable now (${actionable.length}):`);
  if (!actionable.length) L.push('  none');
  actionable.forEach(line);
  L.push(`Waiting on a person (${waiting.length}):`);
  if (!waiting.length) L.push('  none');
  waiting.forEach(line);
  if (idx.repos?.flagged.length) {
    L.push(`Local-only work in ${idx.repos.flagged.length} of ${idx.repos.scanned} checkouts (state when the index was written):`);
    for (const r of idx.repos.flagged) L.push(`  ${r.path} · ${repoBits(r)}${r.pr ? ` · PR #${r.pr.number} ${r.pr.isDraft ? 'draft' : r.pr.state.toLowerCase()}` : ''}`);
  }
  L.push('Next: `specweave pickup <id>` for the increment you start with.');
  return L.join('\n');
}
