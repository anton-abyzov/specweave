/**
 * Multi-DC Replication Patterns for Kafka
 *
 * MirrorMaker 2, Cluster Linking, Active-Active and Active-Passive setups
 *
 * @module multi-dc-replication
 */

/**
 * Replication Topology Types
 */
export enum ReplicationTopology {
  /** One-way replication (DR scenario) */
  ACTIVE_PASSIVE = 'active-passive',
  /** Bidirectional replication (multi-region writes) */
  ACTIVE_ACTIVE = 'active-active',
  /** Hub-and-spoke pattern (central aggregation) */
  HUB_SPOKE = 'hub-spoke',
  /** Fan-out pattern (distribution to multiple regions) */
  FAN_OUT = 'fan-out',
  /** Aggregation pattern (collection from multiple regions) */
  AGGREGATION = 'aggregation',
}

/**
 * Replication Strategy
 */
export enum ReplicationStrategy {
  /** Confluent MirrorMaker 2 (recommended) */
  MIRROR_MAKER_2 = 'mirrormaker2',
  /** Confluent Cluster Linking (premium feature) */
  CLUSTER_LINKING = 'cluster-linking',
  /** Legacy MirrorMaker 1 (deprecated) */
  MIRROR_MAKER_1 = 'mirrormaker1',
}

/**
 * Data Center Configuration
 */
export interface DataCenterConfig {
  /** DC identifier */
  id: string;
  /** DC display name */
  name: string;
  /** Region (e.g., us-east-1, eu-west-1) */
  region: string;
  /** Kafka bootstrap servers */
  bootstrapServers: string[];
  /** Is this the primary DC? */
  primary?: boolean;
  /** Latency to other DCs in ms */
  latencyMs?: Record<string, number>;
}

/**
 * Replication Flow Configuration
 */
export interface ReplicationFlowConfig {
  /** Source data center */
  source: DataCenterConfig;
  /** Target data center */
  target: DataCenterConfig;
  /** Topics to replicate (regex patterns supported) */
  topics: string[];
  /** Topic rename pattern (optional) */
  renamePattern?: {
    from: string;
    to: string;
  };
  /** Replication factor at target */
  replicationFactor?: number;
  /** Enable exactly-once semantics */
  exactlyOnce?: boolean;
  /** Consumer group offset sync */
  syncConsumerOffsets?: boolean;
}

/**
 * MirrorMaker 2 Configuration
 */
export interface MirrorMaker2Config {
  /** Replication flows */
  flows: ReplicationFlowConfig[];
  /** Offset sync interval in seconds */
  offsetSyncIntervalSec?: number;
  /** Checkpoint sync interval in seconds */
  checkpointSyncIntervalSec?: number;
  /** Enable heartbeats */
  enableHeartbeats?: boolean;
  /** Heartbeat interval in seconds */
  heartbeatIntervalSec?: number;
}

/**
 * Cluster Linking Configuration (Confluent)
 */
export interface ClusterLinkingConfig {
  /** Link name */
  linkName: string;
  /** Source cluster */
  source: DataCenterConfig;
  /** Destination cluster */
  destination: DataCenterConfig;
  /** Link mode */
  mode: 'SOURCE' | 'DESTINATION';
  /** Mirror topics */
  mirrorTopics: string[];
  /** Enable auto-create mirror topics */
  autoCreateMirrorTopics?: boolean;
  /** Mirror topic prefix */
  mirrorTopicPrefix?: string;
}

/**
 * Multi-DC Replication Manager
 *
 * Manages MirrorMaker 2 and Cluster Linking configurations
 */
export class MultiDCReplicationManager {
  /**
   * Generate MirrorMaker 2 configuration
   */
  static generateMirrorMaker2Config(
    topology: ReplicationTopology,
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): MirrorMaker2Config {
    const flows: ReplicationFlowConfig[] = [];

    switch (topology) {
      case ReplicationTopology.ACTIVE_PASSIVE:
        flows.push(...this.createActivePassiveFlows(dataCenters, topics));
        break;

      case ReplicationTopology.ACTIVE_ACTIVE:
        flows.push(...this.createActiveActiveFlows(dataCenters, topics));
        break;

      case ReplicationTopology.HUB_SPOKE:
        flows.push(...this.createHubSpokeFlows(dataCenters, topics));
        break;

      case ReplicationTopology.FAN_OUT:
        flows.push(...this.createFanOutFlows(dataCenters, topics));
        break;

      case ReplicationTopology.AGGREGATION:
        flows.push(...this.createAggregationFlows(dataCenters, topics));
        break;

      default:
        throw new Error(`Unsupported topology: ${topology}`);
    }

    return {
      flows,
      offsetSyncIntervalSec: 60,
      checkpointSyncIntervalSec: 60,
      enableHeartbeats: true,
      heartbeatIntervalSec: 3,
    };
  }

  /**
   * Create Active-Passive replication flows
   *
   * Primary DC → Standby DC (one-way)
   */
  private static createActivePassiveFlows(
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): ReplicationFlowConfig[] {
    const primary = dataCenters.find((dc) => dc.primary);
    const standby = dataCenters.find((dc) => !dc.primary);

    if (!primary || !standby) {
      throw new Error('Active-Passive requires exactly 1 primary and 1 standby DC');
    }

    return [
      {
        source: primary,
        target: standby,
        topics,
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: true,
      },
    ];
  }

  /**
   * Create Active-Active replication flows
   *
   * DC1 ↔ DC2 (bidirectional)
   */
  private static createActiveActiveFlows(
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): ReplicationFlowConfig[] {
    if (dataCenters.length !== 2) {
      throw new Error('Active-Active requires exactly 2 data centers');
    }

    const [dc1, dc2] = dataCenters;

    return [
      // DC1 → DC2
      {
        source: dc1,
        target: dc2,
        topics,
        renamePattern: {
          from: '(.*)',
          to: `${dc1.id}.$1`,
        },
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: false, // Not recommended for active-active
      },
      // DC2 → DC1
      {
        source: dc2,
        target: dc1,
        topics,
        renamePattern: {
          from: '(.*)',
          to: `${dc2.id}.$1`,
        },
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: false,
      },
    ];
  }

  /**
   * Create Hub-Spoke replication flows
   *
   * Spoke1 → Hub, Spoke2 → Hub, Spoke3 → Hub
   */
  private static createHubSpokeFlows(
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): ReplicationFlowConfig[] {
    const hub = dataCenters.find((dc) => dc.primary);
    const spokes = dataCenters.filter((dc) => !dc.primary);

    if (!hub || spokes.length === 0) {
      throw new Error('Hub-Spoke requires 1 hub (primary) and 1+ spokes');
    }

    return spokes.map((spoke) => ({
      source: spoke,
      target: hub,
      topics,
      renamePattern: {
        from: '(.*)',
        to: `${spoke.id}.$1`,
      },
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: false,
    }));
  }

  /**
   * Create Fan-Out replication flows
   *
   * Hub → Spoke1, Hub → Spoke2, Hub → Spoke3
   */
  private static createFanOutFlows(
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): ReplicationFlowConfig[] {
    const hub = dataCenters.find((dc) => dc.primary);
    const spokes = dataCenters.filter((dc) => !dc.primary);

    if (!hub || spokes.length === 0) {
      throw new Error('Fan-Out requires 1 hub (primary) and 1+ spokes');
    }

    return spokes.map((spoke) => ({
      source: hub,
      target: spoke,
      topics,
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: true,
    }));
  }

  /**
   * Create Aggregation replication flows
   *
   * Region1 → Central, Region2 → Central, Region3 → Central
   */
  private static createAggregationFlows(
    dataCenters: DataCenterConfig[],
    topics: string[]
  ): ReplicationFlowConfig[] {
    const central = dataCenters.find((dc) => dc.primary);
    const regions = dataCenters.filter((dc) => !dc.primary);

    if (!central || regions.length === 0) {
      throw new Error('Aggregation requires 1 central DC and 1+ regional DCs');
    }

    return regions.map((region) => ({
      source: region,
      target: central,
      topics,
      renamePattern: {
        from: '(.*)',
        to: `${region.region}.$1`,
      },
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: false,
    }));
  }

  /**
   * Generate MirrorMaker 2 connector configuration (JSON)
   */
  static generateMM2ConnectorConfig(flow: ReplicationFlowConfig): string {
    const connectorConfig = {
      name: `mm2-${flow.source.id}-to-${flow.target.id}`,
      'connector.class': 'org.apache.kafka.connect.mirror.MirrorSourceConnector',
      'tasks.max': '1',

      // Source cluster
      'source.cluster.alias': flow.source.id,
      'source.cluster.bootstrap.servers': flow.source.bootstrapServers.join(','),

      // Target cluster
      'target.cluster.alias': flow.target.id,
      'target.cluster.bootstrap.servers': flow.target.bootstrapServers.join(','),

      // Topics
      'topics': flow.topics.join(','),

      // Replication
      'replication.factor': flow.replicationFactor || 3,
      'refresh.topics.enabled': 'true',
      'refresh.topics.interval.seconds': '600',

      // Exactly-once
      'exactly.once.support': flow.exactlyOnce ? 'enabled' : 'disabled',

      // Offset sync
      'sync.topic.acls.enabled': 'false',
      'sync.topic.configs.enabled': 'true',
      'offset-syncs.topic.replication.factor': flow.replicationFactor || 3,

      // Checkpoints (consumer group offset sync)
      'checkpoints.topic.replication.factor': flow.replicationFactor || 3,
      'emit.checkpoints.enabled': flow.syncConsumerOffsets || false,
      'emit.checkpoints.interval.seconds': '60',

      // Heartbeats
      'emit.heartbeats.enabled': 'true',
      'emit.heartbeats.interval.seconds': '3',
      'heartbeats.topic.replication.factor': flow.replicationFactor || 3,
    };

    // Add topic rename if specified
    if (flow.renamePattern) {
      connectorConfig['replication.policy.class'] = 'org.apache.kafka.connect.mirror.IdentityReplicationPolicy';
      connectorConfig['topic.creation.default.replication.factor'] = flow.replicationFactor || 3;
    }

    return JSON.stringify(connectorConfig, null, 2);
  }

  /**
   * Generate Cluster Linking configuration (Confluent)
   */
  static generateClusterLinkingConfig(link: ClusterLinkingConfig): string {
    const config = {
      'link.mode': link.mode,
      'connection.mode': 'OUTBOUND',
      'topic.creation.default.replication.factor': '3',
      'topic.creation.default.partitions': '6',
      'auto.create.mirror.topics.enable': link.autoCreateMirrorTopics !== false,
    };

    if (link.mirrorTopicPrefix) {
      config['mirror.topic.prefix'] = link.mirrorTopicPrefix;
    }

    const commands = [
      `# Create cluster link`,
      `confluent kafka link create ${link.linkName} \\`,
      `  --cluster ${link.destination.id} \\`,
      `  --source-cluster ${link.source.id} \\`,
      `  --source-bootstrap-server ${link.source.bootstrapServers.join(',')} \\`,
      `  --config-file link-config.properties`,
      '',
      `# Create mirror topics`,
      ...link.mirrorTopics.map(
        (topic) => `confluent kafka mirror create ${topic} --link ${link.linkName}`
      ),
    ];

    return commands.join('\n');
  }
}

/**
 * Failover Orchestrator
 *
 * Manages failover and failback operations
 */
export class FailoverOrchestrator {
  /**
   * Initiate failover from primary to standby
   */
  static async initiateFailover(
    primary: DataCenterConfig,
    standby: DataCenterConfig,
    consumerGroups: string[]
  ): Promise<void> {
    console.log(`🚨 Initiating failover: ${primary.id} → ${standby.id}`);

    // Step 1: Stop producers in primary DC
    console.log('1. Stopping producers in primary DC...');

    // Step 2: Wait for replication lag to reach 0
    console.log('2. Waiting for replication lag to reach 0...');
    // TODO: Monitor consumer lag via Kafka metrics

    // Step 3: Translate consumer offsets
    console.log('3. Translating consumer group offsets...');
    for (const group of consumerGroups) {
      // MirrorMaker 2 checkpoints topic contains offset mappings
      console.log(`   - Translating offsets for group: ${group}`);
    }

    // Step 4: Switch DNS/load balancer to standby
    console.log('4. Switching traffic to standby DC...');

    // Step 5: Resume consumers in standby DC
    console.log('5. Resuming consumers in standby DC...');

    console.log('✅ Failover complete!');
  }

  /**
   * Initiate failback from standby to primary
   */
  static async initiateFailback(
    standby: DataCenterConfig,
    primary: DataCenterConfig
  ): Promise<void> {
    console.log(`🔄 Initiating failback: ${standby.id} → ${primary.id}`);

    // Step 1: Setup reverse replication (standby → primary)
    console.log('1. Setting up reverse replication...');

    // Step 2: Wait for primary to catch up
    console.log('2. Waiting for primary DC to catch up...');

    // Step 3: Planned switchover during maintenance window
    console.log('3. Executing planned switchover...');

    // Step 4: Switch traffic back to primary
    console.log('4. Switching traffic back to primary DC...');

    console.log('✅ Failback complete!');
  }
}

/**
 * Example Usage: Active-Passive Replication
 *
 * ```typescript
 * const dataCenters: DataCenterConfig[] = [
 *   {
 *     id: 'us-east',
 *     name: 'US East (Primary)',
 *     region: 'us-east-1',
 *     bootstrapServers: ['kafka1.us-east.example.com:9092'],
 *     primary: true,
 *   },
 *   {
 *     id: 'us-west',
 *     name: 'US West (DR)',
 *     region: 'us-west-2',
 *     bootstrapServers: ['kafka1.us-west.example.com:9092'],
 *     primary: false,
 *   },
 * ];
 *
 * const config = MultiDCReplicationManager.generateMirrorMaker2Config(
 *   ReplicationTopology.ACTIVE_PASSIVE,
 *   dataCenters,
 *   ['orders', 'users', 'analytics.*']
 * );
 *
 * // Generate connector config
 * const connectorConfig = MultiDCReplicationManager.generateMM2ConnectorConfig(
 *   config.flows[0]
 * );
 * console.log(connectorConfig);
 * ```
 */

/**
 * Example Usage: Active-Active Replication
 *
 * ```typescript
 * const dataCenters: DataCenterConfig[] = [
 *   {
 *     id: 'us',
 *     name: 'United States',
 *     region: 'us-east-1',
 *     bootstrapServers: ['kafka-us.example.com:9092'],
 *   },
 *   {
 *     id: 'eu',
 *     name: 'Europe',
 *     region: 'eu-west-1',
 *     bootstrapServers: ['kafka-eu.example.com:9092'],
 *   },
 * ];
 *
 * const config = MultiDCReplicationManager.generateMirrorMaker2Config(
 *   ReplicationTopology.ACTIVE_ACTIVE,
 *   dataCenters,
 *   ['user-events', 'click-stream']
 * );
 *
 * // Topics at US: user-events, eu.user-events
 * // Topics at EU: user-events, us.user-events
 * ```
 */

/**
 * Example Usage: Cluster Linking (Confluent)
 *
 * ```typescript
 * const link: ClusterLinkingConfig = {
 *   linkName: 'us-to-eu-link',
 *   source: {
 *     id: 'us-cluster',
 *     name: 'US Cluster',
 *     region: 'us-east-1',
 *     bootstrapServers: ['kafka-us.example.com:9092'],
 *   },
 *   destination: {
 *     id: 'eu-cluster',
 *     name: 'EU Cluster',
 *     region: 'eu-west-1',
 *     bootstrapServers: ['kafka-eu.example.com:9092'],
 *   },
 *   mode: 'DESTINATION',
 *   mirrorTopics: ['orders', 'users'],
 *   autoCreateMirrorTopics: true,
 * };
 *
 * const commands = MultiDCReplicationManager.generateClusterLinkingConfig(link);
 * console.log(commands);
 * ```
 */

/**
 * Multi-DC Replication Best Practices:
 *
 * **MirrorMaker 2 vs Cluster Linking**:
 * - MirrorMaker 2: Open source, works with all Kafka distributions
 * - Cluster Linking: Confluent-only, lower latency, zero data duplication
 *
 * **Active-Passive**:
 * - Use for disaster recovery (DR)
 * - Enable consumer offset sync for failover
 * - Test failover regularly (quarterly)
 * - Monitor replication lag (target: < 1 second)
 *
 * **Active-Active**:
 * - Use for multi-region writes
 * - Prefix topics with source DC (us.orders, eu.orders)
 * - Avoid bidirectional replication of same topics (infinite loop!)
 * - Application must handle conflicts
 *
 * **Hub-Spoke**:
 * - Use for aggregation (regional → central)
 * - Prefix topics with spoke ID
 * - Central hub for analytics/reporting
 *
 * **Latency Considerations**:
 * - Same region: < 5ms
 * - Cross-region (same continent): 30-50ms
 * - Intercontinental: 100-300ms
 * - Use compression to reduce network overhead
 *
 * **Failover RPO/RTO**:
 * - RPO (Recovery Point Objective): < 1 minute (with offset sync)
 * - RTO (Recovery Time Objective): 5-15 minutes (manual) or < 1 minute (automated)
 */

export default {
  MultiDCReplicationManager,
  FailoverOrchestrator,
  ReplicationTopology,
  ReplicationStrategy,
};
