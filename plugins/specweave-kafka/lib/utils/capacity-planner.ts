/**
 * Kafka Capacity Planning and Sizing
 *
 * Intelligent calculators for broker count, partition optimization, and storage estimation
 *
 * @module capacity-planner
 */

/**
 * Throughput Requirements
 */
export interface ThroughputRequirements {
  /** Peak producer throughput in MB/sec */
  producerThroughputMBps: number;
  /** Peak consumer throughput in MB/sec */
  consumerThroughputMBps: number;
  /** Average message size in bytes */
  avgMessageSizeBytes: number;
  /** Peak messages per second */
  peakMessagesPerSec?: number;
}

/**
 * Storage Requirements
 */
export interface StorageRequirements {
  /** Retention period in hours */
  retentionHours: number;
  /** Replication factor (default: 3) */
  replicationFactor: number;
  /** Compression ratio (default: 0.3 for 70% compression) */
  compressionRatio?: number;
  /** Growth buffer multiplier (default: 1.5 for 50% buffer) */
  growthBuffer?: number;
}

/**
 * Cluster Constraints
 */
export interface ClusterConstraints {
  /** Max partitions per broker (default: 4000) */
  maxPartitionsPerBroker?: number;
  /** Max disk utilization % (default: 70) */
  maxDiskUtilization?: number;
  /** Network bandwidth per broker in MB/s (default: 125 = 1Gbps) */
  networkBandwidthMBps?: number;
  /** CPU cores per broker (default: 8) */
  cpuCoresPerBroker?: number;
  /** RAM per broker in GB (default: 32) */
  ramPerBrokerGB?: number;
}

/**
 * Sizing Result
 */
export interface SizingResult {
  /** Recommended broker count */
  brokerCount: number;
  /** Recommended partition count */
  partitionCount: number;
  /** Storage per broker in GB */
  storagePerBrokerGB: number;
  /** Total cluster storage in GB */
  totalStorageGB: number;
  /** Actual throughput headroom % */
  throughputHeadroom: number;
  /** Resource utilization breakdown */
  utilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    partitions: number;
  };
  /** Warnings and recommendations */
  warnings: string[];
}

/**
 * Partition Sizing Recommendation
 */
export interface PartitionSizingResult {
  /** Recommended partition count */
  partitionCount: number;
  /** Max throughput per partition in MB/s */
  maxThroughputPerPartition: number;
  /** Consumer parallelism level */
  consumerParallelism: number;
  /** Partition size in GB */
  partitionSizeGB: number;
  /** Reasoning */
  reasoning: string[];
}

/**
 * Capacity Planner
 *
 * Intelligent sizing calculator for Kafka clusters
 */
export class KafkaCapacityPlanner {
  private constraints: Required<ClusterConstraints>;

  constructor(constraints: ClusterConstraints = {}) {
    this.constraints = {
      maxPartitionsPerBroker: constraints.maxPartitionsPerBroker || 4000,
      maxDiskUtilization: constraints.maxDiskUtilization || 70,
      networkBandwidthMBps: constraints.networkBandwidthMBps || 125, // 1Gbps
      cpuCoresPerBroker: constraints.cpuCoresPerBroker || 8,
      ramPerBrokerGB: constraints.ramPerBrokerGB || 32,
    };
  }

  /**
   * Calculate optimal cluster sizing
   */
  calculateClusterSize(
    throughput: ThroughputRequirements,
    storage: StorageRequirements,
    topicCount: number = 1
  ): SizingResult {
    // Calculate partition count first
    const partitioning = this.calculatePartitionCount(throughput);

    // Calculate storage requirements
    const storageCalc = this.calculateStorageRequirements(
      throughput,
      storage,
      partitioning.partitionCount
    );

    // Calculate broker count based on multiple constraints
    const brokerCountOptions = {
      throughput: this.calculateBrokersForThroughput(throughput),
      storage: this.calculateBrokersForStorage(storageCalc.totalStorageGB),
      partitions: this.calculateBrokersForPartitions(partitioning.partitionCount),
      network: this.calculateBrokersForNetwork(throughput),
    };

    // Take the maximum to satisfy all constraints
    const brokerCount = Math.max(
      brokerCountOptions.throughput,
      brokerCountOptions.storage,
      brokerCountOptions.partitions,
      brokerCountOptions.network,
      3 // Minimum for production (quorum)
    );

    // Calculate utilization
    const utilization = this.calculateUtilization(
      brokerCount,
      partitioning.partitionCount,
      throughput,
      storageCalc.totalStorageGB
    );

    // Generate warnings
    const warnings: string[] = [];
    if (utilization.cpu > 80) {
      warnings.push(`High CPU utilization (${utilization.cpu.toFixed(1)}%) - consider more brokers`);
    }
    if (utilization.disk > this.constraints.maxDiskUtilization) {
      warnings.push(`Disk utilization (${utilization.disk.toFixed(1)}%) exceeds ${this.constraints.maxDiskUtilization}% threshold`);
    }
    if (utilization.network > 70) {
      warnings.push(`Network utilization (${utilization.network.toFixed(1)}%) is high - risk of bottleneck`);
    }
    if (utilization.partitions > 80) {
      warnings.push(`Partition count (${partitioning.partitionCount}) is ${utilization.partitions.toFixed(1)}% of broker capacity`);
    }
    if (brokerCount < 3) {
      warnings.push('Less than 3 brokers - not suitable for production (no fault tolerance)');
    }
    if (partitioning.partitionCount < brokerCount) {
      warnings.push(`Partition count (${partitioning.partitionCount}) < broker count (${brokerCount}) - underutilized`);
    }

    return {
      brokerCount,
      partitionCount: partitioning.partitionCount,
      storagePerBrokerGB: storageCalc.totalStorageGB / brokerCount,
      totalStorageGB: storageCalc.totalStorageGB,
      throughputHeadroom: this.calculateThroughputHeadroom(brokerCount, throughput),
      utilization,
      warnings,
    };
  }

  /**
   * Calculate optimal partition count
   */
  calculatePartitionCount(throughput: ThroughputRequirements): PartitionSizingResult {
    const reasoning: string[] = [];

    // Rule 1: Throughput-based sizing
    // Kafka can handle ~50 MB/s per partition (producer side)
    const maxThroughputPerPartition = 50; // MB/s
    const partitionsForProducerThroughput = Math.ceil(
      throughput.producerThroughputMBps / maxThroughputPerPartition
    );
    reasoning.push(
      `Producer throughput: ${throughput.producerThroughputMBps} MB/s ÷ ${maxThroughputPerPartition} MB/s/partition = ${partitionsForProducerThroughput} partitions`
    );

    // Rule 2: Consumer parallelism
    // Each consumer in a group processes one partition
    const partitionsForConsumerThroughput = Math.ceil(
      throughput.consumerThroughputMBps / maxThroughputPerPartition
    );
    reasoning.push(
      `Consumer throughput: ${throughput.consumerThroughputMBps} MB/s ÷ ${maxThroughputPerPartition} MB/s/partition = ${partitionsForConsumerThroughput} partitions`
    );

    // Rule 3: Target partition size (max 10GB per partition for fast recovery)
    const targetPartitionSizeGB = 10;

    // Take the maximum
    const minPartitions = Math.max(
      partitionsForProducerThroughput,
      partitionsForConsumerThroughput,
      1 // At least 1 partition
    );

    // Round up to next power of 2 for better distribution
    const partitionCount = this.nextPowerOfTwo(minPartitions);
    reasoning.push(`Rounded to power of 2: ${partitionCount} partitions (for even distribution)`);

    return {
      partitionCount,
      maxThroughputPerPartition,
      consumerParallelism: partitionCount,
      partitionSizeGB: targetPartitionSizeGB,
      reasoning,
    };
  }

  /**
   * Calculate storage requirements
   */
  calculateStorageRequirements(
    throughput: ThroughputRequirements,
    storage: StorageRequirements,
    partitionCount: number
  ): {
    totalStorageGB: number;
    storagePerPartitionGB: number;
    rawStorageGB: number;
    compressedStorageGB: number;
  } {
    const compressionRatio = storage.compressionRatio || 0.3; // 70% compression
    const growthBuffer = storage.growthBuffer || 1.5; // 50% growth buffer

    // Calculate data rate
    const dataRateMBps = throughput.producerThroughputMBps;
    const dataRateGBperHour = dataRateMBps * 3.6; // MB/s * 3600s/h / 1024 MB/GB ≈ 3.6

    // Raw storage (uncompressed, unreplicated)
    const rawStorageGB = dataRateGBperHour * storage.retentionHours;

    // Apply compression
    const compressedStorageGB = rawStorageGB * compressionRatio;

    // Apply replication
    const replicatedStorageGB = compressedStorageGB * storage.replicationFactor;

    // Apply growth buffer
    const totalStorageGB = replicatedStorageGB * growthBuffer;

    // Per partition
    const storagePerPartitionGB = totalStorageGB / partitionCount;

    return {
      totalStorageGB,
      storagePerPartitionGB,
      rawStorageGB,
      compressedStorageGB,
    };
  }

  /**
   * Calculate brokers needed for throughput
   */
  private calculateBrokersForThroughput(throughput: ThroughputRequirements): number {
    // Each broker can handle ~200 MB/s total (100 MB/s in + 100 MB/s out)
    const maxBrokerThroughputMBps = 100;
    const totalThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    return Math.ceil(totalThroughput / maxBrokerThroughputMBps);
  }

  /**
   * Calculate brokers needed for storage
   */
  private calculateBrokersForStorage(totalStorageGB: number): number {
    // Assume 2TB disks per broker (usable storage after RAID, OS overhead)
    const usableStoragePerBrokerGB = 2000;
    const maxUtilization = this.constraints.maxDiskUtilization / 100;
    const effectiveStoragePerBroker = usableStoragePerBrokerGB * maxUtilization;
    return Math.ceil(totalStorageGB / effectiveStoragePerBroker);
  }

  /**
   * Calculate brokers needed for partition count
   */
  private calculateBrokersForPartitions(partitionCount: number): number {
    return Math.ceil(partitionCount / this.constraints.maxPartitionsPerBroker);
  }

  /**
   * Calculate brokers needed for network bandwidth
   */
  private calculateBrokersForNetwork(throughput: ThroughputRequirements): number {
    const totalNetworkMBps = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    const maxNetworkUtilization = 0.7; // 70% max utilization
    const effectiveBandwidth = this.constraints.networkBandwidthMBps * maxNetworkUtilization;
    return Math.ceil(totalNetworkMBps / effectiveBandwidth);
  }

  /**
   * Calculate resource utilization
   */
  private calculateUtilization(
    brokerCount: number,
    partitionCount: number,
    throughput: ThroughputRequirements,
    totalStorageGB: number
  ): {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    partitions: number;
  } {
    // CPU: ~5% per 10 MB/s throughput
    const totalThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    const cpuPerBroker = (totalThroughput / brokerCount / 10) * 5;
    const cpu = Math.min(cpuPerBroker, 100);

    // Memory: ~2GB base + 1MB per partition
    const memoryPerBroker = (2 + (partitionCount / brokerCount) * 0.001) / this.constraints.ramPerBrokerGB * 100;
    const memory = Math.min(memoryPerBroker, 100);

    // Disk: actual usage vs capacity
    const storagePerBroker = totalStorageGB / brokerCount;
    const disk = (storagePerBroker / 2000) * 100; // Assuming 2TB disks

    // Network: actual throughput vs bandwidth
    const networkPerBroker = totalThroughput / brokerCount;
    const network = (networkPerBroker / this.constraints.networkBandwidthMBps) * 100;

    // Partitions: actual count vs max
    const partitionsPerBroker = partitionCount / brokerCount;
    const partitions = (partitionsPerBroker / this.constraints.maxPartitionsPerBroker) * 100;

    return {
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory * 10) / 10,
      disk: Math.round(disk * 10) / 10,
      network: Math.round(network * 10) / 10,
      partitions: Math.round(partitions * 10) / 10,
    };
  }

  /**
   * Calculate throughput headroom
   */
  private calculateThroughputHeadroom(
    brokerCount: number,
    throughput: ThroughputRequirements
  ): number {
    const maxClusterThroughput = brokerCount * 100; // 100 MB/s per broker
    const actualThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    return Math.round(((maxClusterThroughput - actualThroughput) / maxClusterThroughput) * 100);
  }

  /**
   * Round up to next power of 2
   */
  private nextPowerOfTwo(n: number): number {
    if (n <= 1) return 1;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }
}

/**
 * Example Usage: Basic Capacity Planning
 *
 * ```typescript
 * const planner = new KafkaCapacityPlanner();
 *
 * const sizing = planner.calculateClusterSize(
 *   {
 *     producerThroughputMBps: 100,  // 100 MB/s producer throughput
 *     consumerThroughputMBps: 200,  // 200 MB/s consumer throughput (2x fanout)
 *     avgMessageSizeBytes: 1024,    // 1KB messages
 *   },
 *   {
 *     retentionHours: 168,           // 7 days retention
 *     replicationFactor: 3,          // Triple replication
 *     compressionRatio: 0.3,         // 70% compression
 *     growthBuffer: 1.5,             // 50% growth buffer
 *   },
 *   10 // 10 topics
 * );
 *
 * console.log(`Recommended: ${sizing.brokerCount} brokers`);
 * console.log(`Partitions: ${sizing.partitionCount}`);
 * console.log(`Storage per broker: ${sizing.storagePerBrokerGB.toFixed(1)} GB`);
 * console.log(`Throughput headroom: ${sizing.throughputHeadroom}%`);
 *
 * if (sizing.warnings.length > 0) {
 *   console.warn('Warnings:', sizing.warnings);
 * }
 * ```
 */

/**
 * Example Usage: Partition Optimization
 *
 * ```typescript
 * const planner = new KafkaCapacityPlanner();
 *
 * const partitioning = planner.calculatePartitionCount({
 *   producerThroughputMBps: 500,   // 500 MB/s peak
 *   consumerThroughputMBps: 500,
 *   avgMessageSizeBytes: 2048,
 * });
 *
 * console.log(`Recommended partitions: ${partitioning.partitionCount}`);
 * console.log(`Consumer parallelism: ${partitioning.consumerParallelism}`);
 * console.log('Reasoning:', partitioning.reasoning);
 * ```
 */

/**
 * Capacity Planning Best Practices:
 *
 * **Sizing Guidelines**:
 * - Start with 3 brokers minimum (fault tolerance)
 * - Target 70% resource utilization (headroom for spikes)
 * - Power-of-2 partition counts (even key distribution)
 * - Max 4000 partitions per broker (metadata overhead)
 * - Max 10GB per partition (fast recovery)
 *
 * **Throughput Estimates**:
 * - Producer: ~50 MB/s per partition
 * - Consumer: ~50 MB/s per partition
 * - Broker total: ~100 MB/s (in + out combined)
 *
 * **Storage Estimation**:
 * - Compression: 50-70% (Snappy/LZ4)
 * - Growth buffer: 50% (1.5x multiplier)
 * - Replication: 3x for production
 * - Disk utilization: Max 70%
 *
 * **Scaling Rules**:
 * - Add brokers when CPU > 80%
 * - Add brokers when network > 70%
 * - Add partitions when lag increases
 * - Rebalance when utilization uneven
 *
 * **Common Sizing Patterns**:
 * - **Small** (< 100 MB/s): 3 brokers, 8-16 partitions
 * - **Medium** (100-500 MB/s): 5-10 brokers, 32-64 partitions
 * - **Large** (500-1000 MB/s): 10-20 brokers, 128-256 partitions
 * - **XLarge** (> 1000 MB/s): 20+ brokers, 512+ partitions
 */

export default {
  KafkaCapacityPlanner,
};
