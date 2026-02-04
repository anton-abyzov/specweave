/**
 * LSP Module
 *
 * Unified exports for all LSP-related functionality.
 *
 * Structure:
 * - config/    - Configuration, timeout resolution, analyzers
 * - warmup/    - Language warm-up strategies
 * - diagnostics/ - Progress tracking, doctor command
 * - servers/   - LSP server clients
 */

// Core modules
export * from './config/index.js';
export * from './warmup/index.js';
export * from './diagnostics/index.js';
export * from './servers/index.js';
export * from './cache/index.js';

// Error handling
export {
  LspErrorHandler,
  type GrepFallback,
  type GrepResult,
  type ErrorType,
  type ErrorHandlerResult,
  type HandleOptions,
} from './error-handler.js';

// Manager (orchestrates everything)
export {
  LSPManager,
  getGlobalLSPManager,
  type LSPManagerOptions,
} from './lsp-manager.js';

// Living docs integration
export {
  LSPLivingDocsAnalyzer,
  type SymbolInfo,
  type CodeAnalysisResult,
  type LSPLivingDocsAnalyzerOptions,
} from './lsp-living-docs-integration.js';
