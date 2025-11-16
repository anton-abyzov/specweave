/**
 * Cluster Switcher
 *
 * Provides context switching between multiple Kafka clusters
 *
 * @module cluster-switcher
 */

import { Kafka, Admin, Producer, Consumer } from 'kafkajs';
import { ClusterConfigManager, ClusterConfig } from './cluster-config-manager';

/**
 * Cluster Context
 *
 * Active connections to a Kafka cluster
 */
export interface ClusterContext {
  /** Cluster ID */
  clusterId: string;
  /** Cluster configuration */
  config: ClusterConfig;
  /** Kafka client */
  kafka: Kafka;
  /** Admin client (lazy initialized) */
  admin?: Admin;
  /** Producer (lazy initialized) */
  producer?: Producer;
  /** Consumers (lazy initialized) */
  consumers: Map<string, Consumer>;
}

/**
 * Cluster Switcher
 *
 * Manages active connections to multiple Kafka clusters with context switching
 */
export class ClusterSwitcher {
  private configManager: ClusterConfigManager;
  private contexts: Map<string, ClusterContext> = new Map();
  private activeContext: ClusterContext | null = null;

  constructor(configManager?: ClusterConfigManager) {
    this.configManager = configManager || new ClusterConfigManager();
  }

  /**
   * Get or create cluster context
   */
  private async getContext(clusterId: string): Promise<ClusterContext> {
    // Return cached context if exists
    if (this.contexts.has(clusterId)) {
      return this.contexts.get(clusterId)!;
    }

    // Get cluster config
    const config = this.configManager.getCluster(clusterId);
    if (!config) {
      throw new Error(`Cluster "${clusterId}" not found`);
    }

    // Create Kafka client
    const kafkaConfig = this.buildKafkaConfig(config);
    const kafka = new Kafka(kafkaConfig);

    // Create context
    const context: ClusterContext = {
      clusterId,
      config,
      kafka,
      consumers: new Map(),
    };

    // Cache context
    this.contexts.set(clusterId, context);

    return context;
  }

  /**
   * Build kafkajs configuration from cluster config
   */
  private buildKafkaConfig(config: ClusterConfig): any {
    const kafkaConfig: any = {
      clientId: `kafka-client-${config.id}`,
      brokers: config.bootstrapServers,
    };

    // Security configuration
    if (config.securityProtocol !== 'PLAINTEXT') {
      if (config.securityProtocol === 'SSL' || config.securityProtocol === 'SASL_SSL') {
        kafkaConfig.ssl = { rejectUnauthorized: true };
        // Note: In production, load SSL certs from files
      }

      if (config.securityProtocol.startsWith('SASL')) {
        kafkaConfig.sasl = {
          mechanism: config.saslMechanism || 'PLAIN',
          username: config.saslUsername || '',
          password: config.saslPassword || '',
        };
      }
    }

    return kafkaConfig;
  }

  /**
   * Switch to a different cluster
   */
  async switch(clusterId: string): Promise<void> {
    console.log(`Switching to cluster: ${clusterId}`);

    // Get or create context
    const context = await this.getContext(clusterId);

    // Disconnect previous context (optional - keep connections alive for faster switching)
    // if (this.activeContext && this.activeContext.clusterId !== clusterId) {
    //   await this.disconnectContext(this.activeContext);
    // }

    // Set active context
    this.activeContext = context;

    // Update config manager active cluster
    this.configManager.setActiveCluster(clusterId);

    console.log(`Now connected to cluster: ${context.config.name} (${context.config.environment})`);
  }

  /**
   * Get active cluster ID
   */
  getActiveClusterId(): string | null {
    return this.activeContext?.clusterId || null;
  }

  /**
   * Get active cluster configuration
   */
  getActiveCluster(): ClusterConfig | null {
    return this.activeContext?.config || null;
  }

  /**
   * Get Admin client for active cluster
   */
  async getAdmin(): Promise<Admin> {
    if (!this.activeContext) {
      throw new Error('No active cluster. Use switch() first.');
    }

    // Lazy initialize admin
    if (!this.activeContext.admin) {
      this.activeContext.admin = this.activeContext.kafka.admin();
      await this.activeContext.admin.connect();
    }

    return this.activeContext.admin;
  }

  /**
   * Get Producer for active cluster
   */
  async getProducer(): Promise<Producer> {
    if (!this.activeContext) {
      throw new Error('No active cluster. Use switch() first.');
    }

    // Lazy initialize producer
    if (!this.activeContext.producer) {
      this.activeContext.producer = this.activeContext.kafka.producer();
      await this.activeContext.producer.connect();
    }

    return this.activeContext.producer;
  }

  /**
   * Get or create Consumer for active cluster
   */
  async getConsumer(groupId: string): Promise<Consumer> {
    if (!this.activeContext) {
      throw new Error('No active cluster. Use switch() first.');
    }

    // Return existing consumer
    if (this.activeContext.consumers.has(groupId)) {
      return this.activeContext.consumers.get(groupId)!;
    }

    // Create new consumer
    const consumer = this.activeContext.kafka.consumer({ groupId });
    await consumer.connect();

    // Cache consumer
    this.activeContext.consumers.set(groupId, consumer);

    return consumer;
  }

  /**
   * Disconnect all connections for a specific cluster
   */
  private async disconnectContext(context: ClusterContext): Promise<void> {
    console.log(`Disconnecting cluster: ${context.clusterId}`);

    // Disconnect admin
    if (context.admin) {
      await context.admin.disconnect();
      context.admin = undefined;
    }

    // Disconnect producer
    if (context.producer) {
      await context.producer.disconnect();
      context.producer = undefined;
    }

    // Disconnect all consumers
    for (const [groupId, consumer] of context.consumers.entries()) {
      await consumer.disconnect();
    }
    context.consumers.clear();
  }

  /**
   * Disconnect all clusters
   */
  async disconnectAll(): Promise<void> {
    for (const context of this.contexts.values()) {
      await this.disconnectContext(context);
    }

    this.contexts.clear();
    this.activeContext = null;
  }

  /**
   * List all available clusters
   */
  listClusters(): ClusterConfig[] {
    return this.configManager.getAllClusters();
  }

  /**
   * Get cluster health status
   */
  async getClusterHealth(clusterId?: string): Promise<{
    clusterId: string;
    healthy: boolean;
    error?: string;
  }> {
    const targetClusterId = clusterId || this.activeContext?.clusterId;
    if (!targetClusterId) {
      throw new Error('No cluster specified and no active cluster');
    }

    try {
      const context = await this.getContext(targetClusterId);
      const admin = context.kafka.admin();
      await admin.connect();

      // Simple health check: list topics
      await admin.listTopics();

      await admin.disconnect();

      return {
        clusterId: targetClusterId,
        healthy: true,
      };
    } catch (error) {
      return {
        clusterId: targetClusterId,
        healthy: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute operation on specific cluster (without switching context)
   */
  async executeOn<T>(
    clusterId: string,
    operation: (kafka: Kafka) => Promise<T>
  ): Promise<T> {
    const context = await this.getContext(clusterId);
    return operation(context.kafka);
  }
}

/**
 * Example Usage: Basic Context Switching
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 *
 * // Switch to dev cluster
 * await switcher.switch('dev');
 * const producer = await switcher.getProducer();
 * await producer.send({
 *   topic: 'test-topic',
 *   messages: [{ value: 'Hello from dev!' }],
 * });
 *
 * // Switch to prod cluster
 * await switcher.switch('prod');
 * const consumer = await switcher.getConsumer('my-consumer-group');
 * await consumer.subscribe({ topic: 'events' });
 * await consumer.run({
 *   eachMessage: async ({ message }) => {
 *     console.log(`Prod event: ${message.value?.toString()}`);
 *   },
 * });
 * ```
 */

/**
 * Example Usage: Execute on Specific Cluster
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 *
 * // Active cluster: dev
 * await switcher.switch('dev');
 *
 * // Execute operation on prod without switching
 * await switcher.executeOn('prod', async (kafka) => {
 *   const admin = kafka.admin();
 *   await admin.connect();
 *   const topics = await admin.listTopics();
 *   await admin.disconnect();
 *   console.log(`Prod topics: ${topics.join(', ')}`);
 * });
 *
 * // Active cluster is still dev
 * console.log(`Active: ${switcher.getActiveClusterId()}`); // "dev"
 * ```
 */

/**
 * Example Usage: Multi-Cluster Health Check
 *
 * ```typescript
 * const switcher = new ClusterSwitcher();
 * const clusters = switcher.listClusters();
 *
 * for (const cluster of clusters) {
 *   const health = await switcher.getClusterHealth(cluster.id);
 *   console.log(`${cluster.name}: ${health.healthy ? 'UP' : 'DOWN'}`);
 *   if (!health.healthy) {
 *     console.error(`  Error: ${health.error}`);
 *   }
 * }
 * ```
 */

export default ClusterSwitcher;
