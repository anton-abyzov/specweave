/**
 * Partitioning Strategy Analyzer
 *
 * Analyzes partition key distribution and provides recommendations
 * for optimal Kafka topic partitioning strategies.
 */

export interface PartitionKeyAnalysis {
  key: string;
  sampleValues: string[];
  estimatedCardinality: number;
  distribution: 'uniform' | 'skewed' | 'severely-skewed';
  hotspotRisk: 'low' | 'medium' | 'high';
}

export interface PartitioningRecommendation {
  recommendedPartitions: number;
  keyStrategy: 'simple-hash' | 'compound-hash' | 'custom-partitioner' | 'round-robin';
  keyField: string | null;
  reasoning: string;
  warnings: string[];
  examples: string[];
}

export interface PartitionAnalysisRequest {
  // Topic metadata
  topicName: string;
  currentPartitionCount?: number;

  // Workload characteristics
  expectedMessagesPerSecond: number;
  peakMultiplier?: number; // Default: 3x (peak = 3x average)

  // Key characteristics
  potentialKeys: Array<{
    fieldName: string;
    sampleValues: string[];
    estimatedUniqueCount: number;
  }>;

  // Business requirements
  orderingRequired: boolean;
  targetLatencyMs?: number; // Default: 100ms
  targetThroughputMBps?: number;
}

export class PartitioningStrategyAnalyzer {
  private readonly MAX_PARTITION_THROUGHPUT_MBPS = 20;
  private readonly MAX_PARTITION_MSG_PER_SEC = 50000;
  private readonly IDEAL_PARTITIONS_PER_CONSUMER = 2;

  /**
   * Analyze partition key candidates and recommend strategy
   */
  analyze(req: PartitionAnalysisRequest): PartitioningRecommendation {
    const peakMultiplier = req.peakMultiplier ?? 3;
    const targetLatency = req.targetLatencyMs ?? 100;
    const peakMessagesPerSec = req.expectedMessagesPerSecond * peakMultiplier;

    // Analyze each potential key
    const keyAnalyses = req.potentialKeys.map(key => this.analyzeKey(key));

    // Find best key based on distribution
    const bestKey = this.selectBestKey(keyAnalyses, req.orderingRequired);

    // Calculate partitions needed based on throughput
    let partitionsForThroughput = 1;
    if (req.targetThroughputMBps) {
      partitionsForThroughput = Math.ceil(
        req.targetThroughputMBps / this.MAX_PARTITION_THROUGHPUT_MBPS
      );
    }

    // Calculate partitions needed based on message rate
    const partitionsForMsgRate = Math.ceil(
      peakMessagesPerSec / this.MAX_PARTITION_MSG_PER_SEC
    );

    // Calculate partitions for consumer parallelism
    const partitionsForParallelism = Math.max(4, partitionsForMsgRate * this.IDEAL_PARTITIONS_PER_CONSUMER);

    // Take maximum (most constraining)
    let recommendedPartitions = Math.max(
      partitionsForThroughput,
      partitionsForMsgRate,
      partitionsForParallelism
    );

    // Round up to nearest power of 2 or multiple of 3 (for rack awareness)
    if (recommendedPartitions <= 16) {
      recommendedPartitions = this.nextPowerOfTwo(recommendedPartitions);
    } else {
      recommendedPartitions = Math.ceil(recommendedPartitions / 12) * 12; // Multiple of 12 (3 racks × 4)
    }

    // Ensure minimum partitions
    recommendedPartitions = Math.max(recommendedPartitions, 3);

    // Determine key strategy
    const { keyStrategy, keyField, reasoning } = this.determineKeyStrategy(
      bestKey,
      req.orderingRequired,
      recommendedPartitions
    );

    // Generate warnings
    const warnings = this.generateWarnings({
      bestKey,
      recommendedPartitions,
      currentPartitionCount: req.currentPartitionCount,
      req
    });

    // Generate usage examples
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
  private analyzeKey(key: { fieldName: string; sampleValues: string[]; estimatedUniqueCount: number }): PartitionKeyAnalysis {
    const cardinality = key.estimatedUniqueCount;
    const sampleSize = key.sampleValues.length;

    // Estimate distribution from sample
    const uniqueInSample = new Set(key.sampleValues).size;
    const uniquenessRatio = uniqueInSample / sampleSize;

    // Classify distribution
    let distribution: 'uniform' | 'skewed' | 'severely-skewed';
    if (uniquenessRatio > 0.9) {
      distribution = 'uniform'; // Most values are unique
    } else if (uniquenessRatio > 0.5) {
      distribution = 'skewed'; // Some duplicate values
    } else {
      distribution = 'severely-skewed'; // Many duplicate values
    }

    // Assess hotspot risk
    let hotspotRisk: 'low' | 'medium' | 'high';
    if (cardinality > 10000 && distribution === 'uniform') {
      hotspotRisk = 'low';
    } else if (cardinality > 1000 && distribution !== 'severely-skewed') {
      hotspotRisk = 'medium';
    } else {
      hotspotRisk = 'high';
    }

    return {
      key: key.fieldName,
      sampleValues: key.sampleValues.slice(0, 5), // Top 5 examples
      estimatedCardinality: cardinality,
      distribution,
      hotspotRisk
    };
  }

  /**
   * Select best partition key from candidates
   */
  private selectBestKey(
    analyses: PartitionKeyAnalysis[],
    orderingRequired: boolean
  ): PartitionKeyAnalysis {
    // Sort by hotspot risk (low is best) and cardinality (high is best)
    const sorted = [...analyses].sort((a, b) => {
      const riskScore = { low: 0, medium: 1, high: 2 };
      const riskDiff = riskScore[a.hotspotRisk] - riskScore[b.hotspotRisk];

      if (riskDiff !== 0) return riskDiff; // Lower risk wins

      // If risks equal, higher cardinality wins
      return b.estimatedCardinality - a.estimatedCardinality;
    });

    return sorted[0];
  }

  /**
   * Determine optimal partitioning key strategy
   */
  private determineKeyStrategy(
    bestKey: PartitionKeyAnalysis | null,
    orderingRequired: boolean,
    partitionCount: number
  ): { keyStrategy: string; keyField: string | null; reasoning: string } {
    // No ordering required and no good key → round-robin
    if (!orderingRequired && (!bestKey || bestKey.hotspotRisk === 'high')) {
      return {
        keyStrategy: 'round-robin',
        keyField: null,
        reasoning: 'No ordering requirement and no suitable key field. Round-robin provides best load distribution.'
      };
    }

    // Ordering required but bad key → need compound key or custom partitioner
    if (orderingRequired && bestKey && bestKey.hotspotRisk === 'high') {
      return {
        keyStrategy: 'compound-hash',
        keyField: bestKey.key,
        reasoning: `Ordering required but ${bestKey.key} has high hotspot risk. Use compound key (e.g., ${bestKey.key} + timestamp) to distribute load.`
      };
    }

    // Good key with ordering → simple hash
    if (orderingRequired && bestKey && bestKey.hotspotRisk !== 'high') {
      return {
        keyStrategy: 'simple-hash',
        keyField: bestKey.key,
        reasoning: `${bestKey.key} has ${bestKey.distribution} distribution with ${bestKey.hotspotRisk} hotspot risk. Use simple hash partitioning.`
      };
    }

    // No ordering, but good key available → can use for locality
    if (!orderingRequired && bestKey && bestKey.hotspotRisk === 'low') {
      return {
        keyStrategy: 'simple-hash',
        keyField: bestKey.key,
        reasoning: `${bestKey.key} has excellent distribution. Use hash partitioning for data locality even though ordering not required.`
      };
    }

    // Fallback: custom partitioner for complex cases
    return {
      keyStrategy: 'custom-partitioner',
      keyField: bestKey?.key ?? null,
      reasoning: 'Complex partitioning requirements. Implement custom partitioner for optimal distribution.'
    };
  }

  /**
   * Generate warnings for partitioning strategy
   */
  private generateWarnings(params: {
    bestKey: PartitionKeyAnalysis | null;
    recommendedPartitions: number;
    currentPartitionCount?: number;
    req: PartitionAnalysisRequest;
  }): string[] {
    const warnings: string[] = [];

    // Hotspot warnings
    if (params.bestKey && params.bestKey.hotspotRisk === 'high') {
      warnings.push(
        `⚠️  Best key (${params.bestKey.key}) has HIGH hotspot risk with cardinality ${params.bestKey.estimatedCardinality}. ` +
        `Consider compound key or custom partitioner.`
      );
    }

    if (params.bestKey && params.bestKey.hotspotRisk === 'medium') {
      warnings.push(
        `⚠️  Key (${params.bestKey.key}) has MEDIUM hotspot risk. Monitor partition distribution in production.`
      );
    }

    // Partition count warnings
    if (params.currentPartitionCount && params.recommendedPartitions > params.currentPartitionCount) {
      warnings.push(
        `⚠️  Current partition count (${params.currentPartitionCount}) is below recommended (${params.recommendedPartitions}). ` +
        `Increasing partitions requires re-creating topic or using partition expansion (Kafka 2.4+).`
      );
    }

    if (params.recommendedPartitions > 100) {
      warnings.push(
        `⚠️  Recommended ${params.recommendedPartitions} partitions is high. Ensure cluster can handle this (max ~4000 per broker).`
      );
    }

    // Ordering warnings
    if (params.req.orderingRequired && !params.bestKey) {
      warnings.push(
        `🚨 CRITICAL: Ordering required but no suitable partition key found. ALL messages will be unordered!`
      );
    }

    // Throughput warnings
    if (params.req.targetThroughputMBps && params.req.targetThroughputMBps > params.recommendedPartitions * this.MAX_PARTITION_THROUGHPUT_MBPS) {
      const neededPartitions = Math.ceil(params.req.targetThroughputMBps / this.MAX_PARTITION_THROUGHPUT_MBPS);
      warnings.push(
        `⚠️  Target throughput (${params.req.targetThroughputMBps} MB/s) requires ${neededPartitions} partitions, ` +
        `but recommended only ${params.recommendedPartitions}. Increase partition count.`
      );
    }

    return warnings;
  }

  /**
   * Generate usage examples for the recommended strategy
   */
  private generateExamples(
    keyStrategy: string,
    keyField: string | null,
    topicName: string
  ): string[] {
    const examples: string[] = [];

    switch (keyStrategy) {
      case 'simple-hash':
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
          `  record.get${this.capitalize(keyField || 'id')}(), // Partition key`,
          `  jsonValue`,
          `);`,
          `producer.send(record);`
        );
        break;

      case 'compound-hash':
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

      case 'custom-partitioner':
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

      case 'round-robin':
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
  private nextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Helper: Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Calculate partition distribution for a given key
   */
  calculateDistribution(
    sampleValues: string[],
    partitionCount: number
  ): { partition: number; count: number; percentage: number }[] {
    // Simulate Kafka's DefaultPartitioner
    const partitionCounts = new Map<number, number>();

    for (const value of sampleValues) {
      const hash = this.murmur2Hash(value);
      const partition = Math.abs(hash) % partitionCount;
      partitionCounts.set(partition, (partitionCounts.get(partition) || 0) + 1);
    }

    // Convert to array and calculate percentages
    const distribution = Array.from(partitionCounts.entries())
      .map(([partition, count]) => ({
        partition,
        count,
        percentage: (count / sampleValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    return distribution;
  }

  /**
   * Simple MurmurHash2 implementation (matches Kafka's DefaultPartitioner)
   */
  private murmur2Hash(data: string): number {
    const bytes = Buffer.from(data, 'utf-8');
    const length = bytes.length;
    const seed = 0x9747b28c;

    const m = 0x5bd1e995;
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
