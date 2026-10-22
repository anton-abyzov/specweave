/**
 * Required-increment guard (opt-in, `planning.requireIncrement`).
 *
 * An Edit or Write inside the project, outside `.specweave/`, is planned work
 * when the agent session has a work marker (`~/.specweave/sessions/<id>.json`,
 * written by any ledger append, `create-increment`, `verify`, `complete` or
 * `small-fix`) for this project, naming an open increment or a small fix, or
 * its SpecWithCode thread is bound to an open increment here.
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

/** Marker `specweave require-increment` leaves so the hook launcher's fast path knows to run the guard. */
export const REQUIRE_INCREMENT_MARKER = 'require-increment.enabled';

const CLOSED = new Set(['completed', 'abandoned', 'cancelled']);

/** Same project: one root contains the other (an umbrella and its nested repos count as one). */
function sameProject(a: string, b: string): boolean {
  return inside(path.resolve(a), path.resolve(b)) || inside(path.resolve(b), path.resolve(a));
}

function openIncrement(root: string, incrementId: string | null): boolean {
  if (!incrementId) return false;
  const status = readJsonSafe<{ status?: string }>(path.join(root, '.specweave', 'increments', incrementId, 'metadata.json'))?.status;
  return !CLOSED.has(String(status ?? ''));
}

/**
 * Is this session already working, in this project, on an open increment or a
 * declared small fix? Markers from another project or a closed increment do not count.
 */
export function hasPlannedWork(
  input: HookInput,
  projectRoot: string,
  opts: { env?: NodeJS.ProcessEnv; home?: string } = {},
): boolean {
  const env = opts.env ?? process.env;
  const home = opts.home ?? os.homedir();
  const ids = [input.session_id, env.SPECWEAVE_SESSION_ID, env.CLAUDE_CODE_SESSION_ID].filter(
    (id): id is string => typeof id === 'string' && !!id.trim(),
  );
  for (const id of ids) {
    const marker = readWorkSession(id, home);
    if (!marker || !sameProject(marker.root, projectRoot)) continue;
    if (marker.kind === 'small-fix' || openIncrement(marker.root, marker.incrementId)) return true;
  }
  const thread = env.SPECWEAVE_STUDIO_THREAD_ID?.trim();
  if (!thread) return false;
  const binding = readJsonSafe<{ root?: string; incrementId?: string }>(studioThreadBindingFile(thread, home));
  return (
    !!binding?.root &&
    sameProject(binding.root, projectRoot) &&
    openIncrement(binding.root, binding.incrementId ?? null)
  );
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

  if (hasPlannedWork(input, context.projectRoot, opts)) return pass();

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
