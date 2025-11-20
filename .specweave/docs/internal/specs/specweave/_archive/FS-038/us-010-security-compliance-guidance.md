---
id: US-010
feature: FS-038
title: Security and Compliance Guidance
status: planning
priority: P2
created: 2025-11-16
project: specweave
---

# US-010: Security and Compliance Guidance

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer deploying serverless applications
**I want** security best practices and compliance guidance
**So that** I can deploy securely and meet regulatory requirements

---

## Acceptance Criteria

- [ ] **AC-US10-01**: Agent provides IAM best practices (least privilege, role-based access) (P2, testable)
- [ ] **AC-US10-02**: Agent recommends secrets management (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) (P2, testable)
- [ ] **AC-US10-03**: Agent enforces HTTPS-only configurations (P2, testable)
- [ ] **AC-US10-04**: Agent provides compliance guidance (SOC 2, HIPAA, GDPR, PCI-DSS) (P2, testable)
- [ ] **AC-US10-05**: Generated IaC includes security configurations (VPC, encryption, logging) (P2, testable)
- [ ] **AC-US10-06**: Agent warns about common security misconfigurations (public S3 buckets, overly permissive IAM) (P2, testable)
- [ ] **AC-US10-07**: Agent provides security checklist for production deployments (P2, testable)

---

## Implementation

**Files to Modify**:
- `plugins/specweave/agents/architect/AGENT.md` (add security section)
- `plugins/specweave/agents/infrastructure/AGENT.md` (add security configurations)

**Security Best Practices**:

### IAM Best Practices

```markdown
## IAM Best Practices (AWS Lambda example)

### Least Privilege Principle

**Wrong** ❌:
```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "*"  # ❌ Overly permissive!
      Resource = "*"
    }]
  })
}
```

**Correct** ✅:
```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"]
        Resource = aws_dynamodb_table.main.arn
      },
      {
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

### Secrets Management

**Wrong** ❌:
```javascript
// ❌ Hardcoded secret in code
const API_KEY = "sk-1234567890abcdef";

// ❌ Secret in environment variable (logged to CloudWatch)
const API_KEY = process.env.API_KEY;
```

**Correct** ✅:
```javascript
// ✅ Load secret from AWS Secrets Manager
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

const secret = await getSecret('prod/api-key');
const API_KEY = secret.apiKey;
```

### HTTPS Enforcement

**Terraform (API Gateway)**:
```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "my-api"
  protocol_type = "HTTP"

  # ✅ Enforce HTTPS
  cors_configuration {
    allow_origins = ["https://example.com"]  # Only HTTPS origins
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
  }
}

# ✅ Custom domain with HTTPS certificate
resource "aws_apigatewayv2_domain_name" "main" {
  domain_name = "api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.main.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"  # ✅ Minimum TLS 1.2
  }
}
```

### VPC Configuration (Database Security)

```hcl
# ✅ Lambda in VPC for secure database access
resource "aws_lambda_function" "main" {
  function_name = "my-function"
  role          = aws_iam_role.lambda_exec.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# ✅ Security group: Allow outbound to RDS only
resource "aws_security_group" "lambda" {
  name   = "lambda-sg"
  vpc_id = aws_vpc.main.id

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_security_group.rds.id]  # Only RDS
  }
}
```

---

### Compliance Guidance

**SOC 2 Requirements**:
- ✅ Encryption at rest (DynamoDB, S3, RDS)
- ✅ Encryption in transit (HTTPS, TLS 1.2+)
- ✅ Audit logging (CloudTrail, CloudWatch Logs)
- ✅ Access controls (IAM roles, least privilege)
- ✅ Monitoring and alerting (CloudWatch Alarms)

**HIPAA Requirements**:
- ✅ AWS BAA (Business Associate Agreement) signed
- ✅ Encryption at rest and in transit
- ✅ Audit logging (who accessed PHI, when)
- ✅ VPC isolation (no public access to PHI)
- ✅ Regular security reviews

**GDPR Requirements**:
- ✅ Data residency (deploy in EU regions)
- ✅ Right to erasure (delete user data on request)
- ✅ Data portability (export user data)
- ✅ Consent management (track user consent)

**PCI-DSS Requirements** (Payment data):
- ✅ Never store credit card data (use Stripe/Square)
- ✅ Tokenization (store tokens, not raw data)
- ✅ Encryption at rest and in transit
- ✅ Regular security audits

---

### Security Checklist (Production Deployments)

**Before deploying to production**, verify:

- [ ] **IAM Roles**: Least privilege (no wildcards in policies)
- [ ] **Secrets Management**: No hardcoded secrets (use Secrets Manager)
- [ ] **HTTPS Only**: All APIs use HTTPS (TLS 1.2+)
- [ ] **Encryption**: Data at rest encrypted (DynamoDB, S3, RDS)
- [ ] **VPC**: Database connections in private subnets (no public access)
- [ ] **Logging**: CloudWatch Logs enabled (retention > 90 days)
- [ ] **Monitoring**: CloudWatch Alarms for errors, latency, cost
- [ ] **Compliance**: Meet regulatory requirements (SOC 2, HIPAA, GDPR)
- [ ] **Backup**: Automated backups enabled (DynamoDB PITR, RDS snapshots)
- [ ] **Disaster Recovery**: Tested rollback plan (blue/green deployment)

---

## Business Rationale

Security breaches and compliance violations are costly (millions in fines, reputational damage). Proactive security guidance prevents issues and builds trust.

---

## Test Strategy

**Unit Tests**:
- IAM policy validation (least privilege checks)
- Secret management configuration tests
- HTTPS enforcement validation

**Integration Tests**:
- Generate IaC with security configurations
- Verify security groups, VPC configs, encryption settings

**E2E Tests**:
- Deploy to test account → Run security audit (AWS Trusted Advisor, ScoutSuite)
- Verify no high-severity findings

**Coverage Target**: 90%+

---

## Related User Stories

- [US-005: IaC Pattern Library - Terraform](us-005-iac-pattern-library-terraform.md)
- [US-007: Architect Agent Enhancement](us-007-architect-agent-enhancement.md)
- [US-008: Infrastructure Agent IaC Generation](us-008-infrastructure-agent-iac-generation.md)

---

**Status**: Planning
**Priority**: P2 (critical for production deployments)
**Estimated Effort**: 2-3 hours
