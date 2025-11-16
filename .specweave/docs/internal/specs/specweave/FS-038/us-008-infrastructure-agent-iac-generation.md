---
id: US-008
feature: FS-038
title: Infrastructure Agent IaC Generation
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-008: Infrastructure Agent IaC Generation

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As an** infrastructure agent
**I want** to auto-generate Terraform configurations from architect recommendations
**So that** developers can deploy serverless infrastructure without writing IaC manually

---

## Acceptance Criteria

- [ ] **AC-US8-01**: Agent generates Terraform files based on architect's platform recommendation (P1, testable)
- [ ] **AC-US8-02**: Generated configs include main.tf, variables.tf, outputs.tf, providers.tf (P1, testable)
- [ ] **AC-US8-03**: Agent supports all platforms (AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase) (P1, testable)
- [ ] **AC-US8-04**: Generated configs include environment-specific tfvars (dev, staging, prod) (P2, testable)
- [ ] **AC-US8-05**: Agent generates README with deployment instructions (P1, testable)
- [ ] **AC-US8-06**: Agent customizes templates based on project requirements (memory, timeout, integrations) (P1, testable)
- [ ] **AC-US8-07**: Generated IaC is syntax-valid (passes terraform validate) (P1, testable)
- [ ] **AC-US8-08**: Agent provides next steps (terraform init, plan, apply) (P1, testable)

---

## Implementation

**Files to Modify**:
- `plugins/specweave/agents/infrastructure/AGENT.md` (~400 lines → ~600 lines)

**New Command**: `/infrastructure [platform]`

**Examples**:
- `/infrastructure aws-lambda` → Generates AWS Lambda + API Gateway + DynamoDB Terraform
- `/infrastructure azure-functions` → Generates Azure Functions + Cosmos DB Terraform
- `/infrastructure firebase` → Generates Firebase Terraform
- `/infrastructure supabase` → Generates Supabase Terraform

**Workflow**:

```
User: /infrastructure aws-lambda

Infrastructure Agent:
1. Load architect's recommendation (from plan.md or context)
2. Load template from plugins/specweave/templates/iac/aws-lambda/
3. Customize template based on requirements:
   - Function name: Extract from project
   - Memory size: Default 128MB (free tier) or custom
   - Runtime: Detect from tech stack (Node.js, Python, etc.)
   - Integrations: Add DynamoDB, S3, RDS based on plan.md
4. Generate files:
   - main.tf (customized with project-specific values)
   - variables.tf (project-specific variables)
   - outputs.tf (API endpoint, function ARN, etc.)
   - providers.tf (AWS region from config)
   - environments/dev.tfvars (dev environment)
   - environments/staging.tfvars (staging environment)
   - environments/prod.tfvars (production environment)
   - README.md (deployment instructions)
5. Write files to .infrastructure/ directory
6. Provide next steps

Output:
✅ Terraform configuration generated!

Location: .infrastructure/aws-lambda/

Files created:
  ✓ main.tf (Lambda, API Gateway, DynamoDB)
  ✓ variables.tf (14 variables)
  ✓ outputs.tf (api_endpoint, function_arn, table_name)
  ✓ providers.tf (AWS provider, region: us-east-1)
  ✓ iam.tf (Lambda execution role, DynamoDB policies)
  ✓ environments/dev.tfvars
  ✓ environments/staging.tfvars
  ✓ environments/prod.tfvars
  ✓ README.md (deployment guide)

📋 Configuration Details:
   • Platform: AWS Lambda
   • Runtime: nodejs20.x (detected from package.json)
   • Memory: 128MB (free tier optimized)
   • Timeout: 30 seconds
   • Database: DynamoDB (PAY_PER_REQUEST billing)
   • API: HTTP API (cheaper than REST API)

💰 Estimated Cost (Dev Environment):
   • Lambda: $0 (within free tier)
   • DynamoDB: $0 (within free tier)
   • API Gateway: $0 (within free tier)
   • **Total: ~$0/month** (free tier)

📚 Next Steps:
   1. Build Lambda deployment package:
      cd src && npm install && zip -r ../function.zip .

   2. Initialize Terraform:
      cd .infrastructure/aws-lambda && terraform init

   3. Deploy to dev:
      terraform plan -var-file="environments/dev.tfvars" -var="lambda_zip_path=../../function.zip"
      terraform apply -var-file="environments/dev.tfvars" -var="lambda_zip_path=../../function.zip"

   4. Get API endpoint:
      terraform output api_endpoint

   5. Test:
      curl https://<api_endpoint>

📖 Full deployment guide: .infrastructure/aws-lambda/README.md
```

**Template Customization Logic**:

```typescript
interface IaCCustomization {
  projectName: string;
  runtime: string; // Detect from package.json, requirements.txt, etc.
  memorySize: number; // Default 128MB, or custom from requirements
  timeout: number; // Default 30s, or custom from requirements
  environment: 'dev' | 'staging' | 'prod';
  integrations: {
    database: 'dynamodb' | 'rds' | 'cosmosdb' | 'firestore' | 'postgres';
    storage: 's3' | 'blob' | 'gcs' | 'firebase-storage';
    auth: 'cognito' | 'auth0' | 'firebase-auth' | 'supabase-auth';
  };
  region: string; // Default or from config
  corsOrigins: string[]; // Extract from frontend URL or allow all
}

function customizeTemplate(platform: Platform, customization: IaCCustomization): TerraformFiles {
  // Load base template
  const template = loadTemplate(platform);

  // Replace variables
  template.variables.function_name = customization.projectName;
  template.variables.runtime = customization.runtime;
  template.variables.memory_size = customization.memorySize;
  template.variables.timeout = customization.timeout;
  template.variables.region = customization.region;

  // Add integrations
  if (customization.integrations.database === 'dynamodb') {
    template.main += generateDynamoDBResource();
    template.iam += generateDynamoDBPolicies();
  }

  // Generate environment-specific tfvars
  template.tfvars = {
    dev: generateDevTfvars(customization),
    staging: generateStagingTfvars(customization),
    prod: generateProdTfvars(customization)
  };

  return template;
}
```

---

## Business Rationale

Infrastructure agent is the final step in the workflow. Auto-generating IaC removes the last manual barrier to serverless deployment, enabling true end-to-end automation.

---

## Test Strategy

**Unit Tests**:
- Template loading logic
- Variable substitution logic
- Terraform syntax validation

**Integration Tests**:
- Full IaC generation workflow (load template → customize → generate files)
- Integration with architect agent (receive platform recommendation)

**E2E Tests** (CRITICAL):
- Generate Terraform for AWS Lambda → Deploy to test account → Verify API works → Destroy
- Repeat for Azure Functions, GCP Cloud Functions, Firebase, Supabase

**Coverage Target**: 95%+

---

## Related User Stories

- [US-005: IaC Pattern Library - Terraform](us-005-iac-pattern-library-terraform.md)
- [US-007: Architect Agent Enhancement](us-007-architect-agent-enhancement.md)

---

**Status**: Planning
**Priority**: P1 (core deliverable)
**Estimated Effort**: 4-6 hours
