class PartitioningStrategyAnalyzer {
  constructor() {
    this.MAX_PARTITION_THROUGHPUT_MBPS = 20;
    this.MAX_PARTITION_MSG_PER_SEC = 5e4;
    this.IDEAL_PARTITIONS_PER_CONSUMER = 2;
  }
  /**
   * Analyze partition key candidates and recommend strategy
   */
  analyze(req) {
    const peakMultiplier = req.peakMultiplier ?? 3;
    const targetLatency = req.targetLatencyMs ?? 100;
    const peakMessagesPerSec = req.expectedMessagesPerSecond * peakMultiplier;
    const keyAnalyses = req.potentialKeys.map((key) => this.analyzeKey(key));
    const bestKey = this.selectBestKey(keyAnalyses, req.orderingRequired);
    let partitionsForThroughput = 1;
    if (req.targetThroughputMBps) {
      partitionsForThroughput = Math.ceil(
        req.targetThroughputMBps / this.MAX_PARTITION_THROUGHPUT_MBPS
      );
    }
    const partitionsForMsgRate = Math.ceil(
      peakMessagesPerSec / this.MAX_PARTITION_MSG_PER_SEC
    );
    const partitionsForParallelism = Math.max(4, partitionsForMsgRate * this.IDEAL_PARTITIONS_PER_CONSUMER);
    let recommendedPartitions = Math.max(
      partitionsForThroughput,
      partitionsForMsgRate,
      partitionsForParallelism
    );
    if (recommendedPartitions <= 16) {
      recommendedPartitions = this.nextPowerOfTwo(recommendedPartitions);
    } else {
      recommendedPartitions = Math.ceil(recommendedPartitions / 12) * 12;
    }
    recommendedPartitions = Math.max(recommendedPartitions, 3);
    const { keyStrategy, keyField, reasoning } = this.determineKeyStrategy(
      bestKey,
      req.orderingRequired,
      recommendedPartitions
    );
    const warnings = this.generateWarnings({
      bestKey,
      recommendedPartitions,
      currentPartitionCount: req.currentPartitionCount,
      req
    });
    const examples = this.generateExamples(keyStrategy, keyField, req.topicName);
    return {
      recommendedPartitions,
      keyStrategy,
      keyField,
      reasoning,
      warnings,
      examples
    };
  }
  /**
   * Analyze a single partition key candidate
   */
  analyzeKey(key) {
    const cardinality = key.estimatedUniqueCount;
    const sampleSize = key.sampleValues.length;
    const uniqueInSample = new Set(key.sampleValues).size;
    const uniquenessRatio = uniqueInSample / sampleSize;
    let distribution;
    if (uniquenessRatio > 0.9) {
      distribution = "uniform";
    } else if (uniquenessRatio > 0.5) {
      distribution = "skewed";
    } else {
      distribution = "severely-skewed";
    }
    let hotspotRisk;
    if (cardinality > 1e4 && distribution === "uniform") {
      hotspotRisk = "low";
    } else if (cardinality > 1e3 && distribution !== "severely-skewed") {
      hotspotRisk = "medium";
    } else {
      hotspotRisk = "high";
    }
    return {
      key: key.fieldName,
      sampleValues: key.sampleValues.slice(0, 5),
      // Top 5 examples
      estimatedCardinality: cardinality,
      distribution,
      hotspotRisk
    };
  }
  /**
   * Select best partition key from candidates
   */
  selectBestKey(analyses, orderingRequired) {
    const sorted = [...analyses].sort((a, b) => {
      const riskScore = { low: 0, medium: 1, high: 2 };
      const riskDiff = riskScore[a.hotspotRisk] - riskScore[b.hotspotRisk];
      if (riskDiff !== 0) return riskDiff;
      return b.estimatedCardinality - a.estimatedCardinality;
    });
    return sorted[0];
  }
  /**
   * Determine optimal partitioning key strategy
   */
  determineKeyStrategy(bestKey, orderingRequired, partitionCount) {
    if (!orderingRequired && (!bestKey || bestKey.hotspotRisk === "high")) {
      return {
        keyStrategy: "round-robin",
        keyField: null,
        reasoning: "No ordering requirement and no suitable key field. Round-robin provides best load distribution."
      };
    }
    if (orderingRequired && bestKey && bestKey.hotspotRisk === "high") {
      return {
        keyStrategy: "compound-hash",
        keyField: bestKey.key,
        reasoning: `Ordering required but ${bestKey.key} has high hotspot risk. Use compound key (e.g., ${bestKey.key} + timestamp) to distribute load.`
      };
    }
    if (orderingRequired && bestKey && bestKey.hotspotRisk !== "high") {
      return {
        keyStrategy: "simple-hash",
        keyField: bestKey.key,
        reasoning: `${bestKey.key} has ${bestKey.distribution} distribution with ${bestKey.hotspotRisk} hotspot risk. Use simple hash partitioning.`
      };
    }
    if (!orderingRequired && bestKey && bestKey.hotspotRisk === "low") {
      return {
        keyStrategy: "simple-hash",
        keyField: bestKey.key,
        reasoning: `${bestKey.key} has excellent distribution. Use hash partitioning for data locality even though ordering not required.`
      };
    }
    return {
      keyStrategy: "custom-partitioner",
      keyField: bestKey?.key ?? null,
      reasoning: "Complex partitioning requirements. Implement custom partitioner for optimal distribution."
    };
  }
  /**
   * Generate warnings for partitioning strategy
   */
  generateWarnings(params) {
    const warnings = [];
    if (params.bestKey && params.bestKey.hotspotRisk === "high") {
      warnings.push(
        `\u26A0\uFE0F  Best key (${params.bestKey.key}) has HIGH hotspot risk with cardinality ${params.bestKey.estimatedCardinality}. Consider compound key or custom partitioner.`
      );
    }
    if (params.bestKey && params.bestKey.hotspotRisk === "medium") {
      warnings.push(
        `\u26A0\uFE0F  Key (${params.bestKey.key}) has MEDIUM hotspot risk. Monitor partition distribution in production.`
      );
    }
    if (params.currentPartitionCount && params.recommendedPartitions > params.currentPartitionCount) {
      warnings.push(
        `\u26A0\uFE0F  Current partition count (${params.currentPartitionCount}) is below recommended (${params.recommendedPartitions}). Increasing partitions requires re-creating topic or using partition expansion (Kafka 2.4+).`
      );
    }
    if (params.recommendedPartitions > 100) {
      warnings.push(
        `\u26A0\uFE0F  Recommended ${params.recommendedPartitions} partitions is high. Ensure cluster can handle this (max ~4000 per broker).`
      );
    }
    if (params.req.orderingRequired && !params.bestKey) {
      warnings.push(
        `\u{1F6A8} CRITICAL: Ordering required but no suitable partition key found. ALL messages will be unordered!`
      );
    }
    if (params.req.targetThroughputMBps && params.req.targetThroughputMBps > params.recommendedPartitions * this.MAX_PARTITION_THROUGHPUT_MBPS) {
      const neededPartitions = Math.ceil(params.req.targetThroughputMBps / this.MAX_PARTITION_THROUGHPUT_MBPS);
      warnings.push(
        `\u26A0\uFE0F  Target throughput (${params.req.targetThroughputMBps} MB/s) requires ${neededPartitions} partitions, but recommended only ${params.recommendedPartitions}. Increase partition count.`
      );
    }
    return warnings;
  }
  /**
   * Generate usage examples for the recommended strategy
   */
  generateExamples(keyStrategy, keyField, topicName) {
    const examples = [];
    switch (keyStrategy) {
      case "simple-hash":
        examples.push(
          `// Producer (JavaScript/Node.js)`,
          `await producer.send({`,
          `  topic: '${topicName}',`,
          `  messages: [{`,
          `    key: record.${keyField}, // Hash this key`,
          `    value: JSON.stringify(record)`,
          `  }]`,
          `});`,
          ``,
          `// Producer (Java)`,
          `ProducerRecord<String, String> record = new ProducerRecord<>(`,
          `  "${topicName}",`,
          `  record.get${this.capitalize(keyField || "id")}(), // Partition key`,
          `  jsonValue`,
          `);`,
          `producer.send(record);`
        );
        break;
      case "compound-hash":
        examples.push(
          `// Producer (JavaScript/Node.js) - Compound Key`,
          `const compoundKey = \`\${record.${keyField}}-\${Date.now() % 100}\`; // Add temporal component`,
          `await producer.send({`,
          `  topic: '${topicName}',`,
          `  messages: [{`,
          `    key: compoundKey,`,
          `    value: JSON.stringify(record)`,
          `  }]`,
          `});`,
          ``,
          `// Alternative: Geographic + Entity ID`,
          `const compoundKey = \`\${record.region}-\${record.${keyField}}\`;`
        );
        break;
      case "custom-partitioner":
        examples.push(
          `// Custom Partitioner (Java)`,
          `public class CustomPartitioner implements Partitioner {`,
          `  @Override`,
          `  public int partition(String topic, Object key, byte[] keyBytes,`,
          `                       Object value, byte[] valueBytes, Cluster cluster) {`,
          `    int partitionCount = cluster.partitionCountForTopic(topic);`,
          `    `,
          `    // Custom logic here`,
          `    String keyStr = (String) key;`,
          `    if (keyStr.startsWith("priority-")) {`,
          `      return 0; // High-priority partition`,
          `    }`,
          `    `,
          `    // Default hashing for others`,
          `    return Math.abs(keyStr.hashCode()) % (partitionCount - 1) + 1;`,
          `  }`,
          `}`,
          ``,
          `// Configure producer`,
          `props.put("partitioner.class", "com.example.CustomPartitioner");`
        );
        break;
      case "round-robin":
        examples.push(
          `// Producer (JavaScript/Node.js) - No Key`,
          `await producer.send({`,
          `  topic: '${topicName}',`,
          `  messages: [{`,
          `    value: JSON.stringify(record) // No key = round-robin`,
          `  }]`,
          `});`,
          ``,
          `// Producer (Java)`,
          `ProducerRecord<String, String> record = new ProducerRecord<>(`,
          `  "${topicName}",`,
          `  null, // No key`,
          `  jsonValue`,
          `);`,
          `producer.send(record);`
        );
        break;
    }
    return examples;
  }
  /**
   * Helper: Next power of 2
   */
  nextPowerOfTwo(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }
  /**
   * Helper: Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  /**
   * Calculate partition distribution for a given key
   */
  calculateDistribution(sampleValues, partitionCount) {
    const partitionCounts = /* @__PURE__ */ new Map();
    for (const value of sampleValues) {
      const hash = this.murmur2Hash(value);
      const partition = Math.abs(hash) % partitionCount;
      partitionCounts.set(partition, (partitionCounts.get(partition) || 0) + 1);
    }
    const distribution = Array.from(partitionCounts.entries()).map(([partition, count]) => ({
      partition,
      count,
      percentage: count / sampleValues.length * 100
    })).sort((a, b) => b.count - a.count);
    return distribution;
  }
  /**
   * Simple MurmurHash2 implementation (matches Kafka's DefaultPartitioner)
   */
  murmur2Hash(data) {
    const bytes = Buffer.from(data, "utf-8");
    const length = bytes.length;
    const seed = 2538058380;
    const m = 1540483477;
    const r = 24;
    let h = seed ^ length;
    for (let i = 0; i + 4 <= length; i += 4) {
      let k = bytes.readInt32LE(i);
      k = Math.imul(k, m);
      k ^= k >>> r;
      k = Math.imul(k, m);
      h = Math.imul(h, m);
      h ^= k;
    }
    const remaining = length % 4;
    if (remaining >= 3) h ^= bytes[length - 3] << 16;
    if (remaining >= 2) h ^= bytes[length - 2] << 8;
    if (remaining >= 1) {
      h ^= bytes[length - 1];
      h = Math.imul(h, m);
    }
    h ^= h >>> 13;
    h = Math.imul(h, m);
    h ^= h >>> 15;
    return h;
  }
}
export {
  PartitioningStrategyAnalyzer
};
