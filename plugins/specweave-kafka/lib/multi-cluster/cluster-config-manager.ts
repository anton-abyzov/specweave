/**
 * Multi-Cluster Configuration Manager
 *
 * Manages Kafka cluster configurations for dev, staging, prod environments
 *
 * @module cluster-config-manager
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cluster Configuration
 */
export interface ClusterConfig {
  /** Unique cluster ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Environment (dev, staging, prod) */
  environment: 'dev' | 'staging' | 'prod';
  /** Bootstrap servers */
  bootstrapServers: string[];
  /** Security protocol */
  securityProtocol: 'PLAINTEXT' | 'SASL_PLAINTEXT' | 'SASL_SSL' | 'SSL';
  /** SASL mechanism (optional) */
  saslMechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'GSSAPI';
  /** SASL username (optional) */
  saslUsername?: string;
  /** SASL password (optional) */
  saslPassword?: string;
  /** SSL CA certificate path (optional) */
  sslCaPath?: string;
  /** SSL client certificate path (optional) */
  sslCertPath?: string;
  /** SSL client key path (optional) */
  sslKeyPath?: string;
  /** Schema Registry URL (optional) */
  schemaRegistryUrl?: string;
  /** Cloud provider (optional) */
  cloudProvider?: 'AWS' | 'Azure' | 'GCP' | 'Confluent' | 'Self-Hosted';
  /** Region (optional) */
  region?: string;
  /** Tags (optional) */
  tags?: Record<string, string>;
}

/**
 * Multi-Cluster Configuration
 */
export interface MultiClusterConfig {
  /** Active cluster ID */
  activeClusterId: string;
  /** All cluster configurations */
  clusters: ClusterConfig[];
}

/**
 * Cluster Config Manager
 *
 * Manages multiple Kafka cluster configurations with persistence
 */
export class ClusterConfigManager {
  private config: MultiClusterConfig;
  private configFilePath: string;

  constructor(configFilePath: string = path.join(process.cwd(), '.kafka-clusters.json')) {
    this.configFilePath = configFilePath;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): MultiClusterConfig {
    if (fs.existsSync(this.configFilePath)) {
      const data = fs.readFileSync(this.configFilePath, 'utf-8');
      return JSON.parse(data);
    }

    // Default config with dev cluster
    return {
      activeClusterId: 'dev',
      clusters: [
        {
          id: 'dev',
          name: 'Development',
          environment: 'dev',
          bootstrapServers: ['localhost:9092'],
          securityProtocol: 'PLAINTEXT',
          cloudProvider: 'Self-Hosted',
        },
      ],
    };
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    fs.writeFileSync(
      this.configFilePath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  /**
   * Add cluster configuration
   */
  addCluster(cluster: ClusterConfig): void {
    // Check for duplicate ID
    if (this.config.clusters.some((c) => c.id === cluster.id)) {
      throw new Error(`Cluster with ID "${cluster.id}" already exists`);
    }

    this.config.clusters.push(cluster);
    this.saveConfig();
  }

  /**
   * Update cluster configuration
   */
  updateCluster(clusterId: string, updates: Partial<ClusterConfig>): void {
    const index = this.config.clusters.findIndex((c) => c.id === clusterId);
    if (index === -1) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }

    this.config.clusters[index] = {
      ...this.config.clusters[index],
      ...updates,
      id: clusterId, // Prevent ID change
    };
    this.saveConfig();
  }

  /**
   * Remove cluster configuration
   */
  removeCluster(clusterId: string): void {
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
  getCluster(clusterId: string): ClusterConfig | undefined {
    return this.config.clusters.find((c) => c.id === clusterId);
  }

  /**
   * Get all clusters
   */
  getAllClusters(): ClusterConfig[] {
    return [...this.config.clusters];
  }

  /**
   * Get clusters by environment
   */
  getClustersByEnvironment(environment: 'dev' | 'staging' | 'prod'): ClusterConfig[] {
    return this.config.clusters.filter((c) => c.environment === environment);
  }

  /**
   * Get active cluster ID
   */
  getActiveClusterId(): string {
    return this.config.activeClusterId;
  }

  /**
   * Get active cluster configuration
   */
  getActiveCluster(): ClusterConfig {
    const cluster = this.getCluster(this.config.activeClusterId);
    if (!cluster) {
      throw new Error(`Active cluster "${this.config.activeClusterId}" not found`);
    }
    return cluster;
  }

  /**
   * Set active cluster
   */
  setActiveCluster(clusterId: string): void {
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
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(jsonConfig: string): void {
    const imported = JSON.parse(jsonConfig) as MultiClusterConfig;

    // Validate imported config
    if (!imported.activeClusterId || !Array.isArray(imported.clusters)) {
      throw new Error('Invalid configuration format');
    }

    // Verify active cluster exists
    if (!imported.clusters.some((c) => c.id === imported.activeClusterId)) {
      throw new Error(`Active cluster "${imported.activeClusterId}" not found in imported clusters`);
    }

    this.config = imported;
    this.saveConfig();
  }

  /**
   * Generate kafkajs client config for active cluster
   */
  getKafkaJSConfig(): Record<string, any> {
    const cluster = this.getActiveCluster();

    const config: Record<string, any> = {
      clientId: `kafka-client-${cluster.id}`,
      brokers: cluster.bootstrapServers,
    };

    // Security configuration
    if (cluster.securityProtocol !== 'PLAINTEXT') {
      config.ssl =
        cluster.securityProtocol === 'SSL' || cluster.securityProtocol === 'SASL_SSL'
          ? {
              rejectUnauthorized: true,
              ...(cluster.sslCaPath && { ca: [fs.readFileSync(cluster.sslCaPath)] }),
              ...(cluster.sslCertPath && { cert: [fs.readFileSync(cluster.sslCertPath)] }),
              ...(cluster.sslKeyPath && { key: [fs.readFileSync(cluster.sslKeyPath)] }),
            }
          : undefined;

      if (cluster.securityProtocol.startsWith('SASL')) {
        config.sasl = {
          mechanism: cluster.saslMechanism || 'PLAIN',
          username: cluster.saslUsername || '',
          password: cluster.saslPassword || '',
        };
      }
    }

    return config;
  }

  /**
   * Validate cluster connectivity
   */
  async validateCluster(clusterId: string): Promise<{ valid: boolean; error?: string }> {
    const cluster = this.getCluster(clusterId);
    if (!cluster) {
      return { valid: false, error: `Cluster "${clusterId}" not found` };
    }

    try {
      // Simple connectivity check (would use kafkajs in real implementation)
      // For now, just validate configuration format
      if (!cluster.bootstrapServers || cluster.bootstrapServers.length === 0) {
        return { valid: false, error: 'No bootstrap servers configured' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}

/**
 * Example Usage: Basic Cluster Management
 *
 * ```typescript
 * const manager = new ClusterConfigManager();
 *
 * // Add production cluster
 * manager.addCluster({
 *   id: 'prod',
 *   name: 'Production',
 *   environment: 'prod',
 *   bootstrapServers: ['kafka-1.prod:9092', 'kafka-2.prod:9092'],
 *   securityProtocol: 'SASL_SSL',
 *   saslMechanism: 'SCRAM-SHA-512',
 *   saslUsername: 'prod-user',
 *   saslPassword: process.env.KAFKA_PROD_PASSWORD,
 *   cloudProvider: 'AWS',
 *   region: 'us-east-1',
 * });
 *
 * // Switch to production
 * manager.setActiveCluster('prod');
 *
 * // Get kafkajs config for active cluster
 * const kafkaConfig = manager.getKafkaJSConfig();
 * const kafka = new Kafka(kafkaConfig);
 * ```
 */

/**
 * Example Usage: Multi-Environment Setup
 *
 * ```typescript
 * const manager = new ClusterConfigManager();
 *
 * // Development cluster
 * manager.addCluster({
 *   id: 'dev',
 *   name: 'Development',
 *   environment: 'dev',
 *   bootstrapServers: ['localhost:9092'],
 *   securityProtocol: 'PLAINTEXT',
 * });
 *
 * // Staging cluster
 * manager.addCluster({
 *   id: 'staging',
 *   name: 'Staging',
 *   environment: 'staging',
 *   bootstrapServers: ['kafka.staging:9092'],
 *   securityProtocol: 'SASL_SSL',
 *   saslMechanism: 'SCRAM-SHA-256',
 * });
 *
 * // Production cluster
 * manager.addCluster({
 *   id: 'prod',
 *   name: 'Production',
 *   environment: 'prod',
 *   bootstrapServers: ['kafka-1.prod:9092', 'kafka-2.prod:9092'],
 *   securityProtocol: 'SASL_SSL',
 *   saslMechanism: 'SCRAM-SHA-512',
 * });
 *
 * // List all production clusters
 * const prodClusters = manager.getClustersByEnvironment('prod');
 * console.log(`Production clusters: ${prodClusters.map(c => c.name).join(', ')}`);
 * ```
 */

export default ClusterConfigManager;
