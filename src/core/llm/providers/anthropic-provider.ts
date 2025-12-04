/**
 * Anthropic Claude Provider
 *
 * Implements LLMProvider interface for Anthropic's Claude models.
 * Uses @anthropic-ai/sdk for API calls.
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
  ModelPricing,
} from '../types.js';
import { MODEL_PRICING } from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * Anthropic provider configuration
 */
export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  logger?: Logger;
}

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;
  readonly defaultModel: string;

  private apiKey: string;
  private maxTokens: number;
  private temperature: number;
  private baseUrl: string;
  private logger: Logger;
  private client: any; // Anthropic SDK client (lazy loaded)

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.logger = config.logger || consoleLogger;
  }

  /**
   * Get or create SDK client (lazy initialization)
   */
  private async getClient(): Promise<any> {
    if (!this.client) {
      // Dynamic import to avoid requiring SDK if not used
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
    }
    return this.client;
  }

  /**
   * Analyze text with Claude
   */
  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature ?? this.temperature;
    const retries = options.retries ?? 2;
    const timeout = options.timeout ?? 60000;

    let lastError: Error | null = null;
    let wasRetry = false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const client = await this.getClient();

        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
          { role: 'user', content: prompt },
        ];

        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: options.systemPrompt,
          messages,
        });

        const content = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        const usage = {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        };

        return {
          content,
          usage,
          estimatedCost: this.estimateCost(usage.inputTokens, usage.outputTokens, model),
          model,
          durationMs: Date.now() - startTime,
          wasRetry,
        };
      } catch (error: any) {
        lastError = error;
        wasRetry = true;

        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Don't retry on validation errors
        if (error.status === 400) {
          throw error;
        }

        // Retry on rate limits and server errors
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(`Anthropic request failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Anthropic request failed after retries');
  }

  /**
   * Analyze with structured JSON output
   */
  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    // Add JSON instruction to prompt
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with valid JSON matching this schema:
${JSON.stringify(options.schema, null, 2)}

Return ONLY the JSON object, no markdown formatting or explanation.`;

    const result = await this.analyze(jsonPrompt, {
      ...options,
      temperature: options.temperature ?? 0.1, // Lower temp for structured output
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonContent = result.content.trim();

      // Remove markdown code block if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      const data = JSON.parse(jsonContent) as T;

      return {
        data,
        usage: result.usage,
        estimatedCost: result.estimatedCost,
      };
    } catch (parseError: any) {
      if (options.strict) {
        throw new Error(`Failed to parse structured response: ${parseError.message}`);
      }

      // Return raw content wrapped in error structure
      return {
        data: { error: 'parse_failed', raw: result.content } as unknown as T,
        usage: result.usage,
        estimatedCost: result.estimatedCost,
      };
    }
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const modelId = model || this.defaultModel;
    const pricing = MODEL_PRICING[modelId] || { inputPer1M: 3, outputPer1M: 15 };

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

    return inputCost + outputCost;
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch {
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();

    try {
      const client = await this.getClient();

      // Simple ping - count tokens for minimal text
      await client.messages.count_tokens({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
      });

      return {
        available: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        available: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
