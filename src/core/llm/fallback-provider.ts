/**
 * Fallback Provider
 *
 * Generic wrapper that implements LLMProvider by trying a primary provider first,
 * then falling back to a secondary provider on failure.
 *
 * Not Workers AI specific — works with any two providers.
 */

import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from './types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

export class FallbackProvider implements LLMProvider {
  get name() { return this.primary.name; }
  get defaultModel() { return this.primary.defaultModel; }

  private primary: LLMProvider;
  private fallback: LLMProvider;
  private logger: Logger;

  constructor(primary: LLMProvider, fallback: LLMProvider, logger?: Logger) {
    this.primary = primary;
    this.fallback = fallback;
    this.logger = logger || consoleLogger;
  }

  async analyze(prompt: string, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    try {
      return await this.primary.analyze(prompt, options);
    } catch (err: any) {
      this.logger.warn(
        `Primary provider (${this.primary.name}) failed: ${err.message}. Trying fallback (${this.fallback.name}).`
      );
      const result = await this.fallback.analyze(prompt, options);
      return { ...result, wasRetry: true };
    }
  }

  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    try {
      return await this.primary.analyzeStructured(prompt, options);
    } catch (err: any) {
      this.logger.warn(
        `Primary provider (${this.primary.name}) structured analysis failed: ${err.message}. Trying fallback.`
      );
      return await this.fallback.analyzeStructured(prompt, options);
    }
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    return this.primary.estimateCost(inputTokens, outputTokens, model);
  }

  async isAvailable(): Promise<boolean> {
    const primaryAvailable = await this.primary.isAvailable();
    if (primaryAvailable) return true;
    return await this.fallback.isAvailable();
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const primaryStatus = await this.primary.getStatus();
    if (primaryStatus.available) return primaryStatus;
    return await this.fallback.getStatus();
  }
}
