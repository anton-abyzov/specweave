/**
 * LSP Configuration Module
 *
 * Exports all configuration-related classes and interfaces.
 */

// Config parsing
export {
  parseLspConfig,
  DEFAULT_TIMEOUT,
  DEFAULT_WARMUP_TIMEOUT,
  type LspConfig,
} from './lsp-config.js';

// Timeout resolution
export { TimeoutResolver } from './timeout-resolver.js';

// Language analysis
export { LanguageAnalyzer, type LanguageScore } from './language-analyzer.js';

// Project detection
export {
  ProjectDetector,
  type ProjectInfo,
  type UnknownProjectResult,
} from './project-detector.js';

// Server registry
export {
  ServerRegistry,
  type ServerConfig,
  type RegistryConfig,
} from './server-registry.js';

// Server validation
export {
  ServerValidator,
  type TrustStore,
  type BinaryChecker,
  type ValidationResult,
  type WarnCallback,
} from './server-validator.js';

// Interactive prompt
export {
  LspPrompt,
  MAX_SERVERS,
  type LspSuggestion,
  type PromptResult,
  type PromptAdapter,
} from './lsp-prompt.js';
