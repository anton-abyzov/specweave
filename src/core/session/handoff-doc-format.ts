/**
 * Handoff Doc Format — single source of truth
 *
 * Renders BOTH the durable handoff document and the copy-paste resume prompt
 * from one {@link HandoffDocInput}. The CLI command, the PreCompact hook
 * handler, and the vitest parity test all render through this module, so the
 * doc format and paste-prompt cannot drift between code paths. The vskill
 * self-contained skill inlines a byte-compatible template that references the
 * same canonical section order + footer marker exported here.
 *
 * Design rules:
 * - This module is PURE rendering. It does no IO, no git, no workspace
 *   detection — callers pass already-captured + already-scrubbed data in.
 * - The absolute doc path, the `.diff` path, and the per-tool resume matrix are
 *   inputs/constants so the renderer is deterministic and testable.
 * - The `Doc format v1` footer marker (DOC_FORMAT_MARKER) is the ownership
 *   sentinel that lets the builder know a file is a prior handoff it may
 *   overwrite, and the version handle for future format migrations.
 *
 * Part of increment 0867: Cross-Tool Work Handoff
 * (AC-US1-02, AC-US2-04, AC-US5-01..04, AC-US6-02, AC-US6-05).
 *
 * @module core/session/handoff-doc-format
 */

/**
 * Footer marker stamped at the bottom of every handoff doc.
 *
 * Doubles as the ownership sentinel: a root `./HANDOFF.md` containing this
 * string is treated as a prior handoff (safe to overwrite); one lacking it is a
 * foreign file the builder must not clobber.
 */
export const DOC_FORMAT_MARKER = 'Doc format v1';

/**
 * Delimiters wrapping the self-contained body in `--inline` paste-prompts.
 * A resuming agent reads everything between these markers as the handoff.
 */
export const INLINE_BEGIN_MARKER = 'BEGIN HANDOFF';
export const INLINE_END_MARKER = 'END HANDOFF';

/**
 * Canonical section headers, in render order. Exported so the vskill inlined
 * template and the format-parity test (T-017) reference ONE source and fail at
 * build time if either side reorders or renames a section.
 */
export const HANDOFF_SECTION_ORDER: readonly string[] = [
  'Where I Left Off',
  'Done / Pending',
  'Key Decisions & Gotchas',
  'Files Touched',
  'Exact Next Steps',
  'How To Resume',
  'Redaction',
] as const;

/**
 * Per-tool resume guidance. The `findSession` + `resumeCmd` strings are
 * VERIFIED against the live CLIs and pinned by cross-tool-commands.test.ts
 * (T-016) so the matrix cannot silently drift when a tool updates.
 */
export interface ToolResumeEntry {
  /** Display name. */
  tool: string;
  /** How to locate the source session on disk / in the tool. */
  findSession: string;
  /** Native resume command(s). */
  resumeCmd: string;
}

/**
 * The cross-tool resume matrix (AC-US5-01, AC-US5-02).
 *
 * NOTE on Claude: session files live under
 * `~/.claude/projects/<munged-cwd>/<uuid>.jsonl`, where the cwd is munged by
 * replacing EVERY non-alphanumeric char with `-` and NOT collapsing runs — so a
 * leading slash and adjacent separators each become their own dash. Example:
 *   /Users/.../specweave-umb/.claude-worktrees/x
 *   → -Users-...-specweave-umb--claude-worktrees-x
 * (the `/.` between `umb` and `claude-worktrees` yields a double dash).
 */
export const CLAUDE_MUNGE_EXAMPLE =
  '/Users/antonabyzov/Projects/github/specweave-umb/.claude-worktrees/x ' +
  '→ -Users-antonabyzov-Projects-github-specweave-umb--claude-worktrees-x';

export const TOOL_RESUME_MATRIX: readonly ToolResumeEntry[] = [
  {
    tool: 'Claude Code',
    findSession:
      'ls ~/.claude/projects/<munged-cwd>/ (munge: every non-alphanumeric char → "-", runs NOT collapsed; e.g. ' +
      CLAUDE_MUNGE_EXAMPLE + ')',
    resumeCmd: 'claude -r <uuid>',
  },
  {
    tool: 'Codex',
    findSession: 'ls ~/.codex/sessions/ (newest dir = most recent session)',
    resumeCmd: 'codex resume <uuid>   (or: codex resume --last)',
  },
  {
    tool: 'OpenCode',
    findSession: 'opencode sessions list',
    resumeCmd: 'opencode -s <id>   (long form: opencode --session <id>)',
  },
  {
    tool: 'Gemini CLI',
    findSession: 'run /chat list inside the Gemini session to see saved tags',
    resumeCmd: '/chat resume <tag>',
  },
  {
    tool: 'Antigravity',
    findSession: 'open the Antigravity Agent Manager and pick the prior task thread',
    resumeCmd: 'resume the thread from the Antigravity Agent Manager',
  },
  {
    tool: 'Aider',
    findSession: 'aider keeps .aider.chat.history.md in the repo root',
    resumeCmd: 'aider --restore-chat-history',
  },
] as const;

/**
 * Increment-derived facts (present only on the SpecWeave high-fidelity path).
 */
export interface HandoffIncrementInfo {
  id: string;
  status: string;
  /** Title from spec.md frontmatter, if available. */
  title?: string;
  /** The current (first incomplete / in-progress) task line, if any. */
  currentTask?: string;
  /** The next pending task line after the current one, if any. */
  nextTask?: string;
  doneTasks: number;
  totalTasks: number;
  taskPercentage: number;
  doneAcs: number;
  totalAcs: number;
  /** Human-readable AC/task drift summary lines from acSyncEvents. */
  acSyncEvents: string[];
}

/**
 * Ambient project rules merged from config.json.
 */
export interface HandoffAmbientRules {
  testMode?: string;
  coverageTarget?: number;
  wipLimit?: number;
}

/**
 * Git facts for the doc body (mirrors GitState minus the diff file contents).
 */
export interface HandoffGitInfo {
  isGitRepo: boolean;
  branch: string;
  shortSha: string;
  statusPorcelain: string;
  diffStat: string;
  hasUncommittedChanges: boolean;
}

/**
 * The complete, already-scrubbed input to the renderer.
 */
export interface HandoffDocInput {
  /** Absolute path the doc itself will be written to (printed first by CLI). */
  docPath: string;
  /** Absolute path of the sibling full-diff file. */
  diffPath: string;
  /** Repo / workspace root. */
  repoRoot: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Whether this is the SpecWeave high-fidelity path. */
  isSpecWeave: boolean;
  /** Free-text "why I'm handing off" (e.g. "out of tokens"). */
  reason?: string;
  /** Free-text summary of where things stand. */
  summary?: string;
  /** Free-text exact next step. */
  next?: string;
  /** Free-text gotcha / warning for the next agent. */
  gotcha?: string;
  /** Key decisions (from plan.md + agent-supplied, already merged). */
  decisions: string[];
  /** Increment facts (SpecWeave path only). */
  increment?: HandoffIncrementInfo;
  /** Ambient rules from config.json. */
  ambient?: HandoffAmbientRules;
  /** Git facts. */
  git: HandoffGitInfo;
  /** Per-pattern redaction counts from the secret scrub. */
  redactionCounts: Record<string, number>;
}

function fmtCount(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return '_No token-like strings were detected._';
  }
  return entries
    .map(([type, n]) => `- ${n} \`${type}\` ${n === 1 ? 'string' : 'strings'} masked`)
    .join('\n');
}

/**
 * Render the per-tool "find your source session" block.
 */
export function renderResumeMatrix(): string {
  const lines: string[] = ['## How To Resume', ''];
  lines.push(
    'If the doc path above does NOT exist on the machine you are reading this on, ' +
      'STOP and ask the user to paste the handoff — do not improvise context.',
  );
  lines.push('');
  lines.push('To recover the ORIGINAL transcript (optional), find your source session per tool:');
  lines.push('');
  for (const e of TOOL_RESUME_MATRIX) {
    lines.push(`### ${e.tool}`);
    lines.push(`- Find session: ${e.findSession}`);
    lines.push(`- Resume: \`${e.resumeCmd}\``);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/**
 * Render the full handoff document body (markdown).
 *
 * Section order is locked to {@link HANDOFF_SECTION_ORDER}; the `Doc format v1`
 * footer marker is always last.
 */
export function renderHandoffDoc(input: HandoffDocInput): string {
  const L: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  const titleBit = input.increment?.title ? `: ${input.increment.title}` : '';
  L.push(`# Work Handoff${titleBit}`);
  L.push('');
  L.push(`- Doc path: ${input.docPath}`);
  L.push(`- Doc link: [${input.docPath}](${input.docPath})`);
  L.push(`- Diff file: ${input.diffPath}`);
  L.push(`- Generated: ${input.generatedAt}`);
  L.push(`- Workspace: ${input.repoRoot} ${input.isSpecWeave ? '(SpecWeave)' : '(non-SpecWeave)'}`);
  if (input.git.isGitRepo) {
    L.push(`- Git: branch \`${input.git.branch || '(detached)'}\` @ \`${input.git.shortSha || '(no commits)'}\``);
  }
  L.push('');

  // ── Where I Left Off ──────────────────────────────────────────────────────
  L.push('## Where I Left Off');
  L.push('');
  if (input.reason) L.push(`**Why handing off:** ${input.reason}`);
  if (input.summary) L.push(`**Summary:** ${input.summary}`);
  if (input.increment) {
    L.push(`**Increment:** ${input.increment.id} (status: ${input.increment.status})`);
    if (input.increment.currentTask) L.push(`**Current task:** ${input.increment.currentTask}`);
    if (input.increment.nextTask) L.push(`**Next task:** ${input.increment.nextTask}`);
  } else {
    L.push('_No active SpecWeave increment — this is a git + interview handoff._');
  }
  L.push('');

  // ── Done / Pending ──────────────────────────────────────────────────────
  L.push('## Done / Pending');
  L.push('');
  if (input.increment) {
    const inc = input.increment;
    L.push(
      `- Tasks: ${inc.doneTasks}/${inc.totalTasks} done (${inc.taskPercentage}%), ` +
        `${inc.totalTasks - inc.doneTasks} pending`,
    );
    L.push(`- ACs: ${inc.doneAcs}/${inc.totalAcs} checked`);
    if (inc.acSyncEvents.length > 0) {
      L.push('- AC/task drift (recent sync events):');
      for (const ev of inc.acSyncEvents) L.push(`  - ${ev}`);
    }
  } else {
    L.push('_No increment task/AC state available._');
  }
  L.push('');

  // ── Key Decisions & Gotchas ───────────────────────────────────────────────
  L.push('## Key Decisions & Gotchas');
  L.push('');
  if (input.decisions.length > 0) {
    for (const d of input.decisions) L.push(`- ${d}`);
  } else {
    L.push('_No decisions recorded._');
  }
  if (input.gotcha) {
    L.push('');
    L.push(`**Gotcha:** ${input.gotcha}`);
  }
  if (input.ambient && (input.ambient.testMode || input.ambient.coverageTarget != null || input.ambient.wipLimit != null)) {
    L.push('');
    L.push('**Ambient rules (config.json):**');
    if (input.ambient.testMode) L.push(`- Test mode: ${input.ambient.testMode}`);
    if (input.ambient.coverageTarget != null) L.push(`- Coverage target: ${input.ambient.coverageTarget}%`);
    if (input.ambient.wipLimit != null) L.push(`- Active increments (advisory): ${input.ambient.wipLimit}`);
  }
  L.push('');

  // ── Files Touched ─────────────────────────────────────────────────────────
  L.push('## Files Touched');
  L.push('');
  if (input.git.hasUncommittedChanges) {
    L.push('**UNCOMMITTED** — commit, stash, or keep editing BEFORE doing anything destructive.');
    L.push('');
    L.push('```');
    L.push(input.git.statusPorcelain || '(no porcelain output)');
    L.push('```');
    if (input.git.diffStat) {
      L.push('');
      L.push('```');
      L.push(input.git.diffStat);
      L.push('```');
    }
    L.push('');
    L.push(
      `Full uncommitted diff: \`${input.diffPath}\` — read it or run ` +
        '`git apply --check` against it to see the exact edits.',
    );
  } else if (input.git.isGitRepo) {
    L.push('_Working tree clean — no uncommitted edits._');
  } else {
    L.push('_Not a git repository — no diff captured._');
  }
  L.push('');

  // ── Exact Next Steps ──────────────────────────────────────────────────────
  L.push('## Exact Next Steps');
  L.push('');
  if (input.next) {
    L.push(input.next);
  } else if (input.increment?.nextTask) {
    L.push(`Continue with: ${input.increment.nextTask}`);
  } else {
    L.push('_No explicit next step recorded — review the summary above._');
  }
  L.push('');

  // ── How To Resume (+ per-tool matrix) ─────────────────────────────────────
  L.push(renderResumeMatrix());
  L.push('');

  // ── Redaction ─────────────────────────────────────────────────────────────
  L.push('## Redaction');
  L.push('');
  L.push(fmtCount(input.redactionCounts));
  L.push('');
  L.push(
    '_Scrubbing is heuristic (regex baseline). An empty redaction list is NOT a ' +
      'guarantee this file is clean — review before sharing or committing._',
  );
  L.push('');

  // ── Footer marker ─────────────────────────────────────────────────────────
  L.push('---');
  L.push(`<!-- ${DOC_FORMAT_MARKER} -->`);

  return L.join('\n');
}

/**
 * Render the copy-paste resume prompt.
 *
 * Default (file-reachable) mode points the next agent at the doc path. The
 * `inline` mode embeds the FULL doc body between BEGIN/END markers for
 * cross-machine resume where the file is unreachable (AC-US5-04).
 */
export function renderPastePrompt(input: HandoffDocInput, opts: { inline?: boolean } = {}): string {
  const P: string[] = [];
  if (opts.inline) {
    P.push('Resume my work using the self-contained handoff below.');
    P.push(
      'This is a full handoff doc — treat everything between the markers as ground truth. ' +
        'If it references a `.diff` path that does not exist on this machine, ask me to paste the diff.',
    );
    P.push('');
    P.push(INLINE_BEGIN_MARKER);
    P.push(renderHandoffDoc(input));
    P.push(INLINE_END_MARKER);
  } else {
    P.push(`Resume my work. Read the handoff doc at: ${input.docPath}`);
    P.push(
      'If that path does NOT exist on this machine, STOP and ask me to paste the handoff — ' +
        'do not improvise context.',
    );
    P.push(`The exact uncommitted edits are in: ${input.diffPath}`);
    if (input.increment) {
      P.push(`Active increment: ${input.increment.id}. Pick up at the next pending task.`);
    }
  }
  return P.join('\n');
}
