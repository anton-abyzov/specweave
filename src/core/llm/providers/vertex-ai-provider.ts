/**
 * Google Vertex AI Provider
 *
 * Implements LLMProvider interface for Google's Gemini models via Vertex AI.
 *
 * Best for: GCP-native environments, Gemini model access
 *
 * NOTE: Requires @google-cloud/vertexai
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { extractJson, extractRequiredFieldsFromSchema } from '../../../utils/llm-json-extractor.js';

export interface VertexAIProviderConfig {
  projectId?: string;
  location?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  logger?: Logger;
}

export class VertexAIProvider implements LLMProvider {
  readonly name = 'vertex-ai' as const;
  readonly defaultModel: string;

  private projectId: string;
  private location: string;
  private maxTokens: number;
  private temperature: number;
  private logger: Logger;
  private client: any;
  private model: any;

  constructor(config: VertexAIProviderConfig) {
    this.projectId = config.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
    this.location = config.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.defaultModel = config.model || 'gemini-1.5-pro';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.3;
    this.logger = config.logger || consoleLogger;
  }

  private async getModel(): Promise<any> {
    if (!this.model) {
      // @ts-ignore - @google-cloud/vertexai is an optional runtime dependency (may not be installed)
      const { VertexAI } = await import('@google-cloud/vertexai');

      this.client = new VertexAI({
        project: this.projectId,
        location: this.location,
      });

      this.model = this.client.getGenerativeModel({
        model: this.defaultModel,
      });
    }
    return this.model;
  }

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();

    const model = await this.getModel();

    const systemInstruction = options.systemPrompt
      ? { role: 'system', parts: [{ text: options.systemPrompt }] }
      : undefined;

    const request = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
      ],
      systemInstruction,
      generationConfig: {
        maxOutputTokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? this.temperature,
      },
    };

    const response = await model.generateContent(request);
    const result = response.response;

    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Vertex AI provides usage metadata
    const usageMetadata = result.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      estimatedCost: this.estimateCost(inputTokens, outputTokens),
      model: this.defaultModel,
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
Return ONLY the JSON object, no markdown.`;

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

  estimateCost(inputTokens: number, outputTokens: number): number {
    // Gemini 1.5 Pro pricing
    const model = this.defaultModel;

    if (model.includes('gemini-1.5-pro')) {
      // Under 128k context
      return (inputTokens / 1_000_000) * 1.25 + (outputTokens / 1_000_000) * 5;
    }
    if (model.includes('gemini-1.5-flash')) {
      return (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.3;
    }

    return (inputTokens / 1_000_000) * 1.25 + (outputTokens / 1_000_000) * 5;
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      if (!this.projectId) {
        return { available: false, error: 'GOOGLE_CLOUD_PROJECT not set' };
      }

      const model = await this.getModel();
      // Simple check - try to get model info
      return {
        available: !!model,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
