# Apache Kafka Terraform Module - Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "cluster_name" {
  description = "Kafka cluster name"
  type        = string
}

variable "kafka_version" {
  description = "Apache Kafka version (3.6.0+)"
  type        = string
  default     = "3.7.0"

  validation {
    condition     = can(regex("^3\\.[6-9]\\.", var.kafka_version))
    error_message = "Kafka version must be 3.6.0 or higher for KRaft support."
  }
}

variable "broker_count" {
  description = "Number of Kafka brokers (min 3 for KRaft quorum)"
  type        = number
  default     = 3

  validation {
    condition     = var.broker_count >= 3
    error_message = "Broker count must be at least 3 for KRaft mode."
  }
}

variable "instance_type" {
  description = "EC2 instance type for brokers (null = auto-select based on workload_profile)"
  type        = string
  default     = null
}

variable "workload_profile" {
  description = "Workload profile for auto-sizing (high-throughput, balanced, low-latency)"
  type        = string
  default     = "balanced"

  validation {
    condition     = contains(["high-throughput", "balanced", "low-latency"], var.workload_profile)
    error_message = "Workload profile must be: high-throughput, balanced, or low-latency."
  }
}

variable "data_disk_count" {
  description = "Number of data disks per broker (RAID 0)"
  type        = number
  default     = 2
}

variable "disk_size_gb" {
  description = "Size of each data disk in GB"
  type        = number
  default     = 1000
}

variable "disk_type" {
  description = "EBS volume type (gp3 or io2)"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp3", "io2"], var.disk_type)
    error_message = "Disk type must be gp3 or io2."
  }
}

variable "disk_iops" {
  description = "Disk IOPS (for io2 only)"
  type        = number
  default     = null
}

variable "disk_throughput" {
  description = "Disk throughput in MB/s (for gp3 only, max 1000)"
  type        = number
  default     = 500
}

variable "heap_size_gb" {
  description = "JVM heap size in GB (null = auto-calculate)"
  type        = number
  default     = null
}

variable "vpc_id" {
  description = "VPC ID for Kafka cluster"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs (spread across AZs)"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 3
    error_message = "At least 3 subnets required for high availability."
  }
}

variable "key_name" {
  description = "SSH key pair name for EC2 instances"
  type        = string
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to Kafka (clients)"
  type        = list(string)
}

variable "monitoring_cidr_blocks" {
  description = "CIDR blocks allowed to access JMX/Prometheus metrics"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
}

variable "domain" {
  description = "Domain for DNS records (e.g., kafka.example.com)"
  type        = string
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (null = use default AWS key)"
  type        = string
  default     = null
}

variable "ami_id" {
  description = "Custom AMI ID (null = use latest Amazon Linux 2)"
  type        = string
  default     = null
}

variable "sns_alarm_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
