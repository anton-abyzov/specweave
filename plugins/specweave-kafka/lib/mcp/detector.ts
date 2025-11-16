/**
 * MCP Server Detector
 *
 * Auto-detects installed and running MCP servers for Kafka integration.
 * Supports: kanapuli, tuannvm, Joel-hanson, Confluent
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  MCPServerType,
  MCPServerInfo,
  MCPDetectionResult,
  MCPServerCapabilities,
  AuthMethod
} from './types';

const execAsync = promisify(exec);

export class MCPServerDetector {
  /**
   * Detect all available MCP servers
   */
  async detectAll(): Promise<MCPDetectionResult> {
    const servers: MCPServerInfo[] = [];

    // Check each MCP server type
    const checks = [
      this.detectKanapuli(),
      this.detectTuannvm(),
      this.detectJoelHanson(),
      this.detectConfluent()
    ];

    const results = await Promise.allSettled(checks);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        servers.push(result.value);
      }
    });

    // Rank servers (Confluent > tuannvm > kanapuli > Joel-hanson)
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
  private async detectKanapuli(): Promise<MCPServerInfo | null> {
    try {
      // Check if npm package installed
      const { stdout } = await execAsync('npm list -g mcp-kafka --json 2>/dev/null || echo "{}"');
      const packageInfo = JSON.parse(stdout);

      const installed = !!packageInfo.dependencies?.['mcp-kafka'];

      if (!installed) {
        return {
          type: MCPServerType.KANAPULI,
          version: 'unknown',
          installed: false,
          running: false,
          capabilities: this.getKanapuliCapabilities()
        };
      }

      // Check if running (look for process)
      const running = await this.isProcessRunning('mcp-kafka');
      const version = packageInfo.dependencies?.['mcp-kafka']?.version || 'unknown';

      return {
        type: MCPServerType.KANAPULI,
        version,
        installed: true,
        running,
        capabilities: this.getKanapuliCapabilities(),
        connectionDetails: running ? {
          host: 'localhost',
          port: 3000, // Default MCP port
          protocol: 'http',
          healthEndpoint: '/health',
          infoEndpoint: '/info'
        } : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect tuannvm/kafka-mcp-server (Go implementation)
   */
  private async detectTuannvm(): Promise<MCPServerInfo | null> {
    try {
      // Check if binary exists
      const { stdout } = await execAsync('which kafka-mcp-server 2>/dev/null || echo ""');
      const installed = !!stdout.trim();

      if (!installed) {
        return {
          type: MCPServerType.TUANNVM,
          version: 'unknown',
          installed: false,
          running: false,
          capabilities: this.getTuannvmCapabilities()
        };
      }

      // Check if running
      const running = await this.isProcessRunning('kafka-mcp-server');

      // Try to get version
      let version = 'unknown';
      try {
        const { stdout: versionOut } = await execAsync('kafka-mcp-server --version 2>/dev/null');
        version = versionOut.trim();
      } catch {}

      return {
        type: MCPServerType.TUANNVM,
        version,
        installed: true,
        running,
        capabilities: this.getTuannvmCapabilities(),
        connectionDetails: running ? {
          host: 'localhost',
          port: 8080, // Default port
          protocol: 'http'
        } : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect Joel-hanson/kafka-mcp-server
   */
  private async detectJoelHanson(): Promise<MCPServerInfo | null> {
    try {
      // Check if Python package installed
      const { stdout } = await execAsync('pip show kafka-mcp-server 2>/dev/null || echo ""');
      const installed = stdout.includes('Name: kafka-mcp-server');

      if (!installed) {
        return {
          type: MCPServerType.JOEL_HANSON,
          version: 'unknown',
          installed: false,
          running: false,
          capabilities: this.getJoelHansonCapabilities()
        };
      }

      // Extract version
      const versionMatch = stdout.match(/Version: ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Check if running
      const running = await this.isProcessRunning('kafka-mcp-server');

      return {
        type: MCPServerType.JOEL_HANSON,
        version,
        installed: true,
        running,
        capabilities: this.getJoelHansonCapabilities(),
        connectionDetails: running ? {
          host: 'localhost',
          port: 5000, // Default Python MCP port
          protocol: 'http'
        } : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect Confluent official MCP server
   */
  private async detectConfluent(): Promise<MCPServerInfo | null> {
    try {
      // Confluent MCP is typically part of Confluent Cloud CLI
      const { stdout } = await execAsync('confluent version 2>/dev/null || echo ""');
      const installed = !!stdout.trim();

      if (!installed) {
        return {
          type: MCPServerType.CONFLUENT,
          version: 'unknown',
          installed: false,
          running: false,
          capabilities: this.getConfluentCapabilities()
        };
      }

      // Extract version
      const versionMatch = stdout.match(/Version:\s+([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Confluent MCP runs as part of CLI, check if CLI is authenticated
      let running = false;
      try {
        const { stdout: authOut } = await execAsync('confluent auth current 2>/dev/null');
        running = authOut.includes('Logged in as');
      } catch {}

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
  private async isProcessRunning(processName: string): Promise<boolean> {
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
  private rankServers(servers: MCPServerInfo[]): MCPServerInfo | null {
    const ranking = [
      MCPServerType.CONFLUENT,
      MCPServerType.TUANNVM,
      MCPServerType.KANAPULI,
      MCPServerType.JOEL_HANSON
    ];

    // Find highest-ranked installed server
    for (const type of ranking) {
      const server = servers.find(s => s.type === type && s.installed);
      if (server) return server;
    }

    return null;
  }

  /**
   * Get ranking reason
   */
  private getRankingReason(recommended: MCPServerInfo | null, servers: MCPServerInfo[]): string {
    if (!recommended) {
      return 'No MCP servers installed';
    }

    const reasons: Record<MCPServerType, string> = {
      [MCPServerType.CONFLUENT]: 'Confluent official MCP (best features: natural language, Flink SQL)',
      [MCPServerType.TUANNVM]: 'Go implementation (advanced SASL: SCRAM-SHA-256/512)',
      [MCPServerType.KANAPULI]: 'Node.js implementation (basic operations, SASL_PLAINTEXT)',
      [MCPServerType.JOEL_HANSON]: 'Python implementation (Claude Desktop integration)'
    };

    return reasons[recommended.type];
  }

  /**
   * Get capabilities for each MCP server type
   */
  private getKanapuliCapabilities(): MCPServerCapabilities {
    return {
      authentication: [AuthMethod.SASL_PLAINTEXT, AuthMethod.PLAINTEXT],
      operations: ['produce', 'consume', 'list-topics', 'describe-topic', 'get-offsets'],
      advancedFeatures: []
    };
  }

  private getTuannvmCapabilities(): MCPServerCapabilities {
    return {
      authentication: [
        AuthMethod.SASL_SCRAM_SHA_256,
        AuthMethod.SASL_SCRAM_SHA_512,
        AuthMethod.SASL_PLAINTEXT,
        AuthMethod.SASL_SSL,
        AuthMethod.PLAINTEXT
      ],
      operations: [
        'produce',
        'consume',
        'list-topics',
        'create-topic',
        'delete-topic',
        'describe-topic',
        'list-consumer-groups',
        'describe-consumer-group',
        'get-offsets',
        'reset-offsets'
      ],
      advancedFeatures: ['consumer-group-management', 'offset-management']
    };
  }

  private getJoelHansonCapabilities(): MCPServerCapabilities {
    return {
      authentication: [AuthMethod.SASL_PLAINTEXT, AuthMethod.PLAINTEXT, AuthMethod.SSL],
      operations: ['produce', 'consume', 'list-topics', 'describe-topic'],
      advancedFeatures: ['claude-desktop-integration']
    };
  }

  private getConfluentCapabilities(): MCPServerCapabilities {
    return {
      authentication: [
        AuthMethod.OAUTH,
        AuthMethod.SASL_SCRAM_SHA_256,
        AuthMethod.SASL_SCRAM_SHA_512,
        AuthMethod.SASL_SSL
      ],
      operations: [
        'produce',
        'consume',
        'list-topics',
        'create-topic',
        'delete-topic',
        'describe-topic',
        'list-consumer-groups',
        'describe-consumer-group',
        'schema-registry-operations',
        'ksqldb-query',
        'flink-sql-query'
      ],
      advancedFeatures: [
        'natural-language-interface',
        'schema-registry',
        'ksqldb',
        'flink-sql',
        'cloud-managed'
      ]
    };
  }
}
