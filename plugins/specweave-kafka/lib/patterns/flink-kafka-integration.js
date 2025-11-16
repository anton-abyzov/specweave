class FlinkTableAPIGenerator {
  /**
   * Generate Kafka source table DDL
   */
  static generateSourceTableDDL(config) {
    const schemaFields = config.schema.map((field) => `  ${field.name} ${field.type}`).join(",\n");
    const watermarkClause = config.watermark ? `,
  WATERMARK FOR ${config.watermark.columnName} AS ${config.watermark.columnName} - INTERVAL '${config.watermark.delaySeconds}' SECOND` : "";
    const scanStartup = config.scanStartupMode || "earliest-offset";
    return `
-- Kafka Source Table (Flink Table API)
CREATE TABLE ${config.tableName} (
${schemaFields}${watermarkClause}
) WITH (
  'connector' = 'kafka',
  'topic' = '${config.topic}',
  'properties.bootstrap.servers' = '${config.bootstrapServers.join(",")}',
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
  static generateSinkTableDDL(config) {
    const schemaFields = config.schema.map((field) => `  ${field.name} ${field.type}`).join(",\n");
    const partitionClause = config.partitionBy ? `,
  'sink.partitioner' = 'round-robin'
  -- Alternative: 'fixed' (based on key), 'custom'` : "";
    const deliveryGuarantee = config.deliveryGuarantee || "at-least-once";
    return `
-- Kafka Sink Table (Flink Table API)
CREATE TABLE ${config.tableName} (
${schemaFields}
) WITH (
  'connector' = 'kafka',
  'topic' = '${config.topic}',
  'properties.bootstrap.servers' = '${config.bootstrapServers.join(",")}',
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
  static generateWindowedAggregation(options) {
    const groupKeys = options.groupByKeys.join(", ");
    const aggFields = options.aggregations.map((agg) => `${agg.func}(${agg.column}) AS ${agg.alias}`).join(",\n  ");
    let windowClause;
    if (options.windowType === "tumbling") {
      windowClause = `TUMBLE(event_time, INTERVAL '${options.windowSize}')`;
    } else if (options.windowType === "hopping") {
      windowClause = `HOP(event_time, INTERVAL '${options.slideInterval}', INTERVAL '${options.windowSize}')`;
    } else {
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
  static generateStreamJoin(options) {
    const selectClause = options.selectFields.join(",\n  ");
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
  static generateTemporalJoin(options) {
    const selectClause = options.selectFields.join(",\n  ");
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
class FlinkDataStreamGenerator {
  /**
   * Generate Kafka source (Scala)
   */
  static generateKafkaSource(config) {
    return `
// Kafka Source (Flink DataStream API - Scala)
import org.apache.flink.api.common.eventtime.WatermarkStrategy
import org.apache.flink.connector.kafka.source.KafkaSource
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer

val kafkaSource = KafkaSource.builder[String]()
  .setBootstrapServers("${config.bootstrapServers.join(",")}")
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
  static generateKafkaSink(config) {
    const exactlyOnce = config.checkpointing?.mode === "EXACTLY_ONCE";
    return `
// Kafka Sink (Flink DataStream API - Scala)
import org.apache.flink.connector.kafka.sink.{KafkaRecordSerializationSchema, KafkaSink}
import org.apache.flink.api.common.serialization.SimpleStringSchema

val kafkaSink = KafkaSink.builder[String]()
  .setBootstrapServers("${config.bootstrapServers.join(",")}")
  .setRecordSerializer(
    KafkaRecordSerializationSchema.builder()
      .setTopic("${config.sinkTopic}")
      .setValueSerializationSchema(new SimpleStringSchema())
      .build()
  )
  ${exactlyOnce ? `.setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)` : ""}
  ${exactlyOnce ? `.setTransactionalIdPrefix("flink-kafka-sink")` : ""}
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
  static generateStatefulProcessing() {
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
  static generateCheckpointingConfig(config) {
    if (!config.checkpointing?.enabled) {
      return "// Checkpointing disabled";
    }
    const mode = config.checkpointing.mode === "EXACTLY_ONCE" ? "CheckpointingMode.EXACTLY_ONCE" : "CheckpointingMode.AT_LEAST_ONCE";
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
var flink_kafka_integration_default = {
  FlinkTableAPIGenerator,
  FlinkDataStreamGenerator
};
export {
  FlinkDataStreamGenerator,
  FlinkTableAPIGenerator,
  flink_kafka_integration_default as default
};
