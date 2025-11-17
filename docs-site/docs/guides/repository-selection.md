# Repository Selection Guide

**Version**: 0.22.0+
**Last Updated**: 2025-11-17
**Feature**: GitHub Template Discovery (Strategic Init Phase 3)

---

## Overview

During Strategic Init Phase 3, SpecWeave discovers your GitHub template repositories and helps you select the right ones for your project. This guide explains the selection process, filtering techniques, and best practices.

**Time Saved**: 2-4 hours of manual template searching

---

## What Are Template Repositories?

**Template repositories** are GitHub repos marked as templates that can be used as starting points for new projects.

**Why They Matter**:
- ✅ **Proven patterns**: Battle-tested project structure
- ✅ **Best practices**: Pre-configured linting, testing, CI/CD
- ✅ **Faster setup**: Clone and start coding immediately
- ✅ **Team consistency**: Everyone uses same foundation

**How SpecWeave Uses Them**:
1. Scans your GitHub for template repositories
2. Filters by architecture (serverless vs traditional)
3. Filters by tech stack (React, Node.js, Python, etc.)
4. Recommends best matches for your vision

---

## Template Discovery Process

### Step 1: GitHub Scan

SpecWeave connects to GitHub and scans:
- ✅ Your personal repositories
- ✅ Organization repositories (if you're a member)
- ✅ Public templates from popular sources

**Authentication**: Uses GitHub CLI (`gh auth status`) or OAuth token

### Step 2: Template Classification

Each repository is analyzed for:
- **Is Template?**: Marked as template on GitHub
- **Tech Stack**: Detected from `package.json`, `requirements.txt`, `go.mod`, etc.
- **Architecture Type**: Serverless, traditional, monolithic, microservices
- **Compliance**: HIPAA-ready, PCI-compliant, etc.
- **Stars/Forks**: Popularity indicator

**Example Detection**:
```
Repository: anton-abyzov/serverless-api-template
- Template: Yes ✅
- Tech Stack: Node.js, TypeScript, AWS Lambda
- Architecture: Serverless
- Stars: 127 ⭐
- Compliance: SOC 2 ready
```

### Step 3: Filtering & Selection

SpecWeave offers multiple selection methods based on repository count.

---

## Selection Methods

### Method 1: Select All (≤5 Repositories)

**When**: You have 5 or fewer template repositories

**Options**:
```
Detected Templates (4 total):
1. serverless-api (Node.js, AWS Lambda)
2. react-frontend (React, TypeScript)
3. python-ml (Python, TensorFlow)
4. go-microservice (Go, Docker)

Select:
→ All 4 templates
→ Manual selection
```

**Recommendation**: Select all if they're all relevant

---

### Method 2: Prefix-Based Selection (6-20 Repositories)

**When**: You have 6-20 template repositories with naming patterns

**Example**:
```
Detected Templates (12 total):
- acme-corp/backend-*    (3 templates)
- acme-corp/frontend-*   (2 templates)
- acme-corp/mobile-*     (1 template)
- acme-corp/infra-*      (4 templates)
- community/*            (2 templates)

Select by prefix:
1. acme-corp/backend-*   → 3 templates
2. acme-corp/frontend-*  → 2 templates
3. acme-corp/*           → 10 templates (all owned by acme-corp)
4. Manual selection
```

**Best Practice**: Use prefixes if your organization follows naming conventions

---

### Method 3: Keyword-Based Filtering (21+ Repositories)

**When**: You have many template repositories

**Filtering Options**:
1. **By Name Keywords**:
   ```
   Filter by keyword: serverless
   Matches: 8 repositories
   - serverless-api-nodejs
   - serverless-api-python
   - serverless-frontend
   ...
   ```

2. **By Tech Stack**:
   ```
   Filter by tech stack: React
   Matches: 12 repositories
   - react-spa-template
   - react-native-mobile
   - react-nextjs-ssr
   ...
   ```

3. **By Owner**:
   ```
   Filter by owner: acme-corp
   Matches: 18 repositories
   (All templates owned by acme-corp organization)
   ```

4. **Combined Filters**:
   ```
   Filters:
   - Owner: acme-corp
   - Keyword: serverless
   - Tech Stack: Node.js

   Matches: 3 repositories
   - acme-corp/serverless-api-nodejs
   - acme-corp/serverless-worker-nodejs
   - acme-corp/serverless-auth-nodejs
   ```

---

## Advanced Filtering Techniques

### Filter by Architecture Match

SpecWeave auto-filters templates based on Phase 4 architecture decision:

**Serverless Architecture** (chosen in Phase 4):
```
Showing serverless-compatible templates only:
✅ serverless-api-lambda (AWS Lambda + API Gateway)
✅ serverless-frontend-s3 (S3 + CloudFront)
✅ serverless-worker-sqs (SQS + Lambda)

Hidden (traditional):
❌ ec2-backend-api (doesn't match serverless)
❌ kubernetes-microservice (doesn't match serverless)
```

**Traditional Architecture** (chosen in Phase 4):
```
Showing traditional infrastructure templates:
✅ ec2-backend-api (EC2 + RDS)
✅ kubernetes-microservice (K8s + PostgreSQL)
✅ docker-compose-stack (Docker + Nginx)

Hidden (serverless):
❌ serverless-api-lambda (doesn't match traditional)
```

### Filter by Compliance

For HIPAA/PCI-DSS/SOC 2 products:

```
Vision: "HIPAA-compliant telehealth platform"

Showing HIPAA-ready templates:
✅ hipaa-backend-api (Audit logging, encryption)
✅ hipaa-auth-service (MFA, access controls)

Hidden (not HIPAA-ready):
❌ simple-api-starter (no audit trail)
❌ quick-prototype (no encryption)
```

### Filter by Scale

For high-scale products:

```
Vision: "Viral social network"

Showing scalable templates:
✅ scalable-api-nodejs (Auto-scaling, caching)
✅ distributed-workers (SQS queues, Lambda)

Hidden (not scalable):
❌ sqlite-backend (single database)
❌ in-memory-cache (not distributed)
```

---

## Repository Preview

Before selection, SpecWeave shows metadata:

```
📦 Repository Preview

Name: acme-corp/serverless-api-nodejs
URL: https://github.com/acme-corp/serverless-api-nodejs
Description: Production-ready serverless API template

Tech Stack:
- Node.js 18.x
- TypeScript 5.0
- AWS Lambda
- API Gateway
- DynamoDB

Features:
✅ Authentication (JWT)
✅ Rate limiting
✅ API versioning
✅ Unit tests (Jest)
✅ E2E tests (Supertest)
✅ CI/CD (GitHub Actions)

Metrics:
- Stars: 234 ⭐
- Forks: 45
- Last updated: 2 days ago
- Contributors: 8

Compliance:
✅ SOC 2 ready
⚠️ HIPAA (requires additional audit controls)
❌ PCI-DSS (not payment-focused)

Select this template? (y/N)
```

---

## Manual Exclusions

After filtering, you can manually exclude specific templates:

```
Selected Templates (8 total):

1. ✅ serverless-api-nodejs
2. ✅ serverless-frontend-react
3. ❌ serverless-legacy-v1 (exclude - outdated)
4. ✅ serverless-worker-sqs
5. ❌ serverless-experimental (exclude - not production-ready)
6. ✅ serverless-auth-service
7. ✅ serverless-data-pipeline
8. ❌ serverless-test-template (exclude - only for testing)

Final selection: 5 templates
```

---

## What If I Don't Have Templates?

**SpecWeave recommends popular templates** based on your architecture:

### Serverless Recommendations

**AWS Lambda**:
- `serverless/serverless-starter` - Official Serverless Framework starter
- `aws-samples/serverless-patterns` - AWS serverless patterns

**Firebase**:
- `firebase/quickstart-nodejs` - Firebase Cloud Functions
- `firebase/functions-samples` - Firebase examples

**Supabase**:
- `supabase/supabase` - Complete Supabase stack
- `supabase-community/auth-helpers` - Auth templates

### Traditional Recommendations

**Node.js**:
- `microsoft/TypeScript-Node-Starter` - Express + TypeScript
- `hagopj13/node-express-boilerplate` - Production-ready Express

**Python**:
- `tiangolo/full-stack-fastapi-postgresql` - FastAPI + PostgreSQL
- `cookiecutter/cookiecutter-django` - Django template

**Go**:
- `golang-standards/project-layout` - Standard Go project structure
- `evrone/go-clean-template` - Clean architecture Go

**Kubernetes**:
- `GoogleCloudPlatform/microservices-demo` - Microservices reference
- `kubernetes/examples` - K8s examples

---

## Best Practices

### 1. Organize Templates by Purpose

**Good Naming**:
```
✅ backend-api-nodejs
✅ frontend-react-spa
✅ mobile-react-native
✅ infra-terraform-aws
✅ ml-python-tensorflow
```

**Bad Naming**:
```
❌ template-1
❌ project-starter
❌ new-app
❌ copy-of-backend
```

### 2. Mark Repositories as Templates

On GitHub:
1. Go to repository Settings
2. Check "Template repository"
3. SpecWeave will auto-discover it

### 3. Maintain Template READMEs

**Include**:
- Tech stack versions
- Setup instructions
- Compliance notes
- Last updated date
- Maintainer contact

**Example**:
```markdown
# Serverless API Template

**Tech Stack**: Node.js 18, TypeScript 5, AWS Lambda
**Architecture**: Serverless
**Compliance**: SOC 2 ready
**Last Updated**: 2025-11-15
**Maintainer**: platform-team@acme.com

## Quick Start
1. Clone template
2. Run `npm install`
3. Configure `.env`
4. Deploy: `npm run deploy`
```

### 4. Version Your Templates

**Approach 1: Branches**:
```
- main (latest stable)
- v2.0 (major version 2)
- v1.0 (legacy version 1)
```

**Approach 2: Tags**:
```
git tag v2.1.0
git push --tags
```

**Approach 3: Separate Repos**:
```
- backend-api-v2 (current)
- backend-api-v1 (legacy)
```

### 5. Archive Outdated Templates

Mark deprecated templates:
1. GitHub: Archive repository
2. README: Add deprecation notice
3. SpecWeave: Will hide archived templates

---

## Troubleshooting

### Problem: No templates found

**Causes**:
- No repositories marked as templates
- GitHub authentication failed
- Organization permissions missing

**Solution**:
```bash
# Verify GitHub authentication
gh auth status

# Login if needed
gh auth login

# Check organization access
gh repo list your-org
```

### Problem: Wrong templates recommended

**Cause**: Architecture mismatch

**Solution**: SpecWeave filters templates by architecture from Phase 4. If recommendations don't match, review Phase 4 decision.

### Problem: Can't access organization templates

**Cause**: Missing organization permissions

**Solution**:
1. Join GitHub organization
2. Request "Member" role (minimum)
3. Re-run `specweave init`

---

## Integration with Multi-Project Mode

When using multi-project mode, select templates per project:

```bash
# Switch to backend project
/specweave:switch-project backend-api

# Run init (will prompt for templates)
specweave init

# Select backend templates only:
✅ backend-api-nodejs
✅ backend-worker-sqs
❌ frontend-react (skip - not backend)

# Switch to frontend project
/specweave:switch-project frontend-app

# Run init
specweave init

# Select frontend templates:
✅ frontend-react-spa
✅ frontend-component-library
❌ backend-api-nodejs (skip - not frontend)
```

---

## FAQ

### Can I use templates from other organizations?

**Yes**, if they're public. SpecWeave scans:
- ✅ Your personal repos
- ✅ Your organization repos
- ✅ Public templates you've starred
- ❌ Private repos from other orgs (permission required)

### Can I skip template selection?

**Yes**. During Phase 3:
```
Select templates? (Y/n): n
✅ Skipped template selection
```

You can manually clone templates later.

### Can I add templates after init?

**Yes**. Re-run Strategic Init:
```bash
specweave init

# Select different templates during Phase 3
```

### Do templates affect architecture decision?

**No**. Architecture decision (Phase 4) comes AFTER template selection. SpecWeave will filter templates to match chosen architecture.

---

## See Also

- [Strategic Init Guide](./strategic-init.md) - Complete Phase 0-6 process
- [Multi-Project Setup](./multi-project-setup.md) - Organize templates by project
- [Compliance Standards Reference](../reference/compliance-standards.md) - Compliance-aware template selection

---

**Last Updated**: 2025-11-17
**Version**: 0.22.0+
