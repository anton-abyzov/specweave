/**
 * LLM Provider Factory
 *
 * Creates appropriate LLM provider instance from configuration.
 * Supports lazy loading of provider SDKs to avoid unnecessary dependencies.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { LLMConfig, LLMProvider, LLMProviderType } from './types.js';
import { isClaudeCodeAvailable, getClaudeCodeStatus } from './providers/claude-code-provider.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { isExternalProvider, checkConsent, ExternalApiConsentDeniedError } from './consent.js';

// Re-export for convenience
export { isClaudeCodeAvailable, getClaudeCodeStatus };

/**
 * Provider factory options
 */
export interface ProviderFactoryOptions {
  logger?: Logger;
  /** Project root for consent config lookup (defaults to cwd) */
  projectRoot?: string;
}

/**
 * Load LLM configuration from project
 *
 * @param projectPath - Path to project root
 * @returns LLM config or null if not configured
 */
export function loadLLMConfig(projectPath: string): LLMConfig | null {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.llm || null;
  } catch {
    return null;
  }
}

/**
 * Check if LLM is configured for a project
 */
export function hasLLMConfig(projectPath: string): boolean {
  const config = loadLLMConfig(projectPath);
  return config !== null;
}

/**
 * Create LLM provider from configuration
 *
 * @param config - LLM configuration
 * @param options - Factory options
 * @returns LLM provider instance
 * @throws Error if provider type not supported or SDK not installed
 */
export async function createProvider(
  config: LLMConfig,
  options: ProviderFactoryOptions = {}
): Promise<LLMProvider> {
  const logger = options.logger ?? consoleLogger;

  // Consent gate: check before creating paid providers
  if (isExternalProvider(config.provider)) {
    const projectRoot = options.projectRoot ?? process.cwd();
    const consent = checkConsent(config.provider, projectRoot);
    if (consent !== 'granted') {
      throw new ExternalApiConsentDeniedError(config.provider);
    }
  }

  switch (config.provider) {
    case 'claude-code':
      return createClaudeCodeProvider(config, logger);

    case 'anthropic':
      return createAnthropicProvider(config, logger);

    case 'openai':
      return createOpenAIProvider(config, logger);

    case 'azure-openai':
      return createAzureOpenAIProvider(config, logger);

    case 'ollama':
      return createOllamaProvider(config, logger);

    case 'bedrock':
      return createBedrockProvider(config, logger);

    case 'vertex-ai':
      return createVertexAIProvider(config, logger);

    case 'workers-ai':
      return createWorkersAIProvider(config, logger);

    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Create Claude Code native provider (uses MAX subscription!)
 *
 * This is the RECOMMENDED provider for Claude MAX subscribers.
 * Uses `claude --print` CLI command with cached authentication.
 * NO API KEY NEEDED - uses your existing MAX subscription!
 */
async function createClaudeCodeProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { ClaudeCodeProvider } = await import('./providers/claude-code-provider.js');

  // Check if Claude Code CLI is available
  const available = await isClaudeCodeAvailable();
  if (!available) {
    throw new Error(
      'Claude Code CLI not available or not authenticated. ' +
      'Run `claude` interactively first to authenticate with your MAX subscription.'
    );
  }

  return new ClaudeCodeProvider({
    model: config.model || 'opus',  // Opus 4.5 by default for best analysis quality
    maxTokens: config.maxTokensPerRequest,
    logger,
  });
}

/**
 * Get API key from config or environment
 */
function getApiKey(config: LLMConfig, defaultEnvVar: string): string | undefined {
  return config.apiKeyEnv ? process.env[config.apiKeyEnv] : process.env[defaultEnvVar];
}

/**
 * Create Anthropic provider (lazy load SDK)
 */
async function createAnthropicProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { AnthropicProvider } = await import('./providers/anthropic-provider.js');
  const apiKey = getApiKey(config, 'ANTHROPIC_API_KEY');

  if (!apiKey) {
    throw new Error(
      `Anthropic API key not found. Set ${config.apiKeyEnv || 'ANTHROPIC_API_KEY'} environment variable.`
    );
  }

  return new AnthropicProvider({
    apiKey,
    model: config.model || 'opus', // Resolved to full ID in provider
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create OpenAI provider (lazy load SDK)
 */
async function createOpenAIProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { OpenAIProvider } = await import('./providers/openai-provider.js');
  const apiKey = getApiKey(config, 'OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error(
      `OpenAI API key not found. Set ${config.apiKeyEnv || 'OPENAI_API_KEY'} environment variable.`
    );
  }

  return new OpenAIProvider({
    apiKey,
    model: config.model || 'gpt-4o',
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create Azure OpenAI provider
 */
async function createAzureOpenAIProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { AzureOpenAIProvider } = await import('./providers/azure-openai-provider.js');
  const apiKey = getApiKey(config, 'AZURE_OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error(
      `Azure OpenAI API key not found. Set ${config.apiKeyEnv || 'AZURE_OPENAI_API_KEY'} environment variable.`
    );
  }

  if (!config.baseUrl) {
    throw new Error('Azure OpenAI requires baseUrl (endpoint) in config');
  }

  return new AzureOpenAIProvider({
    apiKey,
    endpoint: config.baseUrl,
    deployment: config.azureDeployment || config.model,
    apiVersion: config.azureApiVersion || '2024-02-15-preview',
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create Ollama provider (local)
 */
async function createOllamaProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { OllamaProvider } = await import('./providers/ollama-provider.js');

  return new OllamaProvider({
    baseUrl: config.baseUrl || 'http://localhost:11434',
    model: config.model || 'llama3.1:8b',
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create AWS Bedrock provider
 */
async function createBedrockProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { BedrockProvider } = await import('./providers/bedrock-provider.js');

  return new BedrockProvider({
    region: config.awsRegion || process.env.AWS_REGION || 'us-east-1',
    model: config.model || 'opus', // Resolved to full Bedrock ID in provider
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create Google Vertex AI provider
 */
async function createVertexAIProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { VertexAIProvider } = await import('./providers/vertex-ai-provider.js');

  return new VertexAIProvider({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    model: config.model || 'gemini-1.5-pro',
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    logger,
  });
}

/**
 * Create Cloudflare Workers AI provider
 */
async function createWorkersAIProvider(
  config: LLMConfig,
  logger: Logger
): Promise<LLMProvider> {
  const { WorkersAIProvider } = await import('./providers/workers-ai-provider.js');

  const accountId = config.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = config.apiKeyEnv
    ? process.env[config.apiKeyEnv]
    : process.env.CLOUDFLARE_AI_API_TOKEN;

  if (!accountId) {
    throw new Error(
      'Cloudflare account ID not found. Set cloudflareAccountId in config or CLOUDFLARE_ACCOUNT_ID env variable.'
    );
  }

  if (!apiToken) {
    throw new Error(
      `Cloudflare AI API token not found. Set ${config.apiKeyEnv || 'CLOUDFLARE_AI_API_TOKEN'} environment variable.`
    );
  }

  return new WorkersAIProvider({
    accountId,
    apiToken,
    model: config.model || '@cf/openai/gpt-oss-120b',
    maxTokens: config.maxTokensPerRequest,
    temperature: config.temperature,
    reasoningEffort: config.reasoningEffort,
    logger,
  });
}

/**
 * Get list of available providers (based on installed SDKs and env vars)
 */
export async function getAvailableProviders(): Promise<LLMProviderType[]> {
  const available: LLMProviderType[] = [];

  // Check Claude Code (RECOMMENDED - uses MAX subscription!)
  try {
    if (await isClaudeCodeAvailable()) {
      available.push('claude-code');
    }
  } catch {
    // Claude Code not available
  }

  // Check Anthropic API
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      await import('@anthropic-ai/sdk');
      available.push('anthropic');
    } catch {
      // SDK not installed
    }
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      await import('openai');
      available.push('openai');
    } catch {
      // SDK not installed
    }
  }

  // Check Azure OpenAI
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    available.push('azure-openai');
  }

  // Ollama is always "available" if URL is reachable
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      available.push('ollama');
    }
  } catch {
    // Ollama not running
  }

  // Check Bedrock (requires AWS credentials)
  if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE) {
    available.push('bedrock');
  }

  // Check Vertex AI
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
    available.push('vertex-ai');
  }

  // Check Workers AI
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_API_TOKEN) {
    available.push('workers-ai');
  }

  return available;
}

/**
 * Validate LLM configuration
 */
export function validateLLMConfig(config: LLMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('provider is required');
  }

  if (!config.model) {
    errors.push('model is required');
  }

  if (config.provider === 'azure-openai' && !config.baseUrl) {
    errors.push('baseUrl (endpoint) is required for Azure OpenAI');
  }

  if (config.maxTokensPerRequest && config.maxTokensPerRequest > 100000) {
    errors.push('maxTokensPerRequest exceeds maximum (100000)');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('temperature must be between 0 and 2');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
