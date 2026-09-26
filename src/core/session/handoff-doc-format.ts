/**
 * Handoff Doc Format (2.0) — single source of truth, ≤ 1 page.
 *
 * Renders BOTH the durable handoff document and the copy-paste resume prompt
 * from one {@link HandoffDocInput}. PURE rendering: no IO, no git — callers
 * pass already-captured + already-scrubbed data in.
 *
 * Sections (in order): Where I left off · Done / Pending · Decisions ·
 * Files touched · Next steps · Resume. Header carries agent id, git, and the
 * active claims. The `Doc format v2` footer marker is the ownership sentinel.
 *
 * @module core/session/handoff-doc-format
 */

import * as path from 'path';

/** Footer marker (ownership sentinel + format version handle). */
export const DOC_FORMAT_MARKER = 'Doc format v2';
/** Prior marker — still recognized as "ours" so v1 docs are overwritten, not treated as foreign. */
export const LEGACY_DOC_FORMAT_MARKER = 'Doc format v1';

export const INLINE_BEGIN_MARKER = 'BEGIN HANDOFF';
export const INLINE_END_MARKER = 'END HANDOFF';

export const HANDOFF_SECTION_ORDER: readonly string[] = [
  'Where I left off',
  'Done / Pending',
  'Decisions',
  'Files touched',
  'Next steps',
  'Resume',
] as const;

/** Per-tool native resume commands (pinned by cross-tool-commands.test.ts). */
export interface ToolResumeEntry {
  /** The tool name `detectTool` writes into ledger ids (`grok@mbp`). */
  id: string;
  tool: string;
  findSession: string;
  resumeCmd: string;
}

export const CLAUDE_MUNGE_EXAMPLE =
  '/Users/antonabyzov/Projects/github/specweave-umb/.claude-worktrees/x ' +
  '→ -Users-antonabyzov-Projects-github-specweave-umb--claude-worktrees-x';

export const TOOL_RESUME_MATRIX: readonly ToolResumeEntry[] = [
  {
    id: 'claude',
    tool: 'Claude Code',
    findSession:
      'ls ~/.claude/projects/<munged-cwd>/ (munge: every non-alphanumeric char → "-", runs NOT collapsed; e.g. ' +
      CLAUDE_MUNGE_EXAMPLE + ')',
    resumeCmd: 'claude -r <uuid>',
  },
  {
    id: 'codex',
    tool: 'Codex',
    findSession: 'ls ~/.codex/sessions/ (newest dir = most recent session)',
    resumeCmd: 'codex resume <uuid>   (or: codex resume --last)',
  },
  {
    id: 'opencode',
    tool: 'OpenCode',
    findSession: 'opencode sessions list',
    resumeCmd: 'opencode -s <id>   (long form: opencode --session <id>)',
  },
  {
    id: 'gemini',
    tool: 'Gemini CLI',
    findSession: 'run /chat list inside the Gemini session to see saved tags',
    resumeCmd: '/chat resume <tag>',
  },
  {
    id: 'antigravity',
    tool: 'Antigravity',
    findSession: 'open the Antigravity Agent Manager and pick the prior task thread',
    resumeCmd: 'resume the thread from the Antigravity Agent Manager',
  },
  {
    id: 'aider',
    tool: 'Aider',
    findSession: 'aider keeps .aider.chat.history.md in the repo root',
    resumeCmd: 'aider --restore-chat-history',
  },
  {
    id: 'grok',
    tool: 'Grok Build',
    findSession: 'ls ~/.grok/sessions/<encoded-cwd>/ (or pick one on the grok welcome screen)',
    resumeCmd: 'grok --resume <id>   (or: grok --resume for the latest here)',
  },
  {
    id: 'muse',
    tool: 'Muse Code',
    findSession: 'run muse resume to pick from recent sessions',
    resumeCmd: 'muse resume   (headless: muse exec --session-id <uuid>)',
  },
] as const;

/** One ledger row for the Done / Pending table. */
export interface HandoffTaskRow {
  id: string;
  title: string;
  status: string;
  by?: string;
  evidence?: string;
}

export interface HandoffIncrementInfo {
  id: string;
  status: string;
  title?: string;
  tasks: HandoffTaskRow[];
  counts: { total: number; done: number; skipped: number; claimed: number; blocked: number; stale: number; open: number };
  doneAcs: number;
  totalAcs: number;
  /** The task `specweave task next` would hand out, if any. */
  nextTask?: HandoffTaskRow;
}

export interface HandoffGitInfo {
  isGitRepo: boolean;
  branch: string;
  shortSha: string;
  statusPorcelain: string;
  diffStat: string;
  hasUncommittedChanges: boolean;
}

export interface HandoffDocInput {
  docPath: string;
  diffPath: string;
  repoRoot: string;
  generatedAt: string;
  isSpecWeave: boolean;
  /** Agent id of the writer (`specweave task whoami`). */
  agent: string;
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  /** Decisions (spec/plan bullets + agent-supplied), already merged + scrubbed. */
  decisions: string[];
  increment?: HandoffIncrementInfo;
  git: HandoffGitInfo;
  redactionCounts: Record<string, number>;
  /** What `--push` published, if it ran. */
  push?: HandoffPushInfo;
  /** Claims this handoff released so the next agent can take them. */
  released?: string[];
}

export interface HandoffPushInfo {
  /** Branch pushed to origin (empty when the push was not needed or failed). */
  branch?: string;
  /** `wip/<branch>`, set when the snapshot carries uncommitted edits. */
  wipRef?: string;
  /** The well-known ref `specweave pickup` fetches. */
  handoffRef?: string;
  /** The snapshot commit pushed to it. */
  snapshot?: string;
  /** Why nothing was pushed, when that was expected (no remote, no Git). */
  skipped?: string;
  /** Why a push step did not happen, in words. */
  warnings: string[];
}

/** In-repo paths print relative to the repo; paths outside it stay absolute. */
export function repoRelative(repoRoot: string, p: string): string {
  const relative = path.relative(repoRoot, p);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return p;
  return relative.split(path.sep).join('/');
}

const MAX_TASK_ROWS = 25;
const MAX_DECISIONS = 8;

function totalRedactions(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function uncommittedCount(porcelain: string): number {
  return porcelain.split('\n').filter((l) => l.trim()).length;
}

/**
 * Render the ≤1-page handoff document.
 */
export function renderHandoffDoc(input: HandoffDocInput): string {
  const L: string[] = [];
  const inc = input.increment;

  // ── Header ────────────────────────────────────────────────────────────
  const title = inc ? `${inc.id}${inc.title ? ` ${inc.title}` : ''}` : 'no active increment';
  L.push(`# Handoff — ${title}`);
  const gitBit = input.git.isGitRepo
    ? `branch ${input.git.branch || '(detached)'} @ ${input.git.shortSha || '(no commits)'} · tree: ${input.git.hasUncommittedChanges ? `${uncommittedCount(input.git.statusPorcelain)} uncommitted` : 'clean'}`
    : 'not a git repo';
  L.push(`agent: ${input.agent} · ${input.generatedAt} · ${gitBit} · redactions: ${totalRedactions(input.redactionCounts)}`);
  const claims = (inc?.tasks ?? []).filter((t) => t.status === 'claimed' || t.status === 'blocked' || t.status === 'stale');
  L.push(`active claims: ${claims.length ? claims.map((t) => `${t.id} (${t.status} by ${t.by})`).join(', ') : 'none'}${input.released?.length ? ` · released: ${input.released.join(', ')}` : ''}`);
  if (input.push?.warnings.length) L.push(`push: ${input.push.warnings.join('; ')}`);
  L.push('');

  // ── Where I left off ──────────────────────────────────────────────────
  L.push('## Where I left off');
  if (input.reason) L.push(`Why: ${input.reason}`);
  if (input.summary) L.push(input.summary);
  if (inc) {
    L.push(`Increment ${inc.id} (${inc.status}) · tasks ${inc.counts.done}/${inc.counts.total} done · ACs ${inc.doneAcs}/${inc.totalAcs}`);
  } else {
    L.push('No active SpecWeave increment — git + notes handoff.');
  }
  if (input.gotcha) L.push(`Gotcha: ${input.gotcha}`);
  L.push('');

  // ── Done / Pending ────────────────────────────────────────────────────
  L.push('## Done / Pending');
  if (inc && inc.tasks.length) {
    L.push('| Task | State | By | Evidence / note |');
    L.push('|---|---|---|---|');
    for (const t of inc.tasks.slice(0, MAX_TASK_ROWS)) {
      L.push(`| ${t.id} ${t.title} | ${t.status} | ${t.by ?? ''} | ${(t.evidence ?? '').replace(/\|/g, '/').slice(0, 60)} |`);
    }
    if (inc.tasks.length > MAX_TASK_ROWS) L.push(`| … | +${inc.tasks.length - MAX_TASK_ROWS} more | | see tasks.md |`);
    const c = inc.counts;
    L.push(`${c.done}/${c.total} done · ${c.skipped} skipped · ${c.claimed} claimed · ${c.blocked} blocked · ${c.stale} stale · ${c.open} open`);
  } else {
    L.push('_No task state available._');
  }
  L.push('');

  // ── Decisions ─────────────────────────────────────────────────────────
  L.push('## Decisions');
  if (input.decisions.length) {
    for (const d of input.decisions.slice(0, MAX_DECISIONS)) L.push(`- ${d}`);
    if (input.decisions.length > MAX_DECISIONS) L.push(`- … +${input.decisions.length - MAX_DECISIONS} more in spec.md / plan.md`);
  } else {
    L.push('_None recorded — see spec.md Approach._');
  }
  L.push('');

  // ── Files touched ─────────────────────────────────────────────────────
  L.push('## Files touched');
  if (input.git.hasUncommittedChanges) {
    L.push('UNCOMMITTED — commit or stash before anything destructive.');
    L.push('```');
    L.push(input.git.statusPorcelain || '(no porcelain output)');
    L.push('```');
    L.push(`Full diff: \`${repoRelative(input.repoRoot, input.diffPath)}\``);
    if (input.push?.wipRef) L.push(`Also pushed to \`${input.push.wipRef}\`; \`specweave pickup\` applies it.`);
  } else if (input.git.isGitRepo) {
    L.push('Working tree clean.');
  } else {
    L.push('Not a git repository — no diff captured.');
  }
  L.push('');

  // ── Next steps ────────────────────────────────────────────────────────
  L.push('## Next steps');
  if (input.next) {
    L.push(input.next);
  } else if (inc?.nextTask) {
    L.push(`\`specweave task claim ${inc.nextTask.id} ${inc.id}\` — ${inc.nextTask.title}`);
  } else if (inc && inc.counts.done + inc.counts.skipped === inc.counts.total && inc.counts.total > 0) {
    L.push(`All tasks done → \`specweave verify ${inc.id}\` then \`specweave complete ${inc.id}\`.`);
  } else {
    L.push('_No explicit next step — read the summary above._');
  }
  L.push('');

  // ── Resume ────────────────────────────────────────────────────────────
  L.push('## Resume');
  L.push('1. `specweave pickup` prints the next task with its acceptance criteria, claims and branch state.');
  L.push(`2. \`specweave task claim <T-id>${inc ? ` ${inc.id}` : ''}\` → implement → \`specweave task done <T-id> --run "<test>"\`.`);
  const own = TOOL_RESUME_MATRIX.find((e) => e.id === input.agent.split('@')[0]);
  const transcripts = own ? [own] : TOOL_RESUME_MATRIX.slice(0, 3);
  L.push(`3. Original transcript (optional): ${transcripts.map((e) => `${e.tool}: \`${e.resumeCmd.split('   ')[0]}\``).join(' · ')}.`);
  L.push('');
  L.push('---');
  L.push(`<!-- ${DOC_FORMAT_MARKER} -->`);

  return L.join('\n');
}

/**
 * Render the copy-paste resume prompt. `inline` embeds the full body between
 * BEGIN/END markers for cross-machine resume.
 */
export function renderPastePrompt(input: HandoffDocInput, opts: { inline?: boolean } = {}): string {
  const P: string[] = [];
  if (opts.inline) {
    P.push('Resume my work using the self-contained handoff below.');
    P.push(
      'Treat everything between the markers as ground truth. ' +
        'If it references a `.diff` path that does not exist on this machine, ask me to paste the diff.',
    );
    P.push('');
    P.push(INLINE_BEGIN_MARKER);
    P.push(renderHandoffDoc(input));
    P.push(INLINE_END_MARKER);
  } else if (input.push?.handoffRef) {
    // Pushed: the other side needs two words, not a prompt.
    P.push('Pick up my handed-off work: run `specweave pickup` and continue with the task it names.');
  } else {
    // Repo-relative paths: the next tool may run in another checkout, where
    // an absolute path means nothing.
    const doc = repoRelative(input.repoRoot, input.docPath);
    P.push('Pick up my handed-off work: run `specweave pickup` and continue with the task it names.');
    P.push(`The handoff doc is ${doc}. If it is not in your checkout, STOP and ask me to paste it; do not improvise context.`);
    if (input.git.hasUncommittedChanges) P.push(`The uncommitted edits are in ${repoRelative(input.repoRoot, input.diffPath)}.`);
  }
  return P.join('\n');
}
