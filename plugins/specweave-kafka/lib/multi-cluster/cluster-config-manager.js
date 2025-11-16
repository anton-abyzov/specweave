import * as fs from "fs";
import * as path from "path";
class ClusterConfigManager {
  constructor(configFilePath = path.join(process.cwd(), ".kafka-clusters.json")) {
    this.configFilePath = configFilePath;
    this.config = this.loadConfig();
  }
  /**
   * Load configuration from file
   */
  loadConfig() {
    if (fs.existsSync(this.configFilePath)) {
      const data = fs.readFileSync(this.configFilePath, "utf-8");
      return JSON.parse(data);
    }
    return {
      activeClusterId: "dev",
      clusters: [
        {
          id: "dev",
          name: "Development",
          environment: "dev",
          bootstrapServers: ["localhost:9092"],
          securityProtocol: "PLAINTEXT",
          cloudProvider: "Self-Hosted"
        }
      ]
    };
  }
  /**
   * Save configuration to file
   */
  saveConfig() {
    fs.writeFileSync(
      this.configFilePath,
      JSON.stringify(this.config, null, 2),
      "utf-8"
    );
  }
  /**
   * Add cluster configuration
   */
  addCluster(cluster) {
    if (this.config.clusters.some((c) => c.id === cluster.id)) {
      throw new Error(`Cluster with ID "${cluster.id}" already exists`);
    }
    this.config.clusters.push(cluster);
    this.saveConfig();
  }
  /**
   * Update cluster configuration
   */
  updateCluster(clusterId, updates) {
    const index = this.config.clusters.findIndex((c) => c.id === clusterId);
    if (index === -1) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }
    this.config.clusters[index] = {
      ...this.config.clusters[index],
      ...updates,
      id: clusterId
      // Prevent ID change
    };
    this.saveConfig();
  }
  /**
   * Remove cluster configuration
   */
  removeCluster(clusterId) {
    if (clusterId === this.config.activeClusterId) {
      throw new Error(`Cannot remove active cluster "${clusterId}". Switch to another cluster first.`);
    }
    const index = this.config.clusters.findIndex((c) => c.id === clusterId);
    if (index === -1) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }
    this.config.clusters.splice(index, 1);
    this.saveConfig();
  }
  /**
   * Get cluster configuration
   */
  getCluster(clusterId) {
    return this.config.clusters.find((c) => c.id === clusterId);
  }
  /**
   * Get all clusters
   */
  getAllClusters() {
    return [...this.config.clusters];
  }
  /**
   * Get clusters by environment
   */
  getClustersByEnvironment(environment) {
    return this.config.clusters.filter((c) => c.environment === environment);
  }
  /**
   * Get active cluster ID
   */
  getActiveClusterId() {
    return this.config.activeClusterId;
  }
  /**
   * Get active cluster configuration
   */
  getActiveCluster() {
    const cluster = this.getCluster(this.config.activeClusterId);
    if (!cluster) {
      throw new Error(`Active cluster "${this.config.activeClusterId}" not found`);
    }
    return cluster;
  }
  /**
   * Set active cluster
   */
  setActiveCluster(clusterId) {
    const cluster = this.getCluster(clusterId);
    if (!cluster) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }
    this.config.activeClusterId = clusterId;
    this.saveConfig();
  }
  /**
   * Export configuration as JSON
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }
  /**
   * Import configuration from JSON
   */
  importConfig(jsonConfig) {
    const imported = JSON.parse(jsonConfig);
    if (!imported.activeClusterId || !Array.isArray(imported.clusters)) {
      throw new Error("Invalid configuration format");
    }
    if (!imported.clusters.some((c) => c.id === imported.activeClusterId)) {
      throw new Error(`Active cluster "${imported.activeClusterId}" not found in imported clusters`);
    }
    this.config = imported;
    this.saveConfig();
  }
  /**
   * Generate kafkajs client config for active cluster
   */
  getKafkaJSConfig() {
    const cluster = this.getActiveCluster();
    const config = {
      clientId: `kafka-client-${cluster.id}`,
      brokers: cluster.bootstrapServers
    };
    if (cluster.securityProtocol !== "PLAINTEXT") {
      config.ssl = cluster.securityProtocol === "SSL" || cluster.securityProtocol === "SASL_SSL" ? {
        rejectUnauthorized: true,
        ...cluster.sslCaPath && { ca: [fs.readFileSync(cluster.sslCaPath)] },
        ...cluster.sslCertPath && { cert: [fs.readFileSync(cluster.sslCertPath)] },
        ...cluster.sslKeyPath && { key: [fs.readFileSync(cluster.sslKeyPath)] }
      } : void 0;
      if (cluster.securityProtocol.startsWith("SASL")) {
        config.sasl = {
          mechanism: cluster.saslMechanism || "PLAIN",
          username: cluster.saslUsername || "",
          password: cluster.saslPassword || ""
        };
      }
    }
    return config;
  }
  /**
   * Validate cluster connectivity
   */
  async validateCluster(clusterId) {
    const cluster = this.getCluster(clusterId);
    if (!cluster) {
      return { valid: false, error: `Cluster "${clusterId}" not found` };
    }
    try {
      if (!cluster.bootstrapServers || cluster.bootstrapServers.length === 0) {
        return { valid: false, error: "No bootstrap servers configured" };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
var cluster_config_manager_default = ClusterConfigManager;
export {
  ClusterConfigManager,
  cluster_config_manager_default as default
};
