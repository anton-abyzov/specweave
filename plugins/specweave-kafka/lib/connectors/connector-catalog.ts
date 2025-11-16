/**
 * Kafka Connect Connector Catalog
 *
 * Comprehensive collection of source and sink connectors with configuration templates
 *
 * @module connector-catalog
 */

/**
 * Connector Categories
 */
export enum ConnectorCategory {
  DATABASE = 'database',
  CLOUD_STORAGE = 'cloud-storage',
  MESSAGE_QUEUE = 'message-queue',
  DATA_WAREHOUSE = 'data-warehouse',
  SEARCH = 'search',
  MONITORING = 'monitoring',
  FILE_SYSTEM = 'file-system',
}

/**
 * Connector Configuration
 */
export interface ConnectorConfig {
  /** Connector name */
  name: string;
  /** Connector class */
  'connector.class': string;
  /** Max tasks */
  'tasks.max': string;
  /** Additional properties */
  [key: string]: any;
}

/**
 * Kafka Connect Connector Catalog
 *
 * Pre-configured connectors for common integrations
 */
export class ConnectorCatalog {
  /**
   * JDBC Source Connector (Database → Kafka)
   *
   * Use case: Stream database tables to Kafka (CDC alternative)
   */
  static jdbcSource(options: {
    connectionUrl: string;
    user: string;
    password: string;
    tableName: string;
    mode: 'bulk' | 'incrementing' | 'timestamp' | 'timestamp+incrementing';
    incrementingColumn?: string;
    timestampColumn?: string;
    topicPrefix: string;
  }): ConnectorConfig {
    const config: ConnectorConfig = {
      name: `jdbc-source-${options.tableName}`,
      'connector.class': 'io.confluent.connect.jdbc.JdbcSourceConnector',
      'tasks.max': '1',
      'connection.url': options.connectionUrl,
      'connection.user': options.user,
      'connection.password': options.password,
      'table.whitelist': options.tableName,
      'mode': options.mode,
      'topic.prefix': options.topicPrefix,
      'poll.interval.ms': '5000',
    };

    if (options.mode === 'incrementing' && options.incrementingColumn) {
      config['incrementing.column.name'] = options.incrementingColumn;
    }

    if (
      (options.mode === 'timestamp' || options.mode === 'timestamp+incrementing') &&
      options.timestampColumn
    ) {
      config['timestamp.column.name'] = options.timestampColumn;
    }

    return config;
  }

  /**
   * JDBC Sink Connector (Kafka → Database)
   *
   * Use case: Write Kafka events to database tables
   */
  static jdbcSink(options: {
    connectionUrl: string;
    user: string;
    password: string;
    topics: string[];
    autoCreate?: boolean;
    autoEvolve?: boolean;
    insertMode?: 'insert' | 'upsert' | 'update';
    pkMode?: 'none' | 'kafka' | 'record_key' | 'record_value';
    pkFields?: string[];
  }): ConnectorConfig {
    return {
      name: `jdbc-sink-${options.topics.join('-')}`,
      'connector.class': 'io.confluent.connect.jdbc.JdbcSinkConnector',
      'tasks.max': '1',
      'connection.url': options.connectionUrl,
      'connection.user': options.user,
      'connection.password': options.password,
      'topics': options.topics.join(','),
      'auto.create': options.autoCreate !== false ? 'true' : 'false',
      'auto.evolve': options.autoEvolve !== false ? 'true' : 'false',
      'insert.mode': options.insertMode || 'insert',
      'pk.mode': options.pkMode || 'none',
      'pk.fields': options.pkFields?.join(',') || '',
    };
  }

  /**
   * Debezium MySQL Source Connector (CDC)
   *
   * Use case: Capture all database changes in real-time
   */
  static debeziumMySQL(options: {
    hostname: string;
    port: number;
    user: string;
    password: string;
    databaseName: string;
    serverId: number;
    serverName: string;
    tableIncludeList?: string;
  }): ConnectorConfig {
    return {
      name: `debezium-mysql-${options.databaseName}`,
      'connector.class': 'io.debezium.connector.mysql.MySqlConnector',
      'tasks.max': '1',
      'database.hostname': options.hostname,
      'database.port': options.port.toString(),
      'database.user': options.user,
      'database.password': options.password,
      'database.server.id': options.serverId.toString(),
      'database.server.name': options.serverName,
      'database.include.list': options.databaseName,
      'table.include.list': options.tableIncludeList || `${options.databaseName}.*`,
      'database.history.kafka.bootstrap.servers': 'localhost:9092',
      'database.history.kafka.topic': `dbhistory.${options.databaseName}`,
    };
  }

  /**
   * Debezium PostgreSQL Source Connector (CDC)
   */
  static debeziumPostgreSQL(options: {
    hostname: string;
    port: number;
    user: string;
    password: string;
    databaseName: string;
    serverName: string;
    slotName: string;
    publicationName: string;
  }): ConnectorConfig {
    return {
      name: `debezium-postgres-${options.databaseName}`,
      'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
      'tasks.max': '1',
      'database.hostname': options.hostname,
      'database.port': options.port.toString(),
      'database.user': options.user,
      'database.password': options.password,
      'database.dbname': options.databaseName,
      'database.server.name': options.serverName,
      'slot.name': options.slotName,
      'publication.name': options.publicationName,
      'plugin.name': 'pgoutput',
    };
  }

  /**
   * S3 Sink Connector (Kafka → AWS S3)
   *
   * Use case: Archive Kafka data to S3 for analytics
   */
  static s3Sink(options: {
    topics: string[];
    s3BucketName: string;
    s3Region: string;
    format: 'json' | 'avro' | 'parquet';
    flushSize?: number;
    rotateIntervalMs?: number;
    partitionerClass?: string;
  }): ConnectorConfig {
    const formatClass =
      options.format === 'avro'
        ? 'io.confluent.connect.s3.format.avro.AvroFormat'
        : options.format === 'parquet'
        ? 'io.confluent.connect.s3.format.parquet.ParquetFormat'
        : 'io.confluent.connect.s3.format.json.JsonFormat';

    return {
      name: `s3-sink-${options.topics.join('-')}`,
      'connector.class': 'io.confluent.connect.s3.S3SinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      's3.bucket.name': options.s3BucketName,
      's3.region': options.s3Region,
      'format.class': formatClass,
      'flush.size': (options.flushSize || 1000).toString(),
      'rotate.interval.ms': (options.rotateIntervalMs || 3600000).toString(),
      'partitioner.class': options.partitionerClass || 'io.confluent.connect.storage.partitioner.TimeBasedPartitioner',
      'path.format': "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
      'locale': 'en-US',
      'timezone': 'UTC',
      'timestamp.extractor': 'Record',
    };
  }

  /**
   * Elasticsearch Sink Connector (Kafka → Elasticsearch)
   *
   * Use case: Index Kafka data for full-text search
   */
  static elasticsearchSink(options: {
    topics: string[];
    connectionUrl: string;
    indexName?: string;
    typeName?: string;
    batchSize?: number;
  }): ConnectorConfig {
    return {
      name: `elasticsearch-sink-${options.topics.join('-')}`,
      'connector.class': 'io.confluent.connect.elasticsearch.ElasticsearchSinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      'connection.url': options.connectionUrl,
      'type.name': options.typeName || '_doc',
      'key.ignore': 'true',
      'schema.ignore': 'false',
      'batch.size': (options.batchSize || 2000).toString(),
      'max.buffered.records': '20000',
      'linger.ms': '1000',
      'flush.timeout.ms': '10000',
      'max.in.flight.requests': '5',
      'retry.backoff.ms': '100',
      'max.retries': '10',
    };
  }

  /**
   * MongoDB Sink Connector (Kafka → MongoDB)
   *
   * Use case: Write Kafka events to MongoDB collections
   */
  static mongodbSink(options: {
    topics: string[];
    connectionUri: string;
    databaseName: string;
    collectionName?: string;
  }): ConnectorConfig {
    return {
      name: `mongodb-sink-${options.topics.join('-')}`,
      'connector.class': 'com.mongodb.kafka.connect.MongoSinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      'connection.uri': options.connectionUri,
      'database': options.databaseName,
      'collection': options.collectionName || 'kafka_data',
      'max.num.retries': '3',
      'retries.defer.timeout': '5000',
    };
  }

  /**
   * HTTP Sink Connector (Kafka → REST API)
   *
   * Use case: Send Kafka events to external APIs
   */
  static httpSink(options: {
    topics: string[];
    httpApiUrl: string;
    httpMethod?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    batchSize?: number;
  }): ConnectorConfig {
    const config: ConnectorConfig = {
      name: `http-sink-${options.topics.join('-')}`,
      'connector.class': 'io.confluent.connect.http.HttpSinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      'http.api.url': options.httpApiUrl,
      'request.method': options.httpMethod || 'POST',
      'batch.max.size': (options.batchSize || 10).toString(),
      'retry.on.status.codes': '500-599',
      'max.retries': '3',
      'retry.backoff.ms': '1000',
    };

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value], index) => {
        config[`headers.${index}.name`] = key;
        config[`headers.${index}.value`] = value;
      });
    }

    return config;
  }

  /**
   * HDFS Sink Connector (Kafka → Hadoop HDFS)
   *
   * Use case: Archive Kafka data to Hadoop for batch processing
   */
  static hdfsSink(options: {
    topics: string[];
    hdfsUrl: string;
    format: 'avro' | 'parquet' | 'json';
    flushSize?: number;
    rotateIntervalMs?: number;
  }): ConnectorConfig {
    const formatClass =
      options.format === 'avro'
        ? 'io.confluent.connect.hdfs.avro.AvroFormat'
        : options.format === 'parquet'
        ? 'io.confluent.connect.hdfs.parquet.ParquetFormat'
        : 'io.confluent.connect.hdfs.json.JsonFormat';

    return {
      name: `hdfs-sink-${options.topics.join('-')}`,
      'connector.class': 'io.confluent.connect.hdfs.HdfsSinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      'hdfs.url': options.hdfsUrl,
      'format.class': formatClass,
      'flush.size': (options.flushSize || 1000).toString(),
      'rotate.interval.ms': (options.rotateIntervalMs || 3600000).toString(),
      'partitioner.class': 'io.confluent.connect.storage.partitioner.TimeBasedPartitioner',
      'path.format': "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
      'locale': 'en-US',
      'timezone': 'UTC',
    };
  }

  /**
   * Snowflake Sink Connector (Kafka → Snowflake)
   *
   * Use case: Stream Kafka data to Snowflake data warehouse
   */
  static snowflakeSink(options: {
    topics: string[];
    snowflakeUrl: string;
    snowflakeUser: string;
    snowflakePrivateKey: string;
    snowflakeDatabase: string;
    snowflakeSchema: string;
  }): ConnectorConfig {
    return {
      name: `snowflake-sink-${options.topics.join('-')}`,
      'connector.class': 'com.snowflake.kafka.connector.SnowflakeSinkConnector',
      'tasks.max': '8',
      'topics': options.topics.join(','),
      'snowflake.url.name': options.snowflakeUrl,
      'snowflake.user.name': options.snowflakeUser,
      'snowflake.private.key': options.snowflakePrivateKey,
      'snowflake.database.name': options.snowflakeDatabase,
      'snowflake.schema.name': options.snowflakeSchema,
      'buffer.count.records': '10000',
      'buffer.flush.time': '60',
      'buffer.size.bytes': '5000000',
    };
  }

  /**
   * BigQuery Sink Connector (Kafka → Google BigQuery)
   *
   * Use case: Stream Kafka data to BigQuery for analytics
   */
  static bigQuerySink(options: {
    topics: string[];
    projectId: string;
    datasetName: string;
    autoCreateTables?: boolean;
  }): ConnectorConfig {
    return {
      name: `bigquery-sink-${options.topics.join('-')}`,
      'connector.class': 'com.wepay.kafka.connect.bigquery.BigQuerySinkConnector',
      'tasks.max': '1',
      'topics': options.topics.join(','),
      'project': options.projectId,
      'defaultDataset': options.datasetName,
      'autoCreateTables': options.autoCreateTables !== false ? 'true' : 'false',
      'autoUpdateSchemas': 'true',
      'sanitizeTopics': 'true',
      'allowNewBigQueryFields': 'true',
      'allowBigQueryRequiredFieldRelaxation': 'true',
    };
  }
}

/**
 * Connector Management Utilities
 */
export class ConnectorManager {
  /**
   * Deploy connector via REST API
   */
  static async deployConnector(
    connectUrl: string,
    config: ConnectorConfig
  ): Promise<void> {
    const response = await fetch(`${connectUrl}/connectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: config.name, config }),
    });

    if (!response.ok) {
      throw new Error(`Failed to deploy connector: ${await response.text()}`);
    }

    console.log(`✅ Connector deployed: ${config.name}`);
  }

  /**
   * List all connectors
   */
  static async listConnectors(connectUrl: string): Promise<string[]> {
    const response = await fetch(`${connectUrl}/connectors`);
    return response.json();
  }

  /**
   * Get connector status
   */
  static async getConnectorStatus(
    connectUrl: string,
    connectorName: string
  ): Promise<any> {
    const response = await fetch(`${connectUrl}/connectors/${connectorName}/status`);
    return response.json();
  }

  /**
   * Delete connector
   */
  static async deleteConnector(
    connectUrl: string,
    connectorName: string
  ): Promise<void> {
    await fetch(`${connectUrl}/connectors/${connectorName}`, {
      method: 'DELETE',
    });
    console.log(`✅ Connector deleted: ${connectorName}`);
  }
}

/**
 * Example Usage: JDBC Source
 *
 * ```typescript
 * const jdbcSource = ConnectorCatalog.jdbcSource({
 *   connectionUrl: 'jdbc:postgresql://localhost:5432/mydb',
 *   user: 'postgres',
 *   password: 'password',
 *   tableName: 'users',
 *   mode: 'timestamp',
 *   timestampColumn: 'updated_at',
 *   topicPrefix: 'db-',
 * });
 *
 * await ConnectorManager.deployConnector('http://localhost:8083', jdbcSource);
 * ```
 */

/**
 * Example Usage: Debezium CDC
 *
 * ```typescript
 * const debezium = ConnectorCatalog.debeziumMySQL({
 *   hostname: 'mysql.example.com',
 *   port: 3306,
 *   user: 'debezium',
 *   password: 'dbz',
 *   databaseName: 'inventory',
 *   serverId: 12345,
 *   serverName: 'mysql-server',
 *   tableIncludeList: 'inventory.orders,inventory.customers',
 * });
 * ```
 */

/**
 * Connector Best Practices:
 *
 * **Connector Selection**:
 * - Use Debezium for real-time CDC (captures all changes)
 * - Use JDBC for bulk snapshots (initial load)
 * - Use S3/HDFS for long-term archival
 * - Use Elasticsearch for search/analytics
 *
 * **Performance Tuning**:
 * - tasks.max: Set to partition count for parallelism
 * - batch.size: Increase for higher throughput (1000-10000)
 * - flush.size: Balance between latency and throughput
 * - max.poll.records: 500 default, increase for large batches
 *
 * **Error Handling**:
 * - errors.tolerance: none (default, fail fast) vs all (skip bad records)
 * - errors.deadletterqueue.topic.name: Route bad records to DLQ
 * - max.retries: 3-10 for transient failures
 * - retry.backoff.ms: Exponential backoff (100-1000ms)
 *
 * **Monitoring**:
 * - Connector status (RUNNING, FAILED, PAUSED)
 * - Task status (per-task monitoring)
 * - Lag (source connectors)
 * - Throughput (records/sec)
 * - Error count
 *
 * **Security**:
 * - Use secrets management (HashiCorp Vault, AWS Secrets Manager)
 * - Never commit credentials to version control
 * - Use service accounts with minimal permissions
 * - Enable SSL/TLS for database connections
 */

export default {
  ConnectorCatalog,
  ConnectorManager,
  ConnectorCategory,
};
