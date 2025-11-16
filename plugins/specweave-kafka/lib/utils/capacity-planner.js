class KafkaCapacityPlanner {
  constructor(constraints = {}) {
    this.constraints = {
      maxPartitionsPerBroker: constraints.maxPartitionsPerBroker || 4e3,
      maxDiskUtilization: constraints.maxDiskUtilization || 70,
      networkBandwidthMBps: constraints.networkBandwidthMBps || 125,
      // 1Gbps
      cpuCoresPerBroker: constraints.cpuCoresPerBroker || 8,
      ramPerBrokerGB: constraints.ramPerBrokerGB || 32
    };
  }
  /**
   * Calculate optimal cluster sizing
   */
  calculateClusterSize(throughput, storage, topicCount = 1) {
    const partitioning = this.calculatePartitionCount(throughput);
    const storageCalc = this.calculateStorageRequirements(
      throughput,
      storage,
      partitioning.partitionCount
    );
    const brokerCountOptions = {
      throughput: this.calculateBrokersForThroughput(throughput),
      storage: this.calculateBrokersForStorage(storageCalc.totalStorageGB),
      partitions: this.calculateBrokersForPartitions(partitioning.partitionCount),
      network: this.calculateBrokersForNetwork(throughput)
    };
    const brokerCount = Math.max(
      brokerCountOptions.throughput,
      brokerCountOptions.storage,
      brokerCountOptions.partitions,
      brokerCountOptions.network,
      3
      // Minimum for production (quorum)
    );
    const utilization = this.calculateUtilization(
      brokerCount,
      partitioning.partitionCount,
      throughput,
      storageCalc.totalStorageGB
    );
    const warnings = [];
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
      warnings.push("Less than 3 brokers - not suitable for production (no fault tolerance)");
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
      warnings
    };
  }
  /**
   * Calculate optimal partition count
   */
  calculatePartitionCount(throughput) {
    const reasoning = [];
    const maxThroughputPerPartition = 50;
    const partitionsForProducerThroughput = Math.ceil(
      throughput.producerThroughputMBps / maxThroughputPerPartition
    );
    reasoning.push(
      `Producer throughput: ${throughput.producerThroughputMBps} MB/s \xF7 ${maxThroughputPerPartition} MB/s/partition = ${partitionsForProducerThroughput} partitions`
    );
    const partitionsForConsumerThroughput = Math.ceil(
      throughput.consumerThroughputMBps / maxThroughputPerPartition
    );
    reasoning.push(
      `Consumer throughput: ${throughput.consumerThroughputMBps} MB/s \xF7 ${maxThroughputPerPartition} MB/s/partition = ${partitionsForConsumerThroughput} partitions`
    );
    const targetPartitionSizeGB = 10;
    const minPartitions = Math.max(
      partitionsForProducerThroughput,
      partitionsForConsumerThroughput,
      1
      // At least 1 partition
    );
    const partitionCount = this.nextPowerOfTwo(minPartitions);
    reasoning.push(`Rounded to power of 2: ${partitionCount} partitions (for even distribution)`);
    return {
      partitionCount,
      maxThroughputPerPartition,
      consumerParallelism: partitionCount,
      partitionSizeGB: targetPartitionSizeGB,
      reasoning
    };
  }
  /**
   * Calculate storage requirements
   */
  calculateStorageRequirements(throughput, storage, partitionCount) {
    const compressionRatio = storage.compressionRatio || 0.3;
    const growthBuffer = storage.growthBuffer || 1.5;
    const dataRateMBps = throughput.producerThroughputMBps;
    const dataRateGBperHour = dataRateMBps * 3.6;
    const rawStorageGB = dataRateGBperHour * storage.retentionHours;
    const compressedStorageGB = rawStorageGB * compressionRatio;
    const replicatedStorageGB = compressedStorageGB * storage.replicationFactor;
    const totalStorageGB = replicatedStorageGB * growthBuffer;
    const storagePerPartitionGB = totalStorageGB / partitionCount;
    return {
      totalStorageGB,
      storagePerPartitionGB,
      rawStorageGB,
      compressedStorageGB
    };
  }
  /**
   * Calculate brokers needed for throughput
   */
  calculateBrokersForThroughput(throughput) {
    const maxBrokerThroughputMBps = 100;
    const totalThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    return Math.ceil(totalThroughput / maxBrokerThroughputMBps);
  }
  /**
   * Calculate brokers needed for storage
   */
  calculateBrokersForStorage(totalStorageGB) {
    const usableStoragePerBrokerGB = 2e3;
    const maxUtilization = this.constraints.maxDiskUtilization / 100;
    const effectiveStoragePerBroker = usableStoragePerBrokerGB * maxUtilization;
    return Math.ceil(totalStorageGB / effectiveStoragePerBroker);
  }
  /**
   * Calculate brokers needed for partition count
   */
  calculateBrokersForPartitions(partitionCount) {
    return Math.ceil(partitionCount / this.constraints.maxPartitionsPerBroker);
  }
  /**
   * Calculate brokers needed for network bandwidth
   */
  calculateBrokersForNetwork(throughput) {
    const totalNetworkMBps = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    const maxNetworkUtilization = 0.7;
    const effectiveBandwidth = this.constraints.networkBandwidthMBps * maxNetworkUtilization;
    return Math.ceil(totalNetworkMBps / effectiveBandwidth);
  }
  /**
   * Calculate resource utilization
   */
  calculateUtilization(brokerCount, partitionCount, throughput, totalStorageGB) {
    const totalThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    const cpuPerBroker = totalThroughput / brokerCount / 10 * 5;
    const cpu = Math.min(cpuPerBroker, 100);
    const memoryPerBroker = (2 + partitionCount / brokerCount * 1e-3) / this.constraints.ramPerBrokerGB * 100;
    const memory = Math.min(memoryPerBroker, 100);
    const storagePerBroker = totalStorageGB / brokerCount;
    const disk = storagePerBroker / 2e3 * 100;
    const networkPerBroker = totalThroughput / brokerCount;
    const network = networkPerBroker / this.constraints.networkBandwidthMBps * 100;
    const partitionsPerBroker = partitionCount / brokerCount;
    const partitions = partitionsPerBroker / this.constraints.maxPartitionsPerBroker * 100;
    return {
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory * 10) / 10,
      disk: Math.round(disk * 10) / 10,
      network: Math.round(network * 10) / 10,
      partitions: Math.round(partitions * 10) / 10
    };
  }
  /**
   * Calculate throughput headroom
   */
  calculateThroughputHeadroom(brokerCount, throughput) {
    const maxClusterThroughput = brokerCount * 100;
    const actualThroughput = throughput.producerThroughputMBps + throughput.consumerThroughputMBps;
    return Math.round((maxClusterThroughput - actualThroughput) / maxClusterThroughput * 100);
  }
  /**
   * Round up to next power of 2
   */
  nextPowerOfTwo(n) {
    if (n <= 1) return 1;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }
}
var capacity_planner_default = {
  KafkaCapacityPlanner
};
export {
  KafkaCapacityPlanner,
  capacity_planner_default as default
};
