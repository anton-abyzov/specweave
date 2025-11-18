# Integration Tests

Comprehensive integration tests for SpecWeave plugins (GitHub, Azure DevOps, Jira).

## 🎯 Overview

These tests verify that SpecWeave plugins work correctly with their respective external APIs. Tests run in two modes:

1. **Auth Verification Mode** (default) - Verifies credentials and API connectivity
2. **Full Integration Mode** - Creates/deletes test data (requires `RUN_INTEGRATION_TESTS=true`)

## 📁 Directory Structure

```
tests/integration/
├── README.md                      # This file
├── core/                          # Core framework tests
├── external-tools/                # Third-party integrations (GitHub, JIRA, ADO, Kafka)
├── features/                      # Plugin feature tests
└── generators/                    # Code generation tests
```

## 📝 Test Naming Convention

**✅ REQUIRED**: All integration tests MUST use `.test.ts` extension

```bash
# ✅ CORRECT:
tests/integration/core/my-feature.test.ts
tests/integration/external-tools/github/sync.test.ts

# ❌ WRONG (deprecated):
tests/integration/my-feature.spec.ts
```

**Why `.test.ts` only?**
- Consistency with unit and E2E tests
- Simpler glob patterns (`**/*.test.ts` vs `**/*.{test,spec}.ts`)
- Aligned with Vitest conventions

**Standardized**: 2025-11-18 (Increment 0042 - Test Infrastructure Cleanup)

## 🔐 Authentication Setup

### Local Development

#### 1. Create `.env` File

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

#### 2. Configure Credentials

**GitHub** (Pick ONE):
- **Option A**: Use gh CLI (recommended for local dev):
  ```bash
  gh auth login
  ```
- **Option B**: Set GH_TOKEN in `.env`:
  ```bash
  GH_TOKEN=ghp_your_personal_access_token
  ```
  Get token from: https://github.com/settings/tokens (scopes: `repo`, `workflow`)

**Azure DevOps**:
```bash
AZURE_DEVOPS_PAT=your-ado-pat-52-chars
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project-name
```
Get PAT from: https://dev.azure.com/{org}/_usersSettings/tokens

**Jira**:
```bash
JIRA_API_TOKEN=your-jira-api-token
JIRA_EMAIL=your-email@example.com
JIRA_DOMAIN=your-domain.atlassian.net
```
Get token from: https://id.atlassian.com/manage-profile/security/api-tokens

#### 3. Enable Full Integration Tests (Optional)

```bash
# Add to .env to create/delete test data
RUN_INTEGRATION_TESTS=true
```

⚠️ **Warning**: Full integration mode creates real test issues/work items (they're deleted immediately, but use caution).

### CI/CD (GitHub Actions)

#### 1. Configure Repository Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

**Required for GitHub tests**:
- `GITHUB_TOKEN` - Auto-provided by Actions (no setup needed)

**Optional for ADO tests**:
- `AZURE_DEVOPS_PAT`
- `AZURE_DEVOPS_ORG`
- `AZURE_DEVOPS_PROJECT`

**Optional for Jira tests**:
- `JIRA_API_TOKEN`
- `JIRA_EMAIL`
- `JIRA_DOMAIN`

## 🚀 Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Individual Plugin Tests

```bash
# GitHub only
npx tsx tests/integration/github-sync/github-sync.test.ts

# Azure DevOps only
npx tsx tests/integration/ado-sync/ado-sync.test.ts

# Jira only
npx tsx tests/integration/jira-sync/jira-sync.test.ts
```

## 🧪 Test Coverage

Each plugin test suite includes **6 comprehensive tests**:

### Azure DevOps Tests (`ado-sync.test.ts`)

1. **Check Azure CLI Installed** - Verifies `az` CLI is available
2. **Verify ADO Authentication** - Tests PAT and API connectivity
3. **List Work Items** - Queries existing work items
4. **Create Work Item (Sync)** - Creates test Epic (deleted after)
5. **Add Comment (Push Progress)** - Demonstrates progress sync
6. **Get & Delete Work Item (Pull + Cleanup)** - Bidirectional sync + cleanup

### Jira Tests (`jira-sync.test.ts`)

1. **Verify Jira Authentication** - Tests API token
2. **List Jira Projects** - Fetches accessible projects
3. **Query Jira Issues** - Lists recent issues
4. **Create Issue (Sync)** - Creates test Task (deleted after)
5. **Add Comment (Push Progress)** - Demonstrates progress sync
6. **Get & Delete Issue (Pull + Cleanup)** - Bidirectional sync + cleanup

### GitHub Tests (`github-sync.test.ts`)

1. **Check gh CLI Installed** - Verifies `gh` CLI is available
2. **Verify GitHub Authentication** - Tests token/gh CLI auth
3. **Create Test Issue (Integration)** - Creates/deletes test issue

## 📊 Test Results

Tests display credential status and results:

```
📊 Credential Status:
   Azure DevOps: ✅ Configured
   Integration Tests: ✅ Enabled

✅ Test 1: Check Azure CLI Installed (376ms)
   Azure CLI installed: azure-cli 2.71.0
✅ Test 2: Verify ADO Authentication (543ms)
   Authenticated to easychamp (1 projects accessible)
✅ Test 3: List Work Items (Integration) (138ms)
   Successfully queried 0 work items from SpecWeaveSync
✅ Test 4: Create Work Item (Sync) (244ms)
   Created work item #3 in SpecWeaveSync
✅ Test 5: Add Comment (Push Progress) (187ms)
   Added progress comment to work item #3
✅ Test 6: Get & Delete Work Item (Pull + Cleanup) (253ms)
   Retrieved and deleted work item #3
```

## 🔍 Security

- ✅ Uses `execFileNoThrow` (no shell injection vulnerabilities)
- ✅ Credentials from environment variables only (never hardcoded)
- ✅ Integration tests skip by default (prevents accidental data creation)
- ✅ Test data cleaned up immediately after creation

## 🤝 Contributing

When adding new integration tests, always use safe command execution:

```typescript
// ✅ Safe
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
const result = await execFileNoThrow('gh', ['issue', 'create', '--title', userTitle]);

// ❌ Unsafe - command injection vulnerability!
import { execSync } from 'child_process';
const result = execSync(`gh issue create --title "${userTitle}"`);
```
