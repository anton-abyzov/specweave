/**
 * CLI Tool Types and Interfaces
 *
 * Types for kcat, kcli, kaf, kafkactl wrappers
 */

export enum CLITool {
  KCAT = 'kcat',
  KCLI = 'kcli',
  KAF = 'kaf',
  KAFKACTL = 'kafkactl'
}

export interface KcatProduceOptions {
  topic: string;
  brokers: string;
  key?: string;
  partition?: number;
  headers?: Record<string, string>;
  compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  acks?: 0 | 1 | 'all';
}

export interface KcatConsumeOptions {
  topic: string;
  brokers: string;
  offset?: 'beginning' | 'end' | 'stored' | number;
  partition?: number;
  count?: number;
  format?: 'json' | 'avro' | 'protobuf' | 'string';
  groupId?: string;
}

export interface KcatMetadataOptions {
  brokers: string;
  topic?: string;
}

export interface KcatQueryOptions {
  brokers: string;
  topic: string;
  partition?: number;
}

export interface TopicMetadata {
  name: string;
  partitions: PartitionMetadata[];
  replicationFactor: number;
  configs: Record<string, string>;
}

export interface PartitionMetadata {
  id: number;
  leader: number;
  replicas: number[];
  isr: number[]; // In-Sync Replicas
  earliestOffset: number;
  latestOffset: number;
}

export interface BrokerMetadata {
  id: number;
  host: string;
  port: number;
  rack?: string;
}

export interface ClusterMetadata {
  brokers: BrokerMetadata[];
  topics: TopicMetadata[];
  clusterId: string;
  controllerId: number;
}

export interface ConsumerMessage {
  topic: string;
  partition: number;
  offset: number;
  timestamp: number;
  key?: string;
  value: string;
  headers?: Record<string, string>;
}

export interface CLIExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  command: string;
  duration: number;
}
