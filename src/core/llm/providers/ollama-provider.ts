/**
 * Ollama Provider (Local LLM)
 *
 * Implements LLMProvider interface for local Ollama models.
 * Uses HTTP API directly (no SDK needed).
 *
 * Best for: Local development, privacy-sensitive analysis, cost-free operation
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export interface OllamaProviderConfig {
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  logger?: Logger;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;
  readonly defaultModel: string;

  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;
  private logger: Logger;

  constructor(config: OllamaProviderConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.model || 'llama3.1:8b';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.logger = config.logger || consoleLogger;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    const systemPrompt = options.systemPrompt || '';
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          num_predict: options.maxTokens || this.maxTokens,
          temperature: options.temperature ?? this.temperature,
        },
      }),
      signal: AbortSignal.timeout(options.timeout || 120000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama request failed: ${error}`);
    }

    const data = await response.json();

    // Ollama doesn't provide exact token counts, estimate from response
    const inputTokens = Math.ceil(fullPrompt.length / 4);
    const outputTokens = Math.ceil((data.response?.length || 0) / 4);

    return {
      content: data.response || '',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      estimatedCost: 0, // Local = free
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

    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(jsonContent) as T;

    return {
      data,
      usage: result.usage,
      estimatedCost: 0,
    };
  }

  estimateCost(): number {
    return 0; // Local = free
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
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        const hasModel = data.models?.some((m: any) =>
          m.name === this.defaultModel || m.name.startsWith(this.defaultModel.split(':')[0])
        );

        return {
          available: hasModel,
          latencyMs: Date.now() - startTime,
          error: hasModel ? undefined : `Model ${this.defaultModel} not found`,
        };
      }

      return { available: false, error: 'Ollama server not responding' };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
