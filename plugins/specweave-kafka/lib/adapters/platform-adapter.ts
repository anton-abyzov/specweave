// ==================================================
// Platform Adapter Interface
// ==================================================
// Provides unified API for Kafka operations across different platforms:
// - Apache Kafka (self-hosted)
// - AWS MSK (Managed Streaming for Kafka)
// - Azure Event Hubs (Kafka API)
// - Confluent Cloud

export enum KafkaPlatform {
  APACHE_KAFKA = 'apache-kafka',
  AWS_MSK = 'aws-msk',
  AZURE_EVENT_HUBS = 'azure-event-hubs',
  CONFLUENT_CLOUD = 'confluent-cloud',
}

export interface ClusterInfo {
  clusterId: string;
  clusterName: string;
  platform: KafkaPlatform;
  version: string;
  brokerCount: number;
  bootstrapServers: string[];
  endpoints: {
    bootstrap: string;
    metrics?: string;
    admin?: string;
  };
}

export interface TopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  config?: {
    'retention.ms'?: number;
    'retention.bytes'?: number;
    'segment.bytes'?: number;
    'compression.type'?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    'cleanup.policy'?: 'delete' | 'compact' | 'delete,compact';
    'min.insync.replicas'?: number;
    'max.message.bytes'?: number;
    [key: string]: any;
  };
}

export interface Topic {
  name: string;
  partitions: number;
  replicationFactor: number;
  isInternal: boolean;
  config: Record<string, string>;
}

export interface Partition {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];  // In-Sync Replicas
  offlineReplicas: number[];
}

export interface TopicMetadata {
  name: string;
  partitions: Partition[];
}

export interface ConsumerGroupDescription {
  groupId: string;
  state: 'Stable' | 'Empty' | 'PreparingRebalance' | 'CompletingRebalance' | 'Dead';
  protocolType: string;
  protocol: string;
  members: ConsumerGroupMember[];
  coordinator: {
    id: number;
    host: string;
    port: number;
  };
}

export interface ConsumerGroupMember {
  memberId: string;
  clientId: string;
  clientHost: string;
  memberMetadata: any;
  memberAssignment: {
    topic: string;
    partitions: number[];
  }[];
}

export interface ConsumerGroupOffset {
  topic: string;
  partition: number;
  currentOffset: number;
  logEndOffset: number;
  lag: number;
  metadata: string;
}

export interface ClusterMetrics {
  brokerCount: number;
  topicCount: number;
  partitionCount: number;
  underReplicatedPartitions: number;
  offlinePartitions: number;
  activeController: number;
  messagesInPerSec: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
}

export interface ConnectionConfig {
  platform: KafkaPlatform;
  brokers: string[];
  ssl?: {
    enabled: boolean;
    truststore?: string;
    keystore?: string;
    password?: string;
  };
  sasl?: {
    mechanism: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'AWS_MSK_IAM' | 'OAUTHBEARER';
    username?: string;
    password?: string;
    awsRegion?: string;  // For AWS MSK IAM
    oauthConfig?: {      // For Confluent Cloud / OAUTHBEARER
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
    };
  };
  clientId?: string;
  connectionTimeout?: number;
  requestTimeout?: number;
}

export interface AdminOperationResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Platform Adapter Interface
 *
 * Unified API for Kafka operations across different platforms.
 * Implementations:
 * - ApacheKafkaAdapter (self-hosted Kafka)
 * - AwsMskAdapter (AWS MSK)
 * - AzureEventHubsAdapter (Azure Event Hubs with Kafka API)
 * - ConfluentCloudAdapter (Confluent Cloud)
 */
export interface PlatformAdapter {
  readonly platform: KafkaPlatform;

  /**
   * Connect to Kafka cluster
   */
  connect(config: ConnectionConfig): Promise<void>;

  /**
   * Disconnect from Kafka cluster
   */
  disconnect(): Promise<void>;

  /**
   * Get cluster information
   */
  getClusterInfo(): Promise<ClusterInfo>;

  /**
   * Get cluster metrics (for monitoring)
   */
  getClusterMetrics(): Promise<ClusterMetrics>;

  // ==================================================
  // Topic Operations
  // ==================================================

  /**
   * List all topics
   */
  listTopics(): Promise<string[]>;

  /**
   * Get topic metadata
   */
  getTopicMetadata(topic: string): Promise<TopicMetadata>;

  /**
   * Create topic
   */
  createTopic(config: TopicConfig): Promise<AdminOperationResult>;

  /**
   * Delete topic
   */
  deleteTopic(topic: string): Promise<AdminOperationResult>;

  /**
   * Update topic configuration
   */
  updateTopicConfig(topic: string, config: Record<string, string>): Promise<AdminOperationResult>;

  /**
   * Get topic configuration
   */
  getTopicConfig(topic: string): Promise<Record<string, string>>;

  // ==================================================
  // Consumer Group Operations
  // ==================================================

  /**
   * List all consumer groups
   */
  listConsumerGroups(): Promise<string[]>;

  /**
   * Get consumer group description
   */
  describeConsumerGroup(groupId: string): Promise<ConsumerGroupDescription>;

  /**
   * Get consumer group offsets
   */
  getConsumerGroupOffsets(groupId: string): Promise<ConsumerGroupOffset[]>;

  /**
   * Delete consumer group
   */
  deleteConsumerGroup(groupId: string): Promise<AdminOperationResult>;

  /**
   * Reset consumer group offsets
   */
  resetConsumerGroupOffsets(
    groupId: string,
    topic: string,
    options: {
      toEarliest?: boolean;
      toLatest?: boolean;
      toDateTime?: Date;
      toOffset?: number;
    }
  ): Promise<AdminOperationResult>;

  // ==================================================
  // ACL Operations (Security)
  // ==================================================

  /**
   * Create ACL (Access Control List)
   *
   * Not supported on all platforms:
   * - Apache Kafka: ✅ Supported
   * - AWS MSK: ⚠️  Use IAM policies instead
   * - Azure Event Hubs: ⚠️  Use Azure RBAC instead
   * - Confluent Cloud: ✅ Supported
   */
  createAcl?(acl: {
    resourceType: 'Topic' | 'Group' | 'Cluster';
    resourceName: string;
    principal: string;
    operation: 'Read' | 'Write' | 'Create' | 'Delete' | 'Alter' | 'Describe' | 'All';
    permissionType: 'Allow' | 'Deny';
  }): Promise<AdminOperationResult>;

  /**
   * List ACLs
   */
  listAcls?(): Promise<any[]>;

  // ==================================================
  // Platform-Specific Operations
  // ==================================================

  /**
   * Platform-specific operation (optional)
   * Examples:
   * - AWS MSK: Get IAM policy for topic access
   * - Azure Event Hubs: Get Event Hub connection string
   * - Confluent Cloud: Get Schema Registry URL
   */
  platformSpecific?(operation: string, params?: any): Promise<any>;
}

/**
 * Platform Adapter Factory
 *
 * Creates appropriate adapter based on platform type
 */
export class PlatformAdapterFactory {
  static create(platform: KafkaPlatform): PlatformAdapter {
    switch (platform) {
      case KafkaPlatform.APACHE_KAFKA:
        // Lazy load to avoid circular dependencies
        const { ApacheKafkaAdapter } = require('./apache-kafka-adapter');
        return new ApacheKafkaAdapter();

      case KafkaPlatform.AWS_MSK:
        const { AwsMskAdapter } = require('./aws-msk-adapter');
        return new AwsMskAdapter();

      case KafkaPlatform.AZURE_EVENT_HUBS:
        const { AzureEventHubsAdapter } = require('./azure-event-hubs-adapter');
        return new AzureEventHubsAdapter();

      case KafkaPlatform.CONFLUENT_CLOUD:
        const { ConfluentCloudAdapter } = require('./confluent-cloud-adapter');
        return new ConfluentCloudAdapter();

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Auto-detect platform based on connection config
   */
  static detectPlatform(config: ConnectionConfig): KafkaPlatform {
    const broker = config.brokers[0].toLowerCase();

    // AWS MSK detection
    if (broker.includes('.kafka.') && broker.includes('.amazonaws.com')) {
      return KafkaPlatform.AWS_MSK;
    }

    // Azure Event Hubs detection
    if (broker.includes('.servicebus.windows.net')) {
      return KafkaPlatform.AZURE_EVENT_HUBS;
    }

    // Confluent Cloud detection
    if (broker.includes('.confluent.cloud') || broker.includes('.gcp.confluent.cloud')) {
      return KafkaPlatform.CONFLUENT_CLOUD;
    }

    // Default to Apache Kafka
    return KafkaPlatform.APACHE_KAFKA;
  }
}
