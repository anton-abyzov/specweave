## Deployment Target Intelligence

**CRITICAL**: Agents MUST ask about deployment target before generating infrastructure code. Never assume local-only or cloud deployment without confirmation.

### Core Principle

**Progressive Disclosure**: Ask deployment questions only when relevant, not on day 1 of prototyping.

### When to Ask About Deployment

**DO ask** ✅:
- `specweave init` if user mentions "production", "hosting", "deploy", "cloud"
- `/create-increment` when feature requires infrastructure (API, DB, storage)
- User explicitly requests: "deploy", "production setup", "infrastructure"
- DevOps agent is invoked

**DON'T ask** ❌:
- Day 1 of prototyping (unless user mentions deployment)
- During feature planning (unless infrastructure needed)
- While writing tests or documentation
- When implementing frontend-only features

### Detection Flow

```
User request
    ↓
Contains deployment keywords? ("deploy", "production", "hosting", "cloud")
    ↓ YES
Settings auto-detected
    ↓
deployment.target defined?
    ↓ NO
Ask deployment questions
    ↓
Save to config.yaml
    ↓
Generate appropriate infrastructure code
    ↓
Request secrets only when user ready to deploy
```

### Deployment Questions (Progressive)

**Phase 1: Initial Detection**

When user mentions deployment-related terms, PM agent asks:

```
📋 Deployment Planning

Question 1: "What's your deployment target?"

Options:
A) Local development only (Docker Compose, no cloud)
   - Best for: Prototypes, learning, local testing
   - Cost: $0/month

B) Cloud deployment (production hosting)
   - Best for: Real users, public access, scaling
   - Cost: $5-50+/month depending on provider

C) Not sure yet (decide later)
   - Will ask again when you need to deploy
```

**Phase 2: Provider Selection** (if user chose B)

```
Question 2: "Which cloud provider?"

Options:
A) Show cost comparison first (recommended)

B) Hetzner Cloud
   - Cheapest ($5-20/month)
   - EU-focused, great performance
   - Best for: European users, budget-conscious

C) Railway
   - Easiest ($5-20/month)
   - Auto-scaling, simple UI
   - Best for: Quick deployment, auto-scale

D) Vercel
   - Best for Next.js ($20/month)
   - Serverless, global CDN
   - Best for: Frontend apps, Next.js

E) AWS/Azure/GCP
   - Enterprise ($50+/month)
   - Most features, complex
   - Best for: Large teams, enterprise requirements
```

**Phase 3: Cost Optimization** (if user chose A)

Activate `cost-optimizer` skill:

```
💰 Cost Comparison for Your Stack

Detected: Python FastAPI + PostgreSQL
Expected: 1,000 users, 10 req/sec

| Provider | Monthly Cost | Setup |
|----------|--------------|-------|
| Hetzner  | $10 (CX21 + managed DB) | Medium |
| Railway  | $20 (auto-scaling) | Easy |
| AWS      | $65 (ECS + RDS) | Complex |
| Vercel   | N/A (not suitable for Python) | - |

Recommendation: Hetzner Cloud (best value for money)
```

### Configuration Storage

**After user answers, save to `.specweave/config.yaml`**:

```yaml
deployment:
  target: hetzner              # or: local, aws, azure, gcp, railway, vercel, digitalocean
  environment: production
  staging_enabled: true
  regions:
    - eu-central              # Hetzner: fsn1, nbg1, hel1 | AWS: us-east-1, eu-west-1

infrastructure:
  compute:
    type: vm                  # or: container, serverless, kubernetes
    size: cx21                # Provider-specific (Hetzner: cx11/cx21/cx31, AWS: t3.micro/small/medium)
  database:
    type: managed             # or: self-hosted
    engine: postgresql
    version: "15"

cost_budget:
  monthly_max: 20             # USD
  alerts_enabled: true
```

### Adaptive Architecture Generation

**Architect agent reads `deployment.target` and generates appropriate infrastructure**:

#### Local Deployment (`target: local`)

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Hetzner Deployment (`target: hetzner`)

```hcl
# terraform/hetzner/main.tf
terraform {
  required_providers {
    hcloud = {
      source = "hetznercloud/hcloud"
    }
  }
}

provider "hcloud" {
  token = var.hetzner_token  # From environment variable
}

resource "hcloud_server" "api" {
  name        = "api-production"
  server_type = "cx21"        # From config.yaml
  image       = "ubuntu-22.04"
  location    = "fsn1"        # From config.yaml regions

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    app_port = 8000
  })
}

resource "hcloud_managed_database" "main" {
  name    = "production-db"
  engine  = "postgresql"      # From config.yaml
  version = "15"              # From config.yaml
  type    = "db-cx21"
}
```

#### AWS Deployment (`target: aws`)

```hcl
# terraform/aws/main.tf
provider "aws" {
  region = var.aws_region  # From config.yaml
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
}

resource "aws_rds_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"
}
```

### Agent Responsibilities

| Agent | Responsibility |
|-------|----------------|
| **PM** | Ask deployment questions during planning, update config.yaml |
| **Architect** | Read config.yaml, design infrastructure for specified target |
| **DevOps** | Generate IaC (Terraform/Pulumi) for specified provider |
| **Cost Optimizer** | Show cost comparison when user unsure about provider |
| **Security** | Validate secrets management for chosen provider |

### Integration with Secrets Management

**Secrets are requested ONLY when**:
2. ✅ Infrastructure code is generated
3. ✅ User explicitly says "deploy now" or "apply infrastructure"

**Example Flow**:

```
User: "Deploy to Hetzner"

DevOps agent:
1. ✅ Checks config.yaml → deployment.target = hetzner
2. ✅ Generates terraform/hetzner/main.tf
3. ⚠️  STOPS before terraform apply
4. ℹ️  Prompts: "I've generated Terraform code. Ready to deploy?"

User: "Yes, deploy"

DevOps agent:
5. 🔐 Requests HETZNER_API_TOKEN (see "Secrets Management" section)
6. ✅ Runs: terraform init && terraform apply
7. ✅ Outputs: Server IP, database endpoint
```

### Provider-Specific Notes

| Provider | Region Format | Size Format | Notes |
|----------|---------------|-------------|-------|
| **Hetzner** | `fsn1`, `nbg1`, `hel1` | `cx11`, `cx21`, `cx31` | EU-focused, cheapest |
| **AWS** | `us-east-1`, `eu-west-1` | `t3.micro`, `t3.small` | Most features, complex |
| **Railway** | N/A (auto) | `small`, `medium`, `large` | Easiest, auto-scaling |
| **Vercel** | N/A (global CDN) | N/A (serverless) | Best for Next.js, frontend |
| **Azure** | `eastus`, `westeurope` | `Standard_B1s`, `Standard_B2s` | Enterprise, Microsoft ecosystem |
| **GCP** | `us-central1`, `europe-west1` | `e2-micro`, `e2-small` | Enterprise, Google ecosystem |
| **DigitalOcean** | `nyc1`, `sfo2`, `lon1` | `s-1vcpu-1gb`, `s-2vcpu-2gb` | Developer-friendly |

### Cost Budget Enforcement

When `cost_budget.monthly_max` is set, DevOps agent:
1. ✅ Estimates infrastructure cost before provisioning
2. ⚠️ Warns if estimate exceeds budget
3. ❌ Blocks if estimate >150% of budget (requires user override)

**Example**:

```
⚠️  Budget Alert

Estimated monthly cost: $35
Your budget: $20/month

This deployment will exceed your budget by $15/month (75% over).

Options:
A) Reduce infrastructure size (downgrade from cx21 to cx11)
B) Increase budget to $35/month
C) Cancel deployment

[User selects A]

✅ Updated config to cx11 (estimated $12/month)
```

### Related Documentation

- [.specweave/config.yaml Schema](#installation--requirements) - Complete config reference
- [Secrets Management](#secrets-management) - How secrets are handled after deployment target is set
- [src/agents/devops/AGENT.md](src/agents/devops/AGENT.md) - DevOps agent implementation
- [src/skills/cost-optimizer/SKILL.md](src/skills/cost-optimizer/SKILL.md) - Cost comparison logic
- [src/skills/hetzner-provisioner/SKILL.md](src/skills/hetzner-provisioner/SKILL.md) - Hetzner-specific deployment

---

### Secrets Management

**CRITICAL**: SpecWeave agents are smart about requesting secrets (API tokens, credentials) only when needed for blocking operations.

**Prerequisites**: Secrets are ONLY requested AFTER:
2. ✅ Infrastructure code is generated
3. ✅ User explicitly says "deploy now" or "apply infrastructure"

#### When Agents Request Secrets

**Blocking operations that require secrets**:
- Infrastructure provisioning (after deployment target configured - see above)
- External API integrations (JIRA, GitHub, ADO, Figma)
- Database connections (production databases)
- CI/CD pipeline configuration
- Cloud storage setup

**Non-blocking operations** (no secrets needed):
- Documentation creation
- Code generation (local files)
- Test writing
- Architecture planning

#### Secrets Workflow

**Step 1: Detection**
```bash
# Agent checks if secret exists
if [ -z "$HETZNER_API_TOKEN" ]; then
  # Token NOT found - STOP and prompt user
fi
```

**Step 2: User-Friendly Prompt**
```
🔐 **Secrets Required for Deployment**

I need your Hetzner API token to provision infrastructure.

**How to get it**:
1. Go to: https://console.hetzner.cloud/
2. Navigate to: Security → API Tokens
3. Click "Generate API Token"
4. Give it Read & Write permissions
5. Copy the token immediately (you can't see it again!)

**Where I'll save it**:
- File: .env (gitignored, secure)
- Format: HETZNER_API_TOKEN=your-token-here

**Security**:
✅ .env is in .gitignore (never committed to git)
✅ Token is 64 characters, alphanumeric
✅ Stored locally only (not in source code)

Please paste your Hetzner API token:
```

**Step 3: Validation**
```bash
# Validate token format
if [[ ! "$HETZNER_API_TOKEN" =~ ^[a-zA-Z0-9]{64}$ ]]; then
  echo "⚠️  Warning: Token format unexpected"
  echo "Expected: 64 alphanumeric characters"
  echo "Got: ${#HETZNER_API_TOKEN} characters"
fi
```

**Step 4: Secure Storage**
```bash
# Save to .env (gitignored)
echo "HETZNER_API_TOKEN=$HETZNER_API_TOKEN" >> .env

# Ensure .env is gitignored
if ! grep -q "^\\.env$" .gitignore; then
  echo ".env" >> .gitignore
fi

# Create .env.example for team
cat > .env.example << 'EOF'
# Hetzner Cloud API Token
# Get from: https://console.hetzner.cloud/ → Security → API Tokens
HETZNER_API_TOKEN=your-hetzner-token-here
EOF
```

**Step 5: Use in Code**
```hcl
# terraform/variables.tf
variable "hetzner_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

# terraform/provider.tf
provider "hcloud" {
  token = var.hetzner_token
}

# Run Terraform with environment variable
# export TF_VAR_hetzner_token=$HETZNER_API_TOKEN
# terraform apply
```

#### Platform-Specific Secrets

| Platform | Secret Name | Format | Where to Get |
|----------|-------------|--------|--------------|
| **Hetzner** | `HETZNER_API_TOKEN` | 64 alphanumeric | https://console.hetzner.cloud/ → Security → API Tokens |
| **AWS** | `AWS_ACCESS_KEY_ID`<br>`AWS_SECRET_ACCESS_KEY` | 20 chars<br>40 chars | IAM Console → Users → Security Credentials |
| **Railway** | `RAILWAY_TOKEN` | 32+ alphanumeric | https://railway.app/account/tokens |
| **Vercel** | `VERCEL_TOKEN` | Variable length | https://vercel.com/account/tokens |
| **Azure** | `AZURE_CLIENT_ID`<br>`AZURE_CLIENT_SECRET`<br>`AZURE_TENANT_ID` | UUIDs<br>Variable<br>UUID | Azure Portal → App Registrations |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` | JSON file path | GCP Console → IAM → Service Accounts |
| **DigitalOcean** | `DIGITALOCEAN_TOKEN` | 64 alphanumeric | https://cloud.digitalocean.com/account/api/tokens |
| **GitHub** | `GITHUB_TOKEN` | `ghp_*` (40 chars) | https://github.com/settings/tokens |
| **JIRA** | `JIRA_API_TOKEN`<br>`JIRA_EMAIL` | Variable<br>Email | https://id.atlassian.com/manage-profile/security/api-tokens |
| **ADO** | `AZURE_DEVOPS_PAT` | 52 chars (base64) | Azure DevOps → User Settings → Personal Access Tokens |

#### Security Best Practices

**DO** ✅:
- Store secrets in `.env` file (gitignored)
- Create `.env.example` with placeholders for team
- Validate token format before using
- Use environment variables in code (not hardcoded)
- Rotate tokens regularly (every 90 days)
- Use production secrets managers (Doppler, AWS Secrets Manager, 1Password, Vault)

**DON'T** ❌:
- Commit secrets to git (EVER!)
- Hardcode tokens in source code
- Share tokens via email/Slack
- Use production tokens in development
- Log secrets to console/files
- Store secrets in CI/CD config files (use encrypted secrets)

#### Production Secrets Management

For production deployments, use dedicated secrets managers:

**Options**:
1. **Doppler** (https://doppler.com) - Multi-environment, team access control
2. **AWS Secrets Manager** - AWS-native, automatic rotation
3. **1Password** - Developer-friendly, CLI integration
4. **HashiCorp Vault** - Enterprise-grade, self-hosted

**Why not .env in production?**
- ❌ No access control (anyone with file access can read)
- ❌ No audit trail (who accessed what, when?)
- ❌ No automatic rotation
- ❌ No encryption at rest
- ✅ Use secrets managers for production

#### Agents with Secrets Management

**Agents that handle secrets**:
- `devops` - Infrastructure provisioning, deployment
- `security` - Secrets scanning, vulnerability assessment
- Integration agents - External API connections (JIRA, GitHub, ADO)

**Skills that handle secrets**:
- `hetzner-provisioner` - Hetzner Cloud API token
- `github-sync` - GitHub personal access token
- `jira-sync` - JIRA API token + email
- `ado-sync` - Azure DevOps personal access token

**Related Documentation**:
- [src/agents/devops/AGENT.md](src/agents/devops/AGENT.md) - Complete secrets management workflow
- [src/skills/hetzner-provisioner/SKILL.md](src/skills/hetzner-provisioner/SKILL.md) - Hetzner token handling

---

