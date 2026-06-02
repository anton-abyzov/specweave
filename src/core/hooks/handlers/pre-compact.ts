/**
 * PreCompact (+ gated Stop) hook handler.
 *
 * Fires when Claude Code is about to compact the context window (PreCompact) —
 * the last safe moment to capture in-flight work before it is summarized away.
 * The handler auto-writes a work-handoff doc + `.diff` via the SAME
 * {@link buildWorkHandoff} builder the `specweave handoff` CLI uses, so an
 * auto-generated handoff is byte-compatible with a manual one (AC-US7-03).
 *
 * Design contract (AC-US7-01..04):
 * - Cheap at context exhaustion: the agent passes only ~5 short string fields
 *   (reason, summary, next, gotcha, decision) via the hook stdin JSON; all the
 *   expensive deterministic assembly + the free diff dump happen in the builder.
 * - Failure-tolerant: a handoff failure must NEVER break compaction. Everything
 *   is wrapped so the handler always returns the safe `{ continue: true }` shape.
 * - The Stop variant (`exports.handleStop`) is GATED on an auto/handoff session
 *   flag (`.specweave/state/auto-mode.json`): PreCompact always writes; Stop only
 *   writes under an active auto session, so ordinary turn-ends stay quiet
 *   (AC-US7-02).
 *
 * @module core/hooks/handlers/pre-compact
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookContext, HookInput, HookResult } from './types.js';
import { logHook } from './utils.js';

/** The compaction-safe response — never block. */
const SAFE: HookResult = { continue: true };

/**
 * Pull the ~5 short free-text fields the agent may have stated, off the hook
 * stdin JSON. Tolerant of both snake_case and camelCase keys and of total
 * absence (the common case at a real token crash — all may be empty).
 */
function readShortFields(input: HookInput): {
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  decisions?: string[];
} {
  const get = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = input[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return undefined;
  };
  const decisionRaw = input.decision ?? input.decisions;
  const decisions = Array.isArray(decisionRaw)
    ? decisionRaw.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    : typeof decisionRaw === 'string' && decisionRaw.trim()
      ? [decisionRaw]
      : undefined;
  return {
    reason: get('reason'),
    summary: get('summary'),
    next: get('next', 'next_step', 'nextStep'),
    gotcha: get('gotcha'),
    decisions,
  };
}

/** Is an auto/handoff session currently active? (Stop gating, AC-US7-02.) */
function isAutoSessionActive(context: HookContext): boolean {
  try {
    return fs.existsSync(path.join(context.stateDir, 'auto-mode.json'));
  } catch {
    return false;
  }
}

/**
 * Write an auto-handoff. Wrapped so any failure is swallowed — compaction /
 * turn-end must proceed regardless.
 */
async function writeAutoHandoff(
  context: HookContext,
  defaultReason: string,
  input: HookInput,
): Promise<void> {
  try {
    // Lazy import so the handler stays cheap and the builder's deps only load
    // when a handoff is actually written.
    const { buildWorkHandoff } = await import('../../session/work-handoff.js');
    const fields = readShortFields(input);
    const result = await buildWorkHandoff(context.projectRoot, {
      // Honor an agent-supplied reason (AC-US7-04); fall back to the
      // hook-specific default so the CLI and hook paths stay consistent.
      reason: fields.reason ?? defaultReason,
      summary: fields.summary,
      next: fields.next,
      gotcha: fields.gotcha,
      decisions: fields.decisions,
    });
    logHook(context, 'pre-compact', `auto-handoff written: ${result.docPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logHook(context, 'pre-compact', `[ERROR] auto-handoff failed (ignored): ${msg}`);
  }
}

/**
 * PreCompact handler — always writes a handoff, never blocks compaction.
 */
export const handle: HandlerFn = async (
  input: HookInput,
  context: HookContext,
): Promise<HookResult> => {
  await writeAutoHandoff(context, 'auto: pre-compact', input);
  return SAFE;
};

/**
 * Stop handler — gated on an active auto/handoff session. Fires only when
 * `auto-mode.json` is present so ordinary turn-ends are not noisy (AC-US7-02).
 */
export const handleStop: HandlerFn = async (
  input: HookInput,
  context: HookContext,
): Promise<HookResult> => {
  if (!isAutoSessionActive(context)) {
    return SAFE;
  }
  await writeAutoHandoff(context, 'auto: stop', input);
  return SAFE;
};
