import { Kafka, ResourceTypes, AclResourceTypes, AclOperationTypes, AclPermissionTypes } from "kafkajs";
import {
  KafkaPlatform
} from "./platform-adapter";
class ApacheKafkaAdapter {
  constructor() {
    this.platform = KafkaPlatform.APACHE_KAFKA;
    this.kafka = null;
    this.admin = null;
    this.connected = false;
    this.config = null;
  }
  // ==================================================
  // Connection Management
  // ==================================================
  async connect(config) {
    if (this.connected) {
      throw new Error("Already connected. Call disconnect() first.");
    }
    this.config = config;
    const kafkaConfig = {
      clientId: config.clientId || "specweave-kafka-adapter",
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 3e4,
      requestTimeout: config.requestTimeout || 3e4
    };
    if (config.ssl?.enabled) {
      kafkaConfig.ssl = {
        rejectUnauthorized: true,
        ca: config.ssl.truststore ? [config.ssl.truststore] : void 0,
        key: config.ssl.keystore,
        cert: config.ssl.keystore
      };
    }
    if (config.sasl) {
      kafkaConfig.sasl = {
        mechanism: config.sasl.mechanism.toLowerCase().replace("_", "-"),
        username: config.sasl.username,
        password: config.sasl.password
      };
      if (config.sasl.mechanism === "OAUTHBEARER" && config.sasl.oauthConfig) {
        kafkaConfig.sasl.oauthBearer = async () => {
          const response = await fetch(config.sasl.oauthConfig.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: config.sasl.oauthConfig.clientId,
              client_secret: config.sasl.oauthConfig.clientSecret
            })
          });
          const data = await response.json();
          return { value: data.access_token };
        };
      }
    }
    try {
      this.kafka = new Kafka(kafkaConfig);
      this.admin = this.kafka.admin();
      await this.admin.connect();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Kafka: ${error.message}`);
    }
  }
  async disconnect() {
    if (!this.connected || !this.admin) {
      return;
    }
    try {
      await this.admin.disconnect();
      this.connected = false;
      this.admin = null;
      this.kafka = null;
      this.config = null;
    } catch (error) {
      throw new Error(`Failed to disconnect from Kafka: ${error.message}`);
    }
  }
  ensureConnected() {
    if (!this.connected || !this.admin) {
      throw new Error("Not connected to Kafka. Call connect() first.");
    }
    return this.admin;
  }
  // ==================================================
  // Cluster Information
  // ==================================================
  async getClusterInfo() {
    const admin = this.ensureConnected();
    try {
      const cluster = await admin.describeCluster();
      return {
        clusterId: cluster.clusterId || "unknown",
        clusterName: "apache-kafka",
        // Self-hosted Kafka doesn't have cluster names
        platform: this.platform,
        version: "unknown",
        // kafkajs doesn't expose broker version directly
        brokerCount: cluster.brokers.length,
        bootstrapServers: this.config.brokers,
        endpoints: {
          bootstrap: this.config.brokers.join(",")
        }
      };
    } catch (error) {
      throw new Error(`Failed to get cluster info: ${error.message}`);
    }
  }
  async getClusterMetrics() {
    const admin = this.ensureConnected();
    try {
      const topics = await admin.listTopics();
      const cluster = await admin.describeCluster();
      let partitionCount = 0;
      let underReplicatedPartitions = 0;
      let offlinePartitions = 0;
      for (const topic of topics) {
        const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
        const topicMetadata = metadata.topics[0];
        partitionCount += topicMetadata.partitions.length;
        for (const partition of topicMetadata.partitions) {
          if (partition.isr.length < partition.replicas.length) {
            underReplicatedPartitions++;
          }
          if (partition.isr.length === 0) {
            offlinePartitions++;
          }
        }
      }
      return {
        brokerCount: cluster.brokers.length,
        topicCount: topics.length,
        partitionCount,
        underReplicatedPartitions,
        offlinePartitions,
        activeController: cluster.controller ? 1 : 0,
        messagesInPerSec: 0,
        // Requires JMX metrics (not available via Admin API)
        bytesInPerSec: 0,
        // Requires JMX metrics
        bytesOutPerSec: 0
        // Requires JMX metrics
      };
    } catch (error) {
      throw new Error(`Failed to get cluster metrics: ${error.message}`);
    }
  }
  // ==================================================
  // Topic Operations
  // ==================================================
  async listTopics() {
    const admin = this.ensureConnected();
    try {
      const topics = await admin.listTopics();
      return topics;
    } catch (error) {
      throw new Error(`Failed to list topics: ${error.message}`);
    }
  }
  async getTopicMetadata(topic) {
    const admin = this.ensureConnected();
    try {
      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      const topicMetadata = metadata.topics[0];
      if (!topicMetadata) {
        throw new Error(`Topic '${topic}' not found`);
      }
      const partitions = topicMetadata.partitions.map((p) => ({
        partition: p.partitionId,
        leader: p.leader,
        replicas: p.replicas,
        isr: p.isr,
        offlineReplicas: p.offlineReplicas || []
      }));
      return {
        name: topic,
        partitions
      };
    } catch (error) {
      throw new Error(`Failed to get topic metadata for '${topic}': ${error.message}`);
    }
  }
  async createTopic(config) {
    const admin = this.ensureConnected();
    try {
      const topicConfig = {
        topic: config.name,
        numPartitions: config.partitions,
        replicationFactor: config.replicationFactor,
        configEntries: config.config ? Object.entries(config.config).map(([name, value]) => ({ name, value: String(value) })) : []
      };
      await admin.createTopics({
        topics: [topicConfig],
        waitForLeaders: true
      });
      return {
        success: true,
        message: `Topic '${config.name}' created successfully`,
        details: { partitions: config.partitions, replicationFactor: config.replicationFactor }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create topic '${config.name}': ${error.message}`
      };
    }
  }
  async deleteTopic(topic) {
    const admin = this.ensureConnected();
    try {
      await admin.deleteTopics({ topics: [topic] });
      return {
        success: true,
        message: `Topic '${topic}' deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete topic '${topic}': ${error.message}`
      };
    }
  }
  async updateTopicConfig(topic, config) {
    const admin = this.ensureConnected();
    try {
      await admin.alterConfigs({
        resources: [
          {
            type: ResourceTypes.TOPIC,
            name: topic,
            configEntries: Object.entries(config).map(([name, value]) => ({ name, value }))
          }
        ]
      });
      return {
        success: true,
        message: `Topic '${topic}' configuration updated`,
        details: config
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update topic '${topic}' config: ${error.message}`
      };
    }
  }
  async getTopicConfig(topic) {
    const admin = this.ensureConnected();
    try {
      const result = await admin.describeConfigs({
        resources: [{ type: ResourceTypes.TOPIC, name: topic }]
      });
      const configs = {};
      for (const entry of result.resources[0].configEntries) {
        configs[entry.configName] = entry.configValue;
      }
      return configs;
    } catch (error) {
      throw new Error(`Failed to get topic config for '${topic}': ${error.message}`);
    }
  }
  // ==================================================
  // Consumer Group Operations
  // ==================================================
  async listConsumerGroups() {
    const admin = this.ensureConnected();
    try {
      const groups = await admin.listGroups();
      return groups.groups.map((g) => g.groupId);
    } catch (error) {
      throw new Error(`Failed to list consumer groups: ${error.message}`);
    }
  }
  async describeConsumerGroup(groupId) {
    const admin = this.ensureConnected();
    try {
      const result = await admin.describeGroups([groupId]);
      const group = result.groups[0];
      if (!group) {
        throw new Error(`Consumer group '${groupId}' not found`);
      }
      return {
        groupId: group.groupId,
        state: group.state,
        protocolType: group.protocolType,
        protocol: group.protocol,
        members: group.members.map((m) => ({
          memberId: m.memberId,
          clientId: m.clientId,
          clientHost: m.clientHost,
          memberMetadata: m.memberMetadata,
          memberAssignment: m.memberAssignment
        })),
        coordinator: {
          id: group.coordinator.nodeId,
          host: group.coordinator.host,
          port: group.coordinator.port
        }
      };
    } catch (error) {
      throw new Error(`Failed to describe consumer group '${groupId}': ${error.message}`);
    }
  }
  async getConsumerGroupOffsets(groupId) {
    const admin = this.ensureConnected();
    try {
      const offsets = await admin.fetchOffsets({ groupId });
      const result = [];
      for (const topic of offsets) {
        for (const partition of topic.partitions) {
          result.push({
            topic: topic.topic,
            partition: partition.partition,
            currentOffset: Number(partition.offset),
            logEndOffset: 0,
            // Need to fetch from topic metadata
            lag: 0,
            // Calculate after fetching logEndOffset
            metadata: partition.metadata || ""
          });
        }
      }
      for (const offset of result) {
        const metadata = await admin.fetchTopicOffsets(offset.topic);
        const partitionMetadata = metadata.find((p) => p.partition === offset.partition);
        if (partitionMetadata) {
          offset.logEndOffset = Number(partitionMetadata.high);
          offset.lag = offset.logEndOffset - offset.currentOffset;
        }
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to get consumer group offsets for '${groupId}': ${error.message}`);
    }
  }
  async deleteConsumerGroup(groupId) {
    const admin = this.ensureConnected();
    try {
      await admin.deleteGroups([groupId]);
      return {
        success: true,
        message: `Consumer group '${groupId}' deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete consumer group '${groupId}': ${error.message}`
      };
    }
  }
  async resetConsumerGroupOffsets(groupId, topic, options) {
    const admin = this.ensureConnected();
    try {
      const topicPartitions = await admin.fetchTopicOffsets(topic);
      const resetOffsets = [];
      for (const partition of topicPartitions) {
        let offset;
        if (options.toEarliest) {
          offset = partition.low;
        } else if (options.toLatest) {
          offset = partition.high;
        } else if (options.toOffset !== void 0) {
          offset = String(options.toOffset);
        } else if (options.toDateTime) {
          throw new Error("toDateTime not implemented yet");
        } else {
          throw new Error("Must specify one of: toEarliest, toLatest, toOffset, toDateTime");
        }
        resetOffsets.push({ partition: partition.partition, offset });
      }
      await admin.setOffsets({
        groupId,
        topic,
        partitions: resetOffsets
      });
      return {
        success: true,
        message: `Consumer group '${groupId}' offsets reset for topic '${topic}'`,
        details: { resetOffsets }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reset consumer group offsets: ${error.message}`
      };
    }
  }
  // ==================================================
  // ACL Operations
  // ==================================================
  async createAcl(acl) {
    const admin = this.ensureConnected();
    try {
      await admin.createAcls({
        acl: [
          {
            resourceType: AclResourceTypes[acl.resourceType.toUpperCase()],
            resourceName: acl.resourceName,
            principal: acl.principal,
            operation: AclOperationTypes[acl.operation.toUpperCase()],
            permissionType: AclPermissionTypes[acl.permissionType.toUpperCase()],
            resourcePatternType: 2,
            // LITERAL
            host: "*"
          }
        ]
      });
      return {
        success: true,
        message: `ACL created for '${acl.principal}' on ${acl.resourceType} '${acl.resourceName}'`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create ACL: ${error.message}`
      };
    }
  }
  async listAcls() {
    const admin = this.ensureConnected();
    try {
      const result = await admin.describeAcls({
        resourceType: AclResourceTypes.ANY,
        resourceName: null,
        principal: null,
        operation: AclOperationTypes.ANY,
        permissionType: AclPermissionTypes.ANY
      });
      return result.resources;
    } catch (error) {
      throw new Error(`Failed to list ACLs: ${error.message}`);
    }
  }
}
export {
  ApacheKafkaAdapter
};
