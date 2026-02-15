/**
 * LLM Provider Abstraction Types
 *
 * Supports multiple LLM providers for AI-powered features:
 * - Anthropic (Claude)
 * - OpenAI (GPT-4, GPT-4o)
 * - Azure OpenAI
 * - AWS Bedrock
 * - Ollama (local)
 * - Google Vertex AI
 */

/**
 * Supported LLM providers
 */
export type LLMProviderType =
  | 'claude-code'   // Native Claude Code CLI (uses MAX subscription - FREE!)
  | 'anthropic'     // Anthropic API (requires API key)
  | 'openai'
  | 'azure-openai'
  | 'bedrock'
  | 'ollama'
  | 'vertex-ai';

/**
 * LLM configuration stored in .specweave/config.json
 */
export interface LLMConfig {
  /** Provider type */
  provider: LLMProviderType;

  /** Model identifier (provider-specific) */
  model: string;

  /** Environment variable name containing API key */
  apiKeyEnv?: string;

  /** Custom base URL (for Azure, Ollama, proxies) */
  baseUrl?: string;

  /** Azure-specific: deployment name */
  azureDeployment?: string;

  /** Azure-specific: API version */
  azureApiVersion?: string;

  /** Bedrock-specific: AWS region */
  awsRegion?: string;

  /** Max tokens per request (default: 4096) */
  maxTokensPerRequest?: number;

  /** Temperature (default: 0.3 for analysis tasks) */
  temperature?: number;

  /** Enable cost tracking */
  costTracking?: boolean;

  /** Fallback provider if primary fails */
  fallback?: LLMConfig;
}

/**
 * Options for a single analysis request
 */
export interface AnalyzeOptions {
  /** Override max tokens for this request */
  maxTokens?: number;

  /** Override temperature for this request */
  temperature?: number;

  /** Override model for this request */
  model?: string;

  /** System prompt (prepended to user prompt) */
  systemPrompt?: string;

  /** Request timeout in ms (default: 60000) */
  timeout?: number;

  /** Retry count on failure (default: 2) */
  retries?: number;
}

/**
 * Result of an analysis request
 */
export interface AnalyzeResult {
  /** The response content */
  content: string;

  /** Token usage */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Model used */
  model: string;

  /** Request duration in ms */
  durationMs: number;

  /** Whether this was a retry */
  wasRetry: boolean;
}

/**
 * Structured output options (JSON schema)
 */
export interface StructuredOptions<T> extends AnalyzeOptions {
  /** JSON schema for response validation */
  schema: JSONSchemaType<T>;

  /** Strict mode - fail if response doesn't match schema */
  strict?: boolean;
}

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchemaType<T> {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JSONSchemaType<unknown>>;
  items?: JSONSchemaType<unknown>;
  required?: string[];
  description?: string;
}

/**
 * External model API consent mode
 */
export type ConsentMode = 'ask' | 'always-allow' | 'never';

/**
 * Consent check result status
 */
export type ConsentStatus = 'granted' | 'denied' | 'ask';

/**
 * External model API consent configuration
 */
export interface ExternalModelsConfig {
  /** Consent mode: ask (prompt user), always-allow (skip consent), never (block all) */
  consent: ConsentMode;
  /** Providers with standing consent (skip future prompts) */
  allowedProviders: string[];
}

/**
 * Cost tracking data
 */
export interface CostTrackingData {
  provider: LLMProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  requestCount: number;
  startedAt: string;
  lastUpdatedAt: string;
}

/**
 * LLM Provider interface
 *
 * All providers must implement this interface for consistent usage.
 */
export interface LLMProvider {
  /** Provider name for logging */
  readonly name: LLMProviderType;

  /** Default model for this provider */
  readonly defaultModel: string;

  /**
   * Analyze text with LLM
   *
   * @param prompt - The prompt to send
   * @param options - Request options
   * @returns Analysis result with content and usage stats
   */
  analyze(prompt: string, options?: AnalyzeOptions): Promise<AnalyzeResult>;

  /**
   * Analyze with structured JSON output
   *
   * @param prompt - The prompt to send
   * @param options - Request options with schema
   * @returns Parsed structured response
   */
  analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }>;

  /**
   * Estimate cost for a request
   *
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param model - Model to use (optional, uses default)
   * @returns Estimated cost in USD
   */
  estimateCost(inputTokens: number, outputTokens: number, model?: string): number;

  /**
   * Check if provider is available (API key set, endpoint reachable)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider health/status
   */
  getStatus(): Promise<{
    available: boolean;
    latencyMs?: number;
    error?: string;
  }>;
}

/**
 * Model pricing per 1M tokens (input/output)
 */
export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

/**
 * Model alias to full model ID mapping
 *
 * SINGLE SOURCE OF TRUTH for model aliases.
 * When Anthropic releases new models, update this mapping ONLY.
 *
 * Usage:
 * - Use aliases (opus, sonnet, haiku) in AGENT.md, SKILL.md, and configs
 * - resolveModelAlias('opus') → 'claude-opus-4-5-20251101'
 *
 * Updated: 2025-01-18
 */
export const MODEL_ALIASES: Record<string, string> = {
  // Anthropic Claude aliases
  'opus': 'claude-opus-4-5-20251101',
  'sonnet': 'claude-sonnet-4-5-20250929',
  'haiku': 'claude-3-5-haiku-20241022',

  // AWS Bedrock aliases (includes provider prefix)
  'bedrock:opus': 'anthropic.claude-opus-4-5-20251101-v1:0',
  'bedrock:sonnet': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'bedrock:haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
};

/**
 * Resolve model alias to full model ID
 *
 * @param modelOrAlias - Model alias (opus, sonnet, haiku) or full model ID
 * @param provider - Optional provider context for provider-specific resolution
 * @returns Full model ID
 *
 * @example
 * resolveModelAlias('opus') // → 'claude-opus-4-5-20251101'
 * resolveModelAlias('opus', 'bedrock') // → 'anthropic.claude-opus-4-5-20251101-v1:0'
 * resolveModelAlias('claude-opus-4-5-20251101') // → 'claude-opus-4-5-20251101' (passthrough)
 */
export function resolveModelAlias(modelOrAlias: string, provider?: string): string {
  // Check provider-specific alias first
  if (provider) {
    const providerAlias = `${provider}:${modelOrAlias}`;
    if (MODEL_ALIASES[providerAlias]) {
      return MODEL_ALIASES[providerAlias];
    }
  }

  // Check generic alias
  if (MODEL_ALIASES[modelOrAlias]) {
    return MODEL_ALIASES[modelOrAlias];
  }

  // Return as-is (already a full model ID)
  return modelOrAlias;
}

/**
 * Default pricing for known models (USD per 1M tokens)
 * Updated: 2025-01-18
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic (use full IDs for API calls, aliases for display)
  'claude-opus-4-5-20251101': { inputPer1M: 15, outputPer1M: 75 },
  'claude-sonnet-4-5-20250929': { inputPer1M: 3, outputPer1M: 15 },
  'claude-sonnet-4-20250514': { inputPer1M: 3, outputPer1M: 15 },
  'claude-3-5-haiku-20241022': { inputPer1M: 1, outputPer1M: 5 },
  // Aliases pointing to same pricing
  'opus': { inputPer1M: 15, outputPer1M: 75 },
  'sonnet': { inputPer1M: 3, outputPer1M: 15 },
  'haiku': { inputPer1M: 1, outputPer1M: 5 },

  // OpenAI
  'gpt-4o': { inputPer1M: 5, outputPer1M: 15 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { inputPer1M: 10, outputPer1M: 30 },
  'o1-preview': { inputPer1M: 15, outputPer1M: 60 },
  'o1-mini': { inputPer1M: 3, outputPer1M: 12 },

  // Local (free)
  'ollama/*': { inputPer1M: 0, outputPer1M: 0 },
};

/**
 * Recommended models by use case
 */
export const RECOMMENDED_MODELS: Record<string, Partial<Record<LLMProviderType, string>>> = {
  // Deep analysis - needs reasoning
  'deep-analysis': {
    'claude-code': 'opus',  // Uses MAX subscription via CLI - Opus 4.5 for best quality
    'anthropic': 'claude-sonnet-4-20250514',
    'openai': 'gpt-4o',
    'azure-openai': 'gpt-4o',
    'bedrock': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'ollama': 'llama3.1:70b',
    'vertex-ai': 'gemini-1.5-pro',
  },
  // Quick tasks - cost-effective
  'quick-task': {
    'claude-code': 'haiku',  // Uses MAX subscription via CLI
    'anthropic': 'claude-3-5-haiku-20241022',
    'openai': 'gpt-4o-mini',
    'azure-openai': 'gpt-4o-mini',
    'bedrock': 'anthropic.claude-3-haiku-20240307-v1:0',
    'ollama': 'llama3.1:8b',
    'vertex-ai': 'gemini-1.5-flash',
  },
};
