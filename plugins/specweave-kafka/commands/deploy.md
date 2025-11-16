---
name: specweave-kafka:deploy
description: Deploy Apache Kafka cluster using Terraform (Apache Kafka, AWS MSK, or Azure Event Hubs). Guides platform selection, sizing, and deployment.
---

# Deploy Kafka Cluster

Deploy Apache Kafka using Infrastructure as Code (Terraform).

## What This Command Does

1. **Platform Selection**: Helps you choose the right Kafka platform
2. **Cluster Sizing**: Calculates broker count, instance types, storage
3. **Terraform Generation**: Creates or uses existing Terraform modules
4. **Deployment**: Guides through terraform init/plan/apply
5. **Verification**: Tests cluster connectivity and basic operations

## Interactive Workflow

I'll ask you a few questions to determine the best deployment approach:

### Question 1: Which platform?
- **Apache Kafka** (self-hosted on AWS EC2, KRaft mode)
- **AWS MSK** (managed Kafka service)
- **Azure Event Hubs** (Kafka-compatible API)

### Question 2: What's your use case?
- **Development/Testing** (1 broker, small instance)
- **Staging** (3 brokers, medium instances)
- **Production** (3-5 brokers, large instances, multi-AZ)

### Question 3: Expected throughput?
- Messages per second (peak)
- Average message size
- Retention period (hours/days)

Based on your answers, I'll:
- ✅ Recommend broker count and instance types
- ✅ Calculate storage requirements
- ✅ Generate Terraform configuration
- ✅ Guide deployment

## Example Usage

```bash
# Start deployment wizard
/specweave-kafka:deploy

# I'll activate kafka-iac-deployment skill and guide you through:
# 1. Platform selection
# 2. Sizing calculation (using ClusterSizingCalculator)
# 3. Terraform module selection (apache-kafka, aws-msk, or azure-event-hubs)
# 4. Deployment execution
# 5. Post-deployment verification
```

## What Gets Created

**Apache Kafka Deployment** (AWS EC2):
- 3-5 EC2 instances (m5.xlarge or larger)
- EBS volumes (GP3, 100Gi+ per broker)
- Security groups (SASL_SSL on port 9093)
- IAM roles for S3 backups
- CloudWatch alarms
- Load balancer (optional)

**AWS MSK Deployment**:
- MSK cluster (3-6 brokers)
- VPC, subnets, security groups
- IAM authentication
- CloudWatch monitoring
- Auto-scaling (optional)

**Azure Event Hubs Deployment**:
- Event Hubs namespace (Premium SKU)
- Event hubs (topics)
- Private endpoints
- Auto-inflate enabled
- Zone redundancy

## Prerequisites

- Terraform 1.5+ installed
- AWS CLI (for AWS deployments) or Azure CLI (for Azure)
- Appropriate cloud credentials configured
- VPC and subnets created (if deploying to cloud)

## Post-Deployment

After deployment succeeds, I'll:
1. ✅ Output bootstrap servers
2. ✅ Provide connection examples
3. ✅ Suggest running `/specweave-kafka:monitor-setup` for Prometheus + Grafana
4. ✅ Suggest testing with `/specweave-kafka:dev-env` locally

---

**Skills Activated**: kafka-iac-deployment, kafka-architecture
**Related Commands**: /specweave-kafka:monitor-setup, /specweave-kafka:dev-env
