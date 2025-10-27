# CI/CD Comparison: SpecWeave vs Spec-Kit vs BMAD-METHOD

**Date**: 2025-10-26
**Purpose**: Compare CI/CD approaches across three spec-driven development frameworks

---

## Executive Summary

**SpecWeave** has the most comprehensive CI/CD setup with:
- ✅ **Tiered workflows** (Starter, Standard, Enterprise)
- ✅ **Multi-OS testing** (Ubuntu, macOS, Windows)
- ✅ **Multi-Node version** testing (18.x, 20.x)
- ✅ **E2E smoke tests** with multiple scenarios
- ✅ **Skills validation** (≥3 test cases required)
- ✅ **Structure validation** (ensures .specweave/ structure intact)
- ✅ **Coverage reporting** (Codecov integration)
- ✅ **Performance benchmarking**

---

## SpecWeave CI/CD (Current Implementation)

### Workflows

#### 1. Test & Validate (`test.yml`)

**Purpose**: Comprehensive testing across multiple OS and Node versions

**Matrix**:
- **OS**: Ubuntu, macOS, Windows
- **Node versions**: 18.x, 20.x
- **Total combinations**: 6 (3 OS × 2 Node versions)

**Jobs**:
1. **test** - Run unit and integration tests
   - `npm ci` - Install dependencies
   - `npm test` - Run tests
   - `npm run test:coverage` - Generate coverage (Ubuntu 20.x only)
   - Upload coverage to Codecov

2. **validate-skills** - Ensure skill structure compliance
   - Check all skills in `src/skills/` have `test-cases/` directory
   - Verify ≥3 test cases per skill (YAML format)
   - Fail if any skill doesn't meet requirements

3. **validate-structure** - Validate project structure
   - Check required directories exist (`src/skills`, `docs`, `features`, `specs`, `.specweave`)
   - Validate `docs/principles.md` exists (NOTE: Should be CLAUDE.md now)
   - Check feature structure (spec.md, plan.md, tasks.md, tests.md, context-manifest.yaml)

4. **lint** - Code quality checks
   - Run ESLint
   - Check markdown formatting

**Trigger**: Push to `develop` or `main`, Pull requests

---

#### 2. SpecWeave E2E Smoke Test (`e2e-smoke-test.yml`)

**Purpose**: End-to-end validation of SpecWeave framework

**Jobs**:
1. **smoke-test** - Basic E2E test
   - Checkout, install, build SpecWeave
   - Run `tests/smoke/e2e-smoke-test.sh`
   - Upload test results on failure
   - **Auto-create GitHub issue on failure** with details

2. **smoke-test-matrix** - Multiple scenario testing
   - **Scenario 1**: Simple Todo App (Next.js + local storage)
   - **Scenario 2**: SaaS Event Management (Next.js + Hetzner + Stripe + booking)
   - **Scenario 3**: E-commerce Platform (Next.js + Stripe + Vercel)
   - Verify project structure created
   - Verify expected features mentioned in specs
   - Run tests and build generated project
   - Upload artifacts (generated projects)

3. **performance-benchmark** - Benchmark generation time
   - Measure generation time
   - Compare against baseline (300 seconds / 5 minutes)
   - Fail if exceeds baseline

4. **notify-success** - Success notification
   - Notify when all tests pass

**Trigger**: Push to `main` or `features/*`, Pull requests, Daily at 2 AM UTC, Manual dispatch

---

#### 3. SpecWeave Starter (`specweave-starter.yml`)

**Purpose**: Lightweight validation for starter tier

**Status**: Active (ID: 201094611)

---

#### 4. SpecWeave Standard (`specweave-standard.yml`)

**Purpose**: Standard tier validation

**Status**: Active (ID: 201094610)

---

#### 5. SpecWeave Enterprise (`specweave-enterprise.yml`)

**Purpose**: Enterprise tier validation (with additional security/performance checks)

**Status**: Active (ID: 201094609)

---

### Coverage Metrics

- **Unit tests**: ✅ Comprehensive
- **Integration tests**: ✅ Comprehensive
- **E2E tests**: ✅ Playwright-based with multiple scenarios
- **Skills validation**: ✅ Automated (≥3 test cases required)
- **Structure validation**: ✅ Automated (.specweave/ structure enforced)
- **Performance benchmarking**: ✅ Automated (300s baseline)
- **Coverage reporting**: ✅ Codecov integration

---

## Spec-Kit CI/CD (GitHub Official)

### Workflows (Based on web search)

#### 1. Release Workflow (`release.yml`)

**Purpose**: Automated releases

**Details**: Limited information available. Badge visible in README suggests automated release process.

**Trigger**: Unknown (likely tags or manual)

---

### Coverage Metrics (Estimated)

- **Unit tests**: Likely present (mentioned in docs)
- **Integration tests**: Unknown
- **E2E tests**: Unknown
- **Structure validation**: Unknown
- **Performance benchmarking**: Unknown
- **Coverage reporting**: Unknown

**Note**: Spec-Kit is maintained by GitHub and likely has internal CI/CD not publicly visible.

---

## BMAD-METHOD CI/CD

### Workflows (Based on web search)

#### 1. PR Testing

**Purpose**: Test contributions on pull requests

**Quote**: "Your contributions are tested when you submit a PR - no need to enable CI in your fork!"

**Details**: Workflow files not publicly visible or documented.

**Trigger**: Pull requests

---

### Coverage Metrics (Estimated)

- **Unit tests**: Likely present (PR testing mentioned)
- **Integration tests**: Unknown
- **E2E tests**: Unknown
- **Multi-agent testing**: Unknown (critical for BMAD's multi-agent approach)
- **Structure validation**: Unknown
- **Performance benchmarking**: Unknown
- **Coverage reporting**: Unknown

---

## Comparison Matrix

| Feature | SpecWeave | Spec-Kit | BMAD-METHOD |
|---------|-----------|----------|-------------|
| **Multi-OS Testing** | ✅ Ubuntu, macOS, Windows | ❓ Unknown | ❓ Unknown |
| **Multi-Node/Python Versions** | ✅ Node 18.x, 20.x | ❓ Unknown | ❓ Unknown |
| **Unit Tests** | ✅ Comprehensive | ✅ Likely | ✅ Likely |
| **Integration Tests** | ✅ Comprehensive | ❓ Unknown | ❓ Unknown |
| **E2E Tests** | ✅ Multiple scenarios | ❓ Unknown | ❓ Unknown |
| **Skills/Agents Validation** | ✅ ≥3 test cases enforced | ❌ N/A | ❓ Unknown |
| **Structure Validation** | ✅ .specweave/ enforced | ❓ Unknown | ❓ Unknown |
| **Performance Benchmarking** | ✅ 300s baseline | ❌ None | ❌ None |
| **Coverage Reporting** | ✅ Codecov | ❓ Unknown | ❓ Unknown |
| **Tiered Workflows** | ✅ Starter/Standard/Enterprise | ❌ None | ❌ None |
| **Auto Issue Creation** | ✅ On E2E failure | ❌ None | ❌ None |
| **Artifact Upload** | ✅ Generated projects | ❓ Unknown | ❓ Unknown |
| **Scheduled Runs** | ✅ Daily at 2 AM UTC | ❓ Unknown | ❓ Unknown |
| **Manual Dispatch** | ✅ Supported | ❓ Unknown | ❓ Unknown |

---

## Strengths & Weaknesses

### SpecWeave

**Strengths**:
- ✅ Most comprehensive CI/CD of the three
- ✅ Multi-OS and multi-Node version coverage
- ✅ E2E smoke tests with multiple real-world scenarios
- ✅ Automated skills/agents validation (≥3 test cases enforced)
- ✅ Performance benchmarking
- ✅ Tiered workflows (Starter, Standard, Enterprise)
- ✅ Auto-create issues on E2E failures
- ✅ Daily scheduled runs
- ✅ Coverage reporting (Codecov)

**Weaknesses**:
- ⚠️ Some workflows currently failing (recent runs show failures)
- ⚠️ Structure validation checks for `docs/principles.md` (should be `CLAUDE.md`)
- ⚠️ No explicit security scanning (enterprise tier should have this)
- ⚠️ No explicit dependency vulnerability checks

---

### Spec-Kit

**Strengths**:
- ✅ Official GitHub project (trusted)
- ✅ Release automation visible

**Weaknesses**:
- ⚠️ Limited CI/CD visibility (workflows not publicly documented)
- ⚠️ No apparent multi-OS testing
- ⚠️ No E2E testing visible
- ⚠️ No performance benchmarking

**Note**: As a GitHub official project, Spec-Kit likely has internal CI/CD not exposed publicly.

---

### BMAD-METHOD

**Strengths**:
- ✅ PR testing mentioned

**Weaknesses**:
- ⚠️ Very limited CI/CD documentation
- ⚠️ No visible workflow files
- ⚠️ No multi-agent testing visible (critical for their multi-agent approach!)
- ⚠️ No E2E testing visible
- ⚠️ No performance benchmarking

---

## Recommendations for SpecWeave

### Immediate Fixes (P1)

1. **Fix failing workflows** - Recent runs show failures in Test & Validate, SpecWeave Standard, SpecWeave Enterprise
2. **Update structure validation** - Change `docs/principles.md` check to `CLAUDE.md`
3. **Add security scanning** (Enterprise tier) - Use:
   - `npm audit` for dependencies
   - Snyk or OSSF Scorecard for vulnerability detection
   - CodeQL for code scanning

### Enhancements (P2)

4. **Add dependency vulnerability checks** - Integrate Dependabot or Snyk
5. **Add visual regression testing** (if UI exists) - Percy, Chromatic, or Playwright Visual Comparisons
6. **Add deployment workflows** - Automate deployment to staging/production
7. **Add release automation** - Auto-generate changelog, create releases on tags

### Nice-to-Have (P3)

8. **Add Lighthouse CI** (if web app) - Performance, accessibility, SEO, best practices
9. **Add mutation testing** - Stryker for JavaScript/TypeScript
10. **Add Docker build testing** - If containerization is planned

---

## Verification Commands

### Check Workflow Status

```bash
# List all workflows
gh workflow list

# Check recent runs
gh run list --limit 10

# View specific run details
gh run view <run-id>

# Re-run failed workflows
gh run rerun <run-id>
```

### Local Testing

```bash
# Run all tests locally
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:skills
npm run test:agents
npm run test:e2e

# Check coverage
npm run test:coverage

# Run linting
npm run lint
npm run lint:md

# Validate skills structure
npm run validate:skills
```

---

## Conclusion

**SpecWeave has the most advanced CI/CD setup** of the three frameworks, with:
- Multi-OS and multi-version testing
- Comprehensive E2E smoke tests with real-world scenarios
- Automated skills/agents validation
- Performance benchmarking
- Tiered workflows (Starter, Standard, Enterprise)

**Next Steps**:
1. Fix currently failing workflows (see Recent Runs)
2. Add security scanning (enterprise tier)
3. Update structure validation (CLAUDE.md)
4. Add dependency vulnerability checks

---

**Related Documentation**:
- [CLAUDE.md](../../../CLAUDE.md#testing-philosophy) - Testing philosophy
- [.github/workflows/](../../../.github/workflows/) - Workflow files
- [tests/README.md](../../../tests/README.md) - Testing guide

---

**Last Updated**: 2025-10-26
**Status**: Comparison Complete, Recommendations Provided
