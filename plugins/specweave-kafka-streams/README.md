# specweave-kafka-streams

**Kafka Streams Library Integration Plugin for SpecWeave**

Stream processing with Java/Kotlin using Kafka Streams library - topology patterns, state management, windowing, joins, and testing frameworks.

## Features

### 🚀 Core Capabilities

- **Topology Design**: KStream, KTable, GlobalKTable abstractions
- **Stream Operations**: Filter, map, flatMap, branch, merge
- **Joins**: Stream-Stream, Stream-Table, Table-Table, Stream-GlobalKTable
- **Windowing**: Tumbling, hopping, session, sliding windows
- **State Stores**: Key-value, window, session stores
- **Exactly-Once Semantics**: EOS v2 for reliable processing
- **Testing**: Topology Test Driver for unit testing

### 📚 Skills (1)

- `kafka-streams-topology` - Topology design, KStream/KTable, joins, windowing, exactly-once semantics

### 🤖 Agents (0)

*Agents coming in future releases*

### ⚡ Commands (0)

*Commands coming in future releases*

## Installation

### Prerequisites

- Java 11+ or Kotlin 1.5+
- Apache Kafka 2.8+ cluster
- Gradle or Maven build tool

### Install Plugin

```bash
# Via SpecWeave marketplace
specweave plugin install specweave-kafka-streams

# Or via Claude Code plugin system
/plugin install specweave-kafka-streams
```

## Quick Start

### 1. Basic Kafka Streams Application

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;

public class WordCountApp {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Input stream
        KStream<String, String> text = builder.stream("text-input");

        // Word count topology
        KTable<String, Long> wordCounts = text
            .flatMapValues(value -> Arrays.asList(value.toLowerCase().split("\\s+")))
            .groupBy((key, word) -> word)
            .count(Materialized.as("word-counts"));

        // Output stream
        wordCounts.toStream().to("word-counts-output");

        // Start streams
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "word-count-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
    }
}
```

### 2. Stream-Table Join (Event Enrichment)

```java
// Users table (current state)
KTable<Long, User> users = builder.table("users");

// Click events
KStream<Long, ClickEvent> clicks = builder.stream("clicks");

// Enrich clicks with user data
KStream<Long, EnrichedClick> enriched = clicks.leftJoin(
    users,
    (click, user) -> new EnrichedClick(
        click.getPage(),
        user != null ? user.getName() : "unknown",
        user != null ? user.getEmail() : "unknown"
    )
);

enriched.to("enriched-clicks");
```

### 3. Windowed Aggregation

```java
// Count clicks per user, per 5-minute window
KTable<Windowed<Long>, Long> clickCounts = clicks
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count(Materialized.as("click-counts"));

// Convert to stream for output
clickCounts.toStream()
    .map((windowedKey, count) -> {
        Long userId = windowedKey.key();
        Instant start = windowedKey.window().startTime();
        return KeyValue.pair(userId, new WindowedCount(userId, start, count));
    })
    .to("click-counts-output");
```

## Architecture

### Topology Patterns

**Filter and Transform**:
```java
KStream<Long, Event> filtered = events
    .filter((key, value) -> value.isValid())
    .mapValues(value -> value.toUpperCase());
```

**Branch by Condition**:
```java
Map<String, KStream<Long, Order>> branches = orders
    .split(Named.as("order-"))
    .branch((k, v) -> v.getTotal() > 1000, Branched.as("high"))
    .branch((k, v) -> v.getTotal() > 100, Branched.as("medium"))
    .defaultBranch(Branched.as("low"));
```

**Stateful Processing**:
```java
KStream<Long, Event> deduplicated = events
    .transformValues(
        () -> new DeduplicationTransformer(),
        "dedup-store"
    );
```

### State Store Types

**Key-Value Store**:
```java
StoreBuilder<KeyValueStore<Long, User>> storeBuilder =
    Stores.keyValueStoreBuilder(
        Stores.persistentKeyValueStore("users-store"),
        Serdes.Long(),
        userSerde
    );
```

**Window Store**:
```java
StoreBuilder<WindowStore<Long, Long>> windowStoreBuilder =
    Stores.windowStoreBuilder(
        Stores.persistentWindowStore("window-store", Duration.ofMinutes(10), Duration.ofMinutes(1), false),
        Serdes.Long(),
        Serdes.Long()
    );
```

**Session Store**:
```java
StoreBuilder<SessionStore<Long, Long>> sessionStoreBuilder =
    Stores.sessionStoreBuilder(
        Stores.persistentSessionStore("session-store", Duration.ofMinutes(30)),
        Serdes.Long(),
        Serdes.Long()
    );
```

## Usage Examples

### Exactly-Once Semantics

```java
Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "my-app");
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

// Enable EOS v2 (recommended)
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG,
    StreamsConfig.EXACTLY_ONCE_V2);

// Commit frequently for low latency
props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 100);

KafkaStreams streams = new KafkaStreams(topology, props);
```

### Interactive Queries

```java
// Materialized store for queries
KTable<Long, Long> counts = events
    .groupByKey()
    .count(Materialized.as("user-counts"));

// Query from REST API
ReadOnlyKeyValueStore<Long, Long> store =
    streams.store(StoreQueryParameters.fromNameAndType(
        "user-counts",
        QueryableStoreTypes.keyValueStore()
    ));

Long count = store.get(userId);
```

### Testing with Topology Test Driver

```java
@Test
public void testWordCount() {
    // Build topology
    StreamsBuilder builder = new StreamsBuilder();
    // ... topology code ...

    // Create test driver
    TopologyTestDriver testDriver = new TopologyTestDriver(
        builder.build(),
        props
    );

    // Input topic
    TestInputTopic<String, String> inputTopic =
        testDriver.createInputTopic(
            "text-input",
            Serdes.String().serializer(),
            Serdes.String().serializer()
        );

    // Output topic
    TestOutputTopic<String, Long> outputTopic =
        testDriver.createOutputTopic(
            "word-counts-output",
            Serdes.String().deserializer(),
            Serdes.Long().deserializer()
        );

    // Send test data
    inputTopic.pipeInput("hello world hello");

    // Assert output
    Map<String, Long> output = outputTopic.readKeyValuesToMap();
    assertEquals(2L, output.get("hello"));
    assertEquals(1L, output.get("world"));

    testDriver.close();
}
```

## Testing

```bash
# Unit tests with Topology Test Driver
./gradlew test

# Integration tests (requires Kafka cluster)
./gradlew integrationTest

# Coverage report
./gradlew jacocoTestReport
```

## Documentation

- **Getting Started**: `.specweave/docs/public/guides/kafka-streams-getting-started.md`
- **Topology Patterns**: `.specweave/docs/public/guides/kafka-streams-patterns.md`
- **State Stores**: `.specweave/docs/public/guides/kafka-streams-state.md`
- **Testing Guide**: `.specweave/docs/public/guides/kafka-streams-testing.md`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Related Plugins

- **specweave-kafka** - Core Kafka plugin (Apache Kafka, producers, consumers)
- **specweave-confluent** - Confluent Cloud features (Schema Registry, ksqlDB)
- **specweave-n8n** - n8n workflow automation with Kafka integration

## License

MIT License - see [LICENSE](../../LICENSE)

## Support

- **Documentation**: https://spec-weave.com/docs/plugins/kafka-streams
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Status**: ✅ Production Ready
