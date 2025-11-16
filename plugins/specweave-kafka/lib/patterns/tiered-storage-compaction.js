var CompactionStrategy = /* @__PURE__ */ ((CompactionStrategy2) => {
  CompactionStrategy2["DELETE"] = "delete";
  CompactionStrategy2["COMPACT"] = "compact";
  CompactionStrategy2["COMPACT_DELETE"] = "compact,delete";
  return CompactionStrategy2;
})(CompactionStrategy || {});
class TieredStorageManager {
  /**
   * Generate tiered storage broker configuration
   */
  static generateBrokerConfig(config) {
    const brokerConfig = {
      // Enable tiered storage
      "remote.log.storage.system.enable": config.enabled,
      // Local tier retention (hot data)
      "log.local.retention.ms": config.localRetentionMs,
      "log.local.retention.bytes": -1,
      // Unlimited by size
      // Remote storage system
      "remote.log.storage.manager.class.name": this.getRemoteStorageManagerClass(
        config.remoteStorageSystem
      ),
      // S3-specific configuration (if S3)
      ...config.remoteStorageSystem === "S3" && {
        "rsm.config.remote.log.storage.s3.bucket.name": config.remoteStoragePath,
        "rsm.config.remote.log.storage.s3.region": "us-east-1"
      },
      // Upload configuration
      "remote.log.manager.task.interval.ms": config.uploadIntervalMs || 6e4,
      // Compression
      "remote.log.storage.manager.class.path": "/usr/share/kafka/plugins/tiered-storage"
    };
    if (config.compressionType && config.compressionType !== "none") {
      brokerConfig["compression.type"] = config.compressionType;
    }
    return brokerConfig;
  }
  /**
   * Generate tiered storage topic configuration
   */
  static generateTopicConfig(config) {
    return {
      // Enable tiered storage for this topic
      "remote.storage.enable": config.enabled ? "true" : "false",
      // Local retention (hot tier)
      "local.retention.ms": config.localRetentionMs.toString(),
      "local.retention.bytes": "-1",
      // Unlimited
      // Total retention (hot + cold tier)
      "retention.ms": config.remoteRetentionMs.toString(),
      // Segment configuration
      "segment.bytes": "1073741824",
      // 1GB segments
      "segment.ms": "604800000"
      // 7 days
      // Note: Remote data deleted when retention.ms expires
    };
  }
  /**
   * Calculate storage savings
   */
  static calculateStorageSavings(totalDataGB, localRetentionDays, totalRetentionDays, replicationFactor) {
    const dailyDataGB = totalDataGB / totalRetentionDays;
    const localStorageGB = dailyDataGB * localRetentionDays * replicationFactor;
    const remoteStorageGB = dailyDataGB * (totalRetentionDays - localRetentionDays);
    const nonTieredStorageGB = totalDataGB * replicationFactor;
    const totalStorageGB = localStorageGB + remoteStorageGB;
    const savingsPercent = (nonTieredStorageGB - totalStorageGB) / nonTieredStorageGB * 100;
    return {
      localStorageGB: Math.round(localStorageGB * 10) / 10,
      remoteStorageGB: Math.round(remoteStorageGB * 10) / 10,
      totalStorageGB: Math.round(totalStorageGB * 10) / 10,
      savingsPercent: Math.round(savingsPercent * 10) / 10
    };
  }
  static getRemoteStorageManagerClass(system) {
    const classMap = {
      "S3": "org.apache.kafka.server.log.remote.storage.RemoteLogStorageManager",
      "Azure Blob": "org.apache.kafka.server.log.remote.storage.AzureBlobRemoteStorageManager",
      "Google Cloud Storage": "org.apache.kafka.server.log.remote.storage.GCSRemoteStorageManager",
      "MinIO": "org.apache.kafka.server.log.remote.storage.MinIORemoteStorageManager"
    };
    return classMap[system];
  }
}
class LogCompactionManager {
  /**
   * Generate compaction topic configuration
   */
  static generateCompactionConfig(config) {
    const topicConfig = {
      // Cleanup policy
      "cleanup.policy": config.cleanupPolicy,
      // Segment configuration
      "segment.bytes": (config.segmentBytes || 1073741824).toString(),
      // 1GB default
      "segment.ms": (config.segmentMs || 6048e5).toString(),
      // 7 days default
      // Compaction lag
      "min.compaction.lag.ms": (config.minCompactionLagMs || 0).toString(),
      "max.compaction.lag.ms": (config.maxCompactionLagMs || 9223372036854776e3).toString(),
      // Max long
      // Delete retention (tombstone retention)
      "delete.retention.ms": (config.deleteRetentionMs || 864e5).toString(),
      // 24 hours default
      // Min cleanable ratio (% of log that must be dirty)
      "min.cleanable.dirty.ratio": (config.minCleanableRatio || 0.5).toString()
      // 50% default
    };
    return topicConfig;
  }
  /**
   * Choose compaction strategy based on use case
   */
  static chooseStrategy(useCase) {
    const strategies = {
      "event-log": {
        strategy: "delete" /* DELETE */,
        reasoning: "Event logs are immutable and time-based. Keep all events for retention period.",
        exampleConfig: {
          cleanupPolicy: "delete" /* DELETE */,
          segmentMs: 864e5
          // 1 day segments
          // retention.ms set separately (e.g., 30 days)
        }
      },
      "changelog": {
        strategy: "compact" /* COMPACT */,
        reasoning: "Changelog topics should keep latest state per key. Compaction removes old values.",
        exampleConfig: {
          cleanupPolicy: "compact" /* COMPACT */,
          segmentMs: 6048e5,
          // 7 days
          minCompactionLagMs: 36e5,
          // 1 hour delay
          deleteRetentionMs: 864e5
          // 24 hours
        }
      },
      "kv-store": {
        strategy: "compact" /* COMPACT */,
        reasoning: "Key-value store topics need latest value per key (compacted log).",
        exampleConfig: {
          cleanupPolicy: "compact" /* COMPACT */,
          segmentBytes: 1073741824,
          // 1GB
          minCleanableRatio: 0.5
          // Compact when 50% dirty
        }
      },
      "user-profile": {
        strategy: "compact,delete" /* COMPACT_DELETE */,
        reasoning: "User profiles need latest state (compact) + eventual deletion (time-based).",
        exampleConfig: {
          cleanupPolicy: "compact,delete" /* COMPACT_DELETE */,
          segmentMs: 2592e6,
          // 30 days
          minCompactionLagMs: 864e5,
          // 1 day delay
          deleteRetentionMs: 6048e5
          // 7 days tombstone retention
        }
      },
      "analytics": {
        strategy: "delete" /* DELETE */,
        reasoning: "Analytics data is time-series. Retention based on analysis window.",
        exampleConfig: {
          cleanupPolicy: "delete" /* DELETE */,
          segmentMs: 36e5
          // 1 hour segments
          // retention.ms = 90 days typical
        }
      }
    };
    const match = strategies[useCase.toLowerCase()];
    if (!match) {
      throw new Error(`Unknown use case: ${useCase}. Valid options: ${Object.keys(strategies).join(", ")}`);
    }
    return match;
  }
  /**
   * Estimate compaction savings
   */
  static estimateCompactionSavings(recordsPerDay, uniqueKeys, retentionDays) {
    const uncompactedRecords = recordsPerDay * retentionDays;
    const compactedRecords = uniqueKeys;
    const savingsPercent = (uncompactedRecords - compactedRecords) / uncompactedRecords * 100;
    return {
      uncompactedRecords,
      compactedRecords,
      savingsPercent: Math.round(savingsPercent * 10) / 10
    };
  }
}
var tiered_storage_compaction_default = {
  TieredStorageManager,
  LogCompactionManager,
  CompactionStrategy
};
export {
  CompactionStrategy,
  LogCompactionManager,
  TieredStorageManager,
  tiered_storage_compaction_default as default
};
