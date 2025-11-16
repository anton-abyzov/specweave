import { Kafka } from "kafkajs";
import { ClusterConfigManager } from "./cluster-config-manager";
class ClusterSwitcher {
  constructor(configManager) {
    this.contexts = /* @__PURE__ */ new Map();
    this.activeContext = null;
    this.configManager = configManager || new ClusterConfigManager();
  }
  /**
   * Get or create cluster context
   */
  async getContext(clusterId) {
    if (this.contexts.has(clusterId)) {
      return this.contexts.get(clusterId);
    }
    const config = this.configManager.getCluster(clusterId);
    if (!config) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }
    const kafkaConfig = this.buildKafkaConfig(config);
    const kafka = new Kafka(kafkaConfig);
    const context = {
      clusterId,
      config,
      kafka,
      consumers: /* @__PURE__ */ new Map()
    };
    this.contexts.set(clusterId, context);
    return context;
  }
  /**
   * Build kafkajs configuration from cluster config
   */
  buildKafkaConfig(config) {
    const kafkaConfig = {
      clientId: `kafka-client-${config.id}`,
      brokers: config.bootstrapServers
    };
    if (config.securityProtocol !== "PLAINTEXT") {
      if (config.securityProtocol === "SSL" || config.securityProtocol === "SASL_SSL") {
        kafkaConfig.ssl = { rejectUnauthorized: true };
      }
      if (config.securityProtocol.startsWith("SASL")) {
        kafkaConfig.sasl = {
          mechanism: config.saslMechanism || "PLAIN",
          username: config.saslUsername || "",
          password: config.saslPassword || ""
        };
      }
    }
    return kafkaConfig;
  }
  /**
   * Switch to a different cluster
   */
  async switch(clusterId) {
    console.log(`Switching to cluster: ${clusterId}`);
    const context = await this.getContext(clusterId);
    this.activeContext = context;
    this.configManager.setActiveCluster(clusterId);
    console.log(`Now connected to cluster: ${context.config.name} (${context.config.environment})`);
  }
  /**
   * Get active cluster ID
   */
  getActiveClusterId() {
    return this.activeContext?.clusterId || null;
  }
  /**
   * Get active cluster configuration
   */
  getActiveCluster() {
    return this.activeContext?.config || null;
  }
  /**
   * Get Admin client for active cluster
   */
  async getAdmin() {
    if (!this.activeContext) {
      throw new Error("No active cluster. Use switch() first.");
    }
    if (!this.activeContext.admin) {
      this.activeContext.admin = this.activeContext.kafka.admin();
      await this.activeContext.admin.connect();
    }
    return this.activeContext.admin;
  }
  /**
   * Get Producer for active cluster
   */
  async getProducer() {
    if (!this.activeContext) {
      throw new Error("No active cluster. Use switch() first.");
    }
    if (!this.activeContext.producer) {
      this.activeContext.producer = this.activeContext.kafka.producer();
      await this.activeContext.producer.connect();
    }
    return this.activeContext.producer;
  }
  /**
   * Get or create Consumer for active cluster
   */
  async getConsumer(groupId) {
    if (!this.activeContext) {
      throw new Error("No active cluster. Use switch() first.");
    }
    if (this.activeContext.consumers.has(groupId)) {
      return this.activeContext.consumers.get(groupId);
    }
    const consumer = this.activeContext.kafka.consumer({ groupId });
    await consumer.connect();
    this.activeContext.consumers.set(groupId, consumer);
    return consumer;
  }
  /**
   * Disconnect all connections for a specific cluster
   */
  async disconnectContext(context) {
    console.log(`Disconnecting cluster: ${context.clusterId}`);
    if (context.admin) {
      await context.admin.disconnect();
      context.admin = void 0;
    }
    if (context.producer) {
      await context.producer.disconnect();
      context.producer = void 0;
    }
    for (const [groupId, consumer] of context.consumers.entries()) {
      await consumer.disconnect();
    }
    context.consumers.clear();
  }
  /**
   * Disconnect all clusters
   */
  async disconnectAll() {
    for (const context of this.contexts.values()) {
      await this.disconnectContext(context);
    }
    this.contexts.clear();
    this.activeContext = null;
  }
  /**
   * List all available clusters
   */
  listClusters() {
    return this.configManager.getAllClusters();
  }
  /**
   * Get cluster health status
   */
  async getClusterHealth(clusterId) {
    const targetClusterId = clusterId || this.activeContext?.clusterId;
    if (!targetClusterId) {
      throw new Error("No cluster specified and no active cluster");
    }
    try {
      const context = await this.getContext(targetClusterId);
      const admin = context.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return {
        clusterId: targetClusterId,
        healthy: true
      };
    } catch (error) {
      return {
        clusterId: targetClusterId,
        healthy: false,
        error: error.message
      };
    }
  }
  /**
   * Execute operation on specific cluster (without switching context)
   */
  async executeOn(clusterId, operation) {
    const context = await this.getContext(clusterId);
    return operation(context.kafka);
  }
}
var cluster_switcher_default = ClusterSwitcher;
export {
  ClusterSwitcher,
  cluster_switcher_default as default
};
