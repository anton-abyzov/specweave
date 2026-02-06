---
description: Terraform 1.6+ and OpenTofu IaC expert for infrastructure provisioning, module composition, state management, testing, and policy-as-code. Covers HCL patterns, multi-cloud providers, CI/CD integration, drift detection, and BSL vs OpenTofu licensing decisions.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# Terraform / OpenTofu IaC Expert

## Purpose

Design, implement, and maintain infrastructure-as-code using Terraform or OpenTofu. Provide expert guidance on HCL patterns, module architecture, state management, testing strategies, and migration paths between Terraform and OpenTofu.

## When to Use

- Writing or reviewing Terraform/OpenTofu configurations
- Designing module architecture and composition
- State management decisions (backends, workspaces, migration)
- Multi-cloud provider setups (AWS, Azure, GCP)
- Infrastructure testing and policy-as-code
- CI/CD pipeline integration for IaC
- Migrating between Terraform and OpenTofu
- Importing existing infrastructure into IaC
- Refactoring large Terraform codebases

## Terraform vs OpenTofu Decision Framework

### Quick Decision Tree

```
Is your organization committed to open-source licensing?
├─ YES → OpenTofu (MPL-2.0, Linux Foundation governance)
└─ NO  → Continue...

Do you need Terraform Cloud / Enterprise features?
├─ YES → Terraform (native integration)
└─ NO  → Continue...

Do you need features from Terraform 1.6+ (import blocks, testing)?
├─ YES → Both support them (OpenTofu 1.6+ has parity)
└─ Continue...

Do you rely on third-party module registries?
├─ YES → Terraform (registry.terraform.io is larger)
└─ NO  → OpenTofu (growing registry at registry.opentofu.org)

Default recommendation:
├─ New projects with no vendor lock-in concern → Terraform (larger ecosystem)
└─ OSS-first or BSL-averse organizations → OpenTofu
```

### Compatibility Notes

| Feature | Terraform 1.6+ | OpenTofu 1.6+ |
|---------|----------------|---------------|
| HCL syntax | Identical | Identical |
| Provider registry | registry.terraform.io | registry.opentofu.org (mirrors) |
| State format | Compatible | Compatible |
| `import` blocks | Yes | Yes |
| `terraform test` | Yes | `tofu test` (compatible) |
| `moved` blocks | Yes | Yes |
| State encryption | No (Enterprise only) | Yes (built-in) |
| Client-side encryption | No | Yes |

### Migration Path

```bash
# Terraform → OpenTofu (typically seamless for 1.5.x → 1.6.x)
# 1. Install OpenTofu
brew install opentofu

# 2. Verify state compatibility
tofu init
tofu plan  # Should show no changes if state is compatible

# 3. Update CI/CD scripts: replace `terraform` with `tofu`
```

## HCL Fundamentals

### Resources and Data Sources

```hcl
# Resource: creates and manages infrastructure
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = merge(local.common_tags, {
    Name = "${var.project}-web-${var.environment}"
  })
}

# Data source: reads existing infrastructure
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
```

### Variables with Validation

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_config" {
  description = "EC2 instance configuration"
  type = object({
    instance_type = string
    volume_size   = number
    encrypted     = optional(bool, true)
  })

  default = {
    instance_type = "t3.medium"
    volume_size   = 50
  }
}
```

### Outputs and Locals

```hcl
locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = var.team
  }

  # Computed values
  is_production = var.environment == "production"
  name_prefix   = "${var.project}-${var.environment}"
}

output "instance_public_ip" {
  description = "Public IP of the web instance"
  value       = aws_instance.web.public_ip
  sensitive   = false
}

output "database_connection_string" {
  description = "Database connection string"
  value       = aws_rds_cluster.main.endpoint
  sensitive   = true  # Masked in CLI output
}
```

## Module Composition

### Root Module Structure

```
infrastructure/
├── main.tf              # Provider config, module calls
├── variables.tf         # Input variables
├── outputs.tf           # Root outputs
├── terraform.tf         # Required providers, backend
├── locals.tf            # Computed values
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── production.tfvars
└── modules/
    ├── networking/       # VPC, subnets, security groups
    ├── compute/          # EC2, ECS, Lambda
    ├── database/         # RDS, DynamoDB, ElastiCache
    └── monitoring/       # CloudWatch, alarms, dashboards
```

### Child Module Pattern

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-vpc"
  })
}

resource "aws_subnet" "private" {
  for_each = var.private_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-${each.key}"
    Tier = "private"
  })
}

# modules/networking/variables.tf
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "Map of private subnet configurations"
  type = map(object({
    cidr = string
    az   = string
  }))
}
```

### Module Registry Usage

```hcl
# Using community modules (pin version!)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = !local.is_production
  enable_dns_hostnames = true
}
```

## State Management

### Remote Backend Configuration

```hcl
# S3 backend (AWS)
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "environments/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
    kms_key_id     = "alias/terraform-state"
  }
}

# Azure Blob Storage backend
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "companyterraformstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}

# GCS backend
terraform {
  backend "gcs" {
    bucket = "company-terraform-state"
    prefix = "production"
  }
}
```

### Workspace Strategy

```bash
# Environment-based workspaces
terraform workspace new staging
terraform workspace new production
terraform workspace select production

# In HCL, reference workspace
locals {
  environment = terraform.workspace
  is_prod     = terraform.workspace == "production"
}

resource "aws_instance" "web" {
  instance_type = local.is_prod ? "m5.xlarge" : "t3.medium"
  count         = local.is_prod ? 3 : 1
}
```

### State Operations

```bash
# List resources in state
terraform state list

# Move resource (refactoring)
terraform state mv aws_instance.old aws_instance.new

# Remove from state (without destroying)
terraform state rm aws_instance.manual

# Pull remote state locally for inspection
terraform state pull > state.json
```

## Resource Lifecycle Rules

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    # Create replacement before destroying old (zero-downtime)
    create_before_destroy = true

    # Prevent accidental deletion of critical resources
    prevent_destroy = true

    # Ignore changes made outside Terraform
    ignore_changes = [
      tags["LastModified"],
      user_data,
    ]

    # Replace resource when any of these change
    replace_triggered_by = [
      aws_security_group.web.id
    ]
  }
}
```

## Importing Existing Infrastructure

### Import Blocks (Terraform 1.5+ / OpenTofu 1.5+)

```hcl
# Declarative import (preferred over CLI)
import {
  to = aws_s3_bucket.existing
  id = "my-existing-bucket"
}

resource "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
  # Run `terraform plan` to see what attributes to fill in
}

# Generate config from import
# terraform plan -generate-config-out=generated.tf
```

### CLI Import (Legacy)

```bash
# Import a single resource
terraform import aws_instance.web i-1234567890abcdef0

# Import module resources
terraform import module.vpc.aws_vpc.main vpc-0123456789
```

## Dynamic Blocks and for_each Patterns

```hcl
# Dynamic blocks for repetitive nested configurations
resource "aws_security_group" "web" {
  name        = "${local.name_prefix}-web-sg"
  description = "Security group for web tier"
  vpc_id      = module.vpc.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      description     = ingress.value.description
      from_port       = ingress.value.port
      to_port         = ingress.value.port
      protocol        = "tcp"
      cidr_blocks     = ingress.value.cidr_blocks
      security_groups = ingress.value.security_groups
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# for_each with conditional creation
resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = local.is_production ? toset(["warning", "critical"]) : toset([])

  alarm_name = "${local.name_prefix}-cpu-${each.key}"
  threshold  = each.key == "critical" ? 90 : 70
  # ...
}
```

## Moved Blocks for Refactoring

```hcl
# Rename a resource without destroy/recreate
moved {
  from = aws_instance.server
  to   = aws_instance.web_server
}

# Move into a module
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

# Move between modules
moved {
  from = module.old_network.aws_subnet.private
  to   = module.new_network.aws_subnet.private
}
```

## Testing

### Terraform Test (Native, 1.6+)

```hcl
# tests/vpc.tftest.hcl
run "vpc_creation" {
  command = plan

  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "test"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block did not match expected value"
  }

  assert {
    condition     = aws_vpc.main.enable_dns_hostnames == true
    error_message = "DNS hostnames should be enabled"
  }
}

run "subnet_count" {
  command = plan

  assert {
    condition     = length(aws_subnet.private) == 3
    error_message = "Expected 3 private subnets"
  }
}
```

### Checkov (Policy Scanning)

```bash
# Scan Terraform directory
checkov -d ./infrastructure --framework terraform

# Scan with specific checks
checkov -d . --check CKV_AWS_18,CKV_AWS_19

# Generate SARIF output for GitHub Security tab
checkov -d . -o sarif --output-file results.sarif
```

## Policy-as-Code

### OPA/Rego Example

```rego
# policy/terraform.rego
package terraform

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not resource.change.after.server_side_encryption_configuration
  msg := sprintf("S3 bucket '%s' must have encryption enabled", [resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_instance"
  not resource.change.after.tags.Environment
  msg := sprintf("Instance '%s' must have an Environment tag", [resource.address])
}
```

```bash
# Run OPA against Terraform plan
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
opa eval --input tfplan.json --data policy/ "data.terraform.deny"
```

## CI/CD Integration

### GitHub Actions Pattern

```yaml
name: Terraform
on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.x"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform-ci
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init -no-color
        working-directory: infrastructure

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: infrastructure

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `#### Terraform Plan\n\`\`\`\n${plan}\n\`\`\``
            });

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: infrastructure
```

### Atlantis Integration

```yaml
# atlantis.yaml
version: 3
projects:
  - name: production
    dir: infrastructure
    workspace: production
    terraform_version: v1.7.0
    autoplan:
      when_modified: ["*.tf", "modules/**/*.tf"]
      enabled: true
    apply_requirements: [approved, mergeable]
```

## Common Patterns

### VPC with Public/Private Subnets

```hcl
module "vpc" {
  source = "./modules/networking"

  vpc_cidr = "10.0.0.0/16"
  private_subnets = {
    a = { cidr = "10.0.1.0/24", az = "us-east-1a" }
    b = { cidr = "10.0.2.0/24", az = "us-east-1b" }
    c = { cidr = "10.0.3.0/24", az = "us-east-1c" }
  }
  public_subnets = {
    a = { cidr = "10.0.101.0/24", az = "us-east-1a" }
    b = { cidr = "10.0.102.0/24", az = "us-east-1b" }
  }
}
```

## Monorepo vs Polyrepo Strategy

| Factor | Monorepo | Polyrepo |
|--------|----------|----------|
| Team size | Small (1-5) | Large (5+) |
| State blast radius | Larger | Isolated |
| Module sharing | Direct paths | Registry/Git |
| CI/CD complexity | Path filters | Simpler per-repo |
| Code review | Single PR | Cross-repo PRs |

### Recommended: Layered Monorepo

```
infrastructure/
├── layers/
│   ├── 01-foundation/    # VPC, DNS, IAM roles
│   ├── 02-data/          # RDS, ElastiCache, S3
│   ├── 03-compute/       # ECS, EKS, Lambda
│   └── 04-monitoring/    # CloudWatch, alerts
├── modules/              # Shared modules
└── environments/         # Per-env overrides
```

Each layer has its own state file. Lower layers are dependencies for higher layers. Use `terraform_remote_state` data sources or SSM parameters to pass values between layers.

## Provisioners: When to Use, When to Avoid

```hcl
# AVOID: Use user_data, cloud-init, or configuration management instead
resource "aws_instance" "web" {
  # ...

  # Last resort only - breaks declarative model
  provisioner "remote-exec" {
    inline = ["sudo apt-get update"]
  }
}

# ACCEPTABLE: Local exec for non-infrastructure side effects
resource "aws_eks_cluster" "main" {
  # ...

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${self.name}"
  }
}
```

**Rule of thumb**: If a provisioner is doing configuration management, use Ansible, cloud-init, or a container image instead.

## Drift Detection and Remediation

```bash
# Detect drift
terraform plan -detailed-exitcode
# Exit code 0 = no changes, 1 = error, 2 = changes detected

# Refresh state to match reality
terraform apply -refresh-only

# Scheduled drift detection in CI
# Run `terraform plan -detailed-exitcode` on a cron schedule
# Alert if exit code is 2
```

## Best Practices Checklist

- [ ] Pin provider versions with `~>` constraints
- [ ] Use remote state with locking enabled
- [ ] Encrypt state at rest (S3 SSE, Azure encryption, GCS encryption)
- [ ] Tag all resources with project, environment, team, managed-by
- [ ] Validate inputs with `validation` blocks
- [ ] Document outputs with `description` fields
- [ ] Use `moved` blocks for refactoring (never manual state mv in CI)
- [ ] Run `terraform fmt` and `terraform validate` in CI
- [ ] Scan with checkov/tfsec before apply
- [ ] Use separate state files per environment/layer
- [ ] Never store secrets in Terraform state (use vault references)
- [ ] Review plan output before every apply
