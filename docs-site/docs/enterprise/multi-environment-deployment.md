---
id: multi-environment-deployment
title: Multi-Environment Deployment Strategy
sidebar_label: Multi-Environment Deployment
sidebar_position: 4
---

# Multi-Environment Deployment Strategy

:::tip Enterprise Essential
Most enterprises have 4-8 environments (dev → qa → staging → uat → preview → prod). This guide shows how SpecWeave tracks work across ALL environments with full traceability.
:::

---

## 🎯 The Enterprise Environment Reality

### Typical Enterprise Pipeline

```
Local Dev → Dev → QA → Staging → UAT → Preview → Prod
   │         │      │       │       │        │       │
   │         │      │       │       │        │       └─ Production (customers)
   │         │      │       │       │        └─────────── Pre-prod (final validation)
   │         │      │       │       └──────────────────── User Acceptance Testing
   │         │      │       └──────────────────────────── Staging (integration tests)
   │         │      └──────────────────────────────────── QA (automated + manual tests)
   │         └─────────────────────────────────────────── Development (CI builds)
   └───────────────────────────────────────────────────── Developer machines
```

**Why So Many Environments?**

1. **Dev**: Fast iteration, break things freely
2. **QA**: Automated test suite, manual testing
3. **Staging**: Matches prod data/config, integration tests
4. **UAT**: Business stakeholder validation
5. **Preview**: Demo environment for customers
6. **Prod**: Live customers, SLAs, zero downtime

**SpecWeave Challenge**: How to track ONE increment across ALL 7 environments?

**SpecWeave Solution**: **Profile-based sync** + **Environment tagging** + **Deployment tracking**

---

## 🏗️ Architecture: One Increment, Many Environments

### Core Principle: Single Source of Truth

```
✅ CORRECT: One increment, tracked across all environments

.specweave/increments/0018-oauth/ (LOCAL - Source of Truth)
    │
    ├─→ GitHub Issue #123 (Dev tracking)
    ├─→ GitHub Issue #456 (QA tracking)
    ├─→ JIRA Story PROD-789 (Prod tracking)
    ├─→ ADO Work Item #1011 (UAT tracking)
    └─→ Metadata tracks deployment state per environment

❌ WRONG: Separate increments per environment
.specweave/increments/0018-oauth-dev/
.specweave/increments/0018-oauth-qa/
.specweave/increments/0018-oauth-staging/
.specweave/increments/0018-oauth-prod/
```

**Why Single Increment?**
- ✅ One spec = one feature (regardless of where deployed)
- ✅ Traceability from requirements → production
- ✅ Audit trail: What was deployed where and when?
- ✅ Rollback clarity: What version is in each environment?

---

## 🚀 Quick Setup: Multi-Environment Sync

### Step 1: Define Environment Profiles

```json
// .specweave/config.json
{
  "sync": {
    "profiles": {
      "github-dev": {
        "provider": "github",
        "displayName": "Development (GitHub)",
        "config": {
          "owner": "myorg",
          "repo": "myapp-dev"
        },
        "environment": "dev",
        "deploymentUrl": "https://dev.myapp.com"
      },
      "github-qa": {
        "provider": "github",
        "displayName": "QA (GitHub)",
        "config": {
          "owner": "myorg",
          "repo": "myapp-qa"
        },
        "environment": "qa",
        "deploymentUrl": "https://qa.myapp.com"
      },
      "github-staging": {
        "provider": "github",
        "displayName": "Staging (GitHub)",
        "config": {
          "owner": "myorg",
          "repo": "myapp-staging"
        },
        "environment": "staging",
        "deploymentUrl": "https://staging.myapp.com"
      },
      "ado-uat": {
        "provider": "ado",
        "displayName": "UAT (Azure DevOps)",
        "config": {
          "organization": "myorg",
          "project": "MyApp-UAT"
        },
        "environment": "uat",
        "deploymentUrl": "https://uat.myapp.com"
      },
      "jira-prod": {
        "provider": "jira",
        "displayName": "Production (JIRA)",
        "config": {
          "domain": "myorg.atlassian.net",
          "project": "PROD"
        },
        "environment": "prod",
        "deploymentUrl": "https://myapp.com"
      }
    }
  }
}
```

**Notice**:
- Each environment = separate profile
- Each profile has `environment` tag
- Each profile has `deploymentUrl` for verification

---

### Step 2: Deploy to First Environment (Dev)

```bash
# 1. Create increment
/sw:increment "Implement OAuth with Google"

# 2. Implement feature
/sw:do

# 3. Complete increment
/sw:done 0018

# 4. Deploy to dev (manual or CI/CD)
git push origin main  # Triggers dev deployment

# 5. Sync to dev environment
/sw-github:sync 0018 --profile github-dev --deployed

# Result: GitHub issue #123 created in dev repo
# Status: ✅ Deployed to Dev (https://dev.myapp.com)
```

---

### Step 3: Promote to Next Environment (QA)

```bash
# 1. QA deployment happens (CI/CD)
# Triggered by: Git tag, manual approval, etc.

# 2. Sync to QA environment
/sw-github:sync 0018 --profile github-qa --deployed

# Result: GitHub issue #456 created in QA repo
# Status: ✅ Deployed to QA (https://qa.myapp.com)
```

---

### Step 4: Continue Through Pipeline

```bash
# Staging
/sw-github:sync 0018 --profile github-staging --deployed

# UAT
/sw-ado:sync 0018 --profile ado-uat --deployed

# Preview (if exists)
/sw-github:sync 0018 --profile github-preview --deployed

# Production (final)
/sw-jira:sync 0018 --profile jira-prod --deployed
```

---

### Step 5: View Deployment Status

```bash
/sw:status 0018 --deployments

# Output:
📦 Deployment Status: Increment 0018
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment: 0018-oauth-google-integration
Status: Completed & Deployed (Prod)

Deployment Pipeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Dev
   Deployed: 2025-11-10 10:00:00 UTC
   URL: https://dev.myapp.com
   Tracking: GitHub Issue #123
   Commit: a1b2c3d (main branch)
   Status: ✅ HEALTHY (200 OK)

✅ QA
   Deployed: 2025-11-11 14:30:00 UTC
   URL: https://qa.myapp.com
   Tracking: GitHub Issue #456
   Commit: a1b2c3d (qa branch)
   Status: ✅ HEALTHY (200 OK)
   Tests: 245/245 passed (100%)

✅ Staging
   Deployed: 2025-11-12 09:15:00 UTC
   URL: https://staging.myapp.com
   Tracking: GitHub Issue #789
   Commit: a1b2c3d (staging branch)
   Status: ✅ HEALTHY (200 OK)
   Load Test: 1000 req/s sustained

✅ UAT
   Deployed: 2025-11-13 11:00:00 UTC
   URL: https://uat.myapp.com
   Tracking: ADO Work Item #1011
   Commit: a1b2c3d (uat branch)
   Status: ✅ HEALTHY (200 OK)
   Stakeholder Approval: ✅ Approved by jane.smith@company.com

🚀 Production
   Deployed: 2025-11-14 16:45:00 UTC
   URL: https://myapp.com
   Tracking: JIRA Story PROD-123
   Commit: a1b2c3d (release/v1.24.0 tag)
   Status: ✅ HEALTHY (200 OK)
   Traffic: 5,234 req/s (normal)
   Errors: 0.01% (0.5 errors/min)
   Latency: p50=45ms, p95=120ms, p99=280ms

Total Pipeline Duration: 4 days, 6 hours, 45 minutes
Time in each stage:
  Dev → QA: 1 day, 4 hours (automated)
  QA → Staging: 18 hours (automated)
  Staging → UAT: 2 hours (manual approval)
  UAT → Prod: 1 day, 5 hours (manual approval + change window)

DORA Metrics:
  Lead Time: 4.3 days (from commit to prod)
  Deployment Frequency: 1.2 deploys/week
  MTTR: N/A (no incidents)
  Change Failure Rate: 0% (0/12 deployments)
```

---

## 🏢 Enterprise Patterns

### Pattern 1: Blue-Green Deployment

**Scenario**: Zero-downtime deployments with instant rollback

```
Production Environment:
├── Blue Slot (currently live)
│   ├── URL: https://myapp.com
│   └── Version: v1.23.0 (current)
└── Green Slot (new version)
    ├── URL: https://green.myapp.com
    └── Version: v1.24.0 (deploying)
```

**SpecWeave Integration**:

```bash
# 1. Deploy to green slot
/sw:deploy 0018 --environment prod-green

# 2. Verify green slot
curl https://green.myapp.com/health
# ✅ Status: 200 OK

# 3. Run smoke tests
/sw:test 0018 --environment prod-green --suite smoke

# 4. Swap slots (blue ← green)
/sw:swap-slots --environment prod

# 5. Monitor for issues
/sw:monitor 0018 --environment prod --duration 15m

# 6. Rollback if needed
/sw:rollback 0018 --environment prod  # Swaps back to blue
```

**Benefits**:
- ✅ Zero downtime
- ✅ Instant rollback (just swap back)
- ✅ Full testing before traffic shift

---

### Pattern 2: Canary Deployment

**Scenario**: Gradual rollout to subset of users

```
Production Environment:
├── Stable (90% traffic)
│   └── Version: v1.23.0
└── Canary (10% traffic)
    └── Version: v1.24.0 (new)
```

**SpecWeave Integration**:

```bash
# 1. Deploy canary (10% traffic)
/sw:deploy 0018 --environment prod --canary 10

# 2. Monitor canary metrics
/sw:monitor 0018 --environment prod --canary

# Output:
🐤 Canary Deployment Monitoring
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Traffic Split:
  Stable: 90% (v1.23.0)
  Canary: 10% (v1.24.0)

Canary Metrics (last 15 minutes):
  Requests: 523 req/s
  Errors: 0.02% (0.1 errors/min)
  Latency: p50=48ms, p95=125ms
  Success Rate: 99.98%

Stable Metrics (baseline):
  Requests: 4,707 req/s
  Errors: 0.01% (0.5 errors/min)
  Latency: p50=45ms, p95=120ms
  Success Rate: 99.99%

Comparison:
  ✅ Error rate: +0.01% (within tolerance)
  ✅ Latency: +3ms p50, +5ms p95 (acceptable)
  ✅ No anomalies detected

Recommendation: ✅ SAFE TO INCREASE CANARY

# 3. Increase canary gradually
/sw:deploy 0018 --environment prod --canary 25  # 25% traffic
# Wait 30 minutes, monitor...
/sw:deploy 0018 --environment prod --canary 50  # 50% traffic
# Wait 30 minutes, monitor...
/sw:deploy 0018 --environment prod --canary 100 # 100% traffic (full rollout)

# 4. If issues detected, rollback
/sw:rollback 0018 --environment prod --canary  # Back to 0% canary
```

---

### Pattern 3: Feature Flags (Environment-Specific)

**Scenario**: Same code, different features enabled per environment

```
.specweave/config/feature-flags.json
{
  "dev": {
    "oauth_google": true,
    "oauth_github": true,
    "oauth_microsoft": false,
    "advanced_analytics": true
  },
  "qa": {
    "oauth_google": true,
    "oauth_github": true,
    "oauth_microsoft": false,
    "advanced_analytics": true
  },
  "staging": {
    "oauth_google": true,
    "oauth_github": true,
    "oauth_microsoft": false,
    "advanced_analytics": false
  },
  "uat": {
    "oauth_google": true,
    "oauth_github": false,
    "oauth_microsoft": false,
    "advanced_analytics": false
  },
  "prod": {
    "oauth_google": false,  // Not yet enabled!
    "oauth_github": false,
    "oauth_microsoft": false,
    "advanced_analytics": false
  }
}
```

**SpecWeave Integration**:

```bash
# 1. Deploy to all environments (code is same)
/sw:deploy 0018 --all-environments

# 2. Enable feature flag in dev
/sw:feature-flag enable oauth_google --environment dev

# 3. Test in dev
# ... (manual testing)

# 4. Enable in QA
/sw:feature-flag enable oauth_google --environment qa

# 5. Run automated tests
/sw:test 0018 --environment qa --suite full

# 6. Enable in staging
/sw:feature-flag enable oauth_google --environment staging

# 7. Enable in UAT (business validation)
/sw:feature-flag enable oauth_google --environment uat

# 8. Finally, enable in prod
/sw:feature-flag enable oauth_google --environment prod

# Result: Same increment, same code, but feature rolled out gradually!
```

---

## 📊 Deployment Tracking & Reporting

### Metadata Structure (Per-Environment)

```json
// .specweave/increments/0018-oauth/metadata.json
{
  "id": "0018-oauth-google-integration",
  "status": "completed",
  "deployments": {
    "dev": {
      "profile": "github-dev",
      "issueNumber": 123,
      "issueUrl": "https://github.com/myorg/myapp-dev/issues/123",
      "deployedAt": "2025-11-10T10:00:00Z",
      "deployedBy": "john.doe@company.com",
      "commit": "a1b2c3d4e5f6g7h8i9j0",
      "branch": "main",
      "deploymentUrl": "https://dev.myapp.com",
      "healthStatus": "healthy",
      "lastChecked": "2025-11-14T16:45:00Z"
    },
    "qa": {
      "profile": "github-qa",
      "issueNumber": 456,
      "issueUrl": "https://github.com/myorg/myapp-qa/issues/456",
      "deployedAt": "2025-11-11T14:30:00Z",
      "deployedBy": "jane.smith@company.com",
      "commit": "a1b2c3d4e5f6g7h8i9j0",
      "branch": "qa",
      "deploymentUrl": "https://qa.myapp.com",
      "healthStatus": "healthy",
      "testResults": {
        "total": 245,
        "passed": 245,
        "failed": 0,
        "skipped": 0,
        "coverage": 92.5
      }
    },
    "staging": {
      "profile": "github-staging",
      "issueNumber": 789,
      "issueUrl": "https://github.com/myorg/myapp-staging/issues/789",
      "deployedAt": "2025-11-12T09:15:00Z",
      "deployedBy": "ci-cd-bot@company.com",
      "commit": "a1b2c3d4e5f6g7h8i9j0",
      "branch": "staging",
      "deploymentUrl": "https://staging.myapp.com",
      "healthStatus": "healthy",
      "loadTestResults": {
        "maxRPS": 1000,
        "avgLatency": 45,
        "p95Latency": 120,
        "p99Latency": 280,
        "errorRate": 0.001
      }
    },
    "uat": {
      "profile": "ado-uat",
      "workItemId": 1011,
      "workItemUrl": "https://dev.azure.com/myorg/MyApp-UAT/_workitems/edit/1011",
      "deployedAt": "2025-11-13T11:00:00Z",
      "deployedBy": "release-manager@company.com",
      "commit": "a1b2c3d4e5f6g7h8i9j0",
      "branch": "uat",
      "deploymentUrl": "https://uat.myapp.com",
      "healthStatus": "healthy",
      "approvals": [
        {
          "approver": "jane.smith@company.com",
          "role": "Product Manager",
          "approvedAt": "2025-11-13T15:30:00Z",
          "notes": "Tested with 10 users, all scenarios passed"
        }
      ]
    },
    "prod": {
      "profile": "jira-prod",
      "issueKey": "PROD-123",
      "issueUrl": "https://myorg.atlassian.net/browse/PROD-123",
      "deployedAt": "2025-11-14T16:45:00Z",
      "deployedBy": "ops-team@company.com",
      "commit": "a1b2c3d4e5f6g7h8i9j0",
      "branch": "release/v1.24.0",
      "tag": "v1.24.0",
      "deploymentUrl": "https://myapp.com",
      "healthStatus": "healthy",
      "metrics": {
        "rps": 5234,
        "errorRate": 0.0001,
        "p50Latency": 45,
        "p95Latency": 120,
        "p99Latency": 280,
        "cpu": 35.2,
        "memory": 62.8
      },
      "changeRequest": {
        "id": "CHG-2024-11-001",
        "url": "https://servicenow.company.com/change/CHG-2024-11-001",
        "approvedAt": "2025-11-14T10:00:00Z",
        "changeWindow": "2025-11-14T16:00:00Z - 2025-11-14T18:00:00Z"
      }
    }
  }
}
```

---

## 🔄 CI/CD Pipeline Integration

### GitHub Actions Example (Multi-Environment)

```yaml
# .github/workflows/deploy.yml
name: Multi-Environment Deployment

on:
  push:
    branches: [main, qa, staging]
  release:
    types: [published]

jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Dev
        run: |
          # Your deployment logic
          npm run deploy:dev

      - name: Sync SpecWeave to Dev
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npm install -g specweave
          ACTIVE=$(specweave status --active --json | jq -r '.id')
          specweave sync github $ACTIVE --profile github-dev --deployed

  deploy-qa:
    if: github.ref == 'refs/heads/qa'
    runs-on: ubuntu-latest
    environment: qa
    needs: [deploy-dev]
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to QA
        run: npm run deploy:qa

      - name: Run Tests
        run: npm test

      - name: Sync SpecWeave to QA
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ACTIVE=$(specweave status --active --json | jq -r '.id')
          specweave sync github $ACTIVE --profile github-qa --deployed

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    needs: [deploy-qa]
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Staging
        run: npm run deploy:staging

      - name: Run Load Tests
        run: npm run test:load

      - name: Sync SpecWeave to Staging
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ACTIVE=$(specweave status --active --json | jq -r '.id')
          specweave sync github $ACTIVE --profile github-staging --deployed

  deploy-prod:
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    environment: production
    needs: [deploy-staging]
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Production
        run: npm run deploy:prod

      - name: Health Check
        run: |
          for i in {1..5}; do
            curl -f https://myapp.com/health && break
            sleep 10
          done

      - name: Sync SpecWeave to Prod
        env:
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: |
          ACTIVE=$(specweave status --active --json | jq -r '.id')
          specweave sync jira $ACTIVE --profile jira-prod --deployed
```

---

## 📚 Related Guides

- [GitHub Migration Guide](./github-migration.md)
- [JIRA Migration Guide](./jira-migration.md)
- [Azure DevOps Migration Guide](./azure-devops-migration.md)
- [Release Management Guide](./release-management.md)
- [CI/CD Integration Guide](./cicd-integration.md)

---

## 🆘 Getting Help

- **Documentation**: https://spec-weave.com
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Enterprise Support**: enterprise@spec-weave.com
