/**
 * SpendRecord type and SpendEmitter
 *
 * Foundation for multi-model spend tracking. SpendRecord captures per-request
 * cost data across all LLM providers. SpendEmitter is a singleton EventEmitter
 * that decouples tracking from persistence and alerting.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

/**
 * Unified spend record for any LLM provider request
 */
export interface SpendRecord {
  /** Unique record ID (UUID v4) */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Provider identifier */
  provider: string;
  /** Full model ID */
  model: string;
  /** Input token count */
  input_tokens: number;
  /** Output token count */
  output_tokens: number;
  /** Cached input tokens read (discount pricing) */
  cached_tokens: number;
  /** Cache write tokens (surcharge pricing) */
  cache_write_tokens: number;
  /** Reasoning/thinking tokens */
  reasoning_tokens: number;
  /** Calculated cost in USD */
  cost_usd: number;
  /** How cost was determined */
  cost_source: 'calculated' | 'api_reported' | 'unknown' | 'local';
  /** SpecWeave project name */
  project?: string;
  /** Increment ID if in increment context */
  increment_id?: string;
  /** Session identifier */
  session_id?: string;
  /** Request duration in milliseconds */
  duration_ms?: number;
}

/**
 * Input for creating a SpendRecord (required fields + optional overrides)
 */
export interface SpendRecordInput {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  cache_write_tokens?: number;
  reasoning_tokens?: number;
  cost_usd: number;
  cost_source: SpendRecord['cost_source'];
  project?: string;
  increment_id?: string;
  session_id?: string;
  duration_ms?: number;
}

/**
 * Create a SpendRecord with generated ID and timestamp
 */
export function createSpendRecord(input: SpendRecordInput): SpendRecord {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    provider: input.provider,
    model: input.model,
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
    cached_tokens: input.cached_tokens ?? 0,
    cache_write_tokens: input.cache_write_tokens ?? 0,
    reasoning_tokens: input.reasoning_tokens ?? 0,
    cost_usd: input.cost_usd,
    cost_source: input.cost_source,
    project: input.project,
    increment_id: input.increment_id,
    session_id: input.session_id,
    duration_ms: input.duration_ms,
  };
}

/**
 * Singleton EventEmitter for spend tracking events.
 * Decouples spend record creation from persistence and alerting.
 */
export class SpendEmitter extends EventEmitter {
  private static instance: SpendEmitter;

  private constructor() {
    super();
    this.setMaxListeners(20);
  }

  static getInstance(): SpendEmitter {
    if (!SpendEmitter.instance) {
      SpendEmitter.instance = new SpendEmitter();
    }
    return SpendEmitter.instance;
  }

  /** Type-safe emit for spend events */
  emitSpend(record: SpendRecord): boolean {
    return this.emit('spend', record);
  }

  /** Type-safe listener registration */
  onSpend(listener: (record: SpendRecord) => void): this {
    return this.on('spend', listener);
  }

  /** Type-safe listener removal */
  offSpend(listener: (record: SpendRecord) => void): this {
    return this.off('spend', listener);
  }
}
