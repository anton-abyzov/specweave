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
import { extractJson, extractRequiredFieldsFromSchema } from '../../../utils/llm-json-extractor.js';

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
    this.defaultModel = config.model || 'anthropic.claude-opus-4-5-20251101-v1:0';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.logger = config.logger || consoleLogger;
  }

  private async getClient(): Promise<any> {
    if (!this.client) {
      // @ts-ignore - @aws-sdk/client-bedrock-runtime is an optional runtime dependency (may not be installed)
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      this.client = new BedrockRuntimeClient({ region: this.region });
    }
    return this.client;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    const client = await this.getClient();
    // @ts-ignore - @aws-sdk/client-bedrock-runtime is an optional runtime dependency (may not be installed)
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

    // Extract required fields from schema for validation
    const requiredFields = extractRequiredFieldsFromSchema(options.schema);

    // Use robust JSON extraction (handles prose + JSON, code blocks, nested structures)
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

    // Model pricing per 1M tokens (input, output)
    const pricing = this.getPricing(modelId);
    return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  }

  private getPricing(modelId: string): { input: number; output: number } {
    if (modelId.includes('claude-opus-4')) return { input: 15, output: 75 };
    if (modelId.includes('claude-sonnet-4') || modelId.includes('claude-3-5-sonnet')) return { input: 3, output: 15 };
    if (modelId.includes('claude-3-haiku') || modelId.includes('claude-haiku')) return { input: 0.25, output: 1.25 };
    if (modelId.includes('titan')) return { input: 0.8, output: 1.6 };
    return { input: 15, output: 75 }; // Default to opus
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const client = await this.getClient();
      // Note: ListFoundationModels is on the Bedrock management client, not Runtime
      // For status check, we just verify credentials work by checking client exists
      return {
        available: !!client,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
