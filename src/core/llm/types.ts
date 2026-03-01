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
 * - Cloudflare Workers AI (gpt-oss-120b)
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
  | 'vertex-ai'
  | 'workers-ai';  // Cloudflare Workers AI (gpt-oss-120b)

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

  /** Workers AI: Cloudflare account ID */
  cloudflareAccountId?: string;

  /** Workers AI: Reasoning effort for gpt-oss models */
  reasoningEffort?: 'low' | 'medium' | 'high';

  /** Budget config for cost-controlled providers */
  budget?: BudgetConfig;

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
 * Budget configuration for cost-controlled providers
 */
export interface BudgetConfig {
  /** Maximum daily spend in USD (default: 1.00) */
  dailyLimitUSD: number;
  /** Maximum monthly spend in USD (default: 10.00) */
  monthlyLimitUSD: number;
  /** Send notification on every use (default: true) */
  notifyOnUse: boolean;
  /** Send warning notification at this % of budget (default: 80) */
  notifyThresholdPercent: number;
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
 * When providers release new models, update this mapping ONLY.
 *
 * Usage:
 * - Use aliases (opus, sonnet, haiku) in AGENT.md, SKILL.md, and configs
 * - resolveModelAlias('opus') → 'claude-opus-4-6'
 *
 * Updated: 2026-03-01
 */
export const MODEL_ALIASES: Record<string, string> = {
  // Anthropic Claude aliases
  'opus': 'claude-opus-4-6',
  'sonnet': 'claude-sonnet-4-6',
  'haiku': 'claude-haiku-4-5-20251001',

  // AWS Bedrock aliases (includes provider prefix)
  'bedrock:opus': 'anthropic.claude-opus-4-6-v1:0',
  'bedrock:sonnet': 'anthropic.claude-sonnet-4-6-v1:0',
  'bedrock:haiku': 'anthropic.claude-haiku-4-5-20251001-v1:0',

  // Cloudflare Workers AI aliases
  'workers-ai:gpt-oss': '@cf/openai/gpt-oss-120b',
};

/**
 * Resolve model alias to full model ID
 *
 * @param modelOrAlias - Model alias (opus, sonnet, haiku) or full model ID
 * @param provider - Optional provider context for provider-specific resolution
 * @returns Full model ID
 *
 * @example
 * resolveModelAlias('opus') // → 'claude-opus-4-6'
 * resolveModelAlias('opus', 'bedrock') // → 'anthropic.claude-opus-4-6-v1:0'
 * resolveModelAlias('claude-opus-4-6') // → 'claude-opus-4-6' (passthrough)
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
 * Updated: 2026-03-01
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic (use full IDs for API calls, aliases for display)
  'claude-opus-4-6': { inputPer1M: 5, outputPer1M: 25 },
  'claude-sonnet-4-6': { inputPer1M: 3, outputPer1M: 15 },
  'claude-haiku-4-5-20251001': { inputPer1M: 1, outputPer1M: 5 },
  // Aliases pointing to same pricing
  'opus': { inputPer1M: 5, outputPer1M: 25 },
  'sonnet': { inputPer1M: 3, outputPer1M: 15 },
  'haiku': { inputPer1M: 1, outputPer1M: 5 },

  // OpenAI
  'gpt-5.3': { inputPer1M: 5, outputPer1M: 15 },
  'gpt-5.3-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'o3-mini': { inputPer1M: 3, outputPer1M: 12 },

  // Google
  'gemini-3-pro': { inputPer1M: 1.25, outputPer1M: 5 },
  'gemini-3-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },

  // Local (free)
  'ollama/*': { inputPer1M: 0, outputPer1M: 0 },

  // Cloudflare Workers AI
  '@cf/openai/gpt-oss-120b': { inputPer1M: 0.35, outputPer1M: 0.75 },
};

/**
 * Recommended models by use case
 */
export const RECOMMENDED_MODELS: Record<string, Partial<Record<LLMProviderType, string>>> = {
  // Deep analysis - needs reasoning
  'deep-analysis': {
    'claude-code': 'opus',  // Uses MAX subscription via CLI - Opus 4.6 for best quality
    'anthropic': 'claude-sonnet-4-6',
    'openai': 'gpt-5.3',
    'azure-openai': 'gpt-5.3',
    'bedrock': 'anthropic.claude-sonnet-4-6-v1:0',
    'ollama': 'llama3.1:70b',
    'vertex-ai': 'gemini-3-pro',
    'workers-ai': '@cf/openai/gpt-oss-120b',
  },
  // Quick tasks - cost-effective
  'quick-task': {
    'claude-code': 'haiku',  // Uses MAX subscription via CLI
    'anthropic': 'claude-haiku-4-5-20251001',
    'openai': 'gpt-5.3-mini',
    'azure-openai': 'gpt-5.3-mini',
    'bedrock': 'anthropic.claude-haiku-4-5-20251001-v1:0',
    'ollama': 'llama3.1:8b',
    'vertex-ai': 'gemini-3-flash',
    'workers-ai': '@cf/openai/gpt-oss-120b',
  },
};
