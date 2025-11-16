/**
 * Kafka Configuration Validator
 *
 * Validates Kafka broker and client configurations against best practices.
 * Detects common misconfigurations and provides recommendations.
 */

export interface KafkaConfig {
  // Broker configuration
  broker?: {
    'log.dirs'?: string;
    'num.network.threads'?: number;
    'num.io.threads'?: number;
    'socket.send.buffer.bytes'?: number;
    'socket.receive.buffer.bytes'?: number;
    'socket.request.max.bytes'?: number;
    'log.retention.hours'?: number;
    'log.retention.bytes'?: number;
    'log.segment.bytes'?: number;
    'num.partitions'?: number;
    'num.replica.fetchers'?: number;
    'replica.lag.time.max.ms'?: number;
    'replica.socket.timeout.ms'?: number;
    'replica.fetch.max.bytes'?: number;
    'default.replication.factor'?: number;
    'min.insync.replicas'?: number;
    'unclean.leader.election.enable'?: boolean;
    'auto.create.topics.enable'?: boolean;
    'delete.topic.enable'?: boolean;
    'compression.type'?: string;
    'message.max.bytes'?: number;
    [key: string]: any;
  };

  // Producer configuration
  producer?: {
    'bootstrap.servers'?: string;
    'acks'?: string | number;
    'retries'?: number;
    'batch.size'?: number;
    'linger.ms'?: number;
    'buffer.memory'?: number;
    'compression.type'?: string;
    'max.in.flight.requests.per.connection'?: number;
    'enable.idempotence'?: boolean;
    'transactional.id'?: string;
    [key: string]: any;
  };

  // Consumer configuration
  consumer?: {
    'bootstrap.servers'?: string;
    'group.id'?: string;
    'auto.offset.reset'?: string;
    'enable.auto.commit'?: boolean;
    'auto.commit.interval.ms'?: number;
    'session.timeout.ms'?: number;
    'heartbeat.interval.ms'?: number;
    'max.poll.records'?: number;
    'max.poll.interval.ms'?: number;
    'fetch.min.bytes'?: number;
    'fetch.max.wait.ms'?: number;
    [key: string]: any;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'broker' | 'producer' | 'consumer' | 'general';
  property: string;
  currentValue: any;
  recommendedValue?: any;
  message: string;
  impact: string;
  fix?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export class ConfigValidator {
  private issues: ValidationIssue[] = [];

  /**
   * Validate complete Kafka configuration
   */
  validate(config: KafkaConfig): ValidationResult {
    this.issues = [];

    // Validate broker config
    if (config.broker) {
      this.validateBroker(config.broker);
    }

    // Validate producer config
    if (config.producer) {
      this.validateProducer(config.producer);
    }

    // Validate consumer config
    if (config.consumer) {
      this.validateConsumer(config.consumer);
    }

    // Calculate score
    const score = this.calculateScore();

    // Summary
    const summary = {
      errors: this.issues.filter(i => i.severity === 'error').length,
      warnings: this.issues.filter(i => i.severity === 'warning').length,
      infos: this.issues.filter(i => i.severity === 'info').length
    };

    return {
      valid: summary.errors === 0,
      issues: this.issues,
      score,
      summary
    };
  }

  /**
   * Validate broker configuration
   */
  private validateBroker(broker: any): void {
    // Replication settings
    const rf = broker['default.replication.factor'];
    const minISR = broker['min.insync.replicas'];

    if (rf && minISR) {
      if (minISR >= rf) {
        this.addIssue({
          severity: 'error',
          category: 'broker',
          property: 'min.insync.replicas',
          currentValue: minISR,
          recommendedValue: rf - 1,
          message: 'min.insync.replicas >= replication.factor will cause write failures',
          impact: 'CRITICAL: All writes will fail!',
          fix: `Set min.insync.replicas to ${rf - 1} (replication.factor - 1)`
        });
      }

      if (minISR === 1 && rf > 1) {
        this.addIssue({
          severity: 'warning',
          category: 'broker',
          property: 'min.insync.replicas',
          currentValue: 1,
          recommendedValue: 2,
          message: 'min.insync.replicas=1 provides no durability guarantees',
          impact: 'Data loss possible if leader fails before replication',
          fix: 'Set min.insync.replicas to 2 for production'
        });
      }
    }

    // Unclean leader election
    if (broker['unclean.leader.election.enable'] === true) {
      this.addIssue({
        severity: 'warning',
        category: 'broker',
        property: 'unclean.leader.election.enable',
        currentValue: true,
        recommendedValue: false,
        message: 'Unclean leader election enabled (data loss risk)',
        impact: 'Potential data loss if out-of-sync replica becomes leader',
        fix: 'Set unclean.leader.election.enable=false for production'
      });
    }

    // Thread configuration
    const networkThreads = broker['num.network.threads'];
    if (networkThreads && networkThreads < 3) {
      this.addIssue({
        severity: 'info',
        category: 'broker',
        property: 'num.network.threads',
        currentValue: networkThreads,
        recommendedValue: 8,
        message: 'Low network thread count may limit throughput',
        impact: 'Reduced connection handling capacity',
        fix: 'Increase num.network.threads to 8 for high-traffic brokers'
      });
    }

    const ioThreads = broker['num.io.threads'];
    if (ioThreads && ioThreads < 8) {
      this.addIssue({
        severity: 'info',
        category: 'broker',
        property: 'num.io.threads',
        currentValue: ioThreads,
        recommendedValue: 16,
        message: 'Low I/O thread count may bottleneck disk operations',
        impact: 'Reduced disk throughput',
        fix: 'Set num.io.threads to 16 (or 2x number of disks)'
      });
    }

    // Message size limits
    const maxMessageBytes = broker['message.max.bytes'];
    if (maxMessageBytes && maxMessageBytes > 10485760) { // 10 MB
      this.addIssue({
        severity: 'warning',
        category: 'broker',
        property: 'message.max.bytes',
        currentValue: maxMessageBytes,
        recommendedValue: 1048576,
        message: 'Very large max message size',
        impact: 'High memory usage, potential OOM, slow replication',
        fix: 'Consider chunking large messages or using object storage'
      });
    }

    // Compression
    const compression = broker['compression.type'];
    if (!compression || compression === 'none') {
      this.addIssue({
        severity: 'info',
        category: 'broker',
        property: 'compression.type',
        currentValue: compression || 'none',
        recommendedValue: 'lz4',
        message: 'No compression configured',
        impact: 'Higher network and disk usage',
        fix: 'Enable lz4 compression for balanced CPU/storage tradeoff'
      });
    }

    // Auto topic creation
    if (broker['auto.create.topics.enable'] === true) {
      this.addIssue({
        severity: 'warning',
        category: 'broker',
        property: 'auto.create.topics.enable',
        currentValue: true,
        recommendedValue: false,
        message: 'Auto topic creation enabled',
        impact: 'Typos in topic names create unwanted topics',
        fix: 'Disable auto.create.topics.enable and use explicit topic creation'
      });
    }
  }

  /**
   * Validate producer configuration
   */
  private validateProducer(producer: any): void {
    const acks = producer['acks'];
    const idempotence = producer['enable.idempotence'];

    // Acks configuration
    if (acks === 0) {
      this.addIssue({
        severity: 'warning',
        category: 'producer',
        property: 'acks',
        currentValue: 0,
        recommendedValue: 1,
        message: 'acks=0 provides no delivery guarantees',
        impact: 'Messages may be lost without notification',
        fix: 'Use acks=1 (leader) or acks=all (all replicas) for durability'
      });
    }

    if (acks === 1 && !idempotence) {
      this.addIssue({
        severity: 'info',
        category: 'producer',
        property: 'acks',
        currentValue: 1,
        recommendedValue: 'all',
        message: 'acks=1 may cause duplicates on retry',
        impact: 'Potential duplicate messages on network failures',
        fix: 'Use acks=all with enable.idempotence=true for exactly-once'
      });
    }

    // Idempotence
    if (idempotence === true) {
      const maxInFlight = producer['max.in.flight.requests.per.connection'];
      if (maxInFlight && maxInFlight > 5) {
        this.addIssue({
          severity: 'error',
          category: 'producer',
          property: 'max.in.flight.requests.per.connection',
          currentValue: maxInFlight,
          recommendedValue: 5,
          message: 'Idempotent producer requires max.in.flight ≤ 5',
          impact: 'Producer will fail to start',
          fix: 'Set max.in.flight.requests.per.connection to 5 or less'
        });
      }

      if (acks !== 'all' && acks !== -1) {
        this.addIssue({
          severity: 'error',
          category: 'producer',
          property: 'acks',
          currentValue: acks,
          recommendedValue: 'all',
          message: 'Idempotent producer requires acks=all',
          impact: 'Producer will fail to start',
          fix: 'Set acks=all when enable.idempotence=true'
        });
      }
    }

    // Batch size
    const batchSize = producer['batch.size'];
    if (batchSize && batchSize < 4096) {
      this.addIssue({
        severity: 'warning',
        category: 'producer',
        property: 'batch.size',
        currentValue: batchSize,
        recommendedValue: 16384,
        message: 'Very small batch size reduces throughput',
        impact: 'More network requests, lower throughput',
        fix: 'Increase batch.size to 16384 bytes (16 KB) for better batching'
      });
    }

    // Linger
    const lingerMs = producer['linger.ms'];
    if (batchSize && batchSize > 16384 && (!lingerMs || lingerMs === 0)) {
      this.addIssue({
        severity: 'info',
        category: 'producer',
        property: 'linger.ms',
        currentValue: lingerMs || 0,
        recommendedValue: 10,
        message: 'Large batch size without linger may not fill batches',
        impact: 'Batches sent before filling, wasting batch potential',
        fix: 'Set linger.ms=10 to allow time for batches to fill'
      });
    }

    // Compression
    const compression = producer['compression.type'];
    if (!compression || compression === 'none') {
      this.addIssue({
        severity: 'info',
        category: 'producer',
        property: 'compression.type',
        currentValue: compression || 'none',
        recommendedValue: 'lz4',
        message: 'No producer compression',
        impact: 'Higher network and storage usage',
        fix: 'Enable lz4 compression (fast, good ratio)'
      });
    }
  }

  /**
   * Validate consumer configuration
   */
  private validateConsumer(consumer: any): void {
    const sessionTimeout = consumer['session.timeout.ms'];
    const heartbeatInterval = consumer['heartbeat.interval.ms'];
    const maxPollInterval = consumer['max.poll.interval.ms'];
    const maxPollRecords = consumer['max.poll.records'];

    // Session timeout vs heartbeat
    if (sessionTimeout && heartbeatInterval) {
      if (heartbeatInterval >= sessionTimeout / 3) {
        this.addIssue({
          severity: 'warning',
          category: 'consumer',
          property: 'heartbeat.interval.ms',
          currentValue: heartbeatInterval,
          recommendedValue: Math.floor(sessionTimeout / 3),
          message: 'heartbeat.interval should be < session.timeout / 3',
          impact: 'Consumer may be marked dead during normal operation',
          fix: `Set heartbeat.interval.ms to ${Math.floor(sessionTimeout / 3)} or less`
        });
      }
    }

    // Max poll interval vs session timeout
    if (maxPollInterval && sessionTimeout) {
      if (maxPollInterval < sessionTimeout) {
        this.addIssue({
          severity: 'warning',
          category: 'consumer',
          property: 'max.poll.interval.ms',
          currentValue: maxPollInterval,
          recommendedValue: sessionTimeout * 2,
          message: 'max.poll.interval < session.timeout is risky',
          impact: 'Slow processing may trigger unnecessary rebalances',
          fix: `Increase max.poll.interval.ms to at least ${sessionTimeout * 2}`
        });
      }
    }

    // Max poll records
    if (maxPollRecords && maxPollRecords > 1000) {
      this.addIssue({
        severity: 'info',
        category: 'consumer',
        property: 'max.poll.records',
        currentValue: maxPollRecords,
        recommendedValue: 500,
        message: 'Very high max.poll.records',
        impact: 'Long processing time may exceed max.poll.interval',
        fix: 'Reduce max.poll.records if processing is slow (< 1ms per message)'
      });
    }

    // Auto offset reset
    const autoOffsetReset = consumer['auto.offset.reset'];
    if (!autoOffsetReset || autoOffsetReset === 'latest') {
      this.addIssue({
        severity: 'info',
        category: 'consumer',
        property: 'auto.offset.reset',
        currentValue: autoOffsetReset || 'latest',
        recommendedValue: 'earliest',
        message: 'auto.offset.reset=latest may skip messages',
        impact: 'New consumers miss messages produced before startup',
        fix: 'Consider auto.offset.reset=earliest to process all messages'
      });
    }

    // Auto commit
    const autoCommit = consumer['enable.auto.commit'];
    if (autoCommit === true) {
      this.addIssue({
        severity: 'info',
        category: 'consumer',
        property: 'enable.auto.commit',
        currentValue: true,
        recommendedValue: false,
        message: 'Auto-commit enabled',
        impact: 'Potential message loss or duplicates on consumer failure',
        fix: 'Consider manual offset management for exactly-once processing'
      });
    }

    // Group ID
    if (!consumer['group.id']) {
      this.addIssue({
        severity: 'error',
        category: 'consumer',
        property: 'group.id',
        currentValue: undefined,
        recommendedValue: 'my-consumer-group',
        message: 'Missing group.id',
        impact: 'Consumer will fail to start',
        fix: 'Set group.id to a unique consumer group name'
      });
    }
  }

  /**
   * Add validation issue
   */
  private addIssue(issue: ValidationIssue): void {
    this.issues.push(issue);
  }

  /**
   * Calculate configuration score (0-100)
   */
  private calculateScore(): number {
    const weights = {
      error: 30,
      warning: 10,
      info: 2
    };

    const penalties = this.issues.reduce((total, issue) => {
      return total + weights[issue.severity];
    }, 0);

    const score = Math.max(0, 100 - penalties);
    return Math.round(score);
  }

  /**
   * Generate configuration report
   */
  static generateReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('# Kafka Configuration Validation Report\n');
    lines.push(`**Score**: ${result.score}/100`);
    lines.push(`**Status**: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n`);

    lines.push(`## Summary`);
    lines.push(`- Errors: ${result.summary.errors}`);
    lines.push(`- Warnings: ${result.summary.warnings}`);
    lines.push(`- Info: ${result.summary.infos}\n`);

    if (result.issues.length === 0) {
      lines.push('✅ No issues found!\n');
      return lines.join('\n');
    }

    // Group by severity
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const infos = result.issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      lines.push(`## 🚨 Errors (${errors.length})\n`);
      errors.forEach((issue, idx) => {
        lines.push(`### ${idx + 1}. ${issue.property}`);
        lines.push(`- **Message**: ${issue.message}`);
        lines.push(`- **Current**: \`${issue.currentValue}\``);
        if (issue.recommendedValue !== undefined) {
          lines.push(`- **Recommended**: \`${issue.recommendedValue}\``);
        }
        lines.push(`- **Impact**: ${issue.impact}`);
        if (issue.fix) {
          lines.push(`- **Fix**: ${issue.fix}`);
        }
        lines.push('');
      });
    }

    if (warnings.length > 0) {
      lines.push(`## ⚠️  Warnings (${warnings.length})\n`);
      warnings.forEach((issue, idx) => {
        lines.push(`### ${idx + 1}. ${issue.property}`);
        lines.push(`- **Message**: ${issue.message}`);
        lines.push(`- **Current**: \`${issue.currentValue}\``);
        if (issue.recommendedValue !== undefined) {
          lines.push(`- **Recommended**: \`${issue.recommendedValue}\``);
        }
        lines.push(`- **Impact**: ${issue.impact}`);
        if (issue.fix) {
          lines.push(`- **Fix**: ${issue.fix}`);
        }
        lines.push('');
      });
    }

    if (infos.length > 0) {
      lines.push(`## 💡 Recommendations (${infos.length})\n`);
      infos.forEach((issue, idx) => {
        lines.push(`### ${idx + 1}. ${issue.property}`);
        lines.push(`- **Message**: ${issue.message}`);
        lines.push(`- **Impact**: ${issue.impact}`);
        if (issue.fix) {
          lines.push(`- **Fix**: ${issue.fix}`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }
}
