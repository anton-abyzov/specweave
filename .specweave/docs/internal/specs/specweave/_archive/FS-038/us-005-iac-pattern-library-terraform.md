---
id: US-005
feature: FS-038
title: IaC Pattern Library - Terraform
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-005: IaC Pattern Library - Terraform

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer deploying serverless applications
**I want** pre-built Terraform templates for AWS, Azure, GCP, Firebase, and Supabase
**So that** I can provision infrastructure quickly without writing IaC from scratch

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Terraform templates for AWS Lambda + API Gateway + DynamoDB (P1, testable)
- [ ] **AC-US5-02**: Terraform templates for Azure Functions + Cosmos DB (P1, testable)
- [ ] **AC-US5-03**: Terraform templates for GCP Cloud Functions + Firestore (P1, testable)
- [ ] **AC-US5-04**: Terraform templates for Firebase (Hosting, Functions, Firestore) (P2, testable)
- [ ] **AC-US5-05**: Terraform templates for Supabase (Database, Auth, Storage) (P2, testable)
- [ ] **AC-US5-06**: Templates include variables, outputs, provider configurations (P1, testable)
- [ ] **AC-US5-07**: Templates support environment-specific configs (dev, staging, prod) (P2, testable)
- [ ] **AC-US5-08**: Templates include README with deployment instructions (P1, testable)
- [ ] **AC-US5-09**: Templates validated via E2E tests (deploy to test accounts successfully) (P1, testable)

---

## Implementation

**Files to Create**:
- `plugins/specweave/templates/iac/aws-lambda/` (directory with Terraform files)
- `plugins/specweave/templates/iac/azure-functions/`
- `plugins/specweave/templates/iac/gcp-cloud-functions/`
- `plugins/specweave/templates/iac/firebase/`
- `plugins/specweave/templates/iac/supabase/`

**Template Structure** (AWS Lambda example):

```
plugins/specweave/templates/iac/aws-lambda/
├── main.tf               # Core infrastructure (Lambda, API Gateway, DynamoDB)
├── variables.tf          # Input variables (region, function_name, memory_size)
├── outputs.tf            # Output values (api_endpoint, function_arn, table_name)
├── providers.tf          # AWS provider configuration
├── iam.tf                # IAM roles and policies
├── terraform.tfvars.example  # Example variable values
├── environments/
│   ├── dev.tfvars        # Dev environment
│   ├── staging.tfvars    # Staging environment
│   └── prod.tfvars       # Production environment
└── README.md             # Deployment instructions
```

**Example: `main.tf` (AWS Lambda + API Gateway + DynamoDB)**

```hcl
# Lambda Function
resource "aws_lambda_function" "main" {
  filename         = var.lambda_zip_path
  function_name    = var.function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = var.handler
  runtime          = var.runtime
  memory_size      = var.memory_size
  timeout          = var.timeout
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
      ENVIRONMENT = var.environment
    }
  }

  tags = var.tags
}

# API Gateway (HTTP API - cheaper, simpler than REST API)
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.function_name}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.main.invoke_arn
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# DynamoDB Table
resource "aws_dynamodb_table" "main" {
  name           = var.table_name
  billing_mode   = var.dynamodb_billing_mode
  hash_key       = var.dynamodb_hash_key
  range_key      = var.dynamodb_range_key

  attribute {
    name = var.dynamodb_hash_key
    type = "S"
  }

  dynamic "attribute" {
    for_each = var.dynamodb_range_key != null ? [1] : []
    content {
      name = var.dynamodb_range_key
      type = "S"
    }
  }

  ttl {
    enabled        = var.dynamodb_ttl_enabled
    attribute_name = var.dynamodb_ttl_attribute
  }

  tags = var.tags
}
```

**Example: `variables.tf`**

```hcl
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "handler" {
  description = "Lambda handler (e.g., index.handler)"
  type        = string
  default     = "index.handler"
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment package (.zip)"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "dynamodb_hash_key" {
  description = "DynamoDB hash key attribute name"
  type        = string
}

variable "dynamodb_range_key" {
  description = "DynamoDB range key attribute name (optional)"
  type        = string
  default     = null
}

variable "dynamodb_ttl_enabled" {
  description = "Enable DynamoDB TTL"
  type        = bool
  default     = false
}

variable "dynamodb_ttl_attribute" {
  description = "DynamoDB TTL attribute name"
  type        = string
  default     = "ttl"
}

variable "cors_allow_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
```

**Example: `outputs.tf`**

```hcl
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.main.function_name
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.main.arn
}

output "table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.main.arn
}
```

**Example: `environments/dev.tfvars`**

```hcl
region        = "us-east-1"
function_name = "my-app-dev"
environment   = "dev"
table_name    = "my-app-dev-data"
memory_size   = 128
timeout       = 30
dynamodb_hash_key = "id"
cors_allow_origins = ["http://localhost:3000"]

tags = {
  Environment = "dev"
  Project     = "my-app"
  ManagedBy   = "terraform"
}
```

**Example: `README.md`**

````markdown
# AWS Lambda + API Gateway + DynamoDB (Terraform)

**Generated by SpecWeave** - Infrastructure Agent

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) v1.5+
- [AWS CLI](https://aws.amazon.com/cli/) v2+
- AWS account with credentials configured

## Quick Start

### 1. Build Lambda Deployment Package

```bash
cd lambda
npm install
zip -r ../function.zip .
cd ..
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Deploy to Dev Environment

```bash
terraform plan -var-file="environments/dev.tfvars" -var="lambda_zip_path=function.zip"
terraform apply -var-file="environments/dev.tfvars" -var="lambda_zip_path=function.zip"
```

### 4. Get API Endpoint

```bash
terraform output api_endpoint
```

### 5. Test API

```bash
curl https://<api_endpoint>
```

## Environments

- **dev**: `environments/dev.tfvars`
- **staging**: `environments/staging.tfvars`
- **prod**: `environments/prod.tfvars`

## Configuration

Edit `environments/{env}.tfvars` to customize:
- `function_name`: Lambda function name
- `memory_size`: Lambda memory (128MB - 10GB)
- `timeout`: Execution timeout (1s - 900s)
- `table_name`: DynamoDB table name
- `cors_allow_origins`: CORS allowed origins

## Free Tier Optimization

This template is configured for AWS Free Tier:
- Lambda: 128MB memory (smallest size)
- DynamoDB: PAY_PER_REQUEST billing (no provisioned capacity)
- API Gateway: HTTP API (cheaper than REST API)

**Estimated Cost (Pet Project - 1000 requests/day)**:
- Lambda: $0 (within free tier)
- DynamoDB: $0 (within free tier)
- API Gateway: $0 (within free tier)
- **Total: ~$0/month** (within free tier limits)

## Cleanup

```bash
terraform destroy -var-file="environments/dev.tfvars" -var="lambda_zip_path=function.zip"
```

## Troubleshooting

**Error: "No credentials found"**
```bash
aws configure
```

**Error: "Resource already exists"**
- Change `function_name` in tfvars to avoid collision

**Lambda cold starts too slow?**
- Increase `memory_size` (more memory = faster cold starts)
- Consider provisioned concurrency (costs more)
````

---

## Business Rationale

Writing Terraform from scratch is time-consuming (2-4 hours for a simple Lambda setup). Pre-built templates reduce time to deployment from hours to minutes, increasing developer productivity.

---

## Test Strategy

**Unit Tests**:
- Terraform syntax validation (`terraform validate`)
- Variable validation (required variables present)

**Integration Tests**:
- Template generation logic in infrastructure agent
- Variable substitution (function_name, region, etc.)

**E2E Tests** (CRITICAL):
- Deploy templates to test AWS/Azure/GCP accounts
- Verify resources created successfully
- Verify API endpoint responds
- Clean up resources (terraform destroy)

**Coverage Target**: 95%+ (templates must work!)

---

## Related User Stories

- [US-008: Infrastructure Agent IaC Generation](us-008-infrastructure-agent-iac-generation.md)

---

**Status**: Planning
**Priority**: P1 (core deliverable)
**Estimated Effort**: 6-8 hours
