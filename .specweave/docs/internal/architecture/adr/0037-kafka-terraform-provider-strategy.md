# ADR-0037: Kafka Terraform Provider Strategy

**Date**: 2025-11-15
**Status**: Accepted

## Context

Terraform infrastructure-as-code is essential for production Kafka deployments. Multiple Terraform providers exist for different Kafka platforms, each with different capabilities and maturity levels.

**Available Terraform Providers** (as of 2025-11):

1. **Confluent Provider** (Official)
   - Vendor: Confluent (official)
   - Platforms: Confluent Cloud only
   - Features: Environments, clusters, topics, ACLs, RBAC, connectors, Schema Registry, ksqlDB, networks
   - Maturity: Production-grade, 99.99% SLA support
   - Authentication: API Key + API Secret
   - Documentation: Excellent, comprehensive examples

2. **Mongey/kafka Provider** (Community)
   - Vendor: Community-maintained (by Stephen Hoekstra)
   - Platforms: Self-hosted Apache Kafka, AWS MSK, Azure Event Hubs
   - Features: Topics, ACLs, quotas, basic cluster operations
   - Maturity: Mature, widely adopted
   - Authentication: SASL/PLAINTEXT, SCRAM, TLS
   - Limitations: No Schema Registry, no Kafka Connect management

3. **AWS MSK Provider** (via AWS Provider)
   - Vendor: HashiCorp + AWS
   - Platforms: AWS MSK only
   - Features: Cluster provisioning, configuration, VPC integration, IAM roles
   - Maturity: Production-grade
   - Authentication: AWS credentials (IAM)
   - Limitations: AWS-specific, doesn't manage topics/ACLs (requires Mongey provider)

4. **Azure Event Hubs** (via AzureRM Provider)
   - Vendor: HashiCorp + Microsoft
   - Platforms: Azure Event Hubs (Kafka-compatible)
   - Features: Namespace, Event Hubs, authorization rules, Kafka configuration
   - Maturity: Production-grade
   - Authentication: Azure credentials (Service Principal)
   - Limitations: Event Hubs-specific, not full Kafka feature parity

**Key Decision Factors**:
- Platform coverage (self-hosted vs cloud-managed)
- Feature completeness (topics, ACLs, Schema Registry, connectors)
- Maturity and community support
- Documentation quality
- Authentication methods
- Maintenance and updates

**Requirements from User Stories**:
- US-005: Terraform Kafka Infrastructure Modules (P1)
- AC-US5-01: Self-hosted Apache Kafka (Docker Compose) - P1
- AC-US5-02: AWS MSK cluster provisioning - P1
- AC-US5-03: Azure Event Hubs namespace - P2
- AC-US5-04: Confluent Cloud cluster - P1
- AC-US5-05: Redpanda cluster - P2

## Decision

We will implement a **multi-provider strategy based on deployment platform**:

1. **Confluent Provider** → For Confluent Cloud deployments
2. **Mongey/kafka Provider** → For self-hosted Apache Kafka (topics, ACLs, quotas)
3. **AWS Provider** → For AWS MSK cluster provisioning (combined with Mongey for topics)
4. **AzureRM Provider** → For Azure Event Hubs namespace provisioning
5. **Docker Provider** → For local Docker Compose Kafka clusters
6. **Kubernetes Provider + Strimzi/Redpanda Operators** → For K8s-based Kafka

**Rationale**: Each provider is best-in-class for its specific platform. No single provider covers all platforms comprehensively.

## Alternatives Considered

### Alternative 1: Confluent Provider Only

**Pros**:
- Single provider to maintain
- Comprehensive features for Confluent Cloud
- Official vendor support
- Production-grade

**Cons**:
- Confluent Cloud only (excludes 70% of Kafka users)
- No support for self-hosted Kafka
- No support for AWS MSK or Azure Event Hubs
- Vendor lock-in

**Why NOT chosen**: Excludes self-hosted Kafka users, violates SpecWeave's platform-agnostic principle.

### Alternative 2: Mongey/kafka Provider Only

**Pros**:
- Works with self-hosted Kafka, AWS MSK, Azure Event Hubs
- Open source, community-driven
- Good documentation
- Supports topics, ACLs, quotas

**Cons**:
- No cluster provisioning (only manages existing clusters)
- No Confluent Cloud support
- No Schema Registry management
- No Kafka Connect management
- Limited features compared to Confluent provider

**Why NOT chosen**: Doesn't support cluster provisioning (AC-US5-02: AWS MSK provisioning), no Confluent Cloud support (AC-US5-04).

### Alternative 3: Cloud Provider Providers Only (AWS + Azure)

**Pros**:
- Native cloud integration
- Production-grade
- Well-maintained

**Cons**:
- No self-hosted Kafka support
- Requires Mongey provider for topic/ACL management
- No GCP support out of the box
- Complex multi-provider configuration

**Why NOT chosen**: Doesn't support self-hosted Kafka (AC-US5-01), requires Mongey provider anyway.

### Alternative 4: Build Custom Terraform Provider

**Pros**:
- Full control
- Unified API across all platforms
- Can support all Kafka features

**Cons**:
- Massive development effort (6+ months)
- Maintenance burden
- Duplicates existing solutions
- Terraform provider development is complex
- HashiCorp registry submission required

**Why NOT chosen**: Not aligned with SpecWeave's principle of leveraging existing tools. Significant development overhead.

## Consequences

### Positive

✅ **Best-in-Class Features**: Each provider optimized for its platform
- Confluent: Full Confluent Cloud feature set (Schema Registry, ksqlDB, connectors)
- Mongey: Robust topic/ACL management for self-hosted Kafka
- AWS: Native AWS MSK cluster provisioning with VPC integration
- Azure: Native Event Hubs provisioning

✅ **Platform Flexibility**: Users choose deployment platform without Terraform limitations
- Self-hosted Kafka → Mongey provider
- Confluent Cloud → Confluent provider
- AWS MSK → AWS provider + Mongey provider (hybrid)
- Azure Event Hubs → AzureRM provider

✅ **Mature, Maintained Providers**: All providers are production-grade
- Confluent: Official vendor support
- Mongey: Community-maintained, 1000+ GitHub stars
- AWS/Azure: HashiCorp-maintained

✅ **Comprehensive Examples**: Each provider has excellent documentation
- Copy-paste Terraform modules
- Real-world examples
- Best practices built-in

✅ **Future-Proof**: Easy to add new providers as platforms evolve
- GCP Cloud Pub/Sub Kafka API
- Redpanda Cloud
- Other Kafka-compatible platforms

### Negative

❌ **Multiple Providers to Maintain**: 4+ Terraform providers
- Different syntax per provider
- Different authentication methods
- Different resource naming conventions

**Mitigation**: Create unified SpecWeave Terraform modules that abstract provider differences

❌ **Hybrid Provider Requirements**: AWS MSK requires AWS + Mongey providers
- AWS provider for cluster provisioning
- Mongey provider for topic/ACL management
- More complex Terraform configuration

**Mitigation**: Provide pre-built modules that combine providers transparently

❌ **Learning Curve**: Users must learn different provider syntaxes
- Confluent syntax vs Mongey syntax
- Different authentication methods

**Mitigation**:
- Quick start guide with examples per platform
- Decision tree: "Use X provider for Y platform"
- Pre-built modules hide complexity

❌ **Version Compatibility**: Must track compatibility across multiple providers
- Confluent provider updates
- Mongey provider updates
- Cloud provider updates

**Mitigation**:
- Pin provider versions in modules
- Quarterly compatibility review
- Version matrix documentation

### Neutral

🔄 **Provider Selection**: Users must choose provider based on platform
- Explicit choice (better understanding)
- Clear separation of concerns

🔄 **Configuration Complexity**: More providers = more configuration files
- Terraform backend per platform
- State management per provider
- Generally not an issue with proper module structure

## Implementation Details

### Terraform Module Structure

```
plugins/specweave-kafka/terraform/
├── confluent-cloud/          # Confluent Provider modules
│   ├── cluster/
│   ├── topics/
│   ├── connectors/
│   ├── schema-registry/
│   └── examples/
├── self-hosted/              # Mongey Provider modules
│   ├── topics/
│   ├── acls/
│   ├── quotas/
│   └── examples/
├── aws-msk/                  # AWS Provider + Mongey modules
│   ├── cluster/              # Uses AWS provider
│   ├── topics/               # Uses Mongey provider
│   └── examples/
├── azure-event-hubs/         # AzureRM Provider modules
│   ├── namespace/
│   ├── event-hubs/
│   └── examples/
├── docker-compose/           # Docker Provider modules
│   ├── local-cluster/
│   └── examples/
└── README.md                 # Provider selection guide
```

### Example: Confluent Cloud Module

```hcl
# plugins/specweave-kafka/terraform/confluent-cloud/cluster/main.tf

terraform {
  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "~> 1.60"
    }
  }
}

provider "confluent" {
  cloud_api_key    = var.confluent_api_key
  cloud_api_secret = var.confluent_api_secret
}

resource "confluent_environment" "main" {
  display_name = var.environment_name
}

resource "confluent_kafka_cluster" "main" {
  display_name = var.cluster_name
  availability = var.availability  # SINGLE_ZONE, MULTI_ZONE, HIGH
  cloud        = var.cloud         # AWS, GCP, AZURE
  region       = var.region

  basic {}  # or standard {}, dedicated { cku = 2 }

  environment {
    id = confluent_environment.main.id
  }
}

output "bootstrap_endpoint" {
  value = confluent_kafka_cluster.main.bootstrap_endpoint
}

output "rest_endpoint" {
  value = confluent_kafka_cluster.main.rest_endpoint
}
```

### Example: Self-Hosted Kafka (Mongey Provider)

```hcl
# plugins/specweave-kafka/terraform/self-hosted/topics/main.tf

terraform {
  required_providers {
    kafka = {
      source  = "Mongey/kafka"
      version = "~> 0.7"
    }
  }
}

provider "kafka" {
  bootstrap_servers = var.bootstrap_servers
  ca_cert           = file(var.ca_cert_file)
  client_cert       = file(var.client_cert_file)
  client_key        = file(var.client_key_file)
  tls_enabled       = true
  sasl_mechanism    = "scram-sha256"
  sasl_username     = var.sasl_username
  sasl_password     = var.sasl_password
}

resource "kafka_topic" "example" {
  name               = var.topic_name
  replication_factor = var.replication_factor
  partitions         = var.partitions

  config = {
    "cleanup.policy"      = var.cleanup_policy  # delete, compact
    "retention.ms"        = var.retention_ms
    "compression.type"    = "lz4"
    "min.insync.replicas" = var.min_insync_replicas
  }
}

resource "kafka_acl" "example" {
  resource_name       = kafka_topic.example.name
  resource_type       = "Topic"
  acl_principal       = "User:${var.consumer_username}"
  acl_host            = "*"
  acl_operation       = "Read"
  acl_permission_type = "Allow"
}
```

### Example: AWS MSK (Hybrid Provider)

```hcl
# plugins/specweave-kafka/terraform/aws-msk/cluster/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kafka = {
      source  = "Mongey/kafka"
      version = "~> 0.7"
    }
  }
}

# Step 1: Provision MSK cluster (AWS provider)
resource "aws_msk_cluster" "main" {
  cluster_name           = var.cluster_name
  kafka_version          = var.kafka_version  # "3.6.0"
  number_of_broker_nodes = var.broker_count

  broker_node_group_info {
    instance_type   = var.instance_type  # kafka.m5.large
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.volume_size_gb
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      scram = true
    }
  }

  tags = var.tags
}

# Step 2: Manage topics (Mongey provider)
provider "kafka" {
  bootstrap_servers = aws_msk_cluster.main.bootstrap_brokers_tls
  tls_enabled       = true
  sasl_mechanism    = "scram-sha256"
  sasl_username     = var.sasl_username
  sasl_password     = var.sasl_password
}

resource "kafka_topic" "example" {
  name               = var.topic_name
  replication_factor = 3
  partitions         = var.partitions
}

output "bootstrap_brokers_tls" {
  value = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  value = aws_msk_cluster.main.zookeeper_connect_string
}
```

### Provider Selection Decision Tree

```
Platform → Provider(s)
├── Confluent Cloud → Confluent Provider
├── Self-hosted Kafka → Mongey Provider
├── AWS MSK → AWS Provider + Mongey Provider
├── Azure Event Hubs → AzureRM Provider
├── GCP Pub/Sub (Kafka API) → Google Provider
├── Redpanda (K8s) → Kubernetes Provider + Redpanda Operator
├── Redpanda (VMs) → Mongey Provider (Kafka-compatible)
└── Local Docker → Docker Provider
```

### Authentication Methods by Provider

| Provider | Authentication |
|----------|----------------|
| **Confluent** | API Key + API Secret (Confluent Cloud credentials) |
| **Mongey** | SASL/PLAINTEXT, SCRAM-SHA-256/512, TLS client certificates |
| **AWS** | IAM credentials (Access Key + Secret Key or IAM role) |
| **AzureRM** | Service Principal (Client ID + Client Secret + Tenant ID) |
| **Docker** | Docker socket (local only) |

## Risks

**Risk 1: Provider Deprecation**
- **Impact**: Provider becomes unmaintained or deprecated
- **Mitigation**: Mongey/kafka has 1000+ stars, actively maintained. Confluent is official vendor.
- **Probability**: Low
- **Severity**: Medium

**Risk 2: Feature Gaps**
- **Impact**: Provider doesn't support new Kafka features
- **Mitigation**: Use latest provider versions, contribute to open-source providers
- **Probability**: Medium
- **Severity**: Low

**Risk 3: State Management Complexity**
- **Impact**: Multiple providers = multiple Terraform state files
- **Mitigation**: Use Terraform workspaces or separate state backends per platform
- **Probability**: Low (standard Terraform practice)
- **Severity**: Low

**Risk 4: Breaking Changes**
- **Impact**: Provider updates introduce breaking changes
- **Mitigation**: Pin provider versions, test updates in staging
- **Probability**: Medium
- **Severity**: Medium

## Installation Workflow

### Quick Start (Confluent Cloud)

```bash
# Generate Terraform module
/specweave-kafka:terraform-init --platform confluent-cloud

# Output:
# ✓ Selected provider: Confluent (confluentinc/confluent v1.60)
# ✓ Generated Terraform files in .specweave/kafka/terraform/
#
# Next steps:
# 1. Set Confluent API credentials:
#    export CONFLUENT_CLOUD_API_KEY="xxx"
#    export CONFLUENT_CLOUD_API_SECRET="yyy"
# 2. Review terraform/main.tf
# 3. Run: terraform init && terraform plan
```

### Quick Start (Self-Hosted Kafka)

```bash
# Generate Terraform module
/specweave-kafka:terraform-init --platform self-hosted

# Output:
# ✓ Selected provider: Mongey/kafka (v0.7.1)
# ✓ Generated Terraform files in .specweave/kafka/terraform/
#
# Next steps:
# 1. Configure Kafka connection in terraform/variables.tf:
#    - bootstrap_servers
#    - authentication (SASL/TLS)
# 2. Run: terraform init && terraform plan
```

### Quick Start (AWS MSK)

```bash
# Generate Terraform module
/specweave-kafka:terraform-init --platform aws-msk

# Output:
# ✓ Selected providers: AWS (v5.0) + Mongey/kafka (v0.7)
# ✓ Generated Terraform files in .specweave/kafka/terraform/
#
# Hybrid provider configuration:
# - AWS provider: Cluster provisioning (VPC, subnets, security groups)
# - Mongey provider: Topic management (topics, ACLs, quotas)
#
# Next steps:
# 1. Configure AWS credentials (aws configure)
# 2. Review terraform/main.tf (cluster settings)
# 3. Run: terraform init && terraform plan
```

## Related Decisions

- **ADR-0035**: Multi-Plugin Architecture - Defines `specweave-kafka` plugin scope
- **ADR-0036**: MCP Server Selection - Complements Terraform with runtime operations
- **ADR-0038**: Monitoring Stack Selection - Observability for Terraform-provisioned infrastructure
- **ADR-0039**: n8n Integration Approach - Workflow automation vs infrastructure-as-code

## References

- [Confluent Terraform Provider](https://registry.terraform.io/providers/confluentinc/confluent/latest/docs)
- [Mongey/kafka Terraform Provider](https://registry.terraform.io/providers/Mongey/kafka/latest/docs)
- [AWS MSK Terraform Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_cluster)
- [Azure Event Hubs Terraform Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [SPEC-035: US-005 Terraform Infrastructure Modules](../../specs/default/spec-035-kafka-plugin.md#us-005-terraform-kafka-infrastructure-modules-priority-p1)

---

**Last Updated**: 2025-11-15
**Author**: Architect Agent
**Increment**: 0035-kafka-event-streaming-plugin
