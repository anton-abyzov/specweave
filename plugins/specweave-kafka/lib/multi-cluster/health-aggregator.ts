/**
 * Health Aggregator
 *
 * Aggregates health metrics across multiple Kafka clusters
 *
 * @module health-aggregator
 */

import { Admin } from 'kafkajs';
import { ClusterSwitcher } from './cluster-switcher';
import { ClusterConfig } from './cluster-config-manager';

/**
 * Cluster Health Metrics
 */
export interface ClusterHealthMetrics {
  /** Cluster ID */
  clusterId: string;
  /** Cluster name */
  clusterName: string;
  /** Environment */
  environment: string;
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'down';
  /** Number of brokers */
  brokerCount: number;
  /** Number of online brokers */
  onlineBrokerCount: number;
  /** Number of topics */
  topicCount: number;
  /** Number of partitions */
  partitionCount: number;
  /** Under-replicated partitions */
  underReplicatedPartitions: number;
  /** Offline partitions */
  offlinePartitions: number;
  /** Consumer groups */
  consumerGroupCount: number;
  /** Controller ID */
  controllerId?: number;
  /** Last check timestamp */
  lastCheck: Date;
  /** Error message (if down) */
  error?: string;
}

/**
 * Aggregated Health Summary
 */
export interface AggregatedHealthSummary {
  /** Total clusters */
  totalClusters: number;
  /** Healthy clusters */
  healthyClusters: number;
  /** Degraded clusters */
  degradedClusters: number;
  /** Down clusters */
  downClusters: number;
  /** Total brokers across all clusters */
  totalBrokers: number;
  /** Total topics across all clusters */
  totalTopics: number;
  /** Total partitions across all clusters */
  totalPartitions: number;
  /** Total under-replicated partitions across all clusters */
  totalUnderReplicatedPartitions: number;
  /** Per-cluster metrics */
  clusterMetrics: ClusterHealthMetrics[];
  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Health Aggregator
 *
 * Collects and aggregates health metrics from multiple Kafka clusters
 */
export class HealthAggregator {
  private switcher: ClusterSwitcher;

  constructor(switcher: ClusterSwitcher) {
    this.switcher = switcher;
  }

  /**
   * Collect health metrics for a single cluster
   */
  async collectClusterHealth(clusterId: string): Promise<ClusterHealthMetrics> {
    try {
      // Get cluster config
      const clusters = this.switcher.listClusters();
      const clusterConfig = clusters.find((c) => c.id === clusterId);
      if (!clusterConfig) {
        throw new Error(`Cluster "${clusterId}" not found`);
      }

      // Execute health check on this cluster
      const metrics = await this.switcher.executeOn(clusterId, async (kafka) => {
        const admin = kafka.admin();
        await admin.connect();

        try {
          // Get cluster metadata
          const cluster = await admin.describeCluster();
          const topics = await admin.listTopics();
          const groups = await admin.listGroups();

          // Get topic metadata (for partition counts)
          const metadata = await admin.fetchTopicMetadata({ topics });

          // Calculate partition counts
          let totalPartitions = 0;
          let underReplicatedPartitions = 0;
          let offlinePartitions = 0;

          for (const topic of metadata.topics) {
            for (const partition of topic.partitions) {
              totalPartitions++;

              // Under-replicated: ISR < replicas
              if (partition.isr.length < partition.replicas.length) {
                underReplicatedPartitions++;
              }

              // Offline: ISR empty
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
            onlineBrokerCount: cluster.brokers.length, // All in describeCluster are online
            topicCount: topics.length,
            partitionCount: totalPartitions,
            underReplicatedPartitions,
            offlinePartitions,
            consumerGroupCount: groups.groups.length,
            controllerId: cluster.controller ? Number(cluster.controller) : undefined,
            lastCheck: new Date(),
          };
        } finally {
          await admin.disconnect();
        }
      });

      return metrics as ClusterHealthMetrics;
    } catch (error) {
      // Return minimal metrics with down status
      const clusters = this.switcher.listClusters();
      const clusterConfig = clusters.find((c) => c.id === clusterId)!;

      return {
        clusterId,
        clusterName: clusterConfig.name,
        environment: clusterConfig.environment,
        status: 'down',
        brokerCount: 0,
        onlineBrokerCount: 0,
        topicCount: 0,
        partitionCount: 0,
        underReplicatedPartitions: 0,
        offlinePartitions: 0,
        consumerGroupCount: 0,
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Determine cluster status based on metrics
   */
  private determineStatus(
    underReplicatedPartitions: number,
    offlinePartitions: number
  ): 'healthy' | 'degraded' | 'down' {
    if (offlinePartitions > 0) {
      return 'down'; // Any offline partitions = cluster down
    }

    if (underReplicatedPartitions > 0) {
      return 'degraded'; // Under-replicated = degraded
    }

    return 'healthy';
  }

  /**
   * Collect health metrics for all clusters
   */
  async collectAllClusters(): Promise<ClusterHealthMetrics[]> {
    const clusters = this.switcher.listClusters();
    const promises = clusters.map((c) => this.collectClusterHealth(c.id));

    return Promise.all(promises);
  }

  /**
   * Aggregate health across all clusters
   */
  async aggregateHealth(): Promise<AggregatedHealthSummary> {
    const clusterMetrics = await this.collectAllClusters();

    // Calculate totals
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

      if (metrics.status === 'healthy') healthyClusters++;
      else if (metrics.status === 'degraded') degradedClusters++;
      else if (metrics.status === 'down') downClusters++;
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
      lastUpdate: new Date(),
    };
  }

  /**
   * Get health summary as formatted text
   */
  async getHealthSummaryText(): Promise<string> {
    const summary = await this.aggregateHealth();

    const lines: string[] = [];
    lines.push('=== Kafka Multi-Cluster Health Summary ===');
    lines.push('');
    lines.push(`Total Clusters: ${summary.totalClusters}`);
    lines.push(`  ✓ Healthy:  ${summary.healthyClusters}`);
    lines.push(`  ⚠ Degraded: ${summary.degradedClusters}`);
    lines.push(`  ✗ Down:     ${summary.downClusters}`);
    lines.push('');
    lines.push(`Total Brokers:  ${summary.totalBrokers}`);
    lines.push(`Total Topics:   ${summary.totalTopics}`);
    lines.push(`Total Partitions: ${summary.totalPartitions}`);
    if (summary.totalUnderReplicatedPartitions > 0) {
      lines.push(`⚠ Under-Replicated Partitions: ${summary.totalUnderReplicatedPartitions}`);
    }
    lines.push('');
    lines.push('=== Per-Cluster Status ===');

    for (const cluster of summary.clusterMetrics) {
      const icon =
        cluster.status === 'healthy' ? '✓' : cluster.status === 'degraded' ? '⚠' : '✗';

      lines.push('');
      lines.push(
        `${icon} ${cluster.clusterName} (${cluster.environment}) - ${cluster.status.toUpperCase()}`
      );
      lines.push(`  Brokers: ${cluster.onlineBrokerCount}/${cluster.brokerCount}`);
      lines.push(`  Topics: ${cluster.topicCount}`);
      lines.push(`  Partitions: ${cluster.partitionCount}`);

      if (cluster.underReplicatedPartitions > 0) {
        lines.push(`  ⚠ Under-Replicated: ${cluster.underReplicatedPartitions}`);
      }

      if (cluster.offlinePartitions > 0) {
        lines.push(`  ✗ Offline: ${cluster.offlinePartitions}`);
      }

      if (cluster.error) {
        lines.push(`  Error: ${cluster.error}`);
      }
    }

    lines.push('');
    lines.push(`Last Updated: ${summary.lastUpdate.toISOString()}`);

    return lines.join('\n');
  }

  /**
   * Check if any cluster is unhealthy
   */
  async hasUnhealthyClusters(): Promise<boolean> {
    const summary = await this.aggregateHealth();
    return summary.degradedClusters > 0 || summary.downClusters > 0;
  }

  /**
   * Get list of unhealthy clusters
   */
  async getUnhealthyClusters(): Promise<ClusterHealthMetrics[]> {
    const clusterMetrics = await this.collectAllClusters();
    return clusterMetrics.filter((c) => c.status !== 'healthy');
  }
}

/**
 * Example Usage: Health Check All Clusters
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 * const aggregator = new HealthAggregator(switcher);
 *
 * // Get aggregated health summary
 * const summary = await aggregator.aggregateHealth();
 * console.log(`Total clusters: ${summary.totalClusters}`);
 * console.log(`Healthy: ${summary.healthyClusters}`);
 * console.log(`Degraded: ${summary.degradedClusters}`);
 * console.log(`Down: ${summary.downClusters}`);
 *
 * // Print formatted summary
 * const text = await aggregator.getHealthSummaryText();
 * console.log(text);
 * ```
 */

/**
 * Example Usage: Alert on Unhealthy Clusters
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 * const aggregator = new HealthAggregator(switcher);
 *
 * // Check for unhealthy clusters
 * if (await aggregator.hasUnhealthyClusters()) {
 *   const unhealthy = await aggregator.getUnhealthyClusters();
 *   for (const cluster of unhealthy) {
 *     console.error(`⚠ ${cluster.clusterName} is ${cluster.status}`);
 *     console.error(`  Under-replicated: ${cluster.underReplicatedPartitions}`);
 *     console.error(`  Offline: ${cluster.offlinePartitions}`);
 *   }
 *   // Send alert to PagerDuty, Slack, etc.
 * }
 * ```
 */

/**
 * Example Usage: Scheduled Health Monitoring
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 * const aggregator = new HealthAggregator(switcher);
 *
 * // Run health check every 5 minutes
 * setInterval(async () => {
 *   const summary = await aggregator.aggregateHealth();
 *
 *   // Export to Prometheus (push gateway)
 *   pushToPrometheus('kafka_clusters_total', summary.totalClusters);
 *   pushToPrometheus('kafka_clusters_healthy', summary.healthyClusters);
 *   pushToPrometheus('kafka_clusters_degraded', summary.degradedClusters);
 *   pushToPrometheus('kafka_clusters_down', summary.downClusters);
 *
 *   // Alert if any cluster is down
 *   if (summary.downClusters > 0) {
 *     sendSlackAlert(`⚠ ${summary.downClusters} Kafka cluster(s) down!`);
 *   }
 * }, 5 * 60 * 1000); // 5 minutes
 * ```
 */

export default HealthAggregator;
