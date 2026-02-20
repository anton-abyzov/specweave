/**
 * LLM Provider Abstraction Layer
 *
 * Provides a unified interface for multiple LLM providers:
 * - Anthropic Claude (claude-sonnet, claude-opus, claude-haiku)
 * - OpenAI GPT (gpt-4o, gpt-4o-mini, o1)
 * - Azure OpenAI (enterprise deployments)
 * - AWS Bedrock (Claude, Titan)
 * - Google Vertex AI (Gemini)
 * - Ollama (local models)
 * - Cloudflare Workers AI (gpt-oss-120b)
 *
 * Usage:
 * ```typescript
 * import { loadLLMConfig, createProvider } from './core/llm/index.js';
 *
 * const config = loadLLMConfig(projectPath);
 * if (config) {
 *   const provider = await createProvider(config);
 *   const result = await provider.analyze('Explain this code...');
 *   console.log(result.content);
 * }
 * ```
 */

// Types
export type {
  LLMProviderType,
  LLMConfig,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
  JSONSchemaType,
  CostTrackingData,
  LLMProvider,
  ModelPricing,
} from './types.js';

export {
  MODEL_PRICING,
  RECOMMENDED_MODELS,
} from './types.js';

export type { BudgetConfig } from './types.js';

// Factory
export {
  loadLLMConfig,
  hasLLMConfig,
  createProvider,
  getAvailableProviders,
  validateLLMConfig,
} from './provider-factory.js';

// Providers (for direct instantiation if needed)
export { ClaudeCodeProvider, isClaudeCodeAvailable } from './providers/claude-code-provider.js';
export { AnthropicProvider } from './providers/anthropic-provider.js';
export { OpenAIProvider } from './providers/openai-provider.js';
export { AzureOpenAIProvider } from './providers/azure-openai-provider.js';
export { OllamaProvider } from './providers/ollama-provider.js';
export { BedrockProvider } from './providers/bedrock-provider.js';
export { VertexAIProvider } from './providers/vertex-ai-provider.js';
export { WorkersAIProvider } from './providers/workers-ai-provider.js';

// Fallback and budget guard
export { FallbackProvider } from './fallback-provider.js';
export { BudgetGuardProvider, BudgetExceededError } from './budget-guard.js';

// Consent management for external API providers
export {
  isExternalProvider,
  checkConsent,
  grantStandingConsent,
  FREE_PROVIDERS,
  ExternalApiConsentDeniedError,
} from './consent.js';

export type {
  ConsentMode,
  ConsentStatus,
  ExternalModelsConfig,
} from './types.js';

// Robust JSON extraction for LLM responses (handles prose + JSON, code blocks, etc.)
export {
  extractJson,
  buildJsonPrompt,
  generateCorrectionPrompt,
  extractRequiredFieldsFromSchema,
  extractJsonWithRetry,
  analyzeStructuredWithRetry,
  type ExtractionResult,
  type ExtractionOptions
} from '../../utils/llm-json-extractor.js';
