# Environment Strategy for User Projects

**CRITICAL**: SpecWeave supports flexible multi-environment configurations for USER PROJECTS. Users can start with 1 environment (production) and progressively add more as their project grows.

## Core Principle

**Progressive Complexity**: Start simple (1 env), add environments only when needed.

**SpecWeave itself has no environments** - it's just the framework. **USER PROJECTS** built with SpecWeave may need 1-6+ environments depending on their maturity and requirements.

---

## When to Ask About Environments

**DO ask** ✅:
- `specweave init` if user mentions "staging", "production", "environments", "pipeline"
- User explicitly requests: "set up staging", "add QA environment", "deployment pipeline"
- DevOps agent is invoked for infrastructure setup
- Feature requires environment-specific configuration (feature flags, A/B testing, etc.)

**DON'T ask** ❌:
- Day 1 of MVP prototyping (unless user mentions it)
- During pure feature planning (no infrastructure implications)
- While writing tests or documentation only
- For local-only development projects

---

## Environment Strategies

### 1. Minimal Strategy (1 environment)

**Best for**:
- Quick MVPs
- Prototypes
- Learning projects
- Solo developers shipping fast

**Configuration**:
```yaml
# .specweave/config.yaml
project:
  name: "my-mvp"
  type: "nodejs"

environments:
  strategy: "minimal"
  definitions:
    - name: "production"
      purpose: "Live application"
      deployment:
        type: "cloud"
        provider: "vercel"  # or railway, hetzner
```

**Characteristics**:
- Deploy directly to production
- No staging/testing environments
- Fast iteration, higher risk
- Can add environments later

---

### 2. Standard Strategy (3 environments)

**Best for**:
- Small teams (2-5 developers)
- Production SaaS
- Professional projects
- Most user projects

**Configuration**:
```yaml
# .specweave/config.yaml
environments:
  strategy: "standard"
  definitions:
    - name: "development"
      purpose: "Local development and testing"
      deployment:
        type: "local"
        target: "docker-compose"
      config:
        database: "postgres-local"
        cache: "redis-local"

    - name: "staging"
      purpose: "Pre-production validation"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "eu-central"
      promotion_from: "development"
      config:
        database: "postgres-staging"
        cache: "redis-staging"

    - name: "production"
      purpose: "Live user traffic"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "eu-central"
      promotion_from: "staging"
      requires_approval: true
      config:
        database: "postgres-prod"
        cache: "redis-prod"
        cdn: "cloudflare"
```

**Characteristics**:
- Development → Staging → Production pipeline
- Test changes in staging before prod
- Manual promotion to production
- Balanced complexity vs safety

**Deployment Pipeline**:
```yaml
deployment:
  pipeline:
    - from: "development"
      to: "staging"
      trigger: "auto-on-merge"  # or manual

    - from: "staging"
      to: "production"
      trigger: "manual"
      requires_approval: true
      approvers: ["tech-lead"]
```

---

### 3. Progressive Strategy (4-5 environments)

**Best for**:
- Growing teams (5-15 developers)
- Multiple teams contributing
- Need dedicated QA/testing
- Continuous integration focus

**Configuration**:
```yaml
environments:
  strategy: "progressive"
  definitions:
    - name: "development"
      purpose: "Local development"
      deployment: { type: "local" }

    - name: "test"
      purpose: "Automated testing (CI/CD)"
      deployment:
        type: "cloud"
        provider: "railway"
        ephemeral: true  # Spin up/down per test run

    - name: "qa"
      purpose: "Manual QA testing"
      deployment:
        type: "cloud"
        provider: "hetzner"
      promotion_from: "test"

    - name: "staging"
      purpose: "Pre-production (mirrors prod config)"
      deployment:
        type: "cloud"
        provider: "hetzner"
      promotion_from: "qa"

    - name: "production"
      purpose: "Live users"
      deployment:
        type: "cloud"
        provider: "hetzner"
      promotion_from: "staging"
      requires_approval: true
```

**Characteristics**:
- Dedicated QA environment
- Automated testing in CI/CD
- Staging mirrors production
- Multiple approval gates

---

### 4. Enterprise Strategy (6+ environments)

**Best for**:
- Large organizations (15+ developers)
- Regulated industries
- Complex compliance requirements
- Multiple stakeholder approval gates

**Configuration**:
```yaml
environments:
  strategy: "enterprise"
  definitions:
    - name: "development"
      purpose: "Developer workstations"

    - name: "test"
      purpose: "Automated CI/CD testing"

    - name: "integration"
      purpose: "Integration testing (multiple services)"

    - name: "qa"
      purpose: "QA team manual testing"

    - name: "uat"
      purpose: "User Acceptance Testing (customer validation)"

    - name: "staging"
      purpose: "Pre-production (exact prod replica)"

    - name: "preview"
      purpose: "PR previews / feature branches"
      ephemeral: true

    - name: "production"
      purpose: "Live customer traffic"
      requires_approval: true
      approval_chain:
        - qa-lead
        - security-lead
        - tech-lead
        - product-owner
```

**Characteristics**:
- Multiple approval gates
- Dedicated UAT for customer validation
- Staging is exact production replica
- Preview environments for PR reviews
- Complex promotion pipeline

---

## Configuration Schema

**Location**: `.specweave/config.yaml` (in USER's project)

**Complete schema**:

```yaml
project:
  name: "my-app"
  type: "nodejs"  # or python, dotnet, nextjs, etc.

environments:
  # Quick preset (optional)
  strategy: "standard"  # minimal | standard | progressive | enterprise | custom

  # Explicit definitions (required)
  definitions:
    - name: "development"              # Required: unique name
      purpose: "Local development"     # Required: human description

      deployment:                      # Required
        type: "local"                  # local | cloud
        target: "docker-compose"       # docker-compose | kubernetes | etc.
        provider: "hetzner"            # For cloud: hetzner | railway | vercel | aws | azure | gcp
        region: "eu-central"           # For cloud: provider-specific region
        ephemeral: false               # For preview/test envs

      promotion_from: "test"           # Optional: which env promotes to this one
      requires_approval: false         # Optional: manual approval gate

      approvers:                       # Optional: who can approve
        - "tech-lead"
        - "devops-lead"

      config:                          # Optional: env-specific configuration
        database: "postgres-dev"
        cache: "redis-dev"
        cdn: "none"
        log_level: "debug"

    - name: "production"
      purpose: "Live traffic"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "eu-central"
      promotion_from: "staging"
      requires_approval: true
      approvers: ["tech-lead"]
      config:
        database: "postgres-prod"
        cache: "redis-prod"
        cdn: "cloudflare"
        log_level: "error"

# Deployment pipeline (optional)
deployment:
  pipeline:
    - from: "development"
      to: "staging"
      trigger: "manual"               # manual | auto-on-merge | auto-on-tag
      tests_required: true

    - from: "staging"
      to: "production"
      trigger: "manual"
      requires_approval: true
      tests_required: true
```

---

## How Agents Use Environment Configuration

### DevOps Agent

**When user requests**: "Deploy to staging"

**Agent behavior**:
1. Read `.specweave/config.yaml`
2. Find `staging` environment definition
3. Check `deployment.type` and `deployment.provider`
4. Generate appropriate infrastructure code:
   - If Hetzner: Use `hetzner-provisioner` skill
   - If Railway: Generate Railway config
   - If Vercel: Generate `vercel.json`
5. Create/update CI/CD pipeline for staging deployment
6. Request staging-specific secrets (only if needed)

**Example**:
```
User: "Set up deployment to staging"

DevOps Agent reads config:
  deployment.provider = "hetzner"
  deployment.region = "eu-central"

DevOps Agent:
✅ Activates hetzner-provisioner skill
✅ Generates Terraform for staging (eu-central)
✅ Creates .github/workflows/deploy-staging.yml
✅ Asks: "Ready to configure staging secrets?"
```

---

### Architect Agent

**When creating ADRs** with infrastructure implications:

**Agent behavior**:
1. Read environments from config.yaml
2. Document architecture per environment
3. Call out differences in ADR

**Example ADR** (Caching Strategy):
```markdown
# ADR-0005: Caching Strategy

## Decision
Use Redis for caching with environment-specific configurations.

## Environment-Specific Implementation

### Development
- Redis: Local Docker container
- TTL: 5 minutes (fast iteration)
- No CDN

### Staging
- Redis: Hetzner managed Redis
- TTL: 1 hour (mirrors production)
- No CDN (testing only)

### Production
- Redis: Hetzner managed Redis (cluster mode)
- TTL: 1 hour
- CDN: Cloudflare (static assets)
- Fallback: Application-level cache
```

---

### Security Agent

**When reviewing secrets management**:

**Agent behavior**:
1. Check environments defined
2. Verify each environment has separate secrets
3. Recommend per-environment secret storage

**Example**:
```
Security Agent reads 3 environments (dev, staging, prod)

Security Agent recommends:
✅ Use GitHub Secrets per environment:
   - DEV_DATABASE_URL
   - DEV_API_KEY
   - STAGING_DATABASE_URL
   - STAGING_API_KEY
   - PROD_DATABASE_URL
   - PROD_API_KEY

✅ Never share secrets across environments
✅ Production secrets require 2-person approval
```

---

### PM Agent

**When planning features** with environment-specific behavior:

**Agent behavior**:
1. Check if feature needs per-environment config
2. Document differences in `spec.md`

**Example** (Feature Flags):
```markdown
# Spec: A/B Testing Feature Flags

## Environment-Specific Behavior

### Development
- All flags enabled by default
- Override flags via `.env.local`
- No analytics tracking

### Staging
- Flags mirror production
- Full analytics tracking
- QA team can toggle flags

### Production
- Flags controlled via admin dashboard
- Gradual rollout (10% → 50% → 100%)
- Full analytics + monitoring
```

---

## Progressive Enhancement

**Key principle**: Users can START SIMPLE and ADD COMPLEXITY later.

### Scenario 1: MVP to Production SaaS

**Week 1** (MVP launch):
```yaml
environments:
  strategy: "minimal"
  definitions:
    - name: "production"
      deployment: { type: "cloud", provider: "vercel" }
```

**Month 3** (Users growing, need staging):
```yaml
environments:
  strategy: "standard"
  definitions:
    - name: "development"
      deployment: { type: "local" }
    - name: "staging"
      deployment: { type: "cloud", provider: "railway" }
    - name: "production"
      deployment: { type: "cloud", provider: "railway" }
```

**How SpecWeave helps**:
1. User: "Add staging environment"
2. DevOps agent: Updates config.yaml
3. DevOps agent: Creates staging-specific configs
4. DevOps agent: Updates CI/CD to include staging
5. DevOps agent: Updates runbooks

---

### Scenario 2: Enterprise Migration

**Phase 1** (Initial setup):
```yaml
environments:
  strategy: "enterprise"
  definitions:
    - development
    - test
    - staging
    - production
```

**Phase 2** (Add QA + UAT after 6 months):
```yaml
environments:
  strategy: "enterprise"
  definitions:
    - development
    - test
    - qa          # ← NEW
    - uat         # ← NEW
    - staging
    - production
```

**How SpecWeave helps**:
1. User: "Add QA and UAT environments between test and staging"
2. DevOps agent: Updates config.yaml
3. DevOps agent: Updates deployment pipeline
4. DevOps agent: Generates infra for QA + UAT
5. DevOps agent: Updates docs/runbooks

---

## Environment-Specific Files

**Typical structure for multi-environment projects**:

```
user-project/
├── .specweave/
│   ├── config.yaml                     # ← Environment definitions
│   └── docs/internal/delivery/
│       └── environments.md             # ← This strategy doc
│
├── config/                             # Environment-specific config
│   ├── development.env
│   ├── staging.env
│   └── production.env
│
├── infrastructure/
│   ├── terraform/                      # Per-environment modules
│   │   ├── development/
│   │   │   ├── main.tf
│   │   │   └── variables.tf
│   │   ├── staging/
│   │   │   ├── main.tf
│   │   │   └── variables.tf
│   │   └── production/
│   │       ├── main.tf
│   │       └── variables.tf
│   │
│   └── docker/
│       └── docker-compose.dev.yml      # Local development
│
├── .github/workflows/
│   ├── deploy-development.yml
│   ├── deploy-staging.yml
│   └── deploy-production.yml
│
└── .specweave/docs/internal/operations/runbooks/
    ├── deploy-to-development.md
    ├── deploy-to-staging.md
    └── deploy-to-production.md
```

---

## Common Patterns

### Pattern 1: Preview Environments (PR Reviews)

**Use case**: Deploy each PR to ephemeral preview environment

```yaml
environments:
  definitions:
    - name: "preview"
      purpose: "PR preview deployments"
      deployment:
        type: "cloud"
        provider: "vercel"
        ephemeral: true
        auto_cleanup: true
        cleanup_after_days: 7
```

**CI/CD integration**:
```yaml
# .github/workflows/preview-deploy.yml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Preview
        run: |
          PREVIEW_URL=$(deploy-to-preview.sh)
          gh pr comment --body "Preview: $PREVIEW_URL"
```

---

### Pattern 2: Blue/Green Deployments (Production)

**Use case**: Zero-downtime production deployments

```yaml
environments:
  definitions:
    - name: "production-blue"
      purpose: "Production (active)"
      deployment:
        type: "cloud"
        provider: "hetzner"

    - name: "production-green"
      purpose: "Production (standby)"
      deployment:
        type: "cloud"
        provider: "hetzner"
```

**Deployment strategy**: Deploy to green → Test → Switch traffic → Blue becomes standby

---

### Pattern 3: Multi-Region Production

**Use case**: Global application with regional deployments

```yaml
environments:
  definitions:
    - name: "production-eu"
      purpose: "European users"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "eu-central"

    - name: "production-us"
      purpose: "US users"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "us-east"

    - name: "production-asia"
      purpose: "Asian users"
      deployment:
        type: "cloud"
        provider: "hetzner"
        region: "ap-southeast"
```

---

## FAQ

### Q: Can I skip environment configuration during project creation?

**A**: Yes! Choose "Not sure yet" when asked. SpecWeave will:
- Create minimal config (production only)
- Add comments in config.yaml for future reference
- Ask again when you mention deployment

### Q: Can I change environment strategy later?

**A**: Absolutely! Just update `.specweave/config.yaml`. SpecWeave agents will:
- Detect changes
- Update infrastructure code
- Update CI/CD pipelines
- Update documentation

### Q: Do all environments need the same cloud provider?

**A**: No! You can mix providers:
```yaml
environments:
  definitions:
    - name: "development"
      deployment: { type: "local" }
    - name: "staging"
      deployment: { type: "cloud", provider: "railway" }  # Easy
    - name: "production"
      deployment: { type: "cloud", provider: "hetzner" }  # Cheap
```

### Q: How do I handle secrets per environment?

**A**: Use environment-specific secret storage:
- **GitHub**: Repository secrets per environment
- **Cloud providers**: Native secret managers (AWS Secrets Manager, etc.)
- **Local**: `.env.local` (gitignored)

Security agent will guide you based on your provider choice.

### Q: What if I want 10+ environments?

**A**: Supported! Use `strategy: "custom"` and define all environments explicitly. Common in large enterprises with:
- Regional environments (EU, US, ASIA)
- Customer-specific environments (white-label SaaS)
- Compliance environments (HIPAA, PCI-DSS)

---

## Summary

**SpecWeave's Environment Strategy**:

✅ **Flexible**: 1 to 100+ environments supported
✅ **Progressive**: Start simple, add complexity later
✅ **Framework-agnostic**: Works with any cloud provider
✅ **Agent-aware**: All agents read and respect environment config
✅ **Safe defaults**: Minimal strategy if user unsure
✅ **Easy migration**: Update config.yaml, agents handle the rest

**Remember**: Environment configuration is for **USER PROJECTS** only. SpecWeave framework itself has no environments - it's just the tooling to help users manage theirs.
