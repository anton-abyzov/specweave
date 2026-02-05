---
description: Deploy and manage Kafka Connect source and sink connectors with configuration templates and deployment scripts.
---

# Kafka Connect Connector Deployment

Deploy and manage Kafka Connect connectors (Source/Sink).

## Task

You are an expert in Kafka Connect. Help users deploy source and sink connectors.

### Steps:

1. **Ask for Requirements**:
   - Connector type: Source or Sink
   - Connector class (JDBC, S3, Elasticsearch, etc.)
   - Connection details
   - Topic configuration

2. **Generate Connector Configuration**:

#### JDBC Source Connector (PostgreSQL):
```json
{
  "name": "postgres-source-connector",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "tasks.max": "1",
    "connection.url": "jdbc:postgresql://localhost:5432/mydb",
    "connection.user": "postgres",
    "connection.password": "${file:/secrets.properties:db-password}",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "postgres-",
    "table.whitelist": "users,orders",
    "poll.interval.ms": "5000",
    "batch.max.rows": "1000",
    "transforms": "createKey,extractInt",
    "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.createKey.fields": "id",
    "transforms.extractInt.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
    "transforms.extractInt.field": "id"
  }
}
```

#### Elasticsearch Sink Connector:
```json
{
  "name": "elasticsearch-sink-connector",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "2",
    "topics": "users,orders",
    "connection.url": "http://elasticsearch:9200",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",
    "behavior.on.null.values": "delete",
    "behavior.on.malformed.documents": "warn",
    "max.buffered.records": "20000",
    "batch.size": "2000",
    "linger.ms": "1000",
    "max.in.flight.requests": "5",
    "retry.backoff.ms": "100",
    "max.retries": "10"
  }
}
```

#### S3 Sink Connector:
```json
{
  "name": "s3-sink-connector",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "3",
    "topics": "events",
    "s3.bucket.name": "my-kafka-bucket",
    "s3.region": "us-east-1",
    "s3.part.size": "5242880",
    "flush.size": "1000",
    "rotate.interval.ms": "3600000",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "3600000",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "locale": "en-US",
    "timezone": "UTC"
  }
}
```

3. **Generate Deployment Scripts**:

#### Using REST API:
```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @connector-config.json
```

#### Using Confluent CLI:
```bash
confluent connect create \
  --config connector-config.json
```

#### Check Status:
```bash
curl http://localhost:8083/connectors/postgres-source-connector/status

# Expected response:
{
  "name": "postgres-source-connector",
  "connector": {"state": "RUNNING", "worker_id": "connect:8083"},
  "tasks": [{"id": 0, "state": "RUNNING", "worker_id": "connect:8083"}]
}
```

4. **Generate Monitoring Queries**:
```bash
# List all connectors
curl http://localhost:8083/connectors

# Get connector config
curl http://localhost:8083/connectors/postgres-source-connector/config

# Get connector metrics
curl http://localhost:8083/connectors/postgres-source-connector/status

# Restart connector
curl -X POST http://localhost:8083/connectors/postgres-source-connector/restart

# Pause connector
curl -X PUT http://localhost:8083/connectors/postgres-source-connector/pause

# Resume connector
curl -X PUT http://localhost:8083/connectors/postgres-source-connector/resume
```

5. **Best Practices**:
- Use secret management for credentials
- Configure appropriate error handling
- Set up monitoring and alerting
- Use SMT (Single Message Transforms) for data transformation
- Configure dead letter queues
- Set appropriate batch sizes and flush intervals
- Use time-based partitioning for sinks

### Example Usage:

```
User: "Deploy PostgreSQL source connector for users table"
Result: Complete connector config + deployment scripts
```
