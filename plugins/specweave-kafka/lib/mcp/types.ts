/**
 * MCP Server Types and Interfaces
 *
 * Defines types for MCP server detection, configuration, and operations.
 */

export enum MCPServerType {
  KANAPULI = 'kanapuli',
  TUANNVM = 'tuannvm',
  JOEL_HANSON = 'joel-hanson',
  CONFLUENT = 'confluent'
}

export interface MCPServerInfo {
  type: MCPServerType;
  version: string;
  installed: boolean;
  running: boolean;
  capabilities: MCPServerCapabilities;
  connectionDetails?: MCPConnectionDetails;
}

export interface MCPServerCapabilities {
  authentication: AuthMethod[];
  operations: string[];
  advancedFeatures: string[];
}

export enum AuthMethod {
  SASL_PLAINTEXT = 'SASL_PLAINTEXT',
  SASL_SCRAM_SHA_256 = 'SASL/SCRAM-SHA-256',
  SASL_SCRAM_SHA_512 = 'SASL/SCRAM-SHA-512',
  SASL_SSL = 'SASL_SSL',
  SSL = 'SSL',
  PLAINTEXT = 'PLAINTEXT',
  OAUTH = 'OAUTH'
}

export interface MCPConnectionDetails {
  host: string;
  port: number;
  protocol: string;
  healthEndpoint?: string;
  infoEndpoint?: string;
}

export interface MCPServerConfig {
  serverType: MCPServerType;
  brokerUrls: string[];
  authentication: {
    mechanism: AuthMethod;
    username?: string;
    password?: string;
    saslMechanism?: string;
    sslCertPath?: string;
    sslKeyPath?: string;
    sslCaPath?: string;
  };
  options?: Record<string, any>;
}

export interface MCPDetectionResult {
  servers: MCPServerInfo[];
  recommended: MCPServerType | null;
  rankingReason: string;
}

export interface MCPOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    serverType: MCPServerType;
    operation: string;
    duration: number;
  };
}
