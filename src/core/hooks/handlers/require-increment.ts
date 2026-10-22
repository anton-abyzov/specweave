/**
 * Required-increment guard (opt-in, `planning.requireIncrement`).
 *
 * An Edit or Write inside the project, outside `.specweave/`, is planned work
 * when the agent session has a work marker (`~/.specweave/sessions/<id>.json`,
 * written by any ledger append, `create-increment`, `verify`, `complete` or
 * `small-fix`) or its SpecWithCode thread is bound to an increment.
 * Otherwise:
 *
 *   off      → nothing (the default)
 *   remind   → one additionalContext note per session
 *   enforce  → deny, naming the commands that unblock the edit
 *
 * Offline, a few file reads, fail-open: any error passes.
 *
 * @module core/hooks/handlers/require-increment
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readWorkSession } from '../../tasks/work-session.js';
import { studioThreadBindingFile } from '../../tasks/studio-thread-binding.js';
import type { HookContext, HookInput, HookResult } from './types.js';
import { deny, pass, warn } from './types.js';
import { getFilePath, getToolInput, readJsonSafe } from './utils.js';

export const REQUIRE_INCREMENT_MODES = ['off', 'remind', 'enforce'] as const;
export type RequireIncrementMode = (typeof REQUIRE_INCREMENT_MODES)[number];

export const EDIT_TOOLS: ReadonlySet<string> = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

export function readRequireIncrementMode(configPath: string): RequireIncrementMode {
  const mode = readJsonSafe<{ planning?: { requireIncrement?: unknown } }>(configPath)?.planning?.requireIncrement;
  return REQUIRE_INCREMENT_MODES.includes(mode as RequireIncrementMode) ? (mode as RequireIncrementMode) : 'off';
}

function inside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Is this session already working on an increment or a declared small fix? */
export function hasPlannedWork(
  input: HookInput,
  opts: { env?: NodeJS.ProcessEnv; home?: string } = {},
): boolean {
  const env = opts.env ?? process.env;
  const home = opts.home ?? os.homedir();
  const ids = [input.session_id, env.SPECWEAVE_SESSION_ID, env.CLAUDE_CODE_SESSION_ID].filter(
    (id): id is string => typeof id === 'string' && !!id.trim(),
  );
  if (ids.some((id) => readWorkSession(id, home))) return true;
  const thread = env.SPECWEAVE_STUDIO_THREAD_ID?.trim();
  return !!thread && fs.existsSync(studioThreadBindingFile(thread, home));
}

export function requireIncrementMessage(mode: RequireIncrementMode): string {
  const lead =
    mode === 'enforce'
      ? 'This project requires an increment before code changes (planning.requireIncrement = enforce), and this session has none.'
      : 'Reminder: this project plans changes as increments (planning.requireIncrement = remind), and this session has none yet.';
  return (
    `${lead} Plan it with \`specweave create-increment "<title>"\` and fill spec.md, ` +
    'or continue an open one with `specweave task claim T-NN <increment>`. ' +
    'If the change is too small to plan, run `specweave small-fix "<why>"`. Then retry the edit.'
  );
}

export function checkRequireIncrement(
  input: HookInput,
  context: HookContext,
  opts: { env?: NodeJS.ProcessEnv; home?: string } = {},
): HookResult {
  const mode = readRequireIncrementMode(context.configPath);
  if (mode === 'off') return pass();

  const notebook = getToolInput(input).notebook_path;
  const raw = getFilePath(input) || (typeof notebook === 'string' ? notebook : '');
  if (!raw) return pass();
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : context.projectRoot;
  const file = path.resolve(cwd, raw);
  // Planning files and anything outside this project are never gated.
  if (/[\\/]\.specweave[\\/]/.test(file)) return pass();
  if (!inside(file, context.projectRoot) && !inside(file, cwd)) return pass();

  if (hasPlannedWork(input, opts)) return pass();

  if (mode === 'enforce') return deny(requireIncrementMessage(mode));

  // remind: once per session.
  const session = (input.session_id || 'unknown').replace(/[^\w.-]/g, '_');
  const marker = path.join(context.stateDir, 'require-increment', `${session}.reminded`);
  if (fs.existsSync(marker)) return pass();
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, context.timestamp);
  } catch {
    // Reminding twice is better than never.
  }
  return warn(requireIncrementMessage(mode));
}
