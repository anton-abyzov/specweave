# AWS MSK (Managed Streaming for Kafka) - Terraform Module
#
# Provisions production-ready AWS MSK cluster with monitoring, encryption, and IAM auth.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  cluster_name = "${var.environment}-${var.cluster_name}"

  # Auto-select instance type based on workload
  broker_instance_type = var.broker_instance_type != null ? var.broker_instance_type : (
    var.workload_profile == "high-throughput" ? "kafka.m5.4xlarge" :
    var.workload_profile == "balanced" ? "kafka.m5.2xlarge" :
    "kafka.m5.xlarge"
  )

  # Storage per broker
  storage_per_broker_gb = var.storage_per_broker_gb != null ? var.storage_per_broker_gb : (
    var.workload_profile == "high-throughput" ? 2000 :
    var.workload_profile == "balanced" ? 1000 :
    500
  )

  common_tags = merge(var.tags, {
    Environment  = var.environment
    ManagedBy    = "Terraform"
    ClusterName  = local.cluster_name
    Service      = "MSK"
  })
}

# ========================================
# MSK Cluster
# ========================================

resource "aws_msk_cluster" "main" {
  cluster_name           = local.cluster_name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = local.broker_instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk_cluster.id]

    storage_info {
      ebs_storage_info {
        volume_size            = local.storage_per_broker_gb
        provisioned_throughput {
          enabled           = var.enable_provisioned_throughput
          volume_throughput = var.enable_provisioned_throughput ? var.provisioned_throughput_mbps : null
        }
      }
    }

    connectivity_info {
      public_access {
        type = var.enable_public_access ? "SERVICE_PROVIDED_EIPS" : "DISABLED"
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = var.encryption_in_transit_client_broker
      in_cluster    = true
    }

    encryption_at_rest_kms_key_arn = var.kms_key_arn
  }

  client_authentication {
    sasl {
      iam   = var.enable_iam_auth
      scram = var.enable_scram_auth
    }

    tls {
      certificate_authority_arns = var.tls_ca_arns
    }

    unauthenticated = var.allow_unauthenticated
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = var.enable_cloudwatch_logs
        log_group = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.msk_broker[0].name : null
      }

      firehose {
        enabled         = var.enable_firehose_logs
        delivery_stream = var.enable_firehose_logs ? var.firehose_delivery_stream_name : null
      }

      s3 {
        enabled = var.enable_s3_logs
        bucket  = var.enable_s3_logs ? aws_s3_bucket.msk_logs[0].bucket : null
        prefix  = var.enable_s3_logs ? "msk-logs/" : null
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = local.cluster_name
  })
}

# ========================================
# MSK Configuration
# ========================================

resource "aws_msk_configuration" "main" {
  name              = "${local.cluster_name}-config"
  kafka_versions    = [var.kafka_version]
  server_properties = templatefile("${path.module}/templates/server.properties.tpl", {
    auto_create_topics_enable           = var.auto_create_topics_enable
    default_replication_factor          = var.default_replication_factor
    min_insync_replicas                 = var.min_insync_replicas
    log_retention_hours                 = var.log_retention_hours
    log_segment_bytes                   = var.log_segment_bytes
    compression_type                    = var.compression_type
    num_io_threads                      = var.num_io_threads
    num_network_threads                 = var.num_network_threads
    num_replica_fetchers                = var.num_replica_fetchers
    socket_request_max_bytes            = var.socket_request_max_bytes
    unclean_leader_election_enable      = var.unclean_leader_election_enable
    delete_topic_enable                 = var.delete_topic_enable
  })

  description = "MSK cluster configuration for ${local.cluster_name}"
}

# ========================================
# Security Group
# ========================================

resource "aws_security_group" "msk_cluster" {
  name_prefix = "${local.cluster_name}-msk-"
  description = "Security group for MSK cluster"
  vpc_id      = var.vpc_id

  # Plaintext (if enabled)
  dynamic "ingress" {
    for_each = var.encryption_in_transit_client_broker == "PLAINTEXT" ? [1] : []
    content {
      description = "Kafka plaintext"
      from_port   = 9092
      to_port     = 9092
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  # TLS
  dynamic "ingress" {
    for_each = contains(["TLS", "TLS_PLAINTEXT"], var.encryption_in_transit_client_broker) ? [1] : []
    content {
      description = "Kafka TLS"
      from_port   = 9094
      to_port     = 9094
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  # SASL/SCRAM
  dynamic "ingress" {
    for_each = var.enable_scram_auth ? [1] : []
    content {
      description = "Kafka SASL/SCRAM"
      from_port   = 9096
      to_port     = 9096
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  # IAM auth
  dynamic "ingress" {
    for_each = var.enable_iam_auth ? [1] : []
    content {
      description = "Kafka IAM auth"
      from_port   = 9098
      to_port     = 9098
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  # ZooKeeper (legacy, only if not Kafka 3.0+)
  dynamic "ingress" {
    for_each = !startswith(var.kafka_version, "3.") ? [1] : []
    content {
      description = "ZooKeeper"
      from_port   = 2181
      to_port     = 2181
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-msk-sg"
  })
}

# ========================================
# CloudWatch Log Group
# ========================================

resource "aws_cloudwatch_log_group" "msk_broker" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/msk/${local.cluster_name}"
  retention_in_days = var.cloudwatch_log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = local.common_tags
}

# ========================================
# S3 Bucket for Logs
# ========================================

resource "aws_s3_bucket" "msk_logs" {
  count = var.enable_s3_logs ? 1 : 0

  bucket_prefix = "${local.cluster_name}-msk-logs-"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-msk-logs"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "msk_logs" {
  count = var.enable_s3_logs ? 1 : 0

  bucket = aws_s3_bucket.msk_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "msk_logs" {
  count = var.enable_s3_logs ? 1 : 0

  bucket = aws_s3_bucket.msk_logs[0].id

  rule {
    id     = "archive-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}

# ========================================
# CloudWatch Alarms
# ========================================

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${local.cluster_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CpuUser"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "MSK cluster CPU usage > 80%"
  alarm_actions       = var.sns_alarm_topic_arn != null ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    "Cluster Name" = aws_msk_cluster.main.cluster_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "under_replicated_partitions" {
  alarm_name          = "${local.cluster_name}-under-replicated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnderReplicatedPartitions"
  namespace           = "AWS/Kafka"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "MSK cluster has under-replicated partitions"
  alarm_actions       = var.sns_alarm_topic_arn != null ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    "Cluster Name" = aws_msk_cluster.main.cluster_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "offline_partitions" {
  alarm_name          = "${local.cluster_name}-offline-partitions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "OfflinePartitionsCount"
  namespace           = "AWS/Kafka"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "MSK cluster has offline partitions (CRITICAL)"
  alarm_actions       = var.sns_alarm_topic_arn != null ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    "Cluster Name" = aws_msk_cluster.main.cluster_name
  }

  tags = local.common_tags
}
