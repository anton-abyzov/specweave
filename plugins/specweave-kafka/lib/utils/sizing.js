class ClusterSizingCalculator {
  constructor() {
    // Constants (empirical limits from production deployments)
    this.MAX_PARTITIONS_PER_BROKER = 4e3;
    this.SINGLE_PARTITION_WRITE_MBPS = 20;
    // Conservative estimate
    this.SINGLE_PARTITION_READ_MBPS = 40;
    this.NETWORK_OVERHEAD = 1.3;
    // 30% overhead for protocol, replication
    this.BASE_RAM_GB = 8;
    // Minimum OS + Kafka overhead
    this.RAM_PER_PARTITION_MB = 1;
    // Page cache per partition
    this.RAM_PER_REPLICATION_MB = 2;
  }
  // Replica fetcher overhead
  /**
   * Calculate recommended cluster size
   */
  calculate(req) {
    const growthFactor = req.growthFactor ?? 2;
    const targetCPU = req.targetCPUUtilization ?? 0.6;
    const targetDisk = req.targetDiskUtilization ?? 0.7;
    const writeThru = req.writeThroughputMBps * growthFactor;
    const readThru = req.readThroughputMBps * growthFactor;
    const totalPartitions = req.topicCount * req.avgPartitionsPerTopic;
    const brokersForWrite = Math.ceil(
      writeThru * this.NETWORK_OVERHEAD / (this.SINGLE_PARTITION_WRITE_MBPS * this.MAX_PARTITIONS_PER_BROKER / 10)
    );
    const brokersForRead = Math.ceil(
      readThru * this.NETWORK_OVERHEAD / (this.SINGLE_PARTITION_READ_MBPS * this.MAX_PARTITIONS_PER_BROKER / 10)
    );
    const brokersForPartitions = Math.ceil(totalPartitions / this.MAX_PARTITIONS_PER_BROKER);
    let brokerCount = Math.max(brokersForWrite, brokersForRead, brokersForPartitions);
    brokerCount = Math.max(brokerCount, req.replicationFactor);
    if (brokerCount > 3 && brokerCount % 3 !== 0) {
      brokerCount = Math.ceil(brokerCount / 3) * 3;
    }
    const partitionsPerBroker = Math.ceil(totalPartitions / brokerCount);
    const dailyDataVolumeMB = req.messagesPerDay * req.avgMessageSizeKB / 1024;
    const totalStorageGB = dailyDataVolumeMB * req.retentionDays / 1024;
    const storageWithReplicationGB = totalStorageGB * req.replicationFactor;
    const diskPerBrokerGB = Math.ceil(
      storageWithReplicationGB / brokerCount / targetDisk
    );
    const ramForPartitionsGB = partitionsPerBroker * this.RAM_PER_PARTITION_MB / 1024;
    const ramForReplicationGB = partitionsPerBroker * req.replicationFactor * this.RAM_PER_REPLICATION_MB / 1024;
    const ramGB = Math.ceil(this.BASE_RAM_GB + ramForPartitionsGB + ramForReplicationGB);
    const cpuCores = Math.ceil(partitionsPerBroker / 500) + 8;
    const networkGbps = this.calculateNetworkBandwidth(writeThru, readThru, brokerCount);
    const estimatedWriteThroughputMBps = brokerCount * this.SINGLE_PARTITION_WRITE_MBPS * (partitionsPerBroker / 10);
    const estimatedReadThroughputMBps = brokerCount * this.SINGLE_PARTITION_READ_MBPS * (partitionsPerBroker / 10);
    const estimatedLatencyP99Ms = this.estimateLatency(partitionsPerBroker, diskPerBrokerGB);
    const warnings = this.generateWarnings({
      partitionsPerBroker,
      brokerCount,
      req,
      diskPerBrokerGB
    });
    const recommendations = this.generateRecommendations({
      partitionsPerBroker,
      brokerCount,
      req,
      ramGB,
      diskPerBrokerGB
    });
    return {
      brokerCount,
      totalPartitions,
      partitionsPerBroker,
      cpuCores,
      ramGB,
      diskGB: diskPerBrokerGB,
      networkGbps,
      estimatedWriteThroughputMBps,
      estimatedReadThroughputMBps,
      estimatedLatencyP99Ms,
      dailyDataVolumeMB,
      totalStorageRequiredGB: totalStorageGB,
      storageWithReplicationGB,
      warnings,
      recommendations
    };
  }
  /**
   * Calculate network bandwidth requirements
   */
  calculateNetworkBandwidth(writeMBps, readMBps, brokerCount) {
    const replicationTrafficMBps = writeMBps * 2;
    const totalTrafficMBps = writeMBps + readMBps + replicationTrafficMBps;
    const perBrokerMBps = totalTrafficMBps / brokerCount;
    const gbps = Math.ceil(perBrokerMBps * 8 / 1e3);
    if (gbps <= 1) return 1;
    if (gbps <= 10) return 10;
    if (gbps <= 25) return 25;
    if (gbps <= 40) return 40;
    return 100;
  }
  /**
   * Estimate p99 latency based on partition count and disk size
   */
  estimateLatency(partitionsPerBroker, diskGB) {
    let latencyMs = 5;
    if (partitionsPerBroker > 2e3) {
      latencyMs += 5;
    } else if (partitionsPerBroker > 1e3) {
      latencyMs += 2;
    }
    if (diskGB > 1e4) {
      latencyMs += 10;
    } else if (diskGB > 5e3) {
      latencyMs += 5;
    }
    return latencyMs;
  }
  /**
   * Generate warnings for potential issues
   */
  generateWarnings(params) {
    const warnings = [];
    if (params.partitionsPerBroker > 4e3) {
      warnings.push(
        `\u26A0\uFE0F  ${params.partitionsPerBroker} partitions per broker exceeds recommended limit (4000). Consider increasing broker count to ${Math.ceil(params.req.topicCount * params.req.avgPartitionsPerTopic / 4e3)}.`
      );
    }
    if (params.partitionsPerBroker < 100) {
      warnings.push(
        `\u26A0\uFE0F  ${params.partitionsPerBroker} partitions per broker is very low. You may be over-provisioned. Consider reducing to ${Math.max(3, Math.ceil(params.brokerCount / 2))} brokers.`
      );
    }
    if (params.brokerCount < params.req.replicationFactor) {
      warnings.push(
        `\u{1F6A8} CRITICAL: ${params.brokerCount} brokers < replication factor (${params.req.replicationFactor}). Minimum required: ${params.req.replicationFactor} brokers.`
      );
    }
    if (params.brokerCount === params.req.replicationFactor) {
      warnings.push(
        `\u26A0\uFE0F  Broker count equals replication factor. No fault tolerance! Increase to at least ${params.req.replicationFactor + 1} brokers.`
      );
    }
    if (params.diskPerBrokerGB > 1e4) {
      warnings.push(
        `\u26A0\uFE0F  ${params.diskPerBrokerGB} GB per broker is very large. Consider using HDD for cost savings or increasing broker count to reduce disk per broker.`
      );
    }
    if (params.req.minInsyncReplicas && params.req.minInsyncReplicas >= params.req.replicationFactor) {
      warnings.push(
        `\u{1F6A8} CRITICAL: min.insync.replicas (${params.req.minInsyncReplicas}) >= replication.factor (${params.req.replicationFactor}). This will cause writes to fail! Set min.insync.replicas to ${params.req.replicationFactor - 1}.`
      );
    }
    return warnings;
  }
  /**
   * Generate optimization recommendations
   */
  generateRecommendations(params) {
    const recommendations = [];
    if (params.req.avgPartitionsPerTopic < 10) {
      recommendations.push(
        `\u{1F4A1} Consider increasing partitions per topic to 12-24 for better parallelism and future growth.`
      );
    }
    if (params.req.avgPartitionsPerTopic > 100) {
      recommendations.push(
        `\u{1F4A1} ${params.req.avgPartitionsPerTopic} partitions per topic is high. Consider splitting into multiple topics or reducing partition count unless you need extreme parallelism.`
      );
    }
    if (params.diskPerBrokerGB > 5e3) {
      recommendations.push(
        `\u{1F4A1} Large disk requirement (${params.diskPerBrokerGB} GB). Consider using tiered storage (Kafka 2.8+) to offload old data to S3/Azure Blob/GCS.`
      );
    }
    if (params.ramGB > 128) {
      recommendations.push(
        `\u{1F4A1} High RAM requirement (${params.ramGB} GB). Ensure your infrastructure supports this. Consider AWS i3en/i4i instances or equivalent.`
      );
    }
    if (!params.req.minInsyncReplicas) {
      recommendations.push(
        `\u{1F4A1} Set min.insync.replicas=2 for production (currently not configured). This prevents data loss if a broker fails.`
      );
    }
    if (params.req.replicationFactor < 3) {
      recommendations.push(
        `\u{1F4A1} Increase replication factor to 3 for production durability (currently ${params.req.replicationFactor}).`
      );
    }
    if (params.brokerCount % 3 !== 0 && params.brokerCount > 3) {
      recommendations.push(
        `\u{1F4A1} Broker count (${params.brokerCount}) is not a multiple of 3. Consider using ${Math.ceil(params.brokerCount / 3) * 3} brokers for better rack awareness.`
      );
    }
    return recommendations;
  }
  /**
   * Calculate disk IOPS requirements
   */
  calculateDiskIOPS(writeThroughputMBps, replicationFactor) {
    const writeIOPS = writeThroughputMBps * 1024 / 4;
    const replicationWriteIOPS = writeIOPS * (replicationFactor - 1);
    const readIOPS = writeIOPS * 0.5;
    const totalWriteIOPS = writeIOPS + replicationWriteIOPS;
    const totalReadIOPS = readIOPS;
    let recommendation = "";
    if (totalWriteIOPS > 5e4) {
      recommendation = "Use NVMe SSDs (500K+ IOPS)";
    } else if (totalWriteIOPS > 1e4) {
      recommendation = "Use Premium SSD (20K-64K IOPS)";
    } else {
      recommendation = "Standard SSD (3K-6K IOPS) sufficient";
    }
    return {
      readIOPS: Math.ceil(totalReadIOPS),
      writeIOPS: Math.ceil(totalWriteIOPS),
      recommendation
    };
  }
}
export {
  ClusterSizingCalculator
};
