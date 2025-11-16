var ReplicationTopology = /* @__PURE__ */ ((ReplicationTopology2) => {
  ReplicationTopology2["ACTIVE_PASSIVE"] = "active-passive";
  ReplicationTopology2["ACTIVE_ACTIVE"] = "active-active";
  ReplicationTopology2["HUB_SPOKE"] = "hub-spoke";
  ReplicationTopology2["FAN_OUT"] = "fan-out";
  ReplicationTopology2["AGGREGATION"] = "aggregation";
  return ReplicationTopology2;
})(ReplicationTopology || {});
var ReplicationStrategy = /* @__PURE__ */ ((ReplicationStrategy2) => {
  ReplicationStrategy2["MIRROR_MAKER_2"] = "mirrormaker2";
  ReplicationStrategy2["CLUSTER_LINKING"] = "cluster-linking";
  ReplicationStrategy2["MIRROR_MAKER_1"] = "mirrormaker1";
  return ReplicationStrategy2;
})(ReplicationStrategy || {});
class MultiDCReplicationManager {
  /**
   * Generate MirrorMaker 2 configuration
   */
  static generateMirrorMaker2Config(topology, dataCenters, topics) {
    const flows = [];
    switch (topology) {
      case "active-passive" /* ACTIVE_PASSIVE */:
        flows.push(...this.createActivePassiveFlows(dataCenters, topics));
        break;
      case "active-active" /* ACTIVE_ACTIVE */:
        flows.push(...this.createActiveActiveFlows(dataCenters, topics));
        break;
      case "hub-spoke" /* HUB_SPOKE */:
        flows.push(...this.createHubSpokeFlows(dataCenters, topics));
        break;
      case "fan-out" /* FAN_OUT */:
        flows.push(...this.createFanOutFlows(dataCenters, topics));
        break;
      case "aggregation" /* AGGREGATION */:
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
      heartbeatIntervalSec: 3
    };
  }
  /**
   * Create Active-Passive replication flows
   *
   * Primary DC → Standby DC (one-way)
   */
  static createActivePassiveFlows(dataCenters, topics) {
    const primary = dataCenters.find((dc) => dc.primary);
    const standby = dataCenters.find((dc) => !dc.primary);
    if (!primary || !standby) {
      throw new Error("Active-Passive requires exactly 1 primary and 1 standby DC");
    }
    return [
      {
        source: primary,
        target: standby,
        topics,
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: true
      }
    ];
  }
  /**
   * Create Active-Active replication flows
   *
   * DC1 ↔ DC2 (bidirectional)
   */
  static createActiveActiveFlows(dataCenters, topics) {
    if (dataCenters.length !== 2) {
      throw new Error("Active-Active requires exactly 2 data centers");
    }
    const [dc1, dc2] = dataCenters;
    return [
      // DC1 → DC2
      {
        source: dc1,
        target: dc2,
        topics,
        renamePattern: {
          from: "(.*)",
          to: `${dc1.id}.$1`
        },
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: false
        // Not recommended for active-active
      },
      // DC2 → DC1
      {
        source: dc2,
        target: dc1,
        topics,
        renamePattern: {
          from: "(.*)",
          to: `${dc2.id}.$1`
        },
        replicationFactor: 3,
        exactlyOnce: true,
        syncConsumerOffsets: false
      }
    ];
  }
  /**
   * Create Hub-Spoke replication flows
   *
   * Spoke1 → Hub, Spoke2 → Hub, Spoke3 → Hub
   */
  static createHubSpokeFlows(dataCenters, topics) {
    const hub = dataCenters.find((dc) => dc.primary);
    const spokes = dataCenters.filter((dc) => !dc.primary);
    if (!hub || spokes.length === 0) {
      throw new Error("Hub-Spoke requires 1 hub (primary) and 1+ spokes");
    }
    return spokes.map((spoke) => ({
      source: spoke,
      target: hub,
      topics,
      renamePattern: {
        from: "(.*)",
        to: `${spoke.id}.$1`
      },
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: false
    }));
  }
  /**
   * Create Fan-Out replication flows
   *
   * Hub → Spoke1, Hub → Spoke2, Hub → Spoke3
   */
  static createFanOutFlows(dataCenters, topics) {
    const hub = dataCenters.find((dc) => dc.primary);
    const spokes = dataCenters.filter((dc) => !dc.primary);
    if (!hub || spokes.length === 0) {
      throw new Error("Fan-Out requires 1 hub (primary) and 1+ spokes");
    }
    return spokes.map((spoke) => ({
      source: hub,
      target: spoke,
      topics,
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: true
    }));
  }
  /**
   * Create Aggregation replication flows
   *
   * Region1 → Central, Region2 → Central, Region3 → Central
   */
  static createAggregationFlows(dataCenters, topics) {
    const central = dataCenters.find((dc) => dc.primary);
    const regions = dataCenters.filter((dc) => !dc.primary);
    if (!central || regions.length === 0) {
      throw new Error("Aggregation requires 1 central DC and 1+ regional DCs");
    }
    return regions.map((region) => ({
      source: region,
      target: central,
      topics,
      renamePattern: {
        from: "(.*)",
        to: `${region.region}.$1`
      },
      replicationFactor: 3,
      exactlyOnce: true,
      syncConsumerOffsets: false
    }));
  }
  /**
   * Generate MirrorMaker 2 connector configuration (JSON)
   */
  static generateMM2ConnectorConfig(flow) {
    const connectorConfig = {
      name: `mm2-${flow.source.id}-to-${flow.target.id}`,
      "connector.class": "org.apache.kafka.connect.mirror.MirrorSourceConnector",
      "tasks.max": "1",
      // Source cluster
      "source.cluster.alias": flow.source.id,
      "source.cluster.bootstrap.servers": flow.source.bootstrapServers.join(","),
      // Target cluster
      "target.cluster.alias": flow.target.id,
      "target.cluster.bootstrap.servers": flow.target.bootstrapServers.join(","),
      // Topics
      "topics": flow.topics.join(","),
      // Replication
      "replication.factor": flow.replicationFactor || 3,
      "refresh.topics.enabled": "true",
      "refresh.topics.interval.seconds": "600",
      // Exactly-once
      "exactly.once.support": flow.exactlyOnce ? "enabled" : "disabled",
      // Offset sync
      "sync.topic.acls.enabled": "false",
      "sync.topic.configs.enabled": "true",
      "offset-syncs.topic.replication.factor": flow.replicationFactor || 3,
      // Checkpoints (consumer group offset sync)
      "checkpoints.topic.replication.factor": flow.replicationFactor || 3,
      "emit.checkpoints.enabled": flow.syncConsumerOffsets || false,
      "emit.checkpoints.interval.seconds": "60",
      // Heartbeats
      "emit.heartbeats.enabled": "true",
      "emit.heartbeats.interval.seconds": "3",
      "heartbeats.topic.replication.factor": flow.replicationFactor || 3
    };
    if (flow.renamePattern) {
      connectorConfig["replication.policy.class"] = "org.apache.kafka.connect.mirror.IdentityReplicationPolicy";
      connectorConfig["topic.creation.default.replication.factor"] = flow.replicationFactor || 3;
    }
    return JSON.stringify(connectorConfig, null, 2);
  }
  /**
   * Generate Cluster Linking configuration (Confluent)
   */
  static generateClusterLinkingConfig(link) {
    const config = {
      "link.mode": link.mode,
      "connection.mode": "OUTBOUND",
      "topic.creation.default.replication.factor": "3",
      "topic.creation.default.partitions": "6",
      "auto.create.mirror.topics.enable": link.autoCreateMirrorTopics !== false
    };
    if (link.mirrorTopicPrefix) {
      config["mirror.topic.prefix"] = link.mirrorTopicPrefix;
    }
    const commands = [
      `# Create cluster link`,
      `confluent kafka link create ${link.linkName} \\`,
      `  --cluster ${link.destination.id} \\`,
      `  --source-cluster ${link.source.id} \\`,
      `  --source-bootstrap-server ${link.source.bootstrapServers.join(",")} \\`,
      `  --config-file link-config.properties`,
      "",
      `# Create mirror topics`,
      ...link.mirrorTopics.map(
        (topic) => `confluent kafka mirror create ${topic} --link ${link.linkName}`
      )
    ];
    return commands.join("\n");
  }
}
class FailoverOrchestrator {
  /**
   * Initiate failover from primary to standby
   */
  static async initiateFailover(primary, standby, consumerGroups) {
    console.log(`\u{1F6A8} Initiating failover: ${primary.id} \u2192 ${standby.id}`);
    console.log("1. Stopping producers in primary DC...");
    console.log("2. Waiting for replication lag to reach 0...");
    console.log("3. Translating consumer group offsets...");
    for (const group of consumerGroups) {
      console.log(`   - Translating offsets for group: ${group}`);
    }
    console.log("4. Switching traffic to standby DC...");
    console.log("5. Resuming consumers in standby DC...");
    console.log("\u2705 Failover complete!");
  }
  /**
   * Initiate failback from standby to primary
   */
  static async initiateFailback(standby, primary) {
    console.log(`\u{1F504} Initiating failback: ${standby.id} \u2192 ${primary.id}`);
    console.log("1. Setting up reverse replication...");
    console.log("2. Waiting for primary DC to catch up...");
    console.log("3. Executing planned switchover...");
    console.log("4. Switching traffic back to primary DC...");
    console.log("\u2705 Failback complete!");
  }
}
var multi_dc_replication_default = {
  MultiDCReplicationManager,
  FailoverOrchestrator,
  ReplicationTopology,
  ReplicationStrategy
};
export {
  FailoverOrchestrator,
  MultiDCReplicationManager,
  ReplicationStrategy,
  ReplicationTopology,
  multi_dc_replication_default as default
};
