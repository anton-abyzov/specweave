import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
class KcatWrapper {
  /**
   * Produce a message to Kafka topic
   */
  async produce(message, options) {
    const args = [
      "kcat",
      "-P",
      // Producer mode
      "-b",
      options.brokers,
      "-t",
      options.topic
    ];
    if (options.key) {
      args.push("-K", ":");
    }
    if (options.partition !== void 0) {
      args.push("-p", options.partition.toString());
    }
    if (options.compression) {
      args.push("-z", options.compression);
    }
    if (options.acks !== void 0) {
      const acksValue = options.acks === "all" ? "-1" : options.acks.toString();
      args.push("-X", `acks=${acksValue}`);
    }
    const command = args.join(" ");
    const input = options.key ? `${options.key}:${message}` : message;
    return this.execute(command, input);
  }
  /**
   * Consume messages from Kafka topic
   */
  async consume(options) {
    const args = [
      "kcat",
      "-C",
      // Consumer mode
      "-b",
      options.brokers,
      "-t",
      options.topic,
      "-f",
      "%t:%p:%o:%k:%s\\n"
      // Format: topic:partition:offset:key:value
    ];
    if (options.offset) {
      args.push("-o", options.offset.toString());
    }
    if (options.partition !== void 0) {
      args.push("-p", options.partition.toString());
    }
    if (options.count) {
      args.push("-c", options.count.toString());
    }
    if (options.groupId) {
      args.push("-G", options.groupId);
    }
    const command = args.join(" ");
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(`kcat consume failed: ${result.error}`);
    }
    return this.parseConsumeOutput(result.output);
  }
  /**
   * Get cluster metadata
   */
  async getMetadata(options) {
    const args = [
      "kcat",
      "-L",
      // Metadata mode
      "-b",
      options.brokers,
      "-J"
      // JSON output
    ];
    if (options.topic) {
      args.push("-t", options.topic);
    }
    const command = args.join(" ");
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(`kcat metadata failed: ${result.error}`);
    }
    return this.parseMetadataOutput(result.output);
  }
  /**
   * Query topic offsets
   */
  async queryOffsets(options) {
    const args = [
      "kcat",
      "-Q",
      // Query mode
      "-b",
      options.brokers,
      "-t",
      options.topic
    ];
    if (options.partition !== void 0) {
      args.push("-p", options.partition.toString());
    }
    const command = args.join(" ");
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(`kcat query failed: ${result.error}`);
    }
    return this.parseQueryOutput(result.output);
  }
  /**
   * Execute kcat command
   */
  async execute(command, input) {
    const startTime = Date.now();
    try {
      const execOptions = {
        maxBuffer: 10 * 1024 * 1024,
        // 10MB buffer
        timeout: 3e4
        // 30 second timeout
      };
      if (input) {
        execOptions.input = input;
      }
      const { stdout, stderr } = await execAsync(command, execOptions);
      const duration = Date.now() - startTime;
      return {
        success: true,
        output: stdout,
        error: stderr || void 0,
        exitCode: 0,
        command,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: error.stdout || "",
        error: error.stderr || error.message,
        exitCode: error.code || 1,
        command,
        duration
      };
    }
  }
  /**
   * Parse consume output into messages
   */
  parseConsumeOutput(output) {
    const lines = output.trim().split("\n").filter((line) => line.length > 0);
    const messages = [];
    for (const line of lines) {
      const parts = line.split(":");
      if (parts.length >= 5) {
        messages.push({
          topic: parts[0],
          partition: parseInt(parts[1]),
          offset: parseInt(parts[2]),
          key: parts[3] || void 0,
          value: parts.slice(4).join(":"),
          // Rejoin in case value contains ':'
          timestamp: Date.now()
          // kcat doesn't provide timestamp in this format
        });
      }
    }
    return messages;
  }
  /**
   * Parse metadata JSON output
   */
  parseMetadataOutput(output) {
    const metadata = JSON.parse(output);
    return {
      clusterId: metadata.originatingBroker?.cluster || "unknown",
      controllerId: metadata.controllerId || -1,
      brokers: (metadata.brokers || []).map((b) => ({
        id: b.id,
        host: b.host,
        port: b.port,
        rack: b.rack
      })),
      topics: (metadata.topics || []).map((t) => ({
        name: t.topic,
        replicationFactor: this.calculateReplicationFactor(t.partitions),
        configs: {},
        partitions: (t.partitions || []).map((p) => ({
          id: p.partition,
          leader: p.leader,
          replicas: p.replicas || [],
          isr: p.isrs || [],
          earliestOffset: 0,
          // Not provided in metadata
          latestOffset: 0
          // Not provided in metadata
        }))
      }))
    };
  }
  /**
   * Calculate replication factor from partitions
   */
  calculateReplicationFactor(partitions) {
    if (!partitions || partitions.length === 0) return 0;
    return partitions[0].replicas?.length || 0;
  }
  /**
   * Parse query offset output
   */
  parseQueryOutput(output) {
    const lines = output.trim().split("\n");
    const offsets = {};
    for (const line of lines) {
      const match = line.match(/(\d+)\s+\[(\d+)\]\s+\[(\d+)\]/);
      if (match) {
        const partition = parseInt(match[1]);
        offsets[partition] = {
          earliest: parseInt(match[2]),
          latest: parseInt(match[3])
        };
      }
    }
    return offsets;
  }
  /**
   * Check if kcat is installed
   */
  static async isInstalled() {
    try {
      const { stdout } = await execAsync("which kcat 2>/dev/null || which kafkacat 2>/dev/null");
      return !!stdout.trim();
    } catch {
      return false;
    }
  }
  /**
   * Get kcat version
   */
  static async getVersion() {
    try {
      const { stdout } = await execAsync("kcat -V 2>&1 || kafkacat -V 2>&1");
      const match = stdout.match(/kafkacat - Apache Kafka producer and consumer tool\s+(\S+)/);
      return match ? match[1] : "unknown";
    } catch {
      return "unknown";
    }
  }
}
export {
  KcatWrapper
};
