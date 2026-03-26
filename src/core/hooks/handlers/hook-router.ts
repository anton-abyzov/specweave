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

/** Dynamic import map — only the requested handler is loaded per invocation */
const HANDLERS: Record<string, () => Promise<{ handle: HandlerFn }>> = {
  'user-prompt-submit': () => import('./user-prompt-submit.js'),
  'pre-tool-use': () => import('./pre-tool-use.js'),
  'post-tool-use': () => import('./post-tool-use.js'),
  'post-tool-use-analytics': () => import('./post-tool-use-analytics.js'),
  'session-start': () => import('./session-start.js'),
  'pre-compact': () => import('./pre-compact.js'),
  'stop-reflect': () => import('./stop-reflect.js'),
  'stop-auto': () => import('./stop-auto.js'),
  'stop-sync': () => import('./stop-sync.js'),
};

/**
 * Route a hook event to the correct handler.
 *
 * @param eventType - The hook event type (e.g. 'pre-compact', 'user-prompt-submit')
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

    // Dynamic import + execute
    const handlerModule = await loader();
    const result = await handlerModule.handle(input, context);
    return result;
  } catch (error) {
    // Never crash — log and return safe default
    try {
      const projectRoot = findProjectRoot();
      if (projectRoot) {
        const context = createContext(projectRoot);
        const msg = error instanceof Error ? error.message : String(error);
        logHook(context, 'router', `Error in ${eventType}: ${msg}`);
      }
    } catch {
      // Even logging can fail — swallow everything
    }
    return safeDefault;
  }
}
