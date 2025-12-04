# Kafka Streams Application Example

**Real-time stream processing with windowing and aggregations**

Demonstrates Kafka Streams DSL for stateful processing.

## Features

- **Windowed Aggregations** - Count events per user in 5-minute windows
- **Stream-Table Joins** - Enrich events with user data
- **Stateful Processing** - Maintain aggregated state
- **RocksDB State Store** - Persistent local state

## Run

```bash
npm install
npm run streams
```

## Use Cases

- Real-time analytics
- User behavior tracking
- Fraud detection
- IoT data aggregation

## Documentation

See [Advanced Usage Guide](../../.specweave/docs/public/guides/kafka-advanced-usage.md#kafka-streams-applications)
