/**
 * OpenTelemetry Instrumentation for Apache Kafka
 *
 * Provides distributed tracing and metrics for Kafka producers and consumers
 * following OpenTelemetry semantic conventions.
 *
 * @module opentelemetry-kafka
 */

import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  Span,
  Context,
  propagation,
} from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { Producer, Consumer, Message, RecordMetadata } from 'kafkajs';

// Kafka-specific semantic attributes (following OTel conventions)
export const KafkaAttributes = {
  MESSAGING_SYSTEM: 'messaging.system',
  MESSAGING_DESTINATION: 'messaging.destination',
  MESSAGING_DESTINATION_KIND: 'messaging.destination_kind',
  MESSAGING_OPERATION: 'messaging.operation',
  MESSAGING_KAFKA_MESSAGE_KEY: 'messaging.kafka.message_key',
  MESSAGING_KAFKA_PARTITION: 'messaging.kafka.partition',
  MESSAGING_KAFKA_OFFSET: 'messaging.kafka.offset',
  MESSAGING_KAFKA_TOMBSTONE: 'messaging.kafka.tombstone',
  MESSAGING_KAFKA_CLIENT_ID: 'messaging.kafka.client_id',
  MESSAGING_KAFKA_CONSUMER_GROUP: 'messaging.kafka.consumer.group',
} as const;

// Trace context header keys
const TRACEPARENT_HEADER = 'traceparent';
const TRACESTATE_HEADER = 'tracestate';

export interface KafkaTracingConfig {
  /** Tracer name (default: 'kafka') */
  tracerName?: string;
  /** Whether to capture message payloads in spans (default: false for security) */
  capturePayloads?: boolean;
  /** Whether to capture message keys in spans (default: true) */
  captureKeys?: boolean;
  /** Max payload size to capture in bytes (default: 1024) */
  maxPayloadSize?: number;
}

/**
 * OpenTelemetry instrumentation for Kafka Producer
 */
export class KafkaProducerTracing {
  private tracer: ReturnType<typeof trace.getTracer>;
  private config: Required<KafkaTracingConfig>;

  constructor(config: KafkaTracingConfig = {}) {
    this.config = {
      tracerName: config.tracerName || 'kafka-producer',
      capturePayloads: config.capturePayloads || false,
      captureKeys: config.captureKeys || true,
      maxPayloadSize: config.maxPayloadSize || 1024,
    };
    this.tracer = trace.getTracer(this.config.tracerName);
  }

  /**
   * Instrument a producer.send() call with distributed tracing
   */
  async traceSend(
    producer: Producer,
    topic: string,
    messages: Message[],
    clientId?: string
  ): Promise<RecordMetadata[]> {
    // Create producer span
    return this.tracer.startActiveSpan(
      `${topic} send`,
      {
        kind: SpanKind.PRODUCER,
        attributes: {
          [KafkaAttributes.MESSAGING_SYSTEM]: 'kafka',
          [KafkaAttributes.MESSAGING_DESTINATION]: topic,
          [KafkaAttributes.MESSAGING_DESTINATION_KIND]: 'topic',
          [KafkaAttributes.MESSAGING_OPERATION]: 'send',
          [KafkaAttributes.MESSAGING_KAFKA_CLIENT_ID]: clientId || 'unknown',
          'messaging.batch.message_count': messages.length,
        },
      },
      async (span: Span) => {
        try {
          // Inject trace context into message headers
          const instrumentedMessages = messages.map((msg) => {
            const headers = msg.headers || {};

            // Inject trace context (W3C Trace Context propagation)
            propagation.inject(context.active(), headers, {
              set: (carrier, key, value) => {
                carrier[key] = value;
              },
            });

            // Add span attributes
            if (this.config.captureKeys && msg.key) {
              span.setAttribute(
                KafkaAttributes.MESSAGING_KAFKA_MESSAGE_KEY,
                msg.key.toString()
              );
            }

            if (this.config.capturePayloads && msg.value) {
              const payload = msg.value.toString();
              const truncated = payload.length > this.config.maxPayloadSize
                ? payload.substring(0, this.config.maxPayloadSize) + '...'
                : payload;
              span.setAttribute('messaging.message.payload', truncated);
            }

            return { ...msg, headers };
          });

          // Send messages
          const result = await producer.send({
            topic,
            messages: instrumentedMessages,
          });

          // Record success
          span.setStatus({ code: SpanStatusCode.OK });

          // Add result attributes
          result.forEach((metadata, index) => {
            span.addEvent('message.sent', {
              [KafkaAttributes.MESSAGING_KAFKA_PARTITION]: metadata.partition,
              [KafkaAttributes.MESSAGING_KAFKA_OFFSET]: metadata.offset?.toString() || 'unknown',
              'message.index': index,
            });
          });

          return result;
        } catch (error) {
          // Record error
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}

/**
 * OpenTelemetry instrumentation for Kafka Consumer
 */
export class KafkaConsumerTracing {
  private tracer: ReturnType<typeof trace.getTracer>;
  private config: Required<KafkaTracingConfig>;

  constructor(config: KafkaTracingConfig = {}) {
    this.config = {
      tracerName: config.tracerName || 'kafka-consumer',
      capturePayloads: config.capturePayloads || false,
      captureKeys: config.captureKeys || true,
      maxPayloadSize: config.maxPayloadSize || 1024,
    };
    this.tracer = trace.getTracer(this.config.tracerName);
  }

  /**
   * Instrument a message consumption with distributed tracing
   */
  async traceMessage<T>(
    topic: string,
    partition: number,
    message: Message,
    consumerGroup: string,
    handler: (ctx: Context) => Promise<T>
  ): Promise<T> {
    // Extract trace context from message headers
    const parentContext = propagation.extract(
      context.active(),
      message.headers || {},
      {
        get: (carrier, key) => {
          const value = carrier[key];
          return Array.isArray(value) ? value[0]?.toString() : value?.toString();
        },
        keys: (carrier) => Object.keys(carrier),
      }
    );

    // Create consumer span (child of producer span via trace context)
    return this.tracer.startActiveSpan(
      `${topic} receive`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          [KafkaAttributes.MESSAGING_SYSTEM]: 'kafka',
          [KafkaAttributes.MESSAGING_DESTINATION]: topic,
          [KafkaAttributes.MESSAGING_DESTINATION_KIND]: 'topic',
          [KafkaAttributes.MESSAGING_OPERATION]: 'receive',
          [KafkaAttributes.MESSAGING_KAFKA_PARTITION]: partition,
          [KafkaAttributes.MESSAGING_KAFKA_OFFSET]: message.offset,
          [KafkaAttributes.MESSAGING_KAFKA_CONSUMER_GROUP]: consumerGroup,
          [KafkaAttributes.MESSAGING_KAFKA_TOMBSTONE]: message.value === null,
        },
      },
      parentContext,
      async (span: Span) => {
        try {
          // Add message attributes
          if (this.config.captureKeys && message.key) {
            span.setAttribute(
              KafkaAttributes.MESSAGING_KAFKA_MESSAGE_KEY,
              message.key.toString()
            );
          }

          if (this.config.capturePayloads && message.value) {
            const payload = message.value.toString();
            const truncated = payload.length > this.config.maxPayloadSize
              ? payload.substring(0, this.config.maxPayloadSize) + '...'
              : payload;
            span.setAttribute('messaging.message.payload', truncated);
          }

          // Execute handler with active span context
          const result = await handler(context.active());

          // Record success
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Record error
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Create a processing span for custom operations within message handler
   */
  createProcessingSpan<T>(
    name: string,
    operation: string,
    callback: (span: Span) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'operation.name': operation,
        },
      },
      async (span: Span) => {
        try {
          const result = await callback(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}

/**
 * Example Usage: Producer
 *
 * ```typescript
 * import { KafkaProducerTracing } from './opentelemetry-kafka';
 *
 * const producerTracing = new KafkaProducerTracing({
 *   tracerName: 'my-kafka-producer',
 *   capturePayloads: false, // Don't capture sensitive data
 *   captureKeys: true,
 * });
 *
 * // Send with tracing
 * await producerTracing.traceSend(
 *   producer,
 *   'orders',
 *   [
 *     { key: 'order-123', value: JSON.stringify({ id: 123, total: 99.99 }) }
 *   ],
 *   'order-producer'
 * );
 * ```
 */

/**
 * Example Usage: Consumer
 *
 * ```typescript
 * import { KafkaConsumerTracing } from './opentelemetry-kafka';
 *
 * const consumerTracing = new KafkaConsumerTracing({
 *   tracerName: 'my-kafka-consumer',
 *   capturePayloads: false,
 * });
 *
 * await consumer.run({
 *   eachMessage: async ({ topic, partition, message }) => {
 *     // Automatic trace context extraction and span creation
 *     await consumerTracing.traceMessage(
 *       topic,
 *       partition,
 *       message,
 *       'my-consumer-group',
 *       async (ctx) => {
 *         // Your message processing logic here
 *         const order = JSON.parse(message.value.toString());
 *
 *         // Create child span for database operation
 *         await consumerTracing.createProcessingSpan(
 *           'save-order-to-db',
 *           'database.insert',
 *           async (span) => {
 *             span.setAttribute('db.operation', 'INSERT');
 *             span.setAttribute('db.table', 'orders');
 *             await db.insert(order);
 *           }
 *         );
 *       }
 *     );
 *   },
 * });
 * ```
 */

export default {
  KafkaProducerTracing,
  KafkaConsumerTracing,
  KafkaAttributes,
};
