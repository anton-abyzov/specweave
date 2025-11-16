# Kafka Infrastructure as Code - Terraform Guide

**Deploy production-ready Kafka clusters with Terraform modules**

This guide covers deploying Kafka to AWS, Azure, and Confluent Cloud using SpecWeave's Terraform modules.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Apache Kafka (Self-Managed)](#apache-kafka-self-managed)
3. [AWS MSK (Managed Streaming for Kafka)](#aws-msk)
4. [Azure Event Hubs](#azure-event-hubs)
5. [Confluent Cloud](#confluent-cloud)
6. [Module Customization](#module-customization)
7. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- **Terraform 1.5+** (`terraform --version`)
- **Cloud Provider CLI**:
  - AWS: `aws configure` (AWS CLI v2)
  - Azure: `az login` (Azure CLI)
  - Confluent: `confluent login` (Confluent CLI)
- **SpecWeave CLI** (`specweave --version`)

### Generate Terraform Modules

```bash
# Deploy to AWS MSK
/specweave-kafka:deploy aws-msk

# Deploy to Apache Kafka (EC2)
/specweave-kafka:deploy apache-kafka

# Deploy to Azure Event Hubs
/specweave-kafka:deploy azure-event-hubs

# Deploy to Confluent Cloud
/specweave-confluent:cluster-create
```

**Output**:
```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── modules/
    ├── kafka/
    ├── monitoring/
    └── networking/
```

---

## Apache Kafka (Self-Managed)

Deploy a 3-node Kafka cluster on AWS EC2 with KRaft mode (no ZooKeeper).

### Architecture

```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24) - Bastion Host
└── Private Subnets (3 AZs)
    ├── 10.0.10.0/24 - Kafka Broker 1
    ├── 10.0.11.0/24 - Kafka Broker 2
    └── 10.0.12.0/24 - Kafka Broker 3
    ├── 10.0.20.0/24 - Schema Registry
    └── 10.0.30.0/24 - Monitoring (Prometheus + Grafana)
```

### Generate Module

```bash
/specweave-kafka:deploy apache-kafka \
  --environment production \
  --region us-east-1 \
  --brokers 3 \
  --instance-type m5.xlarge
```

### Generated `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-company-terraform-state"
    key    = "kafka/production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = "Kafka"
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.environment}-kafka-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-kafka-vpc"
  }
}

module "security_groups" {
  source = "./modules/security-groups"

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}

module "kafka_cluster" {
  source = "./modules/kafka"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnets
  security_group_id   = module.security_groups.kafka_sg_id

  broker_count        = var.broker_count
  instance_type       = var.kafka_instance_type
  volume_size_gb      = var.kafka_volume_size
  kafka_version       = var.kafka_version

  kraft_mode          = true # KRaft mode (no ZooKeeper)

  tags = {
    Name = "${var.environment}-kafka-cluster"
  }
}

module "schema_registry" {
  source = "./modules/schema-registry"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  security_group_id  = module.security_groups.schema_registry_sg_id

  kafka_bootstrap_servers = module.kafka_cluster.bootstrap_servers

  tags = {
    Name = "${var.environment}-schema-registry"
  }
}

module "monitoring" {
  source = "./modules/monitoring"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  security_group_id  = module.security_groups.monitoring_sg_id

  kafka_broker_ips = module.kafka_cluster.broker_private_ips

  tags = {
    Name = "${var.environment}-kafka-monitoring"
  }
}
```

### Variables (`variables.tf`)

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "broker_count" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 3
}

variable "kafka_instance_type" {
  description = "EC2 instance type for Kafka brokers"
  type        = string
  default     = "m5.xlarge"

  validation {
    condition     = can(regex("^(m5|m6i|r5|r6i)\\.(xlarge|2xlarge|4xlarge)$", var.kafka_instance_type))
    error_message = "Instance type must be m5, m6i, r5, or r6i family with xlarge or larger size."
  }
}

variable "kafka_volume_size" {
  description = "EBS volume size in GB for each broker"
  type        = number
  default     = 500
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.6.1"
}
```

### Deploy

```bash
cd terraform/

# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Outputs
terraform output
```

**Outputs**:
```
bootstrap_servers = "10.0.10.10:9092,10.0.11.10:9092,10.0.12.10:9092"
schema_registry_url = "http://10.0.20.10:8081"
grafana_url = "http://<public-ip>:3000"
```

---

## AWS MSK

AWS Managed Streaming for Apache Kafka - fully managed Kafka service.

### Architecture

```
AWS MSK Cluster
├── 3 Brokers (Multi-AZ)
├── Automatic Patching
├── Automatic Scaling
└── CloudWatch Integration
```

### Generate Module

```bash
/specweave-kafka:deploy aws-msk \
  --environment production \
  --region us-east-1 \
  --instance-type kafka.m5.large \
  --storage 100
```

### Generated `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.environment}-msk-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs

  enable_nat_gateway = true
  enable_dns_hostnames = true
}

resource "aws_security_group" "msk" {
  name        = "${var.environment}-msk-sg"
  description = "Security group for MSK cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Kafka plaintext"
  }

  ingress {
    from_port   = 9094
    to_port     = 9094
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Kafka TLS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-msk-sg"
  }
}

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.environment}-kafka"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.broker_count

  broker_node_group_info {
    instance_type   = var.instance_type
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.storage_size_gb

        provisioned_throughput {
          enabled           = true
          volume_throughput = 250 # MB/s
        }
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }

    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = {
    Name = "${var.environment}-msk-cluster"
  }
}

resource "aws_msk_configuration" "main" {
  name              = "${var.environment}-msk-config"
  kafka_versions    = [var.kafka_version]
  server_properties = <<EOF
auto.create.topics.enable=false
default.replication.factor=3
min.insync.replicas=2
num.io.threads=8
num.network.threads=5
num.partitions=3
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
socket.send.buffer.bytes=102400
unclean.leader.election.enable=false
log.retention.hours=168
EOF
}

resource "aws_kms_key" "msk" {
  description             = "KMS key for MSK cluster encryption"
  deletion_window_in_days = 10

  tags = {
    Name = "${var.environment}-msk-kms"
  }
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.environment}-kafka"
  retention_in_days = 7

  tags = {
    Name = "${var.environment}-msk-logs"
  }
}

output "bootstrap_servers" {
  description = "MSK cluster bootstrap servers"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  description = "ZooKeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.main.arn
}
```

### Deploy

```bash
terraform init
terraform plan
terraform apply

# Get bootstrap servers
export KAFKA_BROKERS=$(terraform output -raw bootstrap_servers)
echo $KAFKA_BROKERS
```

### Connect to MSK

```typescript
import { Kafka } from 'kafkajs';
import * as fs from 'fs';

const kafka = new Kafka({
  clientId: 'msk-client',
  brokers: process.env.KAFKA_BROKERS!.split(','),
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync('/etc/ssl/certs/ca-bundle.crt', 'utf-8')]
  }
});
```

---

## Azure Event Hubs

Azure's Kafka-compatible event streaming service.

### Architecture

```
Azure Event Hubs Namespace
├── Event Hub (Topic equivalent)
│   ├── Partition 0
│   ├── Partition 1
│   └── Partition 2
├── Consumer Groups
└── Capture (to Blob Storage)
```

### Generate Module

```bash
/specweave-kafka:deploy azure-event-hubs \
  --environment production \
  --location eastus \
  --sku Standard \
  --partitions 3
```

### Generated `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "${var.environment}-eventhubs-rg"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_eventhub_namespace" "main" {
  name                = "${var.environment}-kafka-namespace"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.sku
  capacity            = var.capacity

  # Kafka support (enabled by default for Standard and above)
  kafka_enabled = true

  # Auto-inflate (optional)
  auto_inflate_enabled     = var.auto_inflate_enabled
  maximum_throughput_units = var.auto_inflate_enabled ? var.max_throughput_units : null

  tags = {
    Name = "${var.environment}-eventhubs-namespace"
  }
}

resource "azurerm_eventhub" "topics" {
  for_each = toset(var.topic_names)

  name                = each.value
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.partition_count
  message_retention   = var.message_retention_days

  # Capture to Blob Storage (optional)
  capture_description {
    enabled = var.capture_enabled
    encoding = "Avro"

    destination {
      name                = "EventHubArchive.AzureBlockBlob"
      archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"

      blob_container_name = var.capture_enabled ? azurerm_storage_container.capture[0].name : ""
      storage_account_id  = var.capture_enabled ? azurerm_storage_account.capture[0].id : ""
    }
  }
}

resource "azurerm_eventhub_consumer_group" "default" {
  for_each = toset(var.topic_names)

  name                = "default-consumer-group"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.topics[each.key].name
  resource_group_name = azurerm_resource_group.main.name
}

# Storage for capture (optional)
resource "azurerm_storage_account" "capture" {
  count = var.capture_enabled ? 1 : 0

  name                     = "${var.environment}kafkacapture"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Name = "${var.environment}-capture-storage"
  }
}

resource "azurerm_storage_container" "capture" {
  count = var.capture_enabled ? 1 : 0

  name                  = "kafka-captures"
  storage_account_name  = azurerm_storage_account.capture[0].name
  container_access_type = "private"
}

output "namespace_name" {
  description = "Event Hubs namespace name"
  value       = azurerm_eventhub_namespace.main.name
}

output "connection_string" {
  description = "Primary connection string"
  value       = azurerm_eventhub_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "kafka_endpoint" {
  description = "Kafka endpoint"
  value       = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093"
}
```

### Variables (`variables.tf`)

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "sku" {
  description = "Event Hubs SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "capacity" {
  description = "Throughput units (1-20 for Standard, 1-10 for Premium)"
  type        = number
  default     = 2
}

variable "topic_names" {
  description = "List of Event Hub (topic) names to create"
  type        = list(string)
  default     = ["user-events", "payments", "orders"]
}

variable "partition_count" {
  description = "Number of partitions per Event Hub"
  type        = number
  default     = 3
}

variable "message_retention_days" {
  description = "Message retention in days (1-7)"
  type        = number
  default     = 7
}

variable "auto_inflate_enabled" {
  description = "Enable auto-inflate"
  type        = bool
  default     = false
}

variable "max_throughput_units" {
  description = "Maximum throughput units when auto-inflate enabled"
  type        = number
  default     = 10
}

variable "capture_enabled" {
  description = "Enable capture to Blob Storage"
  type        = bool
  default     = false
}
```

### Connect to Azure Event Hubs

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'azure-client',
  brokers: ['production-kafka-namespace.servicebus.windows.net:9093'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: '$ConnectionString',
    password: process.env.AZURE_EVENTHUBS_CONNECTION_STRING!
  }
});
```

---

## Confluent Cloud

Fully managed Kafka service by Confluent.

### Generate Module

```bash
/specweave-confluent:cluster-create \
  --environment production \
  --cloud aws \
  --region us-east-1 \
  --cluster-type dedicated
```

### Generated `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "~> 1.0"
    }
  }
}

provider "confluent" {
  cloud_api_key    = var.confluent_cloud_api_key
  cloud_api_secret = var.confluent_cloud_api_secret
}

resource "confluent_environment" "main" {
  display_name = "${var.environment}-kafka"
}

resource "confluent_kafka_cluster" "main" {
  display_name = "${var.environment}-cluster"
  availability = "MULTI_ZONE"
  cloud        = var.cloud_provider
  region       = var.region

  # Cluster type: BASIC, STANDARD, or DEDICATED
  dedicated {
    cku = var.cku_count # Confluent Unit (1 CKU = ~100 MB/s throughput)
  }

  environment {
    id = confluent_environment.main.id
  }
}

resource "confluent_service_account" "app" {
  display_name = "${var.environment}-kafka-app"
  description  = "Service account for Kafka applications"
}

resource "confluent_api_key" "app_kafka_api_key" {
  display_name = "${var.environment}-kafka-api-key"
  description  = "Kafka API Key for application"

  owner {
    id          = confluent_service_account.app.id
    api_version = confluent_service_account.app.api_version
    kind        = confluent_service_account.app.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind

    environment {
      id = confluent_environment.main.id
    }
  }
}

resource "confluent_kafka_acl" "app_producer" {
  kafka_cluster {
    id = confluent_kafka_cluster.main.id
  }

  resource_type = "TOPIC"
  resource_name = "*"
  pattern_type  = "LITERAL"
  principal     = "User:${confluent_service_account.app.id}"
  operation     = "WRITE"
  permission    = "ALLOW"
  host          = "*"

  rest_endpoint = confluent_kafka_cluster.main.rest_endpoint
}

resource "confluent_kafka_acl" "app_consumer" {
  kafka_cluster {
    id = confluent_kafka_cluster.main.id
  }

  resource_type = "TOPIC"
  resource_name = "*"
  pattern_type  = "LITERAL"
  principal     = "User:${confluent_service_account.app.id}"
  operation     = "READ"
  permission    = "ALLOW"
  host          = "*"

  rest_endpoint = confluent_kafka_cluster.main.rest_endpoint
}

output "bootstrap_servers" {
  description = "Kafka bootstrap servers"
  value       = confluent_kafka_cluster.main.bootstrap_endpoint
}

output "api_key" {
  description = "Kafka API Key"
  value       = confluent_api_key.app_kafka_api_key.id
  sensitive   = true
}

output "api_secret" {
  description = "Kafka API Secret"
  value       = confluent_api_key.app_kafka_api_key.secret
  sensitive   = true
}
```

### Deploy

```bash
# Set Confluent Cloud credentials
export CONFLUENT_CLOUD_API_KEY="your-api-key"
export CONFLUENT_CLOUD_API_SECRET="your-api-secret"

terraform init
terraform plan
terraform apply

# Store API credentials
terraform output -json > confluent-credentials.json
```

### Connect to Confluent Cloud

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'confluent-client',
  brokers: ['pkc-xxxxx.us-east-1.aws.confluent.cloud:9092'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY!,
    password: process.env.CONFLUENT_API_SECRET!
  }
});
```

---

## Module Customization

### Custom Broker Configuration

**File**: `modules/kafka/user-data.sh`

```bash
#!/bin/bash
# Custom broker configuration

cat > /etc/kafka/server.properties <<EOF
# Broker ID (unique per broker)
broker.id={{ broker_id }}

# Listeners
listeners=PLAINTEXT://0.0.0.0:9092,SSL://0.0.0.0:9093
advertised.listeners=PLAINTEXT://{{ private_ip }}:9092,SSL://{{ private_ip }}:9093

# Log directories
log.dirs=/var/lib/kafka/logs

# Replication
default.replication.factor=3
min.insync.replicas=2
offsets.topic.replication.factor=3
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2

# Performance
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Log retention
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# KRaft mode
process.roles=broker,controller
node.id={{ broker_id }}
controller.quorum.voters=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
controller.listener.names=CONTROLLER
EOF

# Start Kafka
systemctl start kafka
systemctl enable kafka
```

### Custom Monitoring

**File**: `modules/monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kafka-brokers'
    static_configs:
      - targets:
          - '{{ broker_1_ip }}:7071'
          - '{{ broker_2_ip }}:7071'
          - '{{ broker_3_ip }}:7071'

  - job_name: 'schema-registry'
    static_configs:
      - targets: ['{{ schema_registry_ip }}:8081']

  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - '{{ broker_1_ip }}:9100'
          - '{{ broker_2_ip }}:9100'
          - '{{ broker_3_ip }}:9100'
```

---

## Best Practices

### 1. State Management

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "kafka/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### 2. Secrets Management

**Never commit secrets to version control**:

```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name /kafka/production/credentials \
  --secret-string '{"username":"admin","password":"secure-password"}'

# Use Azure Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name kafka-password \
  --value "secure-password"

# Use environment variables
export TF_VAR_kafka_password="secure-password"
```

### 3. Environment Separation

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
└── modules/
    ├── kafka/
    ├── monitoring/
    └── networking/
```

### 4. Tagging Strategy

```hcl
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "Kafka"
    CostCenter  = "Engineering"
    Owner       = "platform-team@example.com"
  }
}

resource "aws_instance" "kafka_broker" {
  tags = merge(local.common_tags, {
    Name = "${var.environment}-kafka-broker-${count.index + 1}"
    Role = "kafka-broker"
  })
}
```

### 5. Cost Optimization

**AWS MSK**:
- Use `kafka.t3.small` for dev/staging ($0.10/hr)
- Use `kafka.m5.large` for production ($0.20/hr)
- Enable auto-scaling for storage

**Azure Event Hubs**:
- Use `Basic` SKU for dev ($0.015/hr)
- Use `Standard` SKU with auto-inflate for production

**Confluent Cloud**:
- Use `BASIC` cluster for dev (pay-as-you-go)
- Use `DEDICATED` cluster for production (1 CKU = $1.50/hr)

### 6. Monitoring and Alerting

```hcl
resource "aws_cloudwatch_metric_alarm" "broker_cpu" {
  alarm_name          = "${var.environment}-kafka-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

### 7. Disaster Recovery

```hcl
# Automated backups
resource "aws_backup_plan" "kafka" {
  name = "${var.environment}-kafka-backup"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.kafka.name
    schedule          = "cron(0 2 * * ? *)" # 2 AM daily

    lifecycle {
      delete_after = 30
    }
  }
}
```

---

## Troubleshooting

### Terraform State Locked

```bash
# Remove state lock (use with caution)
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "your-lock-id"}}'
```

### Module Not Found

```bash
# Reinitialize modules
terraform init -upgrade

# Verify module sources
terraform get
```

### Provider Authentication Failed

```bash
# AWS
aws sts get-caller-identity

# Azure
az account show

# Confluent
confluent login
confluent environment list
```

---

## Next Steps

**Explore Related Guides**:
- [Advanced Usage Guide](kafka-advanced-usage.md) - EOS, security, multi-cluster
- [Troubleshooting Guide](kafka-troubleshooting.md) - Common issues
- [Getting Started Guide](kafka-getting-started.md) - Local setup

**Official Terraform Providers**:
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Confluent Provider](https://registry.terraform.io/providers/confluentinc/confluent/latest/docs)

**Community**:
- [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
- [Report Issues](https://github.com/anton-abyzov/specweave/issues)

---

**Last Updated**: 2025-11-15
