/**
 * Apache Flink + Kafka Integration
 *
 * Flink SQL, Kafka connectors, stateful processing, and exactly-once semantics
 *
 * @module flink-kafka-integration
 */

/**
 * Flink Table API Source Configuration
 */
export interface FlinkKafkaSourceConfig {
  /** Source table name */
  tableName: string;
  /** Kafka topic name */
  topic: string;
  /** Kafka bootstrap servers */
  bootstrapServers: string[];
  /** Consumer group ID */
  groupId: string;
  /** Format (json, avro, csv) */
  format: 'json' | 'avro' | 'csv' | 'protobuf';
  /** Schema fields */
  schema: Array<{ name: string; type: string }>;
  /** Watermark strategy */
  watermark?: {
    columnName: string;
    delaySeconds: number;
  };
  /** Scan startup mode */
  scanStartupMode?: 'earliest-offset' | 'latest-offset' | 'timestamp' | 'specific-offsets';
}

/**
 * Flink Table API Sink Configuration
 */
export interface FlinkKafkaSinkConfig {
  /** Sink table name */
  tableName: string;
  /** Kafka topic name */
  topic: string;
  /** Kafka bootstrap servers */
  bootstrapServers: string[];
  /** Format (json, avro, csv) */
  format: 'json' | 'avro' | 'csv' | 'protobuf';
  /** Schema fields */
  schema: Array<{ name: string; type: string }>;
  /** Partitioning column */
  partitionBy?: string;
  /** Delivery guarantee */
  deliveryGuarantee?: 'at-least-once' | 'exactly-once' | 'none';
}

/**
 * Flink DataStream API Configuration
 */
export interface FlinkDataStreamConfig {
  /** Source topic */
  sourceTopic: string;
  /** Sink topic */
  sinkTopic: string;
  /** Bootstrap servers */
  bootstrapServers: string[];
  /** Consumer group ID */
  groupId: string;
  /** Enable checkpointing */
  checkpointing?: {
    enabled: boolean;
    intervalMs: number;
    mode: 'EXACTLY_ONCE' | 'AT_LEAST_ONCE';
  };
  /** Parallelism */
  parallelism?: number;
}

/**
 * Flink Table API SQL Generator
 *
 * Generates Flink SQL DDL and queries for Kafka integration
 */
export class FlinkTableAPIGenerator {
  /**
   * Generate Kafka source table DDL
   */
  static generateSourceTableDDL(config: FlinkKafkaSourceConfig): string {
    const schemaFields = config.schema
      .map((field) => `  ${field.name} ${field.type}`)
      .join(',\n');

    const watermarkClause = config.watermark
      ? `,\n  WATERMARK FOR ${config.watermark.columnName} AS ${config.watermark.columnName} - INTERVAL '${config.watermark.delaySeconds}' SECOND`
      : '';

    const scanStartup = config.scanStartupMode || 'earliest-offset';

    return `
-- Kafka Source Table (Flink Table API)
CREATE TABLE ${config.tableName} (
${schemaFields}${watermarkClause}
) WITH (
  'connector' = 'kafka',
  'topic' = '${config.topic}',
  'properties.bootstrap.servers' = '${config.bootstrapServers.join(',')}',
  'properties.group.id' = '${config.groupId}',
  'format' = '${config.format}',
  'scan.startup.mode' = '${scanStartup}'
);

/* Example Query:
 * SELECT * FROM ${config.tableName} WHERE amount > 100;
 */
`.trim();
  }

  /**
   * Generate Kafka sink table DDL
   */
  static generateSinkTableDDL(config: FlinkKafkaSinkConfig): string {
    const schemaFields = config.schema
      .map((field) => `  ${field.name} ${field.type}`)
      .join(',\n');

    const partitionClause = config.partitionBy
      ? `,\n  'sink.partitioner' = 'round-robin'\n  -- Alternative: 'fixed' (based on key), 'custom'`
      : '';

    const deliveryGuarantee = config.deliveryGuarantee || 'at-least-once';

    return `
-- Kafka Sink Table (Flink Table API)
CREATE TABLE ${config.tableName} (
${schemaFields}
) WITH (
  'connector' = 'kafka',
  'topic' = '${config.topic}',
  'properties.bootstrap.servers' = '${config.bootstrapServers.join(',')}',
  'format' = '${config.format}',
  'sink.delivery-guarantee' = '${deliveryGuarantee}'${partitionClause}
);

/* Example Insert:
 * INSERT INTO ${config.tableName}
 * SELECT user_id, SUM(amount) AS total_amount
 * FROM source_table
 * GROUP BY user_id;
 */
`.trim();
  }

  /**
   * Generate windowed aggregation query
   */
  static generateWindowedAggregation(options: {
    sourceTable: string;
    sinkTable: string;
    groupByKeys: string[];
    aggregations: Array<{ func: string; column: string; alias: string }>;
    windowType: 'tumbling' | 'hopping' | 'session';
    windowSize: string; // e.g., "5 MINUTES", "1 HOUR"
    slideInterval?: string; // For hopping windows
    sessionGap?: string; // For session windows
  }): string {
    const groupKeys = options.groupByKeys.join(', ');
    const aggFields = options.aggregations
      .map((agg) => `${agg.func}(${agg.column}) AS ${agg.alias}`)
      .join(',\n  ');

    let windowClause: string;
    if (options.windowType === 'tumbling') {
      windowClause = `TUMBLE(event_time, INTERVAL '${options.windowSize}')`;
    } else if (options.windowType === 'hopping') {
      windowClause = `HOP(event_time, INTERVAL '${options.slideInterval}', INTERVAL '${options.windowSize}')`;
    } else {
      // session
      windowClause = `SESSION(event_time, INTERVAL '${options.sessionGap}')`;
    }

    return `
-- Windowed Aggregation (Flink SQL)
INSERT INTO ${options.sinkTable}
SELECT
  ${groupKeys},
  TUMBLE_START(event_time, INTERVAL '${options.windowSize}') AS window_start,
  TUMBLE_END(event_time, INTERVAL '${options.windowSize}') AS window_end,
  ${aggFields}
FROM ${options.sourceTable}
GROUP BY
  ${windowClause},
  ${groupKeys};

/* Window Types:
 * - TUMBLE: Non-overlapping, fixed-size windows (hourly totals)
 * - HOP: Overlapping, sliding windows (anomaly detection)
 * - SESSION: Gap-based windows (user sessions)
 */
`.trim();
  }

  /**
   * Generate stream-stream join query
   */
  static generateStreamJoin(options: {
    leftTable: string;
    rightTable: string;
    joinKey: string;
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    windowSize: string;
    sinkTable: string;
    selectFields: string[];
  }): string {
    const selectClause = options.selectFields.join(',\n  ');

    return `
-- Stream-Stream Join (Flink SQL)
INSERT INTO ${options.sinkTable}
SELECT
  ${selectClause}
FROM ${options.leftTable} L
${options.joinType} JOIN ${options.rightTable} R
  ON L.${options.joinKey} = R.${options.joinKey}
  AND L.event_time BETWEEN R.event_time - INTERVAL '${options.windowSize}' AND R.event_time + INTERVAL '${options.windowSize}';

/* Example Use Case:
 * Left: clicks (user_id, page, event_time)
 * Right: purchases (user_id, product, event_time)
 * Join: Match clicks within 30 minutes of purchase
 */
`.trim();
  }

  /**
   * Generate temporal table join (lookup join)
   */
  static generateTemporalJoin(options: {
    streamTable: string;
    lookupTable: string;
    joinKey: string;
    sinkTable: string;
    selectFields: string[];
  }): string {
    const selectClause = options.selectFields.join(',\n  ');

    return `
-- Temporal Table Join (Lookup Join)
INSERT INTO ${options.sinkTable}
SELECT
  ${selectClause}
FROM ${options.streamTable} S
LEFT JOIN ${options.lookupTable} FOR SYSTEM_TIME AS OF S.event_time AS L
  ON S.${options.joinKey} = L.${options.joinKey};

/* Example Use Case:
 * Stream: orders (order_id, user_id, event_time)
 * Lookup: user_profiles (user_id, name, tier)
 * Result: Enriched orders with user metadata (point-in-time)
 *
 * Note: Lookup table must be backed by changelog (compacted Kafka topic)
 */
`.trim();
  }
}

/**
 * Flink DataStream API Code Generator
 *
 * Generates Scala/Java code for DataStream API
 */
export class FlinkDataStreamGenerator {
  /**
   * Generate Kafka source (Scala)
   */
  static generateKafkaSource(config: FlinkDataStreamConfig): string {
    return `
// Kafka Source (Flink DataStream API - Scala)
import org.apache.flink.api.common.eventtime.WatermarkStrategy
import org.apache.flink.connector.kafka.source.KafkaSource
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer

val kafkaSource = KafkaSource.builder[String]()
  .setBootstrapServers("${config.bootstrapServers.join(',')}")
  .setTopics("${config.sourceTopic}")
  .setGroupId("${config.groupId}")
  .setStartingOffsets(OffsetsInitializer.earliest())
  .setValueOnlyDeserializer(new SimpleStringSchema())
  .build()

val stream = env.fromSource(
  kafkaSource,
  WatermarkStrategy.noWatermarks(),
  "Kafka Source"
)

/* Alternative Deserializers:
 * - JSONKeyValueDeserializationSchema (JSON)
 * - ConfluentRegistryAvroDeserializationSchema (Avro + Schema Registry)
 * - ProtobufDeserializationSchema (Protobuf)
 */
`.trim();
  }

  /**
   * Generate Kafka sink (Scala)
   */
  static generateKafkaSink(config: FlinkDataStreamConfig): string {
    const exactlyOnce = config.checkpointing?.mode === 'EXACTLY_ONCE';

    return `
// Kafka Sink (Flink DataStream API - Scala)
import org.apache.flink.connector.kafka.sink.{KafkaRecordSerializationSchema, KafkaSink}
import org.apache.flink.api.common.serialization.SimpleStringSchema

val kafkaSink = KafkaSink.builder[String]()
  .setBootstrapServers("${config.bootstrapServers.join(',')}")
  .setRecordSerializer(
    KafkaRecordSerializationSchema.builder()
      .setTopic("${config.sinkTopic}")
      .setValueSerializationSchema(new SimpleStringSchema())
      .build()
  )
  ${exactlyOnce ? `.setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)` : ''}
  ${exactlyOnce ? `.setTransactionalIdPrefix("flink-kafka-sink")` : ''}
  .build()

stream
  .map(record => processRecord(record))
  .sinkTo(kafkaSink)

/* Exactly-Once Semantics:
 * - Requires Kafka 0.11+
 * - Requires checkpointing enabled
 * - Uses Kafka transactions
 * - Transactional ID prefix must be unique per job
 */
`.trim();
  }

  /**
   * Generate stateful processing with managed state
   */
  static generateStatefulProcessing(): string {
    return `
// Stateful Processing (Flink DataStream API - Scala)
import org.apache.flink.api.common.state.{ValueState, ValueStateDescriptor}
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.util.Collector

class StatefulAggregator extends KeyedProcessFunction[String, Event, AggregatedEvent] {

  // Managed state (automatically checkpointed)
  lazy val sumState: ValueState[Double] = getRuntimeContext.getState(
    new ValueStateDescriptor[Double]("sum", classOf[Double])
  )

  lazy val countState: ValueState[Long] = getRuntimeContext.getState(
    new ValueStateDescriptor[Long]("count", classOf[Long])
  )

  override def processElement(
    value: Event,
    ctx: KeyedProcessFunction[String, Event, AggregatedEvent]#Context,
    out: Collector[AggregatedEvent]
  ): Unit = {

    // Read current state
    val currentSum = Option(sumState.value()).getOrElse(0.0)
    val currentCount = Option(countState.value()).getOrElse(0L)

    // Update state
    val newSum = currentSum + value.amount
    val newCount = currentCount + 1
    sumState.update(newSum)
    countState.update(newCount)

    // Emit aggregated result
    out.collect(AggregatedEvent(
      key = value.userId,
      sum = newSum,
      count = newCount,
      avg = newSum / newCount
    ))
  }
}

// Usage
stream
  .keyBy(_.userId)
  .process(new StatefulAggregator())

/* State Backend Options:
 * - MemoryStateBackend (development only)
 * - FsStateBackend (medium state, S3/HDFS)
 * - RocksDBStateBackend (large state, disk-based)
 */
`.trim();
  }

  /**
   * Generate checkpointing configuration
   */
  static generateCheckpointingConfig(config: FlinkDataStreamConfig): string {
    if (!config.checkpointing?.enabled) {
      return '// Checkpointing disabled';
    }

    const mode = config.checkpointing.mode === 'EXACTLY_ONCE'
      ? 'CheckpointingMode.EXACTLY_ONCE'
      : 'CheckpointingMode.AT_LEAST_ONCE';

    return `
// Checkpointing Configuration
import org.apache.flink.streaming.api.CheckpointingMode
import org.apache.flink.runtime.state.filesystem.FsStateBackend

val env = StreamExecutionEnvironment.getExecutionEnvironment

// Enable checkpointing
env.enableCheckpointing(${config.checkpointing.intervalMs}) // Checkpoint interval in ms

// Checkpointing mode
env.getCheckpointConfig.setCheckpointingMode(${mode})

// Checkpoint storage (S3)
env.setStateBackend(new FsStateBackend("s3://my-bucket/checkpoints"))

// Advanced settings
env.getCheckpointConfig.setMinPauseBetweenCheckpoints(500) // Min pause between checkpoints
env.getCheckpointConfig.setCheckpointTimeout(60000) // Checkpoint timeout (60s)
env.getCheckpointConfig.setMaxConcurrentCheckpoints(1) // Max concurrent checkpoints

// Enable externalized checkpoints (survive job cancellation)
env.getCheckpointConfig.enableExternalizedCheckpoints(
  ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION
)

/* State Backend Comparison:
 * - MemoryStateBackend: Fast, limited by heap size, dev only
 * - FsStateBackend: Medium state (< 100GB), async snapshots
 * - RocksDBStateBackend: Large state (TBs), disk-based, slower
 */
`.trim();
  }
}

/**
 * Example Usage: Flink Table API
 *
 * ```typescript
 * const sourceConfig: FlinkKafkaSourceConfig = {
 *   tableName: 'orders',
 *   topic: 'orders-topic',
 *   bootstrapServers: ['localhost:9092'],
 *   groupId: 'flink-consumer',
 *   format: 'json',
 *   schema: [
 *     { name: 'order_id', type: 'BIGINT' },
 *     { name: 'user_id', type: 'STRING' },
 *     { name: 'amount', type: 'DECIMAL(10, 2)' },
 *     { name: 'event_time', type: 'TIMESTAMP(3)' },
 *   ],
 *   watermark: {
 *     columnName: 'event_time',
 *     delaySeconds: 5,
 *   },
 * };
 *
 * const ddl = FlinkTableAPIGenerator.generateSourceTableDDL(sourceConfig);
 * console.log(ddl);
 * ```
 */

/**
 * Example Usage: Windowed Aggregation
 *
 * ```typescript
 * const aggQuery = FlinkTableAPIGenerator.generateWindowedAggregation({
 *   sourceTable: 'orders',
 *   sinkTable: 'hourly_revenue',
 *   groupByKeys: ['user_id'],
 *   aggregations: [
 *     { func: 'COUNT', column: '*', alias: 'order_count' },
 *     { func: 'SUM', column: 'amount', alias: 'total_revenue' },
 *   ],
 *   windowType: 'tumbling',
 *   windowSize: '1 HOUR',
 * });
 * console.log(aggQuery);
 * ```
 */

/**
 * Example Usage: DataStream API
 *
 * ```typescript
 * const dataStreamConfig: FlinkDataStreamConfig = {
 *   sourceTopic: 'input-topic',
 *   sinkTopic: 'output-topic',
 *   bootstrapServers: ['localhost:9092'],
 *   groupId: 'flink-datastream',
 *   checkpointing: {
 *     enabled: true,
 *     intervalMs: 60000,
 *     mode: 'EXACTLY_ONCE',
 *   },
 *   parallelism: 4,
 * };
 *
 * const sourceCode = FlinkDataStreamGenerator.generateKafkaSource(dataStreamConfig);
 * const sinkCode = FlinkDataStreamGenerator.generateKafkaSink(dataStreamConfig);
 * const checkpointCode = FlinkDataStreamGenerator.generateCheckpointingConfig(dataStreamConfig);
 * ```
 */

/**
 * Flink + Kafka Best Practices:
 *
 * **Table API vs DataStream API**:
 * - Table API: SQL-like, easier to learn, less flexible
 * - DataStream API: Full control, stateful processing, more complex
 * - Recommendation: Start with Table API, use DataStream for custom logic
 *
 * **Exactly-Once Semantics**:
 * - Requires Kafka 0.11+ (transactional producer)
 * - Requires checkpointing enabled
 * - Use RocksDBStateBackend for large state
 * - Monitor checkpoint duration (target: < 10% of interval)
 *
 * **Watermarking**:
 * - Watermark delay: Balance between completeness and latency
 * - Bounded out-of-orderness: 5-30 seconds typical
 * - Use allowedLateness for late events
 * - Monitor watermark lag metrics
 *
 * **State Backend Selection**:
 * - State < 100MB: MemoryStateBackend (dev only)
 * - State 100MB-100GB: FsStateBackend (async snapshots)
 * - State > 100GB: RocksDBStateBackend (incremental checkpoints)
 *
 * **Performance Tuning**:
 * - Set parallelism = Kafka partition count (optimal)
 * - Increase checkpoint interval for high throughput (1-5 minutes)
 * - Use async I/O for external lookups
 * - Enable object reuse for memory efficiency
 *
 * **Kafka Connector Settings**:
 * - scan.startup.mode: earliest-offset (recovery), latest-offset (production)
 * - properties.max.poll.records: 500 (default), increase for batch processing
 * - properties.fetch.min.bytes: 1MB+ for high throughput
 * - sink.delivery-guarantee: exactly-once (preferred) or at-least-once
 *
 * **Monitoring**:
 * - Checkpoint duration and size
 * - Watermark lag (event time vs processing time)
 * - Consumer lag (Kafka metrics)
 * - State size growth
 * - Backpressure (buffer utilization)
 */

export default {
  FlinkTableAPIGenerator,
  FlinkDataStreamGenerator,
};
