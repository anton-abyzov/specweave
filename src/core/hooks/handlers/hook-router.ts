/**
 * Hook router — the central dispatcher for all hook events.
 *
 * Reads stdin JSON, resolves the project root, dynamically imports the
 * correct handler, and returns JSON. Wraps everything in try/catch so
 * no hook can ever crash.
 *
 * @module core/hooks/handlers/hook-router
 */

import type { HandlerFn, HookResult } from './types.js';
import { getSafeDefault } from './types.js';
import { findProjectRoot, createContext, parseStdinJson, logHook } from './utils.js';
import { HookLogger } from '../hook-logger.js';

/** Dynamic import map — only the requested handler is loaded per invocation */
const HANDLERS: Record<string, () => Promise<{ handle: HandlerFn }>> = {
  'user-prompt-submit': () => import('./user-prompt-submit.js'),
  'pre-tool-use': () => import('./pre-tool-use.js'),
  // Auto-write a work-handoff at context exhaustion (0867, AC-US7-01).
  'pre-compact': () => import('./pre-compact.js'),
  // Gated Stop variant — fires only under an active auto session (AC-US7-02).
  // Maps the module's `handleStop` export onto the router's `handle` contract.
  'stop': () => import('./pre-compact.js').then((m) => ({ handle: m.handleStop })),
};

/**
 * Route a hook event to the correct handler.
 *
 * @param eventType - The hook event type ('pre-tool-use' or 'user-prompt-submit')
 * @param rawStdin - Raw stdin string (JSON from Claude Code)
 * @returns HookResult — always valid JSON, never throws
 */
export async function hookRouter(
  eventType: string,
  rawStdin: string,
): Promise<HookResult> {
  const safeDefault = getSafeDefault(eventType);

  try {
    // Global kill switch
    if (process.env.SPECWEAVE_DISABLE_HOOKS === '1') {
      return safeDefault;
    }

    // Parse stdin
    const input = parseStdinJson(rawStdin);

    // Resolve project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      // Not a SpecWeave project — pass through
      return safeDefault;
    }

    // Build context
    const context = createContext(projectRoot);

    // Find handler
    const loader = HANDLERS[eventType];
    if (!loader) {
      logHook(context, 'router', `Unknown event type: ${eventType}`);
      return safeDefault;
    }

    // Dynamic import + execute with timing
    const startTime = Date.now();
    const handlerModule = await loader();
    const result = await handlerModule.handle(input, context);
    const duration = Date.now() - startTime;

    // Semantic prefix: intentional blocks get [GUARD] label
    if (result.decision === 'block' && result.reason) {
      result.reason = `[GUARD] ${result.reason}`;
    }

    // Claude Code's PreToolUse schema accepts decision values of "approve"|"block" only.
    // Internal handlers use 'allow' for readability — translate to a schema-valid pass-through.
    if (eventType === 'pre-tool-use' && result.decision === 'allow') {
      delete result.decision;
      result.continue = true;
    }

    // Structured logging via HookLogger
    try {
      const hooksLogDir = `${context.logsDir}/hooks`;
      const logger = new HookLogger(hooksLogDir);
      await logger.log({
        hookName: eventType,
        status: result.decision === 'block' ? 'warning' : 'success',
        duration,
        ...(result.decision === 'block' && result.reason ? { error: result.reason } : {}),
      });
    } catch { /* logging must never crash hooks */ }

    return result;
  } catch (error) {
    // Never crash — log and return safe default
    const duration = Date.now() - (0); // approximate
    try {
      const projectRoot = findProjectRoot();
      if (projectRoot) {
        const context = createContext(projectRoot);
        const msg = error instanceof Error ? error.message : String(error);
        logHook(context, 'router', `[ERROR] Error in ${eventType}: ${msg}`);

        // Structured error logging
        try {
          const hooksLogDir = `${context.logsDir}/hooks`;
          const logger = new HookLogger(hooksLogDir);
          await logger.log({
            hookName: eventType,
            status: 'error',
            duration,
            error: msg,
          });
        } catch { /* logging must never crash hooks */ }
      }
    } catch (logErr) {
      // Last-resort fallback when even logHook fails
      try { process.stderr.write(`[specweave] hook-router: logging failed for ${eventType}: ${String(logErr)}\n`); } catch { /* truly nothing left */ }
    }
    return safeDefault;
  }
}
