/**
 * Topology Generator
 *
 * Generates cluster topology documentation from Kafka metadata
 *
 * @module topology-generator
 */

import { Admin } from 'kafkajs';

/**
 * Broker Metadata
 */
export interface BrokerMetadata {
  /** Broker ID */
  nodeId: number;
  /** Hostname */
  host: string;
  /** Port */
  port: number;
  /** Rack ID (optional) */
  rack?: string;
}

/**
 * Topic Metadata
 */
export interface TopicMetadata {
  /** Topic name */
  name: string;
  /** Number of partitions */
  partitions: number;
  /** Replication factor */
  replicationFactor: number;
  /** Topic configurations */
  configs: Record<string, string>;
  /** Is internal topic? */
  isInternal: boolean;
}

/**
 * Partition Details
 */
export interface PartitionDetails {
  /** Topic name */
  topic: string;
  /** Partition ID */
  partition: number;
  /** Leader broker ID */
  leader: number;
  /** In-sync replicas */
  isr: number[];
  /** All replicas */
  replicas: number[];
}

/**
 * Cluster Topology
 */
export interface ClusterTopology {
  /** Cluster ID */
  clusterId: string;
  /** Controller broker ID */
  controller: number;
  /** Brokers */
  brokers: BrokerMetadata[];
  /** Topics */
  topics: TopicMetadata[];
  /** Total partitions */
  totalPartitions: number;
  /** Under-replicated partitions */
  underReplicatedPartitions: PartitionDetails[];
  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Topology Generator
 *
 * Extracts and formats Kafka cluster topology information
 */
export class TopologyGenerator {
  /**
   * Generate cluster topology documentation
   */
  static async generate(admin: Admin): Promise<ClusterTopology> {
    // Get cluster metadata
    const cluster = await admin.describeCluster();

    // Get all topics
    const allTopics = await admin.listTopics();

    // Get topic metadata
    const topicMetadata = await admin.fetchTopicMetadata({ topics: allTopics });

    // Get topic configurations
    const topicConfigs = await admin.fetchTopicOffsets(allTopics.slice(0, 10)); // Sample

    // Extract topics
    const topics: TopicMetadata[] = [];
    let totalPartitions = 0;
    const underReplicatedPartitions: PartitionDetails[] = [];

    for (const topicData of topicMetadata.topics) {
      const partitionCount = topicData.partitions.length;
      totalPartitions += partitionCount;

      // Calculate replication factor (from first partition)
      const replicationFactor =
        topicData.partitions.length > 0 ? topicData.partitions[0].replicas.length : 0;

      topics.push({
        name: topicData.name,
        partitions: partitionCount,
        replicationFactor,
        configs: {}, // Would fetch from describeConfigs in real implementation
        isInternal: topicData.name.startsWith('__') || topicData.name.startsWith('_'),
      });

      // Detect under-replicated partitions
      for (const partition of topicData.partitions) {
        if (partition.isr.length < partition.replicas.length) {
          underReplicatedPartitions.push({
            topic: topicData.name,
            partition: partition.partitionId,
            leader: partition.leader,
            isr: partition.isr.map(Number),
            replicas: partition.replicas.map(Number),
          });
        }
      }
    }

    // Build topology
    const topology: ClusterTopology = {
      clusterId: cluster.clusterId,
      controller: Number(cluster.controller),
      brokers: cluster.brokers.map((broker) => ({
        nodeId: broker.nodeId,
        host: broker.host,
        port: broker.port,
        rack: broker.rack,
      })),
      topics,
      totalPartitions,
      underReplicatedPartitions,
      generatedAt: new Date(),
    };

    return topology;
  }

  /**
   * Format topology as Markdown
   */
  static formatAsMarkdown(topology: ClusterTopology): string {
    const lines: string[] = [];

    lines.push('# Kafka Cluster Topology');
    lines.push('');
    lines.push(`**Cluster ID**: ${topology.clusterId}`);
    lines.push(`**Controller**: Broker ${topology.controller}`);
    lines.push(`**Generated**: ${topology.generatedAt.toISOString()}`);
    lines.push('');

    // Brokers section
    lines.push('## Brokers');
    lines.push('');
    lines.push('| Broker ID | Host | Port | Rack |');
    lines.push('|-----------|------|------|------|');
    for (const broker of topology.brokers) {
      lines.push(
        `| ${broker.nodeId} | ${broker.host} | ${broker.port} | ${broker.rack || 'N/A'} |`
      );
    }
    lines.push('');

    // Topics section
    lines.push('## Topics');
    lines.push('');
    lines.push(`**Total Topics**: ${topology.topics.length}`);
    lines.push(`**Total Partitions**: ${topology.totalPartitions}`);
    lines.push('');
    lines.push('### Topic List');
    lines.push('');
    lines.push('| Topic Name | Partitions | Replication Factor | Internal |');
    lines.push('|------------|------------|-------------------|----------|');

    // Sort topics by name
    const sortedTopics = [...topology.topics].sort((a, b) => a.name.localeCompare(b.name));

    for (const topic of sortedTopics) {
      lines.push(
        `| ${topic.name} | ${topic.partitions} | ${topic.replicationFactor} | ${topic.isInternal ? 'Yes' : 'No'} |`
      );
    }
    lines.push('');

    // Under-replicated partitions section
    if (topology.underReplicatedPartitions.length > 0) {
      lines.push('## ⚠️  Under-Replicated Partitions');
      lines.push('');
      lines.push('| Topic | Partition | Leader | ISR | Replicas |');
      lines.push('|-------|-----------|--------|-----|----------|');

      for (const partition of topology.underReplicatedPartitions) {
        lines.push(
          `| ${partition.topic} | ${partition.partition} | ${partition.leader} | ${partition.isr.join(', ')} | ${partition.replicas.join(', ')} |`
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format topology as JSON
   */
  static formatAsJSON(topology: ClusterTopology): string {
    return JSON.stringify(topology, null, 2);
  }

  /**
   * Generate Mermaid diagram for cluster topology
   */
  static generateMermaidDiagram(topology: ClusterTopology): string {
    const lines: string[] = [];

    lines.push('```mermaid');
    lines.push('graph TB');
    lines.push('    subgraph Kafka Cluster');

    // Brokers
    for (const broker of topology.brokers) {
      const isController = broker.nodeId === topology.controller;
      const shape = isController ? '[Broker ' : '(Broker ';
      const endShape = isController ? ']' : ')';
      lines.push(
        `        B${broker.nodeId}${shape}${broker.nodeId}<br/>${broker.host}:${broker.port}${endShape}`
      );
    }

    // Topics (sample - limit to 10 for readability)
    const sampleTopics = topology.topics.filter((t) => !t.isInternal).slice(0, 10);

    for (const topic of sampleTopics) {
      const topicId = topic.name.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`        T_${topicId}[${topic.name}<br/>${topic.partitions} partitions]`);

      // Connect topic to brokers (simplified)
      for (const broker of topology.brokers.slice(0, 3)) {
        lines.push(`        T_${topicId} --> B${broker.nodeId}`);
      }
    }

    lines.push('    end');
    lines.push('```');

    return lines.join('\n');
  }
}

/**
 * Example Usage: Generate Topology Documentation
 *
 * ```typescript
 * import { Kafka } from 'kafkajs';
 * import { TopologyGenerator } from './topology-generator';
 *
 * const kafka = new Kafka({ brokers: ['localhost:9092'] });
 * const admin = kafka.admin();
 * await admin.connect();
 *
 * // Generate topology
 * const topology = await TopologyGenerator.generate(admin);
 *
 * // Format as Markdown
 * const markdown = TopologyGenerator.formatAsMarkdown(topology);
 * console.log(markdown);
 *
 * // Generate Mermaid diagram
 * const diagram = TopologyGenerator.generateMermaidDiagram(topology);
 * console.log(diagram);
 *
 * await admin.disconnect();
 * ```
 */

export default TopologyGenerator;
