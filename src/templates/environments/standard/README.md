# Standard Environment Strategy

**Three environments: Development, Staging, Production**

This template is for professional projects with proper testing and validation.

## Strategy

- **3 environments**: Development (local), Staging (cloud), Production (cloud)
- **Deployment flow**: Development → Staging → Production
- **Best for**: Small teams (2-5 developers), production SaaS, professional projects

## Structure

```
your-project/
├── config/
│   ├── development.env        # Local dev config (gitignored)
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
    ├── deploy-staging.yml     # Auto-deploy to staging
    └── deploy-production.yml  # Manual deploy to production
```

## Deployment Pipeline

```
Development (local)
  ↓ (merge to develop)
Staging (auto-deploy)
  ↓ (manual approval + merge to main)
Production (manual deploy)
```

## Environment Characteristics

### Development
- **Type**: Local (Docker Compose)
- **Purpose**: Developer workstations
- **Database**: PostgreSQL in Docker
- **Cache**: Redis in Docker
- **Deployment**: `docker-compose up`

### Staging
- **Type**: Cloud (Hetzner/Railway/Vercel)
- **Purpose**: Pre-production validation
- **Size**: Smaller resources (CX11 on Hetzner)
- **Promotion**: Auto-deploy from `develop` branch
- **Testing**: QA team tests here

### Production
- **Type**: Cloud (Hetzner/Railway/Vercel)
- **Purpose**: Live user traffic
- **Size**: Production-grade resources (CX31+ on Hetzner)
- **Promotion**: Manual approval required
- **Monitoring**: Full monitoring + alerting

## Secrets Management

**GitHub Secrets (per environment)**:
```
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

Move to **Progressive** strategy when:
- ✅ Team growing beyond 5 developers
- ✅ Need dedicated QA environment
- ✅ Multiple teams contributing
- ✅ More rigorous testing required
