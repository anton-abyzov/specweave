# ADR-0040: IaC Template Engine (Terraform Generation)

**Date**: 2025-11-16
**Status**: Accepted

## Context

Infrastructure Agent needs to generate Terraform configurations for 5 serverless platforms (AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase). Generated templates must:

1. **Deploy Successfully**: 95%+ of generated configs should deploy without manual edits
2. **Be Customizable**: Users can modify variables (function name, region, memory)
3. **Follow Best Practices**: Include IAM roles, tags, environment-specific configs
4. **Support Multi-Environment**: Dev, staging, prod configurations
5. **Be Fast to Generate**: < 2 seconds for complete Terraform setup

**Challenge**: Different platforms have different IaC patterns:
- AWS Lambda: 10+ resources (Lambda, API Gateway, DynamoDB, IAM, CloudWatch)
- Firebase: Requires Firebase CLI + Terraform (hybrid approach)
- Supabase: Uses Terraform with Supabase provider

**User Workflow**:
```
User: "Generate Terraform for AWS Lambda"
  ↓
Infrastructure Agent: Analyzes architecture (from Architect Agent)
  ↓
Template Engine: Generates main.tf, variables.tf, outputs.tf, README.md
  ↓
User: Deploys with "terraform apply"
```

## Decision

Use **Handlebars template engine** with static template files for each platform.

**Template Structure**:
```
plugins/specweave/templates/iac/
├── aws-lambda/
│   ├── templates/
│   │   ├── main.tf.hbs           # Core infrastructure (Handlebars template)
│   │   ├── variables.tf.hbs      # Input variables
│   │   ├── outputs.tf.hbs        # Output values
│   │   ├── providers.tf.hbs      # Provider config
│   │   ├── iam.tf.hbs            # IAM roles and policies
│   │   └── README.md.hbs         # Deployment instructions
│   ├── defaults.json             # Default values per context (pet/startup/enterprise)
│   └── schema.json               # Template variable schema
├── azure-functions/
│   ├── templates/
│   └── defaults.json
├── gcp-cloud-functions/
├── firebase/
└── supabase/
```

**Template Example** (`aws-lambda/templates/main.tf.hbs`):
```hcl
# Lambda Function
resource "aws_lambda_function" "main" {
  filename         = var.lambda_zip_path
  function_name    = var.function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = var.handler
  runtime          = "{{runtime}}"  # Handlebars variable
  memory_size      = {{memorySize}} # Handlebars variable
  timeout          = {{timeout}}    # Handlebars variable
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.main.name
      ENVIRONMENT = var.environment
      {{#each envVars}}
      {{@key}} = "{{this}}"
      {{/each}}
    }
  }

  {{#if enableVPC}}
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }
  {{/if}}

  tags = var.tags
}

# API Gateway (HTTP API - cheaper than REST API)
resource "aws_apigatewayv2_api" "main" {
  name          = "{{functionName}}-api"
  protocol_type = "HTTP"

  {{#if enableCORS}}
  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
  {{/if}}
}

# DynamoDB Table
{{#if enableDynamoDB}}
resource "aws_dynamodb_table" "main" {
  name           = var.table_name
  billing_mode   = "{{dynamoDBBillingMode}}"  # PAY_PER_REQUEST for free tier
  hash_key       = "{{dynamoDBHashKey}}"

  attribute {
    name = "{{dynamoDBHashKey}}"
    type = "S"
  }

  {{#if enableTTL}}
  ttl {
    enabled        = true
    attribute_name = "ttl"
  }
  {{/if}}

  tags = var.tags
}
{{/if}}
```

**Defaults by Context** (`aws-lambda/defaults.json`):
```json
{
  "pet-project": {
    "runtime": "nodejs20.x",
    "memorySize": 128,
    "timeout": 30,
    "dynamoDBBillingMode": "PAY_PER_REQUEST",
    "enableVPC": false,
    "enableCORS": true,
    "enableDynamoDB": true,
    "enableTTL": false,
    "provisionedConcurrency": 0
  },
  "startup": {
    "runtime": "nodejs20.x",
    "memorySize": 256,
    "timeout": 60,
    "dynamoDBBillingMode": "PAY_PER_REQUEST",
    "enableVPC": false,
    "enableCORS": true,
    "enableDynamoDB": true,
    "enableTTL": true,
    "provisionedConcurrency": 1
  },
  "enterprise": {
    "runtime": "nodejs20.x",
    "memorySize": 512,
    "timeout": 120,
    "dynamoDBBillingMode": "PROVISIONED",
    "enableVPC": true,
    "enableCORS": true,
    "enableDynamoDB": true,
    "enableTTL": true,
    "provisionedConcurrency": 5,
    "enableXRayTracing": true,
    "enableCloudWatchLogs": true
  }
}
```

**Generation Logic** (`src/core/iac/template-generator.ts`):
```typescript
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateContext {
  platform: 'aws-lambda' | 'azure-functions' | 'gcp-functions' | 'firebase' | 'supabase';
  projectContext: 'pet-project' | 'startup' | 'enterprise';
  customVariables?: Record<string, any>;
}

export class IaCTemplateGenerator {
  async generateTerraform(context: TemplateContext): Promise<GeneratedFiles> {
    // 1. Load defaults for platform + project context
    const defaultsPath = `plugins/specweave/templates/iac/${context.platform}/defaults.json`;
    const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
    const contextDefaults = defaults[context.projectContext];

    // 2. Merge defaults with custom variables
    const variables = { ...contextDefaults, ...context.customVariables };

    // 3. Load Handlebars templates
    const templatesDir = `plugins/specweave/templates/iac/${context.platform}/templates`;
    const templates = {
      'main.tf': fs.readFileSync(path.join(templatesDir, 'main.tf.hbs'), 'utf-8'),
      'variables.tf': fs.readFileSync(path.join(templatesDir, 'variables.tf.hbs'), 'utf-8'),
      'outputs.tf': fs.readFileSync(path.join(templatesDir, 'outputs.tf.hbs'), 'utf-8'),
      'providers.tf': fs.readFileSync(path.join(templatesDir, 'providers.tf.hbs'), 'utf-8'),
      'iam.tf': fs.readFileSync(path.join(templatesDir, 'iam.tf.hbs'), 'utf-8'),
      'README.md': fs.readFileSync(path.join(templatesDir, 'README.md.hbs'), 'utf-8')
    };

    // 4. Compile and render each template
    const compiled: GeneratedFiles = {};
    for (const [filename, template] of Object.entries(templates)) {
      const compiledTemplate = Handlebars.compile(template);
      compiled[filename] = compiledTemplate(variables);
    }

    // 5. Generate environment-specific tfvars
    compiled['environments/dev.tfvars'] = this.generateTfvars('dev', variables);
    compiled['environments/staging.tfvars'] = this.generateTfvars('staging', variables);
    compiled['environments/prod.tfvars'] = this.generateTfvars('prod', variables);

    return compiled;
  }

  private generateTfvars(env: string, variables: Record<string, any>): string {
    return `
region        = "${variables.region || 'us-east-1'}"
function_name = "my-app-${env}"
environment   = "${env}"
table_name    = "my-app-${env}-data"
memory_size   = ${variables.memorySize}
timeout       = ${variables.timeout}

tags = {
  Environment = "${env}"
  ManagedBy   = "terraform"
  GeneratedBy = "SpecWeave"
}
    `.trim();
  }
}
```

**Usage in Infrastructure Agent**:
```typescript
// Agent receives architecture from Architect Agent
const architecture = {
  platform: 'aws-lambda',
  projectContext: 'pet-project',
  features: ['api-gateway', 'dynamodb']
};

// Generate Terraform
const generator = new IaCTemplateGenerator();
const files = await generator.generateTerraform({
  platform: architecture.platform,
  projectContext: architecture.projectContext,
  customVariables: {
    functionName: 'weather-app',
    runtime: 'nodejs20.x',
    enableDynamoDB: true
  }
});

// Write to disk
for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(`infrastructure/${filename}`, content);
}

console.log('✅ Terraform configuration generated in infrastructure/');
```

## Alternatives Considered

### Alternative 1: Dynamic Code Generation (No Templates)
**Example**: Generate Terraform HCL programmatically in TypeScript

**Pros**: Maximum flexibility, no template files
**Cons**: Complex (HCL syntax is tricky), hard to maintain, error-prone

**Why rejected**: Templates are easier to read/edit. HCL generation requires deep HCL knowledge.

### Alternative 2: Use Terraform CDK (TypeScript → HCL)
**Example**: Write infrastructure in TypeScript, compile to HCL

**Pros**: Type-safe, familiar syntax for TypeScript developers
**Cons**: Adds huge dependency (Terraform CDK), users must learn CDK API, compilation step

**Why rejected**: Overhead. Users expect raw Terraform (industry standard), not CDK abstraction.

### Alternative 3: Use Pulumi Instead of Terraform
**Example**: Generate Pulumi code (TypeScript/Python) instead of Terraform

**Pros**: Pulumi is gaining popularity, native TypeScript support
**Cons**: Smaller community than Terraform, users may not know Pulumi, vendor lock-in risk

**Why rejected**: Terraform is industry standard. Pulumi is great but less universal.

### Alternative 4: Copy Static Templates (No Variable Substitution)
**Example**: Ship 15 pre-made templates per platform (128MB, 256MB, 512MB, etc.)

**Pros**: Simplest implementation
**Cons**: Template explosion (5 platforms × 3 contexts × 5 configs = 75 templates), hard to maintain

**Why rejected**: Not scalable. Variable substitution is cleaner.

### Alternative 5: Use EJS Instead of Handlebars
**Pros**: EJS is simpler (just `<%= var %>`)
**Cons**: Less powerful (no built-in helpers), less readable for HCL

**Why rejected**: Handlebars has better ecosystem (helpers, partials) and cleaner syntax.

## Consequences

### Positive
- **Fast Generation**: Template compilation is instant (< 100ms)
- **Easy to Customize**: Users can edit templates directly (just Handlebars + HCL)
- **Maintainable**: Templates are readable, editable, version-controlled
- **Testable**: Unit tests render templates with different contexts
- **Extensible**: Add new platform = add new template directory

### Negative
- **Template Maintenance**: Must keep templates in sync with provider changes
- **Handlebars Learning Curve**: Contributors must learn Handlebars syntax
- **No Type Safety**: Handlebars variables are untyped (runtime errors possible)

### Neutral
- **Template Size**: Each platform has ~6 templates (~500 lines total per platform)
- **Dependency**: Adds Handlebars library (~50KB, widely used)

## Risks and Mitigations

### Risk 1: Generated Terraform Doesn't Deploy (Syntax Errors)
**Impact**: User frustration, manual fixes required
**Probability**: Medium (provider APIs change)
**Mitigation**:
- E2E tests deploy to test AWS/Azure/GCP accounts (CI pipeline)
- Terraform validation (`terraform validate`) in tests
- Version lock templates to provider versions (e.g., `aws ~> 5.0`)

### Risk 2: Templates Become Stale (Provider Updates)
**Impact**: Generated configs use outdated practices
**Probability**: High (providers evolve rapidly)
**Mitigation**:
- Weekly review of provider changelogs (AWS, Azure, GCP)
- GitHub Action: Deploy templates to test accounts weekly
- Community contributions (PR template for template updates)

### Risk 3: Variable Conflicts (Handlebars vs Terraform)
**Example**: Handlebars `{{var}}` vs Terraform `${var.name}`

**Impact**: Template rendering fails or produces invalid HCL
**Probability**: Low (but possible)
**Mitigation**:
- Use Handlebars triple-stash `{{{var}}}` for raw output
- Escape Terraform variables: `$\{var.name\}` in templates

### Risk 4: Users Modify Templates Incorrectly
**Impact**: Broken deployments, support burden
**Probability**: Medium (users unfamiliar with HCL)
**Mitigation**:
- Provide clear README with examples
- Include validation script: `npm run validate-terraform`
- Encourage users to use variables (not template edits)

## Implementation Notes

**Handlebars Helpers** (Custom Logic):
```typescript
Handlebars.registerHelper('region', function(platform: string) {
  const defaults = {
    'aws-lambda': 'us-east-1',
    'azure-functions': 'eastus',
    'gcp-functions': 'us-central1'
  };
  return defaults[platform] || 'us-east-1';
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

// Usage in template:
// {{#ifEquals platform "aws-lambda"}}
//   AWS-specific config
// {{/ifEquals}}
```

**Template Validation** (Pre-Commit Hook):
```typescript
import { execSync } from 'child_process';

function validateTemplate(templatePath: string) {
  // 1. Render template with test data
  const rendered = renderTemplate(templatePath, testData);

  // 2. Write to temp file
  fs.writeFileSync('/tmp/test.tf', rendered);

  // 3. Run terraform validate
  try {
    execSync('terraform validate /tmp', { stdio: 'inherit' });
    console.log(`✅ ${templatePath} valid`);
  } catch (error) {
    console.error(`❌ ${templatePath} invalid`);
    throw error;
  }
}
```

**File Structure** (Generated Output):
```
infrastructure/
├── main.tf                # Core resources
├── variables.tf           # Input variables
├── outputs.tf             # Output values
├── providers.tf           # Provider config
├── iam.tf                 # IAM roles/policies
├── environments/
│   ├── dev.tfvars        # Dev config
│   ├── staging.tfvars    # Staging config
│   └── prod.tfvars       # Prod config
└── README.md             # Deployment guide
```

## Related Decisions
- ADR-0038: Serverless Platform Knowledge Base (provides defaults for templates)
- ADR-0039: Context Detection Strategy (determines which defaults to use)
- ADR-0042: Agent Enhancement Pattern (Infrastructure Agent uses generator)

## References
- Handlebars Documentation: https://handlebarsjs.com/
- Terraform HCL Syntax: https://www.terraform.io/language/syntax/configuration
- AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Azure Provider: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- GCP Provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
