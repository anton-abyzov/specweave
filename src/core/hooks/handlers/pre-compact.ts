/**
 * PreCompact hook handler — auto-writes a work-handoff right before the
 * context window is summarized away.
 *
 * Rules:
 * - Only when an increment is active (nothing to hand off otherwise).
 * - Hard 5 s budget: the builder dumps a git diff; a slow repo must never
 *   stall compaction. On timeout the write is abandoned and `{}` returned.
 * - With 2+ active increments, the one this session or SpecWithCode thread
 *   works on is used (its work marker, then its thread binding); the first
 *   active one only when neither names an active increment here.
 * - Never blocks compaction; always returns `{}`.
 *
 * @module core/hooks/handlers/pre-compact
 */

import * as os from 'os';
import type { HandlerFn, HookContext, HookInput } from './types.js';
import { pass } from './types.js';
import { logHook, readActiveIncrements, readJsonSafe } from './utils.js';
import { sameProject } from './require-increment.js';
import { readWorkSession } from '../../tasks/work-session.js';
import { studioThreadBindingFile } from '../../tasks/studio-thread-binding.js';
import { gitCheckoutFor } from '../../../utils/main-checkout.js';

export const HANDOFF_BUDGET_MS = 5000;

function str(input: HookInput, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = input[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

/**
 * The active increment this session works on: its work marker, then its
 * SpecWithCode thread binding, then the first active increment. A handoff for
 * another thread's increment would resume the wrong work.
 */
export function handoffIncrement(
  active: string[],
  projectRoot: string,
  input: HookInput,
  opts: { env?: NodeJS.ProcessEnv; home?: string } = {},
): string | undefined {
  if (active.length <= 1) return active[0];
  const env = opts.env ?? process.env;
  const home = opts.home ?? os.homedir();
  const thread = env.SPECWEAVE_STUDIO_THREAD_ID?.trim();
  const sessionIds = [input.session_id, env.SPECWEAVE_SESSION_ID, env.CLAUDE_CODE_SESSION_ID, thread ? `studio-${thread}` : undefined];
  const bound = [
    ...sessionIds.map((id) => (typeof id === 'string' ? readWorkSession(id, home) : null)),
    thread ? readJsonSafe<{ root?: string; incrementId?: string }>(studioThreadBindingFile(thread, home)) : null,
  ];
  for (const b of bound) {
    // Files from older or hand-edited versions may hold anything; skip them instead of throwing.
    if (typeof b?.root !== 'string' || typeof b.incrementId !== 'string') continue;
    if (active.includes(b.incrementId) && sameProject(b.root, projectRoot)) return b.incrementId;
  }
  return active[0];
}

/**
 * Write a handoff for this session's active increment within `budgetMs`.
 * Never throws.
 */
export async function writeAutoHandoff(
  context: HookContext,
  input: HookInput,
  defaultReason: string,
  budgetMs: number = HANDOFF_BUDGET_MS,
): Promise<boolean> {
  if (process.env.SPECWEAVE_HOOK_DRY_RUN === '1') return false;
  const active = readActiveIncrements(context.projectRoot);
  if (active.length === 0) return false;

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), budgetMs);
    timer.unref?.();
  });
  try {
    const { buildWorkHandoff } = await import('../../session/work-handoff.js');
    const decisionRaw = input.decisions ?? input.decision;
    const decisions = Array.isArray(decisionRaw)
      ? decisionRaw.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      : typeof decisionRaw === 'string' && decisionRaw.trim()
        ? [decisionRaw]
        : undefined;
    // From a thread's worktree, start there so the Git capture is the thread's branch.
    const start = input.cwd && gitCheckoutFor(input.cwd, context.projectRoot) !== context.projectRoot ? input.cwd : context.projectRoot;
    const build = buildWorkHandoff(start, {
      incrementId: handoffIncrement(active, context.projectRoot, input),
      reason: str(input, 'reason') ?? defaultReason,
      summary: str(input, 'summary'),
      next: str(input, 'next', 'next_step', 'nextStep'),
      gotcha: str(input, 'gotcha'),
      decisions,
      checkpoint: true,
    });
    const outcome = await Promise.race([build, timeout]);
    if (outcome === 'timeout') {
      logHook(context, 'pre-compact', `auto-handoff abandoned after ${budgetMs} ms budget`, 'warn');
      return false;
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logHook(context, 'pre-compact', `[ERROR] auto-handoff failed (ignored): ${msg}`, 'error');
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const handle: HandlerFn = async (input, context) => {
  await writeAutoHandoff(context, input, 'auto: pre-compact');
  return pass();
};
