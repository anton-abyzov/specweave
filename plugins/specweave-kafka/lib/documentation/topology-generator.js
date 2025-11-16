class TopologyGenerator {
  /**
   * Generate cluster topology documentation
   */
  static async generate(admin) {
    const cluster = await admin.describeCluster();
    const allTopics = await admin.listTopics();
    const topicMetadata = await admin.fetchTopicMetadata({ topics: allTopics });
    const topicConfigs = await admin.fetchTopicOffsets(allTopics.slice(0, 10));
    const topics = [];
    let totalPartitions = 0;
    const underReplicatedPartitions = [];
    for (const topicData of topicMetadata.topics) {
      const partitionCount = topicData.partitions.length;
      totalPartitions += partitionCount;
      const replicationFactor = topicData.partitions.length > 0 ? topicData.partitions[0].replicas.length : 0;
      topics.push({
        name: topicData.name,
        partitions: partitionCount,
        replicationFactor,
        configs: {},
        // Would fetch from describeConfigs in real implementation
        isInternal: topicData.name.startsWith("__") || topicData.name.startsWith("_")
      });
      for (const partition of topicData.partitions) {
        if (partition.isr.length < partition.replicas.length) {
          underReplicatedPartitions.push({
            topic: topicData.name,
            partition: partition.partitionId,
            leader: partition.leader,
            isr: partition.isr.map(Number),
            replicas: partition.replicas.map(Number)
          });
        }
      }
    }
    const topology = {
      clusterId: cluster.clusterId,
      controller: Number(cluster.controller),
      brokers: cluster.brokers.map((broker) => ({
        nodeId: broker.nodeId,
        host: broker.host,
        port: broker.port,
        rack: broker.rack
      })),
      topics,
      totalPartitions,
      underReplicatedPartitions,
      generatedAt: /* @__PURE__ */ new Date()
    };
    return topology;
  }
  /**
   * Format topology as Markdown
   */
  static formatAsMarkdown(topology) {
    const lines = [];
    lines.push("# Kafka Cluster Topology");
    lines.push("");
    lines.push(`**Cluster ID**: ${topology.clusterId}`);
    lines.push(`**Controller**: Broker ${topology.controller}`);
    lines.push(`**Generated**: ${topology.generatedAt.toISOString()}`);
    lines.push("");
    lines.push("## Brokers");
    lines.push("");
    lines.push("| Broker ID | Host | Port | Rack |");
    lines.push("|-----------|------|------|------|");
    for (const broker of topology.brokers) {
      lines.push(
        `| ${broker.nodeId} | ${broker.host} | ${broker.port} | ${broker.rack || "N/A"} |`
      );
    }
    lines.push("");
    lines.push("## Topics");
    lines.push("");
    lines.push(`**Total Topics**: ${topology.topics.length}`);
    lines.push(`**Total Partitions**: ${topology.totalPartitions}`);
    lines.push("");
    lines.push("### Topic List");
    lines.push("");
    lines.push("| Topic Name | Partitions | Replication Factor | Internal |");
    lines.push("|------------|------------|-------------------|----------|");
    const sortedTopics = [...topology.topics].sort((a, b) => a.name.localeCompare(b.name));
    for (const topic of sortedTopics) {
      lines.push(
        `| ${topic.name} | ${topic.partitions} | ${topic.replicationFactor} | ${topic.isInternal ? "Yes" : "No"} |`
      );
    }
    lines.push("");
    if (topology.underReplicatedPartitions.length > 0) {
      lines.push("## \u26A0\uFE0F  Under-Replicated Partitions");
      lines.push("");
      lines.push("| Topic | Partition | Leader | ISR | Replicas |");
      lines.push("|-------|-----------|--------|-----|----------|");
      for (const partition of topology.underReplicatedPartitions) {
        lines.push(
          `| ${partition.topic} | ${partition.partition} | ${partition.leader} | ${partition.isr.join(", ")} | ${partition.replicas.join(", ")} |`
        );
      }
      lines.push("");
    }
    return lines.join("\n");
  }
  /**
   * Format topology as JSON
   */
  static formatAsJSON(topology) {
    return JSON.stringify(topology, null, 2);
  }
  /**
   * Generate Mermaid diagram for cluster topology
   */
  static generateMermaidDiagram(topology) {
    const lines = [];
    lines.push("```mermaid");
    lines.push("graph TB");
    lines.push("    subgraph Kafka Cluster");
    for (const broker of topology.brokers) {
      const isController = broker.nodeId === topology.controller;
      const shape = isController ? "[Broker " : "(Broker ";
      const endShape = isController ? "]" : ")";
      lines.push(
        `        B${broker.nodeId}${shape}${broker.nodeId}<br/>${broker.host}:${broker.port}${endShape}`
      );
    }
    const sampleTopics = topology.topics.filter((t) => !t.isInternal).slice(0, 10);
    for (const topic of sampleTopics) {
      const topicId = topic.name.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`        T_${topicId}[${topic.name}<br/>${topic.partitions} partitions]`);
      for (const broker of topology.brokers.slice(0, 3)) {
        lines.push(`        T_${topicId} --> B${broker.nodeId}`);
      }
    }
    lines.push("    end");
    lines.push("```");
    return lines.join("\n");
  }
}
var topology_generator_default = TopologyGenerator;
export {
  TopologyGenerator,
  topology_generator_default as default
};
