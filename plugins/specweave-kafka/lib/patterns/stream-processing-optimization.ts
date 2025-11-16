/**
 * Kafka Streams Performance Optimization
 *
 * RocksDB tuning, topology optimization, thread configuration, and state store performance
 *
 * @module stream-processing-optimization
 */

/**
 * RocksDB Configuration
 */
export interface RocksDBConfig {
  /** Block cache size in MB (default: 50) */
  blockCacheSizeMB?: number;
  /** Write buffer size in MB (default: 32) */
  writeBufferSizeMB?: number;
  /** Max write buffers (default: 3) */
  maxWriteBuffers?: number;
  /** Enable bloom filters (default: true) */
  bloomFilters?: boolean;
  /** Block size in KB (default: 4) */
  blockSizeKB?: number;
  /** Compression type */
  compressionType?: 'none' | 'snappy' | 'lz4' | 'zstd';
  /** Max open files (default: -1 for unlimited) */
  maxOpenFiles?: number;
  /** Enable statistics (default: false) */
  enableStatistics?: boolean;
}

/**
 * Streams Application Configuration
 */
export interface StreamsOptimizationConfig {
  /** Application ID */
  applicationId: string;
  /** Bootstrap servers */
  bootstrapServers: string[];
  /** Number of stream threads (default: 1) */
  numStreamThreads?: number;
  /** Cache size per thread in MB (default: 10) */
  cacheSizeMB?: number;
  /** Commit interval in ms (default: 30000) */
  commitIntervalMs?: number;
  /** Poll interval in ms (default: 100) */
  pollMs?: number;
  /** Processing guarantee */
  processingGuarantee?: 'at_least_once' | 'exactly_once' | 'exactly_once_v2';
  /** RocksDB configuration */
  rocksdb?: RocksDBConfig;
}

/**
 * State Store Metrics
 */
export interface StateStoreMetrics {
  /** Store name */
  storeName: string;
  /** Store type (rocksdb, in-memory) */
  storeType: string;
  /** Estimated size in bytes */
  estimatedSizeBytes: number;
  /** Number of entries (approximate) */
  entryCount: number;
  /** Read operations per second */
  readOpsPerSec: number;
  /** Write operations per second */
  writeOpsPerSec: number;
  /** Average read latency in ms */
  avgReadLatencyMs: number;
  /** Average write latency in ms */
  avgWriteLatencyMs: number;
  /** Cache hit ratio (0-1) */
  cacheHitRatio: number;
}

/**
 * Topology Optimization Recommendations
 */
export interface TopologyOptimization {
  /** Recommended optimizations */
  recommendations: string[];
  /** Detected anti-patterns */
  antiPatterns: string[];
  /** Performance score (0-100) */
  performanceScore: number;
  /** Estimated throughput impact */
  throughputImpact: string;
}

/**
 * Stream Processing Optimizer
 *
 * Performance tuning for Kafka Streams applications
 */
export class StreamProcessingOptimizer {
  /**
   * Generate optimized RocksDB configuration
   */
  static generateRocksDBConfig(
    storeType: 'small' | 'medium' | 'large' | 'xlarge'
  ): RocksDBConfig {
    const configs = {
      small: {
        blockCacheSizeMB: 50,
        writeBufferSizeMB: 32,
        maxWriteBuffers: 3,
        bloomFilters: true,
        blockSizeKB: 4,
        compressionType: 'snappy' as const,
        maxOpenFiles: 1000,
        enableStatistics: false,
      },
      medium: {
        blockCacheSizeMB: 256,
        writeBufferSizeMB: 64,
        maxWriteBuffers: 4,
        bloomFilters: true,
        blockSizeKB: 8,
        compressionType: 'lz4' as const,
        maxOpenFiles: 5000,
        enableStatistics: true,
      },
      large: {
        blockCacheSizeMB: 1024,
        writeBufferSizeMB: 128,
        maxWriteBuffers: 6,
        bloomFilters: true,
        blockSizeKB: 16,
        compressionType: 'lz4' as const,
        maxOpenFiles: 10000,
        enableStatistics: true,
      },
      xlarge: {
        blockCacheSizeMB: 4096,
        writeBufferSizeMB: 256,
        maxWriteBuffers: 8,
        bloomFilters: true,
        blockSizeKB: 32,
        compressionType: 'zstd' as const,
        maxOpenFiles: -1, // Unlimited
        enableStatistics: true,
      },
    };

    return configs[storeType];
  }

  /**
   * Calculate optimal thread count
   */
  static calculateOptimalThreadCount(
    partitionCount: number,
    cpuCores: number,
    workloadType: 'cpu-intensive' | 'io-intensive' | 'balanced'
  ): number {
    let threads: number;

    if (workloadType === 'cpu-intensive') {
      // CPU-bound: 1 thread per core
      threads = Math.min(partitionCount, cpuCores);
    } else if (workloadType === 'io-intensive') {
      // I/O-bound: 2x cores (better CPU utilization during I/O wait)
      threads = Math.min(partitionCount, cpuCores * 2);
    } else {
      // Balanced: 1.5x cores
      threads = Math.min(partitionCount, Math.ceil(cpuCores * 1.5));
    }

    // Never exceed partition count (diminishing returns)
    return Math.max(1, Math.min(threads, partitionCount));
  }

  /**
   * Calculate optimal cache size per thread
   */
  static calculateCacheSize(
    availableMemoryMB: number,
    numThreads: number,
    storeCount: number
  ): number {
    // Reserve 50% of memory for RocksDB block cache and OS
    const cachableMB = availableMemoryMB * 0.5;

    // Distribute remaining memory across threads
    const cachePerThreadMB = cachableMB / numThreads;

    // Minimum 10MB per thread
    return Math.max(10, Math.floor(cachePerThreadMB));
  }

  /**
   * Analyze topology for optimization opportunities
   */
  static analyzeTopology(topologyDescription: string): TopologyOptimization {
    const recommendations: string[] = [];
    const antiPatterns: string[] = [];
    let performanceScore = 100;

    // Check for repartitioning
    if (topologyDescription.includes('repartition')) {
      const repartitionCount = (topologyDescription.match(/repartition/g) || []).length;
      if (repartitionCount > 2) {
        antiPatterns.push(
          `Multiple repartitioning operations (${repartitionCount}) - consider co-partitioning`
        );
        performanceScore -= 20;
        recommendations.push('Use co-partitioning to avoid repartition topics');
      }
    }

    // Check for state stores
    if (topologyDescription.includes('StateStore')) {
      const storeCount = (topologyDescription.match(/StateStore/g) || []).length;
      if (storeCount > 5) {
        recommendations.push(
          `Many state stores (${storeCount}) detected - consider RocksDB tuning`
        );
        performanceScore -= 10;
      }
    }

    // Check for joins
    if (topologyDescription.includes('Join')) {
      const joinCount = (topologyDescription.match(/Join/g) || []).length;
      if (joinCount > 3) {
        recommendations.push(
          `Multiple joins (${joinCount}) detected - ensure input topics are co-partitioned`
        );
        performanceScore -= 10;
      }
    }

    // Check for global tables
    if (topologyDescription.includes('GlobalKTable')) {
      const globalTableCount = (topologyDescription.match(/GlobalKTable/g) || []).length;
      if (globalTableCount > 2) {
        antiPatterns.push(
          `Multiple GlobalKTables (${globalTableCount}) - high memory usage, consider regular KTables`
        );
        performanceScore -= 15;
      }
    }

    // Check for unnecessary groupBy operations
    if (topologyDescription.match(/groupBy.*groupBy/)) {
      antiPatterns.push('Consecutive groupBy operations detected - combine into single groupBy');
      performanceScore -= 15;
      recommendations.push('Merge consecutive groupBy operations to reduce overhead');
    }

    // General recommendations
    if (!antiPatterns.length && !recommendations.length) {
      recommendations.push('Topology looks well-optimized!');
    } else {
      if (topologyDescription.includes('aggregate') || topologyDescription.includes('reduce')) {
        recommendations.push('For stateful operations, tune RocksDB cache and write buffers');
      }
      recommendations.push('Monitor state store metrics (size, read/write latency)');
      recommendations.push('Consider enabling exactly-once semantics v2 for better performance');
    }

    const throughputImpact = performanceScore >= 90
      ? 'Minimal impact'
      : performanceScore >= 70
      ? 'Moderate impact (10-30% improvement possible)'
      : 'Significant impact (30-50% improvement possible)';

    return {
      recommendations,
      antiPatterns,
      performanceScore,
      throughputImpact,
    };
  }

  /**
   * Generate Kafka Streams properties
   */
  static generateStreamsProperties(config: StreamsOptimizationConfig): Record<string, any> {
    const props: Record<string, any> = {
      'application.id': config.applicationId,
      'bootstrap.servers': config.bootstrapServers.join(','),
      'num.stream.threads': config.numStreamThreads || 1,
      'cache.max.bytes.buffering': (config.cacheSizeMB || 10) * 1024 * 1024,
      'commit.interval.ms': config.commitIntervalMs || 30000,
      'poll.ms': config.pollMs || 100,
    };

    // Processing guarantee
    if (config.processingGuarantee === 'exactly_once_v2') {
      props['processing.guarantee'] = 'exactly_once_v2';
      props['replication.factor'] = 3;
      props['min.insync.replicas'] = 2;
    } else if (config.processingGuarantee === 'exactly_once') {
      props['processing.guarantee'] = 'exactly_once';
    }

    // RocksDB configuration
    if (config.rocksdb) {
      const rocksdb = config.rocksdb;

      if (rocksdb.blockCacheSizeMB) {
        props['rocksdb.config.setter'] = 'RocksDBConfigSetter';
        props['rocksdb.block.cache.size'] = rocksdb.blockCacheSizeMB * 1024 * 1024;
      }

      if (rocksdb.writeBufferSizeMB) {
        props['rocksdb.write.buffer.size'] = rocksdb.writeBufferSizeMB * 1024 * 1024;
      }

      if (rocksdb.maxWriteBuffers) {
        props['rocksdb.max.write.buffers'] = rocksdb.maxWriteBuffers;
      }

      if (rocksdb.compressionType) {
        props['rocksdb.compression.type'] = rocksdb.compressionType;
      }

      if (rocksdb.bloomFilters !== false) {
        props['rocksdb.bloom.filter'] = true;
      }

      if (rocksdb.maxOpenFiles) {
        props['rocksdb.max.open.files'] = rocksdb.maxOpenFiles;
      }

      if (rocksdb.enableStatistics) {
        props['rocksdb.statistics.enable'] = true;
      }
    }

    return props;
  }

  /**
   * Estimate state store size
   */
  static estimateStateStoreSize(
    recordsPerSec: number,
    avgRecordSizeBytes: number,
    windowSizeMs?: number
  ): number {
    if (windowSizeMs) {
      // Windowed store: size = records * avg_size * window_duration
      const windowDurationSec = windowSizeMs / 1000;
      const recordsInWindow = recordsPerSec * windowDurationSec;
      return recordsInWindow * avgRecordSizeBytes;
    } else {
      // Key-value store: assume 1 hour retention for size estimation
      const retentionSec = 3600;
      const totalRecords = recordsPerSec * retentionSec;
      return totalRecords * avgRecordSizeBytes;
    }
  }
}

/**
 * State Store Monitor
 *
 * Monitors state store performance metrics
 */
export class StateStoreMonitor {
  /**
   * Check if state store needs optimization
   */
  static needsOptimization(metrics: StateStoreMetrics): boolean {
    // High latency (> 10ms)
    if (metrics.avgReadLatencyMs > 10 || metrics.avgWriteLatencyMs > 10) {
      return true;
    }

    // Low cache hit ratio (< 70%)
    if (metrics.cacheHitRatio < 0.7) {
      return true;
    }

    // High throughput (> 1000 ops/sec) with low cache hit ratio
    if (
      (metrics.readOpsPerSec > 1000 || metrics.writeOpsPerSec > 1000) &&
      metrics.cacheHitRatio < 0.8
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get optimization recommendations
   */
  static getOptimizationRecommendations(metrics: StateStoreMetrics): string[] {
    const recommendations: string[] = [];

    // Latency recommendations
    if (metrics.avgReadLatencyMs > 10) {
      recommendations.push(
        `High read latency (${metrics.avgReadLatencyMs.toFixed(2)}ms) - increase RocksDB block cache size`
      );
    }

    if (metrics.avgWriteLatencyMs > 10) {
      recommendations.push(
        `High write latency (${metrics.avgWriteLatencyMs.toFixed(2)}ms) - increase write buffer size`
      );
    }

    // Cache recommendations
    if (metrics.cacheHitRatio < 0.7) {
      recommendations.push(
        `Low cache hit ratio (${(metrics.cacheHitRatio * 100).toFixed(1)}%) - increase block cache size or reduce state store size`
      );
    }

    // Throughput recommendations
    if (metrics.readOpsPerSec > 5000) {
      recommendations.push(
        `Very high read throughput (${metrics.readOpsPerSec} ops/sec) - consider sharding or in-memory cache`
      );
    }

    if (metrics.writeOpsPerSec > 2000) {
      recommendations.push(
        `High write throughput (${metrics.writeOpsPerSec} ops/sec) - increase write buffer count`
      );
    }

    // Size recommendations
    const sizeGB = metrics.estimatedSizeBytes / 1024 / 1024 / 1024;
    if (sizeGB > 50) {
      recommendations.push(
        `Large state store (${sizeGB.toFixed(1)} GB) - consider partitioning or time-based windowing`
      );
    }

    return recommendations;
  }
}

/**
 * Example Usage: Basic Optimization
 *
 * ```typescript
 * const config: StreamsOptimizationConfig = {
 *   applicationId: 'order-processing-app',
 *   bootstrapServers: ['localhost:9092'],
 *   numStreamThreads: StreamProcessingOptimizer.calculateOptimalThreadCount(
 *     32, // partition count
 *     8,  // CPU cores
 *     'balanced'
 *   ),
 *   cacheSizeMB: StreamProcessingOptimizer.calculateCacheSize(
 *     16384, // 16GB available memory
 *     8,     // thread count
 *     5      // state store count
 *   ),
 *   processingGuarantee: 'exactly_once_v2',
 *   rocksdb: StreamProcessingOptimizer.generateRocksDBConfig('large'),
 * };
 *
 * const props = StreamProcessingOptimizer.generateStreamsProperties(config);
 * console.log('Streams config:', props);
 * ```
 */

/**
 * Example Usage: Topology Analysis
 *
 * ```typescript
 * const topologyDescription = streams.describe().toString();
 * const analysis = StreamProcessingOptimizer.analyzeTopology(topologyDescription);
 *
 * console.log('Performance Score:', analysis.performanceScore);
 * console.log('Recommendations:', analysis.recommendations);
 * if (analysis.antiPatterns.length > 0) {
 *   console.warn('Anti-patterns detected:', analysis.antiPatterns);
 * }
 * ```
 */

/**
 * Example Usage: State Store Monitoring
 *
 * ```typescript
 * const metrics: StateStoreMetrics = {
 *   storeName: 'order-aggregates',
 *   storeType: 'rocksdb',
 *   estimatedSizeBytes: 5 * 1024 * 1024 * 1024, // 5GB
 *   entryCount: 10_000_000,
 *   readOpsPerSec: 2000,
 *   writeOpsPerSec: 500,
 *   avgReadLatencyMs: 12.5,
 *   avgWriteLatencyMs: 8.3,
 *   cacheHitRatio: 0.65,
 * };
 *
 * if (StateStoreMonitor.needsOptimization(metrics)) {
 *   const recommendations = StateStoreMonitor.getOptimizationRecommendations(metrics);
 *   console.log('Optimization needed:', recommendations);
 * }
 * ```
 */

/**
 * Stream Processing Optimization Best Practices:
 *
 * **Thread Configuration**:
 * - CPU-intensive: 1 thread per core
 * - I/O-intensive: 2x cores
 * - Balanced workload: 1.5x cores
 * - Never exceed partition count
 *
 * **Cache Sizing**:
 * - Allocate 50% of memory for caching
 * - Minimum 10MB per thread
 * - Monitor cache hit ratio (target: > 80%)
 *
 * **RocksDB Tuning**:
 * - Block cache: 256MB-4GB (depends on state size)
 * - Write buffer: 64MB-256MB (depends on write rate)
 * - Enable bloom filters (reduces disk I/O)
 * - Use LZ4/Zstandard compression
 *
 * **State Store Size**:
 * - Target: < 10GB per partition (fast recovery)
 * - Use windowed stores for time-series data
 * - Consider changelog compaction for key-value stores
 *
 * **Topology Optimization**:
 * - Minimize repartitioning (use co-partitioning)
 * - Avoid consecutive groupBy operations
 * - Use GlobalKTable sparingly (high memory)
 * - Prefer stream-stream joins over stream-table joins
 *
 * **Processing Guarantee**:
 * - Use exactly-once-v2 (best performance)
 * - Avoid exactly-once-beta (deprecated)
 * - At-least-once OK for idempotent operations
 *
 * **Commit Interval**:
 * - Lower interval: Lower latency, higher overhead
 * - Higher interval: Higher throughput, higher latency
 * - Recommended: 30-60 seconds for batch, 1-5 seconds for real-time
 */

export default {
  StreamProcessingOptimizer,
  StateStoreMonitor,
};
