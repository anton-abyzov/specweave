/**
 * CLI: `specweave task <action> …` — the multi-vendor task ledger.
 *
 *   task whoami                         print the agent id
 *   task list [inc] [--json]            table: task, status, by, evidence
 *   task next [inc] [--json]            first open task with deps met + no Files overlap
 *   task claim T-01 [inc] [--force]     append a claim (exit 3 lost race, 4 Files overlap)
 *   task done T-01 [inc] --evidence "…" | --run "<cmd>"   (exit 5 when the command fails)
 *   task release T-01 [inc] | --all-mine
 *   task block T-01 [inc] --note "…"
 *   task skip T-01 [inc] --note "…"
 *   task render [inc]                   rewrite derived state lines + SW:BOARD in tasks.md
 *
 * `inc` defaults to the single active increment. Every command is read+append
 * only on ledger.jsonl; tasks.md is rewritten only by `render` / after `done`.
 *
 * @module cli/commands/task
 */

import { execFileSync } from 'child_process';
import { runShell, isShellCommand } from '../../core/tasks/run-shell.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { appendEvent, getAgentId, ledgerPath, describeState, type LedgerEvent, type LedgerEventType } from '../../core/tasks/ledger.js';
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
import { resolveIncrement, readLeaseHours, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';

export interface TaskCommandOptions {
  force?: boolean;
  evidence?: string;
  run?: string;
  note?: string;
  json?: boolean;
  allMine?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Override agent id (tests). */
  agent?: string;
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
  const append = (e: LedgerEventType, t: string, extra: Partial<LedgerEvent> = {}) =>
    appendEvent(ledger, { t, e, by: agent, at: now(), ...extra });

  if (action === 'list') {
    if (opts.json) {
      out(JSON.stringify({
        increment: inc.id, agent, counts: board.counts, malformed: board.fold.malformed,
        tasks: board.tasks.map((t) => ({ id: t.id, title: t.title, status: t.state.status, by: t.state.by, since: t.state.since, evidence: t.state.evidence, note: t.state.note, files: t.filesAffected ?? [], test: t.test, acs: t.acs ?? [] })),
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
      out(opts.json ? JSON.stringify({ increment: inc.id, next: null, counts: c }) : `No claimable task in ${inc.id} (${c.done}/${c.total} done, ${c.claimed} claimed, ${c.blocked} blocked). Run \`specweave verify ${inc.id}\` when everything is done.`);
      return 0;
    }
    out(opts.json ? JSON.stringify({ increment: inc.id, next: brief(t) }) : describeTask(t, inc.id));
    return 0;
  }

  if (action === 'render') {
    const changed = writeRenderedTasksMd(board);
    out(changed ? `tasks.md rendered from ledger (${board.counts.done}/${board.counts.total} done)` : 'tasks.md already up to date');
    return 0;
  }

  if (action === 'release' && opts.allMine) {
    const mine = board.tasks.filter((t) => (t.state.status === 'claimed' || t.state.status === 'blocked' || t.state.status === 'stale') && t.state.by === agent);
    for (const t of mine) append('release', t.id, { note: opts.note ?? 'release --all-mine' });
    out(mine.length ? `Released ${mine.map((t) => t.id).join(', ')}` : 'Nothing to release');
    return 0;
  }

  // ── Task-scoped actions ────────────────────────────────────────────────
  if (!taskArg) { err(`Usage: specweave task ${action} <T-id> [increment]`); return 2; }
  const known = board.tasks.map((t) => t.id);
  const taskId = normalizeTaskId(taskArg, known);
  if (!taskId) { err(`Task "${taskArg}" not found in ${inc.id}/tasks.md. Known: ${known.join(', ') || '(none)'}`); return 1; }
  const task = board.tasks.find((t) => t.id === taskId)!;

  switch (action) {
    case 'claim': {
      if (task.state.status === 'done' || task.state.status === 'skipped') { err(`${taskId} is already ${task.state.status}`); return 1; }
      if ((task.state.status === 'claimed' || task.state.status === 'blocked') && task.state.by !== agent && !opts.force) {
        err(`${taskId} is ${describeState(task.state)}. Use --force to take over.`);
        return EXIT_LOST_RACE;
      }
      const deps = unmetDeps(board, task);
      if (deps.length && !opts.force) { err(`${taskId} depends on ${deps.join(', ')} (not done). Use --force to override.`); return EXIT_DEPS_UNMET; }
      const overlap = fileOverlaps(board, task, agent);
      if (overlap.length && !opts.force) { err(`${taskId} shares Files with live claim(s) ${overlap.join(', ')}. Pick another task or --force.`); return EXIT_FILES_OVERLAP; }
      append('claim', taskId, opts.note ? { note: opts.note } : {});
      // Re-read: the earliest live claim wins; confirm we own it.
      board = load();
      const after = board.tasks.find((t) => t.id === taskId)!;
      if (after.state.by !== agent || (after.state.status !== 'claimed')) {
        err(`Lost the race for ${taskId}: ${describeState(after.state)}`);
        return EXIT_LOST_RACE;
      }
      out(opts.json ? JSON.stringify({ claimed: taskId, by: agent, task: brief(after) }) : `Claimed ${taskId} as ${agent}\n${describeTask(after, inc.id)}`);
      return 0;
    }
    case 'done': {
      if (task.state.status === 'done') { out(`${taskId} already done by ${task.state.by}`); return 0; }
      if ((task.state.status === 'claimed' || task.state.status === 'blocked') && task.state.by !== agent && !opts.force) {
        err(`${taskId} is ${describeState(task.state)}. Use --force to override.`);
        return EXIT_LOST_RACE;
      }
      let evidence = (opts.evidence ?? '').trim();
      const cmd = opts.run?.trim() || (!evidence && isShellCommand(task.test) ? task.test : undefined);
      if (cmd) {
        const result = await runShell(cmd, projectRoot);
        const tail = result.tail.trim();
        if (result.code !== 0) {
          err(`${taskId} NOT done — \`${cmd}\` exited ${result.code}\n${tail}`);
          return EXIT_RUN_FAILED;
        }
        evidence = [`${cmd} → exit 0`, tail ? tail.split('\n').slice(-5).join(' | ') : '', evidence].filter(Boolean).join(' | ');
      }
      if (!evidence) { err(`done needs evidence: --evidence "<sha or test output>" or --run "<cmd>" (task Test: ${task.test ?? 'none'})`); return 2; }
      const sha = headSha(projectRoot);
      if (sha && !evidence.includes(sha)) evidence = `${evidence} | HEAD ${sha}`;
      append('done', taskId, { evidence, ...(opts.note ? { note: opts.note } : {}) });
      board = load();
      writeRenderedTasksMd(board);
      const c = board.counts;
      out(opts.json ? JSON.stringify({ done: taskId, evidence, counts: c }) : `Done ${taskId} (${c.done}/${c.total}) — evidence: ${evidence}`);
      if (c.done + c.skipped === c.total && c.total > 0) out(`All tasks done. Next: specweave verify ${inc.id}`);
      return 0;
    }
    case 'release': {
      if (task.state.by !== agent && !opts.force) { err(`${taskId} is not yours (${describeState(task.state)})`); return 1; }
      if (task.state.status === 'open' || task.state.status === 'done' || task.state.status === 'skipped') { out(`${taskId} is ${task.state.status}; nothing to release`); return 0; }
      append('release', taskId, opts.note ? { note: opts.note } : {});
      out(`Released ${taskId}`);
      return 0;
    }
    case 'block': {
      if (!opts.note) { err('block needs --note "<reason>"'); return 2; }
      if ((task.state.status === 'claimed' || task.state.status === 'blocked') && task.state.by !== agent && !opts.force) {
        err(`${taskId} is ${describeState(task.state)}.`); return EXIT_LOST_RACE;
      }
      append('block', taskId, { note: opts.note });
      writeRenderedTasksMd(load());
      out(`Blocked ${taskId}: ${opts.note}`);
      return 0;
    }
    case 'skip': {
      if (!opts.note) { err('skip needs --note "<reason>"'); return 2; }
      if ((task.state.status === 'claimed' || task.state.status === 'blocked') && task.state.by !== agent && !opts.force) {
        err(`${taskId} is ${describeState(task.state)}.`); return EXIT_LOST_RACE;
      }
      append('skip', taskId, { note: opts.note });
      writeRenderedTasksMd(load());
      out(`Skipped ${taskId}: ${opts.note}`);
      return 0;
    }
  }
  return 0;
}

function brief(t: BoardTask) {
  return { id: t.id, title: t.title, files: t.filesAffected ?? [], test: t.test, acs: t.acs ?? [], status: t.state.status, by: t.state.by };
}

function describeTask(t: BoardTask, incId: string): string {
  return [
    `${t.id} ${t.title}`,
    `  AC: ${(t.acs ?? []).join(', ') || '-'} | Files: ${(t.filesAffected ?? []).join(', ') || '-'} | Test: ${t.test ?? '-'}`,
    `  state: ${describeState(t.state)}`,
    `  when done: specweave task done ${t.id} ${incId}${t.test ? ` --run "${t.test}"` : ' --evidence "<sha / output>"'}`,
  ].join('\n');
}

function headSha(cwd: string): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
