/**
 * Hook handlers barrel export.
 *
 * @module core/hooks/handlers
 */

export type { HandlerFn, HookContext, HookInput, HookResult, HookEventType } from './types.js';
export { getSafeDefault, SAFE_DEFAULTS } from './types.js';
export { hookRouter } from './hook-router.js';
export { findProjectRoot, createContext, parseStdinJson, logHook } from './utils.js';
