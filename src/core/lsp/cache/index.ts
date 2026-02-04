/**
 * LSP Cache Module
 *
 * Exports symbol caching functionality with mtime-based invalidation.
 */

export {
  SymbolCache,
  type SymbolLocation,
  type FileSystemAdapter,
} from './symbol-cache.js';
