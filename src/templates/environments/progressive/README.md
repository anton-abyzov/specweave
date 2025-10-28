# Progressive Environment Strategy

**Four environments: Development, QA, Staging, Production**

This template is for growing teams with dedicated QA and rigorous testing.

## Strategy

- **4 environments**: Development (local), QA (cloud), Staging (cloud), Production (cloud)
- **Deployment flow**: Development → QA → Staging → Production
- **Best for**: Growing teams (5-15 developers), multiple teams, rigorous QA

## Structure

```
your-project/
├── config/
│   ├── development.env        # Local dev config (gitignored)
│   ├── qa.env                 # QA config (gitignored)
│   ├── staging.env            # Staging config (gitignored)
│   └── production.env         # Production config (gitignored)
│
├── infrastructure/
│   ├── modules/               # Reusable Terraform modules
│   │   ├── server/
│   │   ├── database/
│   │   └── cache/
│   ├── development/
│   │   └── docker-compose.yml # Local development
│   ├── qa/
│   │   ├── main.tf            # QA infrastructure
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf            # Staging infrastructure
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf            # Production infrastructure
│       ├── variables.tf
│       └── terraform.tfvars
│
└── .github/workflows/
    ├── deploy-qa.yml          # Auto-deploy to QA
    ├── deploy-staging.yml     # Deploy to staging (after QA approval)
    └── deploy-production.yml  # Manual deploy to production
```

## Deployment Pipeline

```
Development (local)
  ↓ (merge to develop)
QA (auto-deploy)
  ↓ (QA team approval)
Staging (auto-deploy)
  ↓ (manual approval + merge to main)
Production (manual deploy)
```

## Environment Characteristics

### Development
- **Type**: Local (Docker Compose)
- **Purpose**: Developer workstations
- **Database**: PostgreSQL in Docker
- **Testing**: Unit tests, integration tests
- **Deployment**: `docker-compose up`

### QA
- **Type**: Cloud (Hetzner/Railway)
- **Purpose**: Dedicated QA team testing
- **Size**: Small resources (CX11)
- **Promotion**: Auto-deploy from `develop` branch
- **Testing**: Manual QA, exploratory testing, regression
- **Access**: QA team only

### Staging
- **Type**: Cloud (Hetzner/Railway)
- **Purpose**: Pre-production validation (mirrors production config)
- **Size**: Production-like resources (CX21)
- **Promotion**: Auto-deploy after QA approval
- **Testing**: Final validation, performance testing
- **Access**: Internal team

### Production
- **Type**: Cloud (Hetzner/Railway/AWS)
- **Purpose**: Live user traffic
- **Size**: Production-grade resources (CX31+)
- **Promotion**: Manual approval required
- **Monitoring**: Full monitoring + alerting + on-call
- **Access**: Public + internal team

## Approval Gates

```
Development → QA: Automatic (on merge)
QA → Staging: QA Lead approval
Staging → Production: Tech Lead + Product Owner approval
```

## Secrets Management

**GitHub Secrets (per environment)**:
```
Secrets for 'qa':
  - QA_HETZNER_TOKEN
  - QA_DATABASE_URL
  - QA_STRIPE_API_KEY (test mode)

Secrets for 'staging':
  - STAGING_HETZNER_TOKEN
  - STAGING_DATABASE_URL
  - STAGING_STRIPE_API_KEY (test mode)

Secrets for 'production':
  - PROD_HETZNER_TOKEN
  - PROD_DATABASE_URL
  - PROD_STRIPE_API_KEY (live mode)
```

## When to Graduate

Move to **Enterprise** strategy when:
- ✅ Team exceeds 15 developers
- ✅ Need UAT environment for customer validation
- ✅ Regulatory/compliance requirements (HIPAA, PCI-DSS)
- ✅ Need regional deployments
- ✅ Multiple product lines
