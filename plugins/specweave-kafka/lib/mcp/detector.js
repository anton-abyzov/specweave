import { exec } from "child_process";
import { promisify } from "util";
import {
  MCPServerType,
  AuthMethod
} from "./types";
const execAsync = promisify(exec);
class MCPServerDetector {
  /**
   * Detect all available MCP servers
   */
  async detectAll() {
    const servers = [];
    const checks = [
      this.detectKanapuli(),
      this.detectTuannvm(),
      this.detectJoelHanson(),
      this.detectConfluent()
    ];
    const results = await Promise.allSettled(checks);
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        servers.push(result.value);
      }
    });
    const recommended = this.rankServers(servers);
    return {
      servers,
      recommended: recommended?.type || null,
      rankingReason: this.getRankingReason(recommended, servers)
    };
  }
  /**
   * Detect kanapuli/mcp-kafka server
   */
  async detectKanapuli() {
    try {
      const { stdout } = await execAsync('npm list -g mcp-kafka --json 2>/dev/null || echo "{}"');
      const packageInfo = JSON.parse(stdout);
      const installed = !!packageInfo.dependencies?.["mcp-kafka"];
      if (!installed) {
        return {
          type: MCPServerType.KANAPULI,
          version: "unknown",
          installed: false,
          running: false,
          capabilities: this.getKanapuliCapabilities()
        };
      }
      const running = await this.isProcessRunning("mcp-kafka");
      const version = packageInfo.dependencies?.["mcp-kafka"]?.version || "unknown";
      return {
        type: MCPServerType.KANAPULI,
        version,
        installed: true,
        running,
        capabilities: this.getKanapuliCapabilities(),
        connectionDetails: running ? {
          host: "localhost",
          port: 3e3,
          // Default MCP port
          protocol: "http",
          healthEndpoint: "/health",
          infoEndpoint: "/info"
        } : void 0
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Detect tuannvm/kafka-mcp-server (Go implementation)
   */
  async detectTuannvm() {
    try {
      const { stdout } = await execAsync('which kafka-mcp-server 2>/dev/null || echo ""');
      const installed = !!stdout.trim();
      if (!installed) {
        return {
          type: MCPServerType.TUANNVM,
          version: "unknown",
          installed: false,
          running: false,
          capabilities: this.getTuannvmCapabilities()
        };
      }
      const running = await this.isProcessRunning("kafka-mcp-server");
      let version = "unknown";
      try {
        const { stdout: versionOut } = await execAsync("kafka-mcp-server --version 2>/dev/null");
        version = versionOut.trim();
      } catch {
      }
      return {
        type: MCPServerType.TUANNVM,
        version,
        installed: true,
        running,
        capabilities: this.getTuannvmCapabilities(),
        connectionDetails: running ? {
          host: "localhost",
          port: 8080,
          // Default port
          protocol: "http"
        } : void 0
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Detect Joel-hanson/kafka-mcp-server
   */
  async detectJoelHanson() {
    try {
      const { stdout } = await execAsync('pip show kafka-mcp-server 2>/dev/null || echo ""');
      const installed = stdout.includes("Name: kafka-mcp-server");
      if (!installed) {
        return {
          type: MCPServerType.JOEL_HANSON,
          version: "unknown",
          installed: false,
          running: false,
          capabilities: this.getJoelHansonCapabilities()
        };
      }
      const versionMatch = stdout.match(/Version: ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";
      const running = await this.isProcessRunning("kafka-mcp-server");
      return {
        type: MCPServerType.JOEL_HANSON,
        version,
        installed: true,
        running,
        capabilities: this.getJoelHansonCapabilities(),
        connectionDetails: running ? {
          host: "localhost",
          port: 5e3,
          // Default Python MCP port
          protocol: "http"
        } : void 0
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Detect Confluent official MCP server
   */
  async detectConfluent() {
    try {
      const { stdout } = await execAsync('confluent version 2>/dev/null || echo ""');
      const installed = !!stdout.trim();
      if (!installed) {
        return {
          type: MCPServerType.CONFLUENT,
          version: "unknown",
          installed: false,
          running: false,
          capabilities: this.getConfluentCapabilities()
        };
      }
      const versionMatch = stdout.match(/Version:\s+([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";
      let running = false;
      try {
        const { stdout: authOut } = await execAsync("confluent auth current 2>/dev/null");
        running = authOut.includes("Logged in as");
      } catch {
      }
      return {
        type: MCPServerType.CONFLUENT,
        version,
        installed: true,
        running,
        capabilities: this.getConfluentCapabilities()
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Check if process is running
   */
  async isProcessRunning(processName) {
    try {
      const { stdout } = await execAsync(`ps aux | grep "${processName}" | grep -v grep || echo ""`);
      return !!stdout.trim();
    } catch {
      return false;
    }
  }
  /**
   * Rank servers by priority (Confluent > tuannvm > kanapuli > Joel-hanson)
   */
  rankServers(servers) {
    const ranking = [
      MCPServerType.CONFLUENT,
      MCPServerType.TUANNVM,
      MCPServerType.KANAPULI,
      MCPServerType.JOEL_HANSON
    ];
    for (const type of ranking) {
      const server = servers.find((s) => s.type === type && s.installed);
      if (server) return server;
    }
    return null;
  }
  /**
   * Get ranking reason
   */
  getRankingReason(recommended, servers) {
    if (!recommended) {
      return "No MCP servers installed";
    }
    const reasons = {
      [MCPServerType.CONFLUENT]: "Confluent official MCP (best features: natural language, Flink SQL)",
      [MCPServerType.TUANNVM]: "Go implementation (advanced SASL: SCRAM-SHA-256/512)",
      [MCPServerType.KANAPULI]: "Node.js implementation (basic operations, SASL_PLAINTEXT)",
      [MCPServerType.JOEL_HANSON]: "Python implementation (Claude Desktop integration)"
    };
    return reasons[recommended.type];
  }
  /**
   * Get capabilities for each MCP server type
   */
  getKanapuliCapabilities() {
    return {
      authentication: [AuthMethod.SASL_PLAINTEXT, AuthMethod.PLAINTEXT],
      operations: ["produce", "consume", "list-topics", "describe-topic", "get-offsets"],
      advancedFeatures: []
    };
  }
  getTuannvmCapabilities() {
    return {
      authentication: [
        AuthMethod.SASL_SCRAM_SHA_256,
        AuthMethod.SASL_SCRAM_SHA_512,
        AuthMethod.SASL_PLAINTEXT,
        AuthMethod.SASL_SSL,
        AuthMethod.PLAINTEXT
      ],
      operations: [
        "produce",
        "consume",
        "list-topics",
        "create-topic",
        "delete-topic",
        "describe-topic",
        "list-consumer-groups",
        "describe-consumer-group",
        "get-offsets",
        "reset-offsets"
      ],
      advancedFeatures: ["consumer-group-management", "offset-management"]
    };
  }
  getJoelHansonCapabilities() {
    return {
      authentication: [AuthMethod.SASL_PLAINTEXT, AuthMethod.PLAINTEXT, AuthMethod.SSL],
      operations: ["produce", "consume", "list-topics", "describe-topic"],
      advancedFeatures: ["claude-desktop-integration"]
    };
  }
  getConfluentCapabilities() {
    return {
      authentication: [
        AuthMethod.OAUTH,
        AuthMethod.SASL_SCRAM_SHA_256,
        AuthMethod.SASL_SCRAM_SHA_512,
        AuthMethod.SASL_SSL
      ],
      operations: [
        "produce",
        "consume",
        "list-topics",
        "create-topic",
        "delete-topic",
        "describe-topic",
        "list-consumer-groups",
        "describe-consumer-group",
        "schema-registry-operations",
        "ksqldb-query",
        "flink-sql-query"
      ],
      advancedFeatures: [
        "natural-language-interface",
        "schema-registry",
        "ksqldb",
        "flink-sql",
        "cloud-managed"
      ]
    };
  }
}
export {
  MCPServerDetector
};
