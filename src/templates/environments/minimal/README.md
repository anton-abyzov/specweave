# Minimal Environment Strategy

**Single environment: Production only**

This template is for quick MVPs and prototypes that deploy directly to production.

## Strategy

- **1 environment**: Production
- **Deployment flow**: Local development → Production
- **Best for**: MVPs, prototypes, solo developers, quick shipping

## Structure

```
your-project/
├── config/
│   └── production.env         # Production config (gitignored)
│
├── infrastructure/
│   └── production/
│       ├── main.tf            # Terraform for production
│       ├── variables.tf
│       └── outputs.tf
│
└── .github/workflows/
    └── deploy-production.yml  # Deploy to production
```

## Deployment

**Direct to production**:
- Merge to `main` → Auto-deploy to production (or manual trigger)
- No staging environment
- Fast iteration, higher risk

## Progressive Enhancement

**Start here**, then add environments later when needed:

```bash
# When ready to add staging:
# 1. Update .specweave/config.yaml to "standard" strategy
# 2. DevOps agent will generate staging infrastructure
# 3. Update CI/CD workflows for multi-environment
```

## When to Graduate

Move to **Standard** strategy when:
- ✅ You have real users (need staging for testing)
- ✅ Team growing (need isolation)
- ✅ Bugs in production are too costly
- ✅ Need to test infrastructure changes safely
