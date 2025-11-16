import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  propagation
} from "@opentelemetry/api";
const KafkaAttributes = {
  MESSAGING_SYSTEM: "messaging.system",
  MESSAGING_DESTINATION: "messaging.destination",
  MESSAGING_DESTINATION_KIND: "messaging.destination_kind",
  MESSAGING_OPERATION: "messaging.operation",
  MESSAGING_KAFKA_MESSAGE_KEY: "messaging.kafka.message_key",
  MESSAGING_KAFKA_PARTITION: "messaging.kafka.partition",
  MESSAGING_KAFKA_OFFSET: "messaging.kafka.offset",
  MESSAGING_KAFKA_TOMBSTONE: "messaging.kafka.tombstone",
  MESSAGING_KAFKA_CLIENT_ID: "messaging.kafka.client_id",
  MESSAGING_KAFKA_CONSUMER_GROUP: "messaging.kafka.consumer.group"
};
const TRACEPARENT_HEADER = "traceparent";
const TRACESTATE_HEADER = "tracestate";
class KafkaProducerTracing {
  constructor(config = {}) {
    this.config = {
      tracerName: config.tracerName || "kafka-producer",
      capturePayloads: config.capturePayloads || false,
      captureKeys: config.captureKeys || true,
      maxPayloadSize: config.maxPayloadSize || 1024
    };
    this.tracer = trace.getTracer(this.config.tracerName);
  }
  /**
   * Instrument a producer.send() call with distributed tracing
   */
  async traceSend(producer, topic, messages, clientId) {
    return this.tracer.startActiveSpan(
      `${topic} send`,
      {
        kind: SpanKind.PRODUCER,
        attributes: {
          [KafkaAttributes.MESSAGING_SYSTEM]: "kafka",
          [KafkaAttributes.MESSAGING_DESTINATION]: topic,
          [KafkaAttributes.MESSAGING_DESTINATION_KIND]: "topic",
          [KafkaAttributes.MESSAGING_OPERATION]: "send",
          [KafkaAttributes.MESSAGING_KAFKA_CLIENT_ID]: clientId || "unknown",
          "messaging.batch.message_count": messages.length
        }
      },
      async (span) => {
        try {
          const instrumentedMessages = messages.map((msg) => {
            const headers = msg.headers || {};
            propagation.inject(context.active(), headers, {
              set: (carrier, key, value) => {
                carrier[key] = value;
              }
            });
            if (this.config.captureKeys && msg.key) {
              span.setAttribute(
                KafkaAttributes.MESSAGING_KAFKA_MESSAGE_KEY,
                msg.key.toString()
              );
            }
            if (this.config.capturePayloads && msg.value) {
              const payload = msg.value.toString();
              const truncated = payload.length > this.config.maxPayloadSize ? payload.substring(0, this.config.maxPayloadSize) + "..." : payload;
              span.setAttribute("messaging.message.payload", truncated);
            }
            return { ...msg, headers };
          });
          const result = await producer.send({
            topic,
            messages: instrumentedMessages
          });
          span.setStatus({ code: SpanStatusCode.OK });
          result.forEach((metadata, index) => {
            span.addEvent("message.sent", {
              [KafkaAttributes.MESSAGING_KAFKA_PARTITION]: metadata.partition,
              [KafkaAttributes.MESSAGING_KAFKA_OFFSET]: metadata.offset?.toString() || "unknown",
              "message.index": index
            });
          });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error)
          });
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}
class KafkaConsumerTracing {
  constructor(config = {}) {
    this.config = {
      tracerName: config.tracerName || "kafka-consumer",
      capturePayloads: config.capturePayloads || false,
      captureKeys: config.captureKeys || true,
      maxPayloadSize: config.maxPayloadSize || 1024
    };
    this.tracer = trace.getTracer(this.config.tracerName);
  }
  /**
   * Instrument a message consumption with distributed tracing
   */
  async traceMessage(topic, partition, message, consumerGroup, handler) {
    const parentContext = propagation.extract(
      context.active(),
      message.headers || {},
      {
        get: (carrier, key) => {
          const value = carrier[key];
          return Array.isArray(value) ? value[0]?.toString() : value?.toString();
        },
        keys: (carrier) => Object.keys(carrier)
      }
    );
    return this.tracer.startActiveSpan(
      `${topic} receive`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          [KafkaAttributes.MESSAGING_SYSTEM]: "kafka",
          [KafkaAttributes.MESSAGING_DESTINATION]: topic,
          [KafkaAttributes.MESSAGING_DESTINATION_KIND]: "topic",
          [KafkaAttributes.MESSAGING_OPERATION]: "receive",
          [KafkaAttributes.MESSAGING_KAFKA_PARTITION]: partition,
          [KafkaAttributes.MESSAGING_KAFKA_OFFSET]: message.offset,
          [KafkaAttributes.MESSAGING_KAFKA_CONSUMER_GROUP]: consumerGroup,
          [KafkaAttributes.MESSAGING_KAFKA_TOMBSTONE]: message.value === null
        }
      },
      parentContext,
      async (span) => {
        try {
          if (this.config.captureKeys && message.key) {
            span.setAttribute(
              KafkaAttributes.MESSAGING_KAFKA_MESSAGE_KEY,
              message.key.toString()
            );
          }
          if (this.config.capturePayloads && message.value) {
            const payload = message.value.toString();
            const truncated = payload.length > this.config.maxPayloadSize ? payload.substring(0, this.config.maxPayloadSize) + "..." : payload;
            span.setAttribute("messaging.message.payload", truncated);
          }
          const result = await handler(context.active());
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error)
          });
          span.recordException(error);
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
  createProcessingSpan(name, operation, callback) {
    return this.tracer.startActiveSpan(
      name,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "operation.name": operation
        }
      },
      async (span) => {
        try {
          const result = await callback(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error)
          });
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}
var opentelemetry_kafka_default = {
  KafkaProducerTracing,
  KafkaConsumerTracing,
  KafkaAttributes
};
export {
  KafkaAttributes,
  KafkaConsumerTracing,
  KafkaProducerTracing,
  opentelemetry_kafka_default as default
};
