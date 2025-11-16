# Apache Kafka Cluster (KRaft Mode) - Terraform Module
#
# Provisions a production-ready Apache Kafka cluster using KRaft (no ZooKeeper).
# Supports AWS, Azure, GCP with auto-scaling, monitoring, and security.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
      configuration_aliases = [aws]
    }
  }
}

locals {
  cluster_name = "${var.environment}-${var.cluster_name}"

  # Calculate broker count (min 3 for KRaft quorum)
  broker_count = max(3, var.broker_count)

  # Determine instance type based on workload
  instance_type = var.instance_type != null ? var.instance_type : (
    var.workload_profile == "high-throughput" ? "r6i.4xlarge" :
    var.workload_profile == "balanced" ? "r6i.2xlarge" :
    "r6i.xlarge" # low-latency
  )

  # Tags for all resources
  common_tags = merge(var.tags, {
    Environment  = var.environment
    ManagedBy    = "Terraform"
    ClusterName  = local.cluster_name
    KafkaVersion = var.kafka_version
  })
}

# ========================================
# EC2 Instances for Kafka Brokers
# ========================================

resource "aws_instance" "kafka_broker" {
  count = local.broker_count

  ami           = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux_2.id
  instance_type = local.instance_type
  key_name      = var.key_name

  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = [aws_security_group.kafka_broker.id]

  iam_instance_profile = aws_iam_instance_profile.kafka_broker.name

  root_block_device {
    volume_type           = "gp3"
    volume_size          = 100 # OS disk
    delete_on_termination = true
    encrypted            = true
    kms_key_id           = var.kms_key_id
  }

  # Data disks for Kafka logs
  dynamic "ebs_block_device" {
    for_each = range(var.data_disk_count)
    content {
      device_name           = "/dev/sd${substr("fghijklmnop", ebs_block_device.key, 1)}"
      volume_type           = var.disk_type # "gp3" or "io2"
      volume_size           = var.disk_size_gb
      iops                  = var.disk_type == "io2" ? var.disk_iops : null
      throughput            = var.disk_type == "gp3" ? var.disk_throughput : null
      delete_on_termination = false
      encrypted            = true
      kms_key_id           = var.kms_key_id
    }
  }

  user_data = templatefile("${path.module}/templates/kafka-broker-init.sh.tpl", {
    broker_id          = count.index
    cluster_name       = local.cluster_name
    kafka_version      = var.kafka_version
    broker_count       = local.broker_count
    data_disk_count    = var.data_disk_count
    heap_size_gb       = var.heap_size_gb
    kraft_cluster_id   = random_uuid.kraft_cluster_id.result
    controller_quorum  = join(",", [for i in range(local.broker_count) : "${i}@kafka-broker-${i}.${var.domain}:9093"])
    log_dirs           = join(",", [for i in range(var.data_disk_count) : "/data/kafka-logs-${i}"])
    s3_bucket_backups  = aws_s3_bucket.kafka_backups.bucket
    cloudwatch_namespace = "Kafka/${local.cluster_name}"
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2 only
  }

  tags = merge(local.common_tags, {
    Name     = "${local.cluster_name}-broker-${count.index}"
    Role     = "KafkaBroker"
    BrokerId = count.index
  })
}

# ========================================
# Security Group
# ========================================

resource "aws_security_group" "kafka_broker" {
  name_prefix = "${local.cluster_name}-broker-"
  description = "Security group for Kafka brokers"
  vpc_id      = var.vpc_id

  # Kafka client connections (SASL_SSL)
  ingress {
    description = "Kafka client connections (SASL_SSL)"
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # KRaft controller (internal)
  ingress {
    description = "KRaft controller (broker-to-broker)"
    from_port   = 9093
    to_port     = 9093
    protocol    = "tcp"
    self        = true
  }

  # JMX metrics
  ingress {
    description = "JMX metrics"
    from_port   = 9999
    to_port     = 9999
    protocol    = "tcp"
    cidr_blocks = var.monitoring_cidr_blocks
  }

  # Prometheus exporter
  ingress {
    description = "Prometheus JMX exporter"
    from_port   = 7071
    to_port     = 7071
    protocol    = "tcp"
    cidr_blocks = var.monitoring_cidr_blocks
  }

  # Allow all outbound
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-broker-sg"
  })
}

# ========================================
# IAM Role for Brokers
# ========================================

resource "aws_iam_role" "kafka_broker" {
  name_prefix = "${local.cluster_name}-broker-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_instance_profile" "kafka_broker" {
  name_prefix = "${local.cluster_name}-broker-"
  role        = aws_iam_role.kafka_broker.name
}

# CloudWatch Logs permissions
resource "aws_iam_role_policy_attachment" "cloudwatch_logs" {
  role       = aws_iam_role.kafka_broker.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# S3 backup permissions
resource "aws_iam_role_policy" "s3_backups" {
  name_prefix = "s3-backups-"
  role        = aws_iam_role.kafka_broker.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.kafka_backups.arn,
        "${aws_s3_bucket.kafka_backups.arn}/*"
      ]
    }]
  })
}

# ========================================
# S3 Bucket for Backups
# ========================================

resource "aws_s3_bucket" "kafka_backups" {
  bucket_prefix = "${local.cluster_name}-backups-"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-backups"
  })
}

resource "aws_s3_bucket_versioning" "kafka_backups" {
  bucket = aws_s3_bucket.kafka_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kafka_backups" {
  bucket = aws_s3_bucket.kafka_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_id
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "kafka_backups" {
  bucket = aws_s3_bucket.kafka_backups.id

  rule {
    id     = "archive-old-backups"
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
# Route53 DNS Records
# ========================================

resource "aws_route53_record" "kafka_broker" {
  count = local.broker_count

  zone_id = var.route53_zone_id
  name    = "kafka-broker-${count.index}.${var.domain}"
  type    = "A"
  ttl     = 60

  records = [aws_instance.kafka_broker[count.index].private_ip]
}

# ========================================
# CloudWatch Alarms
# ========================================

resource "aws_cloudwatch_metric_alarm" "under_replicated_partitions" {
  count = local.broker_count

  alarm_name          = "${local.cluster_name}-broker-${count.index}-under-replicated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnderReplicatedPartitions"
  namespace           = "Kafka/${local.cluster_name}"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Broker ${count.index} has under-replicated partitions"
  alarm_actions       = var.sns_alarm_topic_arn != null ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    BrokerId = count.index
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "offline_partitions" {
  alarm_name          = "${local.cluster_name}-offline-partitions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "OfflinePartitionsCount"
  namespace           = "Kafka/${local.cluster_name}"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Cluster has offline partitions (CRITICAL)"
  alarm_actions       = var.sns_alarm_topic_arn != null ? [var.sns_alarm_topic_arn] : []

  tags = local.common_tags
}

# ========================================
# Data Sources
# ========================================

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ========================================
# Random Resources
# ========================================

resource "random_uuid" "kraft_cluster_id" {
  # KRaft cluster ID (generated once, stored in state)
}
