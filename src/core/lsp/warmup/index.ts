/**
 * LSP Warm-up Module
 *
 * Exports warm-up strategy interfaces, executor, and language-specific strategies.
 */

// Core interfaces and executor
export { WarmupResult, WarmupStrategy } from './strategy.js';
export { WarmupExecutor, WarmupOptions } from './executor.js';

// Language-specific strategies
export { TypeScriptStrategy } from './strategies/typescript.js';
export {
  CSharpStrategy,
  type PromptProvider as CSharpPromptProvider,
  type CacheProvider as CSharpCacheProvider,
} from './strategies/csharp.js';
export { GoStrategy } from './strategies/go.js';
export { PythonStrategy } from './strategies/python.js';
export { RustStrategy } from './strategies/rust.js';
