/**
 * Azure OpenAI Provider
 *
 * Implements LLMProvider interface for Azure-hosted OpenAI models.
 * Uses openai SDK with Azure configuration.
 *
 * Best for: Enterprise environments with Azure compliance requirements
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from '../types.js';
import { MODEL_PRICING } from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { extractJson, extractRequiredFieldsFromSchema } from '../../../utils/llm-json-extractor.js';

export interface AzureOpenAIProviderConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion?: string;
  maxTokens?: number;
  temperature?: number;
  logger?: Logger;
}

export class AzureOpenAIProvider implements LLMProvider {
  readonly name = 'azure-openai' as const;
  readonly defaultModel: string;

  private apiKey: string;
  private endpoint: string;
  private deployment: string;
  private apiVersion: string;
  private maxTokens: number;
  private temperature: number;
  private logger: Logger;
  private client: any;

  constructor(config: AzureOpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.deployment = config.deployment;
    this.apiVersion = config.apiVersion || '2024-02-15-preview';
    this.defaultModel = config.deployment;
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.logger = config.logger || consoleLogger;
  }

  private async getClient(): Promise<any> {
    if (!this.client) {
      // @ts-ignore - Optional dependency, may not be installed
      const { AzureOpenAI } = await import('openai');
      this.client = new AzureOpenAI({
        apiKey: this.apiKey,
        endpoint: this.endpoint,
        apiVersion: this.apiVersion,
        deployment: this.deployment,
      });
    }
    return this.client;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();

    const client = await this.getClient();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await client.chat.completions.create({
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
      messages,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return {
      content,
      usage,
      estimatedCost: this.estimateCost(usage.inputTokens, usage.outputTokens),
      model: this.deployment,
      durationMs: Date.now() - startTime,
      wasRetry: false,
    };
  }

  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    const client = await this.getClient();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `Respond in JSON format matching: ${JSON.stringify(options.schema)}`,
      },
      { role: 'user', content: prompt },
    ];

    const response = await client.chat.completions.create({
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: 0.1,
      messages,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    // Extract required fields from schema for validation
    const requiredFields = extractRequiredFieldsFromSchema(options.schema);

    // Use robust JSON extraction for safety (native JSON mode should work, but belt + suspenders)
    const extraction = extractJson<T>(content, { requiredFields });

    if (extraction.success && extraction.data) {
      return {
        data: extraction.data,
        usage,
        estimatedCost: this.estimateCost(usage.inputTokens, usage.outputTokens),
      };
    }

    throw new Error(`Failed to parse structured response: ${extraction.error}`);
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // Azure pricing varies by region and agreement
    // Using GPT-4o defaults as baseline
    const pricing = { inputPer1M: 5, outputPer1M: 15 };
    return (inputTokens / 1_000_000) * pricing.inputPer1M +
           (outputTokens / 1_000_000) * pricing.outputPer1M;
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const client = await this.getClient();
      // Azure doesn't have models.list, try a minimal completion
      await client.chat.completions.create({
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return { available: true, latencyMs: Date.now() - startTime };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
