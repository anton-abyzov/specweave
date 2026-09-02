/**
 * PreCompact hook handler — auto-writes a work-handoff right before the
 * context window is summarized away.
 *
 * Rules:
 * - Only when an increment is active (nothing to hand off otherwise).
 * - Hard 5 s budget: the builder dumps a git diff; a slow repo must never
 *   stall compaction. On timeout the write is abandoned and `{}` returned.
 * - With 2+ active increments the first one is used (no more
 *   "Multiple active increments" failures — the 51 % error class).
 * - Never blocks compaction; always returns `{}`.
 *
 * @module core/hooks/handlers/pre-compact
 */

import type { HandlerFn, HookContext, HookInput } from './types.js';
import { pass } from './types.js';
import { logHook, readActiveIncrements } from './utils.js';

export const HANDOFF_BUDGET_MS = 5000;

function str(input: HookInput, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = input[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

/**
 * Write a handoff for the first active increment within `budgetMs`.
 * Shared with the Stop handler. Never throws.
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
    const build = buildWorkHandoff(context.projectRoot, {
      incrementId: active[0],
      reason: str(input, 'reason') ?? defaultReason,
      summary: str(input, 'summary'),
      next: str(input, 'next', 'next_step', 'nextStep'),
      gotcha: str(input, 'gotcha'),
      decisions,
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
