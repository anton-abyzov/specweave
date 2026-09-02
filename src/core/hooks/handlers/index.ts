/**
 * Hook handlers barrel export.
 *
 * @module core/hooks/handlers
 */

export type { HandlerFn, HookContext, HookInput, HookResult, HookEventType, HookSpecificOutput } from './types.js';
export { HOOK_EVENTS, getSafeDefault, pass, deny, warn, sessionContext, stopBlock, validateHookOutput } from './types.js';
export { hookRouter, registeredHookEvents } from './hook-router.js';
export {
  findProjectRoot,
  createContext,
  parseStdinJson,
  logHook,
  normalizePath,
  getFilePath,
  isIncrementFile,
  extractIncrementId,
  readActiveIncrements,
} from './utils.js';
