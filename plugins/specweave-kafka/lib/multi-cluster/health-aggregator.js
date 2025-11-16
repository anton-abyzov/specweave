class HealthAggregator {
  constructor(switcher) {
    this.switcher = switcher;
  }
  /**
   * Collect health metrics for a single cluster
   */
  async collectClusterHealth(clusterId) {
    try {
      const clusters = this.switcher.listClusters();
      const clusterConfig = clusters.find((c) => c.id === clusterId);
      if (!clusterConfig) {
        throw new Error(`Cluster "${clusterId}" not found`);
      }
      const metrics = await this.switcher.executeOn(clusterId, async (kafka) => {
        const admin = kafka.admin();
        await admin.connect();
        try {
          const cluster = await admin.describeCluster();
          const topics = await admin.listTopics();
          const groups = await admin.listGroups();
          const metadata = await admin.fetchTopicMetadata({ topics });
          let totalPartitions = 0;
          let underReplicatedPartitions = 0;
          let offlinePartitions = 0;
          for (const topic of metadata.topics) {
            for (const partition of topic.partitions) {
              totalPartitions++;
              if (partition.isr.length < partition.replicas.length) {
                underReplicatedPartitions++;
              }
              if (partition.isr.length === 0) {
                offlinePartitions++;
              }
            }
          }
          return {
            clusterId,
            clusterName: clusterConfig.name,
            environment: clusterConfig.environment,
            status: this.determineStatus(underReplicatedPartitions, offlinePartitions),
            brokerCount: cluster.brokers.length,
            onlineBrokerCount: cluster.brokers.length,
            // All in describeCluster are online
            topicCount: topics.length,
            partitionCount: totalPartitions,
            underReplicatedPartitions,
            offlinePartitions,
            consumerGroupCount: groups.groups.length,
            controllerId: cluster.controller ? Number(cluster.controller) : void 0,
            lastCheck: /* @__PURE__ */ new Date()
          };
        } finally {
          await admin.disconnect();
        }
      });
      return metrics;
    } catch (error) {
      const clusters = this.switcher.listClusters();
      const clusterConfig = clusters.find((c) => c.id === clusterId);
      return {
        clusterId,
        clusterName: clusterConfig.name,
        environment: clusterConfig.environment,
        status: "down",
        brokerCount: 0,
        onlineBrokerCount: 0,
        topicCount: 0,
        partitionCount: 0,
        underReplicatedPartitions: 0,
        offlinePartitions: 0,
        consumerGroupCount: 0,
        lastCheck: /* @__PURE__ */ new Date(),
        error: error.message
      };
    }
  }
  /**
   * Determine cluster status based on metrics
   */
  determineStatus(underReplicatedPartitions, offlinePartitions) {
    if (offlinePartitions > 0) {
      return "down";
    }
    if (underReplicatedPartitions > 0) {
      return "degraded";
    }
    return "healthy";
  }
  /**
   * Collect health metrics for all clusters
   */
  async collectAllClusters() {
    const clusters = this.switcher.listClusters();
    const promises = clusters.map((c) => this.collectClusterHealth(c.id));
    return Promise.all(promises);
  }
  /**
   * Aggregate health across all clusters
   */
  async aggregateHealth() {
    const clusterMetrics = await this.collectAllClusters();
    let totalBrokers = 0;
    let totalTopics = 0;
    let totalPartitions = 0;
    let totalUnderReplicatedPartitions = 0;
    let healthyClusters = 0;
    let degradedClusters = 0;
    let downClusters = 0;
    for (const metrics of clusterMetrics) {
      totalBrokers += metrics.brokerCount;
      totalTopics += metrics.topicCount;
      totalPartitions += metrics.partitionCount;
      totalUnderReplicatedPartitions += metrics.underReplicatedPartitions;
      if (metrics.status === "healthy") healthyClusters++;
      else if (metrics.status === "degraded") degradedClusters++;
      else if (metrics.status === "down") downClusters++;
    }
    return {
      totalClusters: clusterMetrics.length,
      healthyClusters,
      degradedClusters,
      downClusters,
      totalBrokers,
      totalTopics,
      totalPartitions,
      totalUnderReplicatedPartitions,
      clusterMetrics,
      lastUpdate: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Get health summary as formatted text
   */
  async getHealthSummaryText() {
    const summary = await this.aggregateHealth();
    const lines = [];
    lines.push("=== Kafka Multi-Cluster Health Summary ===");
    lines.push("");
    lines.push(`Total Clusters: ${summary.totalClusters}`);
    lines.push(`  \u2713 Healthy:  ${summary.healthyClusters}`);
    lines.push(`  \u26A0 Degraded: ${summary.degradedClusters}`);
    lines.push(`  \u2717 Down:     ${summary.downClusters}`);
    lines.push("");
    lines.push(`Total Brokers:  ${summary.totalBrokers}`);
    lines.push(`Total Topics:   ${summary.totalTopics}`);
    lines.push(`Total Partitions: ${summary.totalPartitions}`);
    if (summary.totalUnderReplicatedPartitions > 0) {
      lines.push(`\u26A0 Under-Replicated Partitions: ${summary.totalUnderReplicatedPartitions}`);
    }
    lines.push("");
    lines.push("=== Per-Cluster Status ===");
    for (const cluster of summary.clusterMetrics) {
      const icon = cluster.status === "healthy" ? "\u2713" : cluster.status === "degraded" ? "\u26A0" : "\u2717";
      lines.push("");
      lines.push(
        `${icon} ${cluster.clusterName} (${cluster.environment}) - ${cluster.status.toUpperCase()}`
      );
      lines.push(`  Brokers: ${cluster.onlineBrokerCount}/${cluster.brokerCount}`);
      lines.push(`  Topics: ${cluster.topicCount}`);
      lines.push(`  Partitions: ${cluster.partitionCount}`);
      if (cluster.underReplicatedPartitions > 0) {
        lines.push(`  \u26A0 Under-Replicated: ${cluster.underReplicatedPartitions}`);
      }
      if (cluster.offlinePartitions > 0) {
        lines.push(`  \u2717 Offline: ${cluster.offlinePartitions}`);
      }
      if (cluster.error) {
        lines.push(`  Error: ${cluster.error}`);
      }
    }
    lines.push("");
    lines.push(`Last Updated: ${summary.lastUpdate.toISOString()}`);
    return lines.join("\n");
  }
  /**
   * Check if any cluster is unhealthy
   */
  async hasUnhealthyClusters() {
    const summary = await this.aggregateHealth();
    return summary.degradedClusters > 0 || summary.downClusters > 0;
  }
  /**
   * Get list of unhealthy clusters
   */
  async getUnhealthyClusters() {
    const clusterMetrics = await this.collectAllClusters();
    return clusterMetrics.filter((c) => c.status !== "healthy");
  }
}
var health_aggregator_default = HealthAggregator;
export {
  HealthAggregator,
  health_aggregator_default as default
};
