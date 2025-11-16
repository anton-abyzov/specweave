class DiagramGenerator {
  /**
   * Generate data flow diagram
   */
  static generateDataFlow(options) {
    const lines = [];
    lines.push("```mermaid");
    lines.push("graph LR");
    for (const producer of options.producers) {
      const producerId = producer.name.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`    ${producerId}[${producer.name}]:::producer`);
      for (const topic of producer.topics) {
        const topicId = topic.replace(/[^a-zA-Z0-9]/g, "_");
        lines.push(`    ${producerId} -->|produce| T_${topicId}`);
      }
    }
    for (const topic of options.topics) {
      const topicId = topic.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`    T_${topicId}[(${topic})]:::topic`);
    }
    for (const consumer of options.consumers) {
      const consumerId = consumer.name.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`    ${consumerId}[${consumer.name}]:::consumer`);
      for (const topic of consumer.topics) {
        const topicId = topic.replace(/[^a-zA-Z0-9]/g, "_");
        lines.push(`    T_${topicId} -->|consume| ${consumerId}`);
      }
    }
    lines.push("");
    lines.push("    classDef producer fill:#90EE90,stroke:#228B22,stroke-width:2px");
    lines.push("    classDef topic fill:#87CEEB,stroke:#4682B4,stroke-width:2px");
    lines.push("    classDef consumer fill:#FFB6C1,stroke:#FF69B4,stroke-width:2px");
    lines.push("```");
    return lines.join("\n");
  }
  /**
   * Generate architecture diagram
   */
  static generateArchitecture(options) {
    const lines = [];
    lines.push("```mermaid");
    lines.push("graph TB");
    lines.push("    subgraph Kafka Cluster");
    for (let i = 1; i <= options.brokers; i++) {
      lines.push(`        B${i}[Broker ${i}]`);
    }
    lines.push("    end");
    if (options.zookeeper) {
      lines.push("    subgraph ZooKeeper Ensemble");
      lines.push("        ZK1[ZooKeeper 1]");
      lines.push("        ZK2[ZooKeeper 2]");
      lines.push("        ZK3[ZooKeeper 3]");
      lines.push("    end");
      for (let i = 1; i <= options.brokers; i++) {
        lines.push(`    B${i} --> ZK1`);
      }
    }
    if (options.schemaRegistry) {
      lines.push("    SR[Schema Registry]:::schemaRegistry");
      lines.push("    SR --> B1");
    }
    if (options.connectCluster) {
      lines.push("    subgraph Kafka Connect Cluster");
      lines.push("        C1[Connect Worker 1]");
      lines.push("        C2[Connect Worker 2]");
      lines.push("    end");
      lines.push("    C1 --> B1");
      lines.push("    C2 --> B1");
    }
    if (options.ksqlDB) {
      lines.push("    KSQL[ksqlDB Server]:::ksqlDB");
      lines.push("    KSQL --> B1");
    }
    lines.push("");
    lines.push("    classDef schemaRegistry fill:#FFA500,stroke:#FF8C00,stroke-width:2px");
    lines.push("    classDef ksqlDB fill:#9370DB,stroke:#8B008B,stroke-width:2px");
    lines.push("```");
    return lines.join("\n");
  }
  /**
   * Generate multi-DC replication diagram
   */
  static generateMultiDCReplication(options) {
    const lines = [];
    lines.push("```mermaid");
    lines.push("graph LR");
    if (options.topology === "active-passive") {
      lines.push(`    DC1[${options.dataCenters[0]}<br/>Primary]:::primary`);
      lines.push(`    DC2[${options.dataCenters[1]}<br/>Standby]:::standby`);
      lines.push("    DC1 -->|MirrorMaker 2| DC2");
      lines.push("    Producers[Producers] --> DC1");
      lines.push("    Consumers[Consumers] --> DC1");
    } else {
      lines.push(`    DC1[${options.dataCenters[0]}<br/>Active]:::active`);
      lines.push(`    DC2[${options.dataCenters[1]}<br/>Active]:::active`);
      lines.push("    DC1 <-->|Bidirectional<br/>Replication| DC2");
      lines.push("    Producers1[Producers] --> DC1");
      lines.push("    Producers2[Producers] --> DC2");
      lines.push("    Consumers1[Consumers] --> DC1");
      lines.push("    Consumers2[Consumers] --> DC2");
    }
    lines.push("");
    lines.push("    classDef primary fill:#90EE90,stroke:#228B22,stroke-width:3px");
    lines.push("    classDef standby fill:#D3D3D3,stroke:#808080,stroke-width:2px");
    lines.push("    classDef active fill:#87CEEB,stroke:#4682B4,stroke-width:3px");
    lines.push("```");
    return lines.join("\n");
  }
}
var diagram_generator_default = DiagramGenerator;
export {
  DiagramGenerator,
  diagram_generator_default as default
};
