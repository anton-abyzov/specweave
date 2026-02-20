/**
 * Cloudflare Workers AI Provider
 *
 * Implements LLMProvider interface for Cloudflare Workers AI models.
 * Uses HTTP API directly (no SDK needed), following the Ollama provider pattern.
 *
 * Primary model: gpt-oss-120b (near o4-mini reasoning, 128K context)
 * Supports reasoning effort control for gpt-oss models.
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
import { extractJson, extractRequiredFieldsFromSchema } from '../../../utils/llm-json-extractor.js';

export interface WorkersAIProviderConfig {
  accountId: string;
  apiToken: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  logger?: Logger;
}

export class WorkersAIProvider implements LLMProvider {
  readonly name = 'workers-ai' as const;
  readonly defaultModel: string;

  private accountId: string;
  private apiToken: string;
  private maxTokens: number;
  private temperature: number;
  private reasoningEffort?: 'low' | 'medium' | 'high';
  private logger: Logger;

  constructor(config: WorkersAIProviderConfig) {
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.defaultModel = config.model || '@cf/openai/gpt-oss-120b';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.reasoningEffort = config.reasoningEffort;
    this.logger = config.logger || consoleLogger;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    };

    if (this.reasoningEffort) {
      body.reasoning = { effort: this.reasoningEffort };
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeout || 120000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Workers AI request failed (${response.status}): ${error}`);
    }

    const data = await response.json() as {
      result: { response: string } | null;
      success: boolean;
      errors?: Array<{ message: string }>;
    };

    if (!data.success) {
      const errorMsg = data.errors?.[0]?.message || 'Unknown Workers AI error';
      throw new Error(errorMsg);
    }

    const content = data.result?.response || '';

    // Estimate tokens (Workers AI doesn't always provide exact counts)
    const inputText = messages.map(m => m.content).join(' ');
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.ceil(content.length / 4);

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      estimatedCost: this.estimateCost(inputTokens, outputTokens, model),
      model,
      durationMs: Date.now() - startTime,
      wasRetry: false,
    };
  }

  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    const jsonPrompt = `${prompt}

Respond with valid JSON matching this schema:
${JSON.stringify(options.schema, null, 2)}

Return ONLY the JSON object.`;

    const result = await this.analyze(jsonPrompt, {
      ...options,
      temperature: 0.1,
    });

    const requiredFields = extractRequiredFieldsFromSchema(options.schema);
    const extraction = extractJson<T>(result.content, { requiredFields });

    if (extraction.success && extraction.data) {
      return {
        data: extraction.data,
        usage: result.usage,
        estimatedCost: result.estimatedCost,
      };
    }

    throw new Error(`Failed to parse structured response: ${extraction.error}`);
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const modelId = model || this.defaultModel;
    const pricing: ModelPricing | undefined = MODEL_PRICING[modelId];
    if (!pricing) return 0;

    return (
      (inputTokens / 1_000_000) * pricing.inputPer1M +
      (outputTokens / 1_000_000) * pricing.outputPer1M
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models/search`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return {
          available: true,
          latencyMs: Date.now() - startTime,
        };
      }

      return { available: false, error: `Workers AI responded with ${response.status}` };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
