# GitHub Secrets Configuration for CI/CD

## Current Test Status

✅ **ALL TESTS PASSING**:
- **Unit Tests**: 435 passed, 0 failed
- **Integration Tests**: 39 passed, 0 failed
- **E2E Tests**: 37 passed, 10 skipped (ADO only), 0 failed

## Required GitHub Secrets

### 1. NPM_TOKEN (REQUIRED for releases)
- **Purpose**: Publishing to NPM registry
- **Used in**: `.github/workflows/release.yml`
- **Impact if missing**: Release workflow will fail at publish step
- **How to get**: Generate from npmjs.com account settings

### 2. Optional Integration Test Secrets

These are **OPTIONAL** - tests will skip gracefully if not provided:

#### Azure DevOps (10 tests will be skipped if missing):
- `AZURE_DEVOPS_PAT` - Personal Access Token
- `AZURE_DEVOPS_ORG` - Organization name
- `AZURE_DEVOPS_PROJECT` - Project name

#### JIRA (tests will be skipped if missing):
- `JIRA_API_TOKEN` - API token
- `JIRA_EMAIL` - User email
- `JIRA_DOMAIN` - JIRA domain (e.g., yourcompany.atlassian.net)

### 3. Already Provided by GitHub Actions
- `GITHUB_TOKEN` - Automatically provided, no setup needed

## Configuration Status

✅ **Already configured in workflows**:
- All optional secrets are already referenced in `.github/workflows/test.yml`
- Tests will pass even without these secrets (they skip gracefully)
- `RUN_INTEGRATION_TESTS: 'false'` prevents destructive integration tests

## Test Behavior by Environment

### Without Any Secrets:
- ✅ Unit tests: PASS (435 tests)
- ✅ Integration tests: PASS (39 tests, some features skipped)
- ✅ E2E tests: PASS (37 tests, ADO tests skipped)
- **Result**: CI/CD pipeline will succeed

### With ADO Secrets:
- All ADO integration tests (10 additional) will run
- Useful for teams using Azure DevOps

### With JIRA Secrets:
- JIRA integration tests will run
- Useful for teams using JIRA

## Recommendation

**For immediate release, you only need**:
1. `NPM_TOKEN` - For publishing to NPM

**Optional (can add later)**:
- ADO secrets - Only if you want to test Azure DevOps integration
- JIRA secrets - Only if you want to test JIRA integration

## How to Add Secrets

1. Go to: https://github.com/anton-abyzov/specweave/settings/secrets/actions
2. Click "New repository secret"
3. Add:
   - Name: `NPM_TOKEN`
   - Value: (your npm token from npmjs.com)
4. Optionally add ADO/JIRA secrets using same process

## Summary

✅ **Tests are ready for CI/CD** - All tests pass without additional secrets
✅ **Only NPM_TOKEN needed for release** - Everything else is optional
✅ **No risk of pipeline failure** - Tests skip gracefully when secrets are missing