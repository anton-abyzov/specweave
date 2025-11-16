/**
 * Cluster Sizing Calculator
 *
 * Calculates optimal Kafka cluster size based on workload requirements.
 * Considers throughput, retention, replication, and growth factors.
 */

export interface SizingRequirements {
  // Throughput requirements
  writeThroughputMBps: number;
  readThroughputMBps: number;

  // Data retention
  retentionDays: number;
  avgMessageSizeKB: number;
  messagesPerDay: number;

  // Replication & availability
  replicationFactor: number;
  minInsyncReplicas?: number;

  // Topic configuration
  topicCount: number;
  avgPartitionsPerTopic: number;

  // Growth & headroom
  growthFactor?: number; // Default: 2.0 (100% growth buffer)
  targetCPUUtilization?: number; // Default: 0.6 (60%)
  targetDiskUtilization?: number; // Default: 0.7 (70%)
}

export interface ClusterSizingRecommendation {
  // Cluster size
  brokerCount: number;
  totalPartitions: number;
  partitionsPerBroker: number;

  // Hardware per broker
  cpuCores: number;
  ramGB: number;
  diskGB: number;
  networkGbps: number;

  // Performance estimates
  estimatedWriteThroughputMBps: number;
  estimatedReadThroughputMBps: number;
  estimatedLatencyP99Ms: number;

  // Capacity metrics
  dailyDataVolumeMB: number;
  totalStorageRequiredGB: number;
  storageWithReplicationGB: number;

  // Warnings & recommendations
  warnings: string[];
  recommendations: string[];
}

export class ClusterSizingCalculator {
  // Constants (empirical limits from production deployments)
  private readonly MAX_PARTITIONS_PER_BROKER = 4000;
  private readonly SINGLE_PARTITION_WRITE_MBPS = 20; // Conservative estimate
  private readonly SINGLE_PARTITION_READ_MBPS = 40;
  private readonly NETWORK_OVERHEAD = 1.3; // 30% overhead for protocol, replication

  private readonly BASE_RAM_GB = 8; // Minimum OS + Kafka overhead
  private readonly RAM_PER_PARTITION_MB = 1; // Page cache per partition
  private readonly RAM_PER_REPLICATION_MB = 2; // Replica fetcher overhead

  /**
   * Calculate recommended cluster size
   */
  calculate(req: SizingRequirements): ClusterSizingRecommendation {
    const growthFactor = req.growthFactor ?? 2.0;
    const targetCPU = req.targetCPUUtilization ?? 0.6;
    const targetDisk = req.targetDiskUtilization ?? 0.7;

    // Apply growth factor to throughput
    const writeThru = req.writeThroughputMBps * growthFactor;
    const readThru = req.readThroughputMBps * growthFactor;

    // Calculate total partitions needed
    const totalPartitions = req.topicCount * req.avgPartitionsPerTopic;

    // Calculate brokers needed based on throughput
    const brokersForWrite = Math.ceil(
      (writeThru * this.NETWORK_OVERHEAD) / (this.SINGLE_PARTITION_WRITE_MBPS * this.MAX_PARTITIONS_PER_BROKER / 10)
    );
    const brokersForRead = Math.ceil(
      (readThru * this.NETWORK_OVERHEAD) / (this.SINGLE_PARTITION_READ_MBPS * this.MAX_PARTITIONS_PER_BROKER / 10)
    );

    // Calculate brokers needed based on partition count
    const brokersForPartitions = Math.ceil(totalPartitions / this.MAX_PARTITIONS_PER_BROKER);

    // Take maximum (most constraining factor)
    let brokerCount = Math.max(brokersForWrite, brokersForRead, brokersForPartitions);

    // Ensure minimum for replication factor
    brokerCount = Math.max(brokerCount, req.replicationFactor);

    // Ensure broker count allows for rack awareness (multiples of 3)
    if (brokerCount > 3 && brokerCount % 3 !== 0) {
      brokerCount = Math.ceil(brokerCount / 3) * 3;
    }

    // Calculate partitions per broker
    const partitionsPerBroker = Math.ceil(totalPartitions / brokerCount);

    // Calculate daily data volume
    const dailyDataVolumeMB = (req.messagesPerDay * req.avgMessageSizeKB) / 1024;

    // Calculate total storage needed
    const totalStorageGB = (dailyDataVolumeMB * req.retentionDays) / 1024;
    const storageWithReplicationGB = totalStorageGB * req.replicationFactor;

    // Calculate disk per broker (with headroom)
    const diskPerBrokerGB = Math.ceil(
      (storageWithReplicationGB / brokerCount) / targetDisk
    );

    // Calculate RAM per broker
    const ramForPartitionsGB = (partitionsPerBroker * this.RAM_PER_PARTITION_MB) / 1024;
    const ramForReplicationGB = (partitionsPerBroker * req.replicationFactor * this.RAM_PER_REPLICATION_MB) / 1024;
    const ramGB = Math.ceil(this.BASE_RAM_GB + ramForPartitionsGB + ramForReplicationGB);

    // Calculate CPU cores (rule: 1 core per 500 partitions + 8 base cores)
    const cpuCores = Math.ceil(partitionsPerBroker / 500) + 8;

    // Calculate network bandwidth needed
    const networkGbps = this.calculateNetworkBandwidth(writeThru, readThru, brokerCount);

    // Estimate performance
    const estimatedWriteThroughputMBps = brokerCount * this.SINGLE_PARTITION_WRITE_MBPS * (partitionsPerBroker / 10);
    const estimatedReadThroughputMBps = brokerCount * this.SINGLE_PARTITION_READ_MBPS * (partitionsPerBroker / 10);
    const estimatedLatencyP99Ms = this.estimateLatency(partitionsPerBroker, diskPerBrokerGB);

    // Generate warnings
    const warnings = this.generateWarnings({
      partitionsPerBroker,
      brokerCount,
      req,
      diskPerBrokerGB
    });

    // Generate recommendations
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
  private calculateNetworkBandwidth(writeMBps: number, readMBps: number, brokerCount: number): number {
    // Each broker handles replication traffic
    const replicationTrafficMBps = writeMBps * 2; // Leader + follower writes
    const totalTrafficMBps = writeMBps + readMBps + replicationTrafficMBps;
    const perBrokerMBps = totalTrafficMBps / brokerCount;

    // Convert to Gbps and round up
    const gbps = Math.ceil((perBrokerMBps * 8) / 1000);

    // Recommend common NIC sizes: 1, 10, 25, 40, 100 Gbps
    if (gbps <= 1) return 1;
    if (gbps <= 10) return 10;
    if (gbps <= 25) return 25;
    if (gbps <= 40) return 40;
    return 100;
  }

  /**
   * Estimate p99 latency based on partition count and disk size
   */
  private estimateLatency(partitionsPerBroker: number, diskGB: number): number {
    let latencyMs = 5; // Base latency (network + CPU)

    // Add latency for partition count (more partitions = more overhead)
    if (partitionsPerBroker > 2000) {
      latencyMs += 5;
    } else if (partitionsPerBroker > 1000) {
      latencyMs += 2;
    }

    // Add latency for disk size (larger disks = potential seek time)
    if (diskGB > 10000) {
      latencyMs += 10; // HDD territory
    } else if (diskGB > 5000) {
      latencyMs += 5; // Large SSD
    }

    return latencyMs;
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(params: {
    partitionsPerBroker: number;
    brokerCount: number;
    req: SizingRequirements;
    diskPerBrokerGB: number;
  }): string[] {
    const warnings: string[] = [];

    // Partition count warnings
    if (params.partitionsPerBroker > 4000) {
      warnings.push(
        `⚠️  ${params.partitionsPerBroker} partitions per broker exceeds recommended limit (4000). ` +
        `Consider increasing broker count to ${Math.ceil(params.req.topicCount * params.req.avgPartitionsPerTopic / 4000)}.`
      );
    }

    if (params.partitionsPerBroker < 100) {
      warnings.push(
        `⚠️  ${params.partitionsPerBroker} partitions per broker is very low. ` +
        `You may be over-provisioned. Consider reducing to ${Math.max(3, Math.ceil(params.brokerCount / 2))} brokers.`
      );
    }

    // Broker count warnings
    if (params.brokerCount < params.req.replicationFactor) {
      warnings.push(
        `🚨 CRITICAL: ${params.brokerCount} brokers < replication factor (${params.req.replicationFactor}). ` +
        `Minimum required: ${params.req.replicationFactor} brokers.`
      );
    }

    if (params.brokerCount === params.req.replicationFactor) {
      warnings.push(
        `⚠️  Broker count equals replication factor. No fault tolerance! ` +
        `Increase to at least ${params.req.replicationFactor + 1} brokers.`
      );
    }

    // Disk size warnings
    if (params.diskPerBrokerGB > 10000) {
      warnings.push(
        `⚠️  ${params.diskPerBrokerGB} GB per broker is very large. ` +
        `Consider using HDD for cost savings or increasing broker count to reduce disk per broker.`
      );
    }

    // Replication warnings
    if (params.req.minInsyncReplicas && params.req.minInsyncReplicas >= params.req.replicationFactor) {
      warnings.push(
        `🚨 CRITICAL: min.insync.replicas (${params.req.minInsyncReplicas}) >= replication.factor (${params.req.replicationFactor}). ` +
        `This will cause writes to fail! Set min.insync.replicas to ${params.req.replicationFactor - 1}.`
      );
    }

    return warnings;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(params: {
    partitionsPerBroker: number;
    brokerCount: number;
    req: SizingRequirements;
    ramGB: number;
    diskPerBrokerGB: number;
  }): string[] {
    const recommendations: string[] = [];

    // Partition strategy
    if (params.req.avgPartitionsPerTopic < 10) {
      recommendations.push(
        `💡 Consider increasing partitions per topic to 12-24 for better parallelism and future growth.`
      );
    }

    if (params.req.avgPartitionsPerTopic > 100) {
      recommendations.push(
        `💡 ${params.req.avgPartitionsPerTopic} partitions per topic is high. ` +
        `Consider splitting into multiple topics or reducing partition count unless you need extreme parallelism.`
      );
    }

    // Hardware recommendations
    if (params.diskPerBrokerGB > 5000) {
      recommendations.push(
        `💡 Large disk requirement (${params.diskPerBrokerGB} GB). Consider using tiered storage (Kafka 2.8+) ` +
        `to offload old data to S3/Azure Blob/GCS.`
      );
    }

    if (params.ramGB > 128) {
      recommendations.push(
        `💡 High RAM requirement (${params.ramGB} GB). Ensure your infrastructure supports this. ` +
        `Consider AWS i3en/i4i instances or equivalent.`
      );
    }

    // Replication recommendations
    if (!params.req.minInsyncReplicas) {
      recommendations.push(
        `💡 Set min.insync.replicas=2 for production (currently not configured). ` +
        `This prevents data loss if a broker fails.`
      );
    }

    if (params.req.replicationFactor < 3) {
      recommendations.push(
        `💡 Increase replication factor to 3 for production durability (currently ${params.req.replicationFactor}).`
      );
    }

    // Broker count recommendations
    if (params.brokerCount % 3 !== 0 && params.brokerCount > 3) {
      recommendations.push(
        `💡 Broker count (${params.brokerCount}) is not a multiple of 3. ` +
        `Consider using ${Math.ceil(params.brokerCount / 3) * 3} brokers for better rack awareness.`
      );
    }

    return recommendations;
  }

  /**
   * Calculate disk IOPS requirements
   */
  calculateDiskIOPS(writeThroughputMBps: number, replicationFactor: number): {
    readIOPS: number;
    writeIOPS: number;
    recommendation: string;
  } {
    // Assume 4KB blocks
    const writeIOPS = (writeThroughputMBps * 1024) / 4;
    const replicationWriteIOPS = writeIOPS * (replicationFactor - 1); // Follower writes
    const readIOPS = writeIOPS * 0.5; // Conservative (depends on consumer lag)

    const totalWriteIOPS = writeIOPS + replicationWriteIOPS;
    const totalReadIOPS = readIOPS;

    let recommendation = '';
    if (totalWriteIOPS > 50000) {
      recommendation = 'Use NVMe SSDs (500K+ IOPS)';
    } else if (totalWriteIOPS > 10000) {
      recommendation = 'Use Premium SSD (20K-64K IOPS)';
    } else {
      recommendation = 'Standard SSD (3K-6K IOPS) sufficient';
    }

    return {
      readIOPS: Math.ceil(totalReadIOPS),
      writeIOPS: Math.ceil(totalWriteIOPS),
      recommendation
    };
  }
}
