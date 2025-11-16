# Increment 0038: Implementation Plan & Next Steps

**Document Purpose**: Detailed roadmap for completing increment 0038
**Current Status**: 30% complete (Phase 1 done, Phases 2-4 incomplete)
**Total Effort Remaining**: 36 hours
**Priority**: Critical Path (15h) → Nice to Have (21h)

---

## Critical Path to MVP (15 hours)

Complete this path to deliver a fully functional end-to-end workflow.

### Task 1: Create Infrastructure Agent (3 hours) 🔴 CRITICAL BLOCKER

**Why Critical**: Blocks entire IaC generation workflow. Without this, users can't act on recommendations.

**File**: `/home/user/specweave/plugins/specweave/agents/infrastructure/AGENT.md`

**Implementation Steps**:

1. **Create agent frontmatter** (10 min):
```yaml
---
name: infrastructure
role: Infrastructure Specialist
description: Generates Infrastructure-as-Code for serverless platforms. Creates Terraform configurations, environment-specific tfvars, and deployment instructions.
capabilities:
  - IaC generation for AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase
  - Template customization with project-specific values
  - Environment configuration (dev/staging/prod)
  - Deployment workflow guidance
---
```

2. **Document agent responsibilities** (30 min):
   - Receive platform recommendations from architect agent
   - Load appropriate Terraform templates
   - Customize templates with project values
   - Generate files in `.infrastructure/{platform}/` directory
   - Create environment tfvars
   - Generate deployment README
   - Provide next steps (terraform init → plan → apply)

3. **Add collaboration section** (20 min):
   - How architect agent triggers IaC generation
   - Template selection logic (AWS → aws-lambda/, Azure → azure-functions/, etc.)
   - Data flow: Recommendation → Template → Customization → Files

4. **Add template loading workflow** (30 min):
```markdown
## IaC Generation Workflow

When architect agent recommends a serverless platform:

1. **Receive Recommendation**:
   - Platform ID (aws-lambda, azure-functions, gcp-cloud-functions, firebase, supabase)
   - Project metadata (name, region, runtime, etc.)
   - Environment (dev/staging/prod)

2. **Load Templates**:
   - Locate: `plugins/specweave/iac-templates/{platform-id}/`
   - Load: main.tf.hbs, variables.tf.hbs, outputs.tf.hbs, provider.tf.hbs, iam.tf.hbs, README.md.hbs

3. **Customize Templates**:
   - Merge: defaults.json + project metadata
   - Render: Handlebars templates → Terraform files
   - Generate: Environment tfvars (dev.tfvars, staging.tfvars, prod.tfvars)

4. **Write Files**:
   - Create directory: `.infrastructure/{platform-id}/`
   - Write: All .tf files
   - Write: Environment tfvars in `environments/` subdirectory
   - Write: README.md with deployment instructions

5. **Provide Next Steps**:
   - Show: Generated files list
   - Explain: Deployment workflow (terraform init → plan → apply)
   - Warn: Review files before applying
```

5. **Add TypeScript integration reference** (30 min):
```markdown
## Implementation

I use the following TypeScript modules:

### Template Engine
- **Module**: `src/core/iac/template-engine.ts`
- **Function**: `TerraformTemplateEngine.render()`
- **Capabilities**: Handlebars compilation, custom helpers, multi-file rendering

### Platform Data
- **Module**: `src/core/serverless/platform-data-loader.ts`
- **Function**: `loadPlatformData(platformId: string)`
- **Returns**: Platform pricing, features, ecosystem data

### File Writing
- **Module**: Node.js `fs/promises`
- **Operations**: mkdir, writeFile
- **Path**: `.infrastructure/{platform-id}/`
```

6. **Add example interactions** (30 min):
```markdown
## Example: AWS Lambda IaC Generation

**User**: "Generate Terraform for AWS Lambda"

**Architect Agent**:
→ Analyzes: Serverless suitability
→ Recommends: AWS Lambda with DynamoDB
→ Passes to: Infrastructure Agent
  {
    platform: "aws-lambda",
    projectName: "my-api",
    region: "us-east-1",
    runtime: "nodejs20.x",
    environment: "dev"
  }

**Infrastructure Agent**:
→ Loads: plugins/specweave/iac-templates/aws-lambda/
→ Customizes: Templates with project values
→ Generates: .infrastructure/aws-lambda/*.tf
  - main.tf (Lambda + API Gateway + DynamoDB)
  - variables.tf (Input variables)
  - outputs.tf (API endpoint, function ARN, table name)
  - provider.tf (AWS provider with region)
  - iam.tf (Lambda execution role, DynamoDB policies)
  - README.md (Deployment instructions)
  - environments/dev.tfvars (Development settings)
  - environments/staging.tfvars (Staging settings)
  - environments/prod.tfvars (Production settings)

**Output**:
✅ Generated 9 files in .infrastructure/aws-lambda/
📄 Review files before deploying:
   - main.tf: Lambda function + API Gateway + DynamoDB table
   - variables.tf: Configurable parameters
   - outputs.tf: API endpoint URL, function ARN, table ARN
   - iam.tf: IAM execution role with least privilege

🚀 Next steps:
   1. cd .infrastructure/aws-lambda
   2. terraform init
   3. terraform plan -var-file=environments/dev.tfvars
   4. terraform apply -var-file=environments/dev.tfvars

⚠️  Always review terraform plan output before applying!
```

7. **Add security notes** (20 min):
   - IAM least privilege principles
   - Secrets management (never hardcode)
   - HTTPS-only configurations
   - Encryption at rest
   - VPC for databases

8. **Write unit tests** (20 min):
   - Test: Template loading
   - Test: Template customization
   - Test: File generation
   - Test: Environment tfvars
   - Test: README generation
   - Test: Next steps formatting

**Testing**:
```bash
npm test -- infrastructure-iac-generation
npm test -- infrastructure-iac-generation-flow
npm run test:e2e -- infrastructure-iac-generation
```

**Acceptance Criteria** (verify all before marking done):
- [ ] Agent markdown file created with YAML frontmatter
- [ ] Collaboration with architect agent documented
- [ ] Template loading workflow explained
- [ ] TypeScript integration documented
- [ ] Example interactions show full workflow
- [ ] Security notes included
- [ ] Integration with TerraformTemplateEngine works
- [ ] Generates all required files (.tf, tfvars, README)
- [ ] Next steps are actionable
- [ ] Unit tests pass (6/6)
- [ ] Integration tests pass (3/3)
- [ ] E2E test deploys successfully (1/1)

**Files Modified**:
- `plugins/specweave/agents/infrastructure/AGENT.md` (new file, ~600-800 lines)

---

### Task 2: Create Azure Functions Templates (2 hours)

**Why Important**: 2nd most popular serverless platform (Microsoft ecosystem)

**Directory**: `/home/user/specweave/plugins/specweave/iac-templates/azure-functions/`

**Files to Create**:

1. **main.tf.hbs** (200 lines):
```hcl
# Azure Functions with Cosmos DB
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

resource "azurerm_resource_group" "{{snakeCase projectName}}" {
  name     = "{{projectName}}-{{environment}}"
  location = "{{location}}"
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "{{snakeCase projectName}}{{environment}}"
  resource_group_name      = azurerm_resource_group.{{snakeCase projectName}}.name
  location                 = azurerm_resource_group.{{snakeCase projectName}}.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_plan" {
  name                = "{{projectName}}-plan-{{environment}}"
  resource_group_name = azurerm_resource_group.{{snakeCase projectName}}.name
  location            = azurerm_resource_group.{{snakeCase projectName}}.location
  os_type             = "{{osType}}"
  sku_name            = "{{#if (eq environment \"prod\")}}P1v2{{else}}Y1{{/if}}"
}

resource "azurerm_linux_function_app" "{{snakeCase functionName}}" {
  name                = "{{functionName}}-{{environment}}"
  resource_group_name = azurerm_resource_group.{{snakeCase projectName}}.name
  location            = azurerm_resource_group.{{snakeCase projectName}}.location

  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  service_plan_id           = azurerm_service_plan.function_plan.id

  site_config {
    application_stack {
      {{#if (eq runtime "node")}}
      node_version = "18"
      {{else if (eq runtime "python")}}
      python_version = "3.11"
      {{else if (eq runtime "dotnet")}}
      dotnet_version = "8.0"
      {{/if}}
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "{{runtime}}"
    {{#if databaseName}}
    COSMOS_DB_ENDPOINT = azurerm_cosmosdb_account.{{snakeCase databaseName}}.endpoint
    COSMOS_DB_KEY      = azurerm_cosmosdb_account.{{snakeCase databaseName}}.primary_key
    {{/if}}
  }
}

{{#if databaseName}}
resource "azurerm_cosmosdb_account" "{{snakeCase databaseName}}" {
  name                = "{{databaseName}}-{{environment}}"
  location            = azurerm_resource_group.{{snakeCase projectName}}.location
  resource_group_name = azurerm_resource_group.{{snakeCase projectName}}.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.{{snakeCase projectName}}.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "{{snakeCase databaseName}}_db" {
  name                = "{{databaseName}}"
  resource_group_name = azurerm_cosmosdb_account.{{snakeCase databaseName}}.resource_group_name
  account_name        = azurerm_cosmosdb_account.{{snakeCase databaseName}}.name
  throughput          = {{#if (eq environment "prod")}}1000{{else}}400{{/if}}
}
{{/if}}
```

2. **variables.tf.hbs** (80 lines):
```hcl
variable "project_name" {
  description = "Project name"
  type        = string
  default     = "{{projectName}}"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "{{environment}}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "{{#if location}}{{location}}{{else}}East US{{/if}}"
}

variable "function_name" {
  description = "Function app name"
  type        = string
  default     = "{{functionName}}"
}

variable "runtime" {
  description = "Runtime (node/python/dotnet)"
  type        = string
  default     = "{{#if runtime}}{{runtime}}{{else}}node{{/if}}"
}

variable "os_type" {
  description = "OS type (Linux/Windows)"
  type        = string
  default     = "Linux"
}

{{#if databaseName}}
variable "database_name" {
  description = "Cosmos DB database name"
  type        = string
  default     = "{{databaseName}}"
}
{{/if}}
```

3. **outputs.tf.hbs** (40 lines):
```hcl
output "function_url" {
  description = "Function app URL"
  value       = "https://${azurerm_linux_function_app.{{snakeCase functionName}}.default_hostname}"
}

output "function_app_id" {
  description = "Function app resource ID"
  value       = azurerm_linux_function_app.{{snakeCase functionName}}.id
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.{{snakeCase projectName}}.name
}

{{#if databaseName}}
output "cosmos_endpoint" {
  description = "Cosmos DB endpoint"
  value       = azurerm_cosmosdb_account.{{snakeCase databaseName}}.endpoint
}

output "cosmos_database_name" {
  description = "Cosmos DB database name"
  value       = azurerm_cosmosdb_sql_database.{{snakeCase databaseName}}_db.name
}
{{/if}}
```

4. **provider.tf.hbs** (15 lines):
```hcl
provider "azurerm" {
  features {}
}
```

5. **iam.tf.hbs** (60 lines):
```hcl
# Managed identity for Function App
resource "azurerm_user_assigned_identity" "function_identity" {
  name                = "{{functionName}}-identity-{{environment}}"
  resource_group_name = azurerm_resource_group.{{snakeCase projectName}}.name
  location            = azurerm_resource_group.{{snakeCase projectName}}.location
}

# Assign identity to Function App
resource "azurerm_linux_function_app" "{{snakeCase functionName}}" {
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.function_identity.id]
  }
}

{{#if databaseName}}
# Grant Cosmos DB access to Function App
resource "azurerm_cosmosdb_sql_role_assignment" "function_cosmos_access" {
  resource_group_name = azurerm_cosmosdb_account.{{snakeCase databaseName}}.resource_group_name
  account_name        = azurerm_cosmosdb_account.{{snakeCase databaseName}}.name
  role_definition_id  = "${azurerm_cosmosdb_account.{{snakeCase databaseName}}.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_user_assigned_identity.function_identity.principal_id
  scope               = azurerm_cosmosdb_account.{{snakeCase databaseName}}.id
}
{{/if}}
```

6. **README.md.hbs** (150 lines):
```markdown
# {{projectName}} - Azure Functions Infrastructure

Generated by SpecWeave Serverless Intelligence

## Overview

This Terraform configuration deploys:
- **Azure Functions**: Serverless compute
- **Cosmos DB**: NoSQL database (if enabled)
- **Managed Identity**: Secure access without credentials

## Prerequisites

1. **Azure CLI**:
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   az login
   ```

2. **Terraform** (>= 1.0):
   ```bash
   wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
   unzip terraform_1.5.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

## Deployment

### 1. Initialize Terraform
```bash
terraform init
```

### 2. Review Plan
```bash
terraform plan -var-file=environments/{{environment}}.tfvars
```

### 3. Deploy
```bash
terraform apply -var-file=environments/{{environment}}.tfvars
```

### 4. Get Outputs
```bash
terraform output function_url
```

## Configuration

### Environment Variables
- Development: `environments/dev.tfvars`
- Staging: `environments/staging.tfvars`
- Production: `environments/prod.tfvars`

### Customization
- Edit `variables.tf` for configuration options
- Modify `main.tf` for infrastructure changes

## Costs

### Free Tier ({{environment}} environment)
- **Execution**: 1 million requests/month free
- **Compute**: 400,000 GB-seconds/month free
- **Cosmos DB**: $0.25/hour (~$180/month)

### Optimization
{{#if (eq environment "dev")}}
- Development uses Y1 (Consumption) plan: pay-per-execution
- Cosmos DB uses minimum throughput (400 RU/s)
{{else if (eq environment "prod")}}
- Production uses P1v2 plan: $96/month base cost
- Cosmos DB uses 1000 RU/s: $50/month
{{/if}}

## Security

- ✅ Managed Identity (no hardcoded credentials)
- ✅ HTTPS-only function endpoints
- ⚠️  Cosmos DB keys in app settings (consider Key Vault)
- ⚠️  No VNet integration (add for production)

## Next Steps

1. Deploy function code: `func azure functionapp publish {{functionName}}-{{environment}}`
2. Monitor: Azure Portal → Function App → Monitoring
3. Logs: Azure Portal → Function App → Log stream
4. Scale: Adjust `sku_name` in main.tf

## Cleanup

```bash
terraform destroy -var-file=environments/{{environment}}.tfvars
```

**Cost Impact**: Stops all charges
```

7. **defaults.json** (30 lines):
```json
{
  "projectName": "my-azure-function",
  "environment": "dev",
  "location": "East US",
  "functionName": "my-function",
  "runtime": "node",
  "osType": "Linux",
  "databaseName": "my-cosmos-db"
}
```

**Testing**:
```bash
# Unit tests
npm test -- azure-functions-template.test.ts

# Integration tests
npm test -- azure-functions-template-generation.test.ts

# E2E test (requires Azure test account)
npm run test:e2e -- azure-functions-deployment.spec.ts
```

**Acceptance Criteria**:
- [ ] All 6 template files created
- [ ] defaults.json with sensible defaults
- [ ] Templates render correctly
- [ ] Generated Terraform passes `terraform validate`
- [ ] E2E test deploys to Azure test account
- [ ] Function endpoint responds successfully
- [ ] Cosmos DB accessible from function
- [ ] Managed identity works (no hardcoded keys)

---

### Task 3-5: GCP Cloud Functions, Firebase, Supabase Templates (6 hours)

Follow same pattern as Azure Functions. Each platform: 2 hours.

**GCP Cloud Functions** (2h):
- main.tf.hbs: Cloud Function Gen2 + Firestore
- provider.tf.hbs: Google provider
- iam.tf.hbs: Service account with least privilege

**Firebase** (2h):
- main.tf.hbs: Firebase project + Hosting + Functions + Firestore
- Note: Firebase has specific configuration (firebase.json, functions/index.js)

**Supabase** (2h):
- main.tf.hbs: PostgreSQL + Auth + Storage + Edge Functions
- provider.tf.hbs: Supabase provider (if available) or manual setup

---

### Task 6: Cost Estimator Module (3 hours)

**File**: `/home/user/specweave/src/core/serverless/cost-estimator.ts`

**Implementation** (see full spec in tasks.md T-017):
```typescript
import type { ServerlessPlatform, PlatformPricing } from './types.js';

export interface CostEstimationInput {
  requestsPerMonth: number;
  avgExecutionTimeMs: number;
  memoryMb: number;
  dataTransferGb: number;
}

export interface CostBreakdown {
  compute: number;
  requests: number;
  dataTransfer: number;
  total: number;
  freeTierDeduction: number;
  billableAmount: number;
}

export interface CostEstimationResult {
  platform: ServerlessPlatform;
  input: CostEstimationInput;
  breakdown: CostBreakdown;
  withinFreeTier: boolean;
  monthlyEstimate: number;
}

export function estimateCost(
  platform: ServerlessPlatform,
  input: CostEstimationInput
): CostEstimationResult {
  // Calculate GB-seconds
  const gbSeconds = (input.requestsPerMonth * input.avgExecutionTimeMs * input.memoryMb) / (1000 * 1024);

  // Calculate costs
  const computeCost = gbSeconds * platform.pricing.payAsYouGo.computePerGbSecond;
  const requestsCost = (input.requestsPerMonth / 1000000) * platform.pricing.payAsYouGo.requestsPer1M;
  const dataTransferCost = input.dataTransferGb * platform.pricing.payAsYouGo.dataTransferPerGb;

  const totalBeforeFreeTier = computeCost + requestsCost + dataTransferCost;

  // Apply free tier
  const freeTierComputeSavings = Math.min(
    platform.pricing.freeTier.computeGbSeconds * platform.pricing.payAsYouGo.computePerGbSecond,
    computeCost
  );
  const freeTierRequestsSavings = Math.min(
    (platform.pricing.freeTier.requests / 1000000) * platform.pricing.payAsYouGo.requestsPer1M,
    requestsCost
  );
  const freeTierDataSavings = Math.min(
    platform.pricing.freeTier.dataTransferGb * platform.pricing.payAsYouGo.dataTransferPerGb,
    dataTransferCost
  );

  const totalFreeTierDeduction = freeTierComputeSavings + freeTierRequestsSavings + freeTierDataSavings;
  const billableAmount = Math.max(0, totalBeforeFreeTier - totalFreeTierDeduction);

  return {
    platform,
    input,
    breakdown: {
      compute: computeCost,
      requests: requestsCost,
      dataTransfer: dataTransferCost,
      total: totalBeforeFreeTier,
      freeTierDeduction: totalFreeTierDeduction,
      billableAmount
    },
    withinFreeTier: billableAmount === 0,
    monthlyEstimate: billableAmount
  };
}
```

**Testing**: 8 unit tests, 2 integration tests (see tasks.md)

---

### Task 7: Integration Tests (4 hours)

Create comprehensive integration tests for all workflows.

**Files to Create**:
- `tests/integration/serverless/context-detection-flow.test.ts`
- `tests/integration/serverless/suitability-analysis-flow.test.ts`
- `tests/integration/serverless/platform-selection-flow.test.ts`
- `tests/integration/serverless/recommender-skill-integration.test.ts`
- `tests/integration/serverless/architect-serverless-integration.test.ts`
- `tests/integration/iac/infrastructure-iac-generation-flow.test.ts`
- `tests/integration/iac/aws-lambda-template-generation.test.ts`
- `tests/integration/serverless/cost-estimation-flow.test.ts`

**Total Tests**: ~50 integration tests

---

## Nice to Have (21 hours)

Complete these after Critical Path for polish and 100% completion.

### Cost Optimizer (2h)
### Cost Comparison (1h)
### Learning Path Recommender (3h)
### Security Best Practices (3h)
### Compliance Guidance (2h)
### E2E Test Suite (2h)
### Platform Validation GitHub Action (1h)
### Data Freshness Indicators (1h)

---

## Development Workflow

### 1. Start New Task
```bash
# Create feature branch
git checkout -b feature/infrastructure-agent

# Mark task as in_progress
# (use TodoWrite tool)
```

### 2. Implement Task
```bash
# Follow TDD workflow:
# 1. Write tests (should fail)
# 2. Implement feature
# 3. Run tests (should pass)
# 4. Verify coverage

npm test -- infrastructure-agent
npm run coverage -- --include=src/core/
```

### 3. Validate Task
```bash
# Build TypeScript
npm run build

# Run all tests
npm test

# Check coverage
npm run coverage

# Verify >= 90% coverage
```

### 4. Commit Task
```bash
git add .
git commit -m "feat(serverless): add infrastructure agent for IaC generation

- Create infrastructure agent with template loading workflow
- Integrate with TerraformTemplateEngine
- Generate .infrastructure/{platform}/ directory
- Create environment tfvars (dev/staging/prod)
- Add deployment instructions to README
- Tests: 6 unit, 3 integration, 1 E2E (all passing)
- Coverage: 95% for infrastructure agent
- Resolves: T-015 (Infrastructure Agent IaC Generation)
"

git push -u origin feature/infrastructure-agent
```

### 5. Mark Task Complete
```bash
# Update TodoWrite tool to mark task completed
# Move to next task
```

---

## Quality Checklist

Before marking task complete, verify:

- [ ] All files created/modified as specified
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Coverage >= 90% for new code (`npm run coverage`)
- [ ] Documentation updated (if applicable)
- [ ] Examples work as described
- [ ] Acceptance criteria from tasks.md satisfied
- [ ] Git commit message follows conventional commits
- [ ] Changes pushed to feature branch

---

## Next Session Preparation

Before ending work session:

1. **Update TodoWrite tool**:
   - Mark completed tasks
   - Update in_progress task
   - Document blockers

2. **Create session summary**:
   - What was completed
   - What's in progress
   - What's blocked
   - Next steps

3. **Commit all work**:
   - Even incomplete work (WIP commits okay)
   - Push to remote branch

4. **Update increment status**:
   - Update spec.md status if needed
   - Update reports/ directory with progress

---

## Success Metrics

### Critical Path Complete (60-70% overall)
- ✅ Infrastructure Agent functional
- ✅ 5/5 platforms supported (AWS, Azure, GCP, Firebase, Supabase)
- ✅ Cost estimation works
- ✅ Integration tests pass
- ✅ User can: Ask recommendation → Get IaC → Deploy

### Full Complete (100%)
- ✅ All 24 tasks done
- ✅ 90%+ test coverage
- ✅ E2E tests deploy to cloud accounts
- ✅ Documentation complete
- ✅ Security best practices applied
- ✅ Compliance guidance added

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Next Review**: After Infrastructure Agent completion
