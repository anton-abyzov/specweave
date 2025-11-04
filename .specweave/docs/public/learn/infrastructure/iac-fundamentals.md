---
id: iac-fundamentals
title: Infrastructure as Code Fundamentals
sidebar_label: IaC Fundamentals
---

# Infrastructure as Code Fundamentals

**Target Audience**: Developers learning DevOps and infrastructure management
**Reading Time**: 25 minutes
**Prerequisites**: Basic understanding of cloud computing, command line, and version control

## What is Infrastructure?

Before diving into Infrastructure as Code (IaC), let's understand what infrastructure means in modern software development.

**Infrastructure** encompasses all the resources needed to run your application:

- **Compute**: Servers (EC2, Azure VMs, GCP Compute Engine)
- **Storage**: Databases (RDS, DynamoDB), object storage (S3, Azure Blob)
- **Networking**: VPCs, subnets, load balancers, firewalls
- **Security**: IAM roles, security groups, SSL certificates
- **Content Delivery**: CDNs (CloudFront, Cloudflare)
- **Monitoring**: Logging, metrics, alerting systems

### Traditional Infrastructure Management

**The Old Way**: Manual setup through web consoles

```mermaid
graph LR
    Dev[Developer] -->|1. Login to AWS Console| Console[Web UI]
    Console -->|2. Click buttons| EC2[Create EC2]
    Console -->|3. Manual config| RDS[Create RDS]
    Console -->|4. Copy settings| S3[Create S3]

    EC2 -.->|Undocumented| Snowflake[Snowflake Server]
    RDS -.->|No version control| Snowflake
    S3 -.->|Hard to replicate| Snowflake

    style Snowflake fill:#ff5252
    style Console fill:#ffeb3b
```

**Problems with Manual Infrastructure**:
- **No version control**: Changes aren't tracked in Git
- **Human error**: Typos, missed configurations, inconsistent settings
- **Snowflake servers**: Each environment is slightly different
- **No documentation**: Setup lives in people's heads, not code
- **Hard to replicate**: Creating identical staging environment takes hours
- **No disaster recovery**: Can't rebuild infrastructure from scratch
- **Team bottlenecks**: Only ops team can provision resources

### The Modern Way: Infrastructure as Code

**The New Way**: Infrastructure defined in code files

```mermaid
graph LR
    Dev[Developer] -->|1. Edit .tf files| Code[Infrastructure Code]
    Code -->|2. Git commit| Git[Version Control]
    Git -->|3. terraform apply| Auto[Automation]

    Auto -->|Creates| EC2[EC2 Instances]
    Auto -->|Creates| RDS[RDS Database]
    Auto -->|Creates| S3[S3 Buckets]

    EC2 -->|Identical| Prod[Reproducible Infrastructure]
    RDS -->|Identical| Prod
    S3 -->|Identical| Prod

    style Prod fill:#4caf50
    style Git fill:#64b5f6
    style Code fill:#ab47bc
```

## What is Infrastructure as Code (IaC)?

**Definition**: Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure through machine-readable definition files, rather than physical hardware configuration or interactive configuration tools.

**In Simple Terms**: Your servers, databases, and networks are defined in code files (like `.tf`, `.yaml`, `.json`) that you can version, review, and deploy just like application code.

### Before vs After: Real-World Example

**Scenario**: Deploy a web application with database and load balancer

#### Before IaC (Manual Setup - 4 Hours)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant AWS as AWS Console
    participant Team as Team Chat

    Dev->>AWS: 1. Create VPC (15 min)
    Note over Dev,AWS: Manually configure CIDR, subnets

    Dev->>AWS: 2. Create Security Groups (20 min)
    Note over Dev,AWS: Add inbound/outbound rules one by one

    Dev->>AWS: 3. Launch EC2 instances (30 min)
    Note over Dev,AWS: Select AMI, instance type, configure storage

    Dev->>AWS: 4. Create RDS database (45 min)
    Note over Dev,AWS: Configure engine, size, backups

    Dev->>AWS: 5. Create Load Balancer (30 min)
    Note over Dev,AWS: Configure listeners, target groups

    Dev->>Team: 6. Document steps (20 min)
    Note over Dev,Team: Write wiki page with screenshots

    Dev->>Team: 7. Test in staging (40 min)
    Note over Dev,Team: Manually verify everything works

    Dev->>Team: 8. Repeat for production (4 hours)
    Note over Dev,Team: Same manual steps again!
```

**Total Time**: 8+ hours for staging + production
**Documentation**: Outdated wiki page with screenshots
**Consistency**: Staging slightly different from production (human error)
**Recovery Time**: 8+ hours to rebuild from scratch

#### After IaC (Automated - 10 Minutes)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git Repository
    participant TF as Terraform
    participant AWS as AWS

    Dev->>Git: 1. Edit main.tf (5 min)
    Note over Dev,Git: Define all resources in code

    Dev->>TF: 2. terraform plan
    Note over Dev,TF: Preview changes

    TF->>AWS: 3. terraform apply (5 min)
    Note over TF,AWS: Creates VPC, EC2, RDS, LB automatically

    AWS-->>TF: Infrastructure ready
    TF-->>Dev: Done!

    Note over Dev,AWS: Staging and production use same code!
```

**Total Time**: 10 minutes for staging + production
**Documentation**: The code IS the documentation
**Consistency**: 100% identical environments
**Recovery Time**: 10 minutes to rebuild from code

## The Problem: Manual Infrastructure Creates Chaos

Let's look at real-world problems that IaC solves.

### Problem 1: The "Works on My Machine" Problem

```mermaid
graph TB
    Dev[Developer's Laptop] -->|Manual setup| Local[Local Environment]
    Dev -->|Different setup| Staging[Staging Environment]
    Dev -->|Yet another setup| Prod[Production Environment]

    Local -->|Different| Bug1[Different Node.js version]
    Staging -->|Different| Bug2[Different database config]
    Prod -->|Different| Bug3[Different security groups]

    Bug1 -->|Result| Chaos[Bug only in production!]
    Bug2 -->|Result| Chaos
    Bug3 -->|Result| Chaos

    style Chaos fill:#ff5252
    style Local fill:#ffeb3b
    style Staging fill:#ffeb3b
    style Prod fill:#ffeb3b
```

**With IaC**: Same code → Same infrastructure everywhere

### Problem 2: The Bus Factor

```
Day 1: Senior DevOps Engineer sets up production
      (All knowledge in their head)

Day 30: Only they know how to deploy

Day 60: They go on vacation

Day 61: Production crashes
        Team can't rebuild infrastructure
        Business loses $10,000/hour
```

**With IaC**: Infrastructure knowledge is in Git, not people's heads

### Problem 3: The Compliance Nightmare

```
Auditor: "Show me your production security group rules from 6 months ago."

Without IaC: "Uh... let me check AWS Console... I think it was... maybe...?"
❌ FAILED AUDIT

With IaC: "Here's the Git commit from June 15th."
✅ PASSED AUDIT
```

## Benefits of Infrastructure as Code

### 1. Version Control - Infrastructure in Git

```bash
# Your infrastructure has full Git history
git log infrastructure/production/

commit 3f5a2b1c
Author: DevOps Team
Date:   2025-10-15
feat: add production load balancer

commit 8d2e9f4a
Author: DevOps Team
Date:   2025-10-10
fix: increase RDS instance size from t3.micro to t3.medium

commit 1a4b7c3d
Author: DevOps Team
Date:   2025-10-01
chore: initial production infrastructure
```

**Benefits**:
- See who changed what and when
- Rollback to previous versions
- Code review infrastructure changes
- Blame/praise specific team members

### 2. Reproducibility - Same Code = Same Infrastructure

```hcl
# This code creates IDENTICAL infrastructure every time
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server-${count.index}"
  }
}
```

**Benefits**:
- Staging is exact replica of production
- Disaster recovery: Rebuild in minutes
- Multi-region deployment: Copy code to new region
- Testing: Spin up temporary environments

### 3. Documentation - Code IS the Documentation

**Traditional Documentation**:
```markdown
# Production Setup Guide (Last updated: ???)

1. Login to AWS Console
2. Go to EC2 → Launch Instance
3. Select Ubuntu 22.04 (which AMI? 🤷)
4. Choose t3.micro (or was it t3.small? 🤔)
5. Configure security group (can't remember the rules 😅)
6. ...15 more steps with screenshots that are now outdated
```

**IaC Documentation**:
```hcl
# This IS the documentation - always up to date!
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # Ubuntu 22.04
  instance_type = "t3.micro"                # 1 vCPU, 1 GB RAM

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "production-web-server"
    Environment = "production"
  }
}
```

### 4. Automation - CI/CD for Infrastructure

```mermaid
graph LR
    Dev[Developer] -->|1. Push code| Git[GitHub]
    Git -->|2. Trigger| CI[GitHub Actions]
    CI -->|3. terraform plan| Review[Review Changes]
    Review -->|4. Approve| CD[Auto-deploy]
    CD -->|5. terraform apply| AWS[AWS Infrastructure]

    style CI fill:#4caf50
    style CD fill:#2196f3
    style AWS fill:#ff9800
```

**Benefits**:
- Infrastructure changes deploy automatically
- No manual steps = no human error
- Consistent deployment process
- Fast rollbacks if issues occur

### 5. Cost Management - Track Infrastructure Changes

```bash
# Git diff shows cost impact
git diff main infrastructure/

- instance_type = "t3.micro"   # $7.50/month
+ instance_type = "t3.large"   # $60/month

💡 This change increases monthly cost by $52.50
```

**Benefits**:
- See cost impact before applying changes
- Track who approved expensive resources
- Optimize costs over time (Git history shows trends)
- Budget alerts based on infrastructure code

### 6. Disaster Recovery - Rebuild from Code

```bash
# Production datacenter destroyed by fire? 🔥
# No problem - rebuild in 10 minutes:

cd infrastructure/production
terraform init
terraform apply -auto-approve

# Infrastructure recreated from code!
```

**Benefits**:
- Minutes to recover (not days)
- No knowledge loss
- Automatic backup (Git is the backup)

## IaC Tools Comparison

### The Four Main Players

```mermaid
graph TB
    subgraph "Declarative (What)"
        TF[Terraform<br/>Multi-cloud<br/>HCL language]
        CF[CloudFormation<br/>AWS only<br/>JSON/YAML]
    end

    subgraph "Imperative (How)"
        Pulumi[Pulumi<br/>Multi-cloud<br/>Real languages]
        Ansible[Ansible<br/>Config management<br/>YAML playbooks]
    end

    Cloud[Cloud Providers] --> TF
    Cloud --> CF
    Cloud --> Pulumi
    Servers[Existing Servers] --> Ansible

    style TF fill:#7b1fa2
    style CF fill:#ff9800
    style Pulumi fill:#4caf50
    style Ansible fill:#e53935
```

### Comparison Table

| Feature | Terraform | CloudFormation | Pulumi | Ansible |
|---------|-----------|----------------|--------|---------|
| **Language** | HCL (declarative) | JSON/YAML (declarative) | TypeScript/Python/Go | YAML (imperative) |
| **Cloud Support** | AWS, Azure, GCP, 100+ | AWS only | AWS, Azure, GCP, K8s | Any (via SSH) |
| **State Management** | Required (S3, Terraform Cloud) | AWS-managed | Required (S3, Pulumi Service) | Optional |
| **Learning Curve** | Medium (new language) | Medium (AWS-specific) | Low (use familiar language) | Low (YAML) |
| **Community** | Large (most popular) | AWS-specific | Growing | Large (config mgmt) |
| **Best For** | Multi-cloud, team collaboration | AWS-only projects | Developers preferring code | Configuration management |
| **Type Safety** | Limited | None | Full (TypeScript, Go) | None |
| **Tooling** | Excellent (IDE support, linters) | Good (AWS-specific) | Excellent (native IDE support) | Good |
| **Cost** | Free (Terraform Cloud paid) | Free | Free (Pulumi Service paid) | Free (Tower paid) |

### When to Choose Each Tool

**Choose Terraform if**:
- ✅ Multi-cloud or hybrid cloud
- ✅ Team needs to learn one tool for all clouds
- ✅ Strong ecosystem (modules, providers)
- ✅ Declarative approach preferred

**Choose CloudFormation if**:
- ✅ AWS-only infrastructure
- ✅ Deep AWS integration required
- ✅ Using AWS-managed state (no external state storage)

**Choose Pulumi if**:
- ✅ Team prefers TypeScript/Python/Go over HCL
- ✅ Need strong type safety
- ✅ Sharing code between app and infrastructure
- ✅ Complex logic (loops, conditionals easier in real languages)

**Choose Ansible if**:
- ✅ Configuration management (install software on servers)
- ✅ Existing servers (not creating new infrastructure)
- ✅ Simple automation tasks
- ❌ Not recommended for infrastructure provisioning

### Tool Combination Strategy

Most teams use **multiple tools**:

```mermaid
graph LR
    TF[Terraform] -->|Provisions| Infra[Infrastructure<br/>VPC, EC2, RDS]
    Infra -->|Then| Ansible[Ansible]
    Ansible -->|Configures| Apps[Applications<br/>Install software, configure]
    Apps -->|Then| K8s[Kubernetes]
    K8s -->|Orchestrates| Containers[Containers<br/>Deploy apps]

    style TF fill:#7b1fa2
    style Ansible fill:#e53935
    style K8s fill:#326ce5
```

**Example Workflow**:
1. **Terraform**: Provision AWS infrastructure (VPC, EC2, RDS)
2. **Ansible**: Configure servers (install Docker, setup monitoring)
3. **Kubernetes**: Deploy and orchestrate containers

## Terraform Deep Dive

### Why Terraform is the Industry Standard

**Market Share** (2024):
- Terraform: 76% (most popular)
- CloudFormation: 12%
- Pulumi: 8%
- Others: 4%

**Why Terraform Won**:
- Multi-cloud support (AWS, Azure, GCP, 3000+ providers)
- Declarative syntax (describe what you want, not how)
- Strong community (100K+ modules)
- Mature tooling (IDE support, CI/CD integrations)

### Basic Concepts

#### 1. Providers - Connect to Cloud APIs

```hcl
# Providers are plugins that interact with APIs
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Use version 5.x.x
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Configure AWS provider
provider "aws" {
  region = "us-west-2"

  # Best practice: Use AWS profiles, not hardcoded credentials
  profile = "production"
}

# Configure Azure provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}
```

#### 2. Resources - Infrastructure Components

```hcl
# Resources are the actual infrastructure components
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_subnet" "public" {
  count = 2  # Create 2 subnets

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}
```

#### 3. State - Current Infrastructure State

```hcl
# Terraform tracks infrastructure in state file
# NEVER edit manually! Use terraform commands.

# Backend configuration for remote state
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # Prevents concurrent modifications
  }
}
```

**Why State Matters**:
- Maps real infrastructure to code
- Tracks resource dependencies
- Improves performance (caches attributes)
- Enables team collaboration

#### 4. Modules - Reusable Components

```hcl
# modules/web-service/main.tf - Reusable web service module
variable "service_name" {
  description = "Name of the web service"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 2
}

resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name = "${var.service_name}-${count.index}"
  }
}

output "instance_ids" {
  value = aws_instance.web[*].id
}

# -----------------------------------------------
# main.tf - Using the module
module "api_service" {
  source = "./modules/web-service"

  service_name   = "api"
  instance_count = 3
}

module "admin_service" {
  source = "./modules/web-service"

  service_name   = "admin"
  instance_count = 1
}
```

### Complete AWS Infrastructure Example

Let's build a production-ready infrastructure with Terraform:

```hcl
# main.tf - Complete AWS infrastructure for web application

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/web-app/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "web-app"
      Environment = var.environment
      ManagedBy   = "terraform"
      Increment   = "0012-aws-infrastructure"
    }
  }
}

# -----------------------------------------------
# NETWORKING
# -----------------------------------------------

# VPC - Virtual Private Cloud
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Internet Gateway - Allows internet access
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnets - For load balancer
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${count.index + 1}"
    Type = "public"
  }
}

# Private Subnets - For application servers
resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.environment}-private-subnet-${count.index + 1}"
    Type = "private"
  }
}

# Route Table - Public subnets route to internet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------
# SECURITY GROUPS
# -----------------------------------------------

# Load Balancer Security Group - Allow HTTP/HTTPS from internet
resource "aws_security_group" "alb" {
  name_prefix = "${var.environment}-alb-"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-alb-sg"
  }
}

# Application Security Group - Allow traffic from ALB only
resource "aws_security_group" "app" {
  name_prefix = "${var.environment}-app-"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-app-sg"
  }
}

# Database Security Group - Allow PostgreSQL from app servers only
resource "aws_security_group" "db" {
  name_prefix = "${var.environment}-db-"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-db-sg"
  }
}

# -----------------------------------------------
# COMPUTE (EC2)
# -----------------------------------------------

# EC2 Instances - Application servers
resource "aws_instance" "app" {
  count = var.app_instance_count

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.app_instance_type

  subnet_id              = aws_subnet.private[count.index % 2].id
  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "${var.environment}-app-${count.index + 1}"
  }
}

# -----------------------------------------------
# LOAD BALANCER
# -----------------------------------------------

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name = "${var.environment}-alb"
  }
}

# Target Group - App servers
resource "aws_lb_target_group" "app" {
  name     = "${var.environment}-app-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "3000"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  tags = {
    Name = "${var.environment}-app-tg"
  }
}

# Register EC2 instances with target group
resource "aws_lb_target_group_attachment" "app" {
  count = var.app_instance_count

  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app[count.index].id
  port             = 3000
}

# Listener - HTTP (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener - HTTPS
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# -----------------------------------------------
# DATABASE (RDS)
# -----------------------------------------------

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.environment}-db-subnet-group"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${var.environment}-postgres"

  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password  # Better: Use AWS Secrets Manager

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  multi_az                   = var.environment == "production"
  deletion_protection        = var.environment == "production"
  skip_final_snapshot        = var.environment != "production"
  final_snapshot_identifier  = "${var.environment}-postgres-final-snapshot-${timestamp()}"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${var.environment}-postgres"
  }
}

# -----------------------------------------------
# OUTPUTS
# -----------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Load balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "app_instance_ips" {
  description = "Private IPs of app instances"
  value       = aws_instance.app[*].private_ip
}
```

### Terraform Workflow

```mermaid
graph TB
    Start[Start] --> Write[1. Write Configuration]
    Write -->|Edit .tf files| Init[2. terraform init]
    Init -->|Download providers| Validate[3. terraform validate]
    Validate -->|Check syntax| Plan[4. terraform plan]
    Plan -->|Preview changes| Review{5. Review}
    Review -->|Looks good| Apply[6. terraform apply]
    Review -->|Issues found| Write
    Apply -->|Create resources| State[7. Update State]
    State -->|Track changes| Done[8. Infrastructure Ready]

    Done -->|Make changes| Write
    Done -->|Tear down| Destroy[terraform destroy]

    style Init fill:#64b5f6
    style Plan fill:#ffeb3b
    style Apply fill:#4caf50
    style Destroy fill:#f44336
```

**Step-by-Step Workflow**:

```bash
# 1. Initialize Terraform (first time only)
terraform init
# Downloads providers (AWS, Azure, etc.)
# Configures backend (S3 state storage)

# 2. Validate syntax
terraform validate
# Checks .tf files for errors
# Output: Success! The configuration is valid.

# 3. Preview changes (ALWAYS do this!)
terraform plan
# Shows what will be created/modified/destroyed
# Output:
#   Plan: 15 to add, 0 to change, 0 to destroy.

# 4. Apply changes
terraform apply
# Creates actual infrastructure
# Prompts: Do you want to perform these actions? yes

# 5. View state
terraform show
# Shows current infrastructure state

# 6. List resources
terraform state list
# Lists all managed resources

# 7. Format code
terraform fmt
# Auto-formats .tf files

# 8. Destroy infrastructure (cleanup)
terraform destroy
# Removes all resources
# Prompts: Do you really want to destroy? yes
```

### Workspaces - Multiple Environments

```bash
# Workspaces allow different environments with same code
terraform workspace new development
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select production

# List workspaces
terraform workspace list
#   default
#   development
#   staging
# * production  ← Current

# Use workspace in code
resource "aws_instance" "app" {
  instance_type = terraform.workspace == "production" ? "t3.large" : "t3.micro"

  tags = {
    Name        = "app-${terraform.workspace}"
    Environment = terraform.workspace
  }
}
```

## Kubernetes Basics

### What is Kubernetes?

**Definition**: Kubernetes (K8s) is an open-source platform for automating deployment, scaling, and management of containerized applications across clusters of machines.

**In Simple Terms**: Kubernetes is like an orchestra conductor for containers - it ensures the right containers are running, restarts them if they crash, scales them up/down based on load, and handles networking between them.

### Why Kubernetes?

**Without Kubernetes** (Docker only):
```bash
# Manual management - painful at scale!
docker run app1  # Crashed? You must manually restart
docker run app2  # Need 10 replicas? Run command 10 times
docker run db    # Networking? Configure manually

# Load balancing? Write custom scripts
# Auto-scaling? Not happening
# Self-healing? Hope and pray
```

**With Kubernetes**:
```yaml
# Declarative - describe what you want
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 10  # K8s ensures 10 pods always running
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1
        resources:
          requests:
            cpu: 100m
            memory: 128Mi

# K8s automatically:
# ✅ Restarts crashed containers
# ✅ Maintains 10 replicas
# ✅ Load balances traffic
# ✅ Scales up/down based on CPU
# ✅ Rolling updates with zero downtime
```

### Key Concepts

#### Pods - Smallest Deployable Unit

```yaml
# pod.yaml - A Pod wraps one or more containers
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  labels:
    app: web
    version: v1
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "128Mi"  # Minimum required
        cpu: "100m"      # 0.1 CPU cores
      limits:
        memory: "256Mi"  # Maximum allowed
        cpu: "200m"      # 0.2 CPU cores

    # Health checks - K8s restarts if unhealthy
    livenessProbe:
      httpGet:
        path: /health
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10

    # Readiness check - K8s routes traffic when ready
    readinessProbe:
      httpGet:
        path: /ready
        port: 80
      initialDelaySeconds: 10
      periodSeconds: 5
```

#### Deployments - Manage Replicas

```yaml
# deployment.yaml - Deployment manages Pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3  # Always maintain 3 Pods

  selector:
    matchLabels:
      app: api

  strategy:
    type: RollingUpdate  # Zero-downtime updates
    rollingUpdate:
      maxSurge: 1        # Max 4 Pods during update (3 + 1)
      maxUnavailable: 1  # Min 2 Pods running during update (3 - 1)

  template:
    metadata:
      labels:
        app: api
        version: v1.2.0
    spec:
      containers:
      - name: api
        image: myregistry/api:v1.2.0
        ports:
        - containerPort: 8080

        # Environment variables
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

#### Services - Networking and Load Balancing

```yaml
# service.yaml - Stable endpoint for Pods
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: LoadBalancer  # Exposes to internet (AWS creates ELB)

  selector:
    app: api  # Routes to Pods with label app=api

  ports:
  - protocol: TCP
    port: 80        # External port
    targetPort: 8080  # Container port

  sessionAffinity: ClientIP  # Sticky sessions
```

### Complete Microservices Deployment Example

```yaml
# Complete K8s setup for web application with database

# -----------------------------------------------
# NAMESPACE - Logical isolation
# -----------------------------------------------
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production

---
# -----------------------------------------------
# CONFIGMAP - Non-sensitive configuration
# -----------------------------------------------
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  app.properties: |
    server.port=8080
    logging.level=INFO
    feature.dark-mode=true

  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://api-service:80;
      }
    }

---
# -----------------------------------------------
# SECRET - Sensitive data (base64 encoded)
# -----------------------------------------------
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  username: YWRtaW4=  # echo -n "admin" | base64
  password: cGFzc3dvcmQxMjM=  # echo -n "password123" | base64
  url: cG9zdGdyZXM6Ly9hZG1pbkBwb3N0Z3Jlczpwb3J0L2FwcGRi

---
# -----------------------------------------------
# DEPLOYMENT - Frontend (Web)
# -----------------------------------------------
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 2

  selector:
    matchLabels:
      app: web
      tier: frontend

  template:
    metadata:
      labels:
        app: web
        tier: frontend
        version: v1.0.0
    spec:
      containers:
      - name: web
        image: myregistry/web:v1.0.0
        ports:
        - containerPort: 80

        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf

        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: config
        configMap:
          name: app-config

---
# -----------------------------------------------
# SERVICE - Frontend (LoadBalancer)
# -----------------------------------------------
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: web
    tier: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80

---
# -----------------------------------------------
# DEPLOYMENT - Backend (API)
# -----------------------------------------------
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
  namespace: production
spec:
  replicas: 3

  selector:
    matchLabels:
      app: api
      tier: backend

  template:
    metadata:
      labels:
        app: api
        tier: backend
        version: v2.1.0
    spec:
      containers:
      - name: api
        image: myregistry/api:v2.1.0
        ports:
        - containerPort: 8080

        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: logging.level

        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
# -----------------------------------------------
# SERVICE - Backend (ClusterIP - internal only)
# -----------------------------------------------
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  type: ClusterIP  # Internal only (not exposed to internet)
  selector:
    app: api
    tier: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080

---
# -----------------------------------------------
# STATEFULSET - Database (PostgreSQL)
# -----------------------------------------------
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-service
  replicas: 1

  selector:
    matchLabels:
      app: postgres
      tier: database

  template:
    metadata:
      labels:
        app: postgres
        tier: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432

        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: POSTGRES_DB
          value: "appdb"

        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data

        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi

---
# -----------------------------------------------
# SERVICE - Database (ClusterIP)
# -----------------------------------------------
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: postgres
    tier: database
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432

---
# -----------------------------------------------
# HORIZONTAL POD AUTOSCALER - Auto-scaling
# -----------------------------------------------
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-backend

  minReplicas: 2
  maxReplicas: 10

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up at 70% CPU
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Scale up at 80% memory
```

### Kubernetes Architecture

```mermaid
graph TB
    subgraph "Control Plane"
        API[API Server<br/>kubectl endpoint]
        ETCD[(etcd<br/>Cluster state)]
        Scheduler[Scheduler<br/>Pod placement]
        Controller[Controller Manager<br/>Reconciliation]
    end

    subgraph "Worker Node 1"
        Kubelet1[Kubelet<br/>Node agent]
        Proxy1[kube-proxy<br/>Networking]
        Runtime1[Container Runtime<br/>Docker/containerd]

        subgraph "Pods"
            Pod1A[Web Pod]
            Pod1B[API Pod]
        end
    end

    subgraph "Worker Node 2"
        Kubelet2[Kubelet<br/>Node agent]
        Proxy2[kube-proxy<br/>Networking]
        Runtime2[Container Runtime]

        subgraph "Pods "
            Pod2A[API Pod]
            Pod2B[API Pod]
        end
    end

    User[Developer<br/>kubectl] --> API
    API <--> ETCD
    API <--> Scheduler
    API <--> Controller

    API <--> Kubelet1
    API <--> Kubelet2

    Kubelet1 --> Runtime1
    Kubelet2 --> Runtime2

    Runtime1 --> Pod1A
    Runtime1 --> Pod1B
    Runtime2 --> Pod2A
    Runtime2 --> Pod2B

    style API fill:#4caf50
    style ETCD fill:#ff9800
    style Kubelet1 fill:#2196f3
    style Kubelet2 fill:#2196f3
```

## Docker Fundamentals

### What is Docker?

**Definition**: Docker is a platform for building, shipping, and running applications in lightweight, portable containers that package software with all dependencies.

**In Simple Terms**: Docker containers are like shipping containers for software - they package your app with everything it needs (code, libraries, system tools) so it runs identically everywhere (laptop, server, cloud).

### Containers vs Virtual Machines

```mermaid
graph TB
    subgraph "Virtual Machines (OLD)"
        Infra1[Server Hardware<br/>64 GB RAM, 16 CPUs]
        Hypervisor[Hypervisor<br/>VMware, VirtualBox]
        VM1[VM 1<br/>Full OS 4GB RAM<br/>App A 100MB]
        VM2[VM 2<br/>Full OS 4GB RAM<br/>App B 100MB]
        VM3[VM 3<br/>Full OS 4GB RAM<br/>App C 100MB]

        Infra1 --> Hypervisor
        Hypervisor --> VM1
        Hypervisor --> VM2
        Hypervisor --> VM3
    end

    subgraph "Docker Containers (NEW)"
        Infra2[Server Hardware<br/>64 GB RAM, 16 CPUs]
        HostOS[Host OS<br/>Ubuntu 22.04]
        DockerEngine[Docker Engine]
        C1[Container 1<br/>App A 150MB]
        C2[Container 2<br/>App B 150MB]
        C3[Container 3<br/>App C 150MB]

        Infra2 --> HostOS
        HostOS --> DockerEngine
        DockerEngine --> C1
        DockerEngine --> C2
        DockerEngine --> C3
    end

    style VM1 fill:#ffcdd2
    style VM2 fill:#ffcdd2
    style VM3 fill:#ffcdd2
    style C1 fill:#c8e6c9
    style C2 fill:#c8e6c9
    style C3 fill:#c8e6c9
```

**Key Differences**:

| Aspect | Virtual Machines | Docker Containers |
|--------|-----------------|-------------------|
| **Size** | GBs (4-8 GB) | MBs (50-500 MB) |
| **Startup** | Minutes (boot OS) | Seconds |
| **Performance** | Slower (full OS overhead) | Near-native (shared kernel) |
| **Isolation** | Complete (separate OS) | Process-level (shared OS) |
| **Density** | 10-20 VMs per server | 100+ containers per server |
| **Best For** | Running different OS | Microservices, consistency |

### Dockerfile - Blueprint for Images

```dockerfile
# Multi-stage build - Best practice for production

# -----------------------------------------------
# STAGE 1: Build (includes build tools)
# -----------------------------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (leverage Docker cache)
COPY package*.json ./

# Install ALL dependencies (dev + prod)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# -----------------------------------------------
# STAGE 2: Production (minimal runtime)
# -----------------------------------------------
FROM node:18-alpine

# Install dumb-init (proper signal handling)
RUN apk add --no-cache dumb-init

# Create non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy ONLY production files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user (DON'T RUN AS ROOT!)
USER nodejs

# Expose port (documentation only, doesn't actually publish)
EXPOSE 3000

# Health check - Docker can monitor container health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

**Size Comparison**:
- Builder stage: 800 MB (includes npm, TypeScript, build tools)
- Final image: 150 MB (only Node.js runtime + compiled code)
- **81% size reduction!**

### Docker Compose - Multi-Container Applications

```yaml
# docker-compose.yml - Complete development environment

version: '3.8'

services:
  # -----------------------------------------------
  # PostgreSQL Database
  # -----------------------------------------------
  postgres:
    image: postgres:15-alpine
    container_name: app-db

    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # From .env file

    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

    ports:
      - "5432:5432"

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - app-network

  # -----------------------------------------------
  # Redis Cache
  # -----------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: app-cache

    ports:
      - "6379:6379"

    volumes:
      - redis-data:/data

    command: redis-server --appendonly yes

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

    networks:
      - app-network

  # -----------------------------------------------
  # API Service
  # -----------------------------------------------
  api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: development

    container_name: api-server

    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://admin:${DB_PASSWORD}@postgres:5432/appdb
      REDIS_URL: redis://redis:6379
      PORT: 3000

    ports:
      - "3000:3000"

    volumes:
      # Hot-reload in development
      - ./src:/app/src:ro
      - ./logs:/app/logs

    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

    restart: unless-stopped

    networks:
      - app-network

  # -----------------------------------------------
  # NGINX Reverse Proxy
  # -----------------------------------------------
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy

    ports:
      - "80:80"
      - "443:443"

    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro

    depends_on:
      - api

    networks:
      - app-network

# -----------------------------------------------
# Volumes - Persistent data storage
# -----------------------------------------------
volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local

# -----------------------------------------------
# Networks - Container communication
# -----------------------------------------------
networks:
  app-network:
    driver: bridge
```

**Usage**:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart API service
docker-compose restart api

# Execute command in container
docker-compose exec api npm test

# Stop all services
docker-compose down

# Stop and delete volumes
docker-compose down -v
```

## CI/CD Pipelines

### What is CI/CD?

**CI (Continuous Integration)**: Automatically build and test code on every commit

```mermaid
graph LR
    Commit[Git Commit] --> Build[Build Code]
    Build --> Test[Run Tests]
    Test --> Lint[Lint Code]
    Lint -->|All pass| Merge[Merge to Main]
    Lint -->|Any fail| Fail[❌ Block Merge]

    style Merge fill:#4caf50
    style Fail fill:#f44336
```

**CD (Continuous Deployment)**: Automatically deploy to production after CI passes

```mermaid
graph LR
    CI[CI Passes] --> Stage[Deploy to Staging]
    Stage --> E2E[E2E Tests]
    E2E -->|Pass| Prod[Deploy to Production]
    E2E -->|Fail| Rollback[❌ Rollback]

    style Prod fill:#4caf50
    style Rollback fill:#f44336
```

### Complete CI/CD Pipeline with GitHub Actions

```yaml
# .github/workflows/deploy.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-west-2
  ECR_REPOSITORY: myapp
  EKS_CLUSTER: production

jobs:
  # -----------------------------------------------
  # JOB 1: Build and Test
  # -----------------------------------------------
  build-and-test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint code
      run: npm run lint

    - name: Run unit tests
      run: npm test

    - name: Run integration tests
      run: npm run test:integration

    - name: Check test coverage
      run: npm run test:coverage
      # Fails if coverage < 80%

    - name: Build application
      run: npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist
        path: dist/

  # -----------------------------------------------
  # JOB 2: Build and Push Docker Image
  # -----------------------------------------------
  docker-build:
    needs: build-and-test
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
                   $ECR_REGISTRY/$ECR_REPOSITORY:latest

    - name: Scan image for vulnerabilities
      run: |
        docker scan $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

    - name: Push to ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  # -----------------------------------------------
  # JOB 3: Deploy to Staging
  # -----------------------------------------------
  deploy-staging:
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig \
          --region ${{ env.AWS_REGION }} \
          --name ${{ env.EKS_CLUSTER }}-staging

    - name: Deploy to Kubernetes (staging)
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        kubectl set image deployment/api-server \
          api=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
          -n staging

        kubectl rollout status deployment/api-server -n staging

    - name: Run smoke tests (staging)
      run: |
        npm run test:e2e:staging

  # -----------------------------------------------
  # JOB 4: Deploy to Production (Manual Approval)
  # -----------------------------------------------
  deploy-production:
    needs: [docker-build, deploy-staging]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.example.com

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig \
          --region ${{ env.AWS_REGION }} \
          --name ${{ env.EKS_CLUSTER }}

    - name: Deploy to Kubernetes (production)
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        kubectl set image deployment/api-server \
          api=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
          -n production

        kubectl rollout status deployment/api-server -n production

    - name: Run smoke tests (production)
      run: |
        npm run test:e2e:production

    - name: Notify deployment success
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Production deployment successful! 🚀'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### CI/CD Pipeline Visualization

```mermaid
graph TB
    Start[Git Push] --> Checkout[Checkout Code]
    Checkout --> Lint[Lint Code]
    Lint --> Unit[Unit Tests]
    Unit --> Integration[Integration Tests]
    Integration --> Build[Build App]
    Build --> Docker[Build Docker Image]
    Docker --> Scan[Scan for Vulnerabilities]
    Scan --> Push[Push to Registry]
    Push --> DeployStaging[Deploy to Staging]
    DeployStaging --> E2E[E2E Tests on Staging]
    E2E -->|Pass| Approval{Manual Approval}
    E2E -->|Fail| Rollback1[❌ Rollback Staging]
    Approval -->|Approved| DeployProd[Deploy to Production]
    Approval -->|Rejected| Stop[Stop Pipeline]
    DeployProd --> SmokeTest[Smoke Tests on Prod]
    SmokeTest -->|Pass| Success[✅ Deployment Complete]
    SmokeTest -->|Fail| Rollback2[❌ Rollback Production]

    style Success fill:#4caf50
    style Rollback1 fill:#f44336
    style Rollback2 fill:#f44336
    style Approval fill:#ffeb3b
```

## Best Practices

### 1. Version Control Everything

```bash
# Infrastructure code belongs in Git
git add terraform/
git add k8s/
git add docker-compose.yml
git commit -m "feat: add production infrastructure"
git push origin main

# DON'T:
# ❌ Manual AWS Console changes (not tracked)
# ❌ kubectl apply without committing YAML first
# ❌ Docker run with unversioned images
```

### 2. Modularize Code

```hcl
# BAD - Monolithic file (1000+ lines)
# infrastructure.tf
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public1" { ... }
resource "aws_subnet" "public2" { ... }
# ...997 more lines

# GOOD - Modular structure
# modules/networking/main.tf
resource "aws_vpc" "main" { ... }

# modules/compute/main.tf
resource "aws_instance" "app" { ... }

# main.tf - Compose modules
module "networking" {
  source = "./modules/networking"
}
module "compute" {
  source = "./modules/compute"
  vpc_id = module.networking.vpc_id
}
```

### 3. Separate Environments

```bash
# Directory structure for multiple environments
terraform/
├── modules/          # Reusable modules
├── environments/
│   ├── development/
│   │   ├── main.tf
│   │   └── terraform.tfvars  # dev-specific values
│   ├── staging/
│   │   ├── main.tf
│   │   └── terraform.tfvars  # staging values
│   └── production/
│       ├── main.tf
│       └── terraform.tfvars  # prod values
```

### 4. Use Remote State

```hcl
# NEVER store state locally for teams!

# BAD - Local state (not shareable)
# terraform.tfstate in .git (merge conflicts!)

# GOOD - Remote state in S3
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # Prevents concurrent modifications
  }
}
```

### 5. Implement State Locking

```hcl
# Prevents multiple people running terraform apply simultaneously

# Create DynamoDB table for locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "Terraform State Lock Table"
  }
}
```

### 6. Tag All Resources

```hcl
# Tags enable cost tracking, ownership, automation

locals {
  common_tags = {
    Project     = "web-app"
    Environment = var.environment
    ManagedBy   = "terraform"
    Increment   = "0012-aws-infrastructure"
    Team        = "platform"
    CostCenter  = "engineering"
    Owner       = "devops@company.com"
  }
}

resource "aws_instance" "app" {
  tags = merge(local.common_tags, {
    Name = "app-server-${var.environment}"
    Role = "application"
  })
}
```

### 7. Use Variables and Secrets Management

```hcl
# variables.tf - Define variables
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Won't be shown in logs
}

# NEVER hardcode secrets!
# ❌ BAD
resource "aws_db_instance" "db" {
  password = "hardcoded123"  # TERRIBLE!
}

# ✅ GOOD - Use AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/db/password"
}

resource "aws_db_instance" "db" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

### 8. Document Everything

```hcl
# Use comments to explain WHY, not WHAT

# BAD - Obvious comment
resource "aws_instance" "app" {
  instance_type = "t3.micro"  # Sets instance type to t3.micro
}

# GOOD - Explains rationale
resource "aws_instance" "app" {
  # t3.micro chosen over t3.small to save $15/month
  # Sufficient for current traffic (2K req/day)
  # Re-evaluate if traffic exceeds 10K req/day
  instance_type = "t3.micro"
}
```

### 9. Test Infrastructure Code

```bash
# Unit tests - Validate syntax
terraform validate

# Plan tests - Simulate changes
terraform plan -out=tfplan

# Integration tests - Apply to test environment
terraform workspace select test
terraform apply -auto-approve

# E2E tests - Verify functionality
curl https://test-api.example.com/health
# Expected: HTTP 200 OK
```

### 10. Implement Cost Controls

```hcl
# Set resource limits to prevent cost overruns

variable "max_instance_count" {
  description = "Maximum number of instances"
  type        = number
  default     = 10

  validation {
    condition     = var.max_instance_count <= 10
    error_message = "Cannot exceed 10 instances (cost limit)"
  }
}

# Use lifecycle policies
resource "aws_instance" "app" {
  lifecycle {
    prevent_destroy = true  # Prevent accidental deletion

    # Ignore changes to tags (allow external tagging)
    ignore_changes = [tags]
  }
}
```

## Common Pitfalls

### 1. Hardcoded Credentials

```hcl
# ❌ TERRIBLE - Credentials in code!
provider "aws" {
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}

# ✅ CORRECT - Use AWS profiles or environment variables
provider "aws" {
  profile = "production"  # From ~/.aws/credentials
}

# Or use IAM roles (best for CI/CD)
provider "aws" {
  # Uses IAM role attached to EC2/CodeBuild/GitHub Actions
}
```

### 2. No State Locking

```bash
# Problem: Two developers run terraform apply simultaneously
# Developer A: terraform apply  # Starts
# Developer B: terraform apply  # Also starts (no lock!)
# Result: Corrupted state, conflicting changes, DISASTER!

# Solution: DynamoDB state locking (see Best Practices #5)
```

### 3. Large Monolithic Files

```hcl
# ❌ BAD - Everything in one file (10,000 lines!)
# main.tf
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public1" { ... }
# ...9,995 more lines
# Impossible to maintain!

# ✅ GOOD - Organized structure
terraform/
├── main.tf          # Entry point
├── variables.tf     # Variable definitions
├── outputs.tf       # Output values
├── networking.tf    # VPC, subnets, etc.
├── compute.tf       # EC2, ASG, etc.
├── database.tf      # RDS, DynamoDB, etc.
└── security.tf      # Security groups, IAM, etc.
```

### 4. No Disaster Recovery Plan

```bash
# ❌ BAD - No backup, no recovery plan
# Production destroyed by: rm -rf .terraform/
# Result: 8+ hours to rebuild manually

# ✅ GOOD - Infrastructure as Code
# Production destroyed? No problem!
git clone infrastructure-repo
cd terraform/production
terraform init
terraform apply -auto-approve
# Result: 10 minutes to rebuild automatically
```

### 5. Ignoring Drift Detection

```bash
# Drift = Manual changes made outside Terraform

# ❌ BAD - Ignore drift (state doesn't match reality)
# Someone manually changed security group in AWS Console
# Terraform doesn't know about it
# Next terraform apply might break things!

# ✅ GOOD - Regular drift detection
terraform plan -detailed-exitcode
# Exit codes:
# 0 = No drift
# 1 = Error
# 2 = Drift detected

# Import manually created resources
terraform import aws_instance.example i-1234567890abcdef0
```

## How SpecWeave Tracks Infrastructure

### Infrastructure Changes in Increments

```markdown
## Increment 0012: AWS Infrastructure Setup

### User Stories
- US-001: Provision AWS VPC and subnets (P1, testable)
- US-002: Deploy RDS PostgreSQL database (P1, testable)
- US-003: Set up Application Load Balancer (P1, testable)
- US-004: Configure auto-scaling (P2, testable)

### Acceptance Criteria
- [ ] **AC-US1-01**: VPC created with CIDR 10.0.0.0/16
- [ ] **AC-US1-02**: 2 public + 2 private subnets across AZs
- [ ] **AC-US2-01**: RDS instance accessible from app subnets only
- [ ] **AC-US2-02**: Daily backups enabled (7-day retention)
- [ ] **AC-US3-01**: ALB routes traffic to healthy instances
- [ ] **AC-US4-01**: Auto-scaling maintains 2-10 instances based on CPU
```

### Test Plan (Embedded in tasks.md)

```markdown
## T-001: Create VPC and Subnets with Terraform

**AC**: AC-US1-01, AC-US1-02

**Test Plan** (BDD format):
- **Given** AWS account with Terraform configured
- **When** terraform apply executed
- **Then** VPC and subnets created with correct CIDR blocks

**Test Cases**:
- Unit: `terraform validate` passes (syntax validation)
- Integration: `terraform plan` shows expected 5 resources
- E2E: VPC and subnets visible in AWS Console after apply

**Implementation**:
1. Create `main.tf` with VPC resource
2. Define 2 public + 2 private subnets
3. Configure route tables and internet gateway
4. Run `terraform apply`
5. Verify in AWS Console

**Coverage**: 100% (infrastructure validation)
```

### Living Documentation

After infrastructure deployment, SpecWeave updates architecture docs:

```bash
# Sync infrastructure to living docs
/specweave:sync-docs update

# Results in:
# 1. Updated HLD with infrastructure diagram
# 2. ADR documenting infrastructure decisions
# 3. Runbook for production operations
# 4. Cost estimate documentation
```

**Example ADR**:

```markdown
# ADR-012: AWS Infrastructure for Production

## Status
Accepted

## Context
Need scalable, reliable infrastructure for web application with 10K users.

## Decision
Use AWS with Terraform for infrastructure as code.

## Architecture

### Components
- VPC with public + private subnets (multi-AZ)
- Application Load Balancer (internet-facing)
- EC2 Auto Scaling (2-10 instances)
- RDS PostgreSQL (Multi-AZ, automated backups)

### Cost Estimate
- EC2 (t3.micro × 2): $15/month
- ALB: $16/month
- RDS (db.t3.micro): $13/month
- Data transfer: ~$5/month
- **Total**: ~$49/month

## Alternatives Considered
- **Heroku**: Simpler but 3× cost ($150/month)
- **DigitalOcean**: Cheaper but less reliable
- **GCP**: Similar cost but team lacks experience

## Rationale
- Industry standard (AWS = 33% market share)
- Terraform enables multi-cloud future migration
- Auto-scaling handles traffic spikes
- Multi-AZ for high availability

## Consequences
- Learning curve for Terraform (2 weeks)
- AWS lock-in (mitigated by Terraform abstraction)
- Monthly cost ~$50 (acceptable for MVP)
```

## Real-World Example: Full Stack Deployment

Let's deploy a complete production application using IaC best practices.

### Architecture Overview

```mermaid
graph TB
    Internet[Internet Users] --> Route53[Route53 DNS]
    Route53 --> CloudFront[CloudFront CDN]
    CloudFront --> ALB[Application Load Balancer]

    ALB --> ASG[Auto Scaling Group<br/>2-10 instances]
    ASG --> EC2-1[EC2 Instance 1]
    ASG --> EC2-2[EC2 Instance 2]
    ASG --> EC2-3[EC2 Instance 3]

    EC2-1 --> RDS[RDS PostgreSQL<br/>Multi-AZ]
    EC2-2 --> RDS
    EC2-3 --> RDS

    EC2-1 --> ElastiCache[ElastiCache Redis]
    EC2-2 --> ElastiCache
    EC2-3 --> ElastiCache

    EC2-1 --> S3[S3 Bucket<br/>Static Assets]

    subgraph "VPC 10.0.0.0/16"
        subgraph "Public Subnets"
            ALB
        end

        subgraph "Private Subnets"
            ASG
            EC2-1
            EC2-2
            EC2-3
        end

        subgraph "Database Subnets"
            RDS
            ElastiCache
        end
    end

    style Internet fill:#64b5f6
    style CloudFront fill:#ff9800
    style ALB fill:#4caf50
    style RDS fill:#ab47bc
    style S3 fill:#f44336
```

### Complete Deployment Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub
    participant CI as GitHub Actions
    participant ECR as AWS ECR
    participant TF as Terraform
    participant EKS as Kubernetes (EKS)
    participant App as Production App

    Dev->>Git: 1. Push code
    Git->>CI: 2. Trigger CI/CD

    Note over CI: Build & Test Phase
    CI->>CI: 3. Lint code
    CI->>CI: 4. Run unit tests
    CI->>CI: 5. Run integration tests
    CI->>CI: 6. Build Docker image

    CI->>ECR: 7. Push image

    Note over CI,TF: Infrastructure Phase
    CI->>TF: 8. terraform plan
    TF->>TF: 9. Validate changes
    CI->>TF: 10. terraform apply
    TF->>EKS: 11. Provision infrastructure

    Note over CI,App: Deployment Phase
    CI->>EKS: 12. kubectl apply
    EKS->>App: 13. Rolling update
    App->>App: 14. Health checks

    CI->>App: 15. Smoke tests
    App-->>CI: ✅ Tests pass

    CI->>Dev: 16. Deployment complete!
```

## Next Steps

Congratulations! You now understand Infrastructure as Code fundamentals.

**To deepen your knowledge**, explore these topics:

### Terraform
- [Terraform guide](/docs/glossary/terms/terraform) - Complete Terraform reference
- [Terraform Registry](https://registry.terraform.io/) - Browse modules and providers
- [Terraform Best Practices](https://www.terraform-best-practices.com/) - Community best practices

### Kubernetes
- [Kubernetes guide](/docs/glossary/terms/kubernetes) - Complete K8s reference
- [Helm guide](/docs/glossary/terms/helm) - K8s package manager
- [Kubernetes Patterns](https://k8spatterns.io/) - Design patterns for K8s

### Docker
- [Docker guide](/docs/glossary/terms/docker) - Complete Docker reference
- [Docker Hub](https://hub.docker.com/) - Public container registry
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

### CI/CD
- [CI/CD guide](/docs/glossary/terms/ci-cd) - Continuous integration and deployment
- [GitHub Actions guide](/docs/glossary/terms/github-actions) - GitHub CI/CD
- [GitOps](https://www.gitops.tech/) - Git-based deployment strategy

### Related Concepts
- [Microservices Architecture](/docs/glossary/terms/microservices)
- [Service Mesh](/docs/glossary/terms/service-mesh)
- [Observability](/docs/glossary/terms/observability)
- [Site Reliability Engineering (SRE)](/docs/glossary/terms/sre)

### Hands-On Practice

**Free Learning Resources**:
- [Terraform Tutorial](https://learn.hashicorp.com/terraform) - Official HashiCorp tutorials
- [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) - Learn K8s internals
- [Play with Docker](https://labs.play-with-docker.com/) - Free Docker playground
- [Killercoda](https://killercoda.com/) - Interactive K8s scenarios

**SpecWeave Integration**:
- Use SpecWeave to track IaC increments
- Document infrastructure decisions in ADRs
- Embed infrastructure tests in tasks.md
- Maintain living docs for runbooks

---

**Last Updated**: 2025-11-04
**Category**: Infrastructure & DevOps
**Reading Time**: 25 minutes
