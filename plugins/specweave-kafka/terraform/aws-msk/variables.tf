# AWS MSK Terraform Module - Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "cluster_name" {
  description = "MSK cluster name"
  type        = string
}

variable "kafka_version" {
  description = "Kafka version (e.g., 3.6.0, 3.7.0)"
  type        = string
  default     = "3.7.0"
}

variable "number_of_broker_nodes" {
  description = "Number of broker nodes (must be multiple of AZ count)"
  type        = number
  default     = 3

  validation {
    condition     = var.number_of_broker_nodes >= 3
    error_message = "Number of broker nodes must be at least 3."
  }
}

variable "broker_instance_type" {
  description = "MSK broker instance type (null = auto-select)"
  type        = string
  default     = null
}

variable "workload_profile" {
  description = "Workload profile (high-throughput, balanced, low-latency)"
  type        = string
  default     = "balanced"
}

variable "storage_per_broker_gb" {
  description = "EBS storage per broker in GB (null = auto-calculate)"
  type        = number
  default     = null
}

variable "enable_provisioned_throughput" {
  description = "Enable EBS provisioned throughput"
  type        = bool
  default     = false
}

variable "provisioned_throughput_mbps" {
  description = "Provisioned throughput in MB/s (if enabled)"
  type        = number
  default     = 250
}

variable "vpc_id" {
  description = "VPC ID for MSK cluster"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs (spread across AZs)"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to MSK"
  type        = list(string)
}

variable "enable_public_access" {
  description = "Enable public access to MSK cluster"
  type        = bool
  default     = false
}

variable "encryption_in_transit_client_broker" {
  description = "Encryption in transit (TLS, TLS_PLAINTEXT, PLAINTEXT)"
  type        = string
  default     = "TLS"

  validation {
    condition     = contains(["TLS", "TLS_PLAINTEXT", "PLAINTEXT"], var.encryption_in_transit_client_broker)
    error_message = "Must be TLS, TLS_PLAINTEXT, or PLAINTEXT."
  }
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption at rest"
  type        = string
  default     = null
}

variable "enable_iam_auth" {
  description = "Enable IAM authentication"
  type        = bool
  default     = true
}

variable "enable_scram_auth" {
  description = "Enable SASL/SCRAM authentication"
  type        = bool
  default     = false
}

variable "tls_ca_arns" {
  description = "TLS certificate authority ARNs"
  type        = list(string)
  default     = []
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access"
  type        = bool
  default     = false
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs"
  type        = bool
  default     = true
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "enable_firehose_logs" {
  description = "Enable Kinesis Firehose logging"
  type        = bool
  default     = false
}

variable "firehose_delivery_stream_name" {
  description = "Firehose delivery stream name"
  type        = string
  default     = null
}

variable "enable_s3_logs" {
  description = "Enable S3 logging"
  type        = bool
  default     = false
}

variable "sns_alarm_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = null
}

# Kafka Configuration
variable "auto_create_topics_enable" {
  description = "Auto create topics on first produce"
  type        = bool
  default     = false
}

variable "default_replication_factor" {
  description = "Default replication factor"
  type        = number
  default     = 3
}

variable "min_insync_replicas" {
  description = "Minimum in-sync replicas"
  type        = number
  default     = 2
}

variable "log_retention_hours" {
  description = "Log retention in hours"
  type        = number
  default     = 168
}

variable "log_segment_bytes" {
  description = "Log segment size in bytes"
  type        = number
  default     = 1073741824
}

variable "compression_type" {
  description = "Compression type (lz4, gzip, snappy, zstd)"
  type        = string
  default     = "lz4"
}

variable "num_io_threads" {
  description = "Number of I/O threads"
  type        = number
  default     = 8
}

variable "num_network_threads" {
  description = "Number of network threads"
  type        = number
  default     = 5
}

variable "num_replica_fetchers" {
  description = "Number of replica fetcher threads"
  type        = number
  default     = 2
}

variable "socket_request_max_bytes" {
  description = "Socket request max bytes"
  type        = number
  default     = 104857600
}

variable "unclean_leader_election_enable" {
  description = "Allow unclean leader election"
  type        = bool
  default     = false
}

variable "delete_topic_enable" {
  description = "Enable topic deletion"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
