var ConnectorCategory = /* @__PURE__ */ ((ConnectorCategory2) => {
  ConnectorCategory2["DATABASE"] = "database";
  ConnectorCategory2["CLOUD_STORAGE"] = "cloud-storage";
  ConnectorCategory2["MESSAGE_QUEUE"] = "message-queue";
  ConnectorCategory2["DATA_WAREHOUSE"] = "data-warehouse";
  ConnectorCategory2["SEARCH"] = "search";
  ConnectorCategory2["MONITORING"] = "monitoring";
  ConnectorCategory2["FILE_SYSTEM"] = "file-system";
  return ConnectorCategory2;
})(ConnectorCategory || {});
class ConnectorCatalog {
  /**
   * JDBC Source Connector (Database → Kafka)
   *
   * Use case: Stream database tables to Kafka (CDC alternative)
   */
  static jdbcSource(options) {
    const config = {
      name: `jdbc-source-${options.tableName}`,
      "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
      "tasks.max": "1",
      "connection.url": options.connectionUrl,
      "connection.user": options.user,
      "connection.password": options.password,
      "table.whitelist": options.tableName,
      "mode": options.mode,
      "topic.prefix": options.topicPrefix,
      "poll.interval.ms": "5000"
    };
    if (options.mode === "incrementing" && options.incrementingColumn) {
      config["incrementing.column.name"] = options.incrementingColumn;
    }
    if ((options.mode === "timestamp" || options.mode === "timestamp+incrementing") && options.timestampColumn) {
      config["timestamp.column.name"] = options.timestampColumn;
    }
    return config;
  }
  /**
   * JDBC Sink Connector (Kafka → Database)
   *
   * Use case: Write Kafka events to database tables
   */
  static jdbcSink(options) {
    return {
      name: `jdbc-sink-${options.topics.join("-")}`,
      "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
      "tasks.max": "1",
      "connection.url": options.connectionUrl,
      "connection.user": options.user,
      "connection.password": options.password,
      "topics": options.topics.join(","),
      "auto.create": options.autoCreate !== false ? "true" : "false",
      "auto.evolve": options.autoEvolve !== false ? "true" : "false",
      "insert.mode": options.insertMode || "insert",
      "pk.mode": options.pkMode || "none",
      "pk.fields": options.pkFields?.join(",") || ""
    };
  }
  /**
   * Debezium MySQL Source Connector (CDC)
   *
   * Use case: Capture all database changes in real-time
   */
  static debeziumMySQL(options) {
    return {
      name: `debezium-mysql-${options.databaseName}`,
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "tasks.max": "1",
      "database.hostname": options.hostname,
      "database.port": options.port.toString(),
      "database.user": options.user,
      "database.password": options.password,
      "database.server.id": options.serverId.toString(),
      "database.server.name": options.serverName,
      "database.include.list": options.databaseName,
      "table.include.list": options.tableIncludeList || `${options.databaseName}.*`,
      "database.history.kafka.bootstrap.servers": "localhost:9092",
      "database.history.kafka.topic": `dbhistory.${options.databaseName}`
    };
  }
  /**
   * Debezium PostgreSQL Source Connector (CDC)
   */
  static debeziumPostgreSQL(options) {
    return {
      name: `debezium-postgres-${options.databaseName}`,
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "tasks.max": "1",
      "database.hostname": options.hostname,
      "database.port": options.port.toString(),
      "database.user": options.user,
      "database.password": options.password,
      "database.dbname": options.databaseName,
      "database.server.name": options.serverName,
      "slot.name": options.slotName,
      "publication.name": options.publicationName,
      "plugin.name": "pgoutput"
    };
  }
  /**
   * S3 Sink Connector (Kafka → AWS S3)
   *
   * Use case: Archive Kafka data to S3 for analytics
   */
  static s3Sink(options) {
    const formatClass = options.format === "avro" ? "io.confluent.connect.s3.format.avro.AvroFormat" : options.format === "parquet" ? "io.confluent.connect.s3.format.parquet.ParquetFormat" : "io.confluent.connect.s3.format.json.JsonFormat";
    return {
      name: `s3-sink-${options.topics.join("-")}`,
      "connector.class": "io.confluent.connect.s3.S3SinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "s3.bucket.name": options.s3BucketName,
      "s3.region": options.s3Region,
      "format.class": formatClass,
      "flush.size": (options.flushSize || 1e3).toString(),
      "rotate.interval.ms": (options.rotateIntervalMs || 36e5).toString(),
      "partitioner.class": options.partitionerClass || "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
      "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
      "locale": "en-US",
      "timezone": "UTC",
      "timestamp.extractor": "Record"
    };
  }
  /**
   * Elasticsearch Sink Connector (Kafka → Elasticsearch)
   *
   * Use case: Index Kafka data for full-text search
   */
  static elasticsearchSink(options) {
    return {
      name: `elasticsearch-sink-${options.topics.join("-")}`,
      "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "connection.url": options.connectionUrl,
      "type.name": options.typeName || "_doc",
      "key.ignore": "true",
      "schema.ignore": "false",
      "batch.size": (options.batchSize || 2e3).toString(),
      "max.buffered.records": "20000",
      "linger.ms": "1000",
      "flush.timeout.ms": "10000",
      "max.in.flight.requests": "5",
      "retry.backoff.ms": "100",
      "max.retries": "10"
    };
  }
  /**
   * MongoDB Sink Connector (Kafka → MongoDB)
   *
   * Use case: Write Kafka events to MongoDB collections
   */
  static mongodbSink(options) {
    return {
      name: `mongodb-sink-${options.topics.join("-")}`,
      "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "connection.uri": options.connectionUri,
      "database": options.databaseName,
      "collection": options.collectionName || "kafka_data",
      "max.num.retries": "3",
      "retries.defer.timeout": "5000"
    };
  }
  /**
   * HTTP Sink Connector (Kafka → REST API)
   *
   * Use case: Send Kafka events to external APIs
   */
  static httpSink(options) {
    const config = {
      name: `http-sink-${options.topics.join("-")}`,
      "connector.class": "io.confluent.connect.http.HttpSinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "http.api.url": options.httpApiUrl,
      "request.method": options.httpMethod || "POST",
      "batch.max.size": (options.batchSize || 10).toString(),
      "retry.on.status.codes": "500-599",
      "max.retries": "3",
      "retry.backoff.ms": "1000"
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
  static hdfsSink(options) {
    const formatClass = options.format === "avro" ? "io.confluent.connect.hdfs.avro.AvroFormat" : options.format === "parquet" ? "io.confluent.connect.hdfs.parquet.ParquetFormat" : "io.confluent.connect.hdfs.json.JsonFormat";
    return {
      name: `hdfs-sink-${options.topics.join("-")}`,
      "connector.class": "io.confluent.connect.hdfs.HdfsSinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "hdfs.url": options.hdfsUrl,
      "format.class": formatClass,
      "flush.size": (options.flushSize || 1e3).toString(),
      "rotate.interval.ms": (options.rotateIntervalMs || 36e5).toString(),
      "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
      "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
      "locale": "en-US",
      "timezone": "UTC"
    };
  }
  /**
   * Snowflake Sink Connector (Kafka → Snowflake)
   *
   * Use case: Stream Kafka data to Snowflake data warehouse
   */
  static snowflakeSink(options) {
    return {
      name: `snowflake-sink-${options.topics.join("-")}`,
      "connector.class": "com.snowflake.kafka.connector.SnowflakeSinkConnector",
      "tasks.max": "8",
      "topics": options.topics.join(","),
      "snowflake.url.name": options.snowflakeUrl,
      "snowflake.user.name": options.snowflakeUser,
      "snowflake.private.key": options.snowflakePrivateKey,
      "snowflake.database.name": options.snowflakeDatabase,
      "snowflake.schema.name": options.snowflakeSchema,
      "buffer.count.records": "10000",
      "buffer.flush.time": "60",
      "buffer.size.bytes": "5000000"
    };
  }
  /**
   * BigQuery Sink Connector (Kafka → Google BigQuery)
   *
   * Use case: Stream Kafka data to BigQuery for analytics
   */
  static bigQuerySink(options) {
    return {
      name: `bigquery-sink-${options.topics.join("-")}`,
      "connector.class": "com.wepay.kafka.connect.bigquery.BigQuerySinkConnector",
      "tasks.max": "1",
      "topics": options.topics.join(","),
      "project": options.projectId,
      "defaultDataset": options.datasetName,
      "autoCreateTables": options.autoCreateTables !== false ? "true" : "false",
      "autoUpdateSchemas": "true",
      "sanitizeTopics": "true",
      "allowNewBigQueryFields": "true",
      "allowBigQueryRequiredFieldRelaxation": "true"
    };
  }
}
class ConnectorManager {
  /**
   * Deploy connector via REST API
   */
  static async deployConnector(connectUrl, config) {
    const response = await fetch(`${connectUrl}/connectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: config.name, config })
    });
    if (!response.ok) {
      throw new Error(`Failed to deploy connector: ${await response.text()}`);
    }
    console.log(`\u2705 Connector deployed: ${config.name}`);
  }
  /**
   * List all connectors
   */
  static async listConnectors(connectUrl) {
    const response = await fetch(`${connectUrl}/connectors`);
    return response.json();
  }
  /**
   * Get connector status
   */
  static async getConnectorStatus(connectUrl, connectorName) {
    const response = await fetch(`${connectUrl}/connectors/${connectorName}/status`);
    return response.json();
  }
  /**
   * Delete connector
   */
  static async deleteConnector(connectUrl, connectorName) {
    await fetch(`${connectUrl}/connectors/${connectorName}`, {
      method: "DELETE"
    });
    console.log(`\u2705 Connector deleted: ${connectorName}`);
  }
}
var connector_catalog_default = {
  ConnectorCatalog,
  ConnectorManager,
  ConnectorCategory
};
export {
  ConnectorCatalog,
  ConnectorCategory,
  ConnectorManager,
  connector_catalog_default as default
};
