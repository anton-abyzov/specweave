class StreamProcessingOptimizer {
  /**
   * Generate optimized RocksDB configuration
   */
  static generateRocksDBConfig(storeType) {
    const configs = {
      small: {
        blockCacheSizeMB: 50,
        writeBufferSizeMB: 32,
        maxWriteBuffers: 3,
        bloomFilters: true,
        blockSizeKB: 4,
        compressionType: "snappy",
        maxOpenFiles: 1e3,
        enableStatistics: false
      },
      medium: {
        blockCacheSizeMB: 256,
        writeBufferSizeMB: 64,
        maxWriteBuffers: 4,
        bloomFilters: true,
        blockSizeKB: 8,
        compressionType: "lz4",
        maxOpenFiles: 5e3,
        enableStatistics: true
      },
      large: {
        blockCacheSizeMB: 1024,
        writeBufferSizeMB: 128,
        maxWriteBuffers: 6,
        bloomFilters: true,
        blockSizeKB: 16,
        compressionType: "lz4",
        maxOpenFiles: 1e4,
        enableStatistics: true
      },
      xlarge: {
        blockCacheSizeMB: 4096,
        writeBufferSizeMB: 256,
        maxWriteBuffers: 8,
        bloomFilters: true,
        blockSizeKB: 32,
        compressionType: "zstd",
        maxOpenFiles: -1,
        // Unlimited
        enableStatistics: true
      }
    };
    return configs[storeType];
  }
  /**
   * Calculate optimal thread count
   */
  static calculateOptimalThreadCount(partitionCount, cpuCores, workloadType) {
    let threads;
    if (workloadType === "cpu-intensive") {
      threads = Math.min(partitionCount, cpuCores);
    } else if (workloadType === "io-intensive") {
      threads = Math.min(partitionCount, cpuCores * 2);
    } else {
      threads = Math.min(partitionCount, Math.ceil(cpuCores * 1.5));
    }
    return Math.max(1, Math.min(threads, partitionCount));
  }
  /**
   * Calculate optimal cache size per thread
   */
  static calculateCacheSize(availableMemoryMB, numThreads, storeCount) {
    const cachableMB = availableMemoryMB * 0.5;
    const cachePerThreadMB = cachableMB / numThreads;
    return Math.max(10, Math.floor(cachePerThreadMB));
  }
  /**
   * Analyze topology for optimization opportunities
   */
  static analyzeTopology(topologyDescription) {
    const recommendations = [];
    const antiPatterns = [];
    let performanceScore = 100;
    if (topologyDescription.includes("repartition")) {
      const repartitionCount = (topologyDescription.match(/repartition/g) || []).length;
      if (repartitionCount > 2) {
        antiPatterns.push(
          `Multiple repartitioning operations (${repartitionCount}) - consider co-partitioning`
        );
        performanceScore -= 20;
        recommendations.push("Use co-partitioning to avoid repartition topics");
      }
    }
    if (topologyDescription.includes("StateStore")) {
      const storeCount = (topologyDescription.match(/StateStore/g) || []).length;
      if (storeCount > 5) {
        recommendations.push(
          `Many state stores (${storeCount}) detected - consider RocksDB tuning`
        );
        performanceScore -= 10;
      }
    }
    if (topologyDescription.includes("Join")) {
      const joinCount = (topologyDescription.match(/Join/g) || []).length;
      if (joinCount > 3) {
        recommendations.push(
          `Multiple joins (${joinCount}) detected - ensure input topics are co-partitioned`
        );
        performanceScore -= 10;
      }
    }
    if (topologyDescription.includes("GlobalKTable")) {
      const globalTableCount = (topologyDescription.match(/GlobalKTable/g) || []).length;
      if (globalTableCount > 2) {
        antiPatterns.push(
          `Multiple GlobalKTables (${globalTableCount}) - high memory usage, consider regular KTables`
        );
        performanceScore -= 15;
      }
    }
    if (topologyDescription.match(/groupBy.*groupBy/)) {
      antiPatterns.push("Consecutive groupBy operations detected - combine into single groupBy");
      performanceScore -= 15;
      recommendations.push("Merge consecutive groupBy operations to reduce overhead");
    }
    if (!antiPatterns.length && !recommendations.length) {
      recommendations.push("Topology looks well-optimized!");
    } else {
      if (topologyDescription.includes("aggregate") || topologyDescription.includes("reduce")) {
        recommendations.push("For stateful operations, tune RocksDB cache and write buffers");
      }
      recommendations.push("Monitor state store metrics (size, read/write latency)");
      recommendations.push("Consider enabling exactly-once semantics v2 for better performance");
    }
    const throughputImpact = performanceScore >= 90 ? "Minimal impact" : performanceScore >= 70 ? "Moderate impact (10-30% improvement possible)" : "Significant impact (30-50% improvement possible)";
    return {
      recommendations,
      antiPatterns,
      performanceScore,
      throughputImpact
    };
  }
  /**
   * Generate Kafka Streams properties
   */
  static generateStreamsProperties(config) {
    const props = {
      "application.id": config.applicationId,
      "bootstrap.servers": config.bootstrapServers.join(","),
      "num.stream.threads": config.numStreamThreads || 1,
      "cache.max.bytes.buffering": (config.cacheSizeMB || 10) * 1024 * 1024,
      "commit.interval.ms": config.commitIntervalMs || 3e4,
      "poll.ms": config.pollMs || 100
    };
    if (config.processingGuarantee === "exactly_once_v2") {
      props["processing.guarantee"] = "exactly_once_v2";
      props["replication.factor"] = 3;
      props["min.insync.replicas"] = 2;
    } else if (config.processingGuarantee === "exactly_once") {
      props["processing.guarantee"] = "exactly_once";
    }
    if (config.rocksdb) {
      const rocksdb = config.rocksdb;
      if (rocksdb.blockCacheSizeMB) {
        props["rocksdb.config.setter"] = "RocksDBConfigSetter";
        props["rocksdb.block.cache.size"] = rocksdb.blockCacheSizeMB * 1024 * 1024;
      }
      if (rocksdb.writeBufferSizeMB) {
        props["rocksdb.write.buffer.size"] = rocksdb.writeBufferSizeMB * 1024 * 1024;
      }
      if (rocksdb.maxWriteBuffers) {
        props["rocksdb.max.write.buffers"] = rocksdb.maxWriteBuffers;
      }
      if (rocksdb.compressionType) {
        props["rocksdb.compression.type"] = rocksdb.compressionType;
      }
      if (rocksdb.bloomFilters !== false) {
        props["rocksdb.bloom.filter"] = true;
      }
      if (rocksdb.maxOpenFiles) {
        props["rocksdb.max.open.files"] = rocksdb.maxOpenFiles;
      }
      if (rocksdb.enableStatistics) {
        props["rocksdb.statistics.enable"] = true;
      }
    }
    return props;
  }
  /**
   * Estimate state store size
   */
  static estimateStateStoreSize(recordsPerSec, avgRecordSizeBytes, windowSizeMs) {
    if (windowSizeMs) {
      const windowDurationSec = windowSizeMs / 1e3;
      const recordsInWindow = recordsPerSec * windowDurationSec;
      return recordsInWindow * avgRecordSizeBytes;
    } else {
      const retentionSec = 3600;
      const totalRecords = recordsPerSec * retentionSec;
      return totalRecords * avgRecordSizeBytes;
    }
  }
}
class StateStoreMonitor {
  /**
   * Check if state store needs optimization
   */
  static needsOptimization(metrics) {
    if (metrics.avgReadLatencyMs > 10 || metrics.avgWriteLatencyMs > 10) {
      return true;
    }
    if (metrics.cacheHitRatio < 0.7) {
      return true;
    }
    if ((metrics.readOpsPerSec > 1e3 || metrics.writeOpsPerSec > 1e3) && metrics.cacheHitRatio < 0.8) {
      return true;
    }
    return false;
  }
  /**
   * Get optimization recommendations
   */
  static getOptimizationRecommendations(metrics) {
    const recommendations = [];
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
    if (metrics.cacheHitRatio < 0.7) {
      recommendations.push(
        `Low cache hit ratio (${(metrics.cacheHitRatio * 100).toFixed(1)}%) - increase block cache size or reduce state store size`
      );
    }
    if (metrics.readOpsPerSec > 5e3) {
      recommendations.push(
        `Very high read throughput (${metrics.readOpsPerSec} ops/sec) - consider sharding or in-memory cache`
      );
    }
    if (metrics.writeOpsPerSec > 2e3) {
      recommendations.push(
        `High write throughput (${metrics.writeOpsPerSec} ops/sec) - increase write buffer count`
      );
    }
    const sizeGB = metrics.estimatedSizeBytes / 1024 / 1024 / 1024;
    if (sizeGB > 50) {
      recommendations.push(
        `Large state store (${sizeGB.toFixed(1)} GB) - consider partitioning or time-based windowing`
      );
    }
    return recommendations;
  }
}
var stream_processing_optimization_default = {
  StreamProcessingOptimizer,
  StateStoreMonitor
};
export {
  StateStoreMonitor,
  StreamProcessingOptimizer,
  stream_processing_optimization_default as default
};
