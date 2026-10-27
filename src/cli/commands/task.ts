/**
 * CLI: `specweave task <action> …` — the multi-vendor task ledger.
 *
 *   task whoami                         print the agent id
 *   task list [inc] [--json]            table: task, status, by, evidence
 *   task next [inc] [--json]            first open task with deps met + no Files overlap
 *   task claim T-01 [inc] [--force]     append a claim (exit 3 lost race, 4 Files overlap)
 *   task done T-01 [inc] --evidence "…" | --run "<cmd>"   (exit 5 when the command fails;
 *                                       auto-claims when nobody holds a live claim)
 *   task release T-01 [inc] | --all-mine
 *   task block T-01 [inc] --note "…"
 *   task skip T-01 [inc] --reason "…"   (terminal; reason mandatory)
 *   task render [inc] [--write]         print the board; --write refreshes a legacy tasks.md
 *
 * `claim`, `done` and `block` accept `--line "<card text>"` (max 100 chars,
 * longer text is truncated with a warning) and `--link <url or path>`; they
 * feed the card checklist (`specweave cards --md`).
 *
 * `inc` defaults to the single active increment. Every command is read+append
 * only on ledger.jsonl. Task definitions (spec.md `## Tasks`, or a legacy
 * tasks.md) are never rewritten, so bookkeeping does not dirty the tree.
 * With `git.autoCommitIncrement` on, claim/done/release/block/skip then commit
 * the increment's spec.md, ledger.jsonl and metadata.json (`--no-commit` skips).
 * `next` and `claim` print the text of the task's acceptance criteria so the
 * agent does not need to reread spec.md for every task.
 *
 * @module cli/commands/task
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { runShell, isShellCommand } from '../../core/tasks/run-shell.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { closeChain, currentSessionId, markClosePending } from '../../core/increment/close-pending.js';
import { appendEvent, clampCardLine, recordSessionOnce, getAgentId, ledgerPath, describeState, DEFAULT_LEASE_HOURS, type LedgerEvent, type LedgerEventType } from '../../core/tasks/ledger.js';
import {
  loadTaskBoard,
  nextTask,
  fileOverlaps,
  unmetDeps,
  normalizeTaskId,
  writeRenderedTasksMd,
  renderBoardTable,
  type TaskBoard,
  type BoardTask,
} from '../../core/tasks/task-board.js';
import { resolveIncrement, readLeaseHours, ensureIncrementStarted, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { readSpecAcs, deriveAcStatus, type AcEntry } from '../../core/tasks/verify-runner.js';
import { acJson, deriveAcAcceptance } from '../../core/tasks/accepted-skip.js';
import { tasksFileName } from '../../core/tasks/tasks-source.js';
import { autoCommitIncrement, describeAutoCommit, isAutoCommitSubject, type AutoCommitRequest, type AutoCommitResult } from '../../core/increment/auto-commit.js';

export interface TaskCommandOptions {
  force?: boolean;
  evidence?: string;
  run?: string;
  note?: string;
  /** Alias of --note; mandatory for `skip`. */
  reason?: string;
  json?: boolean;
  allMine?: boolean;
  /** `render --write`: refresh a legacy tasks.md from the ledger. */
  write?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Override agent id (tests). */
  agent?: string;
  /** Card text for claim/done/block (max 100 chars). */
  line?: string;
  /** Card link (PR URL, report path, artifact URL) for claim/done/block. */
  link?: string;
  /** `--no-commit` → false: skip the `git.autoCommitIncrement` commit. */
  commit?: boolean;
}

export const EXIT_LOST_RACE = 3;
export const EXIT_FILES_OVERLAP = 4;
export const EXIT_RUN_FAILED = 5;
export const EXIT_DEPS_UNMET = 6;

const ACTIONS = new Set(['whoami', 'list', 'next', 'claim', 'done', 'release', 'block', 'skip', 'render']);

/** Entry point. Returns the process exit code (the bin sets process.exitCode). */
export async function taskCommand(action: string, a?: string, b?: string, opts: TaskCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const agent = opts.agent ?? getAgentId();

  if (!ACTIONS.has(action)) {
    err(`Unknown task action "${action}". Actions: ${[...ACTIONS].join(', ')}`);
    return 2;
  }
  if (action === 'whoami') {
    out(opts.json ? JSON.stringify({ agent }) : agent);
    return 0;
  }

  const projectRoot = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const needsTask = ['claim', 'done', 'release', 'block', 'skip'].includes(action) && !(action === 'release' && opts.allMine);
  const incArg = needsTask ? b : a;
  const taskArg = needsTask ? a : undefined;

  let inc;
  try {
    inc = resolveIncrement(projectRoot, incArg);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { err(e.message); return 1; }
    throw e;
  }
  const leaseHours = readLeaseHours(projectRoot);
  const load = (): TaskBoard => loadTaskBoard(inc.dir, { leaseHours });
  let board = load();
  const ledger = ledgerPath(inc.dir);
  const now = () => new Date().toISOString();
  const append = (e: LedgerEventType, t: string, extra: Partial<LedgerEvent> = {}) => {
    appendEvent(ledger, { t, e, by: agent, at: now(), ...extra });
    board = load();
  };
  let specAcs: AcEntry[] | undefined;
  const acsOf = (): AcEntry[] => (specAcs ??= readSpecAcs(inc.dir));
  /** `--reason` is the documented spelling for skip/block; `--note` stays as an alias. */
  const note = (opts.note ?? opts.reason)?.trim() || undefined;
  /** `--line` / `--link`, for the events that move a card. */
  const card: Partial<LedgerEvent> = {};
  if (opts.line?.trim()) {
    const { line, truncated } = clampCardLine(opts.line);
    if (truncated) err(`warning: --line is longer than 100 characters; stored as "${line}"`);
    card.line = line;
  }
  if (opts.link?.trim()) card.link = opts.link.trim();
  /** A live claim held by somebody else (stale claims are takeable). */
  const heldByOther = (t: BoardTask): boolean =>
    (t.state.status === 'claimed' || t.state.status === 'blocked') && t.state.by !== agent;
  /**
   * The last task just turned done or skipped: say how to close, and leave a
   * marker so the Stop hook reminds this session to close before it ends.
   */
  const finishedAll = (id: string): void => {
    markClosePending(projectRoot, id, currentSessionId());
    if (!opts.json) out(`All tasks done. ${closeNext(id)}`);
  };
  /** Current state of a task after the last append. */
  const stateOf = (id: string) => board.tasks.find((t) => t.id === id)!.state;
  /** Opt-in commit of the increment's own files; never changes the exit code. */
  const commitIncrement = (verb: AutoCommitRequest['action'], tasks: string[]): AutoCommitResult =>
    autoCommitIncrement(projectRoot, inc.dir, { incrementId: inc.id, action: verb, tasks, commit: opts.commit });
  const commitJson = (r: AutoCommitResult) =>
    r.status === 'off' ? {} : { commit: { status: r.status, sha: r.sha, subject: r.subject, pushed: r.pushed } };
  const reportCommit = (r: AutoCommitResult): void => {
    for (const w of r.warnings) err(`warning: ${w}`);
    const line = describeAutoCommit(r);
    if (line && !opts.json) out(line);
  };

  // Headings the parser could not read are reported, never dropped in silence.
  for (const w of board.warnings) err(`warning: ${w}`);

  if (action === 'list') {
    if (opts.json) {
      out(JSON.stringify({
        increment: inc.id, agent, counts: board.counts, malformed: board.fold.malformed,
        tasks: board.tasks.map((t) => ({ id: t.id, title: t.title, status: t.state.status, by: t.state.by, since: t.state.since, evidence: t.state.evidence, note: t.state.note, files: t.filesAffected ?? [], test: t.test, acs: t.acs ?? [] })),
        criteria: deriveAcAcceptance(deriveAcStatus(acsOf(), board), board).map(acJson),
      }, null, 2));
    } else {
      out(`${inc.id} — agent ${agent}`);
      out(renderBoardTable(board));
      if (board.fold.malformed) out(`(${board.fold.malformed} malformed ledger line(s) skipped)`);
    }
    return 0;
  }

  if (action === 'next') {
    const t = nextTask(board, agent);
    if (!t) {
      const c = board.counts;
      const finished = c.total > 0 && c.done + c.skipped === c.total;
      out(opts.json
        ? JSON.stringify({ increment: inc.id, next: null, counts: c, ...(finished ? { close: closeChain(inc.id) } : {}) })
        : finished
          ? `All tasks in ${inc.id} are done. ${closeNext(inc.id)}`
          : `No claimable task in ${inc.id} (${c.done}/${c.total} done, ${c.claimed} claimed, ${c.blocked} blocked). Run \`specweave verify ${inc.id}\` when everything is done.`);
      return 0;
    }
    out(opts.json ? JSON.stringify({ increment: inc.id, next: brief(t, acsOf()) }) : describeTask(t, inc.id, acsOf()));
    return 0;
  }

  if (action === 'render') {
    if (opts.write) {
      const changed = writeRenderedTasksMd(board);
      out(changed ? `tasks.md rendered from ledger (${board.counts.done}/${board.counts.total} done)` : 'no legacy tasks.md to render, or already up to date');
      return 0;
    }
    out(renderBoardTable(board));
    return 0;
  }

  if (action === 'release' && opts.allMine) {
    const mine = board.tasks.filter((t) => (t.state.status === 'claimed' || t.state.status === 'blocked' || t.state.status === 'stale') && t.state.by === agent);
    for (const t of mine) append('release', t.id, { note: note ?? 'release --all-mine' });
    out(mine.length ? `Released ${mine.map((t) => t.id).join(', ')}` : 'Nothing to release');
    if (mine.length) reportCommit(commitIncrement('release', mine.map((t) => t.id)));
    return 0;
  }

  // ── Task-scoped actions ────────────────────────────────────────────────
  if (!taskArg) { err(`Usage: specweave task ${action} <T-id> [increment]`); return 2; }
  const known = board.tasks.map((t) => t.id);
  const taskId = normalizeTaskId(taskArg, known);
  if (!taskId) { err(`Task "${taskArg}" not found in ${inc.id}/${tasksFileName(inc.dir)}. Known: ${known.join(', ') || '(none)'}`); return 1; }
  const task = board.tasks.find((t) => t.id === taskId)!;

  switch (action) {
    case 'claim': {
      if (task.state.status === 'done' || task.state.status === 'skipped') { err(`${taskId} is already ${task.state.status}`); return 1; }
      // Claiming a task starts the increment (planned → active). This is the
      // CLI transition the skills point at; nobody hand-edits metadata.json.
      const started = ensureIncrementStarted(inc.dir);
      if (started && !opts.json) out(started);
      if (heldByOther(task) && !opts.force) { err(refusal(task, taskId, leaseHours)); return EXIT_LOST_RACE; }
      const deps = unmetDeps(board, task);
      if (deps.length && !opts.force) { err(`${taskId} depends on ${deps.join(', ')} (not done). Use --force to override.`); return EXIT_DEPS_UNMET; }
      const overlap = fileOverlaps(board, task, agent);
      if (overlap.length && !opts.force) { err(`${taskId} shares Files with live claim(s) ${overlap.join(', ')}. Pick another task or --force.`); return EXIT_FILES_OVERLAP; }
      recordSessionOnce(ledger, agent);
      append('claim', taskId, { ...(note ? { note } : {}), ...card });
      // Re-read: the earliest live claim wins; confirm we own it.
      const after = board.tasks.find((t) => t.id === taskId)!;
      if (after.state.by !== agent || (after.state.status !== 'claimed')) {
        err(`Lost the race for ${taskId}: ${describeState(after.state)}`);
        return EXIT_LOST_RACE;
      }
      const committed = commitIncrement('claim', [taskId]);
      out(opts.json ? JSON.stringify({ claimed: taskId, by: agent, task: brief(after, acsOf()), ...commitJson(committed) }) : `Claimed ${taskId} as ${agent}\n${describeTask(after, inc.id, acsOf())}`);
      reportCommit(committed);
      return 0;
    }
    case 'done': {
      if (task.state.status === 'done') { out(`${taskId} already done by ${task.state.by}`); return 0; }
      if (task.state.status === 'skipped') {
        err(`${taskId} was skipped by ${task.state.by}${task.state.note ? ` (${task.state.note})` : ''} — skip is terminal; add a new task to ${tasksFileName(inc.dir)} if the work is needed after all`);
        return 1;
      }
      if (heldByOther(task) && !opts.force) { err(refusal(task, taskId, leaseHours)); return EXIT_LOST_RACE; }

      let evidence = (opts.evidence ?? '').trim();
      const cmd = opts.run?.trim() || (!evidence && isShellCommand(task.test) ? task.test : undefined);
      let logPath: string | undefined;
      if (cmd) {
        const result = await runShell(cmd, projectRoot);
        logPath = writeRunLog(inc.dir, taskId, cmd, result.code, result.output);
        const tail = result.tail.trim();
        if (result.code !== 0) {
          err(`${taskId} NOT done — \`${cmd}\` exited ${result.code} (full log: ${rel(projectRoot, logPath)})\n${tail}`);
          return EXIT_RUN_FAILED;
        }
        evidence = [`${cmd} → exit 0`, `log: ${rel(projectRoot, logPath)}`, tail, evidence].filter(Boolean).join('\n');
      }
      if (!evidence && card.link) evidence = card.link;
      if (!evidence) { err(`done needs evidence: --evidence "<sha or test output>" or --run "<cmd>" (task Test: ${task.test ?? 'none'})`); return 2; }
      // The last work commit: auto-commits of the ledger itself do not count.
      const work = lastWorkCommit(projectRoot);
      if (work && !evidence.includes(work.sha)) evidence = `${evidence}\nHEAD ${work.sha}`;
      const incNum = inc.id.match(/^\d{3,}[A-Za-z]?(?=-)/)?.[0];
      if (work?.subject && incNum && !work.subject.includes(incNum)) {
        err(`warning: HEAD subject "${work.subject}" does not mention ${incNum} — commit as \`${incNum}: <what changed>\` so the work is traceable`);
      }

      // Auto-claim: a single agent needs one command, not claim+done.
      const heldByMe = (task.state.status === 'claimed' || task.state.status === 'blocked') && task.state.by === agent;
      if (!heldByMe) {
        // Same rule as `claim`: an auto-claim is still a claim, so it starts
        // the increment. Without this, `task done` (the one-command path the
        // docs recommend) recorded work against a still-`planned` increment.
        const autoStarted = ensureIncrementStarted(inc.dir);
        if (autoStarted && !opts.json) out(autoStarted);
        recordSessionOnce(ledger, agent);
        append('claim', taskId);
        if (!opts.json) out(`Auto-claimed ${taskId} as ${agent}`);
      }
      append('done', taskId, { evidence, ...(note ? { note } : {}), ...card });
      const doneState = stateOf(taskId);
      if (doneState.status !== 'done') {
        err(`${taskId} was NOT recorded as done — ${describeState(doneState)}. The ledger keeps the earliest live claim; ask that agent to release it.`);
        return EXIT_LOST_RACE;
      }
      const c = board.counts;
      const allDone = c.done + c.skipped === c.total && c.total > 0;
      const committed = commitIncrement('done', [taskId]);
      out(opts.json ? JSON.stringify({ done: taskId, evidence, log: logPath ? rel(projectRoot, logPath) : undefined, counts: c, ...(allDone ? { close: closeChain(inc.id) } : {}), ...commitJson(committed) }) : `Done ${taskId} (${c.done}/${c.total}) — evidence: ${firstLine(evidence)}`);
      reportCommit(committed);
      if (allDone) finishedAll(inc.id);
      return 0;
    }
    case 'release': {
      if (task.state.by !== agent && !opts.force) { err(`${taskId} is not yours (${describeState(task.state)})`); return 1; }
      if (task.state.status === 'open' || task.state.status === 'done' || task.state.status === 'skipped') { out(`${taskId} is ${task.state.status}; nothing to release`); return 0; }
      append('release', taskId, note ? { note } : {});
      out(`Released ${taskId}`);
      reportCommit(commitIncrement('release', [taskId]));
      return 0;
    }
    case 'block': {
      if (!note) { err('block needs --reason "<why it is blocked>"'); return 2; }
      if (heldByOther(task) && !opts.force) { err(refusal(task, taskId, leaseHours)); return EXIT_LOST_RACE; }
      append('block', taskId, { note, ...card });
      out(`Blocked ${taskId}: ${note}`);
      reportCommit(commitIncrement('block', [taskId]));
      return 0;
    }
    case 'skip': {
      if (!note) { err('skip needs --reason "<why this task is not needed>"'); return 2; }
      if (task.state.status === 'done') { err(`${taskId} is already done by ${task.state.by} — skip is for work that will not happen`); return 1; }
      if (heldByOther(task) && !opts.force) { err(refusal(task, taskId, leaseHours)); return EXIT_LOST_RACE; }
      const wasSkipped = task.state.status === 'skipped';
      append('skip', taskId, { note });
      const skipState = stateOf(taskId);
      if (skipState.status !== 'skipped') {
        err(`${taskId} was NOT recorded as skipped — ${describeState(skipState)}.`);
        return EXIT_LOST_RACE;
      }
      const c = board.counts;
      // Re-skipping a task that was already skipped finishes nothing new.
      const allDone = !wasSkipped && c.done + c.skipped === c.total && c.total > 0;
      const committed = commitIncrement('skip', [taskId]);
      out(opts.json ? JSON.stringify({ skipped: taskId, reason: note, counts: c, ...(allDone ? { close: closeChain(inc.id) } : {}), ...commitJson(committed) }) : `Skipped ${taskId} (terminal): ${note}`);
      reportCommit(committed);
      if (allDone) finishedAll(inc.id);
      return 0;
    }
  }
  return 0;
}

/** What to do once every task is done or skipped. */
function closeNext(id: string): string {
  return `Next, in this session and without asking: ${closeChain(id)}. A lane agent leaves the close to its lead.`;
}

/** Refusal text that reads as an instruction, not a status code. */
function refusal(task: BoardTask, taskId: string, leaseHours: number): string {
  return `refused: ${taskId} is claimed by ${task.state.by} since ${task.state.since}; run \`specweave task release ${taskId}\` as that agent, wait for the ${leaseHours}h lease to expire, or pass --force`;
}

/**
 * Store the full command output next to the increment's other evidence.
 * `.txt`, not `.log`: the ledger cites this file so it must be committable,
 * and most .gitignore files ignore `*.log`.
 */
function writeRunLog(incrementDir: string, taskId: string, cmd: string, code: number, output: string): string {
  const dir = path.join(incrementDir, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `task-${taskId}.txt`);
  fs.writeFileSync(file, `$ ${cmd}\n# exit ${code} — ${new Date().toISOString()}\n\n${output}`, 'utf-8');
  return file;
}

function rel(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/');
}

function firstLine(s: string): string {
  return s.split('\n')[0];
}

/**
 * Newest commit that is not an auto-commit of increment files (those would
 * hide the work commit from the traceability check and the evidence).
 */
function lastWorkCommit(cwd: string): { sha: string; subject: string } | undefined {
  // Pages of subjects only: a body line that looks like an auto-commit subject
  // (a squash of work and auto-commits) must not hide the work commit.
  const page = 200;
  for (let skip = 0; skip < 50 * page; skip += page) {
    let out: string;
    try {
      out = execFileSync('git', ['log', `-n${page}`, `--skip=${skip}`, '--format=%h%x09%s'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return undefined;
    }
    const rows = out.split('\n').filter(Boolean);
    for (const l of rows) {
      const tab = l.indexOf('\t');
      const subject = l.slice(tab + 1);
      if (!isAutoCommitSubject(subject)) return { sha: l.slice(0, tab), subject };
    }
    if (rows.length < page) return undefined;
  }
  return undefined;
}

/** The acceptance criteria a task covers, with their text from spec.md. */
function taskAcs(t: BoardTask, acs: AcEntry[]): AcEntry[] {
  const byId = new Map(acs.map((a) => [a.id, a]));
  return (t.acs ?? []).map((id) => byId.get(id) ?? { id, done: false, text: '' });
}

function brief(t: BoardTask, acs: AcEntry[] = []) {
  return {
    id: t.id, title: t.title, files: t.filesAffected ?? [], test: t.test, acs: t.acs ?? [],
    criteria: taskAcs(t, acs).map((a) => ({ id: a.id, text: a.text })),
    status: t.state.status, by: t.state.by,
  };
}

function describeTask(t: BoardTask, incId: string, acs: AcEntry[] = []): string {
  const criteria = taskAcs(t, acs);
  return [
    `${t.id} ${t.title}`,
    ...(criteria.length ? criteria.map((a) => `  ${a.id}: ${a.text || '(text not found in spec.md)'}`) : ['  AC: -']),
    `  Files: ${(t.filesAffected ?? []).join(', ') || '-'} | Test: ${t.test ?? '-'}`,
    `  state: ${describeState(t.state)}`,
    `  when done: specweave task done ${t.id} ${incId}${t.test ? ` --run "${t.test}"` : ' --evidence "<sha / output>"'}`,
  ].join('\n');
}
