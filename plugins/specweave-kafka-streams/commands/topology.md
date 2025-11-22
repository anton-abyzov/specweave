---
name: specweave-kafka-streams:topology
description: Generate Kafka Streams topology code (Java/Kotlin) with KStream/KTable patterns. Creates stream processing applications with windowing, joins, state stores, and exactly-once semantics.
---

# Generate Kafka Streams Topology

Create production-ready Kafka Streams applications with best practices baked in.

## What This Command Does

1. **Select Pattern**: Choose topology pattern (word count, enrichment, aggregation, etc.)
2. **Configure Topics**: Input/output topics and schemas
3. **Define Operations**: Filter, map, join, aggregate, window
4. **Generate Code**: Java or Kotlin implementation
5. **Add Tests**: Topology Test Driver unit tests
6. **Build Configuration**: Gradle/Maven, dependencies, configs

## Available Patterns

### Pattern 1: Stream Processing (Filter + Transform)
**Use Case**: Data cleansing and transformation

**Topology**:
```java
KStream<String, Event> events = builder.stream("raw-events");

KStream<String, ProcessedEvent> processed = events
    .filter((key, value) -> value.isValid())
    .mapValues(value -> value.toUpperCase())
    .selectKey((key, value) -> value.getUserId());

processed.to("processed-events");
```

### Pattern 2: Stream-Table Join (Enrichment)
**Use Case**: Enrich events with reference data

**Topology**:
```java
// Users table (changelog stream)
KTable<Long, User> users = builder.table("users");

// Click events
KStream<Long, ClickEvent> clicks = builder.stream("clicks");

// Enrich clicks with user data
KStream<Long, EnrichedClick> enriched = clicks.leftJoin(
    users,
    (click, user) -> new EnrichedClick(
        click.getPage(),
        user != null ? user.getName() : "unknown",
        click.getTimestamp()
    )
);

enriched.to("enriched-clicks");
```

### Pattern 3: Windowed Aggregation
**Use Case**: Time-based metrics (counts, sums, averages)

**Topology**:
```java
KTable<Windowed<String>, Long> counts = events
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count(Materialized.as("event-counts"));

counts.toStream()
    .map((windowedKey, count) -> {
        String key = windowedKey.key();
        Instant start = windowedKey.window().startTime();
        return KeyValue.pair(key, new WindowedCount(key, start, count));
    })
    .to("event-counts-output");
```

### Pattern 4: Stateful Deduplication
**Use Case**: Remove duplicate events within time window

**Topology**:
```java
KStream<String, Event> deduplicated = events
    .transformValues(
        () -> new DeduplicationTransformer(Duration.ofMinutes(10)),
        Materialized.as("dedup-store")
    );

deduplicated.to("unique-events");
```

## Example Usage

```bash
# Generate topology
/specweave-kafka-streams:topology

# I'll ask:
# 1. Language? (Java or Kotlin)
# 2. Pattern? (Filter/Transform, Join, Aggregation, Deduplication)
# 3. Input topic(s)?
# 4. Output topic(s)?
# 5. Windowing? (if aggregation)
# 6. State store? (if stateful)
# 7. Build tool? (Gradle or Maven)

# Then I'll generate:
# - src/main/java/MyApp.java (application code)
# - src/test/java/MyAppTest.java (unit tests)
# - build.gradle or pom.xml
# - application.properties
# - README.md with setup instructions
```

## Generated Files

**1. StreamsApplication.java**: Main topology
```java
package com.example.streams;

import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;

public class StreamsApplication {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "my-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG,
            StreamsConfig.EXACTLY_ONCE_V2);

        StreamsBuilder builder = new StreamsBuilder();

        // Topology code here
        KStream<String, String> input = builder.stream("input-topic");
        KStream<String, String> processed = input
            .filter((key, value) -> value != null)
            .mapValues(value -> value.toUpperCase());
        processed.to("output-topic");

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();

        // Graceful shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

**2. StreamsApplicationTest.java**: Unit tests with Topology Test Driver
```java
package com.example.streams;

import org.apache.kafka.streams.*;
import org.junit.jupiter.api.*;

public class StreamsApplicationTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, String> inputTopic;
    private TestOutputTopic<String, String> outputTopic;

    @BeforeEach
    public void setup() {
        StreamsBuilder builder = new StreamsBuilder();
        // Build topology
        // ...

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");

        testDriver = new TopologyTestDriver(builder.build(), props);
        inputTopic = testDriver.createInputTopic("input-topic",
            Serdes.String().serializer(),
            Serdes.String().serializer());
        outputTopic = testDriver.createOutputTopic("output-topic",
            Serdes.String().deserializer(),
            Serdes.String().deserializer());
    }

    @Test
    public void testTransformation() {
        // Send test data
        inputTopic.pipeInput("key1", "hello");

        // Assert output
        KeyValue<String, String> output = outputTopic.readKeyValue();
        assertEquals("HELLO", output.value);
    }

    @AfterEach
    public void tearDown() {
        testDriver.close();
    }
}
```

**3. build.gradle**: Gradle build configuration
```groovy
plugins {
    id 'java'
    id 'application'
}

group = 'com.example'
version = '1.0.0'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.apache.kafka:kafka-streams:3.6.0'
    implementation 'org.slf4j:slf4j-simple:2.0.9'

    testImplementation 'org.apache.kafka:kafka-streams-test-utils:3.6.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
}

application {
    mainClass = 'com.example.streams.StreamsApplication'
}

test {
    useJUnitPlatform()
}
```

**4. application.properties**: Runtime configuration
```properties
bootstrap.servers=localhost:9092
application.id=my-streams-app
processing.guarantee=exactly_once_v2
commit.interval.ms=100
cache.max.bytes.buffering=10485760
num.stream.threads=2
replication.factor=3
```

**5. README.md**: Setup instructions
```markdown
# Kafka Streams Application

## Build

```bash
# Gradle
./gradlew build

# Maven
mvn clean package
```

## Run

```bash
# Gradle
./gradlew run

# Maven
mvn exec:java
```

## Test

```bash
# Unit tests
./gradlew test

# Integration tests (requires Kafka cluster)
./gradlew integrationTest
```

## Docker

```bash
# Build image
docker build -t my-streams-app .

# Run
docker run -e BOOTSTRAP_SERVERS=kafka:9092 my-streams-app
```
```

## Configuration Options

### Exactly-Once Semantics (EOS v2)
```java
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG,
    StreamsConfig.EXACTLY_ONCE_V2);
```

### Multiple Stream Threads
```java
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4);
```

### State Store Configuration
```java
StoreBuilder<KeyValueStore<String, Long>> storeBuilder =
    Stores.keyValueStoreBuilder(
        Stores.persistentKeyValueStore("my-store"),
        Serdes.String(),
        Serdes.Long()
    )
    .withCachingEnabled()
    .withLoggingEnabled(Map.of("retention.ms", "86400000"));
```

### Custom Serdes
```java
// JSON Serde (using Jackson)
public class JsonSerde<T> implements Serde<T> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Class<T> type;

    public JsonSerde(Class<T> type) {
        this.type = type;
    }

    @Override
    public Serializer<T> serializer() {
        return (topic, data) -> {
            try {
                return mapper.writeValueAsBytes(data);
            } catch (Exception e) {
                throw new SerializationException(e);
            }
        };
    }

    @Override
    public Deserializer<T> deserializer() {
        return (topic, data) -> {
            try {
                return mapper.readValue(data, type);
            } catch (Exception e) {
                throw new SerializationException(e);
            }
        };
    }
}
```

## Testing Strategies

### 1. Unit Tests (Topology Test Driver)
```java
// No Kafka cluster required
TopologyTestDriver testDriver = new TopologyTestDriver(topology, props);
```

### 2. Integration Tests (Embedded Kafka)
```java
@ExtendWith(EmbeddedKafkaExtension.class)
public class IntegrationTest {
    @Test
    public void testWithRealKafka(EmbeddedKafka kafka) {
        // Real Kafka cluster
    }
}
```

### 3. Performance Tests (Load Testing)
```bash
# Generate test load
kafka-producer-perf-test.sh \
  --topic input-topic \
  --num-records 1000000 \
  --throughput 10000 \
  --record-size 1024 \
  --producer-props bootstrap.servers=localhost:9092
```

## Monitoring

### JMX Metrics
```java
// Enable JMX
props.put(StreamsConfig.METRICS_RECORDING_LEVEL_CONFIG, "DEBUG");

// Export to Prometheus
props.put("metric.reporters",
    "io.confluent.metrics.reporter.ConfluentMetricsReporter");
```

### Key Metrics to Monitor
- **Consumer Lag**: `kafka.consumer.fetch.manager.records.lag.max`
- **Processing Rate**: `kafka.streams.stream.task.process.rate`
- **State Store Size**: `kafka.streams.state.store.bytes.total`
- **Rebalance Frequency**: `kafka.streams.consumer.coordinator.rebalance.total`

## Troubleshooting

### Issue 1: Rebalancing Too Frequently
**Solution**: Increase session timeout
```java
props.put(StreamsConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
```

### Issue 2: State Store Too Large
**Solution**: Enable compaction, reduce retention
```java
storeBuilder.withLoggingEnabled(Map.of(
    "cleanup.policy", "compact",
    "retention.ms", "86400000"
));
```

### Issue 3: Slow Processing
**Solution**: Increase parallelism
```java
// More threads
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 8);

// More partitions (requires topic reconfiguration)
kafka-topics.sh --alter --topic input-topic --partitions 8
```

## Related Commands

- `/specweave-kafka:dev-env` - Set up local Kafka cluster for testing
- `/specweave-kafka:monitor-setup` - Configure Prometheus + Grafana monitoring

## Documentation

- **Kafka Streams Docs**: https://kafka.apache.org/documentation/streams/
- **Topology Patterns**: `.specweave/docs/public/guides/kafka-streams-patterns.md`
- **State Stores**: `.specweave/docs/public/guides/kafka-streams-state.md`
- **Testing Guide**: `.specweave/docs/public/guides/kafka-streams-testing.md`

---

**Plugin**: specweave-kafka-streams
**Version**: 1.0.0
**Status**: ✅ Production Ready
