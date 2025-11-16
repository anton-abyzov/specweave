import { Kafka } from "kafkajs";
import * as fs from "fs";
import * as path from "path";
class KafkaSecurityManager {
  /**
   * Create TLS configuration from files
   */
  static createTLSConfigFromFiles(options) {
    const config = {
      enabled: true,
      rejectUnauthorized: options.rejectUnauthorized !== false,
      servername: options.servername
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
  static createSASLPlainConfig(username, password) {
    return {
      mechanism: "plain",
      username,
      password
    };
  }
  /**
   * Create SASL/SCRAM-SHA-256 configuration
   */
  static createSASLScramSHA256Config(username, password) {
    return {
      mechanism: "scram-sha-256",
      username,
      password
    };
  }
  /**
   * Create SASL/SCRAM-SHA-512 configuration
   */
  static createSASLScramSHA512Config(username, password) {
    return {
      mechanism: "scram-sha-512",
      username,
      password
    };
  }
  /**
   * Create AWS IAM authentication configuration
   */
  static createSASLAWSConfig(accessKeyId, secretAccessKey, region) {
    return {
      mechanism: "aws",
      aws: {
        accessKeyId,
        secretAccessKey,
        region
      }
    };
  }
  /**
   * Create OAuth Bearer configuration
   */
  static createSASLOAuthBearerConfig(tokenProvider) {
    return {
      mechanism: "oauthbearer",
      oauthBearer: {
        oauthBearerProvider: tokenProvider
      }
    };
  }
  /**
   * Create Kafka client with security configuration
   */
  static createSecureKafkaClient(options) {
    const connectionOptions = {};
    if (options.tls?.enabled) {
      connectionOptions.ssl = {
        rejectUnauthorized: options.tls.rejectUnauthorized !== false,
        ca: options.tls.ca ? [options.tls.ca] : void 0,
        cert: options.tls.cert,
        key: options.tls.key,
        servername: options.tls.servername
      };
    }
    if (options.sasl) {
      let saslOptions;
      switch (options.sasl.mechanism) {
        case "plain":
          saslOptions = {
            mechanism: "plain",
            username: options.sasl.username,
            password: options.sasl.password
          };
          break;
        case "scram-sha-256":
          saslOptions = {
            mechanism: "scram-sha-256",
            username: options.sasl.username,
            password: options.sasl.password
          };
          break;
        case "scram-sha-512":
          saslOptions = {
            mechanism: "scram-sha-512",
            username: options.sasl.username,
            password: options.sasl.password
          };
          break;
        case "aws":
          saslOptions = {
            mechanism: "aws",
            authorizationIdentity: options.sasl.aws.accessKeyId,
            accessKeyId: options.sasl.aws.accessKeyId,
            secretAccessKey: options.sasl.aws.secretAccessKey
          };
          break;
        case "oauthbearer":
          saslOptions = {
            mechanism: "oauthbearer",
            oauthBearerProvider: options.sasl.oauthBearer.oauthBearerProvider
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
      ...connectionOptions
    });
  }
}
class KafkaACLManager {
  constructor(kafkaHome = process.env.KAFKA_HOME || "/opt/kafka") {
    this.kafkaHome = kafkaHome;
  }
  /**
   * Create ACL
   */
  async createACL(options) {
    const args = [
      "--bootstrap-server",
      options.bootstrapServer,
      "--add",
      "--allow-principal",
      options.acl.principal,
      "--operation",
      options.acl.operation
    ];
    if (options.acl.resourceType === "TOPIC") {
      args.push("--topic", options.acl.resourceName);
    } else if (options.acl.resourceType === "GROUP") {
      args.push("--group", options.acl.resourceName);
    } else if (options.acl.resourceType === "CLUSTER") {
      args.push("--cluster");
    } else if (options.acl.resourceType === "TRANSACTIONAL_ID") {
      args.push("--transactional-id", options.acl.resourceName);
    }
    if (options.acl.patternType === "PREFIXED") {
      args.push("--resource-pattern-type", "PREFIXED");
    }
    if (options.acl.host !== "*") {
      args.push("--allow-host", options.acl.host);
    }
    if (options.commandConfig) {
      args.push("--command-config", options.commandConfig);
    }
    await this.runKafkaACLCommand(args);
  }
  /**
   * List ACLs
   */
  async listACLs(options) {
    const args = [
      "--bootstrap-server",
      options.bootstrapServer,
      "--list"
    ];
    if (options.resourceType) {
      if (options.resourceType === "TOPIC") {
        args.push("--topic", options.resourceName || "*");
      } else if (options.resourceType === "GROUP") {
        args.push("--group", options.resourceName || "*");
      } else if (options.resourceType === "CLUSTER") {
        args.push("--cluster");
      }
    }
    if (options.principal) {
      args.push("--principal", options.principal);
    }
    if (options.commandConfig) {
      args.push("--command-config", options.commandConfig);
    }
    return this.runKafkaACLCommand(args);
  }
  /**
   * Delete ACL
   */
  async deleteACL(options) {
    const args = [
      "--bootstrap-server",
      options.bootstrapServer,
      "--remove"
    ];
    if (options.acl.principal) {
      args.push("--allow-principal", options.acl.principal);
    }
    if (options.acl.resourceType === "TOPIC" && options.acl.resourceName) {
      args.push("--topic", options.acl.resourceName);
    }
    if (options.acl.operation) {
      args.push("--operation", options.acl.operation);
    }
    if (options.commandConfig) {
      args.push("--command-config", options.commandConfig);
    }
    await this.runKafkaACLCommand(args);
  }
  /**
   * Run kafka-acls.sh command
   */
  async runKafkaACLCommand(args) {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);
    const command = `${this.kafkaHome}/bin/kafka-acls.sh ${args.join(" ")}`;
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error("ACL command stderr:", stderr);
    }
    return stdout;
  }
}
var kafka_security_default = {
  KafkaSecurityManager,
  KafkaACLManager
};
export {
  KafkaACLManager,
  KafkaSecurityManager,
  kafka_security_default as default
};
