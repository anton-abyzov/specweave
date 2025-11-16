/**
 * Kafka Security Patterns
 *
 * TLS/SSL encryption, SASL authentication, and ACL management
 *
 * @module kafka-security
 */

import { Kafka, SASLOptions, ConnectionOptions } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TLS/SSL Configuration
 */
export interface TLSConfig {
  /** Enable TLS */
  enabled: boolean;
  /** CA certificate (PEM format) */
  ca?: string | Buffer;
  /** Client certificate (PEM format) */
  cert?: string | Buffer;
  /** Client private key (PEM format) */
  key?: string | Buffer;
  /** Reject unauthorized certificates (default: true) */
  rejectUnauthorized?: boolean;
  /** Server name for SNI */
  servername?: string;
}

/**
 * SASL Authentication Configuration
 */
export interface SASLConfig {
  /** SASL mechanism */
  mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws' | 'oauthbearer';
  /** Username */
  username?: string;
  /** Password */
  password?: string;
  /** AWS specific configuration */
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  /** OAuth specific configuration */
  oauthBearer?: {
    oauthBearerProvider: () => Promise<{ value: string }>;
  };
}

/**
 * ACL (Access Control List) Configuration
 */
export interface ACLConfig {
  /** Principal (user) */
  principal: string;
  /** Resource type */
  resourceType: 'TOPIC' | 'GROUP' | 'CLUSTER' | 'TRANSACTIONAL_ID';
  /** Resource name (or '*' for all) */
  resourceName: string;
  /** Resource pattern type */
  patternType: 'LITERAL' | 'PREFIXED';
  /** Operation */
  operation: 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'ALTER' | 'DESCRIBE' | 'CLUSTER_ACTION' | 'DESCRIBE_CONFIGS' | 'ALTER_CONFIGS' | 'IDEMPOTENT_WRITE' | 'ALL';
  /** Permission type */
  permissionType: 'ALLOW' | 'DENY';
  /** Host (or '*' for all) */
  host: string;
}

/**
 * Kafka Security Manager
 */
export class KafkaSecurityManager {
  /**
   * Create TLS configuration from files
   */
  static createTLSConfigFromFiles(options: {
    caPath?: string;
    certPath?: string;
    keyPath?: string;
    rejectUnauthorized?: boolean;
    servername?: string;
  }): TLSConfig {
    const config: TLSConfig = {
      enabled: true,
      rejectUnauthorized: options.rejectUnauthorized !== false,
      servername: options.servername,
    };

    if (options.caPath) {
      config.ca = fs.readFileSync(path.resolve(options.caPath));
    }

    if (options.certPath) {
      config.cert = fs.readFileSync(path.resolve(options.certPath));
    }

    if (options.keyPath) {
      config.key = fs.readFileSync(path.resolve(options.keyPath));
    }

    return config;
  }

  /**
   * Create SASL/PLAIN configuration
   */
  static createSASLPlainConfig(username: string, password: string): SASLConfig {
    return {
      mechanism: 'plain',
      username,
      password,
    };
  }

  /**
   * Create SASL/SCRAM-SHA-256 configuration
   */
  static createSASLScramSHA256Config(username: string, password: string): SASLConfig {
    return {
      mechanism: 'scram-sha-256',
      username,
      password,
    };
  }

  /**
   * Create SASL/SCRAM-SHA-512 configuration
   */
  static createSASLScramSHA512Config(username: string, password: string): SASLConfig {
    return {
      mechanism: 'scram-sha-512',
      username,
      password,
    };
  }

  /**
   * Create AWS IAM authentication configuration
   */
  static createSASLAWSConfig(
    accessKeyId: string,
    secretAccessKey: string,
    region: string
  ): SASLConfig {
    return {
      mechanism: 'aws',
      aws: {
        accessKeyId,
        secretAccessKey,
        region,
      },
    };
  }

  /**
   * Create OAuth Bearer configuration
   */
  static createSASLOAuthBearerConfig(
    tokenProvider: () => Promise<{ value: string }>
  ): SASLConfig {
    return {
      mechanism: 'oauthbearer',
      oauthBearer: {
        oauthBearerProvider: tokenProvider,
      },
    };
  }

  /**
   * Create Kafka client with security configuration
   */
  static createSecureKafkaClient(options: {
    brokers: string[];
    clientId: string;
    tls?: TLSConfig;
    sasl?: SASLConfig;
  }): Kafka {
    const connectionOptions: ConnectionOptions = {};

    // TLS Configuration
    if (options.tls?.enabled) {
      connectionOptions.ssl = {
        rejectUnauthorized: options.tls.rejectUnauthorized !== false,
        ca: options.tls.ca ? [options.tls.ca] : undefined,
        cert: options.tls.cert,
        key: options.tls.key,
        servername: options.tls.servername,
      };
    }

    // SASL Configuration
    if (options.sasl) {
      let saslOptions: SASLOptions;

      switch (options.sasl.mechanism) {
        case 'plain':
          saslOptions = {
            mechanism: 'plain',
            username: options.sasl.username!,
            password: options.sasl.password!,
          };
          break;

        case 'scram-sha-256':
          saslOptions = {
            mechanism: 'scram-sha-256',
            username: options.sasl.username!,
            password: options.sasl.password!,
          };
          break;

        case 'scram-sha-512':
          saslOptions = {
            mechanism: 'scram-sha-512',
            username: options.sasl.username!,
            password: options.sasl.password!,
          };
          break;

        case 'aws':
          // @ts-ignore - AWS IAM auth typing
          saslOptions = {
            mechanism: 'aws',
            authorizationIdentity: options.sasl.aws!.accessKeyId,
            accessKeyId: options.sasl.aws!.accessKeyId,
            secretAccessKey: options.sasl.aws!.secretAccessKey,
          };
          break;

        case 'oauthbearer':
          // @ts-ignore - OAuth bearer typing
          saslOptions = {
            mechanism: 'oauthbearer',
            oauthBearerProvider: options.sasl.oauthBearer!.oauthBearerProvider,
          };
          break;

        default:
          throw new Error(`Unsupported SASL mechanism: ${options.sasl.mechanism}`);
      }

      connectionOptions.sasl = saslOptions;
    }

    return new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      ...connectionOptions,
    });
  }
}

/**
 * ACL Manager (Kafka Admin CLI wrapper)
 *
 * Note: Requires kafka-acls.sh CLI tool and admin permissions
 */
export class KafkaACLManager {
  private kafkaHome: string;

  constructor(kafkaHome: string = process.env.KAFKA_HOME || '/opt/kafka') {
    this.kafkaHome = kafkaHome;
  }

  /**
   * Create ACL
   */
  async createACL(options: {
    bootstrapServer: string;
    acl: ACLConfig;
    commandConfig?: string;
  }): Promise<void> {
    const args = [
      '--bootstrap-server',
      options.bootstrapServer,
      '--add',
      '--allow-principal',
      options.acl.principal,
      '--operation',
      options.acl.operation,
    ];

    // Resource type
    if (options.acl.resourceType === 'TOPIC') {
      args.push('--topic', options.acl.resourceName);
    } else if (options.acl.resourceType === 'GROUP') {
      args.push('--group', options.acl.resourceName);
    } else if (options.acl.resourceType === 'CLUSTER') {
      args.push('--cluster');
    } else if (options.acl.resourceType === 'TRANSACTIONAL_ID') {
      args.push('--transactional-id', options.acl.resourceName);
    }

    // Pattern type
    if (options.acl.patternType === 'PREFIXED') {
      args.push('--resource-pattern-type', 'PREFIXED');
    }

    // Host
    if (options.acl.host !== '*') {
      args.push('--allow-host', options.acl.host);
    }

    // Command config (for TLS/SASL)
    if (options.commandConfig) {
      args.push('--command-config', options.commandConfig);
    }

    await this.runKafkaACLCommand(args);
  }

  /**
   * List ACLs
   */
  async listACLs(options: {
    bootstrapServer: string;
    resourceType?: ACLConfig['resourceType'];
    resourceName?: string;
    principal?: string;
    commandConfig?: string;
  }): Promise<string> {
    const args = [
      '--bootstrap-server',
      options.bootstrapServer,
      '--list',
    ];

    if (options.resourceType) {
      if (options.resourceType === 'TOPIC') {
        args.push('--topic', options.resourceName || '*');
      } else if (options.resourceType === 'GROUP') {
        args.push('--group', options.resourceName || '*');
      } else if (options.resourceType === 'CLUSTER') {
        args.push('--cluster');
      }
    }

    if (options.principal) {
      args.push('--principal', options.principal);
    }

    if (options.commandConfig) {
      args.push('--command-config', options.commandConfig);
    }

    return this.runKafkaACLCommand(args);
  }

  /**
   * Delete ACL
   */
  async deleteACL(options: {
    bootstrapServer: string;
    acl: Partial<ACLConfig>;
    commandConfig?: string;
  }): Promise<void> {
    const args = [
      '--bootstrap-server',
      options.bootstrapServer,
      '--remove',
    ];

    if (options.acl.principal) {
      args.push('--allow-principal', options.acl.principal);
    }

    if (options.acl.resourceType === 'TOPIC' && options.acl.resourceName) {
      args.push('--topic', options.acl.resourceName);
    }

    if (options.acl.operation) {
      args.push('--operation', options.acl.operation);
    }

    if (options.commandConfig) {
      args.push('--command-config', options.commandConfig);
    }

    await this.runKafkaACLCommand(args);
  }

  /**
   * Run kafka-acls.sh command
   */
  private async runKafkaACLCommand(args: string[]): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const command = `${this.kafkaHome}/bin/kafka-acls.sh ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('ACL command stderr:', stderr);
    }

    return stdout;
  }
}

/**
 * Example Usage: TLS + SASL/SCRAM-SHA-512
 *
 * ```typescript
 * const tls = KafkaSecurityManager.createTLSConfigFromFiles({
 *   caPath: './ca-cert.pem',
 *   certPath: './client-cert.pem',
 *   keyPath: './client-key.pem',
 * });
 *
 * const sasl = KafkaSecurityManager.createSASLScramSHA512Config(
 *   'kafka-user',
 *   'secure-password'
 * );
 *
 * const kafka = KafkaSecurityManager.createSecureKafkaClient({
 *   brokers: ['broker1:9093', 'broker2:9093'],
 *   clientId: 'secure-client',
 *   tls,
 *   sasl,
 * });
 * ```
 */

/**
 * Example Usage: AWS MSK IAM Authentication
 *
 * ```typescript
 * const sasl = KafkaSecurityManager.createSASLAWSConfig(
 *   process.env.AWS_ACCESS_KEY_ID!,
 *   process.env.AWS_SECRET_ACCESS_KEY!,
 *   'us-east-1'
 * );
 *
 * const kafka = KafkaSecurityManager.createSecureKafkaClient({
 *   brokers: ['b-1.msk-cluster.amazonaws.com:9098'],
 *   clientId: 'msk-client',
 *   tls: { enabled: true },
 *   sasl,
 * });
 * ```
 */

/**
 * Example Usage: ACL Management
 *
 * ```typescript
 * const aclManager = new KafkaACLManager('/opt/kafka');
 *
 * // Grant read access to topic
 * await aclManager.createACL({
 *   bootstrapServer: 'localhost:9092',
 *   acl: {
 *     principal: 'User:alice',
 *     resourceType: 'TOPIC',
 *     resourceName: 'orders',
 *     patternType: 'LITERAL',
 *     operation: 'READ',
 *     permissionType: 'ALLOW',
 *     host: '*',
 *   },
 * });
 *
 * // Grant write access with prefix matching
 * await aclManager.createACL({
 *   bootstrapServer: 'localhost:9092',
 *   acl: {
 *     principal: 'User:bob',
 *     resourceType: 'TOPIC',
 *     resourceName: 'analytics-',
 *     patternType: 'PREFIXED',
 *     operation: 'WRITE',
 *     permissionType: 'ALLOW',
 *     host: '*',
 *   },
 * });
 *
 * // List ACLs
 * const acls = await aclManager.listACLs({
 *   bootstrapServer: 'localhost:9092',
 *   resourceType: 'TOPIC',
 * });
 * console.log(acls);
 * ```
 */

export default {
  KafkaSecurityManager,
  KafkaACLManager,
};
