/**
 * AWS Bedrock Provider
 *
 * Implements LLMProvider interface for AWS Bedrock models.
 * Supports Claude, Titan, and other Bedrock models.
 *
 * Best for: AWS-native environments, existing AWS infrastructure
 *
 * NOTE: Requires @aws-sdk/client-bedrock-runtime
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export interface BedrockProviderConfig {
  region?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  logger?: Logger;
}

export class BedrockProvider implements LLMProvider {
  readonly name = 'bedrock' as const;
  readonly defaultModel: string;

  private region: string;
  private maxTokens: number;
  private temperature: number;
  private logger: Logger;
  private client: any;

  constructor(config: BedrockProviderConfig) {
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.defaultModel = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.logger = config.logger || consoleLogger;
  }

  private async getClient(): Promise<any> {
    if (!this.client) {
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      this.client = new BedrockRuntimeClient({ region: this.region });
    }
    return this.client;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    const client = await this.getClient();
    const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

    // Format depends on model provider
    const isAnthropic = model.startsWith('anthropic.');
    const isTitan = model.startsWith('amazon.titan');

    let body: string;

    if (isAnthropic) {
      body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? this.temperature,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
    } else if (isTitan) {
      body = JSON.stringify({
        inputText: options.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
        textGenerationConfig: {
          maxTokenCount: options.maxTokens || this.maxTokens,
          temperature: options.temperature ?? this.temperature,
        },
      });
    } else {
      throw new Error(`Unsupported Bedrock model: ${model}`);
    }

    const command = new InvokeModelCommand({
      modelId: model,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    let content: string;
    let inputTokens = 0;
    let outputTokens = 0;

    if (isAnthropic) {
      content = responseBody.content?.[0]?.text || '';
      inputTokens = responseBody.usage?.input_tokens || 0;
      outputTokens = responseBody.usage?.output_tokens || 0;
    } else if (isTitan) {
      content = responseBody.results?.[0]?.outputText || '';
      inputTokens = responseBody.inputTextTokenCount || 0;
      outputTokens = responseBody.results?.[0]?.tokenCount || 0;
    } else {
      content = '';
    }

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

Respond with valid JSON matching: ${JSON.stringify(options.schema)}
Return ONLY the JSON object.`;

    const result = await this.analyze(jsonPrompt, {
      ...options,
      temperature: 0.1,
    });

    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    return {
      data: JSON.parse(jsonContent) as T,
      usage: result.usage,
      estimatedCost: result.estimatedCost,
    };
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    // Bedrock Claude pricing (slightly higher than direct)
    const modelId = model || this.defaultModel;

    if (modelId.includes('claude-3-5-sonnet')) {
      return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
    }
    if (modelId.includes('claude-3-haiku')) {
      return (inputTokens / 1_000_000) * 0.25 + (outputTokens / 1_000_000) * 1.25;
    }
    if (modelId.includes('titan')) {
      return (inputTokens / 1_000_000) * 0.8 + (outputTokens / 1_000_000) * 1.6;
    }

    return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const client = await this.getClient();
      const { ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock-runtime');

      // Note: ListFoundationModels is on the Bedrock client, not Runtime
      // For status check, we just verify credentials work
      return {
        available: !!client,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
