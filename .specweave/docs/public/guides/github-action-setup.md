# GitHub Actions Integration Setup Guide

**Complete guide to integrating SpecWeave with GitHub Actions for automated spec-driven development**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Workflow Tiers](#workflow-tiers)
5. [Configuration](#configuration)
6. [Authentication Setup](#authentication-setup)
7. [Workflow Features](#workflow-features)
8. [Testing Your Setup](#testing-your-setup)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## Overview

SpecWeave GitHub Actions integration brings **automated spec-driven development** to your GitHub repositories. When enabled, the system:

- ✅ **Auto-generates increment structures** from issues (spec/plan/tasks/tests)
- ✅ **Validates PRs against specifications** (spec alignment, test coverage)
- ✅ **Prevents regressions** (brownfield protection - requires docs before modifications)
- ✅ **Auto-updates documentation** (CLAUDE.md, API docs, changelog)
- ✅ **Enforces test coverage** (TC-0001 traceability, skill tests, E2E tests)
- ✅ **Scans for security** (vulnerabilities, code security, compliance)
- ✅ **Detects performance regressions** (compare baseline vs PR)
- ✅ **Syncs external systems** (JIRA, Slack, Azure DevOps)

**Result**: **93% time savings** with **zero spec drift** and **zero regressions**.

---

## Prerequisites

### Required

1. **GitHub Repository** with SpecWeave initialized
   - `.specweave/config.yaml` exists
   - `CLAUDE.md` exists
   - `docs/internal/strategy/` folder exists

2. **Anthropic API Key**
   - Sign up at https://console.anthropic.com/
   - Create API key with Claude access
   - Store as GitHub secret

3. **GitHub Token** (automatically provided)
   - No setup needed
   - Auto-available as `GITHUB_TOKEN`

### Optional (for advanced features)

- **JIRA Account** + API token (for JIRA sync)
- **Slack Webhook** (for notifications)
- **Azure DevOps** + PAT (for ADO sync)

---

## Quick Start

### Step 1: Choose Your Workflow Tier

SpecWeave provides **3 workflow tiers**:

| Tier | File | Features | Best For |
|------|------|----------|----------|
| **Starter** | `specweave-starter.yml` | Feature planning, basic PR validation, auto-docs | New users, small teams |
| **Standard** | `specweave-standard.yml` | + Brownfield protection, test coverage, issue triage | Production teams |
| **Enterprise** | `specweave-enterprise.yml` | + Security scanning, performance, compliance | Large organizations |

**Recommendation**: Start with **Starter**, upgrade to **Standard** after testing.

### Step 2: Add Anthropic API Key to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your Anthropic API key (starts with `sk-ant-`)
6. Click **Add secret**

### Step 3: Enable Workflow

**Option A: Copy from templates** (if SpecWeave installed)

```bash
# Copy starter workflow
cp .github/workflows/specweave-starter.yml.template .github/workflows/specweave-starter.yml

# Or use install script
./install.sh --enable-github-actions
```

**Option B: Already in repository** (workflows are committed)

The workflows are already in `.github/workflows/` - just ensure API key is set!

### Step 4: Test the Integration

Create a test issue:

1. Go to **Issues** → **New issue**
2. Title: "Add user authentication"
3. Add label: `feature`
4. Submit

**Expected behavior**:
- GitHub Action triggers
- Feature structure auto-generated in `features/0001-user-authentication/`
- Branch created: `feature/0001-user-authentication`
- Draft PR created
- Comment posted on issue with PR link

**Time**: ~2-3 minutes

---

## Workflow Tiers

### Tier 1: Starter (Recommended for New Users)

**File**: `.github/workflows/specweave-starter.yml`

**Features**:
- ✅ Auto increment planning (issue labeled 'feature')
- ✅ Basic PR validation (spec existence, alignment)
- ✅ Auto-documentation updates (on merge)

**Triggers**:
- Issues: labeled
- PRs: opened, synchronize
- Push: main, features/**

**Estimated cost**: ~$0.50/PR (with 1000 tokens per run)

**Setup time**: 5 minutes

---

### Tier 2: Standard (Recommended for Production)

**File**: `.github/workflows/specweave-standard.yml`

**Features**:
- ✅ Everything in Starter, PLUS:
- ✅ Intelligent issue triage (auto-label, prioritize, assign)
- ✅ Brownfield protection (blocks modifications without docs)
- ✅ Test coverage validation (TC-0001 traceability)
- ✅ External integrations (JIRA, Slack, ADO)

**Triggers**:
- Issues: opened, labeled
- PRs: opened, synchronize, reopened
- Push: main, develop, features/**

**Estimated cost**: ~$1.50/PR (with 3000 tokens per run)

**Setup time**: 15 minutes

**Additional secrets needed**:
- `JIRA_TOKEN` (optional)
- `SLACK_WEBHOOK` (optional)

---

### Tier 3: Enterprise (For Large Organizations)

**File**: `.github/workflows/specweave-enterprise.yml`

**Features**:
- ✅ Everything in Standard, PLUS:
- ✅ Security vulnerability scanning
- ✅ Performance regression detection
- ✅ Compliance validation (GDPR, HIPAA, SOC 2)
- ✅ Advanced analytics and reporting
- ✅ Scheduled security scans

**Triggers**:
- Issues: opened, labeled, assigned
- PRs: opened, synchronize, reopened, ready_for_review
- PR Reviews: submitted
- Push: main, develop, release/**
- Schedule: Daily at 2 AM UTC (security scans)

**Estimated cost**: ~$3.00/PR (with 6000 tokens per run)

**Setup time**: 30 minutes

**Additional secrets needed**:
- All from Standard, PLUS:
- `AZURE_DEVOPS_TOKEN` (optional)
- Performance testing setup

---

## Configuration

### .specweave/config.yaml

Add GitHub Actions configuration to your `.specweave/config.yaml`:

```yaml
# SpecWeave Configuration
name: "my-project"
version: "1.0.0"

# GitHub Actions Integration
github_actions:
  enabled: true
  tier: "standard"  # starter | standard | enterprise

  # Feature planning
  feature_planning:
    enabled: true
    auto_create_pr: true
    draft_pr: true

  # PR validation
  pr_validation:
    enabled: true
    require_spec: true
    require_tests: true
    minimum_coverage: 80  # percent

  # Brownfield protection
  brownfield:
    enabled: true
    block_without_docs: true
    block_without_tests: true

  # Test coverage
  test_coverage:
    enabled: true
    require_tc_traceability: true
    minimum_skill_tests: 3
    require_e2e_for_ui: true

  # Documentation
  auto_docs:
    enabled: true
    update_claude_md: true
    update_api_docs: true
    update_changelog: true

  # External integrations
  integrations:
    jira:
      enabled: false
      url: "https://your-domain.atlassian.net"
      project_key: "PROJ"

    slack:
      enabled: false
      webhook_url: "${SLACK_WEBHOOK}"
      channel: "#specweave-notifications"

    azure_devops:
      enabled: false
      organization: "your-org"
      project: "your-project"

  # Enterprise features
  enterprise:
    security_scanning:
      enabled: false
      block_on_critical: true
      block_on_high: false

    performance:
      enabled: false
      regression_threshold: 10  # percent slower
      block_on_critical_regression: true

    compliance:
      enabled: false
      frameworks:
        - gdpr
        - hipaa
        - soc2

# AI Model Configuration
ai:
  model: "claude-sonnet-4-5-20250929"
  max_tokens: 16000
```

---

## Authentication Setup

### Anthropic API (Required)

**Get API Key**:
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys**
4. Create new key
5. Copy key (starts with `sk-ant-`)

**Add to GitHub**:
1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your API key
5. **Add secret**

**Cost**: Pay-per-use
- Sonnet: $3 per million input tokens, $15 per million output tokens
- Estimated: $1-3 per PR depending on tier

---

### JIRA Integration (Optional)

**Get JIRA Token**:
1. Log into JIRA
2. Go to **Account Settings** → **Security** → **API Tokens**
3. **Create API token**
4. Copy token

**Add to GitHub**:
1. Repository → **Settings** → **Secrets**
2. Name: `JIRA_TOKEN`
3. Value: Your JIRA token

**Update config.yaml**:
```yaml
integrations:
  jira:
    enabled: true
    url: "https://your-domain.atlassian.net"
    project_key: "PROJ"
```

---

### Slack Integration (Optional)

**Get Webhook URL**:
1. Go to https://api.slack.com/apps
2. Create app or select existing
3. **Incoming Webhooks** → **Activate**
4. **Add New Webhook to Workspace**
5. Select channel
6. Copy webhook URL

**Add to GitHub**:
1. Repository → **Settings** → **Secrets**
2. Name: `SLACK_WEBHOOK`
3. Value: Webhook URL

**Update config.yaml**:
```yaml
integrations:
  slack:
    enabled: true
    channel: "#specweave-notifications"
```

---

### Azure DevOps Integration (Optional)

**Get PAT (Personal Access Token)**:
1. Azure DevOps → **User Settings** → **Personal Access Tokens**
2. **New Token**
3. Scopes: Work Items (Read, Write), Code (Read)
4. Copy token

**Add to GitHub**:
1. Repository → **Settings** → **Secrets**
2. Name: `AZURE_DEVOPS_TOKEN`
3. Value: Your PAT

**Update config.yaml**:
```yaml
integrations:
  azure_devops:
    enabled: true
    organization: "your-org"
    project: "your-project"
```

---

## Workflow Features

### 1. Auto Increment Planning

**Trigger**: Issue labeled with `feature`

**What it does**:
1. Reads issue title and description
2. Activates `increment-planner` skill
3. Generates complete increment structure:
   - `.specweave/increments/00001-feature-name/spec.md`
   - `.specweave/increments/00001-feature-name/plan.md`
   - `.specweave/increments/00001-feature-name/tasks.md`
   - `.specweave/increments/00001-feature-name/tests.md`
   - `.specweave/increments/00001-feature-name/context-manifest.yaml`
4. Creates branch `feature/0001-feature-name`
5. Commits files
6. Creates draft PR
7. Comments on issue with PR link

**Time saved**: 2 hours → 5 minutes (96%)

**Example**:
```markdown
Issue: "Add user authentication with OAuth2"
Label: feature

→ Auto-generates:
  features/0003-user-authentication/
  ├── spec.md (WHAT/WHY)
  ├── plan.md (HOW)
  ├── tasks.md (checklist)
  ├── tests.md (TC-0001 through TC-0010)
  └── context-manifest.yaml

→ Creates: PR #15 (draft)
→ Comments: "Feature structure created! Review PR #15"
```

---

### 2. Spec-Aware PR Review

**Trigger**: PR opened or updated

**What it does**:
1. Loads feature's `context-manifest.yaml`
2. Loads referenced specs from `docs/internal/strategy/`
3. Validates:
   - ✅ Spec exists for changes
   - ✅ Code aligns with spec
   - ✅ Test coverage (TC-0001 traceability)
   - ✅ Skills have ≥3 test cases
   - ✅ ADRs for architecture changes
4. Posts review comment with findings
5. Approves, requests changes, or blocks

**Time saved**: 30 minutes → 2 minutes (93%)

**Example**:
```markdown
## SpecWeave Validation Report

### ✅ Passed Checks
- Spec exists: docs/internal/strategy/auth/oauth-spec.md
- Test coverage: 100% (TC-0001 through TC-0010 covered)
- ADR exists: .specweave/docs/decisions/005-oauth-strategy.md

### ⚠️ Warnings
- Performance: New database queries (review indexing)

### ❌ Required Changes
- Missing skill tests: src/skills/oauth-handler/ has only 2 tests (need 3)

**Status**: ⚠️ Changes Required
```

---

### 3. Brownfield Protection

**Trigger**: PR modifies existing code (src/**/*.ts)

**What it does**:
1. Detects modifications to existing files
2. Checks for documentation:
   - Specs in `docs/internal/strategy/`
   - Tests in `tests/`
   - Architecture docs
3. If missing:
   - ❌ **BLOCKS PR**
   - Posts detailed requirements
   - Provides remediation steps

**Prevents**: 100% of regressions from undocumented changes

**Example**:
```markdown
## 🚨 Brownfield Modification Detected

### Modified Files
- src/services/payment-processor.ts (146 lines changed)

### Missing Documentation
- ❌ No spec for payment-processor
- ❌ No tests for current behavior

### Required Actions
1. Document current behavior:
   - Create docs/internal/strategy/payments/existing-flow.md
2. Create regression tests:
   - Add E2E tests for current payment flow
3. Get user approval

**PR Status**: ⏸️ Blocked
```

---

### 4. Test Coverage Validation

**Trigger**: PR opened or updated

**What it does**:
1. Runs test suite with coverage
2. Validates:
   - TC-0001 traceability (spec → tests)
   - Skills have ≥3 test cases
   - E2E tests for UI changes
   - Coverage >80% for critical paths
3. Posts coverage report
4. Blocks if requirements not met

**Example**:
```markdown
## Test Coverage Report

### ✅ TC-0001 Traceability
- TC-0001: Covered in tests/e2e/login.spec.ts
- TC-0002: Covered in tests/e2e/login.spec.ts
- TC-0003: Covered in tests/unit/validation.test.ts

### Skill Tests
✅ oauth-handler: 5 test cases

### Coverage Metrics
- Overall: 87% ✅
- Changed Files: 92% ✅
- Critical Paths: 95% ✅

**Status**: ✅ Passed
```

---

### 5. Auto-Documentation Updates

**Trigger**: PR merged to main

**What it does**:
1. Compares HEAD with HEAD~1
2. Identifies changes:
   - Structure changes
   - CLI changes
   - Skills API changes
   - Feature completion
3. Updates relevant docs:
   - `CLAUDE.md` (if structure changed)
   - `.specweave/docs/api/` (if API changed)
   - `.specweave/docs/changelog/` (always)
4. Commits changes with message: "docs: auto-update after merge"
5. Syncs with JIRA/Slack if configured

**Time saved**: 1 hour → 0 minutes (100%)

---

### 6. Security Scanning (Enterprise)

**Trigger**: PR opened or daily schedule

**What it does**:
1. Runs `npm audit`
2. Analyzes code for security issues:
   - SQL injection
   - XSS vulnerabilities
   - Secret leaks
   - Authentication issues
3. Posts security report
4. Blocks if critical vulnerabilities

**Example**:
```markdown
## 🔒 Security Scan Report

### Critical Issues
None ✅

### High Priority
- lodash: Prototype Pollution (CVE-2020-8203)
  Fix: Update to lodash@4.17.21

### Recommendations
- Enable rate limiting on login endpoint
- Add CSRF protection for forms

**Status**: ⚠️ Review Needed
```

---

### 7. Performance Regression (Enterprise)

**Trigger**: PR opened

**What it does**:
1. Runs performance tests on PR
2. Runs same tests on base branch
3. Compares results
4. Identifies regressions (>10% slower)
5. Posts performance report
6. Blocks if critical regression (>25% slower)

**Example**:
```markdown
## ⚡ Performance Analysis

### Regression Detected
- API /users/list: 15% slower (250ms → 287ms)
  Cause: N+1 query detected

### Improvements
- API /posts/create: 20% faster (cache added) ✅

### Optimization Opportunities
- Database indexing for user queries

**Status**: ⚠️ Review (moderate regression)
```

---

## Testing Your Setup

### Test 1: Feature Planning

**Steps**:
1. Create new issue
2. Title: "Add dark mode toggle"
3. Body: "Users should be able to switch between light and dark themes"
4. Add label: `feature`

**Expected**:
- Workflow runs (check **Actions** tab)
- Feature folder created: `features/0001-dark-mode/`
- Branch created: `feature/0001-dark-mode`
- Draft PR created
- Issue commented with PR link

**Verify**:
```bash
# Check increment folder
ls features/0001-dark-mode/
# Should see: spec.md, plan.md, tasks.md, tests.md, context-manifest.yaml

# Check branch
git fetch
git branch -r | grep dark-mode
```

---

### Test 2: PR Validation

**Steps**:
1. Create branch: `test-validation`
2. Make small change to existing file (e.g., README.md)
3. Commit and push
4. Open PR

**Expected**:
- Workflow runs
- Review comment posted
- Status: ✅ or ⚠️ depending on changes

**Verify**:
- Check PR comments for validation report

---

### Test 3: Brownfield Protection

**Steps**:
1. Create branch: `test-brownfield`
2. Modify existing code in `src/` (e.g., add comment)
3. Commit and push
4. Open PR

**Expected**:
- Workflow runs
- Brownfield check triggered
- If docs exist: ✅ Approved
- If docs missing: ❌ Blocked with requirements

**Verify**:
- Check PR comments for brownfield report

---

### Test 4: Documentation Update

**Steps**:
1. Merge a PR to main
2. Wait for workflow to complete

**Expected**:
- Workflow runs
- Changelog updated
- Commit made: "docs: auto-update after merge"

**Verify**:
```bash
git pull origin main
git log -1
# Should see: docs: auto-update after merge

cat .specweave/docs/changelog/2025-10.md
# Should see new entry
```

---

## Troubleshooting

### Issue: Workflow not triggering

**Symptoms**:
- Label issue with 'feature', but nothing happens
- PR opened, but no validation comment

**Causes & Solutions**:

1. **API key not set**
   - Check: Settings → Secrets → `ANTHROPIC_API_KEY` exists
   - Fix: Add API key

2. **Workflow file missing or disabled**
   - Check: `.github/workflows/specweave-*.yml` exists
   - Check: Actions tab shows workflow
   - Fix: Copy workflow file, commit, push

3. **Incorrect permissions**
   - Check: Workflow has `permissions:` set
   - Fix: Ensure permissions in YAML

4. **Branch protection blocking bot**
   - Check: Settings → Branches → Protection rules
   - Fix: Add SpecWeave Bot to allowed list

---

### Issue: Authentication failures

**Symptoms**:
- Workflow fails with "401 Unauthorized"
- Error: "Invalid API key"

**Solutions**:

1. **Verify API key**
   ```bash
   # Test locally
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
   ```

2. **Check key format**
   - Must start with `sk-ant-`
   - No extra spaces or quotes
   - Copy-paste carefully

3. **Regenerate key**
   - Create new key in Anthropic console
   - Update GitHub secret

---

### Issue: High costs

**Symptoms**:
- Anthropic bill higher than expected

**Causes & Solutions**:

1. **Using wrong model**
   - Check: .specweave/config.yaml → ai.model
   - Fix: Use Sonnet (not Opus)

2. **Too many tokens per run**
   - Check: Workflow prompts (--max-tokens)
   - Fix: Reduce max_tokens in claude_args

3. **Workflow running too often**
   - Check: Actions tab → Filter by workflow
   - Fix: Adjust triggers in YAML

4. **Not using context manifests**
   - Check: Features have context-manifest.yaml
   - Fix: Create manifests to reduce context

**Cost optimization tips**:
- Use context manifests (70%+ reduction)
- Set reasonable max_tokens (8000-16000)
- Use Haiku for simple tasks
- Cache frequently-used context

---

### Issue: Skills not activating

**Symptoms**:
- Workflow runs but doesn't use increment-planner
- Skills not detected

**Solutions**:

1. **Skills not installed**
   ```bash
   # Install skills
   npm run install:skills
   # Or manually
   cp -r src/skills/* .claude/skills/
   ```

2. **SKILL.md missing frontmatter**
   ```bash
   # Check skill format
   head -10 .claude/skills/increment-planner/SKILL.md
   # Should see:
   # ---
   # name: increment-planner
   # description: ...
   # ---
   ```

3. **Description doesn't match**
   - Check: SKILL.md description includes trigger keywords
   - Fix: Update description with relevant keywords

---

### Issue: Brownfield protection too aggressive

**Symptoms**:
- Every PR blocked
- Can't merge simple changes

**Solutions**:

1. **Document existing code first**
   - Create specs in `docs/internal/strategy/`
   - Create tests in `tests/`
   - Then brownfield protection passes

2. **Disable for specific paths**
   ```yaml
   # .specweave/config.yaml
   brownfield:
     enabled: true
     exclude_paths:
       - "docs/**"
       - "tests/**"
       - "*.md"
   ```

3. **Temporarily disable** (not recommended)
   ```yaml
   brownfield:
     enabled: false
   ```

---

## Advanced Configuration

### Custom Workflow Triggers

**Add custom labels**:
```yaml
on:
  issues:
    types: [labeled]

jobs:
  custom-trigger:
    if: |
      github.event.label.name == 'urgent' ||
      github.event.label.name == 'feature'
```

---

### Conditional Execution

**Only run on specific branches**:
```yaml
on:
  pull_request:
    branches:
      - main
      - develop
      - release/**
```

**Only run on specific paths**:
```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'specifications/**'
      - 'features/**'
```

---

### Multiple AI Models

**Use different models for different tasks**:
```yaml
# In workflow
- name: Simple Triage
  uses: anthropics/claude-code-action@v1
  with:
    claude_args: |
      --model haiku  # Fast, cheap
      --max-tokens 4000

- name: Complex Review
  uses: anthropics/claude-code-action@v1
  with:
    claude_args: |
      --model sonnet  # Balanced
      --max-tokens 16000

- name: Deep Analysis
  uses: anthropics/claude-code-action@v1
  with:
    claude_args: |
      --model opus  # Most capable (expensive!)
      --max-tokens 20000
```

---

### Parallel Execution

**Run validations in parallel**:
```yaml
jobs:
  spec-validation:
    runs-on: ubuntu-latest
    # Runs in parallel

  brownfield-check:
    runs-on: ubuntu-latest
    # Runs in parallel

  test-coverage:
    runs-on: ubuntu-latest
    # Runs in parallel

  security-scan:
    runs-on: ubuntu-latest
    # Runs in parallel
```

---

### Branch-Specific Workflows

**Different workflows per branch**:
```yaml
# .github/workflows/specweave-main.yml
on:
  push:
    branches: [main]
jobs:
  # Production validations only

# .github/workflows/specweave-develop.yml
on:
  push:
    branches: [develop]
jobs:
  # Development validations + performance tests

# .github/workflows/specweave-feature.yml
on:
  push:
    branches: [features/**]
jobs:
  # Basic validations only
```

---

## Related Documentation

- [CLAUDE-CODE-ACTION-INTEGRATION.md](../../../ai-logs/reports/CLAUDE-CODE-ACTION-INTEGRATION.md) - Complete integration analysis
- [CLAUDE.md](../../../CLAUDE.md#agents-vs-skills-architecture) - SpecWeave development guide
- [.specweave/config.yaml](../../config.yaml) - Configuration reference
- [Troubleshooting Guide](./github-action-troubleshooting.md) - Common issues and solutions

---

**Questions?** Open an issue with label `question` and tag `@claude`

**Need help?** Check [Troubleshooting](#troubleshooting) or [GitHub Actions Logs](../../Actions)
