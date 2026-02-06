---
description: GitHub Actions advanced expert for CI/CD workflows, reusable workflows, composite actions, OIDC authentication, security hardening, monorepo patterns, self-hosted runners, and deployment automation. Covers performance optimization, cost management, and production-grade pipeline design.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# GitHub Actions Advanced Expert

## Purpose

Design, implement, and optimize GitHub Actions workflows for CI/CD, automation, and deployment pipelines. Provide expert guidance on workflow architecture, security, performance, and cost optimization.

## When to Use

- Creating or optimizing CI/CD pipelines
- Building reusable workflows and composite actions
- Setting up OIDC authentication with cloud providers
- Implementing monorepo CI strategies
- Configuring self-hosted runners
- Designing deployment pipelines with environment gates
- Debugging workflow failures
- Optimizing build times and costs
- Creating custom GitHub Actions (JavaScript, Docker, composite)

## Workflow Syntax Fundamentals

### Trigger Events

```yaml
on:
  # Branch push
  push:
    branches: [main, 'release/**']
    paths-ignore: ['docs/**', '*.md']

  # Pull request
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # Manual dispatch with inputs
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [dev, staging, production]
      dry_run:
        description: 'Dry run mode'
        type: boolean
        default: false

  # Scheduled
  schedule:
    - cron: '0 6 * * 1-5'  # Weekdays at 6 AM UTC

  # Called by another workflow
  workflow_call:
    inputs:
      node_version:
        type: string
        default: '20'
    secrets:
      NPM_TOKEN:
        required: true

  # Repository dispatch (API triggered)
  repository_dispatch:
    types: [deploy]
```

### Matrix Strategies

```yaml
jobs:
  test:
    strategy:
      fail-fast: false  # Don't cancel other jobs on failure
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: ['18', '20', '22']
        exclude:
          - os: windows-latest
            node: '18'
        include:
          - os: ubuntu-latest
            node: '20'
            coverage: true  # Extra variable for this combo

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      - name: Run tests with coverage
        if: matrix.coverage
        run: npm test -- --coverage
```

### Job Dependencies and Outputs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.value }}
      should_deploy: ${{ steps.check.outputs.deploy }}
    steps:
      - id: version
        run: echo "value=$(jq -r .version package.json)" >> "$GITHUB_OUTPUT"

      - id: check
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "deploy=true" >> "$GITHUB_OUTPUT"
          else
            echo "deploy=false" >> "$GITHUB_OUTPUT"
          fi

  deploy:
    needs: [build]
    if: needs.build.outputs.should_deploy == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying version ${{ needs.build.outputs.version }}"
```

## Reusable Workflows

### Defining a Reusable Workflow

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image_tag:
        required: true
        type: string
      region:
        type: string
        default: 'us-east-1'
    secrets:
      AWS_ROLE_ARN:
        required: true
    outputs:
      deploy_url:
        description: 'Deployment URL'
        value: ${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ inputs.region }}

      - id: deploy
        run: |
          # Deploy logic here
          echo "url=https://${{ inputs.environment }}.example.com" >> "$GITHUB_OUTPUT"
```

### Calling a Reusable Workflow

```yaml
# .github/workflows/release.yml
jobs:
  build:
    # ... build steps

  deploy-staging:
    needs: build
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      image_tag: ${{ needs.build.outputs.image_tag }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.STAGING_AWS_ROLE_ARN }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
      image_tag: ${{ needs.build.outputs.image_tag }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.PROD_AWS_ROLE_ARN }}
```

## Composite Actions

### Creating a Composite Action

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Install dependencies with caching'

inputs:
  node_version:
    description: 'Node.js version'
    default: '20'
  working_directory:
    description: 'Working directory'
    default: '.'

outputs:
  cache_hit:
    description: 'Whether cache was hit'
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node_version }}

    - name: Get npm cache directory
      id: npm-cache-dir
      shell: bash
      run: echo "dir=$(npm config get cache)" >> "$GITHUB_OUTPUT"

    - uses: actions/cache@v4
      id: cache
      with:
        path: |
          ${{ steps.npm-cache-dir.outputs.dir }}
          ${{ inputs.working_directory }}/node_modules
        key: ${{ runner.os }}-node-${{ inputs.node_version }}-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-${{ inputs.node_version }}-

    - name: Install dependencies
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      working-directory: ${{ inputs.working_directory }}
      run: npm ci
```

### Using the Composite Action

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./.github/actions/setup-project
    with:
      node_version: '20'

  - run: npm test
```

## OIDC Authentication with Cloud Providers

### AWS OIDC Setup

```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-actions
      aws-region: us-east-1
      # No access keys needed - uses OIDC token
```

**AWS IAM Trust Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:org/repo:*"
      }
    }
  }]
}
```

### Azure OIDC Setup

```yaml
steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### GCP OIDC Setup

```yaml
steps:
  - uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: 'projects/123/locations/global/workloadIdentityPools/pool/providers/github'
      service_account: 'github-actions@project.iam.gserviceaccount.com'
```

## Security Best Practices

### Action Pinning by SHA

```yaml
# INSECURE: Tag can be moved by attacker
- uses: actions/checkout@v4

# SECURE: Pin to exact commit SHA
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
```

```bash
# Get SHA for a specific version
gh api repos/actions/checkout/git/ref/tags/v4.1.1 --jq '.object.sha'
```

### Minimal Permissions

```yaml
# Set restrictive default permissions at workflow level
permissions:
  contents: read

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write      # Only if OIDC needed
      deployments: write   # Only if updating deployments
```

### Secret Handling

```yaml
steps:
  # Secrets are masked in logs automatically
  - run: echo "Deploying to ${{ secrets.DEPLOY_URL }}"

  # NEVER echo secrets for debugging
  # NEVER pass secrets as command-line arguments (visible in process list)

  # Use environment files instead
  - run: |
      echo "API_KEY=${{ secrets.API_KEY }}" >> "$GITHUB_ENV"

  # Or use step-level env
  - env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    run: node migrate.js
```

### Environment Protection Rules

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    # Requires manual approval + branch protection in GitHub settings
    steps:
      - run: ./deploy.sh
```

## Monorepo Patterns

### Path-Based Triggers

```yaml
on:
  push:
    paths:
      - 'packages/frontend/**'
      - 'packages/shared/**'  # Shared dependency
      - 'package.json'

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test --workspace=packages/frontend
```

### Changed File Detection

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.changes.outputs.frontend }}
      backend: ${{ steps.changes.outputs.backend }}
      infra: ${{ steps.changes.outputs.infra }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            frontend:
              - 'packages/frontend/**'
              - 'packages/shared/**'
            backend:
              - 'packages/backend/**'
              - 'packages/shared/**'
            infra:
              - 'infrastructure/**'

  build-frontend:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building frontend..."

  build-backend:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building backend..."
```

## Caching Strategies

### Dependency Caching

```yaml
steps:
  # Node.js (built-in to setup-node)
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'

  # Custom cache for build artifacts
  - uses: actions/cache@v4
    with:
      path: |
        .next/cache
        dist/
      key: build-${{ runner.os }}-${{ hashFiles('src/**', 'package-lock.json') }}
      restore-keys: |
        build-${{ runner.os }}-

  # Docker layer caching
  - uses: docker/build-push-action@v5
    with:
      context: .
      cache-from: type=gha
      cache-to: type=gha,mode=max
```

### Cache Key Strategy

```
Best practice for cache keys:
  Exact:   ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
  Restore: ${{ runner.os }}-node-

This ensures:
  1. Exact match on lock file hash (fast, correct dependencies)
  2. Fallback to OS+runtime prefix (faster than cold install)
```

## Concurrency Control

```yaml
# Cancel redundant runs on the same PR
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

# Serialize deployments (never cancel)
jobs:
  deploy:
    concurrency:
      group: deploy-production
      cancel-in-progress: false
```

## Container Jobs and Services

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
        run: npm test
```

## Common Pipeline Patterns

### CI Pipeline (Lint, Test, Build)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
```

### Release Automation

```yaml
name: Release
on:
  push:
    tags: ['v*']

permissions:
  contents: write
  packages: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for changelog

      - name: Generate changelog
        id: changelog
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            CHANGES=$(git log --pretty=format:"- %s (%h)" "$PREV_TAG"..HEAD)
          else
            CHANGES=$(git log --pretty=format:"- %s (%h)")
          fi
          echo "changes<<EOF" >> "$GITHUB_OUTPUT"
          echo "$CHANGES" >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changes }}
          generate_release_notes: true

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### PR Automation

```yaml
name: PR Automation
on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml

  size-label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Label PR by size
        uses: codelytv/pr-size-labeler@v1
        with:
          xs_max_size: 10
          s_max_size: 100
          m_max_size: 500
          l_max_size: 1000
```

## Debugging Workflows

### Enable Debug Logging

```yaml
# Set repository secret: ACTIONS_RUNNER_DEBUG = true
# Or re-run with debug logging from the UI

# In workflow, use debug output
- run: echo "::debug::Current SHA is $GITHUB_SHA"

# Group log output for readability
- run: |
    echo "::group::Install Output"
    npm ci
    echo "::endgroup::"
```

### Step Outputs and Conditionals

```yaml
steps:
  - id: check
    run: |
      echo "result=success" >> "$GITHUB_OUTPUT"
      echo "count=42" >> "$GITHUB_OUTPUT"

  - if: steps.check.outputs.result == 'success'
    run: echo "Check passed with count ${{ steps.check.outputs.count }}"

  - if: failure()
    run: echo "Something failed in a previous step"

  - if: always()
    run: echo "This runs regardless of previous step status"

  - if: cancelled()
    run: echo "Workflow was cancelled"
```

## Cost Optimization

### Minutes Usage Reduction

| Strategy | Impact |
|----------|--------|
| Cancel redundant runs (concurrency) | High |
| Path-based triggers | High |
| Aggressive caching | Medium-High |
| Smaller runner images | Medium |
| Parallel jobs instead of sequential | Medium |
| Skip CI for docs-only changes | Low-Medium |
| Use `ubuntu-latest` over macOS/Windows when possible | High (macOS = 10x) |

### Skip CI for Non-Code Changes

```yaml
jobs:
  check-skip:
    runs-on: ubuntu-latest
    outputs:
      should_skip: ${{ steps.skip.outputs.should_skip }}
    steps:
      - id: skip
        uses: fkirc/skip-duplicate-actions@v5
        with:
          paths_ignore: '["*.md", "docs/**", ".github/ISSUE_TEMPLATE/**"]'

  build:
    needs: check-skip
    if: needs.check-skip.outputs.should_skip != 'true'
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```

## Self-Hosted Runners

### Setup and Configuration

```bash
# Download and configure runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.313.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.313.0/actions-runner-linux-x64-2.313.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.313.0.tar.gz
./config.sh --url https://github.com/org/repo --token TOKEN --labels gpu,large
./svc.sh install && ./svc.sh start
```

### Using Self-Hosted Runners

```yaml
jobs:
  gpu-test:
    runs-on: [self-hosted, gpu]
    steps:
      - uses: actions/checkout@v4
      - run: python train.py

  large-build:
    runs-on: [self-hosted, large]
    steps:
      - run: docker build -t myapp .
```

### Security Considerations

```
Self-hosted runner security checklist:
  [ ] Never use self-hosted runners on public repos (fork PRs can run code)
  [ ] Use ephemeral runners (fresh VM per job)
  [ ] Restrict runner labels and groups per repository
  [ ] Keep runner software updated
  [ ] Monitor runner logs for unauthorized access
  [ ] Use runner groups with organization-level access control
```

## GitHub CLI in Workflows

```yaml
steps:
  - name: Create issue on failure
    if: failure()
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      gh issue create \
        --title "CI failure: ${{ github.workflow }}" \
        --body "Workflow failed on commit ${{ github.sha }}" \
        --label "bug,ci"

  - name: Comment on PR
    if: github.event_name == 'pull_request'
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      gh pr comment ${{ github.event.pull_request.number }} \
        --body "Build succeeded. [View artifacts](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})"
```
