---
sidebar_position: 13
---

# GitHub Actions

**Category**: DevOps & Tools

## Definition

**GitHub Actions** is GitHub's native CI/CD (Continuous Integration/Continuous Deployment) platform that automates software workflows directly in your GitHub repository. Actions run in response to repository events like pushes, pull requests, or on schedules.

**Purpose**: Automate build, test, and deployment workflows without leaving GitHub.

## What Problem Does It Solve?

**The CI/CD Setup Problem**:
- ❌ Complex setup with external CI/CD tools (Jenkins, CircleCI)
- ❌ Context switching between GitHub and CI platform
- ❌ Manual deployment processes prone to errors
- ❌ No standardized workflow templates

**GitHub Actions Solution**:
- ✅ Native GitHub integration (no external tools)
- ✅ YAML-based workflows (version controlled)
- ✅ Massive action marketplace (reusable components)
- ✅ Free for public repos, generous limits for private repos

## Key Concepts

### Workflows

YAML files in `.github/workflows/` that define automation:

```yaml
name: CI Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
```

### Jobs

Independent units of work that run in parallel or sequentially:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  test:
    needs: build  # Runs after build
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

### Actions

Reusable components from GitHub Marketplace or custom:

```yaml
steps:
  - uses: actions/checkout@v3           # Official action
  - uses: docker/build-push-action@v4   # Community action
  - uses: ./.github/actions/my-action   # Custom local action
```

### Runners

Virtual machines that execute workflows:
- **GitHub-hosted**: `ubuntu-latest`, `windows-latest`, `macos-latest`
- **Self-hosted**: Your own infrastructure

### Secrets

Encrypted environment variables for sensitive data:

```yaml
steps:
  - name: Deploy
    env:
      API_KEY: ${{ secrets.API_KEY }}
    run: deploy.sh
```

## Real-World Example: SpecWeave CI/CD

**SpecWeave's GitHub Actions Pipeline**:

```yaml
name: SpecWeave CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:integration

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build

  publish:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Common Workflows

### 1. Continuous Integration (CI)

**Test on every push**:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
```

### 2. Continuous Deployment (CD)

**Deploy to production**:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 sync ./dist s3://my-bucket
          aws cloudfront create-invalidation --distribution-id DIST123
```

### 3. Scheduled Jobs (Cron)

**Run nightly builds**:

```yaml
name: Nightly Build
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build:nightly
```

### 4. Matrix Builds

**Test across multiple versions**:

```yaml
name: Cross-Platform Tests
on: [push]
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [16, 18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

## SpecWeave Integration

### Living Documentation

After GitHub Actions setup, update docs:

```bash
# Sync CI/CD documentation
/specweave:sync-docs update
```

**Results in**:
- README updated with status badges
- CI/CD docs in `.specweave/docs/internal/delivery/`

### Example Workflow for SpecWeave Projects

```yaml
name: SpecWeave Project CI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Validate increment structure
      - name: Validate SpecWeave Increments
        run: |
          specweave validate --all

      # Check test coverage
      - name: Check Test Coverage
        run: |
          specweave check-tests --all

  test:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Run tests
      - run: npm ci
      - run: npm test

      # Upload coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  sync-docs:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      # Sync living docs
      - name: Update Living Documentation
        run: |
          specweave sync-docs update

      # Commit changes
      - name: Commit Updated Docs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .specweave/docs/
          git commit -m "docs: auto-sync living docs" || exit 0
          git push
```

## Best Practices

### 1. Use Action Versions

```yaml
# ✅ CORRECT: Pin to specific version
- uses: actions/checkout@v3

# ❌ WRONG: Use latest (can break)
- uses: actions/checkout@latest
```

### 2. Cache Dependencies

```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'  # ✅ Faster builds
- run: npm ci
```

### 3. Fail Fast Strategy

```yaml
strategy:
  fail-fast: true  # Stop all jobs if one fails
  matrix:
    node: [16, 18, 20]
```

### 4. Environment Protection

```yaml
jobs:
  deploy:
    environment:
      name: production  # Requires approval
      url: https://example.com
```

### 5. Conditional Steps

```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main' && success()
  run: deploy.sh
```

## Common Triggers

### Event Triggers

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'  # Only trigger on src/ changes
  pull_request:
    types: [opened, synchronize, reopened]
  release:
    types: [published]
  workflow_dispatch:  # Manual trigger
```

### Schedule Trigger

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday midnight
```

## Secrets Management

### Setting Secrets

```bash
# Via GitHub UI: Settings → Secrets and variables → Actions

# Or via GitHub CLI
gh secret set NPM_TOKEN
```

### Using Secrets

```yaml
steps:
  - name: Publish to NPM
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    run: npm publish
```

**⚠️ Never log secrets**:
```yaml
# ❌ WRONG: Secrets exposed in logs
- run: echo ${{ secrets.API_KEY }}

# ✅ CORRECT: Mask secrets
- run: echo "::add-mask::${{ secrets.API_KEY }}"
```

## DORA Metrics with GitHub Actions

Track deployment frequency, lead time, and change failure rate:

```yaml
name: Track DORA Metrics

on:
  push:
    branches: [main]

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Record Deployment
        run: |
          curl -X POST https://api.example.com/metrics \
            -H "Content-Type: application/json" \
            -d '{
              "deployment_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
              "commit": "'$GITHUB_SHA'",
              "branch": "'$GITHUB_REF'"
            }'
```

## Debugging Workflows

### Enable Debug Logging

```bash
# Set repository secrets
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

### Local Testing

```bash
# Test workflow locally (requires act)
act -j test

# Test with specific event
act push -e .github/workflows/test-event.json
```

## Cost Optimization

**Free Tier** (public repos):
- Unlimited minutes
- Unlimited storage

**Private Repos**:
- Free: 2,000 minutes/month
- Pro: 3,000 minutes/month
- Team: 10,000 minutes/month

**Optimization Tips**:
```yaml
# 1. Cache dependencies
- uses: actions/cache@v3

# 2. Cancel old runs
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# 3. Use self-hosted runners for heavy workloads
runs-on: self-hosted
```

## Related Terms

- [CI/CD](./cicd.md) - Continuous Integration/Continuous Deployment
- [DevOps](./devops.md) - Development operations practices
- [Git](./git.md) - Version control system
- [Docker](./docker.md) - Containerization platform
- [DORA Metrics](./dora-metrics.md) - Deployment performance metrics

## Learn More

- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Official docs
- [Marketplace](https://github.com/marketplace?type=actions) - Browse 15,000+ actions
- [SpecWeave CI/CD Guide](/docs/learn/foundations/infrastructure#cicd) - Integration guide

---

**Category**: DevOps & Tools

**Tags**: #github-actions #cicd #automation #devops #workflows
