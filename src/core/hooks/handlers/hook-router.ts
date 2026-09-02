/**
 * Hook router — the central dispatcher for the four SpecWeave hook events.
 *
 * Reads the stdin JSON, resolves the project root (from the hook's `cwd`,
 * then process.cwd()), dynamically imports the matching handler and returns
 * a schema-valid result. Wrapped end-to-end so no hook can ever crash:
 * any failure returns `{}` (pass) and writes one JSONL log line.
 *
 * @module core/hooks/handlers/hook-router
 */

import type { HandlerFn, HookResult } from './types.js';
import { HOOK_EVENTS, pass } from './types.js';
import { findProjectRoot, createContext, parseStdinJson, logHook } from './utils.js';

/** Dynamic import map — only the requested handler is loaded per invocation. */
const HANDLERS: Record<(typeof HOOK_EVENTS)[number], () => Promise<{ handle: HandlerFn }>> = {
  'session-start': () => import('./session-start.js'),
  'pre-tool-use': () => import('./pre-tool-use.js'),
  'stop': () => import('./stop.js'),
  'pre-compact': () => import('./pre-compact.js'),
};

/** Event names the router dispatches (for parity checks against hooks.json). */
export function registeredHookEvents(): string[] {
  return Object.keys(HANDLERS).sort();
}

function blockReason(result: HookResult): string | null {
  if (result.decision === 'block') return result.reason ?? '';
  if (result.hookSpecificOutput?.permissionDecision === 'deny') {
    return result.hookSpecificOutput.permissionDecisionReason ?? '';
  }
  return null;
}

/**
 * Route a hook event to its handler.
 *
 * @param eventType - 'session-start' | 'pre-tool-use' | 'stop' | 'pre-compact'
 * @param rawStdin - Raw stdin string (JSON from Claude Code)
 * @returns HookResult — always schema-valid, never throws
 */
export async function hookRouter(eventType: string, rawStdin: string): Promise<HookResult> {
  let context: ReturnType<typeof createContext> | null = null;
  try {
    if (process.env.SPECWEAVE_DISABLE_HOOKS === '1') return pass();

    const input = parseStdinJson(rawStdin);
    const hintedCwd = typeof input.cwd === 'string' ? input.cwd : undefined;
    const projectRoot = (hintedCwd && findProjectRoot(hintedCwd)) || findProjectRoot();
    if (!projectRoot) return pass(); // not a SpecWeave project

    context = createContext(projectRoot);
    const loader = HANDLERS[eventType as (typeof HOOK_EVENTS)[number]];
    if (!loader) {
      logHook(context, 'router', `Unknown event type: ${eventType}`);
      return pass();
    }

    const result = (await (await loader()).handle(input, context)) ?? pass();
    const reason = blockReason(result);
    if (reason !== null) logHook(context, eventType, reason, 'block');
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    try {
      if (!context) {
        const root = findProjectRoot();
        if (root) context = createContext(root);
      }
      if (context) logHook(context, eventType, `[ERROR] ${msg}`, 'error');
    } catch {
      // nothing left to do — fail open
    }
    return pass();
  }
}
